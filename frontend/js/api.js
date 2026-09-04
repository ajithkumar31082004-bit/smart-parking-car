// SmartPark AI - Centralized REST API Client
const API_BASE = '/api';

const API = {
    // Generic request helper
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('smartpark_token') || localStorage.getItem('sp_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers
            });

            const data = await res.json();

            if (!res.ok) {
                const errorMsg = data.error || 'Server error occurred.';
                API.toast(errorMsg, 'danger');
                throw new Error(errorMsg);
            }

            return data;
        } catch (err) {
            console.error(`API Error on ${endpoint}:`, err);
            throw err;
        }
    },

    // Auth endpoints
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    async register(formData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
    },

    async getMe() {
        return this.request('/auth/me');
    },

    // Locations & Slots
    async getLocations() {
        return this.request('/locations');
    },

    async getLocationById(id) {
        return this.request(`/locations/${id}`);
    },

    async getLocationSlots(locationId) {
        return this.request(`/locations/${locationId}/slots`);
    },

    async updateSlotStatus(slotId, status) {
        return this.request(`/locations/slots/${slotId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    },

    // AI Endpoints
    async getRecommendations(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/ai/recommendations?${query}`);
    },

    async getDemandForecast(locationId = 1, hours = 24) {
        return this.request(`/ai/forecast?locationId=${locationId}&hours=${hours}`);
    },

    async getDynamicPriceQuote(locationId, hours) {
        return this.request(`/ai/dynamic-pricing?locationId=${locationId}&hours=${hours}`);
    },

    // Bookings & Payments
    async createBooking(bookingData) {
        return this.request('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    },

    async getMyBookings() {
        return this.request('/bookings/my');
    },

    async getBookingPass(code) {
        return this.request(`/bookings/pass/${code}`);
    },

    async cancelBooking(bookingId) {
        return this.request(`/bookings/${bookingId}/cancel`, {
            method: 'POST'
        });
    },

    async processPayment(paymentData) {
        return this.request('/payments/process', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    },

    async submitReview(reviewData) {
        return this.request('/bookings/review', {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
    },

    // QR Verification & Gate Check-in
    async staffCheckIn(code) {
        return this.request('/qr/check-in', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    },

    async staffCheckOut(code) {
        return this.request('/qr/check-out', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    },

    // Admin & Analytics
    async getAdminKPIs() {
        return this.request('/admin/analytics/kpis');
    },

    async getAdminCharts() {
        return this.request('/admin/analytics/charts');
    },

    async getFraudEvents() {
        return this.request('/admin/fraud-events');
    },

    async getAuditLogs() {
        return this.request('/admin/audit-logs');
    },

    async updatePricingRule(ruleId, ruleData) {
        return this.request(`/admin/pricing-rules/${ruleId}`, {
            method: 'PUT',
            body: JSON.stringify(ruleData)
        });
    },

    // Toast Notification System
    toast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'danger') icon = 'fa-exclamation-triangle';
        if (type === 'warning') icon = 'fa-exclamation-circle';

        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

window.API = API;
