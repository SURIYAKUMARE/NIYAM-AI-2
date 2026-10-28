# NIYAM AI — Integrated AICTE Approval Workflow Automation & Compliance Management System
### Enterprise Digital Governance Platform | Problem Statement ID: 26262
**Organisation:** All India Council for Technical Education (AICTE)  
**Bureau:** Regulation Bureau  
**Designation:** National Technical Education Regulatory Lifecycle & Compliance Platform  
**Notice:** *Demonstration Prototype — Developed strictly according to AICTE Approval Process Handbook (APH) specifications.*

---

## 1. Executive Summary

**NIYAM AI** (नियम AI) is a digital governance and workflow automation platform engineered specifically for the All India Council for Technical Education (AICTE), Regulation Bureau. Built to modernize and streamline technical institution approval lifecycles, NIYAM AI replaces fragmented manual reviews and ad-hoc compliance tracking with an automated, auditable, and rule-driven regulatory engine.

The platform provides an end-to-end management framework for:
- **Approval Application Processing:** Multi-stage institutional application lifecycle (New Institution, Extension of Approval, Course Addition, Intake Variation, Campus Relocation).
- **Automated Workflow Orchestration:** Configurable BPMN-aligned state machine with strict statutory safeguards (human authority non-delegable).
- **Scrutiny & Re-Scrutiny Management:** Digital deficiency checklists, discrepancy logging, and automated compliance clearing.
- **Expert Visit Committee (EVC):** Automated committee roster generation, conflict-of-interest declarations, geo-tagged inspection logs, and digital deficiency reports.
- **SAC / SHC Quasi-Judicial Appeals:** Standing Appellate Committee and Standing Hearing Committee review workflows.
- **Institutional Compliance & Undertakings:** Strict time-bound obligation tracking with verified compliance enforcement.
- **Document Validity & Lease Expiry Engine:** Dynamic 90/60/30-day early warning triggers for land titles, building leases, and fire/safety NOCs.
- **Cryptographic Audit Trail:** Chained SHA-256 Merkle-style ledger guaranteeing non-repudiation and instantaneous tamper detection.

---

## 2. Regulatory Foundation & Architecture

NIYAM AI enforces regulatory requirements directly from the **AICTE Approval Process Handbook (APH)**:

- **Version-Controlled Rules Engine:** Governs required documents, processing fees, regional jurisdictions, committee sizes, and statutory deadlines by academic year and institution type.
- **Statutory Decision Safeguard:** Under no circumstances can automated algorithms or AI agents auto-reject or auto-sanction an institution. Final approval decisions (`APPROVED`, `REJECTED`, `WITHDRAWN`) are restricted to designated statutory authorities (`REGIONAL_OFFICER`, `REGULATION_BUREAU_ADMIN`, `SUPER_ADMIN`).
- **Submission vs. Verification Separation:** Submitting proof of compliance or document renewal does not extend validity or mark obligations as fulfilled. All evidence remains in `UNDER_VERIFICATION` or `RENEWAL_SUBMITTED` until formally inspected and verified by an authorized officer.

```
+-----------------------------------------------------------------------------------+
|                            NIYAM AI ENTERPRISE ARCHITECTURE                       |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Presentation Layer: Next-Gen Web Shell (HTML5, Inter Font, Devanagari, CSS) ] |
|    * Two-Column National Portal Auth * Priority Action Center * 8-Tab Workspace   |
|    * 10-Role Quick Simulation Bar   * WCAG 2.2 AA Accessible UI * Live Breadcrumbs|
|                                                                                   |
|                                       v                                           |
|                                                                                   |
|  [ API & Gateway Layer: RESTful HTTP Gateway + RBAC Middleware ]                  |
|    * 10 Government Roles Matrix     * Institution Data Isolation Filters         |
|    * Request Sanitization & Limiting * OpenAPI 3.0 Compatible Endpoints           |
|                                                                                   |
|                                       v                                           |
|                                                                                   |
|  [ Core Services & Workflow Orchestration Engines ]                               |
|    * Workflow State Machine Engine  * Scrutiny & Deficiency Tracker               |
|    * EVC Committee & Visit Engine   * Pendency & Escalation Worker                |
|    * Time-Bound Undertaking Service * Document Validity & Lease Renewal Engine    |
|    * Regulatory Rules Engine (APH)  * Advisory Intelligence Service               |
|                                                                                   |
|                                       v                                           |
|                                                                                   |
|  [ Cryptographic Audit Engine: Merkle-Chained SHA-256 Ledger ]                   |
|    * SHA-256(prev_hash + uuid + actor + action + entity + state + timestamp)    |
|    * Mathematical Non-Repudiation   * Instant Tamper Verification Algorithm       |
|                                                                                   |
|                                       v                                           |
|                                                                                   |
|  [ Persistence Layer: 27 Normalized Relational Tables (WAL SQLite / PostgreSQL) ] |
+-----------------------------------------------------------------------------------+
```

