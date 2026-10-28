const scrutinyService = require('../services/scrutinyService');

class ScrutinyController {
    getQueue(req, res) {
        try {
            const officerId = req.query.assignedToMe ? req.user.id : null;
            const regionId = req.enforcedRegionId || req.query.regionId;
            const queue = scrutinyService.getScrutinyQueue({ officerId, regionId });
            return res.json({ queue, total: queue.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getChecklist(req, res) {
        try {
            const { id } = req.params;
            const data = scrutinyService.getChecklistForApplication(id);
            return res.json(data);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    raiseDeficiency(req, res) {
        try {
            const { id } = req.params;
            const { category, description, severity, regulatoryReference } = req.body;

            if (!category || !description || !severity) {
                return res.status(400).json({ error: 'Category, description and severity are required.' });
            }

            const result = scrutinyService.raiseDeficiency({
                applicationId: id,
                category,
                description,
                severity,
                regulatoryReference: regulatoryReference || 'APH-2026 Norms',
                user: req.user
            });

            return res.status(201).json({ message: 'Deficiency recorded successfully.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    submitResponse(req, res) {
        try {
            const { deficiencyId } = req.params;
            const { responseText, responseDocUrl } = req.body;

            if (!responseText) {
                return res.status(400).json({ error: 'Response explanation is mandatory.' });
            }

            const result = scrutinyService.submitDeficiencyResponse({
                deficiencyId,
                responseText,
                responseDocUrl: responseDocUrl || '/uploads/deficiencies/compliance_doc.pdf',
                user: req.user
            });

            return res.json({ message: 'Deficiency response submitted successfully.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    completeReview(req, res) {
        try {
            const { id } = req.params;
            const { outcome, generalRemarks } = req.body;

            if (!outcome) {
                return res.status(400).json({ error: 'Scrutiny outcome is required.' });
            }

            const result = scrutinyService.completeReview({
                applicationId: id,
                outcome,
                generalRemarks: generalRemarks || '',
                user: req.user
            });

            return res.json({ message: 'Scrutiny review finalized and workflow updated.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new ScrutinyController();
