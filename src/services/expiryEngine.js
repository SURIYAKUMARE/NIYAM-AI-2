const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');
const notificationEngine = require('./notificationEngine');

/**
 * ADVANCED STATUTORY EXPIRY ENGINE
 * 
 * Tracks:
 * - Land Lease Validity (30-year deed)
 * - Fire Safety NOC
 * - Building Stability Certificate
 * - Pollution Clearance
 * - Faculty Cadre Approval Orders
 * - Financial Guarantees (FDR / Joint Bank Guarantee)
 * - University Affiliation Certificates
 * 
 * Alert Intervals: 90 days, 60 days, 30 days, 15 days, 7 days, Expired
 */
class ExpiryEngine {
    constructor() {
        this.INTERVALS = [90, 60, 30, 15, 7, 0];

        this.STATUTORY_CATEGORIES = {
            LAND_LEASE: { code: 'DOC_LAND', name: 'Land Lease Deed / Ownership Title', minValidityYears: 30 },
            FIRE_SAFETY_NOC: { code: 'DOC_FIRE_NOC', name: 'District Fire Safety NOC', renewalMonths: 12 },
            BUILDING_STABILITY: { code: 'DOC_BLDG_STABILITY', name: 'Building Structural Stability Certificate', renewalMonths: 36 },
            POLLUTION_CLEARANCE: { code: 'DOC_POLLUTION', name: 'State Pollution Control Board Clearance', renewalMonths: 24 },
            FACULTY_APPROVAL: { code: 'DOC_FACULTY', name: 'University Approved Faculty Cadre List', renewalMonths: 12 },
            FINANCIAL_GUARANTEE: { code: 'DOC_FIN_GUARANTEE', name: 'AICTE Joint FDR / Bank Guarantee', renewalMonths: 60 },
            AFFILIATION_CERTIFICATE: { code: 'DOC_AFFILIATION', name: 'University Annual Affiliation Order', renewalMonths: 12 }
        };
    }

    /**
     * Get effective current timestamp (honors simulation clock if active)
     */
    getCurrentDate() {
        try {
            const sim = db.queryOne('SELECT * FROM simulation_clock WHERE id = 1 AND is_simulation_active = 1');
            if (sim && sim.virtual_time_offset_seconds) {
                const now = new Date();
                now.setSeconds(now.getSeconds() + sim.virtual_time_offset_seconds);
                return now;
            }
        } catch (_) {}
        return new Date();
    }

    /**
     * Run automated expiry evaluation cycle across all statutory documents
     */
    evaluateStatutoryExpiries() {
        const docs = db.query(`
            SELECT d.*, dt.name as doc_type_name, i.name as institution_name, i.permanent_id, i.contact_email
            FROM documents d
            JOIN document_types dt ON d.document_type_code = dt.code
            JOIN institutions i ON d.institution_id = i.id
            WHERE d.expiry_date IS NOT NULL
        `);

        const now = this.getCurrentDate();
        const alertsGenerated = [];

        for (const doc of docs) {
            const exp = new Date(doc.expiry_date);
            const daysRemaining = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

            let alertTier = null;
            let severity = 'INFO';

            if (daysRemaining < 0) {
                alertTier = 'EXPIRED';
                severity = 'CRITICAL';
            } else if (daysRemaining <= 7) {
                alertTier = '7_DAYS';
                severity = 'CRITICAL';
            } else if (daysRemaining <= 15) {
                alertTier = '15_DAYS';
                severity = 'URGENT';
            } else if (daysRemaining <= 30) {
                alertTier = '30_DAYS';
                severity = 'WARNING';
            } else if (daysRemaining <= 60) {
                alertTier = '60_DAYS';
                severity = 'NOTICE';
            } else if (daysRemaining <= 90) {
                alertTier = '90_DAYS';
                severity = 'NOTICE';
            }

            if (alertTier) {
                // Check if notification already sent for this document and alert tier today
                const eventType = `DOC_EXPIRY_${alertTier}`;
                const title = alertTier === 'EXPIRED'
                    ? `STATUTORY NON-COMPLIANCE: ${doc.document_title} has Expired!`
                    : `Statutory Expiry Notice (${alertTier.replace('_', ' ')}): ${doc.document_title}`;

                const message = alertTier === 'EXPIRED'
                    ? `Statutory document '${doc.document_title}' for ${doc.institution_name} expired on ${doc.expiry_date}. Immediate renewal upload required under APH Chapter II.`
                    : `Statutory certificate '${doc.document_title}' for ${doc.institution_name} expires in ${daysRemaining} days (${doc.expiry_date}). Prepare renewal clearance.`;

                // Dispatch multi-channel notification
                const sent = notificationEngine.send({
                    institutionId: doc.institution_id,
                    recipientRole: 'INSTITUTION_REP',
                    eventType,
                    title,
                    message,
                    channel: severity === 'CRITICAL' ? 'EMAIL' : 'IN_APP',
                    preventDuplicatesToday: true
                });

                if (sent.status !== 'DEDUPLICATED') {
                    alertsGenerated.push({
                        documentId: doc.id,
                        documentTitle: doc.document_title,
                        institutionName: doc.institution_name,
                        expiryDate: doc.expiry_date,
                        daysRemaining,
                        alertTier,
                        severity
                    });
                }
            }
        }

        return alertsGenerated;
    }

