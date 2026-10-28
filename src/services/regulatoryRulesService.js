const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');

class RegulatoryRulesService {
    // Standard default workflow definitions adhering to APH guidelines
    getDefaultWorkflowDefinitions() {
        return [
            {
                code: 'WF_STANDARD_NEW_INST',
                name: 'New Technical Institution Approval Lifecycle',
                category: 'NEW_INSTITUTION',
                version: 1,
                stages: [
                    { name: 'SUBMITTED', label: 'Application Submission', slaDays: 1, allowedRoles: ['INSTITUTION_REP'] },
                    { name: 'SCRUTINY', label: 'Scrutiny Committee Document Verification', slaDays: 7, allowedRoles: ['SCRUTINY_MEMBER', 'REGIONAL_OFFICER'] },
                    { name: 'RE_SCRUTINY', label: 'Re-Scrutiny of Deficiencies', slaDays: 5, allowedRoles: ['SCRUTINY_MEMBER', 'REGIONAL_OFFICER'] },
                    { name: 'EVC', label: 'Expert Visit Committee Physical Inspection', slaDays: 14, allowedRoles: ['EVC_COORDINATOR', 'EVC_MEMBER'] },
                    { name: 'SAC_SHC', label: 'Standing Appellate / Hearing Committee Review', slaDays: 10, allowedRoles: ['SAC_SHC_MEMBER'] },
                    { name: 'COMPETENT_DECISION', label: 'Statutory Competent Authority Sanction', slaDays: 7, allowedRoles: ['COMPETENT_AUTHORITY'] }
                ],
                transitions: [
                    { from: 'SUBMITTED', to: 'SCRUTINY', condition: 'DOCUMENTS_VERIFIED', actorRole: ['REGIONAL_OFFICER', 'SCRUTINY_MEMBER'] },
                    { from: 'SCRUTINY', to: 'EVC', condition: 'ALL_DOCUMENTS_CLEARED', actorRole: ['SCRUTINY_MEMBER', 'REGIONAL_OFFICER'] },
                    { from: 'SCRUTINY', to: 'RE_SCRUTINY', condition: 'DEFICIENCY_RAISED', actorRole: ['SCRUTINY_MEMBER', 'REGIONAL_OFFICER'] },
                    { from: 'RE_SCRUTINY', to: 'EVC', condition: 'DEFICIENCIES_RECTIFIED', actorRole: ['SCRUTINY_MEMBER', 'REGIONAL_OFFICER'] },
                    { from: 'RE_SCRUTINY', to: 'SAC_SHC', condition: 'RE_SCRUTINY_REJECTED_APPEAL', actorRole: ['SCRUTINY_MEMBER', 'REGIONAL_OFFICER'] },
                    { from: 'EVC', to: 'COMPETENT_DECISION', condition: 'INSPECTION_RECOMMENDED', actorRole: ['EVC_COORDINATOR', 'REGIONAL_OFFICER'] },
                    { from: 'EVC', to: 'SAC_SHC', condition: 'INSPECTION_DEFICIENT_APPEAL', actorRole: ['EVC_COORDINATOR', 'REGIONAL_OFFICER'] },
                    { from: 'SAC_SHC', to: 'COMPETENT_DECISION', condition: 'HEARING_COMPLETED', actorRole: ['SAC_SHC_MEMBER'] },
                    { from: 'COMPETENT_DECISION', to: 'APPROVED', condition: 'STATUTORY_SANCTION', actorRole: ['COMPETENT_AUTHORITY'] },
                    { from: 'COMPETENT_DECISION', to: 'REJECTED', condition: 'STATUTORY_REJECTION', actorRole: ['COMPETENT_AUTHORITY'] }
                ]
            },
            {
                code: 'WF_EOA_EXTENSION',
                name: 'Extension of Approval (EoA) Streamlined Workflow',
                category: 'EOA',
                version: 1,
                stages: [
                    { name: 'SUBMITTED', label: 'EoA Submission', slaDays: 1, allowedRoles: ['INSTITUTION_REP'] },
                    { name: 'SCRUTINY', label: 'Scrutiny Committee Compliance Verification', slaDays: 5, allowedRoles: ['SCRUTINY_MEMBER'] },
                    { name: 'COMPETENT_DECISION', label: 'EoA Grant Order', slaDays: 5, allowedRoles: ['COMPETENT_AUTHORITY'] }
                ],
                transitions: [
                    { from: 'SUBMITTED', to: 'SCRUTINY', condition: 'EOA_VALIDATED', actorRole: ['REGIONAL_OFFICER', 'SCRUTINY_MEMBER'] },
                    { from: 'SCRUTINY', to: 'COMPETENT_DECISION', condition: 'SCRUTINY_CLEARED', actorRole: ['SCRUTINY_MEMBER', 'REGIONAL_OFFICER'] },
                    { from: 'SCRUTINY', to: 'EVC', condition: 'SURPRISE_EVC_TRIGGERED', actorRole: ['REGIONAL_OFFICER', 'SCRUTINY_MEMBER'] },
                    { from: 'COMPETENT_DECISION', to: 'APPROVED', condition: 'EOA_ISSUED', actorRole: ['COMPETENT_AUTHORITY'] }
                ]
            }
        ];
    }

