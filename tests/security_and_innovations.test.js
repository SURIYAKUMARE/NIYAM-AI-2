const test = require('node:test');
const assert = require('node:assert');
const router = require('../src/routes/api');
const cryptoService = require('../src/services/cryptoService');

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

test('NIYAM 2035 — Security, Session Revocation & 15 Regulatory Innovations', async (t) => {

    await t.test('1. Session Revocation: Logout invalidates active cryptographic session', async () => {
        const testUser = { id: 'usr_sec_test', username: 'er.manoj.verma', role_code: 'REGIONAL_OFFICER', role: 'REGIONAL_OFFICER' };
        const token = cryptoService.generateToken(testUser);

        const preCheck = cryptoService.verifyToken(token);
        assert.ok(preCheck, 'Token should initially be valid');

        const logoutRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/logout',
            headers: {
                'authorization': `Bearer ${token}`,
                'x-user-id': 'er.manoj.verma'
            }
        });

        assert.strictEqual(logoutRes.statusCode, 200);
        assert.strictEqual(logoutRes.body.success, true);
        assert.ok(logoutRes.body.timestamp);

        const postCheck = cryptoService.verifyToken(token);
        assert.strictEqual(postCheck, null, 'Revoked token must verify to null');
        assert.strictEqual(cryptoService.isTokenRevoked(token), true);

        const protectedRes = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/radar',
            headers: {
                'authorization': `Bearer ${token}`,
                'x-user-id': 'er.manoj.verma'
            }
        });

        assert.strictEqual(protectedRes.statusCode, 401, 'Request with revoked token must return 401');
    });

    await t.test('2. Early-Warning Radar provides 5-Point Explanations for Officers', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/radar',
            headers: { 'x-user-id': 'er.manoj.verma' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.warnings));
        assert.ok(res.body.warnings.length > 0);

        const first = res.body.warnings[0];
        assert.ok(first.what, 'Must contain Point 1: What is happening');
        assert.ok(first.why, 'Must contain Point 2: Why it was flagged');
        assert.ok(first.affectedRecord, 'Must contain Point 3: Affected Record');
        assert.ok(first.responsible, 'Must contain Point 4: Who is responsible');
        assert.ok(first.action, 'Must contain Point 5: Prescriptive Recommended Action');
    });

    await t.test('3. Early-Warning Radar is strictly denied to Applicants (HTTP 403)', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/radar',
            headers: { 'x-user-id': 'dr.suresh.chandra' } // Applicant role
        });

        assert.strictEqual(res.statusCode, 403);
    });

    await t.test('4. Application Health Diagnostics returns status meter, score & checks', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/application-health?application_id=APP_2026_001',
            headers: { 'x-user-id': 'er.manoj.verma' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(typeof res.body.healthScore === 'number');
        assert.ok(['HEALTHY', 'NEEDS_ATTENTION', 'CRITICAL'].includes(res.body.status));
        assert.ok(Array.isArray(res.body.checks));
        assert.ok(res.body.checks.length >= 4);
        assert.ok(res.body.operationalDiagnosis);
    });

    await t.test('5. Application DNA traces genesis-to-latest milestones and hashes', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/application-dna?application_id=APP_2026_001',
            headers: { 'x-user-id': 'dr.suresh.chandra' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.timeline));
        assert.ok(res.body.timeline.length >= 3);
        assert.ok(res.body.genesisHash);
        assert.ok(res.body.latestHash);
    });

    await t.test('6. Smart Clarification Generator outputs APH citations and plain language translation', async () => {
        const res = await simulateRequest({
            method: 'POST',
            url: '/api/intelligence/smart-clarification',
            headers: { 'x-user-id': 'dr.vandana.rao' },
            body: {
                applicationId: 'APP_2026_001',
                category: 'LAND_DOCUMENTS',
                customNote: 'Survey number mismatch on Annexure 4'
            }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.aphRegulationClause);
        assert.ok(res.body.officialScrutinyDraft);
        assert.ok(res.body.plainLanguageApplicantTranslation);
        assert.match(res.body.aphRegulationClause, /AICTE Approval Process Handbook/);
        assert.match(res.body.officialScrutinyDraft, /APH 2025-26/);
    });

    await t.test('7. Regulatory Change Impact Analyser models APH version changes and affected dossiers', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/regulatory-change-impact?source_version=APH_2024_25&target_version=APH_2025_26',
            headers: { 'x-user-id': 'dr.rk.shrivastava' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.sourceVersion, 'APH_2024_25');
        assert.strictEqual(res.body.targetVersion, 'APH_2025_26');
        assert.ok(Array.isArray(res.body.changes));
        assert.ok(res.body.totalChangedArticles > 0);
        assert.ok(res.body.executiveSummary);
    });

    await t.test('8. Document Forensics performs duplicate detection, OCR check and SHA-256 fingerprint', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/document-forensics?document_id=DOC_001',
            headers: { 'x-user-id': 'dr.vandana.rao' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.fileIntegrity);
        assert.ok(res.body.fileIntegrity.sha256Digest);
        assert.ok(res.body.ocrExtraction);
        assert.strictEqual(res.body.duplicateDetection.isDuplicateAcrossCouncil, false);
        assert.strictEqual(res.body.missingPageDetection.hasMissingPages, false);
    });

    await t.test('9. Regulatory Bottleneck Map visualizes all 8 AICTE administrative regions', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/bottleneck-map',
            headers: { 'x-user-id': 'er.manoj.verma' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.regions));
        assert.strictEqual(res.body.regions.length, 8);
        
        const north = res.body.regions.find(r => r.id === 'RO_NORTH');
        assert.ok(north, 'RO_NORTH should be present in regions');
        assert.ok(typeof north.activeDossiers === 'number');
        assert.ok(typeof north.slaCompliancePct === 'number');
        assert.ok(['HIGH_CONGESTION', 'OPTIMAL', 'MODERATE_LOAD', 'BALANCED', 'CAPACITY_AVAILABLE'].includes(north.bottleneckStatus));
    });

    await t.test('10. Consolidated Alerts de-duplicates notifications to eliminate alert fatigue', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/consolidated-alerts',
            headers: { 'x-user-id': 'er.manoj.verma' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res.body.consolidatedAlertGroups));
        assert.ok(typeof res.body.totalRawAlerts === 'number');
        assert.ok(res.body.consolidatedAlertGroups.length <= res.body.totalRawAlerts);
        assert.ok(res.body.fatigueSuppressionRate);
    });

    await t.test('11. Structured Case Handover generates complete handover brief between officers', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/case-handover?application_id=APP_2026_001&from_officer=dr.vandana.rao&to_officer=er.manoj.verma',
            headers: { 'x-user-id': 'er.manoj.verma' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.applicationId, 'APP_2026_001');
        assert.ok(res.body.handoverId);
        assert.ok(res.body.keyFindingsSummary);
        assert.ok(Array.isArray(res.body.pendingActionItems));
        assert.ok(res.body.nextStatutoryDeadline);
    });

    await t.test('12. EVC Offline Field Inspection generates tamper-evident docket and syncs with checksum', async () => {
        const docketRes = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/evc-offline-docket',
            headers: { 'x-user-id': 'prof.devendra.pathak' }
        });

        assert.strictEqual(docketRes.statusCode, 200);
        assert.ok(docketRes.body.docketId);
        assert.ok(Array.isArray(docketRes.body.checklistItems));

        const syncRes = await simulateRequest({
            method: 'POST',
            url: '/api/intelligence/evc-offline-sync',
            headers: { 'x-user-id': 'prof.devendra.pathak' },
            body: {
                visitId: 'VISIT_2026_001',
                observations: 'All labs inspected. Computer lab meets 1:1 terminal to student ratio.',
                checksum: docketRes.body.offlineChecksum
            }
        });

        assert.strictEqual(syncRes.statusCode, 200);
        assert.strictEqual(syncRes.body.success, true);
        assert.ok(syncRes.body.syncConfirmationId);
    });

    await t.test('13. 4-Question Executive Command Intelligence Summary delivers instant answers', async () => {
        const res = await simulateRequest({
            method: 'GET',
            url: '/api/intelligence/command-summary',
            headers: { 'x-user-id': 'er.manoj.verma' }
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.coreQuestions);
        assert.ok(res.body.coreQuestions.q1_attentionNow);
        assert.ok(res.body.coreQuestions.q2_likelyProblem);
        assert.ok(res.body.coreQuestions.q3_whyHappening);
        assert.ok(res.body.coreQuestions.q4_nextAction);
    });
});
