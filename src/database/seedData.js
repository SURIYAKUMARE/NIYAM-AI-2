const db = require('./db');
const cryptoService = require('../services/cryptoService');
const regulatoryRulesService = require('../services/regulatoryRulesService');
const auditService = require('../services/auditService');

function seedDatabase() {
    console.log('[Seed] Beginning synthetic data population for AICTE Platform...');

    // 1. Roles & Permissions
    const roles = [
        { code: 'SUPER_ADMIN', name: 'Super Administrator', description: 'System configuration and account management' },
        { code: 'REGULATION_BUREAU_ADMIN', name: 'Regulation Bureau Administrator', description: 'APH regulatory policy, rules and master workflows' },
        { code: 'REGIONAL_OFFICER', name: 'Regional Officer', description: 'Regional jurisdiction oversight and case assignments' },
        { code: 'SCRUTINY_MEMBER', name: 'Scrutiny Committee Member', description: 'Document scrutiny and deficiency assessment' },
        { code: 'EVC_COORDINATOR', name: 'EVC Coordinator', description: 'Expert Visit Committee scheduling and tracking' },
        { code: 'EVC_MEMBER', name: 'EVC Committee Member', description: 'Physical inspection and verification findings' },
        { code: 'SAC_SHC_MEMBER', name: 'SAC/SHC Member', description: 'Appellate and hearing review proceedings' },
        { code: 'INSTITUTION_REP', name: 'Institution Representative', description: 'Self-service portal for technical institutions' },
        { code: 'COMPLIANCE_OFFICER', name: 'Compliance Officer', description: 'Undertaking compliance and lease validity verification' },
        { code: 'COMPETENT_AUTHORITY', name: 'Competent Authority', description: 'Statutory decision and sanctioning authority' },
        { code: 'AUDITOR', name: 'Statutory Auditor', description: 'Read-only audit trail and integrity monitoring' }
    ];

    for (const r of roles) {
        db.execute(`
            INSERT OR IGNORE INTO roles (code, name, description, permissions_json)
            VALUES (?, ?, ?, ?)
        `, [r.code, r.name, r.description, JSON.stringify(['ALL'])]);
    }

    // 2. Regions
    const regions = [
        { id: 'REG_NORTH', code: 'RO-NORTH', name: 'Northern Regional Office', headquarter: 'Kanpur', states: 'Uttar Pradesh, Uttarakhand' },
        { id: 'REG_SOUTH', code: 'RO-SOUTH', name: 'Southern Regional Office', headquarter: 'Chennai', states: 'Tamil Nadu, Puducherry' },
        { id: 'REG_WEST', code: 'RO-WEST', name: 'Western Regional Office', headquarter: 'Mumbai', states: 'Maharashtra, Goa' },
        { id: 'REG_EAST', code: 'RO-EAST', name: 'Eastern Regional Office', headquarter: 'Kolkata', states: 'West Bengal, Odisha, Bihar, Jharkhand' },
        { id: 'REG_NW', code: 'RO-NW', name: 'North-Western Regional Office', headquarter: 'Chandigarh', states: 'Punjab, Haryana, Delhi, Himachal, J&K' },
        { id: 'REG_SC', code: 'RO-SC', name: 'South-Central Regional Office', headquarter: 'Hyderabad', states: 'Telangana, Andhra Pradesh' },
        { id: 'REG_CENTRAL', code: 'RO-CENTRAL', name: 'Central Regional Office', headquarter: 'Bhopal', states: 'Madhya Pradesh, Chhattisgarh' },
        { id: 'REG_SW', code: 'RO-SW', name: 'South-Western Regional Office', headquarter: 'Bengaluru', states: 'Karnataka, Kerala' }
    ];

    for (const reg of regions) {
        db.execute(`
            INSERT OR IGNORE INTO regions (id, code, name, headquarter, states_covered)
            VALUES (?, ?, ?, ?, ?)
        `, [reg.id, reg.code, reg.name, reg.headquarter, reg.states]);
    }

    // 3. Academic Years
    const academicYears = [
        { year_code: '2026-2027', start_date: '2026-04-01', end_date: '2027-03-31', is_current: 1, aph_version: 'APH-2026-v1.0' },
        { year_code: '2025-2026', start_date: '2025-04-01', end_date: '2026-03-31', is_current: 0, aph_version: 'APH-2025-v2.0' }
    ];

    for (const ay of academicYears) {
        db.execute(`
            INSERT OR IGNORE INTO academic_years (year_code, start_date, end_date, is_current, aph_version)
            VALUES (?, ?, ?, ?, ?)
        `, [ay.year_code, ay.start_date, ay.end_date, ay.is_current, ay.aph_version]);
    }

    // 4. Application Types
    const appTypes = [
        { code: 'NEW_INST', name: 'Setting Up New Technical Institution', category: 'New Institution', description: 'Approval for newly established institution under Section 10(k)', default_workflow_code: 'WF_STANDARD_NEW_INST' },
        { code: 'EOA', name: 'Extension of Approval (EoA)', category: 'Existing Institution', description: 'Annual EoA for running technical institutions', default_workflow_code: 'WF_EOA_EXTENSION' },
        { code: 'INC_INTAKE', name: 'Increase in Intake / Additional Course', category: 'Existing Institution', description: 'Expansion of existing approved capacity', default_workflow_code: 'WF_STANDARD_NEW_INST' },
        { code: 'CLOSURE', name: 'Closure of Institution / Course', category: 'Existing Institution', description: 'Progressive or complete closure', default_workflow_code: 'WF_STANDARD_NEW_INST' }
    ];

    for (const at of appTypes) {
        db.execute(`
            INSERT OR IGNORE INTO application_types (code, name, category, description, default_workflow_code)
            VALUES (?, ?, ?, ?, ?)
        `, [at.code, at.name, at.category, at.description, at.default_workflow_code]);
    }

    // 5. Document Types
    const docTypes = [
        { code: 'LAND_LEASE', name: 'Registered Land Lease Deed (>30 Years)', validity_period_months: 360, is_mandatory: 1, requires_renewal: 1 },
        { code: 'BUILDING_PLAN', name: 'Approved Building Plan from Municipal Authority', validity_period_months: 0, is_mandatory: 1, requires_renewal: 0 },
        { code: 'FIRE_SAFETY_NOC', name: 'Fire Safety Certificate / NOC', validity_period_months: 12, is_mandatory: 1, requires_renewal: 1 },
        { code: 'OCCUPANCY_CERT', name: 'Occupancy / Completion Certificate', validity_period_months: 0, is_mandatory: 1, requires_renewal: 0 },
        { code: 'CORPUS_FDR', name: 'Joint Corpus Fixed Deposit Receipt', validity_period_months: 60, is_mandatory: 1, requires_renewal: 1 },
        { code: 'AFFIDAVIT_01', name: 'Affidavit for Non-Capitation Fee & Anti-Ragging', validity_period_months: 12, is_mandatory: 1, requires_renewal: 1 }
    ];

    for (const dt of docTypes) {
        db.execute(`
            INSERT OR IGNORE INTO document_types (code, name, validity_period_months, is_mandatory, requires_renewal)
            VALUES (?, ?, ?, ?, ?)
        `, [dt.code, dt.name, dt.validity_period_months, dt.is_mandatory, dt.requires_renewal]);
    }

    // 6. Users (with salted Scrypt passwords)
    const defaultPasswordHash = cryptoService.hashPassword('Password@123');

    const users = [
        { id: 'USR_ADMIN_01', username: 'superadmin', email: 'admin@aicte-india.org', full_name: 'Dr. R. K. Shrivastava', role_code: 'SUPER_ADMIN', region_id: 'REG_NW', institution_id: null },
        { id: 'USR_BUREAU_01', username: 'bureauadmin', email: 'bureau.head@aicte-india.org', full_name: 'Prof. Anil Sahasrabudhe', role_code: 'REGULATION_BUREAU_ADMIN', region_id: 'REG_NW', institution_id: null },
        { id: 'USR_RO_NORTH', username: 'ro_northern', email: 'ro.kanpur@aicte-india.org', full_name: 'Er. Manoj Verma', role_code: 'REGIONAL_OFFICER', region_id: 'REG_NORTH', institution_id: null },
        { id: 'USR_RO_SOUTH', username: 'ro_southern', email: 'ro.chennai@aicte-india.org', full_name: 'Dr. K. Swaminathan', role_code: 'REGIONAL_OFFICER', region_id: 'REG_SOUTH', institution_id: null },
        { id: 'USR_RO_WEST', username: 'ro_western', email: 'ro.mumbai@aicte-india.org', full_name: 'Dr. Sunita Deshmukh', role_code: 'REGIONAL_OFFICER', region_id: 'REG_WEST', institution_id: null },
        { id: 'USR_SCRUTINY_01', username: 'scrutiny_expert1', email: 'scrutiny1@aicte-panel.org', full_name: 'Dr. Vandana Rao (Scrutiny Chair)', role_code: 'SCRUTINY_MEMBER', region_id: 'REG_NORTH', institution_id: null },
        { id: 'USR_EVC_COORD_01', username: 'evc_coord1', email: 'evc.coord@aicte-india.org', full_name: 'Shri Vikramaditya Rathore', role_code: 'EVC_COORDINATOR', region_id: 'REG_NORTH', institution_id: null },
        { id: 'USR_EVC_EXPERT_01', username: 'evc_expert1', email: 'evc.expert@iitk.ac.in', full_name: 'Prof. Devendra Pathak (IIT Kanpur)', role_code: 'EVC_MEMBER', region_id: 'REG_NORTH', institution_id: null },
        { id: 'USR_SAC_01', username: 'sac_member1', email: 'sac.chair@aicte-appellate.org', full_name: 'Justice (Retd.) B. S. Chauhan', role_code: 'SAC_SHC_MEMBER', region_id: 'REG_NW', institution_id: null },
        { id: 'USR_COMPLIANCE_01', username: 'compliance_officer1', email: 'compliance@aicte-india.org', full_name: 'Smt. Priya Sundaram', role_code: 'COMPLIANCE_OFFICER', region_id: 'REG_NORTH', institution_id: null },
        { id: 'USR_COMPETENT_01', username: 'competent_auth1', email: 'chairman@aicte-india.org', full_name: 'Prof. T. G. Sitharam (Chairman AICTE)', role_code: 'COMPETENT_AUTHORITY', region_id: 'REG_NW', institution_id: null },
        { id: 'USR_AUDITOR_01', username: 'auditor1', email: 'cag.audit@gov.in', full_name: 'Shri Rajeshwar Rao (Audit Director)', role_code: 'AUDITOR', region_id: 'REG_NW', institution_id: null },
        // Institution Representatives
        { id: 'USR_REP_01', username: 'inst_apex', email: 'registrar@apextech.edu.in', full_name: 'Dr. Suresh Chandra (Registrar)', role_code: 'INSTITUTION_REP', region_id: 'REG_NORTH', institution_id: 'INST_001' },
        { id: 'USR_REP_02', username: 'inst_southern', email: 'dean@southernengg.edu.in', full_name: 'Dr. Meenakshi Sundaram (Dean)', role_code: 'INSTITUTION_REP', region_id: 'REG_SOUTH', institution_id: 'INST_002' }
    ];

    for (const u of users) {
        db.execute(`
            INSERT OR IGNORE INTO users (id, username, email, full_name, password_hash, role_code, region_id, institution_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [u.id, u.username, u.email, u.full_name, defaultPasswordHash, u.role_code, u.region_id, u.institution_id]);
    }

    // 7. Institutions
    const institutions = [
        { id: 'INST_001', permanent_id: '1-4298101', name: 'Apex Institute of Technology & Management', address: 'Plot 14, Knowledge Park III, Greater Noida', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', region_id: 'REG_NORTH', type: 'Private-Unaided', category: 'Engineering & Tech', year: 2008, email: 'registrar@apextech.edu.in', phone: '0120-2345678', rep_id: 'USR_REP_01' },
        { id: 'INST_002', permanent_id: '1-5120392', name: 'Southern National College of Engineering', address: 'Old Mahabalipuram Road, Navalur', state: 'Tamil Nadu', district: 'Chengalpattu', region_id: 'REG_SOUTH', type: 'Private-Unaided', category: 'Engineering & Tech', year: 2012, email: 'dean@southernengg.edu.in', phone: '044-24567890', rep_id: 'USR_REP_02' },
        { id: 'INST_003', permanent_id: '1-6981123', name: 'Western Institute of Pharmaceutical Sciences', address: 'Survey No. 45, Paud Road, Kothrud', state: 'Maharashtra', district: 'Pune', region_id: 'REG_WEST', type: 'Deemed', category: 'Pharmacy', year: 2015, email: 'contact@westernpharma.edu', phone: '020-25439811', rep_id: null },
        { id: 'INST_004', permanent_id: '1-8012499', name: 'Heritage Academy of Architecture & Urban Design', address: 'Salt Lake Sector V, Bidhannagar', state: 'West Bengal', district: 'North 24 Parganas', region_id: 'REG_EAST', type: 'Government', category: 'Architecture', year: 2004, email: 'principal@heritagearch.edu', phone: '033-23579012', rep_id: null },
        { id: 'INST_005', permanent_id: '1-9321456', name: 'Central Malwa Institute of Management Studies', address: 'Indore-Ujjain Highway, Sanwer Road', state: 'Madhya Pradesh', district: 'Indore', region_id: 'REG_CENTRAL', type: 'Private-Unaided', category: 'Management', year: 2018, email: 'admissions@malwamgmt.ac.in', phone: '0731-2987654', rep_id: null }
    ];

    for (const inst of institutions) {
        db.execute(`
            INSERT OR IGNORE INTO institutions (id, permanent_id, name, address, state, district, region_id, institution_type, category, establishment_year, contact_email, contact_phone, representative_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [inst.id, inst.permanent_id, inst.name, inst.address, inst.state, inst.district, inst.region_id, inst.type, inst.category, inst.year, inst.email, inst.phone, inst.rep_id]);
    }

    // 8. Workflow Definitions
    const defaultWfs = regulatoryRulesService.getDefaultWorkflowDefinitions();
    for (const wf of defaultWfs) {
        db.execute(`
            INSERT OR IGNORE INTO workflow_definitions (id, code, version, name, academic_year, status, definition_json, published_at)
            VALUES (?, ?, ?, ?, '2026-2027', 'PUBLISHED', ?, CURRENT_TIMESTAMP)
        `, [`WF_DEF_${wf.code}`, wf.code, wf.version, wf.name, JSON.stringify(wf)]);
    }

    // 9. Applications (Seeded across stages for all demonstration scenarios)
    const apps = [
        // Scenario 1: Ready for Scrutiny clearance
        {
            id: 'APP_2026_001',
            application_no: 'AICTE-2026-10041',
            inst_id: 'INST_001',
            type: 'NEW_INST',
            stage: 'SCRUTINY',
            status: 'UNDER_SCRUTINY',
            wf_id: 'WF_DEF_WF_STANDARD_NEW_INST',
            officer_id: 'USR_RO_NORTH',
            region_id: 'REG_NORTH',
            due_days: 4, // Approaching deadline
            entry_days_ago: 3
        },
        // Scenario 2: Re-Scrutiny case with active deficiency
        {
            id: 'APP_2026_002',
            application_no: 'AICTE-2026-10042',
            inst_id: 'INST_002',
            type: 'INC_INTAKE',
            stage: 'RE_SCRUTINY',
            status: 'DEFICIENCY_RAISED',
            wf_id: 'WF_DEF_WF_STANDARD_NEW_INST',
            officer_id: 'USR_RO_SOUTH',
            region_id: 'REG_SOUTH',
            due_days: 3,
            entry_days_ago: 5
        },
        // Scenario 3: EVC required & awaiting scheduling
        {
            id: 'APP_2026_003',
            application_no: 'AICTE-2026-10043',
            inst_id: 'INST_003',
            type: 'NEW_INST',
            stage: 'EVC',
            status: 'AWAITING_EVC',
            wf_id: 'WF_DEF_WF_STANDARD_NEW_INST',
            officer_id: 'USR_RO_WEST',
            region_id: 'REG_WEST',
            due_days: 10,
            entry_days_ago: 4
        },
        // Scenario 4 & 7: Overdue Application (breaching SLA by 6 days -> Escalated!)
        {
            id: 'APP_2026_004',
            application_no: 'AICTE-2026-10044',
            inst_id: 'INST_004',
            type: 'EOA',
            stage: 'SCRUTINY',
            status: 'UNDER_SCRUTINY',
            wf_id: 'WF_DEF_WF_EOA_EXTENSION',
            officer_id: 'USR_RO_NORTH',
            region_id: 'REG_EAST',
            due_days: -6, // OVERDUE by 6 days!
            entry_days_ago: 18
        },
        // Case at Competent Authority decision pending
        {
            id: 'APP_2026_005',
            application_no: 'AICTE-2026-10045',
            inst_id: 'INST_005',
            type: 'NEW_INST',
            stage: 'COMPETENT_DECISION',
            status: 'DECISION_PENDING',
            wf_id: 'WF_DEF_WF_STANDARD_NEW_INST',
            officer_id: 'USR_COMPETENT_01',
            region_id: 'REG_CENTRAL',
            due_days: 5,
            entry_days_ago: 2
        }
    ];

    for (const a of apps) {
        const subDate = new Date();
        subDate.setDate(subDate.getDate() - (a.entry_days_ago + 10));

        const stageEntry = new Date();
        stageEntry.setDate(stageEntry.getDate() - a.entry_days_ago);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + a.due_days);

        db.execute(`
            INSERT OR IGNORE INTO applications (
                id, application_no, institution_id, application_type_code, academic_year,
                current_stage, current_status, workflow_definition_id, submission_date,
                processing_due_date, stage_entry_time, assigned_officer_id, assigned_region_id
            ) VALUES (?, ?, ?, ?, '2026-2027', ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            a.id, a.application_no, a.inst_id, a.type, a.stage, a.status,
            a.wf_id, subDate.toISOString(), dueDate.toISOString(),
            stageEntry.toISOString(), a.officer_id, a.region_id
        ]);

        // Insert corresponding workflow stage entry
        db.execute(`
            INSERT OR IGNORE INTO workflow_stages (
                id, application_id, stage_name, stage_status, assigned_to_role,
                entered_at, due_at
            ) VALUES (?, ?, ?, 'IN_PROGRESS', 'OFFICER', ?, ?)
        `, [`STG_${a.id}`, a.id, a.stage, stageEntry.toISOString(), dueDate.toISOString()]);
    }

    // 10. Seed Deficiencies for Scenario 2
    db.execute(`
        INSERT OR IGNORE INTO deficiencies (
            id, application_id, stage_name, category, description, severity,
            regulatory_reference, status, raised_at
        ) VALUES (
            'DEF_001', 'APP_2026_002', 'SCRUTINY', 'Faculty Cadre',
            'Cadre ratio of Associate Professor to Assistant Professor in Computer Science is 1:8 instead of statutory 1:6 norm.',
            'MAJOR', 'APH-2026 Cl. 4.1(c)', 'RAISED', CURRENT_TIMESTAMP
        )
    `);

    // 11. Seed Time-Bound Undertaking for Scenario 5
    db.execute(`
        INSERT OR IGNORE INTO undertakings (
            id, undertaking_ref, institution_id, application_id, condition_title,
            regulatory_source, obligation_details, issue_date, due_date,
            responsible_person, status, verification_authority_role
        ) VALUES (
            'UTK_001', 'UTK-2026-0001', 'INST_001', 'APP_2026_001',
            'Completion of Advanced High-Voltage Engineering Lab',
            'APH-2026 Annexure 8, Conditional Approval Cl. 3.2',
            'Institution undertook to install 100kV Impulse Generator and obtain calibrated safety certificate within 60 days.',
            '2026-04-10', '2026-06-10', 'Dr. Suresh Chandra', 'PENDING', 'COMPLIANCE_OFFICER'
        )
    `);

    db.execute(`
        INSERT OR IGNORE INTO undertakings (
            id, undertaking_ref, institution_id, application_id, condition_title,
            regulatory_source, obligation_details, issue_date, due_date,
            responsible_person, status, verification_authority_role
        ) VALUES (
            'UTK_002', 'UTK-2026-0002', 'INST_002', 'APP_2026_002',
            'Building Completion Certificate Submission',
            'APH-2026 Annexure 8, Cl. 4.2',
            'Submission of local municipal building safety completion certificate',
            '2026-04-12', '2026-07-12', 'Principal Zaskar College', 'PENDING', 'COMPLIANCE_OFFICER'
        )
    `);

    // 12. Seed Expiring Lease Document for Scenario 6
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 15); // Expiring in 15 days!

    db.execute(`
        INSERT OR IGNORE INTO documents (
            id, institution_id, application_id, document_type_code, document_title,
            file_url, file_size_bytes, mime_type, issue_date, expiry_date, current_status
        ) VALUES (
            'DOC_LEASE_001', 'INST_001', 'APP_2026_001', 'LAND_LEASE',
            'Registered Land Lease Deed - Greater Noida Campus',
            '/uploads/documents/lease_deed_plot14.pdf', 2450880, 'application/pdf',
            '1996-05-12', ?, 'EXPIRING_SOON'
        )
    `, [expiringDate.toISOString().split('T')[0]]);

    db.execute(`
        INSERT OR IGNORE INTO documents (
            id, institution_id, application_id, document_type_code, document_title,
            file_url, file_size_bytes, mime_type, issue_date, expiry_date, current_status
        ) VALUES (
            'DOC_LEASE_002', 'INST_002', 'APP_2026_002', 'LAND_LEASE',
            'Registered Land Lease Deed - Ladakh Campus',
            '/uploads/documents/zaskar_lease.pdf', 3145728, 'application/pdf',
            '1998-08-10', '2028-08-10', 'VALID'
        )
    `);

    // 13. Seed Escalation Rules and Events for Scenario 7
    db.execute(`
        INSERT OR IGNORE INTO escalation_rules (
            id, rule_name, event_type, days_overdue_threshold, escalate_to_role, escalation_level, is_active
        ) VALUES
        ('ESC_RULE_01', 'Stage SLA Overdue 3 Days', 'STAGE_OVERDUE', 3, 'REGIONAL_OFFICER', 1, 1),
        ('ESC_RULE_02', 'Critical Pendency Overdue 5 Days', 'STAGE_OVERDUE', 5, 'REGULATION_BUREAU_ADMIN', 2, 1)
    `);

    // Trigger escalation for APP_2026_004 (overdue by 6 days)
    db.execute(`
        INSERT OR IGNORE INTO escalation_events (
            id, application_id, escalation_rule_id, trigger_reason,
            escalated_to_role, status, triggered_at
        ) VALUES (
            'ESC_EV_001', 'APP_2026_004', 'ESC_RULE_02',
            'Application AICTE-2026-10044 has exceeded Scrutiny SLA by 6 days. Auto-escalated to Regulation Bureau Head.',
            'REGULATION_BUREAU_ADMIN', 'TRIGGERED', CURRENT_TIMESTAMP
        )
    `);

    // 14. Seed Genesis and Initial Cryptographic Audit Event for Scenario 8
    auditService.log({
        actorId: 'USR_ADMIN_01',
        actorUsername: 'superadmin',
        actorRole: 'SUPER_ADMIN',
        actionType: 'SYSTEM_GENESIS',
        entityName: 'system_core',
        entityId: 'AICTE_ROOT',
        justification: 'Initialised AICTE Digital Governance Platform with regulatory baseline APH-2026-v1.0'
    });

    console.log('[Seed] Database populated successfully with realistic synthetic data across all 10 demonstration scenarios!');
}

module.exports = seedDatabase;

if (require.main === module) {
    seedDatabase();
}
