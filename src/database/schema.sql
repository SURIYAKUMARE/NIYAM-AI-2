-- ============================================================================
-- AICTE SMART APPROVAL & COMPLIANCE MANAGEMENT SYSTEM (Problem Statement ID: 26262)
-- Relational Database Schema (PostgreSQL & SQLite compatible ANSI SQL DDL)
-- ============================================================================

-- 1. Regions
CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    headquarter TEXT NOT NULL,
    states_covered TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles
CREATE TABLE IF NOT EXISTS roles (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    permissions_json TEXT NOT NULL
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role_code TEXT NOT NULL REFERENCES roles(code),
    region_id TEXT REFERENCES regions(id),
    institution_id TEXT,
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Institutions
CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    permanent_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    region_id TEXT NOT NULL REFERENCES regions(id),
    institution_type TEXT NOT NULL, -- Government, Private-Unaided, Deemed, Central
    category TEXT NOT NULL, -- Engineering & Tech, Management, Pharmacy, Architecture
    establishment_year INTEGER NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    representative_user_id TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
    year_code TEXT PRIMARY KEY, -- e.g., '2026-2027'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current INTEGER DEFAULT 0,
    aph_version TEXT NOT NULL -- Approval Process Handbook version e.g., 'APH-2026-v1.0'
);

-- 6. Application Types
CREATE TABLE IF NOT EXISTS application_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- New Institution, Extension of Approval (EoA), Increase in Intake, New Course
    description TEXT NOT NULL,
    default_workflow_code TEXT NOT NULL
);

-- 7. Workflow Definitions
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL REFERENCES academic_years(year_code),
    status TEXT NOT NULL CHECK(status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    definition_json TEXT NOT NULL, -- JSON structure defining stages, transitions, SLA days
    created_by TEXT REFERENCES users(id),
    published_by TEXT REFERENCES users(id),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(code, version)
);

-- 8. Applications
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    application_no TEXT UNIQUE NOT NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id),
    application_type_code TEXT NOT NULL REFERENCES application_types(code),
    academic_year TEXT NOT NULL REFERENCES academic_years(year_code),
    current_stage TEXT NOT NULL, -- SUBMITTED, SCRUTINY, RE_SCRUTINY, EVC, SAC_SHC, COMPETENT_DECISION, APPROVED, REJECTED
    current_status TEXT NOT NULL, -- DRAFT, UNDER_SCRUTINY, DEFICIENCY_RAISED, AWAITING_EVC, EVC_SCHEDULED, SAC_REVIEW, DECISION_PENDING, APPROVED, REJECTED, ON_HOLD
    workflow_definition_id TEXT NOT NULL REFERENCES workflow_definitions(id),
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_due_date TIMESTAMP NOT NULL,
    stage_entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_officer_id TEXT REFERENCES users(id),
    assigned_region_id TEXT NOT NULL REFERENCES regions(id),
    deficiency_count INTEGER DEFAULT 0,
    is_on_hold INTEGER DEFAULT 0,
    hold_reason TEXT,
    hold_started_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Workflow Stages History
CREATE TABLE IF NOT EXISTS workflow_stages (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id),
    stage_name TEXT NOT NULL,
    stage_status TEXT NOT NULL, -- PENDING, IN_PROGRESS, COMPLETED, DEFICIENCY, REVERTED
    assigned_to_role TEXT NOT NULL,
    assigned_to_user_id TEXT REFERENCES users(id),
    entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    outcome TEXT,
    comments TEXT
);

-- 10. Stage Transitions (Immutable event log of all workflow hops)
CREATE TABLE IF NOT EXISTS stage_transitions (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id),
    from_stage TEXT NOT NULL,
    to_stage TEXT NOT NULL,
    actor_user_id TEXT NOT NULL REFERENCES users(id),
    actor_role TEXT NOT NULL,
    transition_type TEXT NOT NULL, -- FORWARD, REVERT, HOLD, RESUME, COMPLETE
    rule_version TEXT NOT NULL,
    comments TEXT,
    evidence_doc_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Scrutiny Reviews
