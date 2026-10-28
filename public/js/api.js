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
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Server request failed');
            }
            return data;
        } catch (err) {
            console.error(`API Error [${url}]:`, err.message);
            API.showToast(err.message, 'error');
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
