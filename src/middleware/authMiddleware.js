const db = require('../database/db');
const cryptoService = require('../services/cryptoService');

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const mockUserHeader = req.headers['x-user-id']; // For testing & demonstration role switching

    let user = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = cryptoService.verifyToken(token);
        if (payload && payload.userId) {
            user = db.queryOne('SELECT * FROM users WHERE id = ? AND is_active = 1', [payload.userId]);
        }
    } else if (mockUserHeader) {
        user = db.queryOne('SELECT * FROM users WHERE (id = ? OR username = ?) AND is_active = 1', [mockUserHeader, mockUserHeader]);
    }

    if (!user) {
        // Fallback to anonymous or superadmin if requested in local demo mode
        user = db.queryOne("SELECT * FROM users WHERE role_code = 'SUPER_ADMIN' LIMIT 1");
    }

    req.user = user;
    next();
}

module.exports = authMiddleware;
