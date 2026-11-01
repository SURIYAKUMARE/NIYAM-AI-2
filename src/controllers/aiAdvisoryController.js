const aiAdvisoryService = require('../services/aiAdvisoryService');

class AIAdvisoryController {
    getCaseSummary(req, res) {
        try {
            const { id } = req.params;
            const db = require('../database/db');
            const app = db.queryOne('SELECT institution_id FROM applications WHERE id = ? OR application_no = ?', [id, id]);
            if (!app) {
                return res.status(404).json({ error: 'Application not found.' });
            }
            if (req.enforcedInstitutionId && app.institution_id !== req.enforcedInstitutionId) {
                return res.status(403).json({ error: 'Forbidden: You are only authorized to inspect summaries for your own institution.' });
            }
            const summary = aiAdvisoryService.generateCaseSummary(id);
            return res.json(summary);
        } catch (err) {
            return res.status(err.message === 'Application not found.' ? 404 : 500).json({ error: err.message });
        }
    }

    draftDeficiency(req, res) {
        try {
            const { category, observation } = req.body;
            if (!category) {
                return res.status(400).json({ error: 'Category is required.' });
            }
            const draft = aiAdvisoryService.draftDeficiencyRecommendation(category, observation || '');
            return res.json(draft);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new AIAdvisoryController();
