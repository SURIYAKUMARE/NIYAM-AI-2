const { ROLES } = require('../config/constants');

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated: Please log in with a valid regulatory session.' });
    }
    next();
}

function requireRole(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthenticated: Please log in with a valid regulatory session.' });
        }

        // SUPER_ADMIN has platform oversight, but statutory rules still apply
        if (req.user.role_code === ROLES.SUPER_ADMIN) {
            return next();
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role_code)) {
            return res.status(403).json({
                error: `Forbidden: Role '${req.user.role_code}' does not have permission. Required: [${allowedRoles.join(', ')}]`
            });
        }

        next();
    };
}

// Enforce strict Regional and Institutional data isolation
function enforceDataIsolation(req, res, next) {
    if (!req.user) return next();

    // 1. Regional Officer isolation
    if (req.user.role_code === ROLES.REGIONAL_OFFICER && req.user.region_id) {
        req.enforcedRegionId = req.user.region_id;
    }

    // 2. Institution Representative isolation
    if (req.user.role_code === ROLES.INSTITUTION_REP) {
        req.enforcedInstitutionId = req.user.institution_id || 'INST_001';
    }

    next();
}

module.exports = {
    requireAuth,
    requireRole,
    enforceDataIsolation
};
