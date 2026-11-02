const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');

class AphRoutingService {
    constructor() {
        this.seedDefaultsIfEmpty();
    }

    // Auto-seed default officer profiles and APH routing rules if tables are empty
    seedDefaultsIfEmpty() {
        try {
            const ruleCount = db.queryOne('SELECT COUNT(*) as c FROM aph_routing_rules').c;
            if (ruleCount === 0) {
                const defaultRules = [
                    {
                        id: 'RULE_APH_001',
                        rule_code: 'APH-ENGG-NEW',
                        rule_name: 'Engineering & Technology: New Institution Regulatory Routing',
                        aph_version: 'APH-2025-26',
                        category: 'Engineering & Technology',
                        subcategory: 'Setting Up New Technical Institution',
                        institution_type: 'Private-Unaided',
                        target_region_id: 'REG_NORTH',
                        specialization_required: 'Engineering & Technology',
                        workload_threshold: 15,
                        effective_from: '2025-01-01',
                        effective_to: '2027-12-31'
                    },
                    {
                        id: 'RULE_APH_002',
                        rule_code: 'APH-MGMT-EXT',
                        rule_name: 'Management (PGDM/MBA): Extension of Approval Fast-Track',
                        aph_version: 'APH-2025-26',
                        category: 'Management',
                        subcategory: 'Extension of Approval',
                        institution_type: 'Government',
                        target_region_id: 'REG_SOUTH',
                        specialization_required: 'Management',
                        workload_threshold: 20,
                        effective_from: '2025-01-01',
                        effective_to: '2027-12-31'
                    },
                    {
                        id: 'RULE_APH_003',
                        rule_code: 'APH-PHARM-INTAKE',
                        rule_name: 'Pharmacy & Healthcare: Increase in Intake & Supernumerary',
                        aph_version: 'APH-2025-26',
                        category: 'Pharmacy & Healthcare',
                        subcategory: 'Increase in Intake / Additional Course',
                        institution_type: 'Deemed',
                        target_region_id: 'REG_WEST',
                        specialization_required: 'Pharmacy & Healthcare',
                        workload_threshold: 15,
                        effective_from: '2025-01-01',
                        effective_to: '2027-12-31'
                    },
                    {
                        id: 'RULE_APH_004',
                        rule_code: 'APH-ARCH-NEW',
                        rule_name: 'Architecture & Planning: Statutory Council Joint Verification',
                        aph_version: 'APH-2025-26',
                        category: 'Architecture & Planning',
                        subcategory: 'Setting Up New Technical Institution',
                        institution_type: 'Private-Unaided',
                        target_region_id: 'REG_NORTH',
                        specialization_required: 'Architecture & Planning',
                        workload_threshold: 12,
                        effective_from: '2025-01-01',
                        effective_to: '2027-12-31'
                    },
                    {
                        id: 'RULE_APH_005',
                        rule_code: 'APH-GEN-GENERAL',
                        rule_name: 'General Technical Programme: Standard APH Allocation Baseline',
                        aph_version: 'APH-2025-26',
                        category: 'Engineering & Technology',
                        subcategory: 'Extension of Approval',
                        institution_type: null,
                        target_region_id: null,
                        specialization_required: 'General Regulatory Compliance',
                        workload_threshold: 25,
                        effective_from: '2025-01-01',
                        effective_to: '2027-12-31'
                    }
                ];

                for (const r of defaultRules) {
                    db.execute(`
                        INSERT OR IGNORE INTO aph_routing_rules (
                            id, rule_code, rule_name, aph_version, category, subcategory,
                            institution_type, target_region_id, specialization_required,
                            workload_threshold, is_active, effective_from, effective_to
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    `, [
                        r.id, r.rule_code, r.rule_name, r.aph_version, r.category, r.subcategory,
                        r.institution_type, r.target_region_id, r.specialization_required,
                        r.workload_threshold, r.effective_from, r.effective_to
                    ]);
                }
            }

            const profileCount = db.queryOne('SELECT COUNT(*) as c FROM officer_profiles').c;
            if (profileCount === 0) {
                const defaultProfiles = [
                    { userId: 'USR_RO_NORTH', spec: 'Engineering & Technology', maxW: 20, region: 'REG_NORTH' },
                    { userId: 'USR_RO_SOUTH', spec: 'Management', maxW: 20, region: 'REG_SOUTH' },
                    { userId: 'USR_RO_WEST', spec: 'Pharmacy & Healthcare', maxW: 20, region: 'REG_WEST' },
                    { userId: 'USR_SCRUTINY_01', spec: 'Engineering & Technology', maxW: 15, region: 'REG_NORTH' },
                    { userId: 'USR_EVC_COORD_01', spec: 'Architecture & Planning', maxW: 15, region: 'REG_NORTH' },
                    { userId: 'USR_COMPLIANCE_01', spec: 'General Regulatory Compliance', maxW: 25, region: 'REG_NORTH' },
                    { userId: 'USR_ADMIN_01', spec: 'General Regulatory Compliance', maxW: 50, region: 'REG_NW' }
                ];

                for (const p of defaultProfiles) {
                    // Check if user exists
                    const userExists = db.queryOne('SELECT id FROM users WHERE id = ?', [p.userId]);
                    if (userExists) {
                        const currentActiveCount = db.queryOne(`
                            SELECT COUNT(*) as c FROM applications 
                            WHERE assigned_officer_id = ? AND current_stage NOT IN ('APPROVED', 'REJECTED')
                        `, [p.userId]).c;

                        db.execute(`
                            INSERT OR IGNORE INTO officer_profiles (
                                user_id, specialization, max_workload, current_workload,
                                availability_status, region_id
                            ) VALUES (?, ?, ?, ?, 'AVAILABLE', ?)
                        `, [p.userId, p.spec, p.maxW, currentActiveCount, p.region]);
                    }
                }
            }
        } catch (e) {
            console.warn('[AphRoutingService] Seed initialization notice:', e.message);
        }
    }