    /**
     * Get Expiry Calendar (Grouped chronologically)
     */
    getExpiryCalendar({ institutionId = null, monthsAhead = 12 } = {}) {
        let sql = `
            SELECT d.*, dt.name as doc_type_name, i.name as institution_name, i.permanent_id, r.name as region_name
            FROM documents d
            JOIN document_types dt ON d.document_type_code = dt.code
            JOIN institutions i ON d.institution_id = i.id
            JOIN regions r ON i.region_id = r.id
            WHERE d.expiry_date IS NOT NULL
        `;
        const params = [];

        if (institutionId) {
            sql += ' AND d.institution_id = ?';
            params.push(institutionId);
        }

        sql += ' ORDER BY d.expiry_date ASC';
        const docs = db.query(sql, params);
        const now = this.getCurrentDate();

        const calendar = {
            expired: [],
            critical7Days: [],
            urgent15Days: [],
            warning30Days: [],
            notice60Days: [],
            notice90Days: [],
            futureSafe: []
        };

        for (const doc of docs) {
            const exp = new Date(doc.expiry_date);
            const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            const enriched = {
                ...doc,
                daysRemaining: days,
                isExpired: days < 0,
                statusTag: days < 0 ? 'EXPIRED' : (days <= 30 ? 'EXPIRING_CRITICAL' : (days <= 90 ? 'EXPIRING_SOON' : 'VALID'))
            };

            if (days < 0) calendar.expired.push(enriched);
            else if (days <= 7) calendar.critical7Days.push(enriched);
            else if (days <= 15) calendar.urgent15Days.push(enriched);
            else if (days <= 30) calendar.warning30Days.push(enriched);
            else if (days <= 60) calendar.notice60Days.push(enriched);
            else if (days <= 90) calendar.notice90Days.push(enriched);
            else calendar.futureSafe.push(enriched);
        }

        return calendar;
    }

    /**
     * Institution-wise Compliance Health Dashboard
     */
    getInstitutionComplianceHealth(institutionId) {
        const inst = db.queryOne('SELECT * FROM institutions WHERE id = ?', [institutionId]);
        if (!inst) throw new Error('Institution not found.');

        const docs = db.query(`
            SELECT d.*, dt.name as doc_type_name
            FROM documents d
            JOIN document_types dt ON d.document_type_code = dt.code
            WHERE d.institution_id = ?
        `, [institutionId]);

        const undertakings = db.query(`
            SELECT * FROM undertakings WHERE institution_id = ?
        `, [institutionId]);

        const now = this.getCurrentDate();
        let validDocs = 0;
        let expiringSoonDocs = 0;
        let expiredDocs = 0;
        let renewalsUnderVerification = 0;

        for (const d of docs) {
            if (d.current_status === 'RENEWAL_SUBMITTED' || d.current_status === 'UNDER_VERIFICATION') {
                renewalsUnderVerification++;
            } else if (d.expiry_date) {
                const days = Math.ceil((new Date(d.expiry_date) - now) / (1000 * 60 * 60 * 24));
                if (days < 0) expiredDocs++;
                else if (days <= 90) expiringSoonDocs++;
                else validDocs++;
            } else {
                validDocs++;
            }
        }

        // Compliance score calculation (0 - 100)
        const totalDocs = docs.length || 1;
        const totalUtk = undertakings.length || 1;
        const compliantUtk = undertakings.filter(u => u.status === 'VERIFIED' || u.status === 'CLOSED').length;
        const overdueUtk = undertakings.filter(u => u.status === 'OVERDUE').length;

        const docScore = Math.max(0, Math.round(((validDocs * 1.0 + expiringSoonDocs * 0.7 - expiredDocs * 1.5) / totalDocs) * 50));
        const utkScore = Math.max(0, Math.round(((compliantUtk * 1.0 - overdueUtk * 1.0) / totalUtk) * 50));
        const complianceScore = Math.min(100, Math.max(0, docScore + utkScore));

        return {
            institutionId: inst.id,
            institutionName: inst.name,
            permanentId: inst.permanent_id,
            complianceScore,
            statutoryDocuments: {
                total: docs.length,
                valid: validDocs,
                expiringSoon: expiringSoonDocs,
                expired: expiredDocs,
                renewalsUnderVerification
            },
            undertakings: {
                total: undertakings.length,
                compliant: compliantUtk,
                pending: undertakings.filter(u => u.status === 'PENDING' || u.status === 'UPCOMING').length,
                overdue: overdueUtk
            },
            statusRating: complianceScore >= 85 ? 'FULLY_COMPLIANT' : (complianceScore >= 60 ? 'CONDITIONAL_COMPLIANCE' : 'HIGH_REGULATORY_RISK')
        };
    }

