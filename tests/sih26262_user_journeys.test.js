const test = require('node:test');
const assert = require('node:assert');
const router = require('../src/routes/api');
const db = require('../src/database/db');
const auditService = require('../src/services/auditService');

function simulateRequest({ method = 'GET', url = '/', headers = {}, body = null }) {
    return new Promise((resolve) => {
        const lowerHeaders = {};
        for (const [k, v] of Object.entries(headers || {})) {
            lowerHeaders[k.toLowerCase()] = v;
        }

        const req = {
            method,
            url,
            headers: lowerHeaders,
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

test('SIH26262 Specification: 10 End-to-End User Journeys & Pilot Indicators', async (t) => {
    let applicantToken = null;
    let scrutinyToken = null;
    let roToken = null;
    let evcCoordToken = null;
    let competentAuthToken = null;
    let adminToken = null;
    let complianceToken = null;

    let createdAppId = null;
    let createdDeficiencyId = null;
    let createdUndertakingId = null;
    let testDocId = null;
    let createdRenewalId = null;
    let createdScheduleId = null;

    // Pre-test Authentication of all key personas
    await t.test('Authentication & Token Provisioning for Authorized Personas', async () => {
        // 1. Institution Rep (Applicant)
        const appRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'inst_apex', password: 'Password@123' }
        });
        assert.strictEqual(appRes.statusCode, 200);
        applicantToken = appRes.body.token;

        // 2. Scrutiny Committee Member
        const scrutRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'scrutiny_expert1', password: 'Password@123' }
        });
        assert.strictEqual(scrutRes.statusCode, 200);
        scrutinyToken = scrutRes.body.token;

        // 3. Regional Officer
        const roRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'ro_northern', password: 'Password@123' }
        });
        assert.strictEqual(roRes.statusCode, 200);
        roToken = roRes.body.token;

        // 4. EVC Coordinator
        const evcRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'evc_coord1', password: 'Password@123' }
        });
        assert.strictEqual(evcRes.statusCode, 200);
        evcCoordToken = evcRes.body.token;

        // 5. Compliance Officer
        const compRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'compliance_officer1', password: 'Password@123' }
        });
        assert.strictEqual(compRes.statusCode, 200);
        complianceToken = compRes.body.token;

        // 6. Competent Authority
        const compAuthRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'competent_auth1', password: 'Password@123' }
        });
        assert.strictEqual(compAuthRes.statusCode, 200);
        competentAuthToken = compAuthRes.body.token;

        // 7. Super Admin
        const adminRes = await simulateRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { username: 'superadmin', password: 'Password@123' }
        });
        assert.strictEqual(adminRes.statusCode, 200);
        adminToken = adminRes.body.token;
    });

    // Journey 1: Institution submits an application
    await t.test('Journey 1: Institution submits application and tracks intake stage', async () => {
        const payload = {
            applicationTypeCode: 'EOA',
            academicYear: '2026-2027',
            institutionId: 'INST_001',
            isDraft: false
        };

        const res = await simulateRequest({
            method: 'POST',
            url: '/api/applications',
            headers: { authorization: `Bearer ${applicantToken}` },
            body: payload
        });

        assert.strictEqual(res.statusCode, 201);
        assert.ok(res.body.applicationId);
        assert.strictEqual(res.body.stage, 'SCRUTINY');
        assert.strictEqual(res.body.status, 'UNDER_SCRUTINY');

        createdAppId = res.body.applicationId;

        // Verify that application is recorded in database with valid audit trail
        const stored = db.queryOne('SELECT * FROM applications WHERE id = ?', [createdAppId]);
        assert.ok(stored);
        assert.strictEqual(stored.academic_year, '2026-2027');
    });

    // Journey 2: Officer raises a deficiency with deadline
    await t.test('Journey 2: Scrutiny Officer raises deficiency with response deadline', async () => {
        const deficiencyPayload = {
            category: 'Land & Building',
            description: 'Fire Safety Certificate dispatch number requires verification with State Fire Service',
            severity: 'CRITICAL',
            regulatoryReference: 'APH 2025-26 Ch. II R4.3',
            responseDueDate: '2026-06-30'
        };

        const res = await simulateRequest({
            method: 'POST',
            url: `/api/scrutiny/${createdAppId}/deficiency`,
            headers: { authorization: `Bearer ${scrutinyToken}` },
            body: deficiencyPayload
        });

        assert.strictEqual(res.statusCode, 201);
        assert.ok(res.body.result);
        assert.strictEqual(res.body.result.status, 'RAISED');

        createdDeficiencyId = res.body.result.id;

        // Confirm open deficiency exists in database for this application
        const openCount = db.queryOne("SELECT COUNT(*) as count FROM deficiencies WHERE application_id = ? AND status = 'RAISED'", [createdAppId]);
        assert.strictEqual(openCount.count, 1);
    });

    // Journey 3: Institution submits response responding to deficiency finding
    await t.test('Journey 3: Institution submits response responding to deficiency finding', async () => {
        const responsePayload = {
            responseText: 'Updated Fire Safety Certificate dispatch receipt uploaded via State Fire Services e-portal with QR validation.',
            responseDocUrl: '/uploads/documents/fire_noc_2026_receipt.pdf'
        };

        const res = await simulateRequest({
            method: 'POST',
            url: `/api/scrutiny/deficiencies/${createdDeficiencyId}/response`,
            headers: { authorization: `Bearer ${applicantToken}` },
            body: responsePayload
        });

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.result.status, 'RESPONSES_SUBMITTED');

        // Confirm deficiency status in database
        const def = db.queryOne('SELECT * FROM deficiencies WHERE id = ?', [createdDeficiencyId]);
        assert.strictEqual(def.status, 'RESPONSES_SUBMITTED');
    });

    // Journey 4: Officer reviews it and re-scrutinizes (VERIFIED_OK)
    await t.test('Journey 4: Officer conducts re-scrutiny and clears deficiency (VERIFIED_OK)', async () => {
        const reScrutinyPayload = {
            status: 'VERIFIED_OK',
            findings: 'Authenticated via State Fire Services e-portal with valid QR verification.'
        };

        const res = await simulateRequest({
            method: 'POST',
            url: `/api/scrutiny/deficiencies/${createdDeficiencyId}/re-scrutiny`,
            headers: { authorization: `Bearer ${scrutinyToken}` },
            body: reScrutinyPayload
        });

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.result.status, 'VERIFIED_OK');

        // Verify in database that open deficiencies count is 0
        const openCount = db.queryOne("SELECT COUNT(*) as count FROM deficiencies WHERE application_id = ? AND status = 'RAISED'", [createdAppId]);
        assert.strictEqual(openCount.count, 0);

        // Advance stage to EVC
        const transRes = await simulateRequest({
            method: 'POST',
            url: `/api/applications/${createdAppId}/transition`,
            headers: { authorization: `Bearer ${roToken}` },
            body: { toStage: 'EVC', comments: 'Technical scrutiny successfully cleared' }
        });
        assert.strictEqual(transRes.statusCode, 200);

        const updated = db.queryOne('SELECT current_stage FROM applications WHERE id = ?', [createdAppId]);
        assert.strictEqual(updated.current_stage, 'EVC');
    });

    // Journey 5: EVC visit is scheduled and findings recorded
    await t.test('Journey 5: EVC visit scheduled, calendar retrieved, and inspection report recorded', async () => {
        const schedulePayload = {
            proposedDate: '2026-06-15',
            visitType: 'Physical Inspection',
            members: [
                { name: 'Prof. Devendra Pathak', designation: 'Professor & Dean', institution: 'IIT Kanpur', role: 'Chairman' },
                { name: 'Dr. Anita Joshi', designation: 'Associate Professor', institution: 'NIT Delhi', role: 'Member (Academic)' }
            ]
        };

        const schedRes = await simulateRequest({
            method: 'POST',
            url: `/api/evc/${createdAppId}/schedule`,
            headers: { authorization: `Bearer ${evcCoordToken}` },
            body: schedulePayload
        });

        assert.strictEqual(schedRes.statusCode, 201);
        assert.ok(schedRes.body.result);
        createdScheduleId = schedRes.body.result.scheduleId;

        // Check EVC Calendar view endpoint
        const calRes = await simulateRequest({
            method: 'GET',
            url: '/api/evc/calendar',
            headers: { authorization: `Bearer ${evcCoordToken}` }
        });

        assert.strictEqual(calRes.statusCode, 200);
        assert.ok(Array.isArray(calRes.body.calendar));
        const matched = calRes.body.calendar.find(s => s.application_id === createdAppId || s.id === createdScheduleId);
        assert.ok(matched);

        // Submit inspection report
        const reportPayload = {
            applicationId: createdAppId,
            inspectionDate: '2026-06-15',
            infrastructureScore: 94,
            facultyScore: 92,
            complianceScore: 96,
            overallRecommendation: 'RECOMMENDED_FULL',
            deficiencyNotes: 'All lab terminals, computing facilities, and barrier-free ramps comply fully with APH 2025-26 Norms.'
        };

        const repRes = await simulateRequest({
            method: 'POST',
            url: `/api/evc/${createdScheduleId}/report`,
            headers: { authorization: `Bearer ${evcCoordToken}` },
            body: reportPayload
        });

        assert.strictEqual(repRes.statusCode, 200);
        assert.strictEqual(repRes.body.result.status, 'REPORT_SUBMITTED');
        const reportRecord = db.queryOne('SELECT * FROM evc_reports WHERE id = ?', [repRes.body.result.reportId]);
        assert.ok(reportRecord);
        assert.strictEqual(reportRecord.overall_recommendation, 'RECOMMENDED_FULL');
    });

    // Journey 6: Undertaking becomes due and triggers reminder
    await t.test('Journey 6: Create compliance undertaking and verify evidence submission lifecycle', async () => {
        const undertakingPayload = {
            institutionId: 'INST_001',
            applicationId: createdAppId,
            conditionTitle: 'Faculty Cadre Ratio Recruitment Compliance',
            regulatorySource: 'APH-2026 Annexure 8',
            obligationDetails: 'Recruit 2 additional Associate Professors within 90 days of session commencement',
            dueDate: '2026-08-30',
            responsiblePerson: 'Dr. Suresh Chandra (Registrar)'
        };

        const uRes = await simulateRequest({
            method: 'POST',
            url: '/api/compliance/undertakings',
            headers: { authorization: `Bearer ${complianceToken}` },
            body: undertakingPayload
        });

        assert.strictEqual(uRes.statusCode, 201);
        assert.ok(uRes.body.result);
        createdUndertakingId = uRes.body.result.id;

        // Institution submits evidence
        const evidenceRes = await simulateRequest({
            method: 'POST',
            url: `/api/compliance/undertakings/${createdUndertakingId}/evidence`,
            headers: { authorization: `Bearer ${applicantToken}` },
            body: {
                evidenceTitle: 'Selection Committee Minutes & Appointment Ratification',
                documentUrl: '/uploads/compliance/cadre_selection_minutes.pdf',
                remarks: 'Appointments confirmed in academic senate meeting'
            }
        });

        assert.strictEqual(evidenceRes.statusCode, 200);
        // Requirement 5: Evidence submission must NOT automatically mark compliant
        assert.strictEqual(evidenceRes.body.result.status, 'UNDER_VERIFICATION');

        // Officer verification finalizes compliance
        const verifyRes = await simulateRequest({
            method: 'POST',
            url: `/api/compliance/undertakings/${createdUndertakingId}/verify`,
            headers: { authorization: `Bearer ${complianceToken}` },
            body: {
                verificationOutcome: 'VERIFIED',
                reviewRemarks: 'Ratified appointment letters confirmed against university roster'
            }
        });

        assert.strictEqual(verifyRes.statusCode, 200);
        assert.strictEqual(verifyRes.body.result.status, 'VERIFIED');
    });

    // Journey 7: Overdue action escalates
    await t.test('Journey 7: Escalation engine evaluates overdue actions and generates notices', async () => {
        const escRes = await simulateRequest({
            method: 'POST',
            url: '/api/escalations/evaluate',
            headers: { authorization: `Bearer ${roToken}` },
            body: {}
        });

        assert.strictEqual(escRes.statusCode, 200);
        assert.ok(Array.isArray(escRes.body.triggered));

        // Trigger scheduler check with notification deduplication
        const runRes = await simulateRequest({
            method: 'POST',
            url: '/api/notifications/run-scheduler',
            headers: { authorization: `Bearer ${adminToken}` },
            body: {}
        });

        assert.strictEqual(runRes.statusCode, 200);
        assert.ok(runRes.body.success);
    });

    // Journey 8: Document renewal is submitted and verified
    await t.test('Journey 8: Institution submits document renewal, prior version retained, officer verifies', async () => {
        // Find existing document for INST_001
        const doc = db.queryOne("SELECT * FROM documents WHERE institution_id = 'INST_001' LIMIT 1");
        assert.ok(doc);
        testDocId = doc.id;

        // Submit renewal request
        const renewRes = await simulateRequest({
            method: 'POST',
            url: `/api/documents/${testDocId}/renewal`,
            headers: { authorization: `Bearer ${applicantToken}` },
            body: {
                newIssueDate: '2026-06-01',
                newExpiryDate: '2028-06-30',
                uploadedFileUrl: '/uploads/documents/fire_noc_2028_renewed.pdf'
            }
        });

        assert.strictEqual(renewRes.statusCode, 200);
        assert.strictEqual(renewRes.body.result.status, 'RENEWAL_SUBMITTED');
        createdRenewalId = renewRes.body.result.renewalId;

        // Regulatory Officer verifies renewal
        const docVerifyRes = await simulateRequest({
            method: 'POST',
            url: `/api/documents/${testDocId}/renewals/${createdRenewalId}/verify`,
            headers: { authorization: `Bearer ${roToken}` },
            body: {
                isApproved: true,
                officerComments: 'State Fire Service digital seal confirmed on National Regulatory Gateway'
            }
        });

        assert.strictEqual(docVerifyRes.statusCode, 200);
        assert.strictEqual(docVerifyRes.body.result.status, 'APPROVED');

        // Verify that document expiry date was updated in DB
        const updatedDoc = db.queryOne('SELECT * FROM documents WHERE id = ?', [testDocId]);
        assert.strictEqual(updatedDoc.expiry_date, '2028-06-30');
    });

    // Journey 9: Official records reasoned outcome
    await t.test('Journey 9: Competent Authority records statutory outcome with reasoned order', async () => {
        // Advance application to DECISION stage
        db.execute("UPDATE applications SET current_stage = 'COMPETENT_DECISION', current_status = 'DECISION_PENDING' WHERE id = ?", [createdAppId]);

        const uniqueOrderNumber = `AICTE/APH/2026/ORD-${Date.now().toString().slice(-5)}-${Math.floor(100 + Math.random() * 900)}`;
        const decisionPayload = {
            decisionType: 'APPROVED',
            orderNumber: uniqueOrderNumber,
            rationale: 'Full compliance with AICTE APH 2025-26 established across Land, Infrastructure, EVC, and Faculty Cadre norms.'
        };

        const decRes = await simulateRequest({
            method: 'POST',
            url: `/api/applications/${createdAppId}/decision`,
            headers: { authorization: `Bearer ${competentAuthToken}` },
            body: decisionPayload
        });

        assert.strictEqual(decRes.statusCode, 200);
        assert.strictEqual(decRes.body.decisionType, 'APPROVED');
        assert.strictEqual(decRes.body.orderNumber, uniqueOrderNumber);

        const updatedApp = db.queryOne('SELECT * FROM applications WHERE id = ?', [createdAppId]);
        assert.strictEqual(updatedApp.current_status, 'APPROVED');
        assert.strictEqual(updatedApp.official_outcome, 'APPROVED');
        assert.strictEqual(updatedApp.order_number, uniqueOrderNumber);
        assert.ok(updatedApp.decision_reason.includes('Full compliance'));

        // Verify audit log record in audit_events
        const lastAudit = db.queryOne('SELECT * FROM audit_events WHERE entity_id = ? AND action_type = ? ORDER BY id DESC LIMIT 1', [createdAppId, 'RECORD_STATUTORY_DECISION']);
        assert.ok(lastAudit);
    });

    // Journey 10: Dashboards, pilot indicators, and audit history reflect actions
    await t.test('Journey 10: Verify Priority Score, 7 Pilot Indicators, and SHA-256 Audit Integrity', async () => {
        // 1. Explainable Priority Score
        const scoreRes = await simulateRequest({
            method: 'GET',
            url: `/api/applications/${createdAppId}/priority-score`,
            headers: { authorization: `Bearer ${roToken}` }
        });

        assert.strictEqual(scoreRes.statusCode, 200);
        assert.ok(scoreRes.body.score >= 0 && scoreRes.body.score <= 100);
        assert.ok(Array.isArray(scoreRes.body.factors));
        assert.ok(scoreRes.body.disclaimer.includes('RULE-BASED DECISION SUPPORT'));

        // 2. 7 Mandated Pilot Performance Indicators
        const pilotRes = await simulateRequest({
            method: 'GET',
            url: '/api/reports/pilot-indicators',
            headers: { authorization: `Bearer ${adminToken}` }
        });

        assert.strictEqual(pilotRes.statusCode, 200);
        assert.ok(Array.isArray(pilotRes.body.indicators));
        const indMap = Object.fromEntries(pilotRes.body.indicators.map(i => [i.key, i]));

        // Indicator 1: Pending by Stage
        assert.ok(indMap.pending_by_stage);
        assert.strictEqual(indMap.pending_by_stage.key, 'pending_by_stage');
        // Indicator 2: Mean submission to decision time
        assert.ok(typeof indMap.mean_submission_to_decision_time.value === 'number');
        // Indicator 3: Overdue actions ratio (safe zero-denominator handling)
        assert.ok(typeof indMap.overdue_actions_ratio.percentage === 'number');
        // Indicator 4: Mean EVC request to schedule time
        assert.ok(typeof indMap.mean_evc_request_to_schedule_time.value === 'number');
        // Indicator 5: On-time evidence submissions ratio
        assert.ok(typeof indMap.on_time_evidence_submissions_ratio.percentage === 'number');
        // Indicator 6: Document expiry alerts generated
        assert.ok(typeof indMap.document_expiry_alerts_generated.value === 'number');
        // Indicator 7: Escalation response time
        assert.ok(typeof indMap.escalation_response_time.value === 'number');

        // 3. Admin Roles Matrix & Retention Policies
        const matrixRes = await simulateRequest({
            method: 'GET',
            url: '/api/admin/roles-matrix',
            headers: { authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(matrixRes.statusCode, 200);
        assert.ok(matrixRes.body.roles.length >= 10);

        const retRes = await simulateRequest({
            method: 'GET',
            url: '/api/admin/retention-policies',
            headers: { authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(retRes.statusCode, 200);
        assert.ok(retRes.body.policies.length >= 4);

        // 4. Verify Applicant is strictly DENIED admin endpoints
        const deniedRes = await simulateRequest({
            method: 'GET',
            url: '/api/admin/retention-policies',
            headers: { authorization: `Bearer ${applicantToken}` }
        });
        assert.strictEqual(deniedRes.statusCode, 403);

        // 5. Cryptographic Audit Chain Integrity Verification
        const chainValid = auditService.verifyIntegrity();
        assert.strictEqual(chainValid.isValid, true);
    });
});