CREATE TABLE IF NOT EXISTS scrutiny_reviews (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id),
    stage_name TEXT NOT NULL, -- SCRUTINY or RE_SCRUTINY
    scrutiny_officer_id TEXT NOT NULL REFERENCES users(id),
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    outcome TEXT NOT NULL, -- RECOMMENDED, DEFICIENT, REJECTED
    general_remarks TEXT,
    digital_signature_hash TEXT NOT NULL
);

-- 12. Deficiencies
CREATE TABLE IF NOT EXISTS deficiencies (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id),
    scrutiny_review_id TEXT REFERENCES scrutiny_reviews(id),
    stage_name TEXT NOT NULL,
    category TEXT NOT NULL, -- Land & Building, Faculty Cadre, Laboratory Equipment, Affidavit/Lease, Financial Reserve
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('MINOR', 'MAJOR', 'CRITICAL')),
    regulatory_reference TEXT NOT NULL, -- e.g., 'APH-2026 Cl. 4.2(b)'
    response_text TEXT,
    response_document_url TEXT,
    status TEXT NOT NULL CHECK(status IN ('RAISED', 'RESPONSES_SUBMITTED', 'VERIFIED_OK', 'DEFICIENT_PERSISTS')),
    raised_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by TEXT REFERENCES users(id)
);

-- 13. EVC Schedules (Expert Visit Committee)
CREATE TABLE IF NOT EXISTS evc_schedules (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id),
    coordinator_id TEXT NOT NULL REFERENCES users(id),
    proposed_date DATE NOT NULL,
    confirmed_date DATE,
    visit_status TEXT NOT NULL CHECK(visit_status IN ('AWAITING_SCHEDULING', 'SCHEDULED', 'INSPECTION_COMPLETED', 'REPORT_PENDING', 'REPORT_SUBMITTED', 'CANCELLED', 'RESCHEDULED')),
    conflict_check_passed INTEGER DEFAULT 1,
    visit_type TEXT NOT NULL, -- Physical Inspection, Surprise Inspection, Virtual Verification
    rescheduling_count INTEGER DEFAULT 0,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. EVC Committee Members
CREATE TABLE IF NOT EXISTS evc_members (
    id TEXT PRIMARY KEY,
    evc_schedule_id TEXT NOT NULL REFERENCES evc_schedules(id),
    expert_name TEXT NOT NULL,
    expert_designation TEXT NOT NULL,
    expert_institution TEXT NOT NULL,
    role_in_committee TEXT NOT NULL, -- Chairman, Member (Civil/Infrastructure), Member (Academic/Subject)
    conflict_declared INTEGER DEFAULT 0,
    attendance_status TEXT DEFAULT 'PENDING'
);

-- 15. EVC Reports
CREATE TABLE IF NOT EXISTS evc_reports (
    id TEXT PRIMARY KEY,
    evc_schedule_id TEXT NOT NULL REFERENCES evc_schedules(id),
    application_id TEXT NOT NULL REFERENCES applications(id),
    inspection_date DATE NOT NULL,
    infrastructure_score NUMERIC(5,2) NOT NULL, -- 0 to 100
    faculty_score NUMERIC(5,2) NOT NULL,
    compliance_score NUMERIC(5,2) NOT NULL,
    overall_recommendation TEXT NOT NULL CHECK(overall_recommendation IN ('RECOMMENDED_FULL', 'RECOMMENDED_CONDITIONAL', 'NOT_RECOMMENDED')),
    deficiency_notes TEXT,
    submitted_by_officer_id TEXT NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    digital_sign_hash TEXT NOT NULL
);

