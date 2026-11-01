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
            if (req.enforcedInstitutionId && result.institutionId && result.institutionId !== req.enforcedInstitutionId) {
                return res.status(403).json({ error: 'Forbidden: You are only authorized to inspect audit history for your own institution.' });
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

    getEarlyWarningRadar(req, res) {
        try {
            const regionId = req.enforcedRegionId || req.query.regionId;
            const result = intelligenceService.getEarlyWarningRadar({ user: req.user, regionId });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getApplicationHealth(req, res) {
        try {
            const appId = req.params.id || req.query.application_id || req.query.applicationId || 'APP_2026_001';
            const result = intelligenceService.getApplicationHealth(appId);
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getApplicationDNA(req, res) {
        try {
            const appId = req.params.id || req.query.application_id || req.query.applicationId || 'APP_2026_001';
            const result = intelligenceService.getApplicationDNA(appId);
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    generateSmartClarification(req, res) {
        try {
            const { applicationId, category, customNote } = req.body || {};
            const result = intelligenceService.generateSmartClarification({ applicationId, category, customNote });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getRegulatoryChangeImpact(req, res) {
        try {
            const sourceVersion = (req.query && (req.query.source_version || req.query.sourceVersion)) || 'APH_2024_25';
            const targetVersion = (req.query && (req.query.target_version || req.query.targetVersion)) || 'APH_2025_26';
            const result = intelligenceService.getRegulatoryChangeImpact({ sourceVersion, targetVersion });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getDocumentForensics(req, res) {
        try {
            const params = req.method === 'GET' ? (req.query || {}) : (req.body || {});
            const documentId = params.document_id || params.documentId || 'DOC_001';
            const compareVersion = params.compare_version || params.compareVersion;
            const result = intelligenceService.getDocumentForensics({ documentId, compareVersion });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getOfflineInspectionDocket(req, res) {
        try {
            const officerId = (req.user && req.user.username) || 'prof.devendra.pathak';
            const result = intelligenceService.getOfflineInspectionDocket(officerId);
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    syncOfflineInspection(req, res) {
        try {
            const { visitId, observations, checksum } = req.body || {};
            const officerId = (req.user && req.user.username) || 'prof.devendra.pathak';
            const result = intelligenceService.syncOfflineInspection({ officerId, visitId, observations, checksum });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getRegulatoryBottleneckMap(req, res) {
        try {
            const result = intelligenceService.getRegulatoryBottleneckMap();
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getConsolidatedAlerts(req, res) {
        try {
            const result = intelligenceService.getConsolidatedAlerts({ user: req.user });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getCaseHandoverSummary(req, res) {
        try {
            const appId = req.params.id || req.query.application_id || req.query.applicationId || 'APP_2026_001';
            const fromOfficer = req.query.from || req.query.from_officer || (req.user && req.user.username) || 'dr.vandana.rao';
            const toOfficer = req.query.to || req.query.to_officer || 'er.manoj.verma';
            const result = intelligenceService.getCaseHandoverSummary({ applicationId: appId, fromOfficer, toOfficer });
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getCommandIntelligenceSummary(req, res) {
        try {
            const result = intelligenceService.getCommandIntelligenceSummary();
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new IntelligenceController();
