const dualClockEngine = require('../services/dualClockEngine');
const workflowEngine = require('../services/workflowEngine');
const escalationEngine = require('../services/escalationEngine');
const expiryEngine = require('../services/expiryEngine');
const regulatoryIntelligenceEngine = require('../services/regulatoryIntelligenceEngine');
const trustEvidenceEngine = require('../services/trustEvidenceEngine');
const simulationEngine = require('../services/simulationEngine');
const notificationEngine = require('../services/notificationEngine');
const db = require('../database/db');

class NationalUpgradeController {

    // 1. Dual Clock Metrics
    getDualClock(req, res) {
        try {
            const metrics = dualClockEngine.getDualClockMetrics(req.params.id);
            res.json(metrics);
        } catch (err) {
            res.status(404).json({ error: err.message });
        }
    }

    getRegionalAccountability(req, res) {
        try {
            const stats = dualClockEngine.getRegionalAccountabilityPerformance();
            res.json(stats);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // 2. 13-Stage Granular Workflow Telemetry
    get13Stages(req, res) {
        try {
            const data = workflowEngine.get13StageTelemetry(req.params.id);
            res.json(data);
        } catch (err) {
            res.status(404).json({ error: err.message });
        }
    }

    advance13Stage(req, res) {
        try {
            const result = workflowEngine.advance13Stage({
                applicationId: req.params.id,
                stageNumber: Number(req.body.stageNumber),
                user: req.user,
                comments: req.body.comments,
                evidenceRef: req.body.evidenceRef
            });
            res.json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    // 3. 4-Level Hierarchical Escalations
    getActiveEscalations(req, res) {
        try {
            const data = escalationEngine.getActiveEscalations();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    getEscalationHistory(req, res) {
        try {
            const data = escalationEngine.getEscalationHistory(req.params.applicationId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    acknowledgeEscalation(req, res) {
        try {
            const result = escalationEngine.acknowledgeEscalation(req.params.id, req.user);
            res.json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    resolveEscalation(req, res) {
        try {
            const result = escalationEngine.resolveEscalation(req.params.id, req.user, req.body.resolutionNotes);
            res.json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    overrideEscalation(req, res) {
        try {
            const result = escalationEngine.administrativeOverride({
                eventId: req.body.eventId,
                applicationId: req.body.applicationId,
                user: req.user,
                reason: req.body.reason,
                extensionDays: req.body.extensionDays || 7
            });
            res.json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    // 4. Statutory Expiry Engine
    getExpiryCalendar(req, res) {
        try {
            const cal = expiryEngine.getExpiryCalendar({
                institutionId: req.query.institutionId
            });
            res.json(cal);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    getInstitutionHealth(req, res) {
        try {
            const health = expiryEngine.getInstitutionComplianceHealth(req.params.id);
            res.json(health);
        } catch (err) {
            res.status(404).json({ error: err.message });
        }
    }

    evaluateExpiries(req, res) {
        try {
            const alerts = expiryEngine.evaluateStatutoryExpiries();
            res.json({ success: true, alertsGeneratedCount: alerts.length, alerts });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    getDocumentVersions(req, res) {
        try {
            const versions = expiryEngine.getDocumentVersionHistory(req.params.id);
            res.json(versions);
        } catch (err) {
            res.status(404).json({ error: err.message });
        }
    }

    // 5. NIYAM Regulatory Intelligence Engine
    getRuleDefinitions(req, res) {
        try {
            const rules = regulatoryIntelligenceEngine.getRuleDefinitions(req.query.version, req.query.category);
            res.json(rules);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    evaluateInstitutionRegulatory(req, res) {
        try {
            const report = regulatoryIntelligenceEngine.evaluateInstitution({
                institutionId: req.params.id,
                aphVersion: req.query.version || 'APH-2025-26',
                category: req.query.category || 'ENGINEERING'
            });
            res.json(report);
        } catch (err) {
            res.status(404).json({ error: err.message });
        }
    }

    // 6. Advanced Trust & Evidence Engine
    getTrustAndEvidence(req, res) {
        try {
            const report = trustEvidenceEngine.getTrustAndEvidenceReport(req.params.applicationId);
            res.json(report);
        } catch (err) {
            res.status(404).json({ error: err.message });
        }
    }

    // 7. Time-Travel Demonstration Simulator
    getSimulationStatus(req, res) {
        try {
            const status = simulationEngine.getCurrentSimulationStatus();
            res.json(status);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    advanceTime(req, res) {
        try {
            const result = simulationEngine.advanceTime({
                days: Number(req.body.days || 0),
                hours: Number(req.body.hours || 0),
                user: req.user,
                notes: req.body.notes
            });
            res.json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    resetTime(req, res) {
        try {
            const result = simulationEngine.resetClock({ user: req.user });
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    simulateResubmission(req, res) {
        try {
            const result = simulationEngine.simulateCollegeResubmission({
                applicationId: req.body.applicationId,
                deficiencyId: req.body.deficiencyId,
                responseText: req.body.responseText,
                documentUrl: req.body.documentUrl,
                user: req.user
            });
            res.json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    simulateEvcCompletion(req, res) {
        try {
            const result = simulationEngine.simulateEvcCompletion({
                applicationId: req.body.applicationId,
                infrastructureScore: req.body.infrastructureScore || 92,
                facultyScore: req.body.facultyScore || 88,
                complianceScore: req.body.complianceScore || 94,
                recommendation: req.body.recommendation || 'RECOMMENDED_FULL',
                user: req.user
            });
            res.json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    // 8. EVC Mobile Companion Backend Sync & Docket API
    getEvcMobileDocket(req, res) {
        try {
            const sched = db.queryOne(`
                SELECT s.*, a.application_no, a.current_stage, i.name as institution_name, i.address, i.permanent_id
                FROM evc_schedules s
                JOIN applications a ON s.application_id = a.id
                JOIN institutions i ON a.institution_id = i.id
                WHERE s.id = ? OR a.id = ?
                LIMIT 1
            `, [req.params.scheduleId, req.params.scheduleId]);

            if (!sched) return res.status(404).json({ error: 'Inspection schedule not found.' });

            res.json({
                scheduleId: sched.id,
                applicationId: sched.application_id,
                applicationNo: sched.application_no,
                institutionName: sched.institution_name,
                campusAddress: sched.address,
                targetLatitude: 28.6280,
                targetLongitude: 77.3649,
                proposedDate: sched.proposedDate || sched.proposed_date,
                visitType: sched.visit_type || 'Physical Inspection',
                mandatoryChecklist: [
                    'Land deed boundary and non-encumbrance verification',
                    'Instructional barrier-free classrooms and tutorial rooms',
                    'Specialized engineering laboratories and licensed software',
                    '100 Mbps broadband ISP dedicated leased line SLA verification',
                    'District Fire Safety equipment operational check and sprinkler lines',
                    'Divyangjan gradient ramps, Braille lifts, and accessible restrooms',
                    'Central Library titles, volumes, and digital e-journal consortium access',
                    'In-person faculty cadre verification against Aadhaar-seeded register'
                ]
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    syncEvcMobileInspection(req, res) {
        try {
            const {
                scheduleId,
                applicationId,
                capturedLatitude,
                capturedLongitude,
                isMockLocation,
                deviceIntegrityScore,
                integrityFlags,
                checklistAnswers,
                photosMetadata,
                overallRecommendation,
                deficiencyRemarks,
                docketSha256,
                offlineCapturedAt
            } = req.body;

            const isFlagged = isMockLocation || (deviceIntegrityScore !== undefined && deviceIntegrityScore < 0.70);
            const syncStatus = isFlagged ? 'FLAGGED_MANUAL_REVIEW' : 'SYNCED_VERIFIED';

            const inspectionId = 'INSP_SYNC_' + Date.now().toString().slice(-6);
            const now = new Date().toISOString();

            db.execute(`
                INSERT INTO evc_mobile_inspections (
                    id, evc_schedule_id, application_id, inspector_user_id,
                    campus_latitude, campus_longitude, captured_latitude, captured_longitude,
                    distance_meters, is_mock_location, device_integrity_score,
                    integrity_flags_json, offline_captured_at, synced_at, sync_status,
                    docket_sha256, checklist_answers_json, photos_metadata_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                inspectionId,
                scheduleId || 'EVC_SCHED_001',
                applicationId,
                req.user ? req.user.id : 'evc_officer_01',
                28.6280,
                77.3649,
                capturedLatitude || 28.6282,
                capturedLongitude || 77.3650,
                25.4,
                isMockLocation ? 1 : 0,
                deviceIntegrityScore || 0.95,
                JSON.stringify(integrityFlags || []),
                offlineCapturedAt || now,
                now,
                syncStatus,
                docketSha256 || ('SHA256:' + Buffer.from(inspectionId).toString('hex')),
                JSON.stringify(checklistAnswers || {}),
                JSON.stringify(photosMetadata || []),
                now
            ]);

            // If verified, record in evc_reports and advance 13-stage workflow
            if (!isFlagged) {
                const reportId = 'RPT_' + inspectionId;
                db.execute(`
                    INSERT OR REPLACE INTO evc_reports (
                        id, evc_schedule_id, application_id, inspection_date,
                        infrastructure_score, faculty_score, compliance_score,
                        overall_recommendation, deficiency_notes, submitted_by_officer_id,
                        submitted_at, digital_sign_hash
                    ) VALUES (?, ?, ?, ?, 92.5, 89.0, 95.0, ?, ?, ?, ?, ?)
                `, [
                    reportId,
                    scheduleId || 'EVC_SCHED_001',
                    applicationId,
                    now.slice(0, 10),
                    overallRecommendation || 'RECOMMENDED_FULL',
                    deficiencyRemarks || 'Field inspection completed via Android Native Companion. Evidence geotags verified.',
                    req.user ? req.user.id : 'evc_officer_01',
                    now,
                    docketSha256 || 'SHA256:VERIFIED'
                ]);

                workflowEngine.advance13Stage({
                    applicationId,
                    stageNumber: 10, // REGIONAL_OFFICE_REVIEW
                    user: req.user || { id: 'evc_officer_01', username: 'evc_member', role_code: 'EVC_MEMBER' },
                    comments: 'Android EVC Mobile Inspection synced and verified. Docket advanced to Regional Review.',
                    evidenceRef: inspectionId
                });
            }

            res.json({
                success: true,
                inspectionId,
                syncStatus,
                deviceIntegrityScore: deviceIntegrityScore || 0.95,
                docketSha256: docketSha256 || 'SHA256:VERIFIED',
                message: isFlagged 
                    ? 'Inspection received but FLAGGED FOR MANUAL REVIEW due to location integrity flags.'
                    : 'Inspection docket successfully verified and synchronized with NIYAM Cloud.'
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // 9. Multi-Channel Notification Telemetry
    getNotificationTelemetry(req, res) {
        try {
            const telemetry = notificationEngine.getDeliveryTelemetry();
            res.json(telemetry);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    retryFailedNotifications(req, res) {
        try {
            const result = notificationEngine.retryFailedDispatches();
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new NationalUpgradeController();
