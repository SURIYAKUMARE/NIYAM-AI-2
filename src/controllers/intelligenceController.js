const intelligenceService = require('../services/intelligenceService');

class IntelligenceController {
    copilotQuery(req, res) {
        try {
            const { query, context } = req.body;
            if (!query || typeof query !== 'string') {
                return res.status(400).json({ error: 'Query parameter is mandatory.' });
            }
            const result = intelligenceService.copilotQuery({
                query,
                user: req.user,
                context: context || {}
            });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getPredictivePendency(req, res) {
        try {
            const institutionId = req.enforcedInstitutionId || req.query.institutionId;
            const regionId = req.enforcedRegionId || req.query.regionId;

            const result = intelligenceService.getPredictivePendency({
                regionId,
                institutionId,
                user: req.user
            });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    analyzeDocument(req, res) {
        try {
            const { documentId, docType, mockOcrText } = req.body;
            const result = intelligenceService.analyzeDocument({
                documentId,
                docType,
                mockOcrText
            });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getDeadlinesCalendar(req, res) {
        try {
            const institutionId = req.enforcedInstitutionId || req.query.institutionId;
            const result = intelligenceService.getDeadlinesCalendar({
                user: req.user,
                institutionId
            });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getAuditReplay(req, res) {
        try {
            const { applicationId } = req.params;
            const result = intelligenceService.getAuditReplay(applicationId);
            if (result.error) {
                return res.status(404).json(result);
            }
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    simulateDigitalTwin(req, res) {
        try {
            const { volumeIncreasePct, evcCapacityPct, scrutinySlaDays } = req.body || {};
            const result = intelligenceService.simulateDigitalTwin({
                volumeIncreasePct: volumeIncreasePct !== undefined ? Number(volumeIncreasePct) : 25,
                evcCapacityPct: evcCapacityPct !== undefined ? Number(evcCapacityPct) : -20,
                scrutinySlaDays: scrutinySlaDays !== undefined ? Number(scrutinySlaDays) : 7
            });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getKnowledgeGraph(req, res) {
        try {
            const result = intelligenceService.getKnowledgeGraph({ user: req.user });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getInstitutionReadiness(req, res) {
        try {
            const institutionId = req.enforcedInstitutionId || req.query.institutionId || 'INST_001';
            const result = intelligenceService.getInstitutionReadiness({ institutionId });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getWorkloadIntelligence(req, res) {
        try {
            const result = intelligenceService.getWorkloadIntelligence();
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new IntelligenceController();