    /**
     * Upload and Record Document Renewal (Maintains historical audit trail)
     */
    recordRenewalSubmission({ documentId, newIssueDate, newExpiryDate, fileUrl, issuingAuthority, registrationNumber, user }) {
        return db.transaction((tx) => {
            const doc = tx.queryOne('SELECT * FROM documents WHERE id = ?', [documentId]);
            if (!doc) throw new Error('Document record not found.');

            const now = new Date().toISOString();
            const renewalId = crypto.randomUUID();

            // 1. Insert into document_renewals table
            tx.execute(`
                INSERT INTO document_renewals (
                    id, document_id, institution_id, renewal_application_date,
                    new_issue_date, new_expiry_date, uploaded_file_url, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')
            `, [renewalId, documentId, doc.institution_id, now, newIssueDate, newExpiryDate, fileUrl]);

            // 2. Set current_status to RENEWAL_SUBMITTED (preserve original expiry until verified!)
            tx.execute(`
                UPDATE documents
                SET current_status = 'RENEWAL_SUBMITTED', updated_at = ?
                WHERE id = ?
            `, [now, documentId]);

            // 3. Log audit event
            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: 'SUBMIT_DOCUMENT_RENEWAL',
                entityName: 'documents',
                entityId: documentId,
                previousState: { status: doc.current_status, expiry_date: doc.expiry_date, version: doc.version_number || 1 },
                newState: { status: 'RENEWAL_SUBMITTED', proposed_expiry: newExpiryDate, proposed_version: (doc.version_number || 1) + 1 },
                justification: `Institution representative submitted statutory renewal for ${doc.document_title}. Awaiting officer verification.`
            });

            return {
                renewalId,
                documentId,
                status: 'RENEWAL_SUBMITTED',
                message: 'Statutory renewal submitted successfully. Retained prior validity pending official officer verification.'
            };
        });
    }

    /**
     * Officer Verification of Renewal Deed
     */
    verifyRenewal({ renewalId, isApproved, comments, user }) {
        return db.transaction((tx) => {
            const ren = tx.queryOne('SELECT * FROM document_renewals WHERE id = ?', [renewalId]);
            if (!ren) throw new Error('Renewal application record not found.');

            const doc = tx.queryOne('SELECT * FROM documents WHERE id = ?', [ren.document_id]);
            if (!doc) throw new Error('Underlying document record not found.');

            const now = new Date().toISOString();
            const newStatus = isApproved ? 'APPROVED' : 'DEFICIENT';

            tx.execute(`
                UPDATE document_renewals
                SET status = ?, officer_comments = ?, processed_at = ?, processed_by = ?
                WHERE id = ?
            `, [newStatus, comments || '', now, user.id, renewalId]);

            if (isApproved) {
                const newVersion = (doc.version_number || 1) + 1;
                // Formally extend document validity
                tx.execute(`
                    UPDATE documents
                    SET issue_date = ?, expiry_date = ?, file_url = ?, current_status = 'VALID',
                        version_number = ?, verified_by = ?, verified_at = ?, updated_at = ?
                    WHERE id = ?
                `, [ren.new_issue_date, ren.new_expiry_date, ren.uploaded_file_url, newVersion, user.id, now, now, ren.document_id]);
            } else {
                tx.execute(`
                    UPDATE documents
                    SET current_status = 'REJECTED', updated_at = ?
                    WHERE id = ?
                `, [now, ren.document_id]);
            }

            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: isApproved ? 'VERIFY_DOCUMENT_RENEWAL' : 'REJECT_DOCUMENT_RENEWAL',
                entityName: 'documents',
                entityId: ren.document_id,
                previousState: { status: doc.current_status, expiry: doc.expiry_date },
                newState: { status: isApproved ? 'VALID' : 'REJECTED', new_expiry: isApproved ? ren.new_expiry_date : doc.expiry_date },
                justification: `Officer ${user.full_name} processed renewal deed: ${comments || (isApproved ? 'Verified authentic and compliant' : 'Deficient deed rejected')}`
            });

            return {
                renewalId,
                documentId: ren.document_id,
                outcome: newStatus,
                verifiedBy: user.full_name
            };
        });
    }

    /**
     * Retrieve complete version history of a document
     */
    getDocumentVersionHistory(documentId) {
        const doc = db.queryOne('SELECT * FROM documents WHERE id = ?', [documentId]);
        if (!doc) throw new Error('Document not found.');

        const renewals = db.query(`
            SELECT r.*, u.full_name as processed_by_name
            FROM document_renewals r
            LEFT JOIN users u ON r.processed_by = u.id
            WHERE r.document_id = ?
            ORDER BY r.renewal_application_date DESC
        `, [documentId]);

        return {
            document: doc,
            currentVersion: doc.version_number || 1,
            renewalsHistory: renewals
        };
    }
}

module.exports = new ExpiryEngine();
