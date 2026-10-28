const authMiddleware = require('../middleware/authMiddleware');
const { requireRole, enforceDataIsolation } = require('../middleware/rbacMiddleware');
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
router.get('/api/auth/me', authController.getCurrentUser.bind(authController));
router.get('/api/auth/users', authController.listAllUsers.bind(authController));

// Applications
router.get('/api/applications', applicationController.list.bind(applicationController));
router.post('/api/applications', applicationController.submit.bind(applicationController));
router.get('/api/applications/:id', applicationController.getCaseWorkspace.bind(applicationController));
router.post('/api/applications/:id/transition', applicationController.advanceWorkflow.bind(applicationController));
router.post('/api/applications/:id/hold', applicationController.setHold.bind(applicationController));

// Scrutiny
router.get('/api/scrutiny/queue', scrutinyController.getQueue.bind(scrutinyController));
router.get('/api/scrutiny/:id/checklist', scrutinyController.getChecklist.bind(scrutinyController));
router.post('/api/scrutiny/:id/deficiency', scrutinyController.raiseDeficiency.bind(scrutinyController));
router.post('/api/scrutiny/deficiencies/:deficiencyId/response', scrutinyController.submitResponse.bind(scrutinyController));
router.post('/api/scrutiny/:id/review', scrutinyController.completeReview.bind(scrutinyController));

// EVC Management
router.get('/api/evc/dashboard', evcController.getDashboard.bind(evcController));
router.get('/api/evc/queue', evcController.getSchedulingQueue.bind(evcController));
router.post('/api/evc/check-conflict', evcController.checkConflict.bind(evcController));
router.post('/api/evc/:id/schedule', evcController.scheduleVisit.bind(evcController));
router.post('/api/evc/:scheduleId/report', evcController.submitReport.bind(evcController));

// Pendency & Dashboard
router.get('/api/pendency/kpis', pendencyController.getDashboardKPIs.bind(pendencyController));
router.get('/api/pendency/analytics', pendencyController.getAnalytics.bind(pendencyController));
router.get('/api/pendency/list', pendencyController.getPendencyList.bind(pendencyController));

// Institutional Compliance & Undertakings
router.get('/api/compliance/undertakings', complianceController.list.bind(complianceController));
router.post('/api/compliance/undertakings', complianceController.create.bind(complianceController));
router.get('/api/compliance/undertakings/:id', complianceController.getDetails.bind(complianceController));
router.post('/api/compliance/undertakings/:id/evidence', complianceController.submitEvidence.bind(complianceController));
router.post('/api/compliance/undertakings/:id/verify', complianceController.verify.bind(complianceController));

// Lease and Document Validity
router.get('/api/documents', documentController.list.bind(documentController));
router.post('/api/documents/:id/renewal', documentController.submitRenewal.bind(documentController));
router.post('/api/documents/:id/renewals/:renewalId/verify', documentController.verifyRenewal.bind(documentController));
router.get('/api/documents/expiry-alerts', documentController.checkExpiryAlerts.bind(documentController));

// Notifications & Alerts
router.get('/api/notifications', notificationController.getUserNotifications.bind(notificationController));
router.post('/api/notifications/:id/read', notificationController.markAsRead.bind(notificationController));

// Escalations
router.get('/api/escalations', escalationController.getActiveEscalations.bind(escalationController));
router.post('/api/escalations/evaluate', escalationController.triggerEvaluation.bind(escalationController));
router.post('/api/escalations/:id/acknowledge', escalationController.acknowledge.bind(escalationController));
router.post('/api/escalations/:id/resolve', escalationController.resolve.bind(escalationController));

// Regulatory Rules
router.get('/api/regulatory-rules', regulatoryRulesController.list.bind(regulatoryRulesController));
router.post('/api/regulatory-rules', regulatoryRulesController.createDraft.bind(regulatoryRulesController));
router.post('/api/regulatory-rules/:id/publish', regulatoryRulesController.publish.bind(regulatoryRulesController));

// Audit Log & Non-Repudiation
router.get('/api/audit/events', auditController.list.bind(auditController));
router.get('/api/audit/verify-integrity', auditController.verifyIntegrity.bind(auditController));

// AI Advisory Layer
router.get('/api/ai/case-summary/:id', aiAdvisoryController.getCaseSummary.bind(aiAdvisoryController));
router.post('/api/ai/draft-deficiency', aiAdvisoryController.draftDeficiency.bind(aiAdvisoryController));

// Reports & Exports
router.get('/api/reports', reportController.listReports.bind(reportController));
router.get('/api/reports/:reportId', reportController.generate.bind(reportController));
router.get('/api/reports/:reportId/export-csv', reportController.exportCSV.bind(reportController));

// Demonstrations & Test Scenarios 1-10
router.get('/api/scenarios', scenarioController.listScenarios.bind(scenarioController));
router.post('/api/scenarios/:id/run', scenarioController.runScenario.bind(scenarioController));

module.exports = router;
