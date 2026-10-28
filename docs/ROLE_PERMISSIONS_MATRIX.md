# ENTERPRISE ROLE & PERMISSIONS MATRIX
## AICTE Smart Approval & Compliance Management System

---

## 1. Role Definitions & Statutory Authority Scope

| Role Code | Role Name | Authority Scope & Constraints |
|---|---|---|
| `SUPER_ADMIN` | Super Administrator | Technical platform management, user provisioning, system integrations. **Cannot override statutory regulatory decisions unilaterally.** |
| `REGULATION_BUREAU_ADMIN` | Regulation Bureau Administrator | Master APH policy configurations, workflow publication, escalation review, national pendency oversight. |
| `REGIONAL_OFFICER` | Regional Officer | Oversight of assigned Regional jurisdiction. Assigns officers, reviews local pendency, triggers surprise EVCs. **Strictly isolated from other regions.** |
| `SCRUTINY_MEMBER` | Scrutiny Committee Member | Evaluates submitted documents, raises categorized deficiencies with APH citations, submits recommendations. |
| `EVC_COORDINATOR` | EVC Coordinator | Manages visit requests, performs conflict-of-interest checks, schedules inspections, monitors report submissions. |
| `EVC_MEMBER` | EVC Committee Member | Conducts physical inspections, assesses infrastructure/faculty/compliance scores, submits inspection reports. |
| `SAC_SHC_MEMBER` | SAC/SHC Member | Standing Appellate / Hearing Committee. Conducts appellate hearings for institutions aggrieved by scrutiny or EVC rejections. |
| `INSTITUTION_REP` | Institution Representative | Technical Institution portal: creates draft applications, submits evidence, uploads lease renewals, responds to deficiencies. **Strictly isolated from other institutions.** |
| `COMPLIANCE_OFFICER` | Compliance Officer | Verifies submitted evidence against conditional undertakings and verifies lease deed renewals. |
| `COMPETENT_AUTHORITY` | Competent Authority | AICTE Council / Chairman. Formally grants statutory Sanction Orders or Rejections with statutory rationales. |
| `AUDITOR` | Statutory Auditor | Read-only access to all case records, timelines, and cryptographic audit chains for CAG / CVC verification. |

---

## 2. API Endpoint Authorization Matrix

| Primary Module / Action | Permitted Roles | Regional Isolation Enforced |
|---|---|---|
| Submit Application | `INSTITUTION_REP` | Yes (Own Institution Only) |
| Advance Workflow Stage | `REGIONAL_OFFICER`, `SCRUTINY_MEMBER`, `EVC_COORDINATOR`, `SAC_SHC_MEMBER`, `COMPETENT_AUTHORITY` | Yes |
| Place Application on Hold | `SUPER_ADMIN`, `REGULATION_BUREAU_ADMIN`, `REGIONAL_OFFICER` | Yes |
| Raise Scrutiny Deficiency | `SCRUTINY_MEMBER`, `REGIONAL_OFFICER` | Yes |
| Respond to Deficiency | `INSTITUTION_REP` | Yes (Own Institution Only) |
| Finalize Scrutiny Review | `SCRUTINY_MEMBER` | Yes |
| Schedule EVC Visit | `EVC_COORDINATOR` | Yes |
| Submit EVC Report | `EVC_COORDINATOR`, `EVC_MEMBER` | Yes |
| Register Undertaking | `COMPLIANCE_OFFICER`, `REGULATION_BUREAU_ADMIN` | Yes |
| Verify Compliance Evidence| `COMPLIANCE_OFFICER` | Yes |
| Submit Lease Renewal | `INSTITUTION_REP` | Yes (Own Institution Only) |
| Approve Lease Renewal | `COMPLIANCE_OFFICER`, `REGIONAL_OFFICER` | Yes |
| Publish Regulatory Rules | `REGULATION_BUREAU_ADMIN`, `SUPER_ADMIN` | No (National Policy) |
| Verify Audit Integrity | `AUDITOR`, `SUPER_ADMIN`, `REGULATION_BUREAU_ADMIN` | No (System-wide) |
