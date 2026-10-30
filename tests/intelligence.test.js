const test = require('node:test');
const assert = require('node:assert');
const router = require('../src/routes/api');

// Helper to simulate request through SimpleRouter
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

test('NIYAM 2035 — Intelligent Regulatory Operations Suite', async (t) => {

    await t.test('1. AI Copilot returns context-aware answers with APH citations for Applicants', async () => {
        const res = await simulateRequest({
            method: 'POST',
            url: '/api/copilot/query',
            headers: { 'x-user-id': 'dr.suresh.chandra' },
            body: { query: 'What documents are still missing for my application?' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.response);
        assert.ok(Array.isArray(res.body.citations));
        assert.ok(res.body.citations.length > 0);
        assert.match(res.body.disclaimer, /ADVISORY COPILOT/);
        assert.strictEqual(res.body.modelVersion, 'NIYAM-RAG-v2035.1');
    });

    await t.test('2. AI Copilot returns jurisdictional pendency summaries for Regional Officers', async () => {
        const res = await simulateRequest({
            method: 'POST',
            url: '/api/copilot/query',
            headers: { 'x-user-id': 'er.manoj.verma' },
            body: { query: 'Which cases are overdue in my authorised Region?' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.response);
        assert.match(res.body.response, /Regulatory Pendency/);
        assert.ok(res.body.citations.length > 0);
    });

    await t.test('3. Predictive Pendency calculates delay probabilities and prescriptive actions', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/predictive-pendency',
            headers: { 'x-user-id': 'dr.rk.shrivastava' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.predictions));
        assert.ok(res.body.predictions.length > 0);
        const first = res.body.predictions[0];
        assert.ok(typeof first.delayProbability === 'number');
        assert.ok(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(first.riskLevel));
        assert.ok(first.prescriptiveAction);
        assert.strictEqual(first.confidence, 0.946);
    });

    await t.test('4. Smart Document Intelligence extracts metadata and generates verification checklist', async () => {
        const res = await simulateRequest({
            method: 'POST',
            url: '/api/intelligence/document-analyze',
            headers: { 'x-user-id': 'dr.vandana.rao' },
            body: { docType: 'LAND_LEASE' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.ocrExtracted);
        assert.ok(res.body.ocrExtracted.sha256Fingerprint);
        assert.ok(Array.isArray(res.body.checks));
        assert.ok(res.body.checks.length >= 5);
        assert.strictEqual(res.body.integrityStatus, 'VALID_AUTHENTICATED');
    });

    await t.test('5. Deadline Resilience Engine compiles aggregated visual calendar events', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/deadlines-calendar',
            headers: { 'x-user-id': 'dr.suresh.chandra' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.events));
        assert.ok(res.body.events.length > 0);
    });

    await t.test('6. Explainable AI Audit Replay reconstructs chronological lifecycle frames', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/audit-replay/APP_2026_001',
            headers: { 'x-user-id': 'dr.suresh.chandra' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.frames));
        assert.ok(res.body.frames.length >= 4);
        assert.ok(res.body.frames[0].hash);
        assert.ok(res.body.frames[0].ruleInvoked);
    });

    await t.test('7. Digital Twin of Approval Operations simulates workload without modifying DB', async () => {
        const res = await simulateRequest({
            method: 'POST',
            url: '/api/intelligence/digital-twin/simulate',
            headers: { 'x-user-id': 'dr.rk.shrivastava' },
            body: { volumeIncreasePct: 30, evcCapacityPct: -15, scrutinySlaDays: 7 }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.baseline);
        assert.ok(res.body.simulated);
        assert.ok(res.body.bottlenecks.length > 0);
        assert.match(res.body.disclaimer, /DIGITAL TWIN/);
    });

    await t.test('8. Institution Readiness Scorecard evaluates 4 Pillars for Pre-Submission', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/institution-readiness',
            headers: { 'x-user-id': 'dr.suresh.chandra' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.readinessIndex > 80);
        assert.ok(Array.isArray(res.body.pillars));
        assert.strictEqual(res.body.pillars.length, 4);
    });

    await t.test('9. Workload Intelligence provides officer allocation and rebalancing guidance', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/workload',
            headers: { 'x-user-id': 'dr.rk.shrivastava' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.officers));
        assert.ok(Array.isArray(res.body.rebalancingRecommendations));
    });

    await t.test('10. Applicant cannot access administrative Digital Twin simulation (HTTP 403)', async () => {
        const res = await simulateRequest({
            method: 'POST',
            url: '/api/intelligence/digital-twin/simulate',
            headers: { 'x-user-id': 'dr.suresh.chandra' },
            body: {}
        });

        assert.strictEqual(res.statusCode, 403);
    });
});
