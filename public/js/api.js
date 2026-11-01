// NIYAM AI — Authenticated REST API Client (JWT Bearer Authentication)
const API = {
    getToken() {
        return localStorage.getItem('niyam_auth_token') || null;
    },

    getCurrentUser() {
        try {
            const raw = localStorage.getItem('niyam_auth_user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },

    setSession(token, user) {
        if (token) {
            localStorage.setItem('niyam_auth_token', token);
            localStorage.setItem('niyam_auth', 'true');
        }
        if (user) {
            localStorage.setItem('niyam_auth_user', JSON.stringify(user));
            localStorage.setItem('niyam_user', JSON.stringify(user));
        }
        localStorage.removeItem('aicte_current_user_id'); // Clear legacy insecure mock ID
        window.dispatchEvent(new CustomEvent('aicte:userChanged', { detail: { user } }));
    },

    clearSession() {
        localStorage.removeItem('niyam_auth_token');
        localStorage.removeItem('niyam_auth_user');
        localStorage.removeItem('niyam_auth');
        localStorage.removeItem('niyam_user');
        localStorage.removeItem('niyam_view');
        localStorage.removeItem('aicte_current_user_id');
        window.dispatchEvent(new CustomEvent('aicte:userChanged', { detail: { user: null } }));
    },

    async request(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        };

        try {
            const res = await fetch(url, { ...options, headers });
            const data = await res.json().catch(() => ({}));
            
            if (!res.ok) {
                if (res.status === 401) {
                    // Session invalid or expired
                    this.clearSession();
                }

                const errorMsg = data.error || (
                    res.status === 403 ? 'Access Denied: You do not possess the authorized regulatory clearance for this operation.' :
                    res.status === 401 ? 'Session Expired: Please re-authenticate your official credentials.' :
                    res.status === 404 ? 'Record Not Found: The specified statutory dossier or entity was not located.' :
                    res.status === 429 ? (data.error || 'Too many requests. Please wait before retrying.') :
                    `Request Failed (${res.status}): AICTE Central gateway could not complete operation.`
                );
                throw new Error(errorMsg);
            }
            return data;
        } catch (err) {
            let displayMsg = err.message;
            if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
                displayMsg = 'Network Connectivity Issue: Could not connect to the AICTE central gateway. Please verify network status and retry.';
            }
            console.error(`API Error [${url}]:`, displayMsg);
            API.showToast(displayMsg, 'error');
            throw err;
        }
    },

    get(url) { return this.request(url, { method: 'GET' }); },
    post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
    put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
    delete(url) { return this.request(url, { method: 'DELETE' }); },

    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Prevent XSS in toast notifications using safe textContent
        const span = document.createElement('span');
        span.textContent = message;
        toast.appendChild(span);
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

window.API = API;
