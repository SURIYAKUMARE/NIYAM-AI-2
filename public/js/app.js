// ============================================================================
// NIYAM AI - AICTE APPROVAL WORKFLOW & COMPLIANCE MANAGEMENT SYSTEM
// Enterprise Application Controller & State Engine (Problem Statement ID: 26262)
// ============================================================================

class NiyamAIApp {
    constructor() {
        this.isAuthenticated = localStorage.getItem('niyam_is_authenticated') === 'true';
        this.currentView = this.isAuthenticated ? 'dashboard' : 'login';
        this.currentUser = null;
        this.users = [];
        this.selectedAppId = null;
        this.activeFilter = null;
        this.init();
    }

    async init() {
        await this.loadUsers();
        this.bindGlobalEvents();
        this.render();
    }

    async loadUsers() {
        try {
            const data = await API.get('/api/auth/users');
            this.users = data.users;
            const savedId = localStorage.getItem('aicte_current_user_id') || 'USR_ADMIN_01';
            this.currentUser = this.users.find(u => u.id === savedId) || this.users[0];
            API.setSimulatedUser(this.currentUser.id);
            this.updateTopbarUser();
        } catch (e) {
            console.error('Failed to load users:', e);
        }
    }

    bindGlobalEvents() {
        // Navigation clicks
        document.querySelectorAll('.nav-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const view = el.getAttribute('data-view');
                if (view) this.navigate(view);
            });
        });

        // Topbar Role switcher
        const userSelect = document.getElementById('user-switcher-select');
        if (userSelect) {
            userSelect.addEventListener('change', (e) => {
                const u = this.users.find(usr => usr.id === e.target.value);
                if (u) {
                    this.currentUser = u;
                    API.setSimulatedUser(u.id);
                    this.updateTopbarUser();
                    this.navigate(this.currentView);
                }
            });
        }

        window.addEventListener('aicte:userChanged', () => {
            this.navigate(this.currentView);
        });
    }

    updateTopbarUser() {
        const userSelect = document.getElementById('user-switcher-select');
        if (userSelect && this.users.length > 0) {
            userSelect.innerHTML = this.users.map(u => 
                `<option value="${u.id}" ${u.id === this.currentUser.id ? 'selected' : ''}>
                    ${u.full_name} (${u.role_code.replace(/_/g, ' ')})
                </option>`
            ).join('');
        }
        const badge = document.getElementById('topbar-role-badge');
        if (badge && this.currentUser) {
            badge.innerText = this.currentUser.role_code.replace(/_/g, ' ');
        }
        const nameEl = document.getElementById('topbar-user-name');
        if (nameEl && this.currentUser) {
            nameEl.innerText = this.currentUser.full_name;
        }
        const titleEl = document.getElementById('topbar-user-role');
        if (titleEl && this.currentUser) {
            titleEl.innerText = this.currentUser.role_code.replace(/_/g, ' ');
        }
        const avatarEl = document.getElementById('topbar-user-avatar');
        if (avatarEl && this.currentUser) {
            const initials = this.currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            avatarEl.innerText = initials || 'AI';
        }
    }

    loginAs(userId) {
        const u = this.users.find(usr => usr.id === userId);
        if (u) {
            this.currentUser = u;
            API.setSimulatedUser(u.id);
            this.isAuthenticated = true;
            localStorage.setItem('niyam_is_authenticated', 'true');
            this.updateTopbarUser();
            API.showToast(`Authenticated as ${u.full_name} (${u.role_code.replace(/_/g, ' ')})`, 'success');
            this.navigate('dashboard');
        }
    }

    logout() {
        this.isAuthenticated = false;
        localStorage.removeItem('niyam_is_authenticated');
        API.showToast('Logged out successfully.', 'info');
        this.navigate('login');
    }

    navigate(view, params = {}) {
        if (!this.isAuthenticated && view !== 'login') {
            view = 'login';
        }
        this.currentView = view;
        if (params.appId) this.selectedAppId = params.appId;
        if (params.filter) this.activeFilter = params.filter;

        const sidebarEl = document.getElementById('app-sidebar');
        const topbarEl = document.getElementById('app-topbar');

        if (view === 'login') {
            if (sidebarEl) sidebarEl.style.display = 'none';
            if (topbarEl) topbarEl.style.display = 'none';
            const mainWrap = document.querySelector('.main-wrapper');
            if (mainWrap) mainWrap.style.marginLeft = '0';
        } else {
            if (sidebarEl) sidebarEl.style.display = 'flex';
            if (topbarEl) topbarEl.style.display = 'flex';
            const mainWrap = document.querySelector('.main-wrapper');
            if (mainWrap) mainWrap.style.marginLeft = 'var(--sidebar-width)';
        }

        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-view') === view);
        });

        const titleMap = {
            dashboard: 'Executive Overview & Real-Time KPIs',
            applications: 'Approval Applications Lifecycle',
            case_workspace: 'Application Case Workspace',
            scrutiny: 'Scrutiny & Re-Scrutiny Committee Workspace',
            evc: 'Expert Visit Committee (EVC) Operations',
            sac_shc: 'SAC/SHC Appellate & Hearing Proceedings',
            pendency: 'Pendency Monitoring & Bottlenecks',
            compliance: 'Institutional Undertakings Register',
            documents: 'Lease & Mandatory Document Validity',
            alerts: 'Notification & Escalation Center',
            reports: 'Regulatory Reporting & Analytics',
            rules: 'Version-Controlled Regulatory Rules Engine',
            audit: 'Tamper-Evident Cryptographic Audit Trail',
            scenarios: 'Scenario Testing & Demonstration Lab'
        };

        const pageTitleEl = document.getElementById('page-title');
        if (pageTitleEl) pageTitleEl.innerText = titleMap[view] || 'NIYAM AI - AICTE Governance';

        const breadcrumbEl = document.getElementById('breadcrumb-current');
        if (breadcrumbEl) breadcrumbEl.innerText = titleMap[view] || 'Portal';

        this.render();
    }

    async render() {
        const contentEl = document.getElementById('content-area');
        if (!contentEl) return;

        if (this.currentView === 'login') {
            this.renderLogin(contentEl);
            return;
        }

        contentEl.innerHTML = '<div style="padding:40px; text-align:center; color:#687889;">Fetching records from secure database...</div>';

        try {
            switch (this.currentView) {
                case 'dashboard':
                    await this.renderDashboard(contentEl);
                    break;
                case 'applications':
                    await this.renderApplications(contentEl);
                    break;
                case 'case_workspace':
                    await this.renderCaseWorkspace(contentEl, this.selectedAppId);
                    break;
                case 'scrutiny':
                    await this.renderScrutiny(contentEl);
                    break;
                case 'evc':
                    await this.renderEVC(contentEl);
                    break;
                case 'sac_shc':
                    await this.renderSACSHC(contentEl);
                    break;
                case 'pendency':
                    await this.renderPendency(contentEl);
                    break;
                case 'compliance':
                    await this.renderCompliance(contentEl);
                    break;
                case 'documents':
                    await this.renderDocuments(contentEl);
                    break;
                case 'alerts':
                    await this.renderAlerts(contentEl);
                    break;
                case 'reports':
                    await this.renderReports(contentEl);
                    break;
                case 'rules':
                    await this.renderRules(contentEl);
                    break;
                case 'audit':
                    await this.renderAudit(contentEl);
                    break;
                case 'scenarios':
                    await this.renderScenarios(contentEl);
                    break;
                default:
                    contentEl.innerHTML = '<div>View not found</div>';
            }
        } catch (err) {
            contentEl.innerHTML = `<div class="card" style="padding:24px; color:#B83A42; border-color:#FCD4D7; background:#FDF2F2;">
                <h3>Error Loading Module</h3>
                <p>${err.message}</p>
            </div>`;
        }
    }

    // ==========================================
    // VIEW 0: PROFESSIONAL LOGIN PAGE (Section 4)
    // ==========================================
    renderLogin(container) {
        container.innerHTML = `
            <div class="login-page-container">
                <!-- Left Panel: Institutional Branding & Overview -->
                <div class="login-left-panel">
                    <div>
                        <div class="login-brand-header">
                            <div class="login-crest-box">
                                <svg viewBox="0 0 100 100" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="50" cy="50" r="46" fill="#12304A" stroke="#1D4F7A" stroke-width="4"/>
                                    <circle cx="50" cy="50" r="36" fill="none" stroke="#B7791F" stroke-width="2" stroke-dasharray="3,3"/>
                                    <path d="M50 20 L58 36 L76 38 L62 50 L66 68 L50 58 L34 68 L38 50 L24 38 L42 36 Z" fill="#B7791F"/>
                                    <circle cx="50" cy="50" r="10" fill="#12304A"/>
                                    <circle cx="50" cy="50" r="4" fill="#FFFFFF"/>
                                </svg>
                            </div>
                            <div>
                                <div class="login-title-hindi">अखिल भारतीय तकनीकी शिक्षा परिषद</div>
                                <div class="login-title-h1">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</div>
                                <div class="login-product-badge">NIYAM AI • REGULATION BUREAU</div>
                            </div>
                        </div>

                        <div class="login-left-hero">
                            <h2>Integrated Approval Workflow & Compliance Monitoring System</h2>
                            <p>
                                NIYAM AI is the national digital governance platform automating the complete approval lifecycle for technical institutions under statutory AICTE regulations—integrating scrutiny, committee inspections, time-bound compliance, and document validity into a unified tamper-evident architecture.
                            </p>
                        </div>

                        <div class="login-benefits-list">
                            <div class="login-benefit-item">
                                <div class="login-benefit-icon">✓</div>
                                <div>
                                    <div class="login-benefit-title">Workflow Automation</div>
                                    <div class="login-benefit-desc">Automated stage transitions, defect cycles, and committee allocations aligned with official APH handbooks.</div>
                                </div>
                            </div>
                            <div class="login-benefit-item">
                                <div class="login-benefit-icon">✓</div>
                                <div>
                                    <div class="login-benefit-title">Compliance Visibility</div>
                                    <div class="login-benefit-desc">End-to-end tracking of institutional undertakings, conditional sanctions, and land lease deed renewals.</div>
                                </div>
                            </div>
                            <div class="login-benefit-item">
                                <div class="login-benefit-icon">✓</div>
                                <div>
                                    <div class="login-benefit-title">Timely Alerts & Non-Repudiation</div>
                                    <div class="login-benefit-desc">Multi-tier escalation hierarchy and append-only SHA-256 cryptographic audit trails preserving human authority.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="login-left-footer">
                        <div>Problem Statement ID: 26262 | SIH Government Theme: Smart Automation</div>
                        <div style="margin-top:2px; color:#94A3B8;">Demonstration Prototype — Not an Official AICTE Portal</div>
                    </div>
                </div>

                <!-- Right Panel: Secure Login Form -->
                <div class="login-right-panel">
                    <div class="login-form-title">Officer & Institution Sign In</div>
                    <div class="login-form-sub">Access your authorized portal using Council credentials or institutional credentials.</div>

                    <form onsubmit="event.preventDefault(); app.handleFormLogin();">
                        <div class="form-group">
                            <label class="form-label">User ID / Registered Email</label>
                            <input class="form-input" id="login-username" type="text" placeholder="e.g. bureauadmin or registrar@apextech.edu.in" value="superadmin" required />
                        </div>

                        <div class="form-group" style="margin-bottom:18px;">
                            <label class="form-label">Password</label>
                            <div style="position:relative;">
                                <input class="form-input" id="login-password" type="password" value="Password@123" style="width:100%; padding-right:32px;" required />
                                <button type="button" onclick="const p = document.getElementById('login-password'); p.type = p.type === 'password' ? 'text' : 'password';" style="position:absolute; right:8px; top:6px; background:none; border:none; color:#687889; cursor:pointer;">👁</button>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; font-size:12px;">
                            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                <input type="checkbox" checked /> Remember session
                            </label>
                            <a href="#" onclick="alert('For demonstration prototype, please select any of the 10 pre-configured roles below.'); return false;" style="color:var(--gov-blue); text-decoration:none;">Forgot credentials?</a>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width:100%; height:38px; font-size:13px;">
                            Sign In to NIYAM AI Portal →
                        </button>
                    </form>

                    <!-- Pre-Configured 10 Role Picker for Demonstrations -->
                    <div class="login-demo-roles">
                        <div class="login-demo-title">Demonstration Role Quick-Access (10 Roles)</div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px;">
                            <span class="role-chip-btn" onclick="app.loginAs('USR_ADMIN_01')">1. Super Admin</span>
                            <span class="role-chip-btn" onclick="app.loginAs('USR_BUREAU_01')">2. Bureau Officer</span>
                            <span class="role-chip-btn" onclick="app.loginAs('USR_RO_NORTH')">3. Regional Officer (North)</span>
                            <span class="role-chip-btn" onclick="app.loginAs('USR_SCRUTINY_01')">4. Scrutiny Member</span>
                            <span class="role-chip-btn" onclick="app.loginAs('USR_EVC_COORD_01')">5. EVC Coordinator</span>
                            <span class="role-chip-btn" onclick="app.loginAs('USR_EVC_EXPERT_01')">6. EVC Member</span>
                            <span class="role-chip-btn" onclick="app.loginAs('USR_SAC_01')">7. SAC/SHC Member</span>
                            <span class="role-chip-btn" onclick="app.loginAs('USR_REP_01')">8. Institution Admin</span>
                            <span class="role-chip-btn" onclick="app.loginAs('USR_COMPLIANCE_01')">9. Compliance Officer</span>
                            <span class="role-chip-btn" onclick="app.loginAs('USR_AUDITOR_01')">10. Auditor</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    handleFormLogin() {
        const username = document.getElementById('login-username').value.trim();
        const user = this.users.find(u => u.username === username || u.email === username);
        if (user) {
            this.loginAs(user.id);
        } else {
            // Default to Super Admin for smooth demonstration
            this.loginAs('USR_ADMIN_01');
        }
    }

    // ==========================================
    // VIEW 1: EXECUTIVE DASHBOARD & ACTION CENTER (Section 6)
    // ==========================================
    async renderDashboard(container) {
        const [kpis, analytics] = await Promise.all([
            API.get('/api/pendency/kpis'),
            API.get('/api/pendency/analytics')
        ]);

        container.innerHTML = `
            <!-- Priority Action Center (Section 6) -->
            <div class="priority-action-center">
                <div class="priority-header">
                    <span class="priority-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        Priority Administrative Action Center (Immediate Human Attention Required)
                    </span>
                    <span style="font-size:11px; color:#7F1D1D; font-weight:600;">Statutory SLAs Active</span>
                </div>
                <div class="priority-grid">
                    <div class="priority-item" onclick="app.navigate('pendency', { filter: 'OVERDUE' })">
                        <div class="priority-item-title">Overdue Scrutiny Cases</div>
                        <div class="priority-item-value">${kpis.overdueApplications} Cases</div>
                        <div class="priority-item-desc">Exceeded 7-day statutory scrutiny threshold. Open queue →</div>
                    </div>
                    <div class="priority-item" onclick="app.navigate('evc')">
                        <div class="priority-item-title">EVC Scheduling Delays</div>
                        <div class="priority-item-value">${kpis.pendingEVC} Cases</div>
                        <div class="priority-item-desc">Awaiting committee appointment & date confirmation.</div>
                    </div>
                    <div class="priority-item" onclick="app.navigate('compliance')">
                        <div class="priority-item-title">Pending Compliance Verification</div>
                        <div class="priority-item-value">${kpis.pendingCompliance} Undertakings</div>
                        <div class="priority-item-desc">Institutions submitted proof; awaiting officer verification.</div>
                    </div>
                    <div class="priority-item" onclick="app.navigate('documents')">
                        <div class="priority-item-title">Expiring Land Lease Documents</div>
                        <div class="priority-item-value">${kpis.expiringDocuments} Documents</div>
                        <div class="priority-item-desc">Expiring within 60 days. Advance reminders active.</div>
                    </div>
                </div>
            </div>

            <!-- KPI Metric Summary Cards (Section 6) -->
            <div class="kpi-grid">
                <div class="kpi-card" onclick="app.navigate('applications', { filter: 'ALL' })">
                    <div class="kpi-header"><span class="kpi-title">Total Applications</span><div class="kpi-icon accent-blue">📁</div></div>
                    <div class="kpi-value">${kpis.totalApplications}</div>
                    <div class="kpi-subtext">Session 2026-2027 total</div>
                </div>
                <div class="kpi-card" onclick="app.navigate('scrutiny')">
                    <div class="kpi-header"><span class="kpi-title">Under Scrutiny</span><div class="kpi-icon accent-blue">🔍</div></div>
                    <div class="kpi-value">${kpis.pendingScrutiny}</div>
                    <div class="kpi-subtext">Document review stage</div>
                </div>
                <div class="kpi-card" onclick="app.navigate('evc')">
                    <div class="kpi-header"><span class="kpi-title">Pending EVC Cases</span><div class="kpi-icon accent-amber">🏛️</div></div>
                    <div class="kpi-value">${kpis.pendingEVC}</div>
                    <div class="kpi-subtext">Physical inspections</div>
                </div>
                <div class="kpi-card" onclick="app.navigate('sac_shc')">
                    <div class="kpi-header"><span class="kpi-title">Awaiting SAC/SHC</span><div class="kpi-icon accent-amber">⚖️</div></div>
                    <div class="kpi-value">${kpis.awaitingSAC}</div>
                    <div class="kpi-subtext">Appellate proceedings</div>
                </div>
                <div class="kpi-card" onclick="app.navigate('compliance')">
                    <div class="kpi-header"><span class="kpi-title">Pending Compliance</span><div class="kpi-icon accent-blue">📋</div></div>
                    <div class="kpi-value">${kpis.pendingCompliance}</div>
                    <div class="kpi-subtext">Conditional undertakings</div>
                </div>
                <div class="kpi-card" onclick="app.navigate('documents')">
                    <div class="kpi-header"><span class="kpi-title">Expiring Soon</span><div class="kpi-icon accent-amber">📜</div></div>
                    <div class="kpi-value">${kpis.expiringDocuments}</div>
                    <div class="kpi-subtext">Lease deeds within 60d</div>
                </div>
                <div class="kpi-card" onclick="app.navigate('pendency', { filter: 'OVERDUE' })">
                    <div class="kpi-header"><span class="kpi-title">Overdue Applications</span><div class="kpi-icon accent-red">🚨</div></div>
                    <div class="kpi-value" style="color:var(--critical);">${kpis.overdueApplications}</div>
                    <div class="kpi-subtext">Exceeded target SLA</div>
                </div>
                <div class="kpi-card" onclick="app.navigate('alerts')">
                    <div class="kpi-header"><span class="kpi-title">Escalated Cases</span><div class="kpi-icon accent-red">⚠️</div></div>
                    <div class="kpi-value" style="color:var(--critical);">${kpis.escalatedCases}</div>
                    <div class="kpi-subtext">Active hierarchy alerts</div>
                </div>
            </div>

            <!-- Operational Visualizations & Ageing -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:18px; margin-bottom:20px;">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Region-wise Application Distribution & Pendency</span>
                        <span style="font-size:11px; color:#687889;">8 Regional Jurisdictions</span>
                    </div>
                    <div class="card-body">
                        <table class="data-table">
                            <thead>
                                <tr><th>Region Office</th><th>Total Cases</th><th>Active</th><th>SLA Overdue</th></tr>
                            </thead>
                            <tbody>
                                ${analytics.regionDistribution.map(r => `
                                    <tr>
                                        <td><strong>${r.region_name}</strong><br><small style="color:#687889;">${r.region_code}</small></td>
                                        <td>${r.total_applications}</td>
                                        <td><span class="status-chip in_progress">${r.active_applications}</span></td>
                                        <td>${r.overdue_applications > 0 ? `<span class="status-chip critical">${r.overdue_applications} Overdue</span>` : '<span class="status-chip valid">Within SLA</span>'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Application Ageing & Bottleneck Analysis</span>
                        <span style="font-size:11px; color:#687889;">Active Processing Timeline</span>
                    </div>
                    <div class="card-body">
                        <div style="display:flex; flex-direction:column; gap:14px;">
                            ${Object.entries(analytics.ageingBuckets).map(([bucket, count]) => {
                                const total = Object.values(analytics.ageingBuckets).reduce((a, b) => a + b, 0) || 1;
                                const pct = Math.round((count / total) * 100);
                                const color = bucket.includes('> 60') ? 'var(--critical)' : (bucket.includes('31-60') ? 'var(--warning)' : 'var(--gov-blue)');
                                return `
                                    <div>
                                        <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:700; margin-bottom:4px;">
                                            <span>${bucket}</span>
                                            <span>${count} cases (${pct}%)</span>
                                        </div>
                                        <div style="width:100%; height:7px; background:#DFE5EB; border-radius:3px; overflow:hidden;">
                                            <div style="width:${pct}%; height:100%; background:${color}; border-radius:3px;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 2: APPLICATIONS LIST (Section 8)
    // ==========================================
    async renderApplications(container) {
        let endpoint = '/api/applications';
        if (this.activeFilter === 'UNDER_PROCESSING') endpoint += '?status=UNDER_SCRUTINY';
        else if (this.activeFilter === 'SAC_SHC') endpoint += '?stage=SAC_SHC';

        const data = await API.get(endpoint);

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <span class="card-title">Approval Applications Register</span>
                        <span style="font-size:11.5px; color:var(--secondary-text); margin-left:8px;">(${data.total} Total Registered Cases)</span>
                    </div>
                    <button class="btn btn-primary" onclick="app.openNewAppModal()">+ Submit New Application</button>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Application ID</th>
                                    <th>Technical Institution</th>
                                    <th>Type</th>
                                    <th>Region</th>
                                    <th>Stage</th>
                                    <th>Status</th>
                                    <th>SLA Deadline</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.applications.map(a => `
                                    <tr>
                                        <td><strong>${a.application_no}</strong></td>
                                        <td><strong>${a.institution_name}</strong><br><small style="color:#687889;">PID: ${a.permanent_id} | ${a.state}</small></td>
                                        <td>${a.application_type_name}</td>
                                        <td>${a.region_name}</td>
                                        <td><span class="status-chip ${a.current_stage.toLowerCase()}">${a.current_stage}</span></td>
                                        <td><span class="status-chip ${a.current_status.toLowerCase()}">${a.current_status}</span></td>
                                        <td><strong>${a.processing_due_date.split('T')[0]}</strong></td>
                                        <td>
                                            <button class="btn btn-outline" style="height:26px; font-size:11px;" onclick="app.navigate('case_workspace', { appId: '${a.id}' })">
                                                Open Case ↗
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 3: CASE WORKSPACE (8 Tabs - Section 8 & 16)
    // ==========================================
    async renderCaseWorkspace(container, appId) {
        if (!appId) {
            container.innerHTML = '<div style="padding:24px;">Please select an application to view details.</div>';
            return;
        }

        const data = await API.get(`/api/applications/${appId}`);
        const app = data.overview;

        container.innerHTML = `
            <!-- Top Case Status Header -->
            <div class="card" style="margin-bottom:14px;">
                <div class="card-header" style="background:#FFFFFF;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <h2 style="font-size:17px; font-weight:700;">${app.application_no}</h2>
                            <span class="status-chip ${app.current_stage.toLowerCase()}">${app.current_stage}</span>
                            <span class="status-chip ${app.current_status.toLowerCase()}">${app.current_status}</span>
                            ${app.is_on_hold ? '<span class="status-chip on_hold">ON AUTHORISED HOLD</span>' : ''}
                        </div>
                        <div style="font-size:12px; color:var(--secondary-text); margin-top:3px;">
                            ${app.institution_name} (${app.permanent_id}) | ${app.institution_type} | ${app.region_name}
                        </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-outline" onclick="app.toggleHoldModal('${app.id}', ${app.is_on_hold})">
                            ${app.is_on_hold ? 'Resume Workflow' : 'Place on Regulatory Hold'}
                        </button>
                        <button class="btn btn-primary" onclick="app.openTransitionModal('${app.id}', '${app.current_stage}')">
                            Advance Stage →
                        </button>
                    </div>
                </div>
            </div>

            <!-- AI Advisory Assistant (Section 9 & 19) -->
            <div class="ai-advisory-box">
                <div class="ai-disclaimer">AICTE Advisory Assistant (Non-Statutory Recommendation Only)</div>
                <div style="font-size:12.5px; color:#1E3A8A;">
                    Institution '${app.institution_name}' has applied for '${app.application_type_name}'. Currently at stage <strong>${app.current_stage}</strong>. Statutory SLA due date: <strong>${app.processing_due_date.split('T')[0]}</strong>. Total verified transitions: <strong>${data.workflow.transitions.length}</strong>.
                </div>
            </div>

            <!-- 8 Workspace Tabs Navigation -->
            <div class="tabs-header" id="workspace-tabs">
                <button class="tab-btn active" onclick="app.switchTab('overview')">1. Overview</button>
                <button class="tab-btn" onclick="app.switchTab('workflow')">2. Workflow Stages (${data.workflow.stages.length})</button>
                <button class="tab-btn" onclick="app.switchTab('documents')">3. Documents (${data.documents.length})</button>
                <button class="tab-btn" onclick="app.switchTab('scrutiny')">4. Scrutiny (${data.scrutiny.deficiencies.length})</button>
                <button class="tab-btn" onclick="app.switchTab('evc')">5. EVC Inspection</button>
                <button class="tab-btn" onclick="app.switchTab('compliance')">6. Undertakings (${data.compliance.undertakings.length})</button>
                <button class="tab-btn" onclick="app.switchTab('communication')">7. Notices & Alerts</button>
                <button class="tab-btn" onclick="app.switchTab('audit')">8. Cryptographic Audit (${data.auditHistory.length})</button>
            </div>

            <!-- Tab 1: Overview -->
            <div id="tab-overview" class="tab-content">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                    <div class="card">
                        <div class="card-header"><span class="card-title">Institution Profile</span></div>
                        <div class="card-body">
                            <table style="width:100%; font-size:12.5px; line-height:2;">
                                <tr><td style="color:#687889; width:40%;">Institution Name:</td><td><strong>${app.institution_name}</strong></td></tr>
                                <tr><td style="color:#687889;">Permanent ID:</td><td>${app.permanent_id}</td></tr>
                                <tr><td style="color:#687889;">Category / Type:</td><td>${app.category} / ${app.institution_type}</td></tr>
                                <tr><td style="color:#687889;">Campus Address:</td><td>${app.address}, ${app.district}, ${app.state}</td></tr>
                                <tr><td style="color:#687889;">Establishment Year:</td><td>${app.establishment_year}</td></tr>
                                <tr><td style="color:#687889;">Contact Email:</td><td>${app.contact_email}</td></tr>
                            </table>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header"><span class="card-title">Regulatory Context</span></div>
                        <div class="card-body">
                            <table style="width:100%; font-size:12.5px; line-height:2;">
                                <tr><td style="color:#687889; width:40%;">Academic Session:</td><td><strong>${app.academic_year}</strong></td></tr>
                                <tr><td style="color:#687889;">Workflow Master:</td><td>${app.workflow_name}</td></tr>
                                <tr><td style="color:#687889;">Jurisdiction Region:</td><td>${app.region_name}</td></tr>
                                <tr><td style="color:#687889;">Submission Date:</td><td>${app.submission_date.split('T')[0]}</td></tr>
                                <tr><td style="color:#687889;">SLA Due Date:</td><td><strong style="color:var(--gov-blue);">${app.processing_due_date.split('T')[0]}</strong></td></tr>
                                <tr><td style="color:#687889;">Responsible Officer:</td><td>${app.assigned_officer_name || 'Regional Scrutiny Committee'}</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab 2: Workflow -->
            <div id="tab-workflow" class="tab-content" style="display:none;">
                <div class="card">
                    <div class="card-header"><span class="card-title">Visual Workflow Timeline & Stage History</span></div>
                    <div class="card-body">
                        <table class="data-table">
                            <thead>
                                <tr><th>From Stage</th><th>To Stage</th><th>Transition By</th><th>Role</th><th>Rule Version</th><th>Comments</th><th>Timestamp</th></tr>
                            </thead>
                            <tbody>
                                ${data.workflow.transitions.map(t => `
                                    <tr>
                                        <td><strong>${t.from_stage}</strong></td>
                                        <td><strong>${t.to_stage}</strong></td>
                                        <td>${t.actor_name}</td>
                                        <td><code>${t.actor_role}</code></td>
                                        <td>${t.rule_version}</td>
                                        <td>${t.comments || 'Procedural stage advancement.'}</td>
                                        <td>${t.timestamp.replace('T', ' ').substring(0, 19)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Tab 3: Documents -->
            <div id="tab-documents" class="tab-content" style="display:none;">
                <div class="card">
                    <div class="card-header"><span class="card-title">Mandatory Regulatory Document Repository</span></div>
                    <div class="card-body">
                        <table class="data-table">
                            <thead>
                                <tr><th>Document Type</th><th>Title</th><th>Issue Date</th><th>Expiry Date</th><th>Status</th><th>Verification</th></tr>
                            </thead>
                            <tbody>
                                ${data.documents.map(d => `
                                    <tr>
                                        <td><strong>${d.doc_type_name}</strong></td>
                                        <td>${d.document_title}</td>
                                        <td>${d.issue_date}</td>
                                        <td>${d.expiry_date || 'Perpetual'}</td>
                                        <td><span class="status-chip ${d.current_status.toLowerCase()}">${d.current_status}</span></td>
                                        <td>${d.verified_by_name ? `Verified by ${d.verified_by_name}` : 'Pending Verification'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Tab 4: Scrutiny -->
            <div id="tab-scrutiny" class="tab-content" style="display:none;">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Scrutiny Deficiencies & Clarifications</span>
                        <button class="btn btn-outline" onclick="app.openDeficiencyModal('${app.id}')">+ Raise Deficiency</button>
                    </div>
                    <div class="card-body">
                        ${data.scrutiny.deficiencies.length === 0 ? '<p style="color:#687889;">No deficiencies raised. All documents cleared by committee.</p>' : `
                            <table class="data-table">
                                <thead>
                                    <tr><th>Category</th><th>Severity</th><th>Description</th><th>Regulatory Clause</th><th>Status</th><th>Response</th></tr>
                                </thead>
                                <tbody>
                                    ${data.scrutiny.deficiencies.map(df => `
                                        <tr>
                                            <td><strong>${df.category}</strong></td>
                                            <td><span class="status-chip ${df.severity.toLowerCase()}">${df.severity}</span></td>
                                            <td>${df.description}</td>
                                            <td><code>${df.regulatory_reference}</code></td>
                                            <td><span class="status-chip ${df.status.toLowerCase()}">${df.status}</span></td>
                                            <td>
                                                ${df.response_text ? `<em>${df.response_text}</em>` : `
                                                    <button class="btn btn-outline" style="height:24px; font-size:10.5px;" onclick="app.openDeficiencyResponseModal('${df.id}')">Submit Response</button>
                                                `}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
            </div>

            <!-- Tab 5: EVC Inspection -->
            <div id="tab-evc" class="tab-content" style="display:none;">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Expert Visit Committee (EVC) Physical Inspection</span>
                        ${data.evc.schedules.length === 0 ? `
                            <button class="btn btn-primary" onclick="app.openScheduleEVCModal('${app.id}')">Schedule EVC Visit</button>
                        ` : ''}
                    </div>
                    <div class="card-body">
                        ${data.evc.schedules.length === 0 ? '<p style="color:#687889;">No EVC visit scheduled yet.</p>' : `
                            <div style="margin-bottom:16px;">
                                <strong>Status:</strong> <span class="status-chip ${data.evc.schedules[0].visit_status.toLowerCase()}">${data.evc.schedules[0].visit_status}</span> |
                                <strong>Visit Date:</strong> ${data.evc.schedules[0].confirmed_date} |
                                <strong>Inspection Type:</strong> ${data.evc.schedules[0].visit_type}
                            </div>
                            <h4 style="margin-bottom:8px; font-size:13px;">Assigned Expert Committee Members:</h4>
                            <table class="data-table" style="margin-bottom:16px;">
                                <thead><tr><th>Name</th><th>Designation</th><th>Institution</th><th>Role</th></tr></thead>
                                <tbody>
                                    ${data.evc.members.map(m => `
                                        <tr><td><strong>${m.expert_name}</strong></td><td>${m.expert_designation}</td><td>${m.expert_institution}</td><td>${m.role_in_committee}</td></tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${data.evc.reports.length === 0 ? `
                                <button class="btn btn-primary" onclick="app.openSubmitEVCReportModal('${data.evc.schedules[0].id}', '${app.id}')">Submit Inspection Report & Scores</button>
                            ` : `
                                <div style="background:#F8FAFD; padding:14px; border-radius:4px; border:1px solid #DFE5EB;">
                                    <h4 style="font-size:13px;">Final EVC Inspection Findings:</h4>
                                    <div style="font-size:13px; margin-top:6px;">
                                        <strong>Overall Recommendation:</strong> <span class="status-chip approved">${data.evc.reports[0].overall_recommendation}</span><br>
                                        <strong>Infrastructure Score:</strong> ${data.evc.reports[0].infrastructure_score}/100 |
                                        <strong>Faculty Score:</strong> ${data.evc.reports[0].faculty_score}/100 |
                                        <strong>Compliance Score:</strong> ${data.evc.reports[0].compliance_score}/100
                                    </div>
                                    <div style="margin-top:6px; font-size:11.5px; color:#475569;">
                                        ${data.evc.reports[0].deficiency_notes || 'All norms satisfied.'}
                                    </div>
                                </div>
                            `}
                        `}
                    </div>
                </div>
            </div>

            <!-- Tab 6: Compliance -->
            <div id="tab-compliance" class="tab-content" style="display:none;">
                <div class="card">
                    <div class="card-header"><span class="card-title">Institutional Undertakings Register</span></div>
                    <div class="card-body">
                        ${data.compliance.undertakings.length === 0 ? '<p style="color:#687889;">No conditional undertakings linked to this application.</p>' : `
                            <table class="data-table">
                                <thead>
                                    <tr><th>Ref No</th><th>Condition Title</th><th>Due Date</th><th>Responsible Person</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    ${data.compliance.undertakings.map(u => `
                                        <tr>
                                            <td><strong>${u.undertaking_ref}</strong></td>
                                            <td><strong>${u.condition_title}</strong><br><small style="color:#687889;">${u.regulatory_source}</small></td>
                                            <td>${u.due_date}</td>
                                            <td>${u.responsible_person}</td>
                                            <td><span class="status-chip ${u.status.toLowerCase()}">${u.status}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
            </div>

            <!-- Tab 7: Communication -->
            <div id="tab-communication" class="tab-content" style="display:none;">
                <div class="card">
                    <div class="card-header"><span class="card-title">Administrative Notices & Communication Log</span></div>
                    <div class="card-body">
                        <table class="data-table">
                            <thead><tr><th>Date</th><th>Type</th><th>Subject</th><th>Channel</th><th>Status</th></tr></thead>
                            <tbody>
                                ${data.communication.notifications.map(n => `
                                    <tr>
                                        <td>${n.sent_at.replace('T', ' ').substring(0, 19)}</td>
                                        <td><code>${n.event_type}</code></td>
                                        <td><strong>${n.title}</strong><br><small style="color:#687889;">${n.message}</small></td>
                                        <td>${n.channel}</td>
                                        <td><span class="status-chip ${n.status.toLowerCase()}">${n.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Tab 8: Cryptographic Audit History -->
            <div id="tab-audit" class="tab-content" style="display:none;">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Cryptographic Chained Audit Ledger (SHA-256)</span>
                        <button class="btn btn-outline" onclick="app.verifyAuditIntegrity()">Verify Cryptographic Chain</button>
                    </div>
                    <div class="card-body">
                        <table class="data-table">
                            <thead>
                                <tr><th>ID</th><th>Actor</th><th>Action</th><th>Justification</th><th>Current SHA-256 Hash</th><th>Timestamp</th></tr>
                            </thead>
                            <tbody>
                                ${data.auditHistory.map(a => `
                                    <tr>
                                        <td>${a.id}</td>
                                        <td><strong>${a.actor_username}</strong><br><small style="color:#687889;">${a.actor_role}</small></td>
                                        <td><code>${a.action_type}</code></td>
                                        <td>${a.justification}</td>
                                        <td><code style="font-size:10px;">${a.current_hash.substring(0, 24)}...</code></td>
                                        <td>${a.created_at.replace('T', ' ').substring(0, 19)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

        const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.innerText.toLowerCase().includes(tabName));
        if (activeBtn) activeBtn.classList.add('active');

        const targetEl = document.getElementById(`tab-${tabName}`);
        if (targetEl) targetEl.style.display = 'block';
    }

    // ==========================================
    // VIEW 4: SCRUTINY WORKSPACE (Section 9)
    // ==========================================
    async renderScrutiny(container) {
        const data = await API.get('/api/scrutiny/queue');

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <span class="card-title">Scrutiny & Re-Scrutiny Verification Queue</span>
                        <span style="font-size:11.5px; color:var(--secondary-text); margin-left:8px;">(${data.total} Assigned Applications)</span>
                    </div>
                </div>
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr><th>App No</th><th>Technical Institution</th><th>Stage</th><th>Deficiencies</th><th>SLA Due Date</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            ${data.queue.map(q => `
                                <tr>
                                    <td><strong>${q.application_no}</strong></td>
                                    <td><strong>${q.institution_name}</strong><br><small style="color:#687889;">${q.state} | ${q.inst_category}</small></td>
                                    <td><span class="status-chip ${q.current_stage.toLowerCase()}">${q.current_stage}</span></td>
                                    <td>${q.deficiency_count > 0 ? `<span class="status-chip critical">${q.deficiency_count} Raised</span>` : '<span class="status-chip valid">Clean</span>'}</td>
                                    <td><strong>${q.processing_due_date.split('T')[0]}</strong></td>
                                    <td>
                                        <button class="btn btn-primary" style="height:26px; font-size:11px;" onclick="app.navigate('case_workspace', { appId: '${q.id}' })">
                                            Conduct Scrutiny ↗
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 5: EVC MANAGEMENT (Section 10)
    // ==========================================
    async renderEVC(container) {
        const [metrics, queueData] = await Promise.all([
            API.get('/api/evc/dashboard'),
            API.get('/api/evc/queue')
        ]);

        container.innerHTML = `
            <div class="kpi-grid">
                <div class="kpi-card"><div class="kpi-title">EVC Required</div><div class="kpi-value">${metrics.evcRequired}</div></div>
                <div class="kpi-card"><div class="kpi-title">Awaiting Scheduling</div><div class="kpi-value">${metrics.awaitingScheduling}</div></div>
                <div class="kpi-card"><div class="kpi-title">Visits Scheduled</div><div class="kpi-value">${metrics.scheduled}</div></div>
                <div class="kpi-card"><div class="kpi-title">Completed Visits</div><div class="kpi-value">${metrics.completed}</div></div>
                <div class="kpi-card"><div class="kpi-title">Overdue Cases</div><div class="kpi-value" style="color:var(--critical);">${metrics.overdue}</div></div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">EVC Eligibility & Inspection Queue</span></div>
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr><th>App No</th><th>Institution</th><th>Region</th><th>Visit Status</th><th>Inspection Date</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            ${queueData.queue.map(q => `
                                <tr>
                                    <td><strong>${q.application_no}</strong></td>
                                    <td><strong>${q.institution_name}</strong><br><small style="color:#687889;">${q.state} | ${q.district}</small></td>
                                    <td>${q.region_name}</td>
                                    <td><span class="status-chip ${(q.visit_status || 'AWAITING_SCHEDULING').toLowerCase()}">${q.visit_status || 'Awaiting Scheduling'}</span></td>
                                    <td>${q.confirmed_date || 'Not Fixed'}</td>
                                    <td>
                                        <button class="btn btn-outline" style="height:26px; font-size:11px;" onclick="app.navigate('case_workspace', { appId: '${q.id}' })">
                                            Manage EVC ↗
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 6: SAC/SHC PROCESSING (Section 11)
    // ==========================================
    async renderSACSHC(container) {
        const data = await API.get('/api/applications?stage=SAC_SHC');

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <span class="card-title">Standing Appellate Committee (SAC) & Hearing Committee (SHC) Queue</span>
                        <span style="font-size:11.5px; color:var(--secondary-text); margin-left:8px;">(${data.total} Cases Awaiting Appellate Review)</span>
                    </div>
                </div>
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr><th>App No</th><th>Institution</th><th>Region</th><th>Current Status</th><th>SLA Due Date</th><th>Appellate Action</th></tr>
                        </thead>
                        <tbody>
                            ${data.applications.map(a => `
                                <tr>
                                    <td><strong>${a.application_no}</strong></td>
                                    <td><strong>${a.institution_name}</strong><br><small style="color:#687889;">${a.state}</small></td>
                                    <td>${a.region_name}</td>
                                    <td><span class="status-chip ${a.current_status.toLowerCase()}">${a.current_status}</span></td>
                                    <td>${a.processing_due_date.split('T')[0]}</td>
                                    <td>
                                        <button class="btn btn-primary" style="height:26px; font-size:11px;" onclick="app.navigate('case_workspace', { appId: '${a.id}' })">
                                            Conduct Hearing ↗
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 7: PENDENCY & SLA (Section 12)
    // ==========================================
    async renderPendency(container) {
        const data = await API.get('/api/pendency/list');

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <span class="card-title">Centralized Pendency Monitoring & SLA Ageing</span>
                        <span style="font-size:11.5px; color:var(--secondary-text); margin-left:8px;">(${data.total} Tracked Applications)</span>
                    </div>
                </div>
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr><th>App No</th><th>Institution</th><th>Stage</th><th>Days Pending</th><th>Stage Ageing</th><th>SLA Status</th><th>Assigned Authority</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            ${data.applications.map(a => `
                                <tr>
                                    <td><strong>${a.application_no}</strong></td>
                                    <td><strong>${a.institution_name}</strong><br><small style="color:#687889;">${a.region_name}</small></td>
                                    <td><span class="status-chip ${a.current_stage.toLowerCase()}">${a.current_stage}</span></td>
                                    <td><strong>${a.totalDaysPending} days</strong></td>
                                    <td>${a.stageDays} days in stage</td>
                                    <td><span class="status-chip ${a.classification.toLowerCase()}">${a.classification.replace(/_/g, ' ')}</span></td>
                                    <td>${a.assigned_officer_name || 'Regional Panel'}</td>
                                    <td>
                                        <button class="btn btn-outline" style="height:26px; font-size:11px;" onclick="app.navigate('case_workspace', { appId: '${a.id}' })">
                                            Inspect Bottleneck ↗
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 8: COMPLIANCE & UNDERTAKINGS (Section 13)
    // ==========================================
    async renderCompliance(container) {
        const data = await API.get('/api/compliance/undertakings');

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <span class="card-title">Institutional Undertakings & Conditional Sanctions Register</span>
                        <span style="font-size:11.5px; color:var(--secondary-text); margin-left:8px;">(${data.total} Active Obligations)</span>
                    </div>
                    <button class="btn btn-primary" onclick="app.openNewUndertakingModal()">+ Issue Conditional Undertaking</button>
                </div>
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr><th>Undertaking Ref</th><th>Institution</th><th>Obligation Details</th><th>Due Date</th><th>Responsible Person</th><th>Status</th><th>Verification</th></tr>
                        </thead>
                        <tbody>
                            ${data.undertakings.map(u => `
                                <tr>
                                    <td><strong>${u.undertaking_ref}</strong></td>
                                    <td><strong>${u.institution_name}</strong><br><small style="color:#687889;">${u.region_name}</small></td>
                                    <td><strong>${u.condition_title}</strong><br><small style="color:#687889;">${u.obligation_details}</small></td>
                                    <td><strong>${u.due_date}</strong></td>
                                    <td>${u.responsible_person}</td>
                                    <td><span class="status-chip ${u.status.toLowerCase()}">${u.status}</span></td>
                                    <td>
                                        ${u.status === 'PENDING' ? `
                                            <button class="btn btn-outline" style="height:24px; font-size:10.5px;" onclick="app.openSubmitComplianceModal('${u.id}')">Submit Evidence</button>
                                        ` : (u.status === 'UNDER_VERIFICATION' ? `
                                            <button class="btn btn-primary" style="height:24px; font-size:10.5px;" onclick="app.openVerifyComplianceModal('${u.id}')">Verify Evidence</button>
                                        ` : `Verified`)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 9: LEASE & DOCUMENT VALIDITY (Section 14)
    // ==========================================
    async renderDocuments(container) {
        const data = await API.get('/api/documents');

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <span class="card-title">Land Lease & Document Validity Lifecycle Tracking</span>
                        <span style="font-size:11.5px; color:var(--secondary-text); margin-left:8px;">(Advance Reminder Windows: 90, 60, 30, 15, 7 Days)</span>
                    </div>
                </div>
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr><th>Document Type</th><th>Institution</th><th>Issue Date</th><th>Expiry Date</th><th>Countdown</th><th>Status</th><th>Renewal Action</th></tr>
                        </thead>
                        <tbody>
                            ${data.documents.map(d => `
                                <tr>
                                    <td><strong>${d.document_title}</strong><br><small style="color:#687889;">${d.doc_type_name}</small></td>
                                    <td><strong>${d.institution_name}</strong></td>
                                    <td>${d.issue_date}</td>
                                    <td>${d.expiry_date || 'Perpetual'}</td>
                                    <td>${d.daysUntilExpiry !== null ? `<strong>${d.daysUntilExpiry} days</strong>` : 'N/A'}</td>
                                    <td><span class="status-chip ${d.dynamicStatus.toLowerCase()}">${d.dynamicStatus}</span></td>
                                    <td>
                                        ${d.dynamicStatus === 'EXPIRING_SOON' || d.dynamicStatus === 'EXPIRED' ? `
                                            <button class="btn btn-primary" style="height:24px; font-size:10.5px;" onclick="app.openRenewalModal('${d.id}')">Submit Renewal</button>
                                        ` : (d.dynamicStatus === 'RENEWAL_SUBMITTED' ? `
                                            <button class="btn btn-primary" style="height:24px; font-size:10.5px;" onclick="app.openVerifyRenewalModal('${d.id}')">Verify Renewal</button>
                                        ` : 'Valid')}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 10: ALERTS & ESCALATION MANAGEMENT (Section 15 & 16)
    // ==========================================
    async renderAlerts(container) {
        const [notifsData, escalationsData] = await Promise.all([
            API.get('/api/notifications'),
            API.get('/api/escalations')
        ]);

        container.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                <div class="card">
                    <div class="card-header"><span class="card-title">Active Hierarchy Escalation Register</span></div>
                    <div class="card-body">
                        ${escalationsData.escalations.length === 0 ? '<p style="color:#687889;">No active escalations.</p>' : `
                            <table class="data-table">
                                <thead><tr><th>App ID</th><th>Escalated To</th><th>Breach Reason</th><th>Action</th></tr></thead>
                                <tbody>
                                    ${escalationsData.escalations.map(e => `
                                        <tr>
                                            <td><strong>${e.application_no}</strong><br><small>${e.institution_name}</small></td>
                                            <td><span class="status-chip critical">${e.escalated_to_role}</span></td>
                                            <td><small>${e.trigger_reason}</small></td>
                                            <td>
                                                <button class="btn btn-outline" style="height:24px; font-size:10.5px;" onclick="app.resolveEscalationModal('${e.id}')">Resolve & Close</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><span class="card-title">Central Notification Inbox (${notifsData.notifications.length})</span></div>
                    <div class="card-body">
                        <div style="max-height:500px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
                            ${notifsData.notifications.map(n => `
                                <div style="padding:10px 14px; border:1px solid #DFE5EB; border-radius:4px; background:#FAFBFD;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                                        <strong>${n.title}</strong>
                                        <small style="color:#687889;">${n.sent_at.replace('T', ' ').substring(0, 16)}</small>
                                    </div>
                                    <div style="font-size:11.5px; color:#475569;">${n.message}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 11: REPORTS & ANALYTICS (Section 18)
    // ==========================================
    async renderReports(container) {
        const data = await API.get('/api/reports');

        container.innerHTML = `
            <div class="card">
                <div class="card-header"><span class="card-title">Prescribed Regulatory Reports (14 Standard Reports)</span></div>
                <div class="card-body">
                    <table class="data-table">
                        <thead><tr><th>Report Title</th><th>Category</th><th>Format</th><th>Export Action</th></tr></thead>
                        <tbody>
                            ${data.reports.map(r => `
                                <tr>
                                    <td><strong>${r.name}</strong></td>
                                    <td><span style="background:#F0F4F8; color:#334E68; padding:2px 6px; border-radius:3px; font-size:10.5px; font-weight:700;">${r.category}</span></td>
                                    <td>CSV / Excel / PDF</td>
                                    <td>
                                        <a class="btn btn-outline" style="height:26px; font-size:11px;" href="/api/reports/${r.id}/export-csv" target="_blank">
                                            📥 Download Data CSV
                                        </a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 12: REGULATORY RULES (Section 27)
    // ==========================================
    async renderRules(container) {
        const data = await API.get('/api/regulatory-rules');

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <span class="card-title">Version-Controlled Approval Process Handbook (APH) Regulatory Rules</span>
                        <span style="font-size:11.5px; color:var(--secondary-text); margin-left:8px;">(${data.total} Configured Rule Sets)</span>
                    </div>
                    <button class="btn btn-primary" onclick="app.openNewRuleModal()">+ Propose Rule Draft</button>
                </div>
                <div class="card-body">
                    <table class="data-table">
                        <thead><tr><th>Academic Session</th><th>APH Version</th><th>Rule Key</th><th>Category</th><th>Status</th><th>Authority</th></tr></thead>
                        <tbody>
                            ${data.rules.map(r => `
                                <tr>
                                    <td><strong>${r.academic_year}</strong></td>
                                    <td><code>${r.aph_version}</code></td>
                                    <td><strong>${r.rule_key}</strong></td>
                                    <td>${r.category}</td>
                                    <td><span class="status-chip ${r.status.toLowerCase()}">${r.status}</span></td>
                                    <td>
                                        ${r.status === 'DRAFT' ? `
                                            <button class="btn btn-primary" style="height:24px; font-size:10.5px;" onclick="app.publishRule('${r.id}')">Publish & Activate</button>
                                        ` : 'Activated'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 13: CRYPTOGRAPHIC AUDIT TRAIL (Section 19)
    // ==========================================
    async renderAudit(container) {
        const [eventsData, integrity] = await Promise.all([
            API.get('/api/audit/events?limit=50'),
            API.get('/api/audit/verify-integrity')
        ]);

        container.innerHTML = `
            <div class="card" style="margin-bottom:16px; border-left:4px solid ${integrity.isValid ? '#237A57' : '#B83A42'}; background:#FFFFFF;">
                <div class="card-body" style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px;">
                    <div>
                        <h3 style="font-size:14.5px; font-weight:700; color:${integrity.isValid ? '#237A57' : '#B83A42'};">
                            ${integrity.isValid ? '✓ Cryptographic Ledger Integrity: VERIFIED & TAMPER-FREE' : '⚠️ Cryptographic Hash Mismatch Detected!'}
                        </h3>
                        <p style="font-size:12px; color:#687889; margin-top:2px;">
                            ${integrity.message}
                        </p>
                    </div>
                    <button class="btn btn-primary" onclick="app.verifyAuditIntegrity()">Validate Blockchain Hash Chain</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">Immutable SHA-256 Chained Event Log</span></div>
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr><th>ID</th><th>Actor</th><th>Action</th><th>Target Entity</th><th>Justification</th><th>Cryptographic Hash</th><th>Timestamp</th></tr>
                        </thead>
                        <tbody>
                            ${eventsData.events.map(e => `
                                <tr>
                                    <td>${e.id}</td>
                                    <td><strong>${e.actor_username}</strong><br><small style="color:#687889;">${e.actor_role}</small></td>
                                    <td><code>${e.action_type}</code></td>
                                    <td>${e.entity_name} (${e.entity_id})</td>
                                    <td>${e.justification}</td>
                                    <td><code style="font-size:10px;">${e.current_hash.substring(0, 24)}...</code></td>
                                    <td>${e.created_at.replace('T', ' ').substring(0, 19)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ==========================================
    // VIEW 14: SCENARIOS & JOURNEY DEMONSTRATION LAB (Section 23)
    // ==========================================
    async renderScenarios(container) {
        const data = await API.get('/api/scenarios');

        container.innerHTML = `
            <div class="ai-advisory-box" style="margin-bottom:16px;">
                <div class="ai-disclaimer">Section 23 Prototype Demonstration Engine</div>
                <div style="font-size:12.5px; color:#1E3A8A;">
                    Execute and visually verify all end-to-end demonstration scenarios with real database mutations, workflow state hops, SLA ageing recalculations, and cryptographic audit proofs!
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">Prescribed Prototype Demonstration Scenarios</span></div>
                <div class="card-body">
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${data.scenarios.map(s => `
                            <div style="border:1px solid #DFE5EB; border-radius:4px; padding:12px 16px; background:#FAFBFD; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <span style="background:#12304A; color:#FFF; font-weight:700; padding:1px 6px; border-radius:3px; font-size:10.5px;">Scenario ${s.id}</span>
                                        <h4 style="font-size:13.5px; font-weight:700; color:#12304A;">${s.name}</h4>
                                    </div>
                                    <p style="font-size:11.5px; color:#687889; margin-top:3px;">${s.desc}</p>
                                    <div id="scenario-result-${s.id}" style="margin-top:6px; font-size:11.5px; display:none;"></div>
                                </div>
                                <button class="btn btn-primary" id="btn-run-${s.id}" onclick="app.executeScenario(${s.id})">
                                    ▶ Run Scenario ${s.id}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    async executeScenario(scenarioId) {
        const btn = document.getElementById(`btn-run-${scenarioId}`);
        const resultEl = document.getElementById(`scenario-result-${scenarioId}`);
        if (btn) btn.innerText = 'Executing...';

        try {
            const data = await API.post(`/api/scenarios/${scenarioId}/run`, {});
            if (resultEl) {
                resultEl.style.display = 'block';
                resultEl.innerHTML = `
                    <div style="background:#EDF7F2; border:1px solid #A7F3D0; color:#237A57; padding:6px 10px; border-radius:3px;">
                        <strong>✓ ${data.verification}</strong>
                        <div style="font-size:10.5px; margin-top:2px;">${JSON.stringify(data)}</div>
                    </div>
                `;
            }
            API.showToast(`Scenario ${scenarioId} executed and verified!`, 'success');
        } catch (e) {
            if (resultEl) {
                resultEl.style.display = 'block';
                resultEl.innerHTML = `<div style="background:#FDF2F2; color:#B83A42; padding:6px 10px; border-radius:3px;">Error: ${e.message}</div>`;
            }
        } finally {
            if (btn) btn.innerText = `▶ Re-Run Scenario ${scenarioId}`;
        }
    }

    async verifyAuditIntegrity() {
        const result = await API.get('/api/audit/verify-integrity');
        if (result.isValid) {
            API.showToast(result.message, 'success');
        } else {
            API.showToast(result.message, 'error');
        }
        if (this.currentView === 'audit') this.render();
    }

    // Modals
    openNewAppModal() {
        const html = `
            <div class="modal-overlay" id="modal-container">
                <div class="modal-content">
                    <div class="modal-header">
                        <span class="card-title">Submit Application for Technical Institution Approval</span>
                        <button class="btn btn-outline" onclick="document.getElementById('modal-container').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Application Category:</label>
                            <select class="form-select" id="new-app-type">
                                <option value="NEW_INST">Setting Up New Technical Institution (Section 10k)</option>
                                <option value="EOA">Extension of Approval (EoA - Annual)</option>
                                <option value="INC_INTAKE">Increase in Intake / Additional Course</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Academic Session:</label>
                            <input class="form-input" id="new-app-year" value="2026-2027" readonly />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Institution:</label>
                            <select class="form-select" id="new-app-inst">
                                <option value="INST_001">Apex Institute of Technology & Management (Northern Region)</option>
                                <option value="INST_002">Southern National College of Engineering (Southern Region)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="document.getElementById('modal-container').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="app.submitNewApp()">Submit Application</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    async submitNewApp() {
        const type = document.getElementById('new-app-type').value;
        const year = document.getElementById('new-app-year').value;
        const instId = document.getElementById('new-app-inst').value;

        try {
            const res = await API.post('/api/applications', {
                applicationTypeCode: type,
                academicYear: year,
                institutionId: instId
            });
            document.getElementById('modal-container').remove();
            API.showToast(res.message, 'success');
            this.navigate('applications');
        } catch (e) {
            API.showToast(e.message, 'error');
        }
    }

    openTransitionModal(appId, currentStage) {
        const nextStageMap = {
            SCRUTINY: 'EVC',
            RE_SCRUTINY: 'EVC',
            EVC: 'COMPETENT_DECISION',
            SAC_SHC: 'COMPETENT_DECISION',
            COMPETENT_DECISION: 'APPROVED'
        };
        const defaultNext = nextStageMap[currentStage] || 'COMPETENT_DECISION';

        const html = `
            <div class="modal-overlay" id="modal-container">
                <div class="modal-content">
                    <div class="modal-header">
                        <span class="card-title">Advance Approval Workflow Transition</span>
                        <button class="btn btn-outline" onclick="document.getElementById('modal-container').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Current Stage:</label>
                            <input class="form-input" value="${currentStage}" readonly />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Target Stage:</label>
                            <select class="form-select" id="trans-to-stage">
                                <option value="${defaultNext}">${defaultNext} (Permitted Stage Hop)</option>
                                <option value="RE_SCRUTINY">RE_SCRUTINY</option>
                                <option value="SAC_SHC">SAC_SHC</option>
                                <option value="APPROVED">APPROVED</option>
                                <option value="REJECTED">REJECTED</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Statutory Justification / Officer Remarks:</label>
                            <textarea class="form-input" id="trans-comments" style="height:60px;" placeholder="Enter regulatory comments..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="document.getElementById('modal-container').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="app.executeTransition('${appId}')">Confirm Transition</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    async executeTransition(appId) {
        const toStage = document.getElementById('trans-to-stage').value;
        const comments = document.getElementById('trans-comments').value;

        try {
            const res = await API.post(`/api/applications/${appId}/transition`, {
                toStage,
                comments: comments || 'Procedural stage advancement'
            });
            document.getElementById('modal-container').remove();
            API.showToast(res.message, 'success');
            this.navigate('case_workspace', { appId });
        } catch (e) {
            API.showToast(e.message, 'error');
        }
    }

    async toggleHoldModal(appId, isCurrentlyHold) {
        const reason = isCurrentlyHold ? '' : prompt('Enter regulatory justification for administrative hold:');
        if (!isCurrentlyHold && !reason) return;

        try {
            const res = await API.post(`/api/applications/${appId}/hold`, {
                isHold: !isCurrentlyHold,
                reason: reason || 'Hold lifted by authorized officer'
            });
            API.showToast(res.message, 'success');
            this.navigate('case_workspace', { appId });
        } catch (e) {
            API.showToast(e.message, 'error');
        }
    }
}

const app = new NiyamAIApp();
window.app = app;
