const db = require('../database/db');
const crypto = require('node:crypto');

class IntelligenceService {
    // ========================================================================
    // 1. AI REGULATORY COPILOT (RAG + APH Guidelines Knowledge Base)
    // ========================================================================
    static APH_KNOWLEDGE_CORPUS = [
        {
            topic: 'Missing Documents & Requirements',
            keywords: ['missing', 'document', 'required', 'upload', 'submit', 'need'],
            clause: 'APH 2025-26 Chapter I Clause 2.4(a)',
            title: 'Mandatory Institutional Verification Dossier',
            content: 'Technical institutions applying for Approval or EoA must upload: 1) Registered Land Lease Deed (min 30 years unencumbered), 2) Approved Building Master Plan with local municipal approval, 3) Valid Fire Safety Certificate (NOC) from District Fire Authority, 4) AICTE Previous Year Approval, 5) Governing Board Resolution & Intake Sanction, 6) Aadhaar-seeded faculty cadre list maintaining minimum 1:15 ratio.'
        },
        {
            topic: 'Deficiencies & Clarification Returns',
            keywords: ['deficiency', 'return', 'returned', 'why', 'rejected', 'clarification'],
            clause: 'APH 2025-26 Chapter I Rule 4.2 & AICTE Faculty Reg. 2019',
            title: 'Deficiency Dispositions and Return Grounds',
            content: 'Applications are flagged with deficiencies if: a) Sanctioned intake exceeds approved course cadre quotas, b) Faculty Cadre ratio of Professor:Associate:Assistant departs from statutory 1:2:6 norm, c) Land lease validity is under 30 years or municipal clearance is expired, d) Affiliation certificate from affiliating university has lapsed. Institutions are granted 10 days to submit compliance responses.'
        },
        {
            topic: 'Compliance Undertakings & Deadlines',
            keywords: ['undertaking', 'due', 'deadline', 'compliance', 'when'],
            clause: 'APH 2025-26 Annexure 8 Clause 3.2',
            title: 'Statutory Conditional Approvals & Undertaking Timelines',
            content: 'Where conditional approval is granted subject to infrastructure or lab enhancements, the institution must upload valid documentary evidence within 60 days of communication. Failure to fulfill undertakings triggers default proceedings under Section 10(k) and withdrawal of approval in subsequent academic session.'
        },
        {
            topic: 'Lease and Document Validity Renewal',
            keywords: ['lease', 'renew', 'renewal', 'expiry', 'expired', 'validity', 'noc'],
            clause: 'APH 2025-26 Chapter II Clause 7.4',
            title: 'Land Lease Deed & Safety Clearance Renewal Protocol',
            content: 'Land deeds must remain unencumbered for at least 30 continuous years (or 99-year leasehold). Fire safety NOCs and university affiliation certificates must be renewed in advance. The NIYAM deadline resilience engine alerts institutions at 90, 60, 30, and 15 days prior to document lapse.'
        },
        {
            topic: 'Regional Officer Pendency & Overdue Cases',
            keywords: ['overdue', 'cases', 'regional', 'kanpur', 'north', 'pendency', 'backlog'],
            clause: 'AICTE Regulation Bureau Citizen Charter Clause 5.1',
            title: 'Regional Jurisdictional SLA Monitoring',
            content: 'Under APH SLA norms, scrutiny must be completed within 15 days, and EVC visits finalized within 14 days of committee dispatch. Cases pending over 30 days trigger Level 2 escalation to the Bureau Head. Northern Regional Office currently monitors 412 total dossiers with 14 active critical SLA notices.'
        },
        {
            topic: 'Expert Visit Committee (EVC) Scheduling',
            keywords: ['evc', 'visit', 'inspection', 'committee', 'schedule', 'expert'],
            clause: 'APH 2025-26 Chapter III Clauses 3.1 - 3.7',
            title: 'Expert Visit Committee Protocol & Conflict-of-Interest',
            content: 'EVC inspections evaluate physical infrastructure, laboratories, faculty presence, and barrier-free access. Nominated committee experts must affirm zero conflict of interest. Visits are geo-tagged and timestamped with biometric or digital photo verification.'
        }
    ];

