const documentService = require('../services/documentService');
const db = require('../database/db');

class DocumentController {
    list(req, res) {
        try {
            const institutionId = req.enforcedInstitutionId || req.query.institutionId;
            const status = req.query.status;
            const expiringWithinDays = req.query.expiringWithinDays ? Number(req.query.expiringWithinDays) : null;

            const documents = documentService.getDocuments({ institutionId, status, expiringWithinDays });
            return res.json({ documents, total: documents.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    submitRenewal(req, res) {
        try {
            const { id } = req.params;
            const { newIssueDate, newExpiryDate, uploadedFileUrl } = req.body;

            if (req.enforcedInstitutionId) {
                const doc = db.queryOne('SELECT institution_id FROM documents WHERE id = ?', [id]);
                if (!doc || doc.institution_id !== req.enforcedInstitutionId) {
                    return res.status(403).json({ error: 'Access Denied: You may only renew documents for your own institution.' });
                }
            }

            if (!newIssueDate || !newExpiryDate) {
                return res.status(400).json({ error: 'newIssueDate and newExpiryDate are required.' });
            }

            const result = documentService.submitRenewal({
                documentId: id,
                newIssueDate,
                newExpiryDate,
                uploadedFileUrl: uploadedFileUrl || '/uploads/renewals/renewed_deed.pdf',
                user: req.user
            });

            return res.json({ message: 'Renewal deed submitted. Awaiting regulatory verification.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    verifyRenewal(req, res) {
        try {
            const { id, renewalId } = req.params;
            const { isApproved, officerComments } = req.body;

            const result = documentService.verifyRenewal({
                documentId: id,
                renewalId,
                isApproved: Boolean(isApproved),
                officerComments: officerComments || '',
                user: req.user
            });

            return res.json({ message: 'Document renewal decision processed.', result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    checkExpiryAlerts(req, res) {
        try {
            const alerts = documentService.evaluateExpiryAlerts();
            return res.json({ alerts, total: alerts.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new DocumentController();
