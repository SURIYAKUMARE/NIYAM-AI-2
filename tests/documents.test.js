const test = require('node:test');
const assert = require('node:assert');
const db = require('../src/database/db');
const documentService = require('../src/services/documentService');

test('Document & Lease Validity Management', async (t) => {
    const instRep = db.queryOne("SELECT * FROM users WHERE role_code = 'INSTITUTION_REP' LIMIT 1");
    const compOfficer = db.queryOne("SELECT * FROM users WHERE role_code = 'COMPLIANCE_OFFICER' LIMIT 1");
    const doc = db.queryOne("SELECT * FROM documents WHERE document_type_code = 'LAND_LEASE' LIMIT 1");

    await t.test('1. Document nearing expiry is dynamically categorized as EXPIRING_SOON', () => {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + 15);
        db.execute("UPDATE documents SET expiry_date = ?, current_status = 'EXPIRING_SOON' WHERE id = ?", [expDate.toISOString().split('T')[0], doc.id]);

        const docs = documentService.getDocuments({ institutionId: doc.institution_id });
        const matched = docs.find(d => d.id === doc.id);
        assert.ok(matched);
        assert.strictEqual(matched.dynamicStatus, 'EXPIRING_SOON');
    });

    await t.test('2. Submitting renewal request does NOT immediately extend validity date', () => {
        const docBefore = db.queryOne('SELECT * FROM documents WHERE id = ?', [doc.id]);
        const preSubmissionExpiry = docBefore.expiry_date;
        const proposedExpiry = '2056-12-31';

        const renewal = documentService.submitRenewal({
            documentId: doc.id,
            newIssueDate: '2026-06-01',
            newExpiryDate: proposedExpiry,
            uploadedFileUrl: '/uploads/renewals/renewed_lease.pdf',
            user: instRep
        });

        assert.strictEqual(renewal.status, 'RENEWAL_SUBMITTED');

        const currentDoc = db.queryOne('SELECT * FROM documents WHERE id = ?', [doc.id]);
        // Critical requirement: uploading a replacement deed does not silently alter expiry!
        assert.strictEqual(currentDoc.expiry_date, preSubmissionExpiry);
        assert.strictEqual(currentDoc.current_status, 'RENEWAL_SUBMITTED');

        // Step 3: Officer verification approves and extends validity
        documentService.verifyRenewal({
            documentId: doc.id,
            renewalId: renewal.renewalId,
            isApproved: true,
            officerComments: 'Sub-registrar registered extension accepted.',
            user: compOfficer
        });

        const verifiedDoc = db.queryOne('SELECT * FROM documents WHERE id = ?', [doc.id]);
        assert.strictEqual(verifiedDoc.expiry_date, proposedExpiry);
        assert.strictEqual(verifiedDoc.current_status, 'VALID');
    });
});
