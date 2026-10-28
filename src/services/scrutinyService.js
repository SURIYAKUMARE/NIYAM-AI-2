const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');
const workflowEngine = require('./workflowEngine');
const cryptoService = require('./cryptoService');
const { STAGES, STATUSES } = require('../config/constants');

class ScrutinyService {
    // Get assigned scrutiny queue for officer/region
    getScrutinyQueue({ officerId = null, regionId = null, stage = STAGES.SCRUTINY } = {}) {
        let sql = `
            SELECT a.*, i.name as institution_name, i.permanent_id, i.state, i.category as inst_category,
                   r.name as region_name, at.name as application_type_name
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            JOIN regions r ON a.assigned_region_id = r.id
            JOIN application_types at ON a.application_type_code = at.code
            WHERE a.current_stage IN ('SCRUTINY', 'RE_SCRUTINY')
        `;
        const params = [];
        if (regionId) {
            sql += ' AND a.assigned_region_id = ?';
            params.push(regionId);
        }
        if (officerId) {
            sql += ' AND (a.assigned_officer_id = ? OR a.assigned_officer_id IS NULL)';
            params.push(officerId);
        }
        sql += ' ORDER BY a.processing_due_date ASC';
        return db.query(sql, params);
    }

    // Get checklist and documents for scrutiny
    getChecklistForApplication(applicationId) {
        const app = db.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
        if (!app) throw new Error('Application not found.');

        const documents = db.query(`
            SELECT d.*, dt.name as doc_type_name, dt.is_mandatory
            FROM documents d
            JOIN document_types dt ON d.document_type_code = dt.code
            WHERE d.application_id = ? OR d.institution_id = ?
        `, [applicationId, app.institution_id]);

        const deficiencies = db.query(`
            SELECT * FROM deficiencies WHERE application_id = ? ORDER BY raised_at DESC
        `, [applicationId]);

        const reviews = db.query(`
            SELECT sr.*, u.full_name as officer_name
            FROM scrutiny_reviews sr
            JOIN users u ON sr.scrutiny_officer_id = u.id
            WHERE sr.application_id = ?
            ORDER BY sr.review_date DESC
        `, [applicationId]);

        return { application: app, documents, deficiencies, reviews };
    }

    // Raise Deficiency
    raiseDeficiency({
        applicationId,
        category,
        description,
        severity,
        regulatoryReference,
        user
    }) {
        const id = crypto.randomUUID();
        db.execute(`
            INSERT INTO deficiencies (
                id, application_id, stage_name, category, description,
                severity, regulatory_reference, status, raised_at
            ) VALUES (?, ?, 'SCRUTINY', ?, ?, ?, ?, 'RAISED', CURRENT_TIMESTAMP)
        `, [id, applicationId, category, description, severity, regulatoryReference]);

        // Increment deficiency count on application
        db.execute(`
            UPDATE applications 
            SET deficiency_count = deficiency_count + 1, current_status = 'DEFICIENCY_RAISED'
            WHERE id = ?
        `, [applicationId]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'RAISE_DEFICIENCY',
            entityName: 'deficiencies',
            entityId: id,
            newState: { category, severity, regulatoryReference, description },
            justification: `Raised ${severity} deficiency on application ${applicationId}: ${regulatoryReference}`
        });

        return { id, status: 'RAISED' };
    }

    // Institution submits response to deficiency
    submitDeficiencyResponse({ deficiencyId, responseText, responseDocUrl, user }) {
        const def = db.queryOne('SELECT * FROM deficiencies WHERE id = ?', [deficiencyId]);
        if (!def) throw new Error('Deficiency record not found.');

        const now = new Date().toISOString();
        db.execute(`
            UPDATE deficiencies
            SET response_text = ?, response_document_url = ?, status = 'RESPONSES_SUBMITTED', responded_at = ?
            WHERE id = ?
        `, [responseText, responseDocUrl, now, deficiencyId]);

        // Update application status
        db.execute(`
            UPDATE applications
            SET current_status = 'RESPONSES_SUBMITTED'
            WHERE id = ?
        `, [def.application_id]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'DEFICIENCY_RESPONSE',
            entityName: 'deficiencies',
            entityId: deficiencyId,
            newState: { status: 'RESPONSES_SUBMITTED', responseText, responseDocUrl },
            justification: `Institution submitted compliance explanation for deficiency ${deficiencyId}`
        });

        return { deficiencyId, status: 'RESPONSES_SUBMITTED' };
    }

    // Scrutiny Officer Completes Review
    completeReview({
        applicationId,
        outcome, // 'RECOMMENDED', 'DEFICIENT', 'REJECTED'
        generalRemarks,
        user
    }) {
        const app = db.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
        if (!app) throw new Error('Application not found.');

        const reviewId = crypto.randomUUID();
        const digitalSig = cryptoService.sha256(`${user.id}:${applicationId}:${outcome}:${Date.now()}`);

        db.execute(`
            INSERT INTO scrutiny_reviews (
                id, application_id, stage_name, scrutiny_officer_id,
                review_date, outcome, general_remarks, digital_signature_hash
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
        `, [reviewId, applicationId, app.current_stage, user.id, outcome, generalRemarks, digitalSig]);

        // Auto-advance workflow based on scrutiny outcome
        if (outcome === 'RECOMMENDED') {
            workflowEngine.transition({
                applicationId,
                toStage: STAGES.EVC,
                condition: 'ALL_DOCUMENTS_CLEARED',
                user,
                comments: `Scrutiny cleared by ${user.full_name}. Recommended for EVC inspection.`
            });
        } else if (outcome === 'DEFICIENT') {
            if (app.current_stage === STAGES.SCRUTINY) {
                workflowEngine.transition({
                    applicationId,
                    toStage: STAGES.RE_SCRUTINY,
                    condition: 'DEFICIENCY_RAISED',
                    user,
                    comments: `Deficiencies identified during scrutiny. Routed to RE_SCRUTINY.`
                });
            } else {
                // Already in re-scrutiny and still deficient -> Route to SAC/SHC appeal
                workflowEngine.transition({
                    applicationId,
                    toStage: STAGES.SAC_SHC,
                    condition: 'RE_SCRUTINY_REJECTED_APPEAL',
                    user,
                    comments: `Deficiencies persist after Re-Scrutiny. Referred to SAC/SHC hearing.`
                });
            }
        } else if (outcome === 'REJECTED') {
            workflowEngine.transition({
                applicationId,
                toStage: STAGES.REJECTED,
                condition: 'SCRUTINY_REJECTION',
                user,
                comments: `Scrutiny committee rejected application: ${generalRemarks}`
            });
        }

        return { reviewId, outcome, digitalSignature: digitalSig };
    }
}

module.exports = new ScrutinyService();
