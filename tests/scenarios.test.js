const test = require('node:test');
const assert = require('node:assert');
const scenarioController = require('../src/controllers/scenarioController');
const db = require('../src/database/db');

// Mock response object
function createMockRes() {
    return {
        statusCode: 200,
        data: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.data = payload; return this; }
    };
}

test('Prototype Demonstration: End-to-End Execution of Scenarios 1 to 10', async (t) => {
    const admin = db.queryOne("SELECT * FROM users WHERE role_code = 'SUPER_ADMIN' LIMIT 1");

    for (let id = 1; id <= 10; id++) {
        await t.test(`Execute Scenario ${id}`, () => {
            const req = { params: { id }, user: admin };
            const res = createMockRes();
            scenarioController.runScenario(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.ok(res.data);
            assert.strictEqual(res.data.status, 'PASSED', `Scenario ${id} failed: ${JSON.stringify(res.data)}`);
            assert.ok(res.data.verification.startsWith('SUCCESS'), `Scenario ${id} verification failed: ${res.data.verification}`);
        });
    }
});
