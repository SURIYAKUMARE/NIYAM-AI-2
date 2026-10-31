// API Client with Role Switching & Session Management
const API = {
    currentUserId: localStorage.getItem('aicte_current_user_id') || 'USR_ADMIN_01',

    setSimulatedUser(userId) {
        this.currentUserId = userId;
        localStorage.setItem('aicte_current_user_id', userId);
        window.dispatchEvent(new CustomEvent('aicte:userChanged', { detail: { userId } }));
    },

    async request(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': this.currentUserId,
            ...(options.headers || {})
        };

        try {
            const res = await fetch(url, { ...options, headers });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const errorMsg = data.error || (
                    res.status === 403 ? 'Access Denied: You do not possess the authorized regulatory clearance for this operation.' :
                    res.status === 401 ? 'Session Expired: Please re-authenticate your official credentials.' :
                    res.status === 404 ? 'Record Not Found: The specified statutory dossier or entity was not located.' :
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
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

window.API = API;