-- 16. SAC/SHC Proceedings (Standing Appellate / Hearing Committee)
CREATE TABLE IF NOT EXISTS sac_shc_proceedings (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id),
    meeting_date DATE NOT NULL,
    committee_type TEXT NOT NULL CHECK(committee_type IN ('SAC', 'SHC')),
    hearing_conducted INTEGER DEFAULT 1,
    representative_present TEXT,
    observations TEXT NOT NULL,
    recommendation TEXT NOT NULL CHECK(recommendation IN ('GRANT_APPROVAL', 'REJECT_APPEAL', 'REMAND_TO_EVC')),
    decision_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT NOT NULL REFERENCES users(id)
);

-- 17. Statutory Decisions
CREATE TABLE IF NOT EXISTS statutory_decisions (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id),
    competent_authority_id TEXT NOT NULL REFERENCES users(id),
    decision_type TEXT NOT NULL CHECK(decision_type IN ('APPROVED', 'REJECTED', 'CONDITIONAL_APPROVAL')),
    order_number TEXT UNIQUE NOT NULL,
    decision_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    effective_academic_year TEXT NOT NULL,
    statutory_rationale TEXT NOT NULL,
    appeal_deadline DATE,
    digital_signature TEXT NOT NULL
);

-- 18. Institutional Undertakings Register
CREATE TABLE IF NOT EXISTS undertakings (
    id TEXT PRIMARY KEY,
    undertaking_ref TEXT UNIQUE NOT NULL, -- e.g., 'UTK-2026-0042'
    institution_id TEXT NOT NULL REFERENCES institutions(id),
    application_id TEXT REFERENCES applications(id),
    condition_title TEXT NOT NULL,
    regulatory_source TEXT NOT NULL, -- e.g., 'APH 2026 Annexure 8'
    obligation_details TEXT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    responsible_person TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('PENDING', 'UPCOMING', 'SUBMITTED', 'UNDER_VERIFICATION', 'DEFICIENCY_RAISED', 'RESUBMISSION_REQUIRED', 'VERIFIED', 'OVERDUE', 'CLOSED')),
    verification_authority_role TEXT NOT NULL DEFAULT 'COMPLIANCE_OFFICER',
    verified_by TEXT REFERENCES users(id),
    verified_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. Compliance Submissions (Distinguishes submission from verification!)
CREATE TABLE IF NOT EXISTS compliance_submissions (
    id TEXT PRIMARY KEY,
    undertaking_id TEXT NOT NULL REFERENCES undertakings(id),
    institution_id TEXT NOT NULL REFERENCES institutions(id),
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evidence_title TEXT NOT NULL,
    document_url TEXT NOT NULL,
    remarks TEXT,
    status TEXT NOT NULL CHECK(status IN ('SUBMITTED', 'ACCEPTED', 'REJECTED_DEFICIENT')),
    reviewed_by TEXT REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_remarks TEXT
);

-- 20. Document Types
CREATE TABLE IF NOT EXISTS document_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    validity_period_months INTEGER DEFAULT 0, -- 0 means perpetual, e.g., 36 for 3-yr lease
    is_mandatory INTEGER DEFAULT 1,
    requires_renewal INTEGER DEFAULT 0
);

-- 21. Documents & Lease Register
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id),
    application_id TEXT REFERENCES applications(id),
    document_type_code TEXT NOT NULL REFERENCES document_types(code),
    document_title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE, -- NULL for perpetual documents
    current_status TEXT NOT NULL CHECK(current_status IN ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'RENEWAL_SUBMITTED', 'UNDER_VERIFICATION', 'REJECTED')),
    advance_alert_sent INTEGER DEFAULT 0,
    verified_by TEXT REFERENCES users(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. Document Renewals
CREATE TABLE IF NOT EXISTS document_renewals (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id),
    institution_id TEXT NOT NULL REFERENCES institutions(id),
    renewal_application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    new_issue_date DATE NOT NULL,
    new_expiry_date DATE NOT NULL,
    uploaded_file_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DEFICIENT')),
    officer_comments TEXT,
    processed_at TIMESTAMP,
    processed_by TEXT REFERENCES users(id)
);