    // Version-controlled regulatory rule management
    getRules({ academicYear = null, status = 'PUBLISHED' } = {}) {
        let sql = 'SELECT * FROM regulatory_rule_sets WHERE 1=1';
        const params = [];
        if (academicYear) {
            sql += ' AND academic_year = ?';
            params.push(academicYear);
        }
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        sql += ' ORDER BY created_at DESC';
        return db.query(sql, params).map(r => ({
            ...r,
            rule_content: JSON.parse(r.rule_content_json)
        }));
    }

    createRuleDraft({
        academicYear,
        aphVersion,
        ruleKey,
        category,
        institutionType,
        ruleContent,
        user
    }) {
        const id = crypto.randomUUID();
        const contentJson = JSON.stringify(ruleContent);

        db.execute(`
            INSERT INTO regulatory_rule_sets (
                id, academic_year, aph_version, rule_key, category,
                institution_type, rule_content_json, status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
        `, [id, academicYear, aphVersion, ruleKey, category, institutionType, contentJson, user.id]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'CREATE_RULE_DRAFT',
            entityName: 'regulatory_rule_sets',
            entityId: id,
            newState: { ruleKey, aphVersion, status: 'DRAFT' },
            justification: `Created draft regulatory rule for ${ruleKey} under ${aphVersion}`
        });

        return { id, status: 'DRAFT' };
    }

    publishRule(ruleId, user) {
        if (!['SUPER_ADMIN', 'REGULATION_BUREAU_ADMIN'].includes(user.role_code)) {
            throw new Error('Unauthorised: Only Regulation Bureau Administrators or Super Admins can publish regulatory rules.');
        }

        const existing = db.queryOne('SELECT * FROM regulatory_rule_sets WHERE id = ?', [ruleId]);
        if (!existing) {
            throw new Error('Regulatory rule not found.');
        }

        const now = new Date().toISOString();
        db.execute(`
            UPDATE regulatory_rule_sets
            SET status = 'PUBLISHED', published_by = ?, published_at = ?
            WHERE id = ?
        `, [user.id, now, ruleId]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'PUBLISH_RULE',
            entityName: 'regulatory_rule_sets',
            entityId: ruleId,
            previousState: { status: existing.status },
            newState: { status: 'PUBLISHED', published_at: now },
            justification: `Formally published regulatory rule ${existing.rule_key} for ${existing.academic_year}`
        });

        return { id: ruleId, status: 'PUBLISHED', published_at: now };
    }
}

module.exports = new RegulatoryRulesService();
