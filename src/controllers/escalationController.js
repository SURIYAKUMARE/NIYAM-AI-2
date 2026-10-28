const escalationEngine = require('../services/escalationEngine');

class EscalationController {
    getActiveEscalations(req, res) {
        try {
            const escalations = escalationEngine.getActiveEscalations();
            return res.json({ escalations, total: escalations.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    triggerEvaluation(req, res) {
        try {
            const triggered = escalationEngine.evaluateEscalations();
            return res.json({
                message: `Evaluated overdue applications across all regions. Triggered ${triggered.length} new escalation events.`,
                triggered
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    acknowledge(req, res) {
        try {
            const { id } = req.params;
            const result = escalationEngine.acknowledgeEscalation(id, req.user);
            return res.json({ message: 'Escalation acknowledged by authorized officer.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    resolve(req, res) {
        try {
            const { id } = req.params;
            const { resolutionNotes } = req.body;
            if (!resolutionNotes) {
                return res.status(400).json({ error: 'Resolution notes are required.' });
            }
            const result = escalationEngine.resolveEscalation(id, resolutionNotes, req.user);
            return res.json({ message: 'Escalation resolved and closed.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new EscalationController();
