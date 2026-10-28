# ADMINISTRATOR & OFFICER USER MANUAL
## AICTE Smart Approval & Compliance Management System

---

## 1. System Access & Roles
The application runs locally on `http://localhost:8080`.
Administrators and officers can log in or use the **Enterprise Role Switcher** dropdown in the top bar to simulate any assigned role:
- `superadmin`: Full technical system oversight and user administration.
- `bureauadmin`: Regulation Bureau Administrator managing national APH policies and rules.
- `ro_northern`, `ro_southern`, `ro_western`: Regional Officers overseeing jurisdiction cases.
- `scrutiny_expert1`: Scrutiny Committee Chairman conducting document verifications.
- `evc_coord1`: Expert Visit Committee Coordinator.
- `compliance_officer1`: Compliance Officer managing undertakings and lease deeds.
- `competent_auth1`: Competent Authority (AICTE Chairman).
- `auditor1`: CAG/CVC Statutory Auditor.

## 2. Managing Applications & Workflow
1. Navigate to **Applications** from the left navigation bar.
2. Select any application and click **Open Case ↗** to enter the **8-Tab Case Workspace**:
   - **Overview:** Review institution details, application type, and statutory SLA deadline.
   - **Workflow:** Inspect stage timeline. Use **Advance Stage →** to execute valid transitions or **Place on Hold** to apply regulatory holds.
   - **Documents:** View uploaded statutory deeds, fire NOCs, and building certificates.
   - **Scrutiny:** Review deficiency remarks. Click **+ Raise Deficiency** to add observations citing APH clauses.
   - **EVC:** Click **Schedule EVC Visit** to assign committee members. Click **Submit Inspection Report & Scores** to record infrastructure, faculty, and compliance percentages.
   - **Compliance:** Track linked undertakings and evidence submissions.
   - **Communication:** Inspect administrative notices.
   - **Cryptographic Audit:** Review immutable SHA-256 chained transaction events.

## 3. Regulatory Rules Configuration
1. Navigate to **Regulatory Rules (APH)**.
2. Click **+ Create Rule Draft** to propose an amendment. Enter Academic Year, APH Version, and Rule Key.
3. Once reviewed, click **Publish Rule** (available to Bureau Admins). Once published, the rule is activated across all workflows and logged to the cryptographic audit trail.

## 4. Generating Regulatory Reports
1. Navigate to **14 Standard Reports**.
2. Select any report (Consolidated Applications, Regional Pendency, Stage Performance, Officer Workload, Expiring Leases, etc.).
3. Click **📥 Download CSV** to export the structured audit records.