---

## 3. Supported Enterprise Roles (10 Institutional & Regulatory Personas)

| Role Code | Role Name | Primary Responsibility |
|---|---|---|
| `SUPER_ADMIN` | National System Administrator | System settings, security policies, global user administration |
| `REGULATION_BUREAU_ADMIN` | Regulation Bureau Officer | APH regulatory rule publishing, national oversight, policy overrides |
| `REGIONAL_OFFICER` | Regional Officer (RO) | Territorial jurisdiction review, EVC sanctions, LoI / LoA issuance |
| `SCRUTINY_MEMBER` | Scrutiny Committee Member | Document verification, deficiency issuance, re-scrutiny clearing |
| `EVC_COORDINATOR` | EVC Coordinator | Expert committee roster selection, inspection scheduling, conflict checks |
| `EVC_MEMBER` | EVC Member / Inspection Expert | Physical inspection, geo-tagged report filing, infrastructure scoring |
| `SAC_SHC_MEMBER` | Standing Appellate Member | Quasi-judicial appeals review, hearing recommendations |
| `INSTITUTION_REP` | Technical Institution Principal | Application submission, deficiency remediation, undertaking uploads |
| `COMPLIANCE_OFFICER` | Compliance Verification Officer | Time-bound undertaking verification, renewal audit, penalty issuance |
| `AUDITOR` | Independent Vigilance Auditor | Chained audit ledger verification, non-repudiation integrity analysis |

---

## 4. Key Functional Modules

1. **Executive Dashboard & Priority Action Center:**
   - 10 Instant KPI metrics (Total Applications, Pending Scrutiny, Active EVCs, Delayed Inspections, Overdue Undertakings, Expiring Documents, SAC Appeals, Approved, Deficient, Audited Logs).
   - High-density alert queue highlighting immediate operational bottlenecks.
2. **Comprehensive 8-Tab Case Workspace:**
   - **Tab 1: Overview:** Institutional profile, Land details, AICTE approval history, regional jurisdiction.
   - **Tab 2: Lifecycle & State Transitions:** Permitted transitions, status history, human-in-the-loop overrides.
   - **Tab 3: Document Repository:** Mandatory 8-document vault with SHA-256 checksums and renewal lifecycle.
   - **Tab 4: Scrutiny & Deficiencies:** Categorized deficiency checklist (Land, Faculty Cadre, Built-up Area, Endowment).
   - **Tab 5: EVC Inspections:** Multi-member roster, conflict declaration, geo-coordinates, digital assessment.
   - **Tab 6: Conditional Undertakings:** 180-day built-up area and faculty compliance tracking with proof uploads.
   - **Tab 7: Official Communications:** Timestamped SMS and formal email dispatch logs.
   - **Tab 8: Chained Cryptographic Audit:** Block-by-block hash verification, previous hash linkage, and non-repudiation ledger.
3. **Interactive Scenario Testing Suite (10 Real-World Regulated Cases):**
   - Built directly into the UI (`Demo Lab (16 Stages)`) and automated test runner (`tests/scenarios.test.js`).
   - Demonstrates zero-tolerance handling of unauthorized rule publishing, lease expiration holds, and EVC conflicts.

---

## 5. Technology Stack & Zero-Dependency Portability

- **Runtime:** Node.js v20+ / v22+ / v24+ LTS (Leveraging native `node:sqlite`, `node:crypto`, `node:http`, and `node:test`).
- **Database:** Native SQLite in WAL (`Write-Ahead Logging`) mode with 27 normalized relational tables and foreign keys enabled.
- **Frontend:** Pure semantic HTML5, CSS3 Custom Properties (WCAG 2.2 AA compliant), and responsive Vanilla JavaScript.
- **Enterprise Reference:** Java 21 LTS + Spring Boot 3.3.0 production reference implementation included in `enterprise-reference/spring-boot/`.
- **Containers:** Docker and Docker Compose definitions included in `docker/`.

---

## 6. Quick Start & Execution Guide

### Option 1: Native One-Click Launch (Windows)
Double-click `run.bat` or execute in PowerShell:
```powershell
.\run.ps1
```

