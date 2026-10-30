const authMiddleware = require('../middleware/authMiddleware');
const { requireAuth, requireRole, enforceDataIsolation } = require('../middleware/rbacMiddleware');
const { ROLES } = require('../config/constants');

const authController = require('../controllers/authController');
const applicationController = require('../controllers/applicationController');
const scrutinyController = require('../controllers/scrutinyController');
const evcController = require('../controllers/evcController');
const pendencyController = require('../controllers/pendencyController');
const complianceController = require('../controllers/complianceController');
const documentController = require('../controllers/documentController');
const notificationController = require('../controllers/notificationController');
const escalationController = require('../controllers/escalationController');
const regulatoryRulesController = require('../controllers/regulatoryRulesController');
const auditController = require('../controllers/auditController');
const aiAdvisoryController = require('../controllers/aiAdvisoryController');
const reportController = require('../controllers/reportController');
const scenarioController = require('../controllers/scenarioController');
const collegeController = require('../controllers/collegeController');
const verifyController = require('../controllers/verifyController');
const intelligenceController = require('../controllers/intelligenceController');

// Lightweight high-performance router compatible with Node.js http
class SimpleRouter {
    constructor() {
        this.routes = [];
    }

    add(method, path, ...handlers) {
        // Convert route pattern with params e.g. /api/applications/:id to regex
        const paramNames = [];
        const regexPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
            paramNames.push(name);
            return '([^/]+)';
        });
        const regex = new RegExp(`^${regexPath}$`);
        this.routes.push({ method, path, regex, paramNames, handlers });
    }

    get(path, ...handlers) { this.add('GET', path, ...handlers); }
    post(path, ...handlers) { this.add('POST', path, ...handlers); }
    put(path, ...handlers) { this.add('PUT', path, ...handlers); }
    delete(path, ...handlers) { this.add('DELETE', path, ...handlers); }

    handle(req, res) {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = urlObj.pathname;
        const method = req.method;

        // Parse query params
        req.query = {};
        for (const [key, val] of urlObj.searchParams.entries()) {
            req.query[key] = val;
        }

        // Helper response methods
        res.status = (code) => {
            res.statusCode = code;
            return res;
        };
        res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
        };
        res.send = (body) => {
            res.end(body);
        };

        // Find matching route
        for (const r of this.routes) {
            if (r.method === method) {
                const match = pathname.match(r.regex);
                if (match) {
                    req.params = {};
                    r.paramNames.forEach((name, i) => {
                        req.params[name] = decodeURIComponent(match[i + 1]);
                    });

                    // Middleware execution pipeline
                    const allHandlers = [authMiddleware, enforceDataIsolation, ...r.handlers];
                    let idx = 0;
                    const next = (err) => {
                        if (err) {
                            res.status(500).json({ error: err.message || 'Internal Server Error' });
                            return;
                        }
                        if (idx < allHandlers.length) {
                            const current = allHandlers[idx++];
                            try {
                                current(req, res, next);
                            } catch (e) {
                                res.status(500).json({ error: e.message });
                            }
                        }
                    };
                    next();
                    return true;
                }
            }
        }

        return false; // Route not matched
    }
}

const router = new SimpleRouter();

// Health Checks
router.get('/api/health', (req, res) => res.json({ status: 'UP', service: 'NIYAM AI', version: '2.0.0', timestamp: new Date().toISOString() }));
router.get('/api/v1/health', (req, res) => res.json({ status: 'UP', service: 'NIYAM AI', version: '2.0.0', timestamp: new Date().toISOString() }));

// Auth Endpoints
router.post('/api/auth/login', authController.login.bind(authController));
router.post('/api/auth/logout', authController.logout.bind(authController));
router.get('/api/auth/me', requireAuth, authController.getCurrentUser.bind(authController));
router.get('/api/auth/users', requireRole([ROLES.SUPER_ADMIN, ROLES.REGULATION_BUREAU_ADMIN]), authController.listAllUsers.bind(authController));