    // List APH Routing Rules
    getRoutingRules({ aphVersion = null, category = null, isActive = null } = {}) {
        let sql = `
            SELECT r.*, reg.name as target_region_name, u.full_name as creator_name
            FROM aph_routing_rules r
            LEFT JOIN regions reg ON r.target_region_id = reg.id
            LEFT JOIN users u ON r.created_by = u.id
            WHERE 1=1
        `;
        const params = [];
        if (aphVersion) {
            sql += ' AND r.aph_version = ?';
            params.push(aphVersion);
        }
        if (category) {
            sql += ' AND r.category = ?';
            params.push(category);
        }
        if (isActive !== null) {
            sql += ' AND r.is_active = ?';
            params.push(isActive ? 1 : 0);
        }
        sql += ' ORDER BY r.created_at DESC';
        return db.query(sql, params);
    }

    // Create an APH Routing Rule
    createRoutingRule(data, user) {
        if (!data.rule_code || !data.rule_name || !data.category) {
            throw new Error('Rule code, rule name, and category are mandatory.');
        }

        const id = crypto.randomUUID();
        const aphVersion = data.aph_version || 'APH-2025-26';
        const effectiveFrom = data.effective_from || new Date().toISOString().split('T')[0];

        db.execute(`
            INSERT INTO aph_routing_rules (
                id, rule_code, rule_name, aph_version, category, subcategory,
                institution_type, target_region_id, specialization_required,
                workload_threshold, is_active, effective_from, effective_to, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, data.rule_code, data.rule_name, aphVersion, data.category, data.subcategory || null,
            data.institution_type || null, data.target_region_id || null, data.specialization_required || null,
            data.workload_threshold || 15, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
            effectiveFrom, data.effective_to || null, user.id
        ]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'CREATE_APH_ROUTING_RULE',
            entityName: 'aph_routing_rules',
            entityId: id,
            newState: data,
            justification: `Configured new APH routing rule: ${data.rule_code} (${data.rule_name})`
        });

        return { id, rule_code: data.rule_code, success: true };
    }

    // Update an APH Routing Rule
    updateRoutingRule(id, updates, user) {
        const existing = db.queryOne('SELECT * FROM aph_routing_rules WHERE id = ?', [id]);
        if (!existing) throw new Error('Routing rule not found.');

        const ruleName = updates.rule_name || existing.rule_name;
        const aphVersion = updates.aph_version || existing.aph_version;
        const category = updates.category || existing.category;
        const subcategory = updates.subcategory !== undefined ? updates.subcategory : existing.subcategory;
        const institutionType = updates.institution_type !== undefined ? updates.institution_type : existing.institution_type;
        const targetRegionId = updates.target_region_id !== undefined ? updates.target_region_id : existing.target_region_id;
        const specialization = updates.specialization_required !== undefined ? updates.specialization_required : existing.specialization_required;
        const workloadThreshold = updates.workload_threshold || existing.workload_threshold;
        const isActive = updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : existing.is_active;
        const effectiveTo = updates.effective_to !== undefined ? updates.effective_to : existing.effective_to;

        db.execute(`
            UPDATE aph_routing_rules SET
                rule_name = ?, aph_version = ?, category = ?, subcategory = ?,
                institution_type = ?, target_region_id = ?, specialization_required = ?,
                workload_threshold = ?, is_active = ?, effective_to = ?
            WHERE id = ?
        `, [
            ruleName, aphVersion, category, subcategory,
            institutionType, targetRegionId, specialization,
            workloadThreshold, isActive, effectiveTo, id
        ]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'UPDATE_APH_ROUTING_RULE',
            entityName: 'aph_routing_rules',
            entityId: id,
            previousState: existing,
            newState: updates,
            justification: `Updated APH routing rule: ${existing.rule_code}`
        });

        return { id, success: true };
    }

    // Delete or Deactivate APH Routing Rule
    deleteRoutingRule(id, user) {
        const existing = db.queryOne('SELECT * FROM aph_routing_rules WHERE id = ?', [id]);
        if (!existing) throw new Error('Routing rule not found.');

        db.execute('DELETE FROM aph_routing_rules WHERE id = ?', [id]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'DELETE_APH_ROUTING_RULE',
            entityName: 'aph_routing_rules',
            entityId: id,
            previousState: existing,
            justification: `Deleted APH routing rule: ${existing.rule_code}`
        });

        return { success: true, message: `Rule ${existing.rule_code} deleted successfully.` };
    }

    // Evaluate and execute automatic routing for an application
    evaluateAndRoute(applicationId, user) {
        const app = db.queryOne(`
            SELECT a.*, i.name as institution_name, i.category as inst_category,
                   i.institution_type as inst_type, i.region_id as inst_region_id,
                   at.name as app_type_name, at.category as app_category
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            JOIN application_types at ON a.application_type_code = at.code
            WHERE a.id = ?
        `, [applicationId]);

        if (!app) throw new Error(`Application ${applicationId} not found.`);

        const category = app.inst_category || app.app_category || 'Engineering & Technology';
        const subcategory = app.app_type_name || 'Setting Up New Technical Institution';
        const aphVersion = app.aph_version || 'APH-2025-26';

        // 1. Identify applicable APH routing rules ordered by specificity
        const rules = db.query(`
            SELECT * FROM aph_routing_rules
            WHERE is_active = 1
              AND (aph_version = ? OR aph_version = 'APH-2025-26')
              AND category = ?
              AND (subcategory IS NULL OR subcategory = ? OR ? LIKE '%' || subcategory || '%')
              AND date('now') >= date(effective_from)
              AND (effective_to IS NULL OR date('now') <= date(effective_to))
            ORDER BY 
                CASE WHEN subcategory IS NOT NULL THEN 1 ELSE 2 END,
                CASE WHEN institution_type IS NOT NULL THEN 1 ELSE 2 END
            LIMIT 1
        `, [aphVersion, category, subcategory, subcategory]);

        const matchedRule = rules[0] || null;

        // 2. Select Regional Office
        let targetRegionId = matchedRule?.target_region_id || app.inst_region_id || app.assigned_region_id || 'REG_NORTH';

        // 3. Select Qualified Officer based on: Region, Specialization, Workload, Availability
        let candidateOfficers = db.query(`
            SELECT op.*, u.full_name, u.email, u.role_code
            FROM officer_profiles op
            JOIN users u ON op.user_id = u.id
            WHERE op.region_id = ?
              AND op.availability_status = 'AVAILABLE'
              AND op.current_workload < op.max_workload
            ORDER BY 
                CASE WHEN op.specialization = ? THEN 1 ELSE 2 END,
                op.current_workload ASC,
                COALESCE(op.last_assigned_at, '2000-01-01') ASC
        `, [targetRegionId, matchedRule?.specialization_required || category]);

        // Fallback: search across all regions if regional capacity is exhausted
        if (candidateOfficers.length === 0) {
            candidateOfficers = db.query(`
                SELECT op.*, u.full_name, u.email, u.role_code
                FROM officer_profiles op
                JOIN users u ON op.user_id = u.id
                WHERE op.availability_status = 'AVAILABLE'
                ORDER BY op.current_workload ASC
                LIMIT 1
            `);
        }

        // If still no profile, fallback to any available officer user
        let assignedOfficerId = null;
        let assignedOfficerName = null;

        if (candidateOfficers.length > 0) {
            const bestOfficer = candidateOfficers[0];
            assignedOfficerId = bestOfficer.user_id;
            assignedOfficerName = bestOfficer.full_name;

            // Update officer profile workload
            db.execute(`
                UPDATE officer_profiles 
                SET current_workload = current_workload + 1,
                    last_assigned_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [assignedOfficerId]);
        } else {
            // Pick default regional officer
            const fallbackOfficer = db.queryOne(`
                SELECT id, full_name FROM users 
                WHERE region_id = ? AND role_code = 'REGIONAL_OFFICER'
                LIMIT 1
            `, [targetRegionId]) || db.queryOne("SELECT id, full_name FROM users WHERE role_code = 'REGIONAL_OFFICER' LIMIT 1");
            
            if (fallbackOfficer) {
                assignedOfficerId = fallbackOfficer.id;
                assignedOfficerName = fallbackOfficer.full_name;
            }
        }

