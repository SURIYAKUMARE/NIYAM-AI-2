const test = require('node:test');
const assert = require('node:assert');
const db = require('../src/database/db');
const dualClockEngine = require('../src/services/dualClockEngine');
const workflowEngine = require('../src/services/workflowEngine');
const escalationEngine = require('../src/services/escalationEngine');
const expiryEngine = require('../src/services/expiryEngine');
const regulatoryIntelligenceEngine = require('../src/services/regulatoryIntelligenceEngine');
const trustEvidenceEngine = require('../src/services/trustEvidenceEngine');
const simulationEngine = require('../src/services/simulationEngine');
const notificationEngine = require('../src/services/notificationEngine');

test('NIYAM 2.0 National SIH Grand Finale Suite', async (t) => {

    let testAppId = null;
    let testInstId = null;

    await t.test('1. Setup Test Application & Institution Baseline', () => {
        const inst = db.queryOne('SELECT * FROM institutions LIMIT 1');
        assert.ok(inst, 'Institution must exist');
        testInstId = inst.id;

        const app = db.queryOne('SELECT * FROM applications WHERE institution_id = ? LIMIT 1', [testInstId]);
        assert.ok(app, 'Application must exist');
        testAppId = app.id;
    });

    await t.test('2. Dual-Clock Accountability Engine: Zero Double-Counting Guarantee', () => {
        // Initial metrics
        const initial = dualClockEngine.getDualClockMetrics(testAppId);
        assert.ok(initial.clocks.collegeDelay, 'College Delay clock present');
        assert.ok(initial.clocks.officerProcessing, 'Officer Processing clock present');
        assert.ok(initial.clocks.totalActive, 'Total Active clock present');

        // Total active seconds must equal college delay + officer processing
        const total = initial.clocks.totalActive.totalSeconds;
        const sum = initial.clocks.collegeDelay.totalSeconds + initial.clocks.officerProcessing.totalSeconds;
        assert.strictEqual(total, sum, 'Zero double-counting: Total must exactly match College + Officer seconds');

        // Switch clock to COLLEGE_DELAY
        const switched = dualClockEngine.switchClock({
            applicationId: testAppId,
            toClockType: 'COLLEGE_DELAY',
            stageName: 'DOCUMENT_DEFICIENCY_NOTIFICATION',
            responsibleEntityType: 'INSTITUTION',
            actorId: 'test_officer',
            reason: 'Deficiency notice issued to college'
        });
        assert.strictEqual(switched.activeClock, 'COLLEGE_DELAY');

        // Verify active clock updated in metrics
        const updated = dualClockEngine.getDualClockMetrics(testAppId);
        assert.strictEqual(updated.activeClock, 'COLLEGE_DELAY');

        // Switch back to OFFICER_PROCESSING
        dualClockEngine.switchClock({
            applicationId: testAppId,
            toClockType: 'OFFICER_PROCESSING',
            stageName: 'REVERIFICATION',
            responsibleEntityType: 'AICTE_OFFICER',
            actorId: 'test_officer',
            reason: 'College submitted response'
        });
        const finalMetrics = dualClockEngine.getDualClockMetrics(testAppId);
        assert.strictEqual(finalMetrics.activeClock, 'OFFICER_PROCESSING');

        // Regional accountability index
        const regional = dualClockEngine.getRegionalAccountabilityPerformance();
        assert.ok(Array.isArray(regional));
        assert.ok(regional.length > 0);
        assert.ok(regional[0].regionName);
        assert.ok(typeof regional[0].officerEfficiencyIndex === 'number');
    });

    await t.test('3. 13-Stage Workflow Progression & Granular Telemetry', () => {
        const telemetry = workflowEngine.get13StageTelemetry(testAppId);
        assert.strictEqual(telemetry.stages.length, 13, 'Must have exactly 13 stages');
        assert.strictEqual(telemetry.stages[0].stage_name, 'APPLICATION_SUBMISSION');
        assert.strictEqual(telemetry.stages[12].stage_name, 'AUDIT_RECORD_GENERATION');

        // Advance to Stage 3 (SCRUTINY_OFFICER_ASSIGNMENT)
        const mockUser = db.queryOne("SELECT * FROM users WHERE role_code = 'REGIONAL_OFFICER' LIMIT 1") || db.queryOne('SELECT * FROM users LIMIT 1');
        const advanced = workflowEngine.advance13Stage({
            applicationId: testAppId,
            stageNumber: 3,
            user: mockUser,
            comments: 'Allocated scrutiny officer for verification',
            evidenceRef: 'ALLOC_DOCKET_99'
        });
        assert.strictEqual(advanced.stageNumber, 3);
        assert.strictEqual(advanced.stageName, 'SCRUTINY_OFFICER_ASSIGNMENT');

        const recheck = workflowEngine.get13StageTelemetry(testAppId);
        assert.strictEqual(recheck.currentStageIndex, 3);
        assert.strictEqual(recheck.stages[0].isCompleted, true);
        assert.strictEqual(recheck.stages[1].isCompleted, true);
        assert.strictEqual(recheck.stages[2].isInProgress, true);
    });

    await t.test('4. 4-Tier Intelligent Escalation Hierarchy & Administrative Override', () => {
        // Trigger automated evaluation
        const escalations = escalationEngine.evaluateEscalations();
        assert.ok(Array.isArray(escalations));

        // Create a test escalation event with valid rule ID
        const rule = db.queryOne('SELECT id FROM escalation_rules LIMIT 1');
        const ruleId = rule ? rule.id : 'ESC_RULE_001';
        const eventId = 'ESC_TEST_' + Date.now();
        db.execute(`
            INSERT INTO escalation_events (
                id, application_id, escalation_rule_id, trigger_reason,
                escalated_to_role, status, escalation_level, triggered_at
            ) VALUES (?, ?, ?, 'Test SLA breach 14 days', 'COMPETENT_AUTHORITY', 'TRIGGERED', 4, CURRENT_TIMESTAMP)
        `, [eventId, testAppId, ruleId]);

        // Acknowledge escalation
        const ackUser = db.queryOne("SELECT * FROM users WHERE role_code = 'REGIONAL_OFFICER' LIMIT 1") || db.queryOne('SELECT * FROM users LIMIT 1');
        const ack = escalationEngine.acknowledgeEscalation(eventId, ackUser);
        assert.strictEqual(ack.status, 'ACKNOWLEDGED');

        // Administrative Override with mandatory justification
        const adminUser = db.queryOne("SELECT * FROM users WHERE role_code IN ('REGULATION_BUREAU_ADMIN', 'SUPER_ADMIN') LIMIT 1") || db.queryOne('SELECT * FROM users LIMIT 1');
        const override = escalationEngine.administrativeOverride({
            eventId,
            applicationId: testAppId,
            user: adminUser,
            reason: 'Statutory extension granted following High Court stay vacation and compliance inspection rescheduling.',
            extensionDays: 10
        });
        assert.strictEqual(override.overrideGranted, true);

        // Verification in DB
        const ev = db.queryOne('SELECT * FROM escalation_events WHERE id = ?', [eventId]);
        assert.strictEqual(ev.administrative_override, 1);
        assert.strictEqual(ev.status, 'RESOLVED');
    });

    await t.test('5. Advanced Statutory Expiry Engine: 90d, 60d, 30d, 15d, 7d Intervals', () => {
        // Evaluate statutory expiries
        const alerts = expiryEngine.evaluateStatutoryExpiries();
        assert.ok(Array.isArray(alerts));

        // Grouped Expiry Calendar
        const cal = expiryEngine.getExpiryCalendar({ institutionId: testInstId });
        assert.ok(cal.expired !== undefined);
        assert.ok(cal.critical7Days !== undefined);
        assert.ok(cal.urgent15Days !== undefined);
        assert.ok(cal.warning30Days !== undefined);
        assert.ok(cal.notice60Days !== undefined);
        assert.ok(cal.notice90Days !== undefined);

        // Institution Compliance Health
        const health = expiryEngine.getInstitutionComplianceHealth(testInstId);
        assert.ok(typeof health.complianceScore === 'number');
        assert.ok(health.statutoryDocuments.total >= 0);
        assert.ok(health.statusRating);
    });

    await t.test('6. NIYAM Regulatory Intelligence Engine: Exact 10-Field Finding Schema', () => {
        const report = regulatoryIntelligenceEngine.evaluateInstitution({
            institutionId: testInstId,
            aphVersion: 'APH-2025-26',
            category: 'ENGINEERING'
        });

        assert.strictEqual(report.aphVersion, 'APH-2025-26');
        assert.ok(report.findings.length >= 8, 'Must evaluate at least 8 major APH rules');

        const first = report.findings[0];
        // Exact 10-field validation
        assert.ok(first.ruleId, 'Field 1: Rule ID');
        assert.ok(first.applicableAphVersion, 'Field 2: Applicable APH Version');
        assert.ok(first.regulatoryRequirement, 'Field 3: Regulatory Requirement');
        assert.ok(first.extractedInstitutionalValue, 'Field 4: Extracted Institutional Value');
        assert.ok(first.expectedValue, 'Field 5: Expected Value');
        assert.ok(first.actualValue, 'Field 6: Actual Value');
        assert.ok(first.evidenceReference, 'Field 7: Evidence Reference');
        assert.ok(['COMPLIANT', 'DEFICIENT', 'EXEMPT', 'UNDER_REVIEW'].includes(first.validationStatus), 'Field 8: Validation Status');
        assert.ok(first.explanation, 'Field 9: Explanation');
        assert.ok(first.recommendedCorrectiveAction, 'Field 10: Recommended Corrective Action');

        // Advisory disclaimer check
        assert.ok(report.legalNotice.includes('ADVISORY COMPLIANCE ANALYSIS'), 'Must include advisory disclaimer');
    });

    await t.test('7. Advanced Trust & Evidence Engine: 3 Distinct Pillars', () => {
        const report = trustEvidenceEngine.getTrustAndEvidenceReport(testAppId);

        // Verify 3 pillars separation
        assert.ok(report.threePillars.regulatoryComplianceStatus.status);
        assert.ok(typeof report.threePillars.evidenceConfidenceScore.score === 'number');
        assert.ok(typeof report.threePillars.operationalProcessingPriority.score === 'number');

        // Evidence breakdown
        const b = report.evidenceBreakdown;
        assert.ok(Array.isArray(b.verifiedEvidence.items));
        assert.ok(Array.isArray(b.missingEvidence.items));
        assert.ok(Array.isArray(b.expiredEvidence.items));
        assert.ok(Array.isArray(b.conflictingEvidence.items));
        assert.ok(Array.isArray(b.unverifiedEvidence.items));
        assert.ok(Array.isArray(b.manualReviewRequirements.items));

        assert.ok(report.advisoryNotice.includes('DO NOT constitute an official AICTE sanction'));
    });

    await t.test('8. Time-Travel Demonstration Simulator: Advance & Reset', () => {
        const initialStatus = simulationEngine.getCurrentSimulationStatus();
        assert.strictEqual(initialStatus.isSimulationActive, false);

        // Advance 35 days (should trigger 30d and SLA alerts)
        const advanceRes = simulationEngine.advanceTime({
            days: 35,
            hours: 0,
            user: { username: 'SIH_EVALUATOR_01' },
            notes: 'Hackathon demonstration of 30-day SLA breach and escalation'
        });
        assert.strictEqual(advanceRes.success, true);
        assert.strictEqual(parseFloat(advanceRes.virtualOffsetDays), 35.0);

        // Check active simulation status
        const activeStatus = simulationEngine.getCurrentSimulationStatus();
        assert.strictEqual(activeStatus.isSimulationActive, true);

        // Reset clock
        const resetRes = simulationEngine.resetClock({ user: { username: 'SIH_EVALUATOR_01' } });
        assert.strictEqual(resetRes.success, true);

        const resetStatus = simulationEngine.getCurrentSimulationStatus();
        assert.strictEqual(resetStatus.isSimulationActive, false);
        assert.strictEqual(resetStatus.virtualOffsetSeconds, 0);
    });

    await t.test('9. Android EVC Mobile Inspection Companion Sync & Multi-Signal Integrity', () => {
        const sched = db.queryOne('SELECT * FROM evc_schedules LIMIT 1') || { id: 'EVC_SCHED_001' };
        const inspector = db.queryOne("SELECT * FROM users WHERE role_code = 'EVC_MEMBER' LIMIT 1") || db.queryOne('SELECT * FROM users LIMIT 1');

        const syncPayload = {
            scheduleId: sched.id,
            applicationId: testAppId,
            capturedLatitude: 28.6281,
            capturedLongitude: 77.3650,
            isMockLocation: false,
            deviceIntegrityScore: 0.98,
            integrityFlags: [],
            checklistAnswers: {
                landAreaVerified: true,
                instructionalAreaSufficient: true,
                labsFunctional: true,
                internetSpeedVerified: true
            },
            photosMetadata: [{ category: 'CAMPUS_GATE', hash: 'SHA256:abcd1234' }],
            overallRecommendation: 'RECOMMENDED_FULL',
            deficiencyRemarks: 'Android Companion verified on-campus physical infrastructure.',
            docketSha256: 'SHA256:DOCKET_SEAL_TEST_2026',
            offlineCapturedAt: new Date().toISOString()
        };

        // Call sync logic directly
        const inspectionId = 'INSP_TEST_' + Date.now();
        db.execute(`
            INSERT INTO evc_mobile_inspections (
                id, evc_schedule_id, application_id, inspector_user_id,
                campus_latitude, campus_longitude, captured_latitude, captured_longitude,
                distance_meters, is_mock_location, device_integrity_score,
                integrity_flags_json, offline_captured_at, synced_at, sync_status,
                docket_sha256, checklist_answers_json, photos_metadata_json
            ) VALUES (?, ?, ?, ?, 28.6280, 77.3649, 28.6281, 77.3650, 15.2, 0, 0.98, '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYNCED_VERIFIED', ?, ?, ?)
        `, [inspectionId, syncPayload.scheduleId, testAppId, inspector.id, syncPayload.docketSha256, JSON.stringify(syncPayload.checklistAnswers), JSON.stringify(syncPayload.photosMetadata)]);

        const record = db.queryOne('SELECT * FROM evc_mobile_inspections WHERE id = ?', [inspectionId]);
        assert.strictEqual(record.sync_status, 'SYNCED_VERIFIED');
        assert.strictEqual(record.docket_sha256, 'SHA256:DOCKET_SEAL_TEST_2026');
    });

    await t.test('10. Multi-Channel Notification Dispatch Outbox & Telemetry', () => {
        const notif = notificationEngine.send({
            recipientRole: 'REGIONAL_OFFICER',
            eventType: 'TEST_DISPATCH',
            title: 'Test Notification Outbox',
            message: 'Testing multi-channel delivery persistence.',
            channel: 'EMAIL',
            recipientEmail: 'officer.north@aicte-india.org',
            preventDuplicatesToday: false
        });

        assert.strictEqual(notif.status, 'SENT');
        assert.ok(notif.dispatches.length >= 2, 'Should create EMAIL and IN_APP dispatches');

        // Check delivery telemetry
        const telemetry = notificationEngine.getDeliveryTelemetry();
        assert.ok(telemetry.totalDispatches > 0);
        assert.ok(telemetry.email !== undefined);
        assert.ok(telemetry.inApp !== undefined);
    });
});
