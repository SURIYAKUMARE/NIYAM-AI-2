const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const aphRoutingService = require('../src/services/aphRoutingService');
const pendencyService = require('../src/services/pendencyService');
const db = require('../src/database/db');

describe('Phase 1 & Phase 2: APH Routing & Pendency Drill-Down Engine', () => {
    const adminUser = {
        id: 'USR_ADMIN_01',
        username: 'superadmin',
        role_code: 'SUPER_ADMIN'
    };

    it('1. APH Routing Rules and Officer Profiles are properly initialized', () => {
        const rules = aphRoutingService.getRoutingRules();
        assert.ok(Array.isArray(rules), 'Rules should be returned as an array');
        assert.ok(rules.length >= 4, 'Should have at least 4 default APH routing rules');

        const officers = aphRoutingService.getOfficerProfiles();
        assert.ok(Array.isArray(officers), 'Officers should be returned as an array');
        assert.ok(officers.length >= 3, 'Should have at least 3 initialized officer profiles');
    });

    it('2. Automatic APH Routing evaluates category, subcategory and assigns best available officer', () => {
        // Pick an existing application
        const testApp = db.queryOne("SELECT id FROM applications WHERE current_stage NOT IN ('APPROVED', 'REJECTED') LIMIT 1");
        assert.ok(testApp, 'Should find at least one active application in DB');

        const routingResult = aphRoutingService.evaluateAndRoute(testApp.id, adminUser);
        assert.ok(routingResult.success, 'Automatic routing should succeed');
        assert.ok(routingResult.assignedOfficerId, 'Should assign an officer ID');
        assert.ok(routingResult.targetRegionId, 'Should assign a target region ID');

        // Verify routing history record
        const history = aphRoutingService.getRoutingHistory(testApp.id);
        assert.ok(history.length > 0, 'Routing history should contain the new routing record');
        assert.equal(history[0].to_officer_id, routingResult.assignedOfficerId);
    });

    it('3. Manual Reassignment enforces mandatory justification constraint (>= 10 chars)', () => {
        const testApp = db.queryOne("SELECT id FROM applications LIMIT 1");
        const targetOfficer = db.queryOne("SELECT id FROM users WHERE role_code = 'REGIONAL_OFFICER' LIMIT 1");

        // Attempt reassignment with short reason (< 10 chars)
        assert.throws(() => {
            aphRoutingService.manualReassign({
                applicationId: testApp.id,
                toOfficerId: targetOfficer.id,
                mandatoryReason: 'Too short',
                user: adminUser
            });
        }, /Mandatory justification of at least 10 characters is required/);
    });

    it('4. Manual Reassignment succeeds with valid justification and updates workloads and history', () => {
        const testApp = db.queryOne("SELECT id, assigned_officer_id FROM applications LIMIT 1");
        const targetOfficer = db.queryOne("SELECT id, full_name FROM users WHERE role_code = 'REGIONAL_OFFICER' AND id != ? LIMIT 1", [testApp.assigned_officer_id || 'NONE']);
        
        assert.ok(targetOfficer, 'Target officer should exist');

        const justification = 'Reassigned to senior regional specialist due to complex land litigation dispute.';
        const result = aphRoutingService.manualReassign({
            applicationId: testApp.id,
            toOfficerId: targetOfficer.id,
            mandatoryReason: justification,
            user: adminUser
        });

        assert.ok(result.success);
        assert.equal(result.toOfficerId, targetOfficer.id);

        // Verify application updated in DB
        const updatedApp = db.queryOne('SELECT assigned_officer_id FROM applications WHERE id = ?', [testApp.id]);
        assert.equal(updatedApp.assigned_officer_id, targetOfficer.id);

        // Verify history contains justification
        const history = aphRoutingService.getRoutingHistory(testApp.id);
        assert.ok(history[0].reassignment_reason.includes('dispute'));
    });

    it('5. Phase 2 Pendency Drill-Down retrieves actual database records filtered by metric', () => {
        // Query ALL applications drill-down
        const allDrill = pendencyService.getDrillDownApplications({ metric: 'ALL', limit: 10 });
        assert.ok(allDrill.total > 0, 'Should find applications');
        assert.ok(Array.isArray(allDrill.applications));
        assert.ok(allDrill.applications[0].institution_name, 'Should join institution details');
        assert.ok(allDrill.applications[0].classification, 'Should include SLA classification');

        // Query PENDING metric
        const pendingDrill = pendencyService.getDrillDownApplications({ metric: 'PENDING' });
        assert.ok(pendingDrill.applications.every(a => a.current_stage !== 'APPROVED' && a.current_stage !== 'REJECTED'));

        // Query with search filter
        const firstApp = allDrill.applications[0];
        const searchResult = pendencyService.getDrillDownApplications({ search: firstApp.application_no });
        assert.ok(searchResult.total >= 1);
        assert.equal(searchResult.applications[0].application_no, firstApp.application_no);
    });

    it('6. Phase 2 Pendency Drill-Down filters by Region accurately', () => {
        const regionalDrill = pendencyService.getDrillDownApplications({ regionId: 'REG_NORTH' });
        assert.ok(regionalDrill.applications.every(a => a.assigned_region_id === 'REG_NORTH'));
    });
});
