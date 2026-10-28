const test = require('node:test');
const assert = require('node:assert');
const db = require('../src/database/db');
const auditService = require('../src/services/auditService');

test('Cryptographic Audit Trail Integrity & Non-Repudiation', async (t) => {
    await t.test('1. Initial chained audit log passes integrity verification', () => {
        const result = auditService.verifyIntegrity();
        assert.strictEqual(result.isValid, true);
        assert.ok(result.count > 0);
    });

    await t.test('2. Tampering with any historical audit event invalidates chain', () => {
        // Log a test event
        auditService.log({
            actorId: 'TEST_ACTOR',
            actorUsername: 'test_user',
            actorRole: 'AUDITOR',
            actionType: 'TEST_TAMPER_ACTION',
            entityName: 'test_entity',
            entityId: 'TEST_01',
            justification: 'Legitimate audit entry before attack simulation'
        });

        const initialCheck = auditService.verifyIntegrity();
        assert.strictEqual(initialCheck.isValid, true);

        // Fetch latest record and maliciously mutate its payload in the database
        const latest = db.queryOne('SELECT * FROM audit_events ORDER BY id DESC LIMIT 1');
        db.execute("UPDATE audit_events SET justification = 'MALICIOUS_ALTERATION' WHERE id = ?", [latest.id]);

        // Verification MUST detect the tampering!
        const tamperedCheck = auditService.verifyIntegrity();
        assert.strictEqual(tamperedCheck.isValid, false);
        assert.strictEqual(tamperedCheck.tamperedAtId, latest.id);

        // Revert back for clean test state
        db.execute('UPDATE audit_events SET justification = ? WHERE id = ?', [latest.justification, latest.id]);
        const restoredCheck = auditService.verifyIntegrity();
        assert.strictEqual(restoredCheck.isValid, true);
    });
});
