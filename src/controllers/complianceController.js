const undertakingService = require('../services/undertakingService');

class ComplianceController {
    list(req, res) {
        try {
            const institutionId = req.enforcedInstitutionId || req.query.institutionId;
            const regionId = req.enforcedRegionId || req.query.regionId;
            const status = req.query.status;

            const undertakings = undertakingService.getUndertakings({ institutionId, regionId, status });
            return res.json({ undertakings, total: undertakings.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    getDetails(req, res) {
        try {
            const { id } = req.params;
            const data = undertakingService.getUndertakingDetails(id);
            return res.json(data);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    create(req, res) {
        try {
            const { institutionId, applicationId, conditionTitle, regulatorySource, obligationDetails, dueDate, responsiblePerson } = req.body;

            if (!institutionId || !conditionTitle || !dueDate || !responsiblePerson) {
                return res.status(400).json({ error: 'institutionId, conditionTitle, dueDate and responsiblePerson are mandatory.' });
            }

            const result = undertakingService.createUndertaking({
                institutionId,
                applicationId: applicationId || null,
                conditionTitle,
                regulatorySource: regulatorySource || 'APH-2026 Annexure 8',
                obligationDetails: obligationDetails || conditionTitle,
                dueDate,
                responsiblePerson,
                user: req.user
            });

            return res.status(201).json({ message: 'Compliance undertaking registered.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    submitEvidence(req, res) {
        try {
            const { id } = req.params;
            const { evidenceTitle, documentUrl, remarks } = req.body;

            if (!evidenceTitle) {
                return res.status(400).json({ error: 'Evidence title is mandatory.' });
            }

            const result = undertakingService.submitComplianceEvidence({
                undertakingId: id,
                evidenceTitle,
                documentUrl: documentUrl || '/uploads/compliance/evidence_doc.pdf',
                remarks: remarks || '',
                user: req.user
            });

            return res.json({ message: 'Compliance evidence submitted. Awaiting officer verification.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    verify(req, res) {
        try {
            const { id } = req.params;
            const { verificationOutcome, reviewRemarks } = req.body;

            if (!verificationOutcome) {
                return res.status(400).json({ error: 'Verification outcome (VERIFIED / DEFICIENCY_RAISED) is required.' });
            }

            const result = undertakingService.verifyCompliance({
                undertakingId: id,
                verificationOutcome,
                reviewRemarks: reviewRemarks || '',
                user: req.user
            });

            return res.json({ message: 'Compliance verification finalized.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new ComplianceController();
