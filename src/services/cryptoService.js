const crypto = require('node:crypto');
const util = require('node:util');
const { JWT_SECRET } = require('../config/constants');

const scryptAsync = util.promisify(crypto.scrypt);

class CryptoService {
    constructor() {
        this.revokedTokens = new Set();
        this.revokedUsers = new Map(); // userId -> revokedAtTimestamp
    }

    // Cryptographically secure asynchronous password hashing using Scrypt
    async hashPassword(password) {
        if (!password || typeof password !== 'string') {
            throw new Error('Password must be a non-empty string');
        }
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = await scryptAsync(password, salt, 64);
        return `${salt}:${hash.toString('hex')}`;
    }

    // Synchronous hashing used strictly during database bootstrap seeding
    hashPasswordSync(password) {
        if (!password || typeof password !== 'string') {
            throw new Error('Password must be a non-empty string');
        }
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }

    // Asynchronous non-blocking password verification with constant-time equality
    async verifyPassword(password, stored) {
        if (!password || typeof password !== 'string' || !stored || typeof stored !== 'string') {
            return false;
        }
        if (!stored.includes(':')) return false;
        const parts = stored.split(':');
        if (parts.length !== 2) return false;
        const [salt, key] = parts;
        if (!salt || !key || key.length !== 128) return false;

        try {
            const hash = await scryptAsync(password, salt, 64);
            return crypto.timingSafeEqual(Buffer.from(key, 'hex'), hash);
        } catch {
            return false;
        }
    }

    // JWT-compatible signed token implementation
    generateToken(payload, expiresInSeconds = 86400) {
        const header = { alg: 'HS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const exp = now + expiresInSeconds;
        const fullPayload = {
            ...payload,
            iss: 'NIYAM-AICTE',
            aud: 'NIYAM-PORTAL',
            iat: now,
            exp
        };

        const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
        const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
        const signature = crypto
            .createHmac('sha256', JWT_SECRET)
            .update(`${b64Header}.${b64Payload}`)
            .digest('base64url');

        return `${b64Header}.${b64Payload}.${signature}`;
    }

    revokeToken(token) {
        if (!token) return;
        this.revokedTokens.add(token);
    }

    isTokenRevoked(token) {
        if (!token) return false;
        return this.revokedTokens.has(token);
    }

    revokeUser(userId) {
        if (!userId) return;
        this.revokedUsers.set(userId, Date.now());
    }

    isUserRevoked(userId, issuedAtSeconds) {
        if (!userId) return false;
        const revokedAt = this.revokedUsers.get(userId);
        if (!revokedAt) return false;
        if (!issuedAtSeconds) return true;
        return (issuedAtSeconds * 1000) < revokedAt;
    }

    verifyToken(token) {
        try {
            if (!token || typeof token !== 'string') return null;
            if (this.isTokenRevoked(token)) return null;
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const [b64Header, b64Payload, signature] = parts;

            // Algorithm check: Strictly enforce HS256
            const header = JSON.parse(Buffer.from(b64Header, 'base64url').toString('utf8'));
            if (header.alg !== 'HS256' || header.typ !== 'JWT') {
                return null;
            }

            const expectedSig = crypto
                .createHmac('sha256', JWT_SECRET)
                .update(`${b64Header}.${b64Payload}`)
                .digest('base64url');

            if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
                return null;
            }

            const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                return null; // Expired
            }
            if (this.isUserRevoked(payload.userId, payload.iat)) {
                return null; // Session revoked
            }
            return payload;
        } catch {
            return null;
        }
    }

    // Calculate SHA-256 Hash
    sha256(data) {
        const str = typeof data === 'object' ? JSON.stringify(data) : String(data);
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    // Tamper-Evident Chained Audit Hash calculation
    computeAuditChainHash(prevHash, eventUuid, actorId, actionType, entityName, entityId, prevState, newState, justification, timestamp) {
        const payload = [
            prevHash || 'GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000000000000000',
            eventUuid,
            actorId,
            actionType,
            entityName,
            entityId,
            prevState || '',
            newState || '',
            justification || '',
            timestamp
        ].join('|');
        return this.sha256(payload);
    }
}

module.exports = new CryptoService();