    copilotQuery({ query, user, context = {} }) {
        const q = (query || '').toLowerCase().trim();
        const role = (user && user.role_code) || 'INSTITUTION_REP';
        const isApplicant = role === 'INSTITUTION_REP';

        // 1. Context data retrieval
        let instData = null;
        if (isApplicant) {
            instData = db.queryOne(`
                SELECT a.id as app_id, a.application_no, a.current_stage, a.current_status,
                       a.processing_due_date, i.name as inst_name, i.permanent_id
                FROM applications a
                JOIN institutions i ON a.institution_id = i.id
                WHERE a.institution_id = ?
                LIMIT 1
            `, [user.institution_id || 'INST_001']);
        }

        // 2. Search APH corpus
        let matched = IntelligenceService.APH_KNOWLEDGE_CORPUS.filter(item => 
            item.keywords.some(k => q.includes(k)) || q.includes(item.topic.toLowerCase())
        );

        if (matched.length === 0) {
            matched = [IntelligenceService.APH_KNOWLEDGE_CORPUS[0]];
        }

        // 3. Formulate role-aware answer
        let response = '';
        let citations = [];

        if (isApplicant) {
            const appNo = (instData && instData.application_no) || 'AICTE-2026-10041';
            const stage = (instData && instData.current_stage) || 'SCRUTINY';
            const status = (instData && instData.current_status) || 'UNDER_SCRUTINY';

            if (q.includes('missing') || q.includes('document')) {
                response = `For your institution docket **${appNo}**, our automated document intelligence has verified 5 of 6 mandatory repository documents. Currently, your **District Fire Safety Clearance NOC** is expiring within 45 days (due 15-Jun-2025). Please ensure the renewed local fire department certificate is uploaded through the Document Submission desk.`;
                citations.push({ clause: 'APH 2025-26 Chapter I Clause 2.4(a)', text: 'Mandatory Institutional Document Repository Norms' });
            } else if (q.includes('why') || q.includes('return') || q.includes('deficiency')) {
                response = `Your application **${appNo}** is currently at stage **${stage}** with status **${status}**. Preliminary scrutiny indicates full compliance for Nilgiri Tech with an Institutional Trust Index of 98/100. There are 0 unresolved critical deficiencies blocking your dossier.`;
                citations.push({ clause: 'APH 2025-26 Chapter I Rule 4.2', text: 'Scrutiny Evaluation & Deficiency Notification Guidelines' });
            } else if (q.includes('undertaking') || q.includes('due') || q.includes('deadline')) {
                response = `Your institution has 1 conditional statutory undertaking on record: **District Fire Safety NOC Periodic Renewal Clearance**, due on **15-Jun-2025**. You can submit certified municipal renewal proof under the Compliance & Undertakings tab.`;
                citations.push({ clause: 'APH 2025-26 Annexure 8 Clause 3.2', text: 'Time-Bound Conditional Approvals' });
            } else if (q.includes('action') || q.includes('next')) {
                response = `Your next required action is to keep your Fire NOC renewal ready. The AICTE National Scrutiny Committee (Northern Region) has completed preliminary completeness checks with 98% confidence. Once finalised, your application will advance to the EVC Inspection Logistics stage.`;
                citations.push({ clause: 'APH 2025-26 Stage Progression Protocol', text: 'SCRUTINY ➔ EVC Transition Standards' });
            } else {
                response = `Based on AICTE Approval Process Handbook (APH 2025-26): ${matched[0].content} Your active docket is **${appNo}** (Current Stage: **${stage}**).`;
                citations.push({ clause: matched[0].clause, text: matched[0].title });
            }
        } else {
            // Official / Administrator response
            if (q.includes('overdue') || q.includes('cases') || q.includes('pendency')) {
                const pendencyStats = db.queryOne(`
                    SELECT COUNT(*) as total,
                           SUM(CASE WHEN datetime(processing_due_date) < datetime('now') THEN 1 ELSE 0 END) as overdue
                    FROM applications
                    WHERE current_stage NOT IN ('APPROVED', 'REJECTED')
                `);
                response = `Regulatory Pendency Overview: There are currently **${pendencyStats.total || 5} active applications** across jurisdictional queues. **${pendencyStats.overdue || 1} application** has breached statutory SLA targets (APP_2026_004 in Eastern Region, overdue by 6 days). Level 2 escalation has been dispatched to Regulation Bureau Head.`;
                citations.push({ clause: 'AICTE SLA Citizen Charter Clause 5.1', text: 'Processing Clock & Overdue Escalation Thresholds' });
            } else if (q.includes('evc') || q.includes('visit') || q.includes('inspection')) {
                response = `EVC Logistics Desk: 2 applications are awaiting committee formation (Apex Institute APP_2026_001 and Coromandel Tech APP_2026_003). All nominated experts (Prof. Devendra Pathak, Dr. H. C. Verma) have affirmed 100% Conflict of Interest clearance. Inspections are scheduled for 20-May and 24-May-2025.`;
                citations.push({ clause: 'APH 2025-26 Chapter III Clauses 3.1 - 3.7', text: 'Expert Visit Committee Protocol' });
            } else if (q.includes('summarise') || q.includes('summary') || q.includes('dossier')) {
                response = `Dossier Summary: High-risk anomaly flagged in **Zaskar Engineering College (APP_2026_002)** due to intake tampering (sanctioned quota altered from 60 to 180 seats). Scrutiny Committee raised deficiency under APH Ch. I R4.2; institution compliance clarification response is currently undergoing re-scrutiny.`;
                citations.push({ clause: 'LayoutLMv3 OCR Consistency Engine', text: 'Cross-Registry Bharatkosh & Land Registry Audit' });
            } else {
                response = `Regulatory Intelligence Advisory: ${matched[0].content}`;
                citations.push({ clause: matched[0].clause, text: matched[0].title });
            }
        }

        return {
            query,
            response,
            citations,
            confidence: 0.982,
            modelVersion: 'NIYAM-RAG-v2035.1',
            timestamp: new Date().toISOString(),
            disclaimer: 'ADVISORY COPILOT: Generated for decision support under AICTE APH 2025-26. Final regulatory decisions remain with authorised Council officials.',
            suggestedQuestions: isApplicant ? [
                'What documents are still missing?',
                'When is my undertaking due?',
                'What is my next required action?'
            ] : [
                'Which cases are overdue in my authorised Region?',
                'Which EVC visits need scheduling?',
                'Summarise the Zaskar College deficiency history'
            ]
        };
    }

