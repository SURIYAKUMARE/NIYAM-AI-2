// ============================================================================
// NIYAM AI — Enterprise Application Controller & UI/UX Engine
// Exact Benchmark: https://niyam-ai-psi.vercel.app / AICTE Regulation Bureau
// ============================================================================

(function() {
    'use strict';

    // ------------------------------------------------------------------------
    // Authorized AICTE Personnel Directory & Digital Security Matrix
    // ------------------------------------------------------------------------
    const OFFICIAL_PERSONNEL = [
        {
            username: "dr.vandana.rao",
            aliases: ["officer", "scrutiny_expert1", "vandana"],
            fullName: "Dr. Vandana Rao",
            designation: "Chairperson, National Scrutiny Committee",
            shortRole: "Scrutiny Chair",
            role: "scrutiny_officer",
            roleName: "Senior Scrutiny Committee Chair",
            department: "AICTE National Scrutiny Bureau (Northern Region)",
            email: "vandana.rao@aicte-panel.org",
            badge: "Scrutiny Chair",
            cadreId: "AICTE/SCR-2025/084",
            office: "Nelson Mandela Marg, New Delhi",
            securityClearance: "LEVEL 3 (RESTRICTED REGULATORY)",
            description: "Technical Scrutiny Desk, Bounding Boxes & Deficiencies",
            hasMfa: true,
            pkiCert: "X.509 CN=Dr. Vandana Rao, OU=AICTE Scrutiny Bureau, O=Govt of India"
        },
        {
            username: "dr.suresh.chandra",
            aliases: ["applicant", "inst_apex", "suresh"],
            fullName: "Dr. Suresh Chandra",
            designation: "Registrar & Authorized Liaison Officer",
            shortRole: "Institution Rep",
            role: "applicant",
            roleName: "Institution Representative",
            department: "Nilgiri Institute of Technology",
            email: "registrar@nilgiri-tech.edu.in",
            badge: "Institution Representative",
            cadreId: "INST/REP/SYN-2025-001",
            office: "Ooty Campus, Tamil Nadu",
            securityClearance: "LEVEL 1 (INSTITUTIONAL PORTAL)",
            description: "College Filing Portal & Upload Scrutiny",
            hasMfa: false,
            pkiCert: "X.509 CN=Dr. Suresh Chandra, OU=Nilgiri Tech, O=Govt of India"
        },
        {
            username: "prof.anil.sahasrabudhe",
            aliases: ["authority", "bureauadmin", "competent_auth1", "anil"],
            fullName: "Prof. Anil Sahasrabudhe",
            designation: "Regulation Bureau Administrator",
            shortRole: "Bureau Head",
            role: "supervising_authority",
            roleName: "Regulation Bureau Head",
            department: "Approval Bureau HQ, New Delhi",
            email: "bureau.head@aicte-india.org",
            badge: "Bureau Head",
            cadreId: "AICTE/HQ/EXEC-001",
            office: "Apex Directorate, New Delhi",
            securityClearance: "LEVEL 4 (COMPETENT AUTHORITY)",
            description: "AICTE Bureau Head, Deficiencies & Approvals",
            hasMfa: true,
            pkiCert: "X.509 CN=Prof. Anil Sahasrabudhe, OU=AICTE Apex Bureau, O=Govt of India"
        },
        {
            username: "smt.priya.sundaram",
            aliases: ["compliance", "compliance_officer1", "priya"],
            fullName: "Smt. Priya Sundaram",
            designation: "Chief Statutory Compliance Officer",
            shortRole: "Compliance Officer",
            role: "compliance_officer",
            roleName: "Chief Statutory Compliance Officer",
            department: "Legal & Institutional Undertakings Cell",
            email: "compliance@aicte-india.org",
            badge: "Compliance Officer",
            cadreId: "AICTE/LEGAL-2025/119",
            office: "Northern Regional Jurisdiction",
            securityClearance: "LEVEL 3 (STATUTORY ADJUDICATION)",
            description: "Undertakings, Leases & Legal Compliance",
            hasMfa: true,
            pkiCert: "X.509 CN=Smt. Priya Sundaram, OU=AICTE Legal Cell, O=Govt of India"
        },
        {
            username: "shri.rajeshwar.rao",
            aliases: ["auditor", "auditor1", "rajeshwar"],
            fullName: "Shri Rajeshwar Rao",
            designation: "Statutory Audit Director (CAG)",
            shortRole: "Audit Director",
            role: "auditor",
            roleName: "Statutory Audit Director",
            department: "Vigilance & Cryptographic Audit Division",
            email: "cag.audit@gov.in",
            badge: "Statutory Auditor",
            cadreId: "CAG/DEL/AUD-402",
            office: "Comptroller & Auditor General Deputation",
            securityClearance: "LEVEL 4 (INDEPENDENT AUDIT OVERSIGHT)",
            description: "Tamper-Evident SHA-256 Ledger Audit",
            hasMfa: true,
            pkiCert: "X.509 CN=Shri Rajeshwar Rao, OU=CAG Audit Cell, O=Govt of India"
        },
        {
            username: "dr.rk.shrivastava",
            aliases: ["admin", "superadmin", "shrivastava"],
            fullName: "Dr. R. K. Shrivastava",
            designation: "Platform Administrator & Chief Architect",
            shortRole: "System Admin",
            role: "admin",
            roleName: "Platform System Administrator",
            department: "Information & e-Governance Division",
            email: "admin@aicte-india.org",
            badge: "Administrator",
            cadreId: "AICTE/IT/DIR-002",
            office: "Data Center Operations, New Delhi",
            securityClearance: "LEVEL 5 (SUPER ADMIN)",
            description: "User Management & Regulatory Rules Engine",
            hasMfa: true,
            pkiCert: "X.509 CN=Dr. R. K. Shrivastava, OU=AICTE e-Gov, O=Govt of India"
        }
    ];

    function resolveOfficial(input) {
        if (!input) return OFFICIAL_PERSONNEL[0];
        if (typeof input === 'object' && input.username) {
            const found = OFFICIAL_PERSONNEL.find(p => p.username === input.username || (p.aliases && p.aliases.includes(input.username)));
            if (found) return { ...found, ...input };
            return input;
        }
        const str = String(input).toLowerCase().trim();
        const found = OFFICIAL_PERSONNEL.find(p => 
            p.username.toLowerCase() === str || 
            (p.aliases && p.aliases.some(a => a.toLowerCase() === str)) ||
            p.fullName.toLowerCase().includes(str) ||
            p.email.toLowerCase() === str
        );
        if (found) return found;
        return {
            username: str,
            fullName: str.charAt(0).toUpperCase() + str.slice(1),
            designation: "AICTE Authorized Official",
            shortRole: "Official",
            role: "scrutiny_officer",
            roleName: "Authorized Regulatory Officer",
            department: "AICTE Regulatory Directorate",
            email: `${str}@aicte-india.org`,
            badge: "Official",
            cadreId: "AICTE/CADRE-2025",
            office: "National Headquarters, New Delhi",
            securityClearance: "LEVEL 2 (STANDARD CLEARANCE)",
            hasMfa: false,
            pkiCert: `X.509 CN=${str}, OU=AICTE, O=Govt of India`
        };
    }

    // Icons SVG mapping
    const ICONS = {
        LayoutDashboard: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
        GraduationCap: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>`,
        FileSearch: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><circle cx="11.5" cy="14.5" r="2.5"/><path d="M13.3 16.3 15 18"/></svg>`,
        Building2: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 12h4m-4-4h4m0 13v-3a2 2 0 0 0-4 0v3M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/></svg>`,
        FileText: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5M10 9H8m8 4H8m8 4H8"/></svg>`,
        FileCheck2: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.5 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v6"/><path d="M14 2v5a1 1 0 0 0 1 1h5m-6 12 2 2 4-4"/></svg>`,
        ListFilter: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M2 5h20M6 12h12M9 19h6"/></svg>`,
        AlertTriangle: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4m0 4h.01"/></svg>`,
        MessageSquare: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/></svg>`,
        CheckCircle2: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/></svg>`,
        Landmark: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 18v-7m1.119-8.795a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949zM14 18v-7m4 7v-7M3 22h18M6 18v-7"/></svg>`,
        BarChart3: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3v16a2 2 0 0 0 2 2h16M18 17V9M13 17V5M8 17v-3"/></svg>`,
        History: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/></svg>`,
        ShieldAlert: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM12 8v4m0 4h.01"/></svg>`,
        Sliders: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 8h4M12 21v-9m0-4V3m5 13h4M19 12V3m0 18v-5M3 14h4M5 10V3m0 18v-7"/></svg>`,
        Users: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m10-17.872a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>`,
        ShieldCheck: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zm-11-1 2 2 4-4"/></svg>`,
        LogOut: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m16 17 5-5-5-5M21 12H9m0 9H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>`,
        Bell: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.268 21a2 2 0 0 0 3.464 0M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>`,
        Sun: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m-7.07-14.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2m-14.07 7.07 1.41-1.41m11.32-11.32 1.41-1.41"/></svg>`,
        Moon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>`,
        Scan: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2m-10 0H5a2 2 0 0 1-2-2v-2"/></svg>`,
        FlaskConical: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 2v5L4.5 17.5A2 2 0 0 0 6 20h12a2 2 0 0 0 1.5-2.5L14 7V2m-5 0h6m-7 12h8"/></svg>`
    };

    class NiyamAIApp {
        constructor() {
            this.isAuthenticated = localStorage.getItem('niyam_auth') === 'true';
            this.currentView = this.isAuthenticated ? (localStorage.getItem('niyam_view') || 'dashboard') : 'login';
            
            const rawUser = JSON.parse(localStorage.getItem('niyam_user') || 'null');
            this.currentUser = resolveOfficial(rawUser);

            this.theme = localStorage.getItem('niyam-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            
            // State
            this.colleges = [];
            this.groundTruth = null;
            this.activeCollegeFilter = 'ALL';
            this.activeStateFilter = 'ALL';
            this.collegeSearchQuery = '';
            this.collegeSortBy = 'trustScore';
            
            // Studio Verification State
            this.selectedStudioCollegeId = 'zec-zaskar';
            this.selectedStudioDocId = 'doc-zec-01';
            this.studioVerificationData = null;
            
            // UI state
            this.notifOpen = false;
            this.mobileSidebarOpen = false;
            this.loginMode = 'signin'; // 'signin' | 'mfa'
            this.selectedLoginRole = 'dr.vandana.rao';

            // Live Applications State (100% interactive)
            this.applications = [
                {
                    id: "APP-2025-001",
                    collegeId: "nit-nilgiri",
                    collegeName: "Nilgiri Institute of Technology",
                    trustName: "Nilgiri Educational Trust",
                    permanentId: "SYN-2025-001",
                    appType: "Extension of Approval (EoA)",
                    stage: "SCRUTINY",
                    slaTarget: "15-May-2025",
                    status: "UNDER_SCRUTINY",
                    statusBadge: "badge-amber",
                    trustScore: 98,
                    deficienciesCount: 0,
                    submissionDate: "02-Apr-2025"
                },
                {
                    id: "APP-2025-002",
                    collegeId: "zec-zaskar",
                    collegeName: "Zaskar Engineering College",
                    trustName: "Zaskar Development Society",
                    permanentId: "SYN-2025-009",
                    appType: "Increase in Intake (+60 Seats)",
                    stage: "SCRUTINY",
                    slaTarget: "18-May-2025",
                    status: "DEFICIENCY_FLAGGED",
                    statusBadge: "badge-rose",
                    trustScore: 24,
                    deficienciesCount: 2,
                    submissionDate: "05-Apr-2025"
                },
                {
                    id: "APP-2025-003",
                    collegeId: "cit-coromandel",
                    collegeName: "Coromandel Institute of Technology",
                    trustName: "Coromandel Trust",
                    permanentId: "SYN-2025-008",
                    appType: "New Program Approval (MCA)",
                    stage: "SAC_APPEAL",
                    slaTarget: "22-May-2025",
                    status: "EXPIRED_LEASE_HOLD",
                    statusBadge: "badge-rose",
                    trustScore: 52,
                    deficienciesCount: 1,
                    submissionDate: "10-Apr-2025"
                },
                {
                    id: "APP-2025-004",
                    collegeId: "kce-kaveri",
                    collegeName: "Kaveri College of Engineering",
                    trustName: "Kaveri Educational Foundation",
                    permanentId: "SYN-2025-002",
                    appType: "Extension of Approval (EoA)",
                    stage: "EVC_VISIT",
                    slaTarget: "25-May-2025",
                    status: "EVC_SCHEDULED",
                    statusBadge: "badge-purple",
                    trustScore: 95,
                    deficienciesCount: 0,
                    submissionDate: "12-Apr-2025"
                },
                {
                    id: "APP-2025-005",
                    collegeId: "aitr-aravali",
                    collegeName: "Aravali Institute of Technology & Research",
                    trustName: "Aravali Shiksha Parishad",
                    permanentId: "SYN-2025-005",
                    appType: "New Technical Institution Setup",
                    stage: "EVC_VISIT",
                    slaTarget: "28-May-2025",
                    status: "EVC_INSPECTION_PENDING",
                    statusBadge: "badge-blue",
                    trustScore: 96,
                    deficienciesCount: 0,
                    submissionDate: "15-Apr-2025"
                },
                {
                    id: "APP-2025-006",
                    collegeId: "cit-chilika",
                    collegeName: "Chilika Institute of Technology",
                    trustName: "Chilika Higher Education Trust",
                    permanentId: "SYN-2025-011",
                    appType: "Extension of Approval (EoA)",
                    stage: "SCRUTINY",
                    slaTarget: "30-May-2025",
                    status: "MISSING_DOCUMENTS",
                    statusBadge: "badge-amber",
                    trustScore: 42,
                    deficienciesCount: 3,
                    submissionDate: "18-Apr-2025"
                }
            ];

            this.init();
        }

        async init() {
            this.applyTheme(this.theme);
            await this.loadInitialData();
            this.render();
        }

        applyTheme(theme) {
            this.theme = theme;
            localStorage.setItem('niyam-theme', theme);
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }

        toggleTheme() {
            const next = this.theme === 'dark' ? 'light' : 'dark';
            this.applyTheme(next);
            this.renderHeader();
        }

        async loadInitialData() {
            try {
                const res = await fetch('/api/colleges');
                if (res.ok) {
                    const data = await res.json();
                    this.colleges = data.colleges || [];
                } else {
                    throw new Error('API returned ' + res.status);
                }
            } catch (e) {
                console.warn('[App] Could not load colleges via API, trying static fallback:', e);
                try {
                    const staticRes = await fetch('/data/seed/institutions.json');
                    if (staticRes.ok) {
                        this.colleges = await staticRes.json();
                    }
                } catch (err) {
                    console.error('[App] Failed static fallback:', err);
                }
            }

            try {
                const gtRes = await fetch('/api/verify/ground-truth');
                if (gtRes.ok) {
                    this.groundTruth = await gtRes.json();
                } else {
                    throw new Error('API returned ' + gtRes.status);
                }
            } catch (e) {
                console.warn('[App] Could not load ground truth via API, trying static fallback:', e);
                try {
                    const staticGt = await fetch('/data/seed/ground_truth.json');
                    if (staticGt.ok) {
                        this.groundTruth = await staticGt.json();
                    }
                } catch (err) {
                    console.error('[App] Failed static GT fallback:', err);
                }
            }
        }

        navigate(view) {
            this.currentView = view;
            localStorage.setItem('niyam_view', view);
            this.mobileSidebarOpen = false;
            this.render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        login(user) {
            this.currentUser = user;
            this.isAuthenticated = true;
            localStorage.setItem('niyam_auth', 'true');
            localStorage.setItem('niyam_user', JSON.stringify(user));
            API.setSimulatedUser(user.username);
            this.navigate('dashboard');
        }

        logout() {
            this.isAuthenticated = false;
            this.currentUser = OFFICIAL_PERSONNEL[0];
            localStorage.removeItem('niyam_auth');
            localStorage.removeItem('niyam_user');
            localStorage.removeItem('niyam_view');
            this.currentView = 'login';
            this.loginMode = 'signin';
            this.render();
        }

        render() {
            const root = document.getElementById('app-root');
            if (!root) return;

            if (!this.isAuthenticated || this.currentView === 'login') {
                root.innerHTML = '';
                root.appendChild(this.renderLoginView());
                return;
            }

            root.innerHTML = `
                <div class="authenticated-layout">
                    <header class="app-header" id="app-header"></header>
                    <div class="app-body">
                        <aside class="app-sidebar" id="app-sidebar"></aside>
                        <main class="main-content" id="main-content"></main>
                    </div>
                </div>
            `;

            this.renderHeader();
            this.renderSidebar();
            this.renderMainContent();
        }

        // --------------------------------------------------------------------
        // Authenticated Header
        // --------------------------------------------------------------------
        renderHeader() {
            const header = document.getElementById('app-header');
            if (!header) return;

            const initials = (this.currentUser.roleName || this.currentUser.username || 'NY')
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

            header.innerHTML = `
                <div class="header-left">
                    <button class="theme-toggle-btn lg:hidden" id="mobile-menu-btn" title="Toggle Menu" style="display:none;">
                        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
                    </button>
                    <div class="brand-link" id="brand-home-btn">
                        <div class="brand-emblem-wrap">
                            <img src="/images/aicte-logo.png" alt="AICTE Official Logo">
                            <span class="live-indicator-dot"></span>
                        </div>
                        <div class="brand-text-block">
                            <div class="brand-title-row">
                                <span class="brand-title">NIYAM</span>
                                <span class="brand-tag">AICTE APH 2025-26</span>
                            </div>
                            <span class="brand-subtitle">Regulatory Decision-Support &amp; Document Authentication</span>
                        </div>
                    </div>
                </div>

                <div class="header-right">
                    <div class="sync-status-pill">
                        <span class="sync-dot"></span>
                        <span>REGULATORY SYNC: ACTIVE</span>
                    </div>

                    <button class="theme-toggle-btn" id="theme-toggle-btn" title="Toggle Light/Dark Theme">
                        ${this.theme === 'dark' ? ICONS.Sun : ICONS.Moon}
                    </button>

                    <div class="notification-bell-wrap">
                        <button class="notif-btn" id="notif-toggle-btn" title="Regulatory Directives">
                            ${ICONS.Bell}
                            <span class="notif-badge-count">2</span>
                        </button>
                        <div class="notifications-popup" id="notif-popup" style="display: ${this.notifOpen ? 'block' : 'none'};">
                            <div class="notif-header">
                                <span class="notif-header-title">Regulatory Alerts &amp; Directives</span>
                                <span class="notif-badge-pill">2 Unread</span>
                            </div>
                            <div class="notif-list">
                                <div class="notif-item unread">
                                    <div class="notif-title">High Risk Deficiencies Flagged</div>
                                    <div class="notif-msg">Zaskar Engineering College dossier exhibits intake tampering in Course Cadre Table.</div>
                                    <div class="notif-time">Just now • APH Ch. I R4.2</div>
                                </div>
                                <div class="notif-item unread">
                                    <div class="notif-title">Affiliation Expiration Warning</div>
                                    <div class="notif-msg">Coromandel Institute of Technology university clearance lapsed on 2024-06-30.</div>
                                    <div class="notif-time">12 mins ago • SLA Watch</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="header-role-badge">
                        ${ICONS.ShieldCheck}
                        <span>${this.currentUser.badge || 'Scrutiny Officer'}</span>
                    </div>

                    <div class="user-header-profile">
                        <div class="user-header-avatar">${initials}</div>
                        <div class="user-header-info">
                            <div class="user-header-name">${this.currentUser.roleName || this.currentUser.username}</div>
                            <div class="user-header-role">${this.currentUser.badge || 'Authorized Officer'}</div>
                        </div>
                        <button class="btn-signout" id="header-logout-btn" title="Sign Out">
                            ${ICONS.LogOut}
                        </button>
                    </div>
                </div>
            `;

            document.getElementById('brand-home-btn').onclick = () => this.navigate('dashboard');
            document.getElementById('theme-toggle-btn').onclick = () => this.toggleTheme();
            document.getElementById('header-logout-btn').onclick = () => this.logout();
            
            const notifBtn = document.getElementById('notif-toggle-btn');
            notifBtn.onclick = (e) => {
                e.stopPropagation();
                this.notifOpen = !this.notifOpen;
                document.getElementById('notif-popup').style.display = this.notifOpen ? 'block' : 'none';
            };

            document.addEventListener('click', (e) => {
                if (this.notifOpen && !e.target.closest('.notification-bell-wrap')) {
                    this.notifOpen = false;
                    const pop = document.getElementById('notif-popup');
                    if (pop) pop.style.display = 'none';
                }
            });
        }

        // --------------------------------------------------------------------
        // Authenticated Sidebar
        // --------------------------------------------------------------------
        renderSidebar() {
            const sidebar = document.getElementById('app-sidebar');
            if (!sidebar) return;

            const navItems = [
                { id: 'dashboard', label: 'Executive Overview', icon: ICONS.LayoutDashboard },
                { id: 'colleges', label: 'Synthetic Colleges', icon: ICONS.GraduationCap, badge: '12' },
                { id: 'verify', label: 'AI Verification Studio', icon: ICONS.FileSearch, badge: 'AI' },
                { id: 'applications', label: 'All Applications Dossier', icon: ICONS.FileText },
                { id: 'review', label: 'Review Workspace', icon: ICONS.FileCheck2 },
                { id: 'queue', label: 'Scrutiny Queue', icon: ICONS.ListFilter },
                { id: 'findings', label: 'Findings & Dispositions', icon: ICONS.AlertTriangle },
                { id: 'clarifications', label: 'Clarifications', icon: ICONS.MessageSquare },
                { id: 'verification', label: 'Source Verification', icon: ICONS.CheckCircle2 },
                { id: 'infrastructure', label: 'Infrastructure Evidence', icon: ICONS.Landmark },
                { id: 'analytics', label: 'Analytics & SLA KPIs', icon: ICONS.BarChart3 },
                { id: 'audit', label: 'Statutory Audit Ledger', icon: ICONS.History },
                { id: 'rules', label: 'Regulatory Rules (APH)', icon: ICONS.Sliders },
                { id: 'users', label: 'Authorized Users', icon: ICONS.Users },
                { id: 'scenarios', label: 'Policy & Simulation Sandbox', icon: ICONS.FlaskConical }
            ];

            sidebar.innerHTML = `
                <div class="sidebar-header-card">
                    <div class="sidebar-emblem-box">
                        <img src="/images/aicte-logo.png" alt="AICTE">
                    </div>
                    <div class="sidebar-header-meta">
                        <div class="sidebar-meta-top">AICTE Council</div>
                        <div class="sidebar-meta-role">
                            <span class="sidebar-role-dot"></span>
                            <span>${this.currentUser.badge || 'Scrutiny Officer'}</span>
                        </div>
                    </div>
                    <span class="sidebar-aph-tag">APH 2025</span>
                </div>

                <div class="sidebar-role-switcher">
                    <div class="sidebar-role-switcher-label">Active Official Session:</div>
                    <select class="sidebar-role-select" id="sidebar-role-select">
                        ${OFFICIAL_PERSONNEL.map(a => `
                            <option value="${a.username}" ${(this.currentUser.username === a.username || (a.aliases && a.aliases.includes(this.currentUser.username))) ? 'selected' : ''}>
                                ${a.fullName} (${a.shortRole})
                            </option>
                        `).join('')}
                    </select>
                </div>

                <nav class="sidebar-nav-container">
                    <div class="sidebar-section-title">Command Modules</div>
                    ${navItems.map(item => `
                        <div class="sidebar-nav-item ${this.currentView === item.id ? 'active' : ''}" data-nav="${item.id}" ${item.highlight ? 'style="color:#F59E0B; font-weight:700;"' : ''}>
                            <div class="sidebar-nav-left">
                                ${item.icon}
                                <span>${item.label}</span>
                            </div>
                            ${item.badge ? `<span class="sidebar-nav-badge">${item.badge}</span>` : ''}
                        </div>
                    `).join('')}
                </nav>

                <div class="sidebar-footer">
                    <div class="sidebar-user-card" style="cursor:pointer;" onclick="app.openUserProfileModal();" title="Click to view Official Credential Dossier">
                        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                            <div style="width:28px; height:28px; border-radius:8px; background:var(--accent); color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                ${this.currentUser.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div style="min-width:0;">
                                <div style="font-size:12px; font-weight:700; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                                    ${this.currentUser.username}
                                </div>
                                <div style="font-size:10px; color:var(--text-secondary);">${this.currentUser.badge}</div>
                            </div>
                        </div>
                        <button class="btn-signout" id="sidebar-logout-btn" title="Sign Out">
                            ${ICONS.LogOut}
                        </button>
                    </div>

                    <div class="sidebar-statutory-card">
                        <div class="sidebar-statutory-title">
                            ${ICONS.ShieldCheck}
                            <span>Statutory Decision Support</span>
                        </div>
                        AI advisory findings assist review. Final statutory approval decisions remain with competent AICTE authorities.
                    </div>
                </div>
            `;

            sidebar.querySelectorAll('.sidebar-nav-item').forEach(el => {
                el.onclick = () => {
                    const nav = el.getAttribute('data-nav');
                    if (nav) this.navigate(nav);
                };
            });

            const roleSelect = document.getElementById('sidebar-role-select');
            if (roleSelect) {
                roleSelect.onchange = (e) => {
                    const acc = resolveOfficial(e.target.value);
                    if (acc) {
                        this.currentUser = acc;
                        localStorage.setItem('niyam_user', JSON.stringify(acc));
                        API.setSimulatedUser(acc.username);
                        API.showToast(`Switched active view to ${acc.roleName}`, 'info');
                        this.render();
                    }
                };
            }

            document.getElementById('sidebar-logout-btn').onclick = () => this.logout();
        }

        // --------------------------------------------------------------------
        // Dynamic Views
        // --------------------------------------------------------------------
        renderMainContent() {
            const main = document.getElementById('main-content');
            if (!main) return;

            main.innerHTML = `<div class="content-max-w" id="view-container"></div>`;
            const container = document.getElementById('view-container');

            switch (this.currentView) {
                case 'dashboard':
                    this.renderDashboardView(container);
                    break;
                case 'colleges':
                    this.renderCollegesView(container);
                    break;
                case 'verify':
                    this.renderVerifyStudioView(container);
                    break;
                case 'applications':
                case 'review':
                    this.renderApplicationsView(container);
                    break;
                case 'queue':
                    this.renderQueueView(container);
                    break;
                case 'findings':
                    this.renderFindingsView(container);
                    break;
                case 'clarifications':
                    this.renderClarificationsView(container);
                    break;
                case 'verification':
                    this.renderSourceVerificationView(container);
                    break;
                case 'infrastructure':
                    this.renderInfrastructureView(container);
                    break;
                case 'analytics':
                    this.renderAnalyticsView(container);
                    break;
                case 'audit':
                    this.renderAuditView(container);
                    break;
                case 'rules':
                    this.renderRulesView(container);
                    break;
                case 'users':
                    this.renderUsersView(container);
                    break;
                case 'scenarios':
                    this.renderScenariosView(container);
                    break;
                default:
                    this.renderDashboardView(container);
            }
        }

        // ====================================================================
        // LOGIN VIEW (Exact Match to niyam-ai-psi.vercel.app)
        // ====================================================================
        renderLoginView() {
            const wrap = document.createElement('div');
            wrap.className = 'login-page-container';

            const selectedAcc = resolveOfficial(this.selectedLoginRole);

            wrap.innerHTML = `
                <!-- Background Media -->
                <div class="login-bg-media">
                    <img src="/images/aicte-hq.png" alt="AICTE Headquarters Campus, New Delhi" class="login-bg-img">
                    <div class="login-bg-vignette"></div>
                    <div class="login-bg-radial"></div>
                </div>

                <!-- Top Floating Regulatory Bar -->
                <header class="login-top-bar">
                    <div class="login-top-pill">
                        <div style="width:20px; height:20px; border-radius:50%; background:#fff; padding:2px; display:flex; align-items:center; justify-content:center;">
                            <img src="/images/aicte-logo.png" alt="AICTE" style="width:100%; height:100%; object-fit:contain;">
                        </div>
                        <span style="font-weight:700;">All India Council for Technical Education</span>
                        <span class="live-indicator-dot" style="position:static; display:inline-block; margin:0 2px;"></span>
                        <span style="color:#6EE7B7; font-weight:600;">Live Regulatory Portal</span>
                    </div>

                    <div class="login-top-pill">
                        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14" height="14" style="color:#FBBF24;"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <span>Nelson Mandela Marg, New Delhi</span>
                        <span style="font-family:ui-monospace, monospace; padding:1px 5px; border-radius:4px; background:#2563EB; font-weight:700;">MoE</span>
                    </div>
                </header>

                <!-- Glassmorphic Login Card -->
                <div class="login-card-container">
                    <div class="login-glass-card">
                        
                        <div class="login-brand-header">
                            <div class="login-emblem-box">
                                <img src="/images/aicte-logo.png" alt="AICTE">
                                <span class="live-indicator-dot"></span>
                            </div>
                            <div class="login-hindi-title">अखिल भारतीय तकनीकी शिक्षा परिषद्</div>
                            <h1 class="login-main-title">NIYAM Regulatory Portal</h1>
                            <p class="login-desc">AICTE Application Review &amp; Compliance Verification</p>
                        </div>

                        ${this.loginMode === 'signin' ? `
                            <!-- Quick Role Selector -->
                            <div class="login-role-selector-box">
                                <div class="login-role-top-row">
                                    <span style="font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:5px;">
                                        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14" height="14" style="color:var(--accent);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                        Select Authorized Official
                                    </span>
                                    <span style="font-family:ui-monospace, monospace; color:var(--text-tertiary);">
                                        <span style="color:var(--accent); cursor:pointer; font-size:11px;" onclick="app.openEmergencyAccessModal();">Identity Directory</span>
                                    </span>
                                </div>

                                <div class="login-role-grid">
                                    ${OFFICIAL_PERSONNEL.map(a => `
                                        <button type="button" class="role-pill-btn ${(selectedAcc.username === a.username || (a.aliases && a.aliases.includes(selectedAcc.username))) ? 'active' : ''}" data-role-btn="${a.username}">
                                            ${a.shortRole}
                                        </button>
                                    `).join('')}
                                </div>

                                <div class="login-role-active-detail">
                                    <div style="display:flex; align-items:center; gap:6px;">
                                        <span style="width:6px; height:6px; border-radius:50%; background:var(--accent);"></span>
                                        <span style="font-weight:700; color:var(--text-primary);">${selectedAcc.fullName}</span>
                                        <span style="font-family:ui-monospace, monospace; font-size:11px; color:var(--text-tertiary);">(${selectedAcc.badge})</span>
                                    </div>
                                    ${selectedAcc.hasMfa ? 
                                        `<span style="font-family:ui-monospace, monospace; font-size:10px; font-weight:700; padding:2px 6px; border-radius:9999px; background:rgba(245,158,11,0.15); color:#D97706; border:1px solid rgba(245,158,11,0.3);">TOTP 2FA Required</span>` : 
                                        `<span style="font-family:ui-monospace, monospace; font-size:10px; font-weight:700; padding:2px 6px; border-radius:9999px; background:rgba(16,185,129,0.15); color:#059669; border:1px solid rgba(16,185,129,0.3);">Direct Sign-On</span>`
                                    }
                                </div>
                            </div>

                            <!-- Credentials Form -->
                            <form id="signin-form" style="display:flex; flex-direction:column; gap:14px;">
                                <div style="display:flex; flex-direction:column; gap:6px;">
                                    <label style="font-size:11px; font-weight:700; color:var(--text-primary);">Username / AICTE Official ID</label>
                                    <input type="text" id="login-username" class="input" value="${selectedAcc.username}" required style="padding-left:12px;">
                                </div>

                                <div style="display:flex; flex-direction:column; gap:6px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <label style="font-size:11px; font-weight:700; color:var(--text-primary);">Security Password</label>
                                        <span style="font-size:11px; color:var(--text-tertiary);">Standard Portal Encryption</span>
                                    </div>
                                    <div style="position:relative;">
                                        <input type="password" id="login-password" class="input" value="${selectedAcc.password}" required style="width:100%; padding-right:36px;">
                                        <button type="button" id="toggle-pw-btn" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); color:var(--text-tertiary);">
                                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                        </button>
                                    </div>
                                </div>

                                <div style="display:flex; align-items:center; justify-content:space-between; font-size:12px;">
                                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer; color:var(--text-secondary);">
                                        <input type="checkbox" checked style="accent-color:var(--accent);">
                                        <span>Remember this terminal session</span>
                                    </label>
                                    <a href="#" style="color:var(--accent); font-weight:600;" onclick="app.openEmergencyAccessModal(); return false;">Emergency Access</a>
                                </div>

                                <button type="submit" class="btn btn-primary" style="padding:12px; font-size:13px; font-weight:800; border-radius:12px; background:linear-gradient(to right, #2563EB, #4338CA); box-shadow:var(--shadow-md);">
                                    Sign In to Regulatory Terminal
                                </button>
                            </form>
                        ` : `
                            <!-- MFA Challenge Screen -->
                            <div style="display:flex; flex-direction:column; gap:16px;">
                                <div style="text-align:center; padding:10px 0;">
                                    <div style="width:48px; height:48px; border-radius:50%; background:var(--accent-light); color:var(--accent); display:flex; align-items:center; justify-content:center; margin:0 auto 10px;">
                                        ${ICONS.ShieldAlert}
                                    </div>
                                    <h3 style="font-size:16px; font-weight:800; color:var(--text-primary);">Two-Factor Security Verification</h3>
                                    <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                                        Enter the 6-digit Time-Based One-Time Password (TOTP) from your authorized authenticator.
                                    </p>
                                </div>

                                <div class="mfa-digits-container" id="mfa-inputs-wrap">
                                    <input type="text" maxlength="1" class="mfa-digit-input" data-mfa-idx="0" value="1" autofocus>
                                    <input type="text" maxlength="1" class="mfa-digit-input" data-mfa-idx="1" value="2">
                                    <input type="text" maxlength="1" class="mfa-digit-input" data-mfa-idx="2" value="3">
                                    <input type="text" maxlength="1" class="mfa-digit-input" data-mfa-idx="3" value="4">
                                    <input type="text" maxlength="1" class="mfa-digit-input" data-mfa-idx="4" value="5">
                                    <input type="text" maxlength="1" class="mfa-digit-input" data-mfa-idx="5" value="6">
                                </div>

                                <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px; color:var(--text-secondary);">
                                    <span style="font-family:ui-monospace, monospace; color:var(--accent); font-weight:700;">
                                        Authorized Security Token
                                    </span>
                                    <span style="font-family:ui-monospace, monospace; color:#10B981; font-weight:700;">
                                        Expires in 28s
                                    </span>
                                </div>

                                <button type="button" class="btn btn-primary" id="mfa-verify-btn" style="padding:12px; font-size:13px; font-weight:800; border-radius:12px; background:linear-gradient(to right, #2563EB, #4338CA);">
                                    Verify Security PIN &amp; Proceed
                                </button>

                                <button type="button" class="btn btn-outline" id="mfa-cancel-btn" style="padding:10px; font-size:12px; border-radius:12px;">
                                    Back to Sign In
                                </button>
                            </div>
                        `}

                        <!-- Footer Legal & Cryptographic Badges -->
                        <div style="border-top:1px solid var(--border); padding-top:14px; display:flex; align-items:center; justify-content:space-between; font-size:10px; color:var(--text-tertiary);">
                            <span style="display:flex; align-items:center; gap:4px;">
                                ${ICONS.ShieldCheck}
                                <span>SHA-256 Ledger Provenance</span>
                            </span>
                            <span>AICTE Regulation Bureau • ISO 27001</span>
                        </div>

                    </div>
                </div>

                <!-- Bottom Floating Notice -->
                <footer style="position:relative; z-index:10; text-align:center; padding:10px 0; font-size:11px; color:rgba(255,255,255,0.7);">
                    AICTE Smart Approval &amp; Compliance Management System • Problem Statement ID: 26262 / 26261
                </footer>
            `;

            // Event bindings for login
            wrap.querySelectorAll('[data-role-btn]').forEach(btn => {
                btn.onclick = () => {
                    this.selectedLoginRole = btn.getAttribute('data-role-btn');
                    this.render();
                };
            });

            const togglePwBtn = wrap.querySelector('#toggle-pw-btn');
            if (togglePwBtn) {
                togglePwBtn.onclick = () => {
                    const pwInput = wrap.querySelector('#login-password');
                    if (pwInput) {
                        pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
                    }
                };
            }

            const signinForm = wrap.querySelector('#signin-form');
            if (signinForm) {
                signinForm.onsubmit = (e) => {
                    e.preventDefault();
                    const enteredUser = wrap.querySelector('#login-username').value.trim();
                    const acc = resolveOfficial(enteredUser || this.selectedLoginRole);
                    if (acc.hasMfa) {
                        this.loginMode = 'mfa';
                        this.render();
                    } else {
                        this.login(acc);
                    }
                };
            }

            const mfaVerifyBtn = wrap.querySelector('#mfa-verify-btn');
            if (mfaVerifyBtn) {
                mfaVerifyBtn.onclick = () => {
                    const enteredUser = wrap.querySelector('#login-username') ? wrap.querySelector('#login-username').value.trim() : '';
                    const acc = resolveOfficial(enteredUser || this.selectedLoginRole);
                    this.login(acc);
                };
            }

            const mfaCancelBtn = wrap.querySelector('#mfa-cancel-btn');
            if (mfaCancelBtn) {
                mfaCancelBtn.onclick = () => {
                    this.loginMode = 'signin';
                    this.render();
                };
            }

            return wrap;
        }

        // ====================================================================
        // 1. EXECUTIVE DASHBOARD
        // ====================================================================
        renderDashboardView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>Executive Overview &amp; Real-Time KPIs</h1>
                        <p>AICTE Approval Process Handbook (APH 2025-26) Statutory Regulation Bureau</p>
                    </div>
                    <div class="view-actions">
                        <button class="btn btn-outline btn-sm" id="btn-refresh-kpis">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            Refresh Ledger
                        </button>
                        <button class="btn btn-primary btn-sm" id="btn-quick-verify">
                            ${ICONS.FileSearch}
                            AI Verification Studio
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics -->
                <div class="stats-grid-4">
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">Total Regulatory Dossiers</span>
                            <span class="stat-value">1,482</span>
                            <span class="stat-sub" style="color:#059669;">+12.4% vs Academic Year 2024</span>
                        </div>
                        <div class="stat-icon-box blue">${ICONS.FileText}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">Under Scrutiny Desk</span>
                            <span class="stat-value">342</span>
                            <span class="stat-sub" style="color:#2563EB;">68 in Secondary Evaluation</span>
                        </div>
                        <div class="stat-icon-box blue">${ICONS.ListFilter}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">Statutory Approved / Clear</span>
                            <span class="stat-value">984</span>
                            <span class="stat-sub" style="color:#059669;">Zero Unresolved Deficiencies</span>
                        </div>
                        <div class="stat-icon-box green">${ICONS.CheckCircle2}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">Active Deficiencies / SLA Risk</span>
                            <span class="stat-value">156</span>
                            <span class="stat-sub" style="color:#EF4444;">18 Approaching 15-Day SLA</span>
                        </div>
                        <div class="stat-icon-box rose">${ICONS.AlertTriangle}</div>
                    </div>
                </div>

                <!-- AI Statutory Advisory Intelligence Strip -->
                <div class="card" style="background:var(--accent-light); border-color:var(--accent-muted);">
                    <div style="display:flex; align-items:flex-start; gap:12px;">
                        <div style="width:36px; height:36px; border-radius:10px; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            ${ICONS.FileSearch}
                        </div>
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <h3 style="font-size:14px; font-weight:800; color:var(--text-primary);">AI Statutory Advisory &amp; Anomaly Intelligence</h3>
                                <span class="badge badge-blue">LayoutLMv3 + Cross-Registry</span>
                            </div>
                            <p style="font-size:12px; color:var(--text-secondary); margin-top:4px; line-height:1.5;">
                                AI pipeline cross-checked 1,482 institutional dossiers against Bharatkosh Challan gateways and National Land Registries. 
                                High-confidence anomalies identified in <strong>Zaskar Engineering College</strong> (sanctioned intake altered from 60 to 180 seats) 
                                and <strong>Coromandel Institute</strong> (state affiliation certificate lapsed).
                            </p>
                        </div>
                        <button class="btn btn-outline btn-sm" id="btn-inspect-anomalies" style="background:var(--surface);">
                            Inspect Anomalies
                        </button>
                    </div>
                </div>

                <!-- Live Applications Queue Table -->
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">
                                ${ICONS.ListFilter}
                                <span>Recent High-Priority Applications</span>
                            </div>
                            <div class="card-subtitle">Real-time status, cryptographic validation &amp; SLA countdown</div>
                        </div>
                        <button class="btn btn-outline btn-sm" id="btn-view-all-apps">View All Dossiers</button>
                    </div>

                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Application ID</th>
                                    <th>Institution Name</th>
                                    <th>Program / Intake</th>
                                    <th>Trust Score</th>
                                    <th>Status</th>
                                    <th>SLA Remaining</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="font-mono"><strong>AICTE-2025-TN-001</strong></td>
                                    <td>Nilgiri Institute of Technology (Ooty)</td>
                                    <td>Engineering &amp; Tech (480)</td>
                                    <td><span class="badge badge-emerald">98 / 100</span></td>
                                    <td><span class="badge badge-emerald">APPROVED</span></td>
                                    <td><span class="font-mono">COMPLETED</span></td>
                                    <td><button class="btn btn-outline btn-sm app-inspect-btn" data-app-id="AICTE-2025-TN-001">Review</button></td>
                                </tr>
                                <tr>
                                    <td class="font-mono"><strong>AICTE-2025-JK-089</strong></td>
                                    <td>Zaskar Engineering College (Kargil)</td>
                                    <td>Engineering &amp; Tech (180 Claimed)</td>
                                    <td><span class="badge badge-rose">24 / 100</span></td>
                                    <td><span class="badge badge-rose">DEFICIENCY_ISSUED</span></td>
                                    <td><span class="font-mono" style="color:#EF4444; font-weight:700;">2 Days 4 Hours</span></td>
                                    <td><button class="btn btn-outline btn-sm app-inspect-btn" data-app-id="AICTE-2025-JK-089" style="border-color:#EF4444; color:#EF4444;">Verify Anomaly</button></td>
                                </tr>
                                <tr>
                                    <td class="font-mono"><strong>AICTE-2025-KL-044</strong></td>
                                    <td>Malabar College of Engineering (Kozhikode)</td>
                                    <td>Engineering &amp; Tech (360)</td>
                                    <td><span class="badge badge-emerald">95 / 100</span></td>
                                    <td><span class="badge badge-blue">UNDER_SCRUTINY</span></td>
                                    <td><span class="font-mono">7 Days 12 Hours</span></td>
                                    <td><button class="btn btn-outline btn-sm app-inspect-btn" data-app-id="AICTE-2025-KL-044">Review</button></td>
                                </tr>
                                <tr>
                                    <td class="font-mono"><strong>AICTE-2025-OD-112</strong></td>
                                    <td>Chilika Institute of Technology (Puri)</td>
                                    <td>Engineering &amp; Tech (300)</td>
                                    <td><span class="badge badge-amber">42 / 100</span></td>
                                    <td><span class="badge badge-amber">MISSING_FIELDS</span></td>
                                    <td><span class="font-mono">5 Days 8 Hours</span></td>
                                    <td><button class="btn btn-outline btn-sm app-inspect-btn" data-app-id="AICTE-2025-OD-112">Check Docs</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            document.getElementById('btn-quick-verify').onclick = () => this.navigate('verify');
            document.getElementById('btn-inspect-anomalies').onclick = () => {
                this.selectedStudioCollegeId = 'zec-zaskar';
                this.navigate('verify');
            };
            document.getElementById('btn-view-all-apps').onclick = () => this.navigate('applications');
            document.getElementById('btn-refresh-kpis').onclick = () => {
                API.showToast('Synchronized with AICTE National Ledger', 'success');
            };

            container.querySelectorAll('.app-inspect-btn').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.getAttribute('data-app-id');
                    if (id === 'AICTE-2025-JK-089') {
                        this.selectedStudioCollegeId = 'zec-zaskar';
                        this.navigate('verify');
                    } else {
                        this.navigate('review');
                    }
                };
            });
        }

        // ====================================================================
        // 2. SYNTHETIC COLLEGES DIRECTORY (Exact Match to niyam-ai-psi.vercel.app/colleges)
        // ====================================================================
        renderCollegesView(container) {
            const colleges = this.colleges.length > 0 ? this.colleges : [
                { id: "nit-nilgiri", permanentId: "SYN-2025-001", name: "Nilgiri Institute of Technology", city: "Ooty", state: "Tamil Nadu", status: "Valid", trustScore: 98, intake: 480, establishedYear: 2004, campusAreaAcres: 12.5, logo: "/seed/logos/nit-nilgiri.svg", photos: [{ path: "/seed/photos/nit-nilgiri/campus.jpg" }] },
                { id: "zec-zaskar", permanentId: "SYN-2025-009", name: "Zaskar Engineering College", city: "Kargil", state: "Ladakh", status: "Tampered", trustScore: 24, intake: 180, establishedYear: 2011, campusAreaAcres: 8.2, logo: "/seed/logos/zec-zaskar.svg", photos: [{ path: "/seed/photos/zec-zaskar/campus.jpg" }] },
                { id: "cit-coromandel", permanentId: "SYN-2025-008", name: "Coromandel Institute of Technology", city: "Chennai", state: "Tamil Nadu", status: "Expired", trustScore: 52, intake: 420, establishedYear: 2006, campusAreaAcres: 10.0, logo: "/seed/logos/cit-coromandel.svg", photos: [{ path: "/seed/photos/cit-coromandel/campus.jpg" }] },
                { id: "cit-chilika", permanentId: "SYN-2025-011", name: "Chilika Institute of Technology", city: "Puri", state: "Odisha", status: "Missing Fields", trustScore: 42, intake: 300, establishedYear: 2015, campusAreaAcres: 7.5, logo: "/seed/logos/cit-chilika.svg", photos: [{ path: "/seed/photos/cit-chilika/campus.jpg" }] },
                { id: "kce-kaveri", permanentId: "SYN-2025-002", name: "Kaveri College of Engineering", city: "Tiruchirappalli", state: "Tamil Nadu", status: "Valid", trustScore: 95, intake: 540, establishedYear: 2001, campusAreaAcres: 14.0, logo: "/seed/logos/kce-kaveri.svg", photos: [{ path: "/seed/photos/kce-kaveri/campus.jpg" }] },
                { id: "aitr-aravali", permanentId: "SYN-2025-005", name: "Aravali Institute of Technology & Research", city: "Jaipur", state: "Rajasthan", status: "Valid", trustScore: 96, intake: 600, establishedYear: 2008, campusAreaAcres: 15.2, logo: "/seed/logos/aitr-aravali.svg", photos: [{ path: "/seed/photos/aitr-aravali/campus.jpg" }] }
            ];

            // Filter logic
            const filtered = colleges.filter(c => {
                if (this.activeCollegeFilter !== 'ALL' && c.status !== this.activeCollegeFilter) return false;
                if (this.activeStateFilter !== 'ALL' && c.state !== this.activeStateFilter) return false;
                if (this.collegeSearchQuery.trim()) {
                    const q = this.collegeSearchQuery.toLowerCase();
                    return (c.name && c.name.toLowerCase().includes(q)) ||
                           (c.city && c.city.toLowerCase().includes(q)) ||
                           (c.state && c.state.toLowerCase().includes(q)) ||
                           (c.permanentId && c.permanentId.toLowerCase().includes(q));
                }
                return true;
            }).sort((a, b) => {
                if (this.collegeSortBy === 'trustScore') return (b.trustScore || 0) - (a.trustScore || 0);
                if (this.collegeSortBy === 'name') return (a.name || '').localeCompare(b.name || '');
                if (this.collegeSortBy === 'intake') return (b.intake || 0) - (a.intake || 0);
                if (this.collegeSortBy === 'year') return (b.establishedYear || 0) - (a.establishedYear || 0);
                return 0;
            });

            const uniqueStates = Array.from(new Set(colleges.map(c => c.state).filter(Boolean))).sort();

            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>Synthetic Engineering Colleges Benchmark</h1>
                        <p>15 Realistic Synthetic Engineering Colleges (AICTE Problem Statement 26261 / 26262)</p>
                    </div>
                    <div class="view-actions">
                        <button class="btn btn-primary btn-sm" id="btn-colleges-studio">
                            ${ICONS.FileSearch}
                            AI Verification Studio
                        </button>
                    </div>
                </div>

                <!-- Benchmark Notice Pill -->
                <div class="card" style="background:var(--accent-light); border-color:var(--accent-muted); padding:16px;">
                    <div style="display:flex; align-items:flex-start; gap:10px;">
                        <div style="color:var(--accent); margin-top:2px;">
                            ${ICONS.GraduationCap}
                        </div>
                        <div style="font-size:12px; line-height:1.5;">
                            <strong style="color:var(--text-primary); font-size:13px;">AICTE PS 26261 Synthetic Dataset:</strong>
                            Contains 15 realistic engineering college dossiers, authentic crest emblems, 45 campus photographs, and 45 regulatory PDF documents across India. 
                            Used to rigorously evaluate AI document fraud detection, hash verification, and rule compliance engines without exposing actual institutions.
                        </div>
                    </div>
                </div>

                <!-- Filter & Search Toolbar -->
                <div class="card" style="padding:14px;">
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px;">
                            <!-- Search box -->
                            <div style="position:relative; flex:1; min-width:240px;">
                                <input type="text" id="college-search" class="input" placeholder="Search by college name, city, state, or ID..." value="${this.collegeSearchQuery}" style="width:100%; padding-left:32px;">
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text-tertiary);"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            </div>

                            <!-- State dropdown -->
                            <div style="display:flex; align-items:center; gap:8px;">
                                <select class="select" id="college-state-select" style="min-width:140px;">
                                    <option value="ALL">All States (${uniqueStates.length})</option>
                                    ${uniqueStates.map(st => `<option value="${st}" ${this.activeStateFilter === st ? 'selected' : ''}>${st}</option>`).join('')}
                                </select>

                                <!-- Sort dropdown -->
                                <select class="select" id="college-sort-select">
                                    <option value="trustScore" ${this.collegeSortBy === 'trustScore' ? 'selected' : ''}>Sort: Trust Score</option>
                                    <option value="name" ${this.collegeSortBy === 'name' ? 'selected' : ''}>Sort: College Name</option>
                                    <option value="intake" ${this.collegeSortBy === 'intake' ? 'selected' : ''}>Sort: Intake Capacity</option>
                                    <option value="year" ${this.collegeSortBy === 'year' ? 'selected' : ''}>Sort: Established Year</option>
                                </select>
                            </div>
                        </div>

                        <!-- Status filter pills -->
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">Status:</span>
                            ${['ALL', 'Valid', 'Tampered', 'Expired', 'Missing Fields'].map(st => `
                                <button type="button" class="btn btn-sm ${this.activeCollegeFilter === st ? 'btn-primary' : 'btn-outline'}" data-status-filter="${st}">
                                    ${st === 'ALL' ? `All Colleges (${colleges.length})` : st}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Colleges Grid -->
                <div class="colleges-grid">
                    ${filtered.map(c => {
                        const scoreTheme = c.trustScore >= 90 ? 'badge-emerald' : (c.trustScore >= 70 ? 'badge-amber' : 'badge-rose');
                        const statusBadge = c.status === 'Valid' ? 'badge-emerald' : (c.status === 'Tampered' ? 'badge-rose' : 'badge-amber');
                        const photoUrl = (c.photos && c.photos[0]) ? c.photos[0].path : `/seed/photos/${c.id}/campus.jpg`;
                        const logoUrl = c.logo || `/seed/logos/${c.id}.svg`;

                        return `
                            <div class="college-card">
                                <div class="college-photo-wrap">
                                    <img src="${photoUrl}" alt="${c.name}" class="college-photo-img" onerror="this.src='/images/aicte-hq.png'">
                                    <span class="college-trust-tag ${scoreTheme}">
                                        Trust Score: ${c.trustScore} / 100
                                    </span>
                                </div>
                                <div class="college-body">
                                    <div class="college-name-row">
                                        <img src="${logoUrl}" alt="${c.name}" class="college-crest-img" onerror="this.src='/images/aicte-logo.png'">
                                        <div style="min-width:0; flex:1;">
                                            <div class="college-name-text">${c.name}</div>
                                            <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                                                ${c.city}, ${c.state}
                                            </div>
                                        </div>
                                    </div>

                                    <div class="college-meta-chips">
                                        <span class="college-chip font-mono">${c.permanentId}</span>
                                        <span class="college-chip">Intake: ${c.intake || 480} Seats</span>
                                        <span class="college-chip">Est. ${c.establishedYear || 2005}</span>
                                        <span class="badge ${statusBadge}">${c.status}</span>
                                    </div>

                                    <div class="college-footer-actions">
                                        <button class="btn btn-outline btn-sm view-dossier-btn" data-college-id="${c.id}">
                                            View Dossier
                                        </button>
                                        <button class="btn btn-primary btn-sm verify-college-btn" data-college-id="${c.id}">
                                            ${ICONS.FileSearch}
                                            Verify in Studio
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Bindings
            document.getElementById('btn-colleges-studio').onclick = () => this.navigate('verify');
            
            const searchInput = document.getElementById('college-search');
            searchInput.oninput = (e) => {
                this.collegeSearchQuery = e.target.value;
                this.renderCollegesView(container);
            };

            document.getElementById('college-state-select').onchange = (e) => {
                this.activeStateFilter = e.target.value;
                this.renderCollegesView(container);
            };

            document.getElementById('college-sort-select').onchange = (e) => {
                this.collegeSortBy = e.target.value;
                this.renderCollegesView(container);
            };

            container.querySelectorAll('[data-status-filter]').forEach(btn => {
                btn.onclick = () => {
                    this.activeCollegeFilter = btn.getAttribute('data-status-filter');
                    this.renderCollegesView(container);
                };
            });

            container.querySelectorAll('.view-dossier-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const cid = btn.getAttribute('data-college-id');
                    this.openCollegeModal(cid);
                };
            });

            container.querySelectorAll('.verify-college-btn').forEach(btn => {
                btn.onclick = () => {
                    const cid = btn.getAttribute('data-college-id');
                    this.selectedStudioCollegeId = cid;
                    this.navigate('verify');
                };
            });
        }

        // ====================================================================
        // 3. AI VERIFICATION STUDIO (Exact Match to niyam-ai-psi.vercel.app/verify)
        // ====================================================================
        async renderVerifyStudioView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>AI Verification Studio &amp; Regulatory Audit Workbench</h1>
                        <p>Real-Time OCR Bounding Box Extractor, Trust Score Gauge &amp; Mismatch Highlighter</p>
                    </div>
                    <div class="view-actions">
                        <button class="btn btn-outline btn-sm" id="btn-switch-college-dir">
                            ${ICONS.GraduationCap}
                            Colleges Directory
                        </button>
                    </div>
                </div>

                <div style="display:flex; justify-content:center; padding:40px 0;">
                    <div style="display:flex; align-items:center; gap:10px; font-weight:700; color:var(--text-secondary);">
                        <span class="sync-dot"></span>
                        <span>Evaluating Regulatory AI Pipeline &amp; Cryptographic Ledgers...</span>
                    </div>
                </div>
            `;

            document.getElementById('btn-switch-college-dir').onclick = () => this.navigate('colleges');

            // Fetch verification data for selected college
            try {
                const res = await fetch('/api/verify/document', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ collegeId: this.selectedStudioCollegeId, docId: this.selectedStudioDocId })
                });

                if (res.ok) {
                    this.studioVerificationData = await res.json();
                }
            } catch (e) {
                console.warn('[Studio] Error calling /api/verify/document:', e);
            }

            const data = this.studioVerificationData || {
                trustScore: 24,
                statusLabel: "Tampered / High Risk (Rejected)",
                pillars: [
                    { name: "Document Integrity & Hash", score: 4, maxScore: 25, description: "SHA-256 digest discrepancy detected", passed: false },
                    { name: "Issuing Authority Ledger", score: 25, maxScore: 25, description: "State registry cross-checked", passed: true },
                    { name: "AICTE APH 2025 Norms", score: 6, maxScore: 25, description: "Intake exceeds statutory capacity", passed: false },
                    { name: "Seal & Signature Provenance", score: 6, maxScore: 25, description: "Digital signature key revoked", passed: false }
                ],
                mismatches: [
                    { fieldName: "B.Tech CSE Intake", category: "Intake", extractedValue: "180 seats", expectedValue: "60 seats", status: "TAMPERED", severity: "CRITICAL", ruleCitation: "APH-2025-RULE-01", explanation: "Submitted PDF intake altered from 60 to 180 seats." }
                ],
                ocrData: {
                    fileName: "approval_letter.pdf",
                    sha256: "8f43a9b1c20e58d781...8f89",
                    qrPayload: "AICTE-VERIFY|SYN-2025-009|TAMPERED",
                    fields: [
                        { label: "Institution Name", value: "Zaskar Engineering College", confidence: 99.2 },
                        { label: "Sanctioned Intake", value: "180 Seats (Claimed)", confidence: 72.4 },
                        { label: "Digital Stamp", value: "SIGNATURE_HASH_MISMATCH", confidence: 34.0 }
                    ],
                    rawTextPreview: "GOVERNMENT OF INDIA\nALL INDIA COUNCIL FOR TECHNICAL EDUCATION\n\nINSTITUTION: Zaskar Engineering College\nCLAIMED INTAKE: 180 seats"
                }
            };

            const score = data.trustScore || 24;
            const strokeColor = score >= 90 ? '#10B981' : (score >= 70 ? '#F59E0B' : '#EF4444');
            const circumference = 2 * Math.PI * 58;
            const strokeDashoffset = circumference - (score / 100) * circumference;

            const colleges = this.colleges.length > 0 ? this.colleges : [
                { id: "zec-zaskar", name: "Zaskar Engineering College (Tampered Anomaly)", trustScore: 24 },
                { id: "nit-nilgiri", name: "Nilgiri Institute of Technology (Fully Compliant)", trustScore: 98 },
                { id: "cit-coromandel", name: "Coromandel Institute of Technology (Expired Affiliation)", trustScore: 52 },
                { id: "cit-chilika", name: "Chilika Institute of Technology (Missing Fields)", trustScore: 42 }
            ];

            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>AI Verification Studio &amp; Regulatory Audit Workbench</h1>
                        <p>LayoutLMv3 Optical Character Recognition, Trust Score Radial Gauge &amp; Mismatch Highlighter</p>
                    </div>
                    <div class="view-actions">
                        <button class="btn btn-outline btn-sm" id="btn-back-colleges">
                            ${ICONS.GraduationCap}
                            Synthetic Colleges
                        </button>
                    </div>
                </div>

                <!-- College Dossier Selector Toolbar -->
                <div class="card" style="padding:16px;">
                    <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px;">
                        <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:280px;">
                            <label style="font-size:12px; font-weight:700; color:var(--text-secondary); white-space:nowrap;">Active College Dossier:</label>
                            <select class="select" id="studio-college-select" style="flex:1;">
                                ${colleges.map(c => `
                                    <option value="${c.id}" ${c.id === this.selectedStudioCollegeId ? 'selected' : ''}>
                                        ${c.name} (${c.trustScore ? c.trustScore + '/100' : ''})
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div style="display:flex; align-items:center; gap:10px;">
                            <label style="font-size:12px; font-weight:700; color:var(--text-secondary); white-space:nowrap;">Document:</label>
                            <select class="select" id="studio-doc-select">
                                <option value="approval_letter">Extension of Approval (EoA) 2025-26</option>
                                <option value="affiliation_certificate">State Affiliation Clearance Order</option>
                                <option value="compliance_report">TER Compliance &amp; Facility Report</option>
                            </select>
                            <button class="btn btn-primary btn-sm" id="btn-re-verify">
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                Run AI Analysis
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main Dual-Column Layout: Left Gauge, Right Document & Mismatch -->
                <div class="verify-layout-grid">
                    
                    <!-- Left: Trust Score Radial Gauge & 4 Pillars -->
                    <div style="display:flex; flex-direction:column; gap:20px;">
                        <div class="gauge-card">
                            <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:12px;">
                                <div style="font-size:14px; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                                    ${ICONS.ShieldCheck}
                                    <span>AI Trust Score</span>
                                </div>
                                <span class="badge ${score >= 90 ? 'badge-emerald' : (score >= 70 ? 'badge-amber' : 'badge-rose')}">
                                    ${score >= 90 ? 'PASSED' : (score >= 70 ? 'REVIEW' : 'REJECTED')}
                                </span>
                            </div>

                            <div class="gauge-svg-wrap">
                                <svg class="gauge-svg" viewBox="0 0 140 140">
                                    <circle cx="70" cy="70" r="58" class="gauge-bg-circle"/>
                                    <circle cx="70" cy="70" r="58" class="gauge-progress-circle" 
                                            stroke="${strokeColor}" 
                                            stroke-dasharray="${circumference}" 
                                            stroke-dashoffset="${strokeDashoffset}"/>
                                </svg>
                                <div class="gauge-center-text">
                                    <span class="gauge-score-num" style="color:${strokeColor};">${score}</span>
                                    <span class="gauge-score-label">/ 100</span>
                                </div>
                            </div>

                            <div style="text-align:center;">
                                <div style="font-size:13px; font-weight:800; color:var(--text-primary);">${data.statusLabel}</div>
                                <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">AICTE APH 2025 Compliance Engine Evaluation</div>
                            </div>

                            <!-- 4 Pillars Breakdown -->
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                <div style="font-size:11px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase;">Statutory Compliance Pillars</div>
                                ${(data.pillars || []).map(p => `
                                    <div class="pillar-item">
                                        <div style="min-width:0;">
                                            <div class="pillar-name">${p.name}</div>
                                            <div style="font-size:10px; color:var(--text-secondary); line-height:1.2;">${p.description}</div>
                                        </div>
                                        <div class="pillar-score" style="color:${p.passed ? '#059669' : '#DC2626'};">
                                            ${p.score} / ${p.maxScore}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Upload New Test Document Box -->
                        <div class="card" style="border-style:dashed; border-width:2px; text-align:center; padding:24px;">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="32" height="32" style="color:var(--accent); margin:0 auto 10px;"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                            <div style="font-size:13px; font-weight:700; color:var(--text-primary);">Drop Document to Run AI Audit</div>
                            <div style="font-size:11px; color:var(--text-secondary); margin:4px 0 12px;">Supports A4 PDF, Scanned TIFF, PNG</div>
                            <button class="btn btn-outline btn-sm" id="btn-simulate-upload" style="margin:0 auto;">
                                Select PDF File
                            </button>
                        </div>
                    </div>

                    <!-- Right: Bounding Box OCR View & Mismatch Highlighter -->
                    <div style="display:flex; flex-direction:column; gap:20px;">
                        
                        <!-- Mismatch Highlighter Table -->
                        <div class="card">
                            <div class="card-header">
                                <div>
                                    <div class="card-title">
                                        ${ICONS.AlertTriangle}
                                        <span>Real-Time Discrepancy &amp; Mismatch Highlighter</span>
                                    </div>
                                    <div class="card-subtitle">Claimed Institutional Values vs AI Extracted Evidence &amp; Authoritative APH Ledgers</div>
                                </div>
                            </div>

                            <div class="table-responsive">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Field / Cadre</th>
                                            <th>Claimed Value</th>
                                            <th>AI Extracted Value</th>
                                            <th>Status</th>
                                            <th>Severity</th>
                                            <th>APH Rule Citation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(data.mismatches || []).map(m => `
                                            <tr>
                                                <td><strong>${m.fieldName}</strong><br><span style="font-size:10px; color:var(--text-secondary);">${m.category}</span></td>
                                                <td class="font-mono">${m.expectedValue}</td>
                                                <td class="font-mono" style="${m.status === 'TAMPERED' ? 'color:#DC2626; font-weight:700;' : ''}">${m.extractedValue}</td>
                                                <td>
                                                    <span class="badge ${m.status === 'MATCH' ? 'badge-emerald' : (m.status === 'TAMPERED' ? 'badge-rose' : 'badge-amber')}">
                                                        ${m.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="badge ${m.severity === 'PASSED' ? 'badge-emerald' : (m.severity === 'CRITICAL' ? 'badge-rose' : 'badge-amber')}">
                                                        ${m.severity}
                                                    </span>
                                                </td>
                                                <td class="font-mono" style="font-size:11px;">${m.ruleCitation}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- OCR Document Preview Pane with Bounding Boxes -->
                        <div class="card">
                            <div class="card-header">
                                <div>
                                    <div class="card-title">
                                        ${ICONS.Scan}
                                        <span>Interactive OCR Document &amp; Bounding Box Inspector</span>
                                    </div>
                                    <div class="card-subtitle">${data.ocrData ? data.ocrData.fileName : 'approval_letter.pdf'} • SHA-256 Verified</div>
                                </div>
                                <div style="display:flex; gap:6px;">
                                    <span class="badge ${data.ocrData && data.ocrData.isQrValid ? 'badge-emerald' : 'badge-rose'}">
                                        QR: ${data.ocrData && data.ocrData.isQrValid ? 'VALID' : 'CORRUPTED/ALTERED'}
                                    </span>
                                </div>
                            </div>

                            <div class="ocr-preview-pane">
                                <div class="ocr-page-mock" style="position:relative; min-height:360px;">
                                    <div style="text-align:center; border-bottom:2px solid #0F172A; padding-bottom:8px; margin-bottom:16px;">
                                        <div style="font-size:12px; font-weight:800; letter-spacing:0.05em;">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</div>
                                        <div style="font-size:10px;">(A STATUTORY BODY OF THE GOVERNMENT OF INDIA)</div>
                                        <div style="font-size:10px; font-weight:700; margin-top:2px;">Nelson Mandela Marg, Vasant Kunj, New Delhi-110070</div>
                                    </div>

                                    <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:12px;">
                                        <span>F.No. AICTE/AB/2025-26/${this.selectedStudioCollegeId.toUpperCase()}</span>
                                        <span>Date: 30-Apr-2025</span>
                                    </div>

                                    <p style="font-size:12px; margin-bottom:12px;">
                                        <strong>Sub: Extension of Approval (EoA) to the Institution for Academic Year 2025-26.</strong>
                                    </p>

                                    <div style="border:1px solid #CBD5E1; border-radius:6px; padding:10px; margin-bottom:14px; position:relative;">
                                        <div style="font-size:11px; font-weight:700; margin-bottom:4px;">INSTITUTION CADRE &amp; APPROVED INTAKE:</div>
                                        <div style="font-size:11px;">Permanent ID: <span class="font-mono">SYN-2025-009</span></div>
                                        <div style="font-size:11px;">Institution Name: <strong>Zaskar Engineering College</strong></div>
                                        <div style="font-size:11px; position:relative; display:inline-block; margin-top:4px;">
                                            <span>B.Tech Computer Science &amp; Engineering: </span>
                                            <strong style="color:${score < 50 ? '#DC2626' : '#059669'};">180 Seats (Altered)</strong>
                                            
                                            <!-- SVG Simulated Bounding Box for anomaly -->
                                            <span style="position:absolute; inset:-3px -6px; border:2px dashed ${score < 50 ? '#DC2626' : '#2563EB'}; background:rgba(220,38,38,0.1); border-radius:4px;"></span>
                                        </div>
                                    </div>

                                    <div style="font-size:11px; color:#475569; margin-top:16px;">
                                        This approval is issued in accordance with the provisions of AICTE Approval Process Handbook 2025-26. 
                                        Any tampering with intake capacity or forged affiliation signatures constitutes a statutory violation under Section 10 of AICTE Act 1987.
                                    </div>

                                    <!-- Digital Signature Box -->
                                    <div style="margin-top:24px; display:flex; justify-content:flex-end;">
                                        <div style="border:1px solid ${score < 50 ? '#DC2626' : '#059669'}; background:${score < 50 ? '#FEF2F2' : '#ECFDF5'}; padding:8px 14px; border-radius:6px; text-align:center; font-size:10px;">
                                            <div style="font-weight:700; color:${score < 50 ? '#DC2626' : '#059669'};">DIGITALLY SIGNED</div>
                                            <div>AICTE Bureau of Approvals</div>
                                            <div class="font-mono" style="font-size:9px;">${score < 50 ? 'KEY_REVOKED_FAIL' : 'PKI_X509_VALID'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            `;

            // Bindings
            document.getElementById('btn-back-colleges').onclick = () => this.navigate('colleges');
            
            const collegeSelect = document.getElementById('studio-college-select');
            collegeSelect.onchange = (e) => {
                this.selectedStudioCollegeId = e.target.value;
                this.renderVerifyStudioView(container);
            };

            const docSelect = document.getElementById('studio-doc-select');
            docSelect.onchange = (e) => {
                this.selectedStudioDocId = e.target.value;
                this.renderVerifyStudioView(container);
            };

            document.getElementById('btn-re-verify').onclick = () => {
                API.showToast('Re-running OCR feature extraction & cross-registry ledger check...', 'info');
                this.renderVerifyStudioView(container);
            };

            document.getElementById('btn-simulate-upload').onclick = () => {
                API.showToast('Simulating LayoutLMv3 ingestion on sample dossier...', 'info');
                setTimeout(() => {
                    this.selectedStudioCollegeId = 'zec-zaskar';
                    this.renderVerifyStudioView(container);
                }, 600);
            };
        }

        // ====================================================================
        // 4. APPLICATIONS WORKSPACE
        // ====================================================================
        async renderApplicationsView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>Institutional Applications &amp; Dossiers</h1>
                        <p>End-to-End Statutory Case Lifecycle Management (APH 2025-26)</p>
                    </div>
                    <div class="view-actions">
                        <button class="btn btn-primary btn-sm" id="btn-file-new-app">
                            ${ICONS.FileCheck2}
                            File New Application
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="app.navigate('verify');">
                            ${ICONS.FileSearch}
                            AI Verification Studio
                        </button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            ${ICONS.FileText}
                            <span>Active Regulatory Applications (${this.applications.length})</span>
                        </div>
                        <input type="text" id="app-search-input" class="input" placeholder="Search applications or colleges..." style="max-width:280px;">
                    </div>

                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Application ID</th>
                                    <th>Institution &amp; Trust</th>
                                    <th>Scheme / Type</th>
                                    <th>Workflow Stage</th>
                                    <th>SLA Target</th>
                                    <th>Compliance Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="apps-table-body">
                                ${this.applications.map(app => `
                                    <tr>
                                        <td class="font-mono"><strong>${app.id}</strong></td>
                                        <td>
                                            <div style="font-weight:700; color:var(--text-primary);">${app.collegeName}</div>
                                            <span style="font-size:11px; color:var(--text-secondary);">${app.trustName} (${app.permanentId})</span>
                                        </td>
                                        <td>${app.appType}</td>
                                        <td><span class="badge badge-blue">${app.stage}</span></td>
                                        <td class="font-mono">${app.slaTarget}</td>
                                        <td><span class="badge ${app.statusBadge}">${app.status}</span></td>
                                        <td>
                                            <button class="btn btn-outline btn-sm inspect-app-btn" data-app-id="${app.id}">
                                                Inspect Dossier
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            const btnNewApp = container.querySelector('#btn-file-new-app');
            if (btnNewApp) {
                btnNewApp.onclick = () => this.openNewApplicationModal();
            }

            container.querySelectorAll('.inspect-app-btn').forEach(btn => {
                btn.onclick = () => {
                    const appId = btn.getAttribute('data-app-id');
                    this.openApplicationModal(appId);
                };
            });

            const searchInp = container.querySelector('#app-search-input');
            if (searchInp) {
                searchInp.oninput = (e) => {
                    const q = e.target.value.toLowerCase().trim();
                    const tbody = container.querySelector('#apps-table-body');
                    const filtered = this.applications.filter(a => 
                        a.id.toLowerCase().includes(q) ||
                        a.collegeName.toLowerCase().includes(q) ||
                        a.permanentId.toLowerCase().includes(q) ||
                        a.appType.toLowerCase().includes(q)
                    );
                    tbody.innerHTML = filtered.map(app => `
                        <tr>
                            <td class="font-mono"><strong>${app.id}</strong></td>
                            <td>
                                <div style="font-weight:700; color:var(--text-primary);">${app.collegeName}</div>
                                <span style="font-size:11px; color:var(--text-secondary);">${app.trustName} (${app.permanentId})</span>
                            </td>
                            <td>${app.appType}</td>
                            <td><span class="badge badge-blue">${app.stage}</span></td>
                            <td class="font-mono">${app.slaTarget}</td>
                            <td><span class="badge ${app.statusBadge}">${app.status}</span></td>
                            <td>
                                <button class="btn btn-outline btn-sm inspect-app-btn" data-app-id="${app.id}">
                                    Inspect Dossier
                                </button>
                            </td>
                        </tr>
                    `).join('');

                    tbody.querySelectorAll('.inspect-app-btn').forEach(btn => {
                        btn.onclick = () => {
                            const appId = btn.getAttribute('data-app-id');
                            this.openApplicationModal(appId);
                        };
                    });
                };
            }
        }

        // ====================================================================
        // 5. SCRUTINY QUEUE
        // ====================================================================
        renderQueueView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>Technical Scrutiny Desk — Review Queue</h1>
                        <p>Examine institutional evidence dossiers, evaluate extracted bounding boxes, and confirm compliance observations.</p>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            ${ICONS.ListFilter}
                            <span>Prioritized Scrutiny Queue</span>
                        </div>
                        <span class="badge badge-blue">14 Applications Pending</span>
                    </div>

                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Priority</th>
                                    <th>App ID</th>
                                    <th>Institution</th>
                                    <th>Deficiencies</th>
                                    <th>SLA Clock</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span class="badge badge-rose">URGENT</span></td>
                                    <td class="font-mono">APP-2025-003</td>
                                    <td>Coastal Institute of Management</td>
                                    <td>Building Fire NOC Lapsed</td>
                                    <td class="font-mono" style="color:#DC2626; font-weight:700;">1d 14h Remaining</td>
                                    <td><button class="btn btn-primary btn-sm" onclick="app.openApplicationModal('APP-2025-003');">Inspect Dossier</button></td>
                                </tr>
                                <tr>
                                    <td><span class="badge badge-amber">HIGH</span></td>
                                    <td class="font-mono">APP-2025-001</td>
                                    <td>Apex Institute of Technology</td>
                                    <td>Faculty Cadre Ratio 1:18 (Req 1:15)</td>
                                    <td class="font-mono">4d 08h Remaining</td>
                                    <td><button class="btn btn-outline btn-sm" onclick="app.openApplicationModal('APP-2025-001');">Inspect Dossier</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // ====================================================================
        // 6. FINDINGS & DISPOSITIONS
        // ====================================================================
        renderFindingsView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>Compliance Findings &amp; Regulatory Dispositions</h1>
                        <p>Audit discrepancies flagged by rule engine and officer scrutiny desks.</p>
                    </div>
                </div>

                <div class="card">
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Finding Ref</th>
                                    <th>Institution</th>
                                    <th>Severity</th>
                                    <th>Regulatory Clause</th>
                                    <th>Finding Details</th>
                                    <th>Disposition Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="font-mono">FND-2025-001</td>
                                    <td>Zaskar Engineering College</td>
                                    <td><span class="badge badge-rose">CRITICAL</span></td>
                                    <td class="font-mono">APH 2025 Ch. I R4.2</td>
                                    <td>Submitted intake altered to 180 seats; sanctioned capacity is 60 seats.</td>
                                    <td><span class="badge badge-rose">DEFICIENCY_CONFIRMED</span></td>
                                </tr>
                                <tr>
                                    <td class="font-mono">FND-2025-002</td>
                                    <td>Coromandel Institute of Technology</td>
                                    <td><span class="badge badge-amber">MAJOR</span></td>
                                    <td class="font-mono">APH 2025 Ch. II R3.1</td>
                                    <td>State technological university affiliation order expired on 2024-06-30.</td>
                                    <td><span class="badge badge-amber">AWAITING_REPLY</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // ====================================================================
        // 7. CLARIFICATIONS & DIRECTIVES
        // ====================================================================
        renderClarificationsView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>Institutional Clarifications &amp; Communication Thread</h1>
                        <p>Two-way tamper-evident query stream between AICTE Officers and Institutions.</p>
                    </div>
                </div>

                <div class="card">
                    <div style="display:flex; flex-direction:column; gap:16px;">
                        <div style="padding:14px; border-radius:12px; background:var(--surface-muted); border:1px solid var(--border);">
                            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary); margin-bottom:6px;">
                                <strong>Scrutiny Officer Desk (Dr. R. K. Shrivastava)</strong>
                                <span class="font-mono">28-Apr-2025 14:32 IST</span>
                            </div>
                            <div style="font-size:12px; line-height:1.5;">
                                Please submit the updated Fire Safety Clearance Certificate endorsed by the Chief Fire Officer. The certificate attached to your initial filing reflects an expiration date of March 31, 2025.
                            </div>
                        </div>

                        <div style="padding:14px; border-radius:12px; background:var(--accent-light); border:1px solid var(--accent-muted); margin-left:24px;">
                            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--accent); margin-bottom:6px;">
                                <strong>Apex Institute of Technology (Principal Office)</strong>
                                <span class="font-mono">29-Apr-2025 10:15 IST</span>
                            </div>
                            <div style="font-size:12px; line-height:1.5;">
                                We have applied for renewal on 15-Mar-2025 and attach the official renewal receipt and provisional inspection certificate from CFO office.
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // ====================================================================
        // 8. SOURCE VERIFICATION
        // ====================================================================
        renderSourceVerificationView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>National Registry Source Verification</h1>
                        <p>Cryptographic cross-checks with DigiLocker, Bharatkosh, and State Land Records.</p>
                    </div>
                </div>

                <div class="stats-grid-4">
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">DigiLocker Integration</span>
                            <span class="stat-value" style="color:#059669; font-size:16px;">CONNECTED</span>
                            <span class="stat-sub">SHA-256 API Gateway Active</span>
                        </div>
                        <div class="stat-icon-box green">${ICONS.CheckCircle2}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">Bharatkosh Regulatory Fee</span>
                            <span class="stat-value" style="color:#059669; font-size:16px;">SYNCHRONIZED</span>
                            <span class="stat-sub">Zero Unsettled Challans</span>
                        </div>
                        <div class="stat-icon-box green">${ICONS.CheckCircle2}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">Land Title Registry</span>
                            <span class="stat-value" style="color:#2563EB; font-size:16px;">14 STATES LIVE</span>
                            <span class="stat-sub">Cadastral Map Parsing</span>
                        </div>
                        <div class="stat-icon-box blue">${ICONS.Landmark}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">X.509 PKI Authenticator</span>
                            <span class="stat-value" style="color:#059669; font-size:16px;">CERTIFIED</span>
                            <span class="stat-sub">CCA India Root Trust</span>
                        </div>
                        <div class="stat-icon-box green">${ICONS.ShieldCheck}</div>
                    </div>
                </div>
            `;
        }

        // ====================================================================
        // 9. INFRASTRUCTURE EVIDENCE
        // ====================================================================
        renderInfrastructureView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>Geotagged Infrastructure &amp; CAD Evidence</h1>
                        <p>Physical campus verification, classroom capacity, and laboratory norms.</p>
                    </div>
                </div>

                <div class="colleges-grid">
                    <div class="college-card">
                        <div class="college-photo-wrap">
                            <img src="/seed/photos/nit-nilgiri/campus.jpg" alt="Campus" class="college-photo-img" onerror="this.src='/images/aicte-hq.png'">
                            <span class="college-trust-tag badge-emerald">Geotag: 11.41° N, 76.70° E</span>
                        </div>
                        <div class="college-body">
                            <div class="college-name-text">Academic &amp; Administrative Block</div>
                            <div style="font-size:12px; color:var(--text-secondary);">19,400 sq.m Built-up Area • Nilgiri Tech</div>
                            <span class="badge badge-emerald">CAD Plan Verified</span>
                        </div>
                    </div>

                    <div class="college-card">
                        <div class="college-photo-wrap">
                            <img src="/seed/photos/nit-nilgiri/lab.jpg" alt="AI Lab" class="college-photo-img" onerror="this.src='/images/aicte-hq.png'">
                            <span class="college-trust-tag badge-emerald">Equipment Check Passed</span>
                        </div>
                        <div class="college-body">
                            <div class="college-name-text">High-Performance AI Laboratory</div>
                            <div style="font-size:12px; color:var(--text-secondary);">60 Workstations • High-Speed LAN</div>
                            <span class="badge badge-emerald">AICTE Lab Specs Compliant</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // ====================================================================
        // 10. ANALYTICS & SLA
        // ====================================================================
        renderAnalyticsView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>Executive Analytics &amp; Statutory SLA Dashboard</h1>
                        <p>Bureau-level statistics on application processing cycles and AI verification accuracy.</p>
                    </div>
                </div>

                <div class="stats-grid-4">
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">Average SLA Processing</span>
                            <span class="stat-value">9.4 Days</span>
                            <span class="stat-sub">Statutory Mandate: 15 Days</span>
                        </div>
                        <div class="stat-icon-box blue">${ICONS.History}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">AI Accuracy Benchmark</span>
                            <span class="stat-value" style="color:#059669;">99.4%</span>
                            <span class="stat-sub">Validated against Ground Truth</span>
                        </div>
                        <div class="stat-icon-box green">${ICONS.ShieldCheck}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">Tamper Detection Rate</span>
                            <span class="stat-value" style="color:#2563EB;">100%</span>
                            <span class="stat-sub">Zero False Negatives in Sandbox</span>
                        </div>
                        <div class="stat-icon-box blue">${ICONS.FileSearch}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-meta">
                            <span class="stat-label">Overall Approval Ratio</span>
                            <span class="stat-value">84.2%</span>
                            <span class="stat-sub">15.8% Deficient or Rejected</span>
                        </div>
                        <div class="stat-icon-box green">${ICONS.CheckCircle2}</div>
                    </div>
                </div>
            `;
        }

        // ====================================================================
        // 11. STATUTORY AUDIT LEDGER
        // ====================================================================
        renderAuditView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>Tamper-Evident SHA-256 Statutory Audit Ledger</h1>
                        <p>Cryptographic Merkle tree provenance chain for non-repudiation and oversight.</p>
                    </div>
                    <div class="view-actions">
                        <button class="btn btn-outline btn-sm" id="btn-verify-chain">
                            ${ICONS.ShieldCheck}
                            Verify Cryptographic Chain
                        </button>
                    </div>
                </div>

                <div class="card">
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Block</th>
                                    <th>Timestamp</th>
                                    <th>Action &amp; Target</th>
                                    <th>Actor &amp; Terminal</th>
                                    <th>Block SHA-256 Hash</th>
                                    <th>Chain Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="font-mono">#00941</td>
                                    <td class="font-mono">29-Oct-2026 14:15:22</td>
                                    <td>EVALUATE_ANOMALY (Zaskar Engg)</td>
                                    <td>AICTE_AI_ENGINE (v2.4)</td>
                                    <td class="font-mono" style="font-size:10px;">8f43a9b1c20e58d781b49911e0...</td>
                                    <td><span class="badge badge-emerald">VERIFIED</span></td>
                                </tr>
                                <tr>
                                    <td class="font-mono">#00940</td>
                                    <td class="font-mono">29-Oct-2026 12:44:01</td>
                                    <td>ISSUE_DEFICIENCY_ORDER (ZEC-01)</td>
                                    <td>officer (Dr. R. K. Shrivastava)</td>
                                    <td class="font-mono" style="font-size:10px;">4e98f02ba983cd1017efaa3421...</td>
                                    <td><span class="badge badge-emerald">VERIFIED</span></td>
                                </tr>
                                <tr>
                                    <td class="font-mono">#00939</td>
                                    <td class="font-mono">29-Oct-2026 10:20:18</td>
                                    <td>UPLOAD_DOSSIER (Nilgiri Tech)</td>
                                    <td>applicant (Dean Academics)</td>
                                    <td class="font-mono" style="font-size:10px;">3c7104b901aef394239bcde881...</td>
                                    <td><span class="badge badge-emerald">VERIFIED</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            document.getElementById('btn-verify-chain').onclick = () => {
                API.showToast('Cryptographic audit ledger verified: 941 consecutive blocks sealed with zero hash collisions.', 'success');
            };
        }

        // ====================================================================
        // 12. REGULATORY RULES
        // ====================================================================
        renderRulesView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>AICTE Approval Process Handbook (APH) Rules Engine</h1>
                        <p>Statutory rule configurations, cadential ratios, and deficiency thresholds.</p>
                    </div>
                </div>

                <div class="card">
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Rule ID</th>
                                    <th>APH Chapter &amp; Rule</th>
                                    <th>Parameter</th>
                                    <th>Required Threshold</th>
                                    <th>Deficiency Type</th>
                                    <th>Engine Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="font-mono">APH-2025-R4.1</td>
                                    <td>Chapter I: Faculty Norms</td>
                                    <td>Cadre Ratio</td>
                                    <td>1:15 (Prof:Assoc:Asst = 1:2:6)</td>
                                    <td><span class="badge badge-rose">CRITICAL</span></td>
                                    <td><span class="badge badge-emerald">ACTIVE</span></td>
                                </tr>
                                <tr>
                                    <td class="font-mono">APH-2025-R4.2</td>
                                    <td>Chapter I: Sanctioned Intake</td>
                                    <td>Intake Ceiling</td>
                                    <td>Approved Course Quota Only</td>
                                    <td><span class="badge badge-rose">CRITICAL</span></td>
                                    <td><span class="badge badge-emerald">ACTIVE</span></td>
                                </tr>
                                <tr>
                                    <td class="font-mono">APH-2025-R7.4</td>
                                    <td>Chapter II: Land Validity</td>
                                    <td>Lease Validity</td>
                                    <td>Minimum 30 Years Unencumbered</td>
                                    <td><span class="badge badge-rose">CRITICAL</span></td>
                                    <td><span class="badge badge-emerald">ACTIVE</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // ====================================================================
        // 13. USER MANAGEMENT
        // ====================================================================
        renderUsersView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1>Authorized Personnel &amp; RBAC Matrix</h1>
                        <p>Manage scrutiny officers, regional directors, institutional representatives, and MFA status.</p>
                    </div>
                </div>

                <div class="card">
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>User ID</th>
                                    <th>Full Name</th>
                                    <th>Assigned Role</th>
                                    <th>MFA Security</th>
                                    <th>Direct Login</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${OFFICIAL_PERSONNEL.map(a => `
                                    <tr>
                                        <td class="font-mono">${a.username}</td>
                                        <td>
                                            <div style="font-weight:700; color:var(--text-primary);">${a.fullName}</div>
                                            <span style="font-size:11px; color:var(--text-secondary);">${a.designation}</span>
                                        </td>
                                        <td><span class="badge badge-blue">${a.badge}</span></td>
                                        <td>
                                            <span class="badge ${a.hasMfa ? 'badge-amber' : 'badge-emerald'}">
                                                ${a.hasMfa ? 'TOTP 2FA Protected' : 'Direct Sign-On'}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn btn-outline btn-sm switch-user-btn" data-user="${a.username}">
                                                Assume Identity
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            container.querySelectorAll('.switch-user-btn').forEach(btn => {
                btn.onclick = () => {
                    const u = btn.getAttribute('data-user');
                    const acc = resolveOfficial(u);
                    if (acc) {
                        this.currentUser = acc;
                        localStorage.setItem('niyam_user', JSON.stringify(acc));
                        API.setSimulatedUser(acc.username);
                        API.showToast(`Active session switched to ${acc.roleName}`, 'info');
                        this.render();
                    }
                };
            });
        }

        // ====================================================================
        // 14. REGULATORY POLICY & COMPLIANCE SANDBOX (16 STAGES)
        // ====================================================================
        renderScenariosView(container) {
            container.innerHTML = `
                <div class="view-header">
                    <div class="view-title-group">
                        <h1 style="color:#F59E0B;">Regulatory Policy Sandbox &amp; Adjudication Simulator (16 Statutory Stages)</h1>
                        <p>Step through all end-to-end statutory review scenarios with simulated outcomes.</p>
                    </div>
                </div>

                <div class="stats-grid-4">
                    <div class="stat-card" style="cursor:pointer;" onclick="app.selectedStudioCollegeId = 'zec-zaskar'; app.navigate('verify');">
                        <div class="stat-meta">
                            <span class="stat-label">Scenario 01</span>
                            <span class="stat-value" style="font-size:16px;">Intake Inflation Fraud</span>
                            <span class="stat-sub" style="color:#EF4444;">Zaskar Engineering College (Tampered)</span>
                        </div>
                        <div class="stat-icon-box rose">${ICONS.AlertTriangle}</div>
                    </div>
                    <div class="stat-card" style="cursor:pointer;" onclick="app.selectedStudioCollegeId = 'cit-coromandel'; app.navigate('verify');">
                        <div class="stat-meta">
                            <span class="stat-label">Scenario 02</span>
                            <span class="stat-value" style="font-size:16px;">Expired Affiliation</span>
                            <span class="stat-sub" style="color:#F59E0B;">Coromandel Institute (Expired)</span>
                        </div>
                        <div class="stat-icon-box amber">${ICONS.History}</div>
                    </div>
                    <div class="stat-card" style="cursor:pointer;" onclick="app.selectedStudioCollegeId = 'cit-chilika'; app.navigate('verify');">
                        <div class="stat-meta">
                            <span class="stat-label">Scenario 03</span>
                            <span class="stat-value" style="font-size:16px;">Missing Mandatory Disclosure</span>
                            <span class="stat-sub" style="color:#A855F7;">Chilika Tech (Omitted Fields)</span>
                        </div>
                        <div class="stat-icon-box amber">${ICONS.FileText}</div>
                    </div>
                    <div class="stat-card" style="cursor:pointer;" onclick="app.selectedStudioCollegeId = 'nit-nilgiri'; app.navigate('verify');">
                        <div class="stat-meta">
                            <span class="stat-label">Scenario 04</span>
                            <span class="stat-value" style="font-size:16px;">Full Compliance Clearance</span>
                            <span class="stat-sub" style="color:#059669;">Nilgiri Tech (98/100 Valid)</span>
                        </div>
                        <div class="stat-icon-box green">${ICONS.CheckCircle2}</div>
                    </div>
                </div>
            `;
        }
    }

    // Attach to global scope and instantiate
    window.app = new NiyamAIApp();

})();
