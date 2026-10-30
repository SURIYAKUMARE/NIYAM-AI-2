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
    'admin': 'superadmin'
};

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const mockUserHeader = req.headers['x-user-id'];

    let user = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = cryptoService.verifyToken(token);
        if (payload && payload.userId) {
            user = db.queryOne('SELECT * FROM users WHERE id = ? AND is_active = 1', [payload.userId]);
        }
    } else if (mockUserHeader) {
        const resolved = USERNAME_ALIASES[mockUserHeader.toLowerCase()] || mockUserHeader;
        user = db.queryOne('SELECT * FROM users WHERE (id = ? OR username = ?) AND is_active = 1', [resolved, resolved]);
    }

    req.user = user;
    next();
}

module.exports = authMiddleware;