        const fromOfficerId = app.assigned_officer_id;
        const fromRegionId = app.assigned_region_id;

        // 4. Update Application Record
        db.execute(`
            UPDATE applications 
            SET assigned_officer_id = ?,
                assigned_region_id = ?
            WHERE id = ?
        `, [assignedOfficerId, targetRegionId, applicationId]);

        // 5. Immutable Routing History Record
        const historyId = crypto.randomUUID();
        const reason = matchedRule 
            ? `Automated APH routing via rule [${matchedRule.rule_code}]: ${matchedRule.rule_name}`
            : 'Automated APH routing via standard workload and regional jurisdiction allocation';

        db.execute(`
            INSERT INTO routing_history (
                id, application_id, from_region_id, to_region_id, from_officer_id,
                to_officer_id, routing_rule_id, reassignment_reason, routed_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            historyId, applicationId, fromRegionId, targetRegionId,
            fromOfficerId, assignedOfficerId, matchedRule?.id || null,
            reason, user.id
        ]);

        // 6. Cryptographic Chained Audit Event
        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'AUTOMATIC_APH_ROUTING',
            entityName: 'applications',
            entityId: applicationId,
            previousState: { officerId: fromOfficerId, regionId: fromRegionId },
            newState: { officerId: assignedOfficerId, regionId: targetRegionId, ruleId: matchedRule?.id },
            justification: reason
        });

        return {
            success: true,
            applicationId,
            category,
            subcategory,
            matchedRule: matchedRule ? {
                id: matchedRule.id,
                ruleCode: matchedRule.rule_code,
                ruleName: matchedRule.rule_name,
                aphVersion: matchedRule.aph_version
            } : null,
            targetRegionId,
            assignedOfficerId,
            assignedOfficerName,
            routedAt: new Date().toISOString()
        };
    }

    // Manual Reassignment with Mandatory Reason
    manualReassign({ applicationId, toOfficerId, toRegionId = null, mandatoryReason, user }) {
        if (!mandatoryReason || mandatoryReason.trim().length < 10) {
            throw new Error('Mandatory justification of at least 10 characters is required for regulatory reassignment.');
        }

        const app = db.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
        if (!app) throw new Error(`Application ${applicationId} not found.`);

        const targetOfficer = db.queryOne('SELECT * FROM users WHERE id = ?', [toOfficerId]);
        if (!targetOfficer) throw new Error(`Target officer ${toOfficerId} not found.`);

        const finalRegionId = toRegionId || targetOfficer.region_id || app.assigned_region_id;
        const fromOfficerId = app.assigned_officer_id;
        const fromRegionId = app.assigned_region_id;

        // Update application
        db.execute(`
            UPDATE applications 
            SET assigned_officer_id = ?,
                assigned_region_id = ?
            WHERE id = ?
        `, [toOfficerId, finalRegionId, applicationId]);

        // Update workload profiles
        if (fromOfficerId) {
            db.execute(`
                UPDATE officer_profiles 
                SET current_workload = MAX(0, current_workload - 1)
                WHERE user_id = ?
            `, [fromOfficerId]);
        }
        db.execute(`
            UPDATE officer_profiles 
            SET current_workload = current_workload + 1,
                last_assigned_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [toOfficerId]);

