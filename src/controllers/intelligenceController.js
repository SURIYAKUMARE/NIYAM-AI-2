const intelligenceService = require('../services/intelligenceService');

class IntelligenceController {
    copilotQuery(req, res) {
        try {
            const query = (req.body && (req.body.query || req.body.question)) || '';
            const context = (req.body && req.body.context) || {};
            if (!query || typeof query !== 'string') {
                return res.status(400).json({ error: 'Query parameter is mandatory.' });
            }
            const result = intelligenceService.copilotQuery({
                query,
                user: req.user,
                context: context
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
            const body = req.body || {};
            const documentId = body.documentId || body.document_id;
            const docType = body.docType || body.document_type || body.doc_type;
            const mockOcrText = body.mockOcrText || body.ocr_text || body.ocrText;
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
            const body = req.body || {};
            const volumeIncreasePct = body.volumeIncreasePct ?? body.volume_surge_pct ?? body.volumeSurgePct ?? 25;
            const evcCapacityPct = body.evcCapacityPct ?? (body.officer_capacity_pct ? (Number(body.officer_capacity_pct) - 100) : null) ?? -20;
            const scrutinySlaDays = body.scrutinySlaDays ?? body.sla_days ?? body.targetSlaDays ?? 7;
            const result = intelligenceService.simulateDigitalTwin({
                volumeIncreasePct: Number(volumeIncreasePct),
                evcCapacityPct: Number(evcCapacityPct),
                scrutinySlaDays: Number(scrutinySlaDays)
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
