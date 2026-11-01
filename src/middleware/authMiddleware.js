const db = require('../database/db');
const cryptoService = require('../services/cryptoService');

const USERNAME_ALIASES = {
    'dr.vandana.rao': 'scrutiny_expert1',
    'officer': 'scrutiny_expert1',
    'dr.suresh.chandra': 'inst_apex',
    'applicant': 'inst_apex',
    'prof.anil.sahasrabudhe': 'bureauadmin',
    'authority': 'bureauadmin',
    'smt.priya.sundaram': 'compliance_officer1',
    'compliance': 'compliance_officer1',
    'shri.rajeshwar.rao': 'auditor1',
    'auditor': 'auditor1',
    'dr.rk.shrivastava': 'superadmin',
    'admin': 'superadmin',
    'er.manoj.verma': 'ro_northern',
    'ro_north': 'ro_northern',
    'regional_officer': 'ro_northern',
    'shri.vikramaditya.rathore': 'evc_coord1',
    'evc_coord': 'evc_coord1',
    'prof.devendra.pathak': 'evc_expert1',
    'evc_member': 'evc_expert1'
};

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    let user = null;

    // 1. Authoritative Cryptographic Authentication: Bearer JWT Token
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        const payload = cryptoService.verifyToken(token);
        if (payload && payload.userId) {
            // Verify user exists and account is active in trusted database
            const dbUser = db.queryOne('SELECT * FROM users WHERE id = ? AND is_active = 1', [payload.userId]);
            if (dbUser) {
                // Prevent privilege escalation: user role must match authoritative database record
                if (!payload.role || payload.role === dbUser.role_code) {
                    user = dbUser;
                }
            }
        }
        // When Bearer token was supplied, never fall back to headers
    } 
    // 2. Strictly isolated test-only harness (ONLY when no Bearer token provided) — NEVER in production
    else {
        const isTestExecution = process.env.NODE_ENV === 'test' || process.argv.some(arg => typeof arg === 'string' && arg.includes('test'));
        const isProductionEnv = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

        if (isTestExecution && !isProductionEnv && req.headers['x-user-id']) {
            const mockUserHeader = req.headers['x-user-id'];
            const resolved = USERNAME_ALIASES[mockUserHeader.toLowerCase()] || mockUserHeader;
            user = db.queryOne('SELECT * FROM users WHERE (id = ? OR username = ?) AND is_active = 1', [resolved, resolved]);
        }
    }

    req.user = user;
    next();
}

module.exports = authMiddleware;
