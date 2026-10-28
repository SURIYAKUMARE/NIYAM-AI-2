const aiAdvisoryService = require('../services/aiAdvisoryService');

class AIAdvisoryController {
    getCaseSummary(req, res) {
        try {
            const { id } = req.params;
            const summary = aiAdvisoryService.generateCaseSummary(id);
            return res.json(summary);
        } catch (err) {
            return res.status(500).json({ error: err.message });
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