        // Record history
        const historyId = crypto.randomUUID();
        db.execute(`
            INSERT INTO routing_history (
                id, application_id, from_region_id, to_region_id, from_officer_id,
                to_officer_id, routing_rule_id, reassignment_reason, routed_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
        `, [
            historyId, applicationId, fromRegionId, finalRegionId,
            fromOfficerId, toOfficerId, mandatoryReason.trim(), user.id
        ]);

        // Audit Trail
        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'MANUAL_ROUTING_REASSIGNMENT',
            entityName: 'applications',
            entityId: applicationId,
            previousState: { officerId: fromOfficerId, regionId: fromRegionId },
            newState: { officerId: toOfficerId, regionId: finalRegionId },
            justification: `[REASSIGNMENT] ${mandatoryReason.trim()}`
        });

        return {
            success: true,
            applicationId,
            fromOfficerId,
            toOfficerId,
            toOfficerName: targetOfficer.full_name,
            reason: mandatoryReason.trim(),
            reassignedAt: new Date().toISOString()
        };
    }

    // Get Routing History for an application
    getRoutingHistory(applicationId) {
        return db.query(`
            SELECT rh.*, 
                   rf.name as from_region_name, rt.name as to_region_name,
                   uf.full_name as from_officer_name, ut.full_name as to_officer_name,
                   ub.full_name as routed_by_name,
                   rr.rule_code, rr.rule_name
            FROM routing_history rh
            LEFT JOIN regions rf ON rh.from_region_id = rf.id
            LEFT JOIN regions rt ON rh.to_region_id = rt.id
            LEFT JOIN users uf ON rh.from_officer_id = uf.id
            LEFT JOIN users ut ON rh.to_officer_id = ut.id
            LEFT JOIN users ub ON rh.routed_by_user_id = ub.id
            LEFT JOIN aph_routing_rules rr ON rh.routing_rule_id = rr.id
            WHERE rh.application_id = ?
            ORDER BY rh.created_at DESC, rh.rowid DESC
        `, [applicationId]);
    }

    // Get Officer Profiles with capacity & current active cases
    getOfficerProfiles(regionId = null) {
        let sql = `
            SELECT op.*, u.full_name, u.email, u.role_code, r.name as region_name,
                   (SELECT COUNT(*) FROM applications WHERE assigned_officer_id = op.user_id AND current_stage NOT IN ('APPROVED', 'REJECTED')) as live_active_cases
            FROM officer_profiles op
            JOIN users u ON op.user_id = u.id
            LEFT JOIN regions r ON op.region_id = r.id
            WHERE 1=1
        `;
        const params = [];
        if (regionId) {
            sql += ' AND op.region_id = ?';
            params.push(regionId);
        }
        sql += ' ORDER BY live_active_cases DESC, op.specialization ASC';
        return db.query(sql, params);
    }

    // Update Officer Profile
    updateOfficerProfile(userId, data, user) {
        const existing = db.queryOne('SELECT * FROM officer_profiles WHERE user_id = ?', [userId]);
        if (!existing) {
            db.execute(`
                INSERT INTO officer_profiles (user_id, specialization, max_workload, availability_status, region_id)
                VALUES (?, ?, ?, ?, ?)
            `, [
                userId,
                data.specialization || 'General Regulatory Compliance',
                data.max_workload || 15,
                data.availability_status || 'AVAILABLE',
                data.region_id || null
            ]);
        } else {
            db.execute(`
                UPDATE officer_profiles SET
                    specialization = COALESCE(?, specialization),
                    max_workload = COALESCE(?, max_workload),
                    availability_status = COALESCE(?, availability_status),
                    region_id = COALESCE(?, region_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [
                data.specialization || null,
                data.max_workload || null,
                data.availability_status || null,
                data.region_id || null,
                userId
            ]);
        }

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'UPDATE_OFFICER_PROFILE',
            entityName: 'officer_profiles',
            entityId: userId,
            newState: data,
            justification: `Updated regulatory workload & availability profile for officer ${userId}`
        });

        return { success: true, userId };
    }
}

module.exports = new AphRoutingService();
