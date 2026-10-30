const crypto = require('node:crypto');
const { JWT_SECRET } = require('../config/constants');

class CryptoService {
    constructor() {
        this.revokedTokens = new Set();
        this.revokedUsers = new Map(); // userId -> revokedAtTimestamp
    }

    // Cryptographically secure password hashing using Scrypt
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }

    verifyPassword(password, stored) {
        if (!stored || !stored.includes(':')) return false;
        const [salt, key] = stored.split(':');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
    }

    // JWT-compatible signed token implementation
    generateToken(payload, expiresInSeconds = 86400) {
        const header = { alg: 'HS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const exp = now + expiresInSeconds;
        const fullPayload = { ...payload, iat: now, exp };

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
            if (!token) return null;
            if (this.isTokenRevoked(token)) return null;
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const [b64Header, b64Payload, signature] = parts;

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
