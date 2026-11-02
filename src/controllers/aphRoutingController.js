const aphRoutingService = require('../services/aphRoutingService');

class AphRoutingController {
    getRules(req, res) {
        try {
            const { aphVersion, category, isActive } = req.query;
            const rules = aphRoutingService.getRoutingRules({
                aphVersion,
                category,
                isActive: isActive !== undefined ? isActive === 'true' || isActive === '1' : null
            });
            return res.json({ rules, total: rules.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    createRule(req, res) {
        try {
            const result = aphRoutingService.createRoutingRule(req.body, req.user);
            return res.status(201).json(result);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    updateRule(req, res) {
        try {
            const result = aphRoutingService.updateRoutingRule(req.params.id, req.body, req.user);
            return res.json(result);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    deleteRule(req, res) {
        try {
            const result = aphRoutingService.deleteRoutingRule(req.params.id, req.user);
            return res.json(result);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    evaluateRouting(req, res) {
        try {
            const { applicationId } = req.params;
            const result = aphRoutingService.evaluateAndRoute(applicationId, req.user);
            return res.json(result);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    manualReassign(req, res) {
        try {
            const { applicationId, toOfficerId, toRegionId, mandatoryReason } = req.body;
            const result = aphRoutingService.manualReassign({
                applicationId,
                toOfficerId,
                toRegionId,
                mandatoryReason,
                user: req.user
            });
            return res.json(result);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    getHistory(req, res) {
        try {
            const { applicationId } = req.params;
            const history = aphRoutingService.getRoutingHistory(applicationId);
            return res.json({ history, total: history.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getOfficers(req, res) {
        try {
            const { regionId } = req.query;
            const officers = aphRoutingService.getOfficerProfiles(regionId);
            return res.json({ officers, total: officers.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    updateOfficer(req, res) {
        try {
            const { id } = req.params;
            const result = aphRoutingService.updateOfficerProfile(id, req.body, req.user);
            return res.json(result);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new AphRoutingController();
