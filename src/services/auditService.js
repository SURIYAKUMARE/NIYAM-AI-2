const crypto = require('node:crypto');
const db = require('../database/db');
const cryptoService = require('./cryptoService');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

class AuditService {
    log({
        actorId,
        actorUsername,
        actorRole,
        actionType,
        entityName,
        entityId,
        previousState = null,
        newState = null,
        justification,
        workflowRuleVersion = 'APH-2026-v1.0',
        correlationId = null,
        clientIp = '127.0.0.1'
    }) {
        const lastRecord = db.queryOne('SELECT current_hash FROM audit_events ORDER BY id DESC LIMIT 1');
        const prevHash = lastRecord ? lastRecord.current_hash : GENESIS_HASH;

        const eventUuid = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const prevStateStr = previousState ? JSON.stringify(previousState) : '';
        const newStateStr = newState ? JSON.stringify(newState) : '';

        const currentHash = cryptoService.computeAuditChainHash(
            prevHash,
            eventUuid,
            actorId,
            actionType,
            entityName,
            entityId,
            prevStateStr,
            newStateStr,
            justification,
            timestamp
        );

        db.execute(`
            INSERT INTO audit_events (
                event_uuid, actor_user_id, actor_username, actor_role, action_type,
                entity_name, entity_id, previous_state_json, new_state_json,
                justification, workflow_rule_version, correlation_id, client_ip,
                prev_hash, current_hash, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            eventUuid, actorId, actorUsername, actorRole, actionType,
            entityName, entityId, prevStateStr, newStateStr,
            justification, workflowRuleVersion, correlationId, clientIp,
            prevHash, currentHash, timestamp
        ]);

        return { eventUuid, currentHash, timestamp };
    }

    getHistoryForEntity(entityName, entityId) {
        return db.query(`
            SELECT * FROM audit_events 
            WHERE entity_name = ? AND entity_id = ? 
            ORDER BY id DESC
        `, [entityName, entityId]);
    }

    getAllEvents({ limit = 100, offset = 0, entityName = null, actorRole = null }) {
        let sql = 'SELECT * FROM audit_events WHERE 1=1';
        const params = [];

        if (entityName) {
            sql += ' AND entity_name = ?';
            params.push(entityName);
        }
        if (actorRole) {
            sql += ' AND actor_role = ?';
            params.push(actorRole);
        }

        sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return db.query(sql, params);
    }

    // Cryptographic audit chain verification to guarantee non-repudiation and tamper-evidence
    verifyIntegrity() {
        const events = db.query('SELECT * FROM audit_events ORDER BY id ASC');
        if (events.length === 0) {
            return { isValid: true, count: 0, message: 'Audit log is clean and empty.' };
        }

        let expectedPrevHash = GENESIS_HASH;
        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            if (ev.prev_hash !== expectedPrevHash) {
                return {
                    isValid: false,
                    tamperedAtId: ev.id,
                    message: `Hash chain broken at event ID ${ev.id}: Expected prev_hash '${expectedPrevHash}', found '${ev.prev_hash}'`
                };
            }

            const calculatedHash = cryptoService.computeAuditChainHash(
                ev.prev_hash,
                ev.event_uuid,
                ev.actor_user_id,
                ev.action_type,
                ev.entity_name,
                ev.entity_id,
                ev.previous_state_json || '',
                ev.new_state_json || '',
                ev.justification || '',
                ev.created_at
            );

            if (calculatedHash !== ev.current_hash) {
                return {
                    isValid: false,
                    tamperedAtId: ev.id,
                    message: `Cryptographic content signature mismatch at event ID ${ev.id}! The record payload was altered.`
                };
            }

            expectedPrevHash = ev.current_hash;
        }

        return {
            isValid: true,
            count: events.length,
            message: `Cryptographic integrity verified across all ${events.length} audit records. Zero tampering detected.`
        };
    }
}

module.exports = new AuditService();