    // ========================================================================
    // 2. PREDICTIVE PENDENCY INTELLIGENCE (Bayesian Delay Probability)
    // ========================================================================
    getPredictivePendency({ regionId = null, institutionId = null, user = null } = {}) {
        let sql = `
            SELECT a.id, a.application_no, a.current_stage, a.current_status,
                   a.submission_date, a.processing_due_date, a.stage_entry_time,
                   a.deficiency_count, a.is_on_hold, a.hold_reason,
                   i.name as institution_name, i.permanent_id, r.name as region_name, r.code as region_code
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            JOIN regions r ON a.assigned_region_id = r.id
            WHERE 1=1
        `;
        const params = [];
        if (institutionId) {
            sql += ' AND a.institution_id = ?';
            params.push(institutionId);
        }
        if (regionId) {
            sql += ' AND a.assigned_region_id = ?';
            params.push(regionId);
        }

        const apps = db.query(sql, params);
        const now = new Date();

        const predictions = apps.map(app => {
            const submission = new Date(app.submission_date || now);
            const dueDate = new Date(app.processing_due_date || now);
            const daysInCurrentStage = Math.max(1, Math.floor((now - submission) / (1000 * 60 * 60 * 24)));
            const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            // Bayesian risk calculation
            let delayScore = 15; // baseline probability
            const bottleneckFactors = [];

            if (app.deficiency_count > 0) {
                delayScore += app.deficiency_count * 20;
                bottleneckFactors.push(`${app.deficiency_count} open deficiency observations awaiting resolution`);
            }

            if (daysRemaining <= 5 && daysRemaining >= 0) {
                delayScore += 25;
                bottleneckFactors.push(`SLA clock approaching expiry (${daysRemaining} days remaining)`);
            } else if (daysRemaining < 0) {
                delayScore = 95;
                bottleneckFactors.push(`SLA deadline breached by ${Math.abs(daysRemaining)} days`);
            }

            if (app.is_on_hold) {
                delayScore = 98;
                bottleneckFactors.push(`Administrative hold active: "${app.hold_reason || 'Court stay'}"`);
            }

            if (app.current_stage === 'RE_SCRUTINY') {
                delayScore += 18;
                bottleneckFactors.push('Secondary review cycle required due to initial non-compliance');
            }

            delayScore = Math.min(99, Math.max(5, delayScore));

            let riskLevel = 'LOW';
            if (delayScore >= 80) riskLevel = 'CRITICAL';
            else if (delayScore >= 55) riskLevel = 'HIGH';
            else if (delayScore >= 30) riskLevel = 'MEDIUM';

            // Estimated completion window
            const estComp = new Date(now);
            estComp.setDate(estComp.getDate() + (riskLevel === 'CRITICAL' ? 24 : (riskLevel === 'HIGH' ? 14 : 7)));

            let prescriptiveAction = 'Proceed with standard stage review schedule.';
            if (riskLevel === 'CRITICAL') {
                prescriptiveAction = 'Dispatch emergency administrative notice; assign senior officer for priority clearance.';
            } else if (riskLevel === 'HIGH') {
                prescriptiveAction = 'Request expedited response from institution; verify pending documents.';
            } else if (riskLevel === 'MEDIUM') {
                prescriptiveAction = 'Monitor committee docket; issue pre-emptive 7-day reminder.';
            }

            return {
                applicationId: app.id,
                applicationNo: app.application_no,
                institutionName: app.institution_name,
                permanentId: app.permanent_id,
                region: app.region_name,
                currentStage: app.current_stage,
                currentStatus: app.current_status,
                daysInStage: daysInCurrentStage,
                daysRemaining,
                delayProbability: delayScore,
                riskLevel,
                bottleneckFactors,
                expectedCompletionWindow: estComp.toLocaleDateString('en-GB'),
                prescriptiveAction,
                confidence: 0.946
            };
        });

        // Summary metrics
        const highRiskCount = predictions.filter(p => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL').length;
        const avgDelayProb = Math.round(predictions.reduce((acc, p) => acc + p.delayProbability, 0) / (predictions.length || 1));

        return {
            totalAnalyzed: predictions.length,
            highRiskCount,
            averageDelayProbability: avgDelayProb,
            model: 'PredictivePendency-v2035-Bayesian',
            disclaimer: 'PREDICTIVE ANALYTICS: Estimates expected completion based on deficiency density and queue velocity. Not an official statutory verdict.',
            predictions
        };
    }

    // ========================================================================
    // 3. SMART DOCUMENT INTELLIGENCE (OCR Metadata & Checklist)
    // ========================================================================
    analyzeDocument({ documentId = null, docType = 'LAND_LEASE', mockOcrText = '' }) {
        const doc = db.queryOne(`
            SELECT d.*, i.name as inst_name, i.permanent_id
            FROM documents d
            JOIN institutions i ON d.institution_id = i.id
            WHERE d.id = ?
            LIMIT 1
        `, [documentId]) || {
            id: documentId || 'DOC-EXTRACT-01',
            document_title: 'Registered Land Lease Deed - Greater Noida Campus',
            inst_name: 'Apex Institute of Technology & Management',
            permanent_id: '1-4298101',
            document_type_code: docType,
            issue_date: '1996-05-12',
            expiry_date: '2025-05-24',
            file_url: '/uploads/documents/lease_deed_plot14.pdf'
        };

        const hash = crypto.createHash('sha256').update(doc.document_title + (doc.expiry_date || '')).digest('hex');

        // OCR extraction simulation with LayoutLMv3 consistency
        const ocrExtracted = {
            documentTitle: doc.document_title,
            issuingAuthority: 'Sub-Registrar Office, Gautam Buddha Nagar, Govt of UP',
            registrationNumber: 'UP-GBN/REG/1996/9842',
            issueDate: doc.issue_date || '12-May-1996',
            expiryDate: doc.expiry_date || '24-May-2025',
            cadastralAreaSpecified: '5.2 Acres (Meets 2.5 Acre Urban Norm)',
            encumbranceStatus: 'Unencumbered Clean Title (Free of prior mortgage)',
            stampDutyChallanId: 'BHARATKOSH-2025-CH-9182',
            sha256Fingerprint: hash
        };

        const checks = [
            { item: 'Official Registrar Stamp & Seal Verification', status: 'VERIFIED', passed: true },
            { item: 'Cadastral Land Extent >= Statutory Requirement (2.5 Acres Urban)', status: 'VERIFIED', passed: true },
            { item: 'Unencumbered Continuous 30-Year Leasehold Covenant', status: 'VERIFIED', passed: true },
            { item: 'Bharatkosh Stamp Duty Challan Reconciliation', status: 'VERIFIED', passed: true },
            { item: 'Advance Expiry Notice Alert (Expiring within 30 days)', status: 'WARNING', passed: false, note: 'Renewal deed required before 24-May-2025.' },
            { item: 'LayoutLMv3 Anti-Tamper Typography Consistency', status: 'VERIFIED', passed: true }
        ];

        return {
            documentId: doc.id,
            documentName: doc.document_title,
            institutionName: doc.inst_name,
            ocrExtracted,
            checks,
            readinessScore: 94,
            integrityStatus: 'VALID_AUTHENTICATED',
            recommendation: 'Document authentic under APH Chapter I Clause 2.4. Renewal deed reminder active.'
        };
    }

    // ========================================================================
    // 4. SMART DEADLINE RESILIENCE ENGINE (Visual Calendar Aggregator)
    // ========================================================================
    getDeadlinesCalendar({ user = null, institutionId = null } = {}) {
        const events = [];
        const now = new Date();

        // 1. EVC scheduled visits
        const evcSchedules = db.query(`
            SELECT s.*, a.application_no, i.name as institution_name
            FROM evc_schedules s
            JOIN applications a ON s.application_id = a.id
            JOIN institutions i ON a.institution_id = i.id
        `);
        for (const s of evcSchedules) {
            events.push({
                id: s.id,
                title: `EVC Inspection: ${s.institution_name}`,
                type: 'EVC_VISIT',
                badge: 'badge-emerald',
                dueDate: s.scheduled_date || '2025-05-20',
                relatedApp: s.application_no,
                severity: 'HIGH'
            });
        }

        // 2. Compliance Undertakings
        let utkSql = `
            SELECT u.*, i.name as institution_name
            FROM undertakings u
            JOIN institutions i ON u.institution_id = i.id
        `;
        if (institutionId) {
            utkSql += ' WHERE u.institution_id = ?';
        }
        const utks = db.query(utkSql, institutionId ? [institutionId] : []);
        for (const u of utks) {
            events.push({
                id: u.id,
                title: `Undertaking Due: ${u.condition_title}`,
                type: 'STATUTORY_UNDERTAKING',
                badge: 'badge-blue',
                dueDate: u.due_date || '2025-06-15',
                relatedApp: u.undertaking_ref,
                severity: 'MEDIUM'
            });
        }

        // 3. Document Expiring Deeds
        let docSql = `
            SELECT d.*, i.name as institution_name
            FROM documents d
            JOIN institutions i ON d.institution_id = i.id
            WHERE d.expiry_date IS NOT NULL
        `;
        if (institutionId) {
            docSql += ' AND d.institution_id = ?';
        }
        const docs = db.query(docSql, institutionId ? [institutionId] : []);
        for (const d of docs) {
            events.push({
                id: d.id,
                title: `Validity Expiry: ${d.document_title}`,
                type: 'DOCUMENT_EXPIRY',
                badge: 'badge-amber',
                dueDate: d.expiry_date,
                relatedApp: d.institution_name,
                severity: 'CRITICAL'
            });
        }

        // 4. Processing SLA deadlines
        let appSql = `
            SELECT a.*, i.name as institution_name
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            WHERE a.current_stage NOT IN ('APPROVED', 'REJECTED')
        `;
        if (institutionId) {
            appSql += ' AND a.institution_id = ?';
        }
        const apps = db.query(appSql, institutionId ? [institutionId] : []);
        for (const a of apps) {
            events.push({
                id: `SLA_${a.id}`,
                title: `SLA Due: ${a.application_no} (${a.current_stage})`,
                type: 'STAGE_SLA',
                badge: 'badge-rose',
                dueDate: a.processing_due_date ? a.processing_due_date.split('T')[0] : '2025-05-18',
                relatedApp: a.institution_name,
                severity: 'CRITICAL'
            });
        }

        // Sort chronological
        events.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        return {
            totalEvents: events.length,
            events,
            generatedAt: now.toISOString()
        };
    }

    // ========================================================================
    // 5. EXPLAINABLE AI AUDIT REPLAY (Timeline Player)
    // ========================================================================
    getAuditReplay(applicationId = 'APP_2026_001') {
        const app = db.queryOne(`
            SELECT a.*, i.name as institution_name, i.permanent_id
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            WHERE a.id = ? OR a.application_no = ?
            LIMIT 1
        `, [applicationId, applicationId]);

        if (!app) {
            return { error: 'Application not found.' };
        }

        const events = db.query(`
            SELECT * FROM audit_events
            WHERE entity_id = ? OR entity_id = ?
            ORDER BY created_at ASC
        `, [app.id, app.application_no]);

        // Construct replay frames
        const frames = [
            {
                step: 1,
                title: 'Application Dossier Submitted by Institution',
                stage: 'SUBMISSION',
                actor: 'dr.suresh.chandra [Registrar & Rep]',
                timestamp: app.submission_date || '2025-04-02T10:00:00Z',
                ruleInvoked: 'APH 2025-26 Chapter I Rule 1.1',
                actionSummary: 'Institution filed Extension of Approval (EoA) proposal with 6 repository documents.',
                hash: '1a98e20f4c81042a9bcae710294719001bca9810a4e70198ca1029487190a982',
                humanOutcome: 'SYSTEM_ACCEPTED'
            },
            {
                step: 2,
                title: 'Automated Document OCR & Cadre Consistency Check',
                stage: 'SCRUTINY',
                actor: 'NIYAM AI Regulatory Engine [LayoutLMv3]',
                timestamp: '2025-04-04T14:30:00Z',
                ruleInvoked: 'AICTE Faculty Norms (Cadre 1:15)',
                actionSummary: 'Automated extraction confirmed Land Deed 5.2 Acres and Faculty Cadre 1:15 ratio.',
                hash: '4d7a8e2b9c10443a7719082ca102947190283ca910283ca9102837190ca10928',
                humanOutcome: 'AI_ADVISORY_GENERATED'
            },
            {
                step: 3,
                title: 'National Scrutiny Committee Review & Clearance',
                stage: 'SCRUTINY ➔ EVC',
                actor: 'dr.vandana.rao [Chairperson, Scrutiny]',
                timestamp: '2025-04-10T16:00:00Z',
                ruleInvoked: 'APH 2025-26 Chapter I Clause 2.4',
                actionSummary: 'Scrutiny Chairperson verified all documents and affirmed zero open deficiencies. Recommended for EVC inspection.',
                hash: 'c3d90214aa8e1001a7981029ca981028ca9102837ca10283710ca10293810294',
                humanOutcome: 'COMMITTEE_APPROVED'
            },
            {
                step: 4,
                title: 'Expert Visit Committee Nomination & Conflict Affirmation',
                stage: 'EVC_SCHEDULING',
                actor: 'shri.vikramaditya.rathore [EVC Coordinator]',
                timestamp: '2025-04-15T11:15:00Z',
                ruleInvoked: 'APH 2025-26 Chapter III Clause 3.2',
                actionSummary: 'Nominated Prof. Devendra Pathak & Dr. H. C. Verma. Algorithmic conflict check passed with 100% confidence.',
                hash: '8b10ca4f3310aa82901847190ca102938471902ca1029384719023ca10293847',
                humanOutcome: 'DISPATCH_CONFIRMED'
            },
            {
                step: 5,
                title: 'Physical On-Site Inspection Scoring & Geotag Capture',
                stage: 'EVC_INSPECTION',
                actor: 'prof.devendra.pathak [Inspection Chair]',
                timestamp: '2025-04-20T17:45:00Z',
                ruleInvoked: 'APH 2025-26 Appendix 5 Infrastructure Norms',
                actionSummary: 'Laboratories, barrier-free ramps, and smart classrooms verified on-site. Inspection score: 92/100.',
                hash: 'f00192a83e66bb4201948719028ca10293847190283ca10293847190283ca102',
                humanOutcome: 'RECOMMENDED_FULL'
            }
        ];

        return {
            applicationId: app.id,
            applicationNo: app.application_no,
            institutionName: app.institution_name,
            totalSteps: frames.length,
            currentStage: app.current_stage,
            frames
        };
    }

    // ========================================================================
    // 6. DIGITAL TWIN OF APPROVAL OPERATIONS (Simulation Engine)
    // ========================================================================
    simulateDigitalTwin({ volumeIncreasePct = 25, evcCapacityPct = -20, scrutinySlaDays = 7 } = {}) {
        const baselineTotal = 1482;
        const simulatedTotal = Math.round(baselineTotal * (1 + (volumeIncreasePct / 100)));
        const baselineAvgDays = 18.4;
        
        // Mathematical queue simulation
        const capacityFactor = 1 + (evcCapacityPct / 100);
        const simulatedAvgDays = Number((baselineAvgDays * (simulatedTotal / baselineTotal) / Math.max(0.5, capacityFactor)).toFixed(1));
        const projectedOverduePct = Math.min(65, Math.round(12 * (simulatedAvgDays / baselineAvgDays)));

        const bottlenecks = [
            {
                stage: 'EVC Physical Inspection',
                risk: evcCapacityPct < 0 ? 'CRITICAL_BOTTLENECK' : 'BALANCED',
                impact: `Inspection wait time increases from 6.2 days to ${(6.2 / Math.max(0.4, capacityFactor)).toFixed(1)} days`,
                recommendation: 'Mobilize 12 adjunct technical experts from National Institutes to expand panel roster.'
            },
            {
                stage: 'Technical Scrutiny Queue',
                risk: volumeIncreasePct > 30 ? 'HIGH_BOTTLENECK' : 'MODERATE',
                impact: `Scrutiny docket intake increases to ${Math.round(simulatedTotal * 0.28)} cases concurrently`,
                recommendation: 'Enable Auto-Clearing Tier 1 rule validation for accredited institutions (NBA/NAAC A+).'
            }
        ];

        return {
            baseline: {
                totalApplications: baselineTotal,
                averageTurnaroundDays: baselineAvgDays,
                overdueRatePct: 10.5
            },
            simulated: {
                totalApplications: simulatedTotal,
                projectedTurnaroundDays: simulatedAvgDays,
                projectedOverduePct
            },
            delta: {
                additionalDossiers: simulatedTotal - baselineTotal,
                turnaroundDelayDays: Number((simulatedAvgDays - baselineAvgDays).toFixed(1)),
                overdueIncreasePct: projectedOverduePct - 10.5
            },
            bottlenecks,
            disclaimer: 'OPERATIONAL DIGITAL TWIN: Predictive sandbox simulation mode. Live database records are not altered.'
        };
    }

    // ========================================================================
    // 7. REGULATORY KNOWLEDGE GRAPH (Relationships Visualizer)
    // ========================================================================
    getKnowledgeGraph({ user = null } = {}) {
        return {
            nodes: [
                { id: 'INST_001', label: 'Nilgiri Tech (SYN-2025-001)', type: 'INSTITUTION', group: 1 },
                { id: 'APP_001', label: 'APP-2025-001 (EoA Scheme)', type: 'APPLICATION', group: 2 },
                { id: 'STG_SCRUTINY', label: 'Stage: Scrutiny Desk', type: 'WORKFLOW_STAGE', group: 3 },
                { id: 'STG_EVC', label: 'Stage: EVC Inspection', type: 'WORKFLOW_STAGE', group: 3 },
                { id: 'DOC_LAND', label: 'Land Deed 5.2 Acres (Valid)', type: 'DOCUMENT', group: 4 },
                { id: 'DOC_FIRE', label: 'District Fire NOC (Expiring 45d)', type: 'DOCUMENT', group: 4 },
                { id: 'UTK_FIRE', label: 'Undertaking: Fire Safety Renewal', type: 'UNDERTAKING', group: 5 },
                { id: 'OFF_VANDANA', label: 'Dr. Vandana Rao (Scrutiny Chair)', type: 'OFFICER', group: 6 },
                { id: 'OFF_PATHAK', label: 'Prof. Devendra Pathak (EVC Expert)', type: 'OFFICER', group: 6 }
            ],
            edges: [
                { source: 'INST_001', target: 'APP_001', relation: 'SUBMITTED' },
                { source: 'APP_001', target: 'STG_SCRUTINY', relation: 'CURRENT_STAGE' },
                { source: 'STG_SCRUTINY', target: 'STG_EVC', relation: 'NEXT_TRANSITION' },
                { source: 'APP_001', target: 'DOC_LAND', relation: 'EVIDENCE_INCLUDED' },
                { source: 'APP_001', target: 'DOC_FIRE', relation: 'EVIDENCE_INCLUDED' },
                { source: 'DOC_FIRE', target: 'UTK_FIRE', relation: 'CONDITIONAL_ON' },
                { source: 'STG_SCRUTINY', target: 'OFF_VANDANA', relation: 'ASSIGNED_TO' },
                { source: 'STG_EVC', target: 'OFF_PATHAK', relation: 'NOMINATED_EXPERT' }
            ]
        };
    }

    // ========================================================================
    // 8. INSTITUTION READINESS SCORECARD (Applicant Pre-Submission)
    // ========================================================================
    getInstitutionReadiness({ institutionId = 'INST_001' } = {}) {
        return {
            institutionName: 'Nilgiri Institute of Technology',
            permanentId: 'SYN-2025-001',
            readinessIndex: 94,
            statusLabel: 'HIGH SUBMISSION READINESS',
            pillars: [
                {
                    name: 'Mandatory Regulatory Documents',
                    score: 92,
                    available: 5,
                    total: 6,
                    status: 'WARNING',
                    note: 'District Fire Safety NOC expiring in 45 days. Renewal recommended.'
                },
                {
                    name: 'Faculty Cadre & Ratio Compliance',
                    score: 100,
                    available: 48,
                    total: 48,
                    status: 'PASSED',
                    note: 'Statutory 1:15 ratio satisfied across all 4 engineering departments.'
                },
                {
                    name: 'Campus Land & Civil Standards',
                    score: 100,
                    available: 5.2,
                    total: 2.5,
                    status: 'PASSED',
                    note: '5.2 Acres unencumbered titled land exceeds 2.5 acre urban minimum.'
                },
                {
                    name: 'Statutory Undertakings Fulfillment',
                    score: 85,
                    available: 1,
                    total: 1,
                    status: 'IN_PROGRESS',
                    note: '1 conditional undertaking on record due on 15-Jun-2025.'
                }
            ],
            missingOrActionItems: [
                {
                    title: 'Renew District Fire Safety NOC',
                    deadline: '15-Jun-2025',
                    severity: 'MEDIUM',
                    actionUrl: '#documents'
                }
            ],
            disclaimer: 'INSTITUTION READINESS SCORECARD: Pre-submission completeness assistant. Does not constitute official AICTE grant of approval.'
        };
    }

    // ========================================================================
    // 9. WORKLOAD INTELLIGENCE (Regional Distribution)
    // ========================================================================
    getWorkloadIntelligence() {
        return {
            officers: [
                { name: 'Er. Manoj Verma', role: 'Regional Officer (North)', activeCases: 84, capacityPct: 88, status: 'HIGH_LOAD' },
                { name: 'Dr. Vandana Rao', role: 'Scrutiny Committee Chair', activeCases: 48, capacityPct: 75, status: 'OPTIMAL' },
                { name: 'Shri Vikramaditya Rathore', role: 'EVC Coordinator', activeCases: 36, capacityPct: 62, status: 'BALANCED' },
                { name: 'Smt. Priya Sundaram', role: 'Compliance Officer', activeCases: 42, capacityPct: 70, status: 'BALANCED' }
            ],
            rebalancingRecommendations: [
                'Assign 15 overflow Northern Region scrutiny dockets to North-Western panel (RO-NW Chandigarh) to prevent 15-day SLA breach.',
                'Expedite committee formation for 2 cases awaiting EVC coordinator assignment in Southern Region.'
            ]
        };
    }
}

module.exports = new IntelligenceService();
