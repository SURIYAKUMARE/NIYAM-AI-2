const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');
const { EXPIRY_ALERT_INTERVALS } = require('../config/constants');

class DocumentService {
    // List documents with expiry calculation
    getDocuments({ institutionId = null, status = null, expiringWithinDays = null } = {}) {
        let sql = `
            SELECT d.*, dt.name as doc_type_name, dt.validity_period_months, dt.requires_renewal,
                   i.name as institution_name, i.permanent_id, r.name as region_name,
                   u.full_name as verified_by_name
            FROM documents d
            JOIN document_types dt ON d.document_type_code = dt.code
            JOIN institutions i ON d.institution_id = i.id
            JOIN regions r ON i.region_id = r.id
            LEFT JOIN users u ON d.verified_by = u.id
            WHERE 1=1
        `;
        const params = [];
        if (institutionId) {
            sql += ' AND d.institution_id = ?';
            params.push(institutionId);
        }
        if (status) {
            sql += ' AND d.current_status = ?';
            params.push(status);
        }
        if (expiringWithinDays) {
            sql += ' AND d.expiry_date IS NOT NULL AND datetime(d.expiry_date) <= datetime("now", ?)';
            params.push(`+${expiringWithinDays} days`);
        }

        sql += ' ORDER BY d.expiry_date ASC';
        const docs = db.query(sql, params);

        const now = new Date();
        return docs.map(doc => {
            let daysUntilExpiry = null;
            let dynamicStatus = doc.current_status;

            if (doc.expiry_date) {
                const exp = new Date(doc.expiry_date);
                daysUntilExpiry = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

                if (doc.current_status !== 'RENEWAL_SUBMITTED' && doc.current_status !== 'UNDER_VERIFICATION') {
                    if (daysUntilExpiry < 0) {
                        dynamicStatus = 'EXPIRED';
                    } else if (daysUntilExpiry <= 90) {
                        dynamicStatus = 'EXPIRING_SOON';
                    } else {
                        dynamicStatus = 'VALID';
                    }
                }
            }

            return {
                ...doc,
                daysUntilExpiry,
                dynamicStatus
            };
        });
    }

    // Submit Document Renewal
    submitRenewal({
        documentId,
        newIssueDate,
        newExpiryDate,
        uploadedFileUrl,
        user
    }) {
        const doc = db.queryOne('SELECT * FROM documents WHERE id = ?', [documentId]);
        if (!doc) throw new Error('Document not found.');

        const renewalId = crypto.randomUUID();
        const now = new Date().toISOString();

        db.transaction((tx) => {
            tx.execute(`
                INSERT INTO document_renewals (
                    id, document_id, institution_id, renewal_application_date,
                    new_issue_date, new_expiry_date, uploaded_file_url, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')
            `, [renewalId, documentId, doc.institution_id, now, newIssueDate, newExpiryDate, uploadedFileUrl]);

            // Crucial: Update document status to RENEWAL_SUBMITTED, but DO NOT change expiry date until verified!
            tx.execute(`
                UPDATE documents
                SET current_status = 'RENEWAL_SUBMITTED', updated_at = ?
                WHERE id = ?
            `, [now, documentId]);

            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: 'SUBMIT_DOCUMENT_RENEWAL',
                entityName: 'documents',
                entityId: documentId,
                previousState: { status: doc.current_status, expiry_date: doc.expiry_date },
                newState: { status: 'RENEWAL_SUBMITTED', proposed_expiry: newExpiryDate },
                justification: `Institution submitted renewal deed for document ${doc.document_title}`
            });
        });

        return { renewalId, status: 'RENEWAL_SUBMITTED' };
    }

    // Officer verifies and approves renewal
    verifyRenewal({
        documentId,
        renewalId,
        isApproved,
        officerComments = '',
        user
    }) {
        const doc = db.queryOne('SELECT * FROM documents WHERE id = ?', [documentId]);
        if (!doc) throw new Error('Document not found.');

        const renewal = db.queryOne('SELECT * FROM document_renewals WHERE id = ?', [renewalId]);
        if (!renewal) throw new Error('Renewal application not found.');

        const now = new Date().toISOString();

        db.transaction((tx) => {
            if (isApproved) {
                // Apply the verified renewal dates
                tx.execute(`
                    UPDATE documents
                    SET expiry_date = ?, issue_date = ?, file_url = ?, current_status = 'VALID',
                        verified_by = ?, verified_at = ?, updated_at = ?
                    WHERE id = ?
                `, [renewal.new_expiry_date, renewal.new_issue_date, renewal.uploaded_file_url, user.id, now, now, documentId]);

                tx.execute(`
                    UPDATE document_renewals
                    SET status = 'APPROVED', officer_comments = ?, processed_at = ?, processed_by = ?
                    WHERE id = ?
                `, [officerComments, now, user.id, renewalId]);
            } else {
                tx.execute(`
                    UPDATE documents
                    SET current_status = 'REJECTED', updated_at = ?
                    WHERE id = ?
                `, [now, documentId]);

                tx.execute(`
                    UPDATE document_renewals
                    SET status = 'DEFICIENT', officer_comments = ?, processed_at = ?, processed_by = ?
                    WHERE id = ?
                `, [officerComments, now, user.id, renewalId]);
            }

            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: isApproved ? 'APPROVE_DOCUMENT_RENEWAL' : 'REJECT_DOCUMENT_RENEWAL',
                entityName: 'documents',
                entityId: documentId,
                previousState: { status: doc.current_status, expiry_date: doc.expiry_date },
                newState: {
                    status: isApproved ? 'VALID' : 'REJECTED',
                    expiry_date: isApproved ? renewal.new_expiry_date : doc.expiry_date,
                    officerComments
                },
                justification: `Officer ${user.full_name} processed renewal: ${officerComments || (isApproved ? 'Approved' : 'Rejected')}`
            });
        });

        return { documentId, renewalId, status: isApproved ? 'APPROVED' : 'DEFICIENT' };
    }

    // Check expiry reminders (90, 60, 30, 15, 7 days) and return list of triggerable alerts
    evaluateExpiryAlerts() {
        const activeDocs = this.getDocuments();
        const alertTriggers = [];

        for (const doc of activeDocs) {
            if (doc.daysUntilExpiry !== null && doc.daysUntilExpiry > 0) {
                if (EXPIRY_ALERT_INTERVALS.includes(doc.daysUntilExpiry)) {
                    alertTriggers.push({
                        document: doc,
                        daysRemaining: doc.daysUntilExpiry,
                        eventType: 'DOCUMENT_EXPIRING'
                    });
                }
            } else if (doc.daysUntilExpiry !== null && doc.daysUntilExpiry <= 0) {
                alertTriggers.push({
                    document: doc,
                    daysRemaining: doc.daysUntilExpiry,
                    eventType: 'DOCUMENT_EXPIRED'
                });
            }
        }

        return alertTriggers;
    }
}

module.exports = new DocumentService();
