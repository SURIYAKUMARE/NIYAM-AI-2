const test = require('node:test');
const assert = require('node:assert');
const router = require('../src/routes/api');
const db = require('../src/database/db');

// Helper to simulate request through the SimpleRouter
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

test('Role Separation & RBAC Security Enforcement (Section 8 Suite)', async (t) => {

    await t.test('1. Unauthenticated request to protected endpoints is rejected with 401', async () => {
        const res = await simulateRequest({ method: 'GET', url: '/api/audit/events', headers: {} });
        assert.strictEqual(res.statusCode, 401);
        assert.match(res.body.error, /Unauthenticated/);
    });

    await t.test('2. Applicant cannot call protected admin audit API (HTTP 403)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/audit/events',
            headers: { 'x-user-id': 'dr.suresh.chandra' } // Institution Rep
        });
        assert.strictEqual(res.statusCode, 403);
        assert.match(res.body.error, /Forbidden/);
    });

    await t.test('3. Applicant cannot call scrutiny queue (HTTP 403)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/scrutiny/queue',
            headers: { 'x-user-id': 'dr.suresh.chandra' }
        });
        assert.strictEqual(res.statusCode, 403);
    });

    await t.test('4. Applicant cannot publish regulatory rules (HTTP 403)', async () => {
        const res = await simulateRequest({
            method: 'POST',
            url: '/api/regulatory-rules/RULE_01/publish',
            headers: { 'x-user-id': 'dr.suresh.chandra' },
            body: {}
        });
        assert.strictEqual(res.statusCode, 403);
    });

    await t.test('5. Applicant cannot transition application state or approve (HTTP 403)', async () => {
        const res = await simulateRequest({
            method: 'POST',
            url: '/api/applications/APP_2026_001/transition',
            headers: { 'x-user-id': 'dr.suresh.chandra' },
            body: { targetStage: 'EVC', comments: 'Attempted self-approval' }
        });
        assert.strictEqual(res.statusCode, 403);
    });

    await t.test('6. Applicant cannot access another institutions application (HTTP 403)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/applications/APP_2026_002', // Belongs to INST_002
            headers: { 'x-user-id': 'dr.suresh.chandra' } // Belongs to INST_001
        });
        assert.strictEqual(res.statusCode, 403);
        assert.match(res.body.error, /own institution/);
    });

    await t.test('6b. Applicant cannot renew another institutions document (HTTP 403)', async () => {
        let otherDoc = db.queryOne("SELECT * FROM documents WHERE institution_id != 'INST_001' LIMIT 1");
        if (!otherDoc) {
            db.execute(`
                INSERT INTO documents (id, institution_id, document_type_code, document_title, file_url, current_status)
                VALUES ('DOC_TEST_002', 'INST_002', 'LAND_LEASE', 'Other Deed', '/doc.pdf', 'VALID')
            `);
            otherDoc = db.queryOne("SELECT * FROM documents WHERE id = 'DOC_TEST_002'");
        }

        const res = await simulateRequest({
            method: 'POST',
            url: `/api/documents/${otherDoc.id}/renewal`,
            headers: { 'x-user-id': 'dr.suresh.chandra' }, // Belongs to INST_001
            body: { newIssueDate: '2026-05-01', newExpiryDate: '2030-05-01' }
        });
        assert.strictEqual(res.statusCode, 403);
        assert.match(res.body.error, /own institution/);
    });

    await t.test('6c. Applicant cannot access or submit evidence for another institutions undertaking (HTTP 403)', async () => {
        let otherUtk = db.queryOne("SELECT * FROM undertakings WHERE institution_id != 'INST_001' LIMIT 1");
        if (!otherUtk) {
            db.execute(`
                INSERT INTO undertakings (id, undertaking_ref, institution_id, condition_title, regulatory_source, obligation_details, issue_date, due_date, responsible_person, status)
                VALUES ('UTK_TEST_002', 'UTK-TEST-02', 'INST_002', 'Test Condition', 'APH', 'Obligation', '2026-01-01', '2026-12-31', 'Director', 'PENDING')
            `);
            otherUtk = db.queryOne("SELECT * FROM undertakings WHERE id = 'UTK_TEST_002'");
        }

        const resGet = await simulateRequest({
            method: 'GET',
            url: `/api/compliance/undertakings/${otherUtk.id}`,
            headers: { 'x-user-id': 'dr.suresh.chandra' }
        });
        assert.strictEqual(resGet.statusCode, 403);
        assert.match(resGet.body.error, /own institution/);

        const resPost = await simulateRequest({
            method: 'POST',
            url: `/api/compliance/undertakings/${otherUtk.id}/evidence`,
            headers: { 'x-user-id': 'dr.suresh.chandra' },
            body: { evidenceTitle: 'Illegal Submission' }
        });
        assert.strictEqual(resPost.statusCode, 403);
        assert.match(resPost.body.error, /own institution/);
    });

    await t.test('7. Applicant listing applications only retrieves their own institution records', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/applications',
            headers: { 'x-user-id': 'dr.suresh.chandra' }
        });
        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.applications));
        assert.strictEqual(res.body.applications.length, 1);
        assert.strictEqual(res.body.applications[0].institution_id, 'INST_001');
    });

    await t.test('8. Applicant can view their own application details (HTTP 200)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/applications/APP_2026_001',
            headers: { 'x-user-id': 'dr.suresh.chandra' }
        });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.application.id, 'APP_2026_001');
        assert.strictEqual(res.body.application.institution_id, 'INST_001');
    });

    await t.test('9. Authorised Auditor can read audit events (HTTP 200)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/audit/events',
            headers: { 'x-user-id': 'shri.rajeshwar.rao' } // Auditor
        });
        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.events));
    });

    await t.test('10. Scrutiny officer can access scrutiny queue (HTTP 200)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/scrutiny/queue',
            headers: { 'x-user-id': 'dr.vandana.rao' } // Scrutiny Chair
        });
        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.queue));
    });

    await t.test('11. Regional officer can view regional pendency list (HTTP 200)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/pendency/list',
            headers: { 'x-user-id': 'ro_northern' }
        });
        assert.strictEqual(res.statusCode, 200);
    });

    await t.test('12. Expired or invalid sessions are rejected (HTTP 401)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/applications',
            headers: { 'Authorization': 'Bearer INVALID_EXPIRED_JWT_TOKEN' }
        });
        assert.strictEqual(res.statusCode, 401);
    });

    await t.test('13. Unknown roles and unmapped users are denied access (HTTP 401)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/audit/events',
            headers: { 'x-user-id': 'UNKNOWN_MOCK_USER' }
        });
        assert.strictEqual(res.statusCode, 401);
    });

    await t.test('14. Role escalation attempts by applicant are rejected (HTTP 403)', async () => {
        const res = await simulateRequest({
            method: 'POST',
            url: '/api/applications/APP_2026_001/hold',
            headers: { 'x-user-id': 'dr.suresh.chandra' },
            body: { holdReason: 'Escalation attempt' }
        });
        assert.strictEqual(res.statusCode, 403);
    });

    await t.test('15. System health and public endpoints remain accessible (HTTP 200)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/health',
            headers: {}
        });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.status, 'UP');
    });
});
