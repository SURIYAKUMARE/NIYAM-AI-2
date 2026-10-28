const auditService = require('../services/auditService');

class AuditController {
    list(req, res) {
        try {
            const { limit = 50, offset = 0, entityName, actorRole } = req.query;
            const events = auditService.getAllEvents({
                limit: Number(limit),
                offset: Number(offset),
                entityName,
                actorRole
            });
            return res.json({ events, total: events.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    verifyIntegrity(req, res) {
        try {
            const result = auditService.verifyIntegrity();
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new AuditController();
