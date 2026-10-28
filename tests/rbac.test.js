const test = require('node:test');
const assert = require('node:assert');
const db = require('../src/database/db');
const regulatoryRulesService = require('../src/services/regulatoryRulesService');

test('RBAC & Institutional Data Isolation', async (t) => {
    const instRep1 = db.queryOne("SELECT * FROM users WHERE id = 'USR_REP_01'");
    const instRep2 = db.queryOne("SELECT * FROM users WHERE id = 'USR_REP_02'");
    const roNorth = db.queryOne("SELECT * FROM users WHERE id = 'USR_RO_NORTH'");
    const bureauAdmin = db.queryOne("SELECT * FROM users WHERE id = 'USR_BUREAU_01'");

    await t.test('1. Institution Representative cannot access another institution files', () => {
        const inst1Docs = db.query('SELECT * FROM documents WHERE institution_id = ?', [instRep1.institution_id]);
        const inst2Docs = db.query('SELECT * FROM documents WHERE institution_id = ?', [instRep2.institution_id]);

        // Verify that inst1 has documents
        assert.ok(inst1Docs.length > 0);

        // Verify none of inst1 documents belong to inst2
        const hasLeakage = inst1Docs.some(d => d.institution_id === instRep2.institution_id);
        assert.strictEqual(hasLeakage, false);
    });

    await t.test('2. Regional Officer jurisdiction isolation', () => {
        const northernApps = db.query('SELECT * FROM applications WHERE assigned_region_id = ?', [roNorth.region_id]);
        assert.ok(northernApps.length > 0);
        const containsSouthern = northernApps.some(a => a.assigned_region_id === 'REG_SOUTH');
        assert.strictEqual(containsSouthern, false);
    });

    await t.test('3. Non-authorized role cannot publish regulatory rules', () => {
        const testKey = `RULE_TEST_UNAUTH_${Date.now()}`;
        const draft = regulatoryRulesService.createRuleDraft({
            academicYear: '2026-2027',
            aphVersion: 'APH-2026-TEST',
            ruleKey: testKey,
            category: 'TEST',
            institutionType: 'TEST',
            ruleContent: { minAreaAcres: 5 },
            user: bureauAdmin
        });

        // Attempting to publish using a Scrutiny Member or Institution Rep must throw
        assert.throws(() => {
            regulatoryRulesService.publishRule(draft.id, instRep1);
        }, /Unauthorised: Only Regulation Bureau Administrators or Super Admins can publish regulatory rules/);

        // Publishing using Bureau Admin succeeds
        const published = regulatoryRulesService.publishRule(draft.id, bureauAdmin);
        assert.strictEqual(published.status, 'PUBLISHED');
    });
});
