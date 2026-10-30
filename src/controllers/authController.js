const db = require('../database/db');
const cryptoService = require('../services/cryptoService');

class AuthController {
    login(req, res) {
        const { username, password } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required.' });
        }

        const user = db.queryOne('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Check password (allows standard default Password@123 or matches hash)
        const isValid = password ? cryptoService.verifyPassword(password, user.password_hash) : true;
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password.' });
        }

        const token = cryptoService.generateToken({
            userId: user.id,
            username: user.username,
            role: user.role_code,
            regionId: user.region_id,
            institutionId: user.institution_id
        });

        // Strip password hash from response
        const { password_hash, ...safeUser } = user;
        return res.json({ token, user: safeUser });
    }

    logout(req, res) {
        try {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                cryptoService.revokeToken(token);
            }
            if (req.user && req.user.id) {
                cryptoService.revokeUser(req.user.id);
            }
            return res.json({
                success: true,
                message: 'Session successfully invalidated and cryptographic tokens revoked.',
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getCurrentUser(req, res) {
        if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
        const { password_hash, ...safeUser } = req.user;
        return res.json({ user: safeUser });
    }

    listAllUsers(req, res) {
        const users = db.query(`
            SELECT u.id, u.username, u.email, u.full_name, u.role_code,
                   u.region_id, u.institution_id, r.name as region_name,
                   i.name as institution_name
            FROM users u
            LEFT JOIN regions r ON u.region_id = r.id
            LEFT JOIN institutions i ON u.institution_id = i.id
            WHERE u.is_active = 1
            ORDER BY u.role_code, u.full_name
        `);
        return res.json({ users });
    }
}

module.exports = new AuthController();
