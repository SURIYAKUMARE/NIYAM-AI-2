const test = require('node:test');
const assert = require('node:assert');
const db = require('../src/database/db');
const workflowEngine = require('../src/services/workflowEngine');
const scrutinyService = require('../src/services/scrutinyService');
const { STAGES, STATUSES } = require('../src/config/constants');

test('Workflow Engine: State Machine & Regulatory Integrity', async (t) => {
    const superAdmin = db.queryOne("SELECT * FROM users WHERE role_code = 'SUPER_ADMIN' LIMIT 1");
    const scrutinyMember = db.queryOne("SELECT * FROM users WHERE role_code = 'SCRUTINY_MEMBER' LIMIT 1");

    // Ensure test application APP_2026_001 is at SCRUTINY stage
    db.execute("UPDATE applications SET current_stage = 'SCRUTINY', current_status = 'UNDER_SCRUTINY', is_on_hold = 0 WHERE id = 'APP_2026_001'");
    const app = db.queryOne("SELECT * FROM applications WHERE id = 'APP_2026_001'");

    await t.test('1. Permitted forward transition from SCRUTINY to EVC succeeds when cleared', () => {
        // Ensure no open deficiencies exist for test app
        db.execute("UPDATE deficiencies SET status = 'VERIFIED_OK' WHERE application_id = ?", [app.id]);

        const result = workflowEngine.transition({
            applicationId: app.id,
            toStage: STAGES.EVC,
            condition: 'ALL_DOCUMENTS_CLEARED',
            user: scrutinyMember,
            comments: 'Automated test scrutiny clearance.'
        });

        assert.strictEqual(result.toStage, STAGES.EVC);
        assert.strictEqual(result.status, STATUSES.AWAITING_EVC);

        const updated = db.queryOne('SELECT * FROM applications WHERE id = ?', [app.id]);
        assert.strictEqual(updated.current_stage, STAGES.EVC);
    });

    await t.test('2. Illegal transition from EVC directly to APPROVED is blocked', () => {
        assert.throws(() => {
            workflowEngine.transition({
                applicationId: app.id,
                toStage: STAGES.APPROVED,
                condition: 'ILLEGAL_SKIP',
                user: scrutinyMember
            });
        }, /Unauthorised or illegal transition/);
    });

    await t.test('3. Open unaddressed deficiencies block progression to EVC', () => {
        // Reset app to SCRUTINY
        db.execute("UPDATE applications SET current_stage = 'SCRUTINY', current_status = 'UNDER_SCRUTINY' WHERE id = ?", [app.id]);

        // Raise critical deficiency
        scrutinyService.raiseDeficiency({
            applicationId: app.id,
            category: 'Land & Building',
            description: 'Land title deed defective.',
            severity: 'CRITICAL',
            regulatoryReference: 'APH-2026 Cl. 2.4(a)',
            user: scrutinyMember
        });

        // Attempting to advance to EVC without clearing deficiency MUST throw
        assert.throws(() => {
            workflowEngine.transition({
                applicationId: app.id,
                toStage: STAGES.EVC,
                condition: 'DOCUMENTS_CLEARED',
                user: scrutinyMember
            });
        }, /Cannot advance to EVC: Application has/);
    });

    await t.test('4. Administrative hold blocks workflow progression', () => {
        workflowEngine.setHold({
            applicationId: app.id,
            isHold: true,
            reason: 'Court stay order pending verification',
            user: superAdmin
        });

        const heldApp = db.queryOne('SELECT * FROM applications WHERE id = ?', [app.id]);
        assert.strictEqual(heldApp.is_on_hold, 1);
        assert.strictEqual(heldApp.current_status, 'ON_HOLD');

        // Advancement must fail while on hold
        assert.throws(() => {
            workflowEngine.transition({
                applicationId: app.id,
                toStage: STAGES.RE_SCRUTINY,
                user: scrutinyMember
            });
        }, /Application is currently on authorised regulatory hold/);

        // Resume hold
        workflowEngine.setHold({
            applicationId: app.id,
            isHold: false,
            reason: 'Stay order vacated',
            user: superAdmin
        });

        const resumedApp = db.queryOne('SELECT * FROM applications WHERE id = ?', [app.id]);
        assert.strictEqual(resumedApp.is_on_hold, 0);
    });
});
