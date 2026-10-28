const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');

class UndertakingService {
    // Generate sequential undertaking reference code
    generateUndertakingRef() {
        const year = new Date().getFullYear();
        const count = db.queryOne('SELECT COUNT(*) as count FROM undertakings').count + 1;
        return `UTK-${year}-${String(count).padStart(4, '0')}`;
    }

    // List undertakings with filtering
    getUndertakings({ institutionId = null, status = null, regionId = null } = {}) {
        let sql = `
            SELECT u.*, i.name as institution_name, i.permanent_id, r.name as region_name,
                   a.application_no, us.full_name as verified_by_name
            FROM undertakings u
            JOIN institutions i ON u.institution_id = i.id
            JOIN regions r ON i.region_id = r.id
            LEFT JOIN applications a ON u.application_id = a.id
            LEFT JOIN users us ON u.verified_by = us.id
            WHERE 1=1
        `;
        const params = [];
        if (institutionId) {
            sql += ' AND u.institution_id = ?';
            params.push(institutionId);
        }
        if (status) {
            sql += ' AND u.status = ?';
            params.push(status);
        }
        if (regionId) {
            sql += ' AND i.region_id = ?';
            params.push(regionId);
        }
        sql += ' ORDER BY u.due_date ASC';
        return db.query(sql, params);
    }

    // Create a new time-bound undertaking
    createUndertaking({
        institutionId,
        applicationId = null,
        conditionTitle,
        regulatorySource,
        obligationDetails,
        dueDate,
        responsiblePerson,
        user
    }) {
        const id = crypto.randomUUID();
        const undertakingRef = this.generateUndertakingRef();
        const issueDate = new Date().toISOString().split('T')[0];

        db.execute(`
            INSERT INTO undertakings (
                id, undertaking_ref, institution_id, application_id, condition_title,
                regulatory_source, obligation_details, issue_date, due_date,
                responsible_person, status, verification_authority_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'COMPLIANCE_OFFICER')
        `, [
            id, undertakingRef, institutionId, applicationId, conditionTitle,
            regulatorySource, obligationDetails, issueDate, dueDate, responsiblePerson
        ]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'CREATE_UNDERTAKING',
            entityName: 'undertakings',
            entityId: id,
            newState: { undertakingRef, conditionTitle, dueDate, responsiblePerson },
            justification: `Issued conditional compliance undertaking ${undertakingRef} to institution ${institutionId}`
        });

        return { id, undertakingRef, status: 'PENDING' };
    }

    // Institution submits compliance evidence
    submitComplianceEvidence({
        undertakingId,
        evidenceTitle,
        documentUrl,
        remarks = '',
        user
    }) {
        const utk = db.queryOne('SELECT * FROM undertakings WHERE id = ?', [undertakingId]);
        if (!utk) throw new Error('Undertaking not found.');

        const submissionId = crypto.randomUUID();
        const now = new Date().toISOString();

        db.transaction((tx) => {
            // Record submission
            tx.execute(`
                INSERT INTO compliance_submissions (
                    id, undertaking_id, institution_id, submission_date,
                    evidence_title, document_url, remarks, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')
            `, [submissionId, undertakingId, utk.institution_id, now, evidenceTitle, documentUrl, remarks]);

            // Update undertaking status to UNDER_VERIFICATION (Non-negotiable rule: submission != compliance)
            tx.execute(`
                UPDATE undertakings
                SET status = 'UNDER_VERIFICATION'
                WHERE id = ?
            `, [undertakingId]);

            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: 'SUBMIT_COMPLIANCE_EVIDENCE',
                entityName: 'undertakings',
                entityId: undertakingId,
                previousState: { status: utk.status },
                newState: { status: 'UNDER_VERIFICATION', evidenceTitle, documentUrl },
                justification: `Institution submitted evidence for undertaking ${utk.undertaking_ref}. Awaiting officer verification.`
            });
        });

        return { submissionId, status: 'UNDER_VERIFICATION' };
    }

    // Compliance Officer verifies submitted evidence
    verifyCompliance({
        undertakingId,
        verificationOutcome, // 'VERIFIED' or 'DEFICIENCY_RAISED'
        reviewRemarks,
        user
    }) {
        const utk = db.queryOne('SELECT * FROM undertakings WHERE id = ?', [undertakingId]);
        if (!utk) throw new Error('Undertaking not found.');

        const now = new Date().toISOString();
        const isVerified = verificationOutcome === 'VERIFIED';
        const newStatus = isVerified ? 'VERIFIED' : 'DEFICIENCY_RAISED';

        db.transaction((tx) => {
            // Update latest submission
            tx.execute(`
                UPDATE compliance_submissions
                SET status = ?, reviewed_by = ?, reviewed_at = ?, review_remarks = ?
                WHERE undertaking_id = ? AND status = 'SUBMITTED'
            `, [isVerified ? 'ACCEPTED' : 'REJECTED_DEFICIENT', user.id, now, reviewRemarks, undertakingId]);

            // Update undertaking
            tx.execute(`
                UPDATE undertakings
                SET status = ?, verified_by = ?, verified_at = ?, closed_at = ?
                WHERE id = ?
            `, [newStatus, user.id, now, isVerified ? now : null, undertakingId]);

            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: 'VERIFY_COMPLIANCE',
                entityName: 'undertakings',
                entityId: undertakingId,
                previousState: { status: utk.status },
                newState: { status: newStatus, verificationOutcome, reviewRemarks },
                justification: `Compliance Officer ${user.full_name} completed verification for ${utk.undertaking_ref}: ${reviewRemarks}`
            });
        });

        return { undertakingId, status: newStatus, verifiedAt: now };
    }

    // Get single undertaking details with complete submission history
    getUndertakingDetails(undertakingId) {
        const utk = db.queryOne(`
            SELECT u.*, i.name as institution_name, i.permanent_id, r.name as region_name,
                   a.application_no, us.full_name as verified_by_name
            FROM undertakings u
            JOIN institutions i ON u.institution_id = i.id
            JOIN regions r ON i.region_id = r.id
            LEFT JOIN applications a ON u.application_id = a.id
            LEFT JOIN users us ON u.verified_by = us.id
            WHERE u.id = ?
        `, [undertakingId]);

        if (!utk) throw new Error('Undertaking not found.');

        const submissions = db.query(`
            SELECT cs.*, u.full_name as reviewed_by_name
            FROM compliance_submissions cs
            LEFT JOIN users u ON cs.reviewed_by = u.id
            WHERE cs.undertaking_id = ?
            ORDER BY cs.submission_date DESC
        `, [undertakingId]);

        return { undertaking: utk, submissions };
    }
}

module.exports = new UndertakingService();
