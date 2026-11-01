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

// In-Memory Rate Limiting for Authentication Attempts
const loginAttempts = new Map(); // key -> { count, firstAttempt, lockUntil }

class AuthController {
    async login(req, res) {
        const { username, password } = req.body || {};
        const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
        const rateLimitKey = `${clientIp}:${(username || '').toLowerCase()}`;

        // 1. Rate Limiting / Lockout Check
        const now = Date.now();
        const attempt = loginAttempts.get(rateLimitKey);
        if (attempt && attempt.lockUntil && attempt.lockUntil > now) {
            const waitSeconds = Math.ceil((attempt.lockUntil - now) / 1000);
            return res.status(429).json({
                error: `Too many failed authentication attempts. Account temporarily locked for security. Please try again in ${waitSeconds} second(s).`
            });
        }

        // 2. Mandatory Parameter Validation
        if (!username || typeof username !== 'string' || username.trim() === '') {
            return res.status(400).json({ error: 'Username is required.' });
        }
        if (!password || typeof password !== 'string' || password.trim() === '') {
            return res.status(400).json({ error: 'Password is required.' });
        }

        const normalizedUsername = username.toLowerCase().trim();
        const targetUsername = USERNAME_ALIASES[normalizedUsername] || normalizedUsername;

        // 3. User Lookup in Database
        const user = db.queryOne(
            'SELECT * FROM users WHERE (LOWER(username) = ? OR LOWER(username) = ?) AND is_active = 1',
            [normalizedUsername, targetUsername]
        );

        if (!user) {
            this.recordFailedAttempt(rateLimitKey);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // 4. Cryptographic Password Verification (Non-Blocking Scrypt)
        const isValid = await cryptoService.verifyPassword(password, user.password_hash);
        if (!isValid) {
            this.recordFailedAttempt(rateLimitKey);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // 5. Success: Clear failed attempts
        loginAttempts.delete(rateLimitKey);

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

    recordFailedAttempt(key) {
        const now = Date.now();
        const attempt = loginAttempts.get(key) || { count: 0, firstAttempt: now };
        attempt.count += 1;
        // Lock after 5 failed attempts for 15 minutes
        if (attempt.count >= 5) {
            attempt.lockUntil = now + 15 * 60 * 1000;
        }
        loginAttempts.set(key, attempt);
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
