const test = require('node:test');
const assert = require('node:assert');
const router = require('../src/routes/api');
const db = require('../src/database/db');

function simulateRequest({ method = 'GET', url = '/', headers = {}, body = null }) {
    return new Promise((resolve) => {
        const req = {
            method,
            url,
            headers: { ...headers },
            body: body || {}
        };

        const res = {
            statusCode: 200,
            headers: {},
            setHeader(k, v) { this.headers[k] = v; },
            status(code) { this.statusCode = code; return this; },
            end(data) {
                let parsed = data;
                try { parsed = JSON.parse(data); } catch (_) {}
                resolve({ statusCode: this.statusCode, headers: this.headers, body: parsed });
            },
            json(data) {
                this.end(data);
            }
        };

        const handled = router.handle(req, res);
        if (!handled) {
            resolve({ statusCode: 404, body: { error: 'Not Found' } });
        }
    });
}

test('Role-Based Authorization & Reversal Regression Suite', async (t) => {
    let applicantToken = null;
    let scrutinyToken = null;
    let superAdminToken = null;
    let southernToken = null;

    await t.test('1. Authenticate different roles and verify distinct token identities', async () => {
        // Applicant 1 (Apex - INST_001)
        const appRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'inst_apex', password: 'Password@123' }
        });
        assert.strictEqual(appRes.statusCode, 200);
        assert.strictEqual(appRes.body.user.role_code, 'INSTITUTION_REP');
        assert.strictEqual(appRes.body.user.institution_id, 'INST_001');
        applicantToken = appRes.body.token;

        // Applicant 2 (Southern - INST_002)
        const southRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'inst_southern', password: 'Password@123' }
        });
        assert.strictEqual(southRes.statusCode, 200);
        assert.strictEqual(southRes.body.user.role_code, 'INSTITUTION_REP');
        assert.strictEqual(southRes.body.user.institution_id, 'INST_002');
        southernToken = southRes.body.token;

        // Scrutiny Committee Member
        const scrutRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'scrutiny_expert1', password: 'Password@123' }
        });
        assert.strictEqual(scrutRes.statusCode, 200);
        assert.strictEqual(scrutRes.body.user.role_code, 'SCRUTINY_MEMBER');
        scrutinyToken = scrutRes.body.token;

        // Super Admin
        const adminRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'superadmin', password: 'Password@123' }
        });
        assert.strictEqual(adminRes.statusCode, 200);
        assert.strictEqual(adminRes.body.user.role_code, 'SUPER_ADMIN');
        superAdminToken = adminRes.body.token;
    });

    await t.test('2. Applicant accounts are strictly denied admin endpoints (No Admin Features for Applicants)', async () => {
        // Applicant cannot access Scrutiny Review Queue
        const qRes = await simulateRequest({
            method: 'GET',
            url: '/api/scrutiny/queue',
            headers: { 'authorization': `Bearer ${applicantToken}` }
        });
        assert.strictEqual(qRes.statusCode, 403);

        // Applicant cannot access CAG Audit Trail
        const aRes = await simulateRequest({
            method: 'GET',
            url: '/api/audit/events',
            headers: { 'authorization': `Bearer ${applicantToken}` }
        });
        assert.strictEqual(aRes.statusCode, 403);

        // Applicant cannot invoke administrative simulation (Digital Twin)
        const dtRes = await simulateRequest({
            method: 'POST',
            url: '/api/intelligence/digital-twin/simulate',
            headers: { 'authorization': `Bearer ${applicantToken}` },
            body: { volumeIncreasePct: 20 }
        });
        assert.strictEqual(dtRes.statusCode, 403);
    });

    await t.test('3. Cross-Institution isolation: Applicant INST_001 cannot inspect or respond to INST_002 records', async () => {
        // Applicant INST_001 tries to get checklist of APP_2026_002 (belonging to INST_002)
        const checkRes = await simulateRequest({
            method: 'GET',
            url: '/api/scrutiny/APP_2026_002/checklist',
            headers: { 'authorization': `Bearer ${applicantToken}` }
        });
        assert.strictEqual(checkRes.statusCode, 403);

        // Applicant INST_002 CANNOT access APP_2026_001 checklist
        const southCheckRes = await simulateRequest({
            method: 'GET',
            url: '/api/scrutiny/APP_2026_001/checklist',
            headers: { 'authorization': `Bearer ${southernToken}` }
        });
        assert.strictEqual(southCheckRes.statusCode, 403);
    });

    await t.test('4. Scrutiny Member can access Scrutiny Queue without being treated as an Applicant', async () => {
        const qRes = await simulateRequest({
            method: 'GET',
            url: '/api/scrutiny/queue',
            headers: { 'authorization': `Bearer ${scrutinyToken}` }
        });
        assert.strictEqual(qRes.statusCode, 200);
        assert.ok(Array.isArray(qRes.body.queue));
    });

    await t.test('5. Session revocation ensures clean sign-out without permission lingering', async () => {
        // Sign out applicant
        const logoutRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/logout',
            headers: { 'authorization': `Bearer ${applicantToken}` }
        });
        assert.strictEqual(logoutRes.statusCode, 200);

        // Old token is revoked and cannot call APIs
        const postLogoutRes = await simulateRequest({
            method: 'GET',
            url: '/api/applications',
            headers: { 'authorization': `Bearer ${applicantToken}` }
        });
        assert.strictEqual(postLogoutRes.statusCode, 401);
    });
});