-- 23. Notifications & Escalation Dispatch Register
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_user_id TEXT REFERENCES users(id),
    recipient_role TEXT NOT NULL,
    institution_id TEXT REFERENCES institutions(id),
    event_type TEXT NOT NULL, -- APPLICATION_RECEIVED, DEFICIENCY_RAISED, EVC_SCHEDULED, UNDERTAKING_OVERDUE, LEASE_EXPIRING, ESCALATION_TRIGGERED, etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'IN_APP', -- IN_APP, EMAIL, SMS, DIGEST
    status TEXT NOT NULL CHECK(status IN ('PENDING', 'SENT', 'FAILED', 'READ')),
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    error_log TEXT
);

-- 24. Escalation Rules
CREATE TABLE IF NOT EXISTS escalation_rules (
    id TEXT PRIMARY KEY,
    rule_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    stage_name TEXT,
    days_overdue_threshold INTEGER NOT NULL,
    region_id TEXT REFERENCES regions(id),
    escalate_to_role TEXT NOT NULL, -- e.g., 'REGIONAL_OFFICER', 'REGULATION_BUREAU_ADMIN'
    escalation_level INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1
);

-- 25. Escalation Events
CREATE TABLE IF NOT EXISTS escalation_events (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id),
    escalation_rule_id TEXT NOT NULL REFERENCES escalation_rules(id),
    trigger_reason TEXT NOT NULL,
    escalated_to_role TEXT NOT NULL,
    escalated_to_user_id TEXT REFERENCES users(id),
    status TEXT NOT NULL CHECK(status IN ('TRIGGERED', 'ACKNOWLEDGED', 'REASSIGNED', 'RESOLVED', 'CLOSED')),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT
);

-- 26. Regulatory Rule Sets (Version-controlled APH rules)
CREATE TABLE IF NOT EXISTS regulatory_rule_sets (
    id TEXT PRIMARY KEY,
    academic_year TEXT NOT NULL,
    aph_version TEXT NOT NULL,
    rule_key TEXT NOT NULL,
    category TEXT NOT NULL,
    institution_type TEXT NOT NULL,
    rule_content_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_by TEXT REFERENCES users(id),
    published_by TEXT REFERENCES users(id),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(academic_year, aph_version, rule_key)
);

-- 27. Tamper-Evident Chained Cryptographic Audit Trail (SHA-256)
CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_uuid TEXT UNIQUE NOT NULL,
    actor_user_id TEXT NOT NULL,
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action_type TEXT NOT NULL, -- CREATE, UPDATE, TRANSITION, VERIFY, ESCALATE, REVERT, PUBLISH_RULE
    entity_name TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    previous_state_json TEXT,
    new_state_json TEXT,
    justification TEXT NOT NULL,
    workflow_rule_version TEXT NOT NULL,
    correlation_id TEXT,
    client_ip TEXT,
    prev_hash TEXT NOT NULL, -- SHA-256 of preceding audit record
    current_hash TEXT NOT NULL, -- SHA-256(prev_hash + event_uuid + actor + action + entity + states + timestamp)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for maximum query efficiency and fast dashboard aggregations
CREATE INDEX IF NOT EXISTS idx_apps_region ON applications(assigned_region_id);
CREATE INDEX IF NOT EXISTS idx_apps_stage ON applications(current_stage);
CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(current_status);
CREATE INDEX IF NOT EXISTS idx_apps_due ON applications(processing_due_date);
CREATE INDEX IF NOT EXISTS idx_apps_institution ON applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_app ON deficiencies(application_id);
CREATE INDEX IF NOT EXISTS idx_evc_app ON evc_schedules(application_id);
CREATE INDEX IF NOT EXISTS idx_utk_inst ON undertakings(institution_id);
CREATE INDEX IF NOT EXISTS idx_utk_status ON undertakings(status);
CREATE INDEX IF NOT EXISTS idx_docs_inst ON documents(institution_id);
CREATE INDEX IF NOT EXISTS idx_docs_expiry ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifs_role ON notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_audit_chain ON audit_events(id, prev_hash, current_hash);