### Option 2: Command Line Execution (Any OS)
```bash
# Verify Node version (v20+ recommended)
node -v

# Start the NIYAM AI server
node server.js
```
The server will bind to **`http://localhost:8080`**. Open your web browser and navigate to:
**`http://localhost:8080`**

### Running Automated Test Suites
Execute all 30 automated test cases spanning state machines, RBAC, compliance lifecycle, lease validity, audit tampering, and end-to-end scenarios:
```bash
node --test --test-concurrency=1 tests/*.test.js
```

### Option 3: Docker Deployment
```bash
cd docker
docker-compose up --build
```
Access at `http://localhost:8080`.

---

## 7. Project Structure

```
d:\SIH (project chaos)\New folder (2)\
├── docker/
│   ├── Dockerfile                   # Multi-stage production container build
│   └── docker-compose.yml           # Local orchestrator configuration
├── docs/
│   ├── ADMINISTRATOR_MANUAL.md      # System setup, policy & user administration
│   ├── API_DOCUMENTATION.md         # Complete REST API reference with schemas
│   ├── ARCHITECTURE.md              # Software architecture & component design
│   ├── DATABASE_ERD.md              # 27-table relational schema & relationships
│   ├── INSTITUTION_USER_MANUAL.md   # Technical institution submission guide
│   ├── REGULATORY_RULES_GUIDE.md    # APH rule versioning & parameters
│   ├── ROLE_PERMISSIONS_MATRIX.md   # 10-role RBAC authorization matrix
│   ├── SECURITY_SUMMARY.md          # Cryptography, threat model & compliance
│   └── TESTING_AND_VALIDATION_REPORT.md # 30 automated test specifications
├── enterprise-reference/
│   └── spring-boot/                 # Java 21 LTS production enterprise reference
│       ├── pom.xml
│       └── src/main/java/gov/aicte/approval/AicteApprovalApplication.java
├── public/
│   ├── index.html                   # High-fidelity National Portal UI shell
│   ├── js/
│   │   ├── api.js                   # Client REST API adapter
│   │   └── app.js                   # Single Page Application router & views
│   └── styles/
│       └── theme.css                # Official AICTE color palette & responsive styles
├── src/
│   ├── config/constants.js          # APH constants, roles, color tokens
│   ├── controllers/                 # 13 REST API controllers
│   ├── database/
│   │   ├── db.js                    # Native WAL SQLite connection pool
│   │   ├── schema.sql               # 27 relational tables + audit DDL
│   │   └── seedData.js              # Synthetic institutions, applications, users
│   ├── middleware/                  # Authentication & RBAC enforcement
│   ├── routes/api.js                # URL routing and HTTP dispatch
│   └── services/                    # 13 Core enterprise business logic services
├── tests/                           # 6 Automated test suites (30 tests)
├── package.json
├── server.js                        # HTTP Server & background scheduler
├── run.bat                          # One-click Windows launch script
├── run.ps1                          # PowerShell automated launcher
└── README.md                        # Master project documentation
```

---

## 8. Verification & Demonstration Credentials

All accounts are pre-seeded in the database. You may log in directly with one click on the login screen or use the following credentials:

| Role | Username | Password | Jurisdiction |
|---|---|---|---|
| Super Admin | `admin_super` | `AicteAdmin@2026` | National |
| Regulation Bureau Admin | `admin_regulation` | `Regulation@2026` | National (APH) |
| Regional Officer | `ro_southern` | `RoSouth@2026` | Southern Region (Chennai) |
| Scrutiny Member | `scrutiny_lead` | `Scrutiny@2026` | Southern / Western |
| EVC Coordinator | `evc_coord` | `EvcCoord@2026` | National Roster |
| EVC Member | `evc_expert1` | `EvcExpert@2026` | Technical Panel |
| SAC / SHC Member | `shc_chair` | `ShcChair@2026` | Quasi-Judicial Council |
| Institution Representative | `inst_rep_001` | `InstPass@2026` | KCG College of Tech (APP_2026_001) |
| Compliance Officer | `compliance_officer` | `Compliance@2026` | Regulatory Enforcement |
| Vigilance Auditor | `auditor_vigilance` | `Auditor@2026` | National Vigilance |

---

## 9. Regulatory Compliance Disclaimer
*This platform was engineered as an enterprise-grade digital governance submission for AICTE Problem Statement ID 26262. It implements the statutory standards established in the AICTE Approval Process Handbook (APH). All rights and official trademarks belong to the All India Council for Technical Education, New Delhi.*