// Applications
router.get('/api/applications', requireAuth, applicationController.list.bind(applicationController));
router.post('/api/applications', requireAuth, applicationController.submit.bind(applicationController));
router.get('/api/applications/:id', requireAuth, applicationController.getCaseWorkspace.bind(applicationController));
router.post('/api/applications/:id/transition', requireRole([ROLES.SCRUTINY_MEMBER, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN, ROLES.COMPETENT_AUTHORITY]), applicationController.advanceWorkflow.bind(applicationController));
router.post('/api/applications/:id/hold', requireRole([ROLES.REGULATION_BUREAU_ADMIN, ROLES.COMPETENT_AUTHORITY]), applicationController.setHold.bind(applicationController));

// Scrutiny
router.get('/api/scrutiny/queue', requireRole([ROLES.SCRUTINY_MEMBER, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), scrutinyController.getQueue.bind(scrutinyController));
router.get('/api/scrutiny/:id/checklist', requireAuth, scrutinyController.getChecklist.bind(scrutinyController));
router.post('/api/scrutiny/:id/deficiency', requireRole([ROLES.SCRUTINY_MEMBER, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), scrutinyController.raiseDeficiency.bind(scrutinyController));
router.post('/api/scrutiny/deficiencies/:deficiencyId/response', requireAuth, scrutinyController.submitResponse.bind(scrutinyController));
router.post('/api/scrutiny/:id/review', requireRole([ROLES.SCRUTINY_MEMBER, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), scrutinyController.completeReview.bind(scrutinyController));

// EVC Management
router.get('/api/evc/dashboard', requireRole([ROLES.EVC_COORDINATOR, ROLES.EVC_MEMBER, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), evcController.getDashboard.bind(evcController));
router.get('/api/evc/queue', requireRole([ROLES.EVC_COORDINATOR, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), evcController.getSchedulingQueue.bind(evcController));
router.post('/api/evc/check-conflict', requireRole([ROLES.EVC_COORDINATOR, ROLES.REGULATION_BUREAU_ADMIN]), evcController.checkConflict.bind(evcController));
router.post('/api/evc/:id/schedule', requireRole([ROLES.EVC_COORDINATOR, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), evcController.scheduleVisit.bind(evcController));
router.post('/api/evc/:scheduleId/report', requireRole([ROLES.EVC_MEMBER, ROLES.EVC_COORDINATOR, ROLES.REGIONAL_OFFICER]), evcController.submitReport.bind(evcController));

// Pendency & Dashboard
router.get('/api/pendency/kpis', requireRole([ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN, ROLES.COMPETENT_AUTHORITY, ROLES.AUDITOR]), pendencyController.getDashboardKPIs.bind(pendencyController));
router.get('/api/pendency/analytics', requireRole([ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN, ROLES.COMPETENT_AUTHORITY, ROLES.AUDITOR]), pendencyController.getAnalytics.bind(pendencyController));
router.get('/api/pendency/list', requireRole([ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN, ROLES.COMPETENT_AUTHORITY, ROLES.AUDITOR]), pendencyController.getPendencyList.bind(pendencyController));

// Institutional Compliance & Undertakings
router.get('/api/compliance/undertakings', requireAuth, complianceController.list.bind(complianceController));
router.post('/api/compliance/undertakings', requireRole([ROLES.COMPLIANCE_OFFICER, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), complianceController.create.bind(complianceController));
router.get('/api/compliance/undertakings/:id', requireAuth, complianceController.getDetails.bind(complianceController));
router.post('/api/compliance/undertakings/:id/evidence', requireAuth, complianceController.submitEvidence.bind(complianceController));
router.post('/api/compliance/undertakings/:id/verify', requireRole([ROLES.COMPLIANCE_OFFICER, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), complianceController.verify.bind(complianceController));

// Lease and Document Validity
router.get('/api/documents', requireAuth, documentController.list.bind(documentController));
router.post('/api/documents/:id/renewal', requireAuth, documentController.submitRenewal.bind(documentController));
router.post('/api/documents/:id/renewals/:renewalId/verify', requireRole([ROLES.COMPLIANCE_OFFICER, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), documentController.verifyRenewal.bind(documentController));
router.get('/api/documents/expiry-alerts', requireAuth, documentController.checkExpiryAlerts.bind(documentController));

// Notifications & Alerts
router.get('/api/notifications', requireAuth, notificationController.getUserNotifications.bind(notificationController));
router.post('/api/notifications/:id/read', requireAuth, notificationController.markAsRead.bind(notificationController));

// Escalations
router.get('/api/escalations', requireRole([ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN, ROLES.SUPER_ADMIN]), escalationController.getActiveEscalations.bind(escalationController));
router.post('/api/escalations/evaluate', requireRole([ROLES.REGULATION_BUREAU_ADMIN, ROLES.SUPER_ADMIN]), escalationController.triggerEvaluation.bind(escalationController));
router.post('/api/escalations/:id/acknowledge', requireRole([ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), escalationController.acknowledge.bind(escalationController));
router.post('/api/escalations/:id/resolve', requireRole([ROLES.REGULATION_BUREAU_ADMIN, ROLES.SUPER_ADMIN]), escalationController.resolve.bind(escalationController));

// Regulatory Rules
router.get('/api/regulatory-rules', requireAuth, regulatoryRulesController.list.bind(regulatoryRulesController));
router.post('/api/regulatory-rules', requireRole([ROLES.REGULATION_BUREAU_ADMIN]), regulatoryRulesController.createDraft.bind(regulatoryRulesController));
router.post('/api/regulatory-rules/:id/publish', requireRole([ROLES.REGULATION_BUREAU_ADMIN]), regulatoryRulesController.publish.bind(regulatoryRulesController));

// Audit Log & Non-Repudiation
router.get('/api/audit/events', requireRole([ROLES.AUDITOR, ROLES.REGULATION_BUREAU_ADMIN]), auditController.list.bind(auditController));
router.get('/api/audit/verify-integrity', requireRole([ROLES.AUDITOR, ROLES.REGULATION_BUREAU_ADMIN]), auditController.verifyIntegrity.bind(auditController));

// AI Advisory Layer
router.get('/api/ai/case-summary/:id', requireAuth, aiAdvisoryController.getCaseSummary.bind(aiAdvisoryController));
router.post('/api/ai/draft-deficiency', requireRole([ROLES.SCRUTINY_MEMBER, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), aiAdvisoryController.draftDeficiency.bind(aiAdvisoryController));

// Reports & Exports
router.get('/api/reports', requireRole([ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN, ROLES.AUDITOR]), reportController.listReports.bind(reportController));
router.get('/api/reports/:reportId', requireRole([ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN, ROLES.AUDITOR]), reportController.generate.bind(reportController));
router.get('/api/reports/:reportId/export-csv', requireRole([ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN, ROLES.AUDITOR]), reportController.exportCSV.bind(reportController));

// Synthetic Colleges Directory & AI Verification Studio
router.get('/api/colleges', collegeController.list.bind(collegeController));
router.get('/api/colleges/:id', collegeController.getById.bind(collegeController));
router.get('/api/verify/ground-truth', verifyController.getGroundTruth.bind(verifyController));
router.post('/api/verify/document', verifyController.verifyDocument.bind(verifyController));

// Demonstrations & Test Scenarios 1-10
router.get('/api/scenarios', scenarioController.listScenarios.bind(scenarioController));
router.post('/api/scenarios/:id/run', scenarioController.runScenario.bind(scenarioController));

// NIYAM 2035 — Next-Generation Intelligent Regulatory Operations
router.post('/api/copilot/query', requireAuth, intelligenceController.copilotQuery.bind(intelligenceController));
router.get('/api/intelligence/predictive-pendency', requireAuth, intelligenceController.getPredictivePendency.bind(intelligenceController));
router.post('/api/intelligence/document-analyze', requireAuth, intelligenceController.analyzeDocument.bind(intelligenceController));
router.get('/api/intelligence/deadlines-calendar', requireAuth, intelligenceController.getDeadlinesCalendar.bind(intelligenceController));
router.get('/api/intelligence/audit-replay/:applicationId', requireAuth, intelligenceController.getAuditReplay.bind(intelligenceController));
router.post('/api/intelligence/digital-twin/simulate', requireRole([ROLES.SUPER_ADMIN, ROLES.REGULATION_BUREAU_ADMIN, ROLES.REGIONAL_OFFICER]), intelligenceController.simulateDigitalTwin.bind(intelligenceController));
router.get('/api/intelligence/knowledge-graph', requireAuth, intelligenceController.getKnowledgeGraph.bind(intelligenceController));
router.get('/api/intelligence/institution-readiness', requireAuth, intelligenceController.getInstitutionReadiness.bind(intelligenceController));
router.get('/api/intelligence/workload', requireRole([ROLES.SUPER_ADMIN, ROLES.REGULATION_BUREAU_ADMIN, ROLES.REGIONAL_OFFICER, ROLES.AUDITOR]), intelligenceController.getWorkloadIntelligence.bind(intelligenceController));

// NIYAM 2035 — 15 Differentiating Regulatory Innovations
router.get('/api/intelligence/radar', requireRole([ROLES.SUPER_ADMIN, ROLES.REGULATION_BUREAU_ADMIN, ROLES.REGIONAL_OFFICER, ROLES.SCRUTINY_MEMBER, ROLES.EVC_COORDINATOR, ROLES.AUDITOR]), intelligenceController.getEarlyWarningRadar.bind(intelligenceController));
router.get('/api/intelligence/application-health/:id', requireAuth, intelligenceController.getApplicationHealth.bind(intelligenceController));
router.get('/api/intelligence/application-health', requireAuth, intelligenceController.getApplicationHealth.bind(intelligenceController));
router.get('/api/intelligence/application-dna/:id', requireAuth, intelligenceController.getApplicationDNA.bind(intelligenceController));
router.get('/api/intelligence/application-dna', requireAuth, intelligenceController.getApplicationDNA.bind(intelligenceController));
router.post('/api/intelligence/smart-clarification', requireRole([ROLES.SCRUTINY_MEMBER, ROLES.REGIONAL_OFFICER, ROLES.REGULATION_BUREAU_ADMIN]), intelligenceController.generateSmartClarification.bind(intelligenceController));
router.get('/api/intelligence/regulatory-change-impact', requireAuth, intelligenceController.getRegulatoryChangeImpact.bind(intelligenceController));
router.post('/api/intelligence/document-forensics', requireAuth, intelligenceController.getDocumentForensics.bind(intelligenceController));
router.get('/api/intelligence/document-forensics', requireAuth, intelligenceController.getDocumentForensics.bind(intelligenceController));
router.get('/api/intelligence/evc-offline-docket', requireRole([ROLES.EVC_MEMBER, ROLES.EVC_COORDINATOR, ROLES.REGIONAL_OFFICER]), intelligenceController.getOfflineInspectionDocket.bind(intelligenceController));
router.post('/api/intelligence/evc-offline-sync', requireRole([ROLES.EVC_MEMBER, ROLES.EVC_COORDINATOR, ROLES.REGIONAL_OFFICER]), intelligenceController.syncOfflineInspection.bind(intelligenceController));
router.get('/api/intelligence/bottleneck-map', requireAuth, intelligenceController.getRegulatoryBottleneckMap.bind(intelligenceController));
router.get('/api/intelligence/consolidated-alerts', requireAuth, intelligenceController.getConsolidatedAlerts.bind(intelligenceController));
router.get('/api/intelligence/case-handover/:id', requireRole([ROLES.REGIONAL_OFFICER, ROLES.SCRUTINY_MEMBER, ROLES.REGULATION_BUREAU_ADMIN]), intelligenceController.getCaseHandoverSummary.bind(intelligenceController));
router.get('/api/intelligence/case-handover', requireRole([ROLES.REGIONAL_OFFICER, ROLES.SCRUTINY_MEMBER, ROLES.REGULATION_BUREAU_ADMIN]), intelligenceController.getCaseHandoverSummary.bind(intelligenceController));
router.get('/api/intelligence/command-summary', requireAuth, intelligenceController.getCommandIntelligenceSummary.bind(intelligenceController));

module.exports = router;
