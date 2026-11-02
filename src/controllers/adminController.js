const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('../services/auditService');
const { ROLES } = require('../config/constants');

class AdminController {
    // 1. Roles & Permissions Matrix
    getRolesMatrix(req, res) {
        try {
            const roles = db.query(`
                SELECT r.code, r.name, r.description, r.permissions_json,
                       COUNT(u.id) as user_count
                FROM roles r
                LEFT JOIN users u ON r.code = u.role_code AND u.is_active = 1
                GROUP BY r.code, r.name, r.description, r.permissions_json
                ORDER BY r.code ASC
            `);

            const parsedRoles = roles.map(r => ({
                code: r.code,
                name: r.name,
                description: r.description,
                permissions: JSON.parse(r.permissions_json || '[]'),
                activeUserCount: r.user_count
            }));

            return res.json({
                roles: parsedRoles,
                totalRoles: parsedRoles.length,
                governanceFramework: 'AICTE Approval Process Handbook (APH 2025–26) Role Taxonomy'
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // 2. Assign / Update User Role
    updateUserRole(req, res) {
        try {
            const { userId } = req.params;
            const { roleCode, regionId } = req.body;

            if (!ROLES[roleCode]) {
                return res.status(400).json({ error: `Invalid roleCode '${roleCode}'. Must match official ROLES dictionary.` });
            }

            const user = db.queryOne('SELECT * FROM users WHERE id = ?', [userId]);
            if (!user) {
                return res.status(404).json({ error: 'User account not found.' });
            }

            const now = new Date().toISOString();
            db.execute(`
                UPDATE users
                SET role_code = ?, region_id = COALESCE(?, region_id), updated_at = ?
                WHERE id = ?
            `, [roleCode, regionId || null, now, userId]);

            auditService.log({
                actorId: req.user.id,
                actorUsername: req.user.username,
                actorRole: req.user.role_code,
                actionType: 'UPDATE_USER_ROLE',
                entityName: 'users',
                entityId: userId,
                previousState: { role_code: user.role_code, region_id: user.region_id },
                newState: { role_code: roleCode, region_id: regionId || user.region_id },
                justification: `Administrator ${req.user.full_name} updated role for ${user.username} to ${roleCode}`
            });

            return res.json({
                message: `User '${user.username}' successfully reassigned to role '${roleCode}'.`,
                userId,
                newRole: roleCode
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // 3. Get Retention Policies
    getRetentionPolicies(req, res) {
        try {
            const policies = db.query(`
                SELECT rp.*, u.full_name as updated_by_name
                FROM retention_policies rp
                LEFT JOIN users u ON rp.updated_by = u.id
                ORDER BY rp.retention_period_years DESC
            `);

            return res.json({
                policies,
                total: policies.length,
                complianceNotice: 'Retention policies enforced under Information Technology Act 2000 & AICTE Statutory Record Mandates'
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // 4. Update Retention Policy
    updateRetentionPolicy(req, res) {
        try {
            const { id } = req.params;
            const { retentionPeriodYears, archiveStorageTier, autoPurgeEnabled, isActive } = req.body;

            const policy = db.queryOne('SELECT * FROM retention_policies WHERE id = ?', [id]);
            if (!policy) {
                return res.status(404).json({ error: 'Retention policy record not found.' });
            }

            const now = new Date().toISOString();
            const years = Number.isInteger(Number(retentionPeriodYears)) ? Number(retentionPeriodYears) : policy.retention_period_years;
            const tier = archiveStorageTier || policy.archive_storage_tier;
            const autoPurge = typeof autoPurgeEnabled === 'boolean' ? (autoPurgeEnabled ? 1 : 0) : policy.auto_purge_enabled;
            const active = typeof isActive === 'boolean' ? (isActive ? 1 : 0) : policy.is_active;

            db.execute(`
                UPDATE retention_policies
                SET retention_period_years = ?, archive_storage_tier = ?,
                    auto_purge_enabled = ?, is_active = ?,
                    updated_by = ?, updated_at = ?
                WHERE id = ?
            `, [years, tier, autoPurge, active, req.user.id, now, id]);

            auditService.log({
                actorId: req.user.id,
                actorUsername: req.user.username,
                actorRole: req.user.role_code,
                actionType: 'UPDATE_RETENTION_POLICY',
                entityName: 'retention_policies',
                entityId: id,
                previousState: policy,
                newState: { retentionPeriodYears: years, archiveStorageTier: tier, autoPurgeEnabled: autoPurge, isActive: active },
                justification: `Administrator updated retention parameters for policy ${policy.policy_name}`
            });

            return res.json({
                message: `Retention policy '${policy.policy_name}' updated successfully.`,
                policy: { id, retentionPeriodYears: years, archiveStorageTier: tier, autoPurgeEnabled: autoPurge, isActive: active }
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new AdminController();
