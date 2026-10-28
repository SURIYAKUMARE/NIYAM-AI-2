# REST API DOCUMENTATION & OPENAPI CATALOG
## AICTE Smart Approval & Compliance Management System
**Base URL:** `http://localhost:8080/api` | **Specification:** OpenAPI 3.0 Compatible

---

## 1. Authentication & Identity
- `POST /api/auth/login` - Authenticates officer or institution representative. Returns signed JWT bearer token and user profile.
- `GET /api/auth/me` - Returns active session profile, role, region, and institution ID.
- `GET /api/auth/users` - Lists authorized users for simulation and role assignment.

## 2. Applications & Case Workspace
- `GET /api/applications` - Paginated list of applications with filters (`regionId`, `stage`, `status`, `academicYear`, `search`).
- `POST /api/applications` - Submits a new technical approval application.
- `GET /api/applications/:id` - Full case workspace with 8 tabs: Overview, Workflow, Documents, Scrutiny, EVC, Compliance, Communication, Cryptographic Audit History.
- `POST /api/applications/:id/transition` - Advances workflow stage with validation of preceding conditions and actor role.
- `POST /api/applications/:id/hold` - Applies or lifts administrative regulatory hold without erasing historical ageing.

## 3. Scrutiny Committee Workspace
- `GET /api/scrutiny/queue` - Queue of applications awaiting scrutiny document verification.
- `GET /api/scrutiny/:id/checklist` - Retrieves mandatory document checklist and past review observations.
- `POST /api/scrutiny/:id/deficiency` - Raises formal deficiency with APH clause citation and severity.
- `POST /api/scrutiny/deficiencies/:deficiencyId/response` - Institution submits compliance clarification and evidence.
- `POST /api/scrutiny/:id/review` - Finalizes scrutiny review (RECOMMENDED, DEFICIENT, REJECTED).

## 4. Expert Visit Committee (EVC)
- `GET /api/evc/dashboard` - Real-time EVC metrics: Required, Awaiting Scheduling, Scheduled, Completed, Overdue.
- `GET /api/evc/queue` - List of applications cleared for physical inspection.
- `POST /api/evc/check-conflict` - Automated conflict-of-interest check for prospective committee experts.
- `POST /api/evc/:id/schedule` - Schedules inspection visit and binds committee members.
- `POST /api/evc/:scheduleId/report` - Submits quantitative infrastructure/faculty/compliance scores and inspection findings.

## 5. Pendency Monitoring & Dashboards
- `GET /api/pendency/kpis` - 10 Executive KPI metrics (Total, Under Processing, Scrutiny, EVC, SAC, Approaching Deadlines, Overdue, Compliance, Expiring Docs, Escalated Cases).
- `GET /api/pendency/analytics` - Regional distribution, stage-wise pendency, and ageing buckets (0-15d, 16-30d, 31-60d, >60d).
- `GET /api/pendency/list` - Applications with real-time ageing calculation and SLA classification.

## 6. Institutional Compliance & Undertakings
- `GET /api/compliance/undertakings` - Register of time-bound compliance undertakings.
- `POST /api/compliance/undertakings` - Issues a new time-bound undertaking with regulatory source and due date.
- `POST /api/compliance/undertakings/:id/evidence` - Institution submits documentary compliance evidence.
- `POST /api/compliance/undertakings/:id/verify` - Compliance Officer formally verifies evidence (Accepted / Deficient).

## 7. Lease and Document Validity
- `GET /api/documents` - Register of land lease deeds and safety certificates with dynamic expiry status.
- `POST /api/documents/:id/renewal` - Institution submits registered renewal deed.
- `POST /api/documents/:id/renewals/:renewalId/verify` - Officer approves or rejects renewal.
- `GET /api/documents/expiry-alerts` - Triggers evaluations across 90, 60, 30, 15, and 7-day alert intervals.

## 8. Alerts, Escalations & Reports
- `GET /api/notifications` - In-app notification center and alert digest.
- `GET /api/escalations` - Register of overdue cases escalated to higher authorities.
- `POST /api/escalations/:id/resolve` - Formally resolves escalation with audit justification.
- `GET /api/reports` - List of 14 standard prescribed AICTE reports.
- `GET /api/reports/:reportId/export-csv` - Exports full data report to CSV format.

## 9. Cryptographic Audit & Prototype Lab
- `GET /api/audit/events` - Chronological tamper-evident audit events.
- `GET /api/audit/verify-integrity` - Validates entire SHA-256 blockchain hash chain from genesis block to tip.
- `GET /api/scenarios` - Lists 10 user-mandated demonstration scenarios.
- `POST /api/scenarios/:id/run` - Runs automated execution of scenarios 1 through 10 with live proof.
