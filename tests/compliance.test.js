const test = require('node:test');
const assert = require('node:assert');
const db = require('../src/database/db');
const undertakingService = require('../src/services/undertakingService');

test('Compliance & Undertakings Verification Lifecycle', async (t) => {
    const instRep = db.queryOne("SELECT * FROM users WHERE role_code = 'INSTITUTION_REP' LIMIT 1");
    const compOfficer = db.queryOne("SELECT * FROM users WHERE role_code = 'COMPLIANCE_OFFICER' LIMIT 1");

    let createdUtkId = null;

    await t.test('1. Create conditional time-bound undertaking', () => {
        const result = undertakingService.createUndertaking({
            institutionId: instRep.institution_id,
            conditionTitle: 'Install Fire Suppression Sprinkler Network in Central Library',
            regulatorySource: 'APH-2026 Fire Safety Norms',
            obligationDetails: 'Install standard NFPA compliant automatic sprinklers.',
            dueDate: '2026-08-30',
            responsiblePerson: 'Principal / Registrar',
            user: compOfficer
        });

        assert.ok(result.id);
        assert.strictEqual(result.status, 'PENDING');
        createdUtkId = result.id;
    });

    await t.test('2. Submitting evidence transitions status to UNDER_VERIFICATION, NOT VERIFIED', () => {
        const sub = undertakingService.submitComplianceEvidence({
            undertakingId: createdUtkId,
            evidenceTitle: 'Fire Safety Engineer Commissioning Certificate',
            documentUrl: '/uploads/compliance/fire_sprinklers.pdf',
            remarks: 'Completed installation on 3rd floor.',
            user: instRep
        });

        assert.strictEqual(sub.status, 'UNDER_VERIFICATION');

        const utk = db.queryOne('SELECT * FROM undertakings WHERE id = ?', [createdUtkId]);
        // Critical requirement: Submission of evidence must NEVER automatically imply verified compliance!
        assert.strictEqual(utk.status, 'UNDER_VERIFICATION');
    });

    await t.test('3. Compliance Officer verification finalizes compliance', () => {
        const ver = undertakingService.verifyCompliance({
            undertakingId: createdUtkId,
            verificationOutcome: 'VERIFIED',
            reviewRemarks: 'Chief Fire Officer site verification certificate confirmed.',
            user: compOfficer
        });

        assert.strictEqual(ver.status, 'VERIFIED');
        const updated = db.queryOne('SELECT * FROM undertakings WHERE id = ?', [createdUtkId]);
        assert.strictEqual(updated.status, 'VERIFIED');
        assert.ok(updated.verified_at);
    });
});
