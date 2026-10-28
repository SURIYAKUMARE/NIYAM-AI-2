module.exports = {
    PORT: process.env.PORT || 8080,
    JWT_SECRET: process.env.JWT_SECRET || 'niyam-ai-secure-national-regulatory-token-2026',
    PRODUCT_NAME: 'NIYAM AI',
    FULL_TITLE: 'All India Council for Technical Education',
    HINDI_TITLE: 'अखिल भारतीय तकनीकी शिक्षा परिषद',
    SUBTITLE: 'Approval & Compliance Management System',
    PROBLEM_STATEMENT_ID: '26262',
    
    // 10 Government Enterprise Roles
    ROLES: {
        SUPER_ADMIN: 'SUPER_ADMIN',                         // 1. Super Administrator
        REGULATION_BUREAU_ADMIN: 'REGULATION_BUREAU_ADMIN', // 2. AICTE Bureau Officer
        REGIONAL_OFFICER: 'REGIONAL_OFFICER',               // 3. Regional Officer
        SCRUTINY_MEMBER: 'SCRUTINY_MEMBER',                 // 4. Scrutiny Committee Member
        EVC_COORDINATOR: 'EVC_COORDINATOR',                 // 5. EVC Coordinator
        EVC_MEMBER: 'EVC_MEMBER',                           // 6. EVC Committee Member
        SAC_SHC_MEMBER: 'SAC_SHC_MEMBER',                   // 7. SAC/SHC Authorised Member
        INSTITUTION_REP: 'INSTITUTION_REP',                 // 8. Institution Administrator
        COMPLIANCE_OFFICER: 'COMPLIANCE_OFFICER',           // 9. Compliance Verification Officer
        AUDITOR: 'AUDITOR',                                 // 10. Authorised Auditor
        COMPETENT_AUTHORITY: 'COMPETENT_AUTHORITY'          // Statutory Council Sanction Authority
    },

    // Workflow Stages
    STAGES: {
        SUBMITTED: 'SUBMITTED',
        SCRUTINY: 'SCRUTINY',
        RE_SCRUTINY: 'RE_SCRUTINY',
        EVC: 'EVC',
        SAC_SHC: 'SAC_SHC',
        COMPETENT_DECISION: 'COMPETENT_DECISION',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED'
    },

    // Application Statuses
    STATUSES: {
        DRAFT: 'DRAFT',
        SUBMITTED: 'SUBMITTED',
        UNDER_SCRUTINY: 'UNDER_SCRUTINY',
        DEFICIENCY_RAISED: 'DEFICIENCY_RAISED',
        RESPONSES_SUBMITTED: 'RESPONSES_SUBMITTED',
        AWAITING_EVC: 'AWAITING_EVC',
        EVC_SCHEDULED: 'EVC_SCHEDULED',
        EVC_COMPLETED: 'EVC_COMPLETED',
        SAC_REVIEW: 'SAC_REVIEW',
        DECISION_PENDING: 'DECISION_PENDING',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED',
        ON_HOLD: 'ON_HOLD'
    },

    // Undertaking Lifecycle Statuses
    UNDERTAKING_STATUS: {
        PENDING: 'PENDING',
        UPCOMING: 'UPCOMING',
        SUBMITTED: 'SUBMITTED',
        UNDER_VERIFICATION: 'UNDER_VERIFICATION',
        DEFICIENCY_RAISED: 'DEFICIENCY_RAISED',
        RESUBMISSION_REQUIRED: 'RESUBMISSION_REQUIRED',
        VERIFIED: 'VERIFIED',
        OVERDUE: 'OVERDUE',
        CLOSED: 'CLOSED'
    },

    // Document Validity Statuses
    DOC_STATUS: {
        VALID: 'VALID',
        EXPIRING_SOON: 'EXPIRING_SOON',
        EXPIRED: 'EXPIRED',
        RENEWAL_SUBMITTED: 'RENEWAL_SUBMITTED',
        UNDER_VERIFICATION: 'UNDER_VERIFICATION',
        REJECTED: 'REJECTED'
    },

    // Advance Reminder Intervals (in days)
    EXPIRY_ALERT_INTERVALS: [90, 60, 30, 15, 7],

    // SLA Days per Stage
    DEFAULT_STAGE_SLA_DAYS: {
        SCRUTINY: 7,
        RE_SCRUTINY: 5,
        EVC: 14,
        SAC_SHC: 10,
        COMPETENT_DECISION: 7
    },

    // Exact NIYAM AI Government Enterprise Color Palette
    UI_THEME: {
        PRIMARY_NAVY: '#12304A',
        GOVERNMENT_BLUE: '#1D4F7A',
        DEEP_TEAL: '#176B70',
        MAIN_BG: '#F5F7FA',
        SURFACE_WHITE: '#FFFFFF',
        SIDEBAR: '#17334C',
        MAIN_TEXT: '#243446',
        SECONDARY_TEXT: '#687889',
        BORDER: '#DFE5EB',
        SUCCESS: '#237A57',
        WARNING: '#B7791F',
        CRITICAL: '#B83A42',
        INFORMATION: '#356DA8'
    }
};
