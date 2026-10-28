const regulatoryRulesService = require('../services/regulatoryRulesService');

class RegulatoryRulesController {
    list(req, res) {
        try {
            const { academicYear, status } = req.query;
            const rules = regulatoryRulesService.getRules({ academicYear, status });
            return res.json({ rules, total: rules.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    createDraft(req, res) {
        try {
            const { academicYear, aphVersion, ruleKey, category, institutionType, ruleContent } = req.body;
            if (!academicYear || !aphVersion || !ruleKey || !ruleContent) {
                return res.status(400).json({ error: 'academicYear, aphVersion, ruleKey, and ruleContent are required.' });
            }

            const result = regulatoryRulesService.createRuleDraft({
                academicYear,
                aphVersion,
                ruleKey,
                category: category || 'GENERAL',
                institutionType: institutionType || 'ALL',
                ruleContent,
                user: req.user
            });

            return res.status(201).json({ message: 'Regulatory rule draft saved.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    publish(req, res) {
        try {
            const { id } = req.params;
            const result = regulatoryRulesService.publishRule(id, req.user);
            return res.json({ message: 'Regulatory rule formally published and activated.', result });
        } catch (err) {
            return res.status(403).json({ error: err.message });
        }
    }
}

module.exports = new RegulatoryRulesController();
