// SmartPark AI - Authentication & Role-Based Navigation Manager

const Auth = {
    getUser() {
        const u = localStorage.getItem('smartpark_user') || localStorage.getItem('sp_user');
        return u ? JSON.parse(u) : null;
    },

    getToken() {
        return localStorage.getItem('smartpark_token') || localStorage.getItem('sp_token');
    },

    isLoggedIn() {
        return Boolean(this.getToken() && this.getUser());
    },

    hasRole(...roles) {
        const user = this.getUser();
        if (!user) return false;
        if (user.role === 'superadmin') return true;
        return roles.includes(user.role);
    },

    login(token, user) {
        localStorage.setItem('smartpark_token', token);
        localStorage.setItem('smartpark_user', JSON.stringify(user));
        // Backwards compatibility
        localStorage.setItem('sp_token', token);
        localStorage.setItem('sp_user', JSON.stringify(user));
        this.renderNav();
    },

    logout() {
        localStorage.removeItem('smartpark_token');
        localStorage.removeItem('smartpark_user');
        localStorage.removeItem('sp_token');
        localStorage.removeItem('sp_user');
        window.location.href = '/login.html';
    },

    // Check permissions on protected pages
    requireAuth(allowedRoles = []) {
        if (!this.isLoggedIn()) {
            API.toast('Please log in to access this page.', 'warning');
            setTimeout(() => {
                window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
            }, 500);
            return false;
        }

        if (allowedRoles.length > 0 && !this.hasRole(...allowedRoles)) {
            API.toast('Access restricted: Insufficient role permissions.', 'danger');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            return false;
        }

        return true;
    },

    // Render navbar links dynamically
    renderNav() {
        const navActions = document.getElementById('nav-auth-actions');
        const dynamicNavLinks = document.getElementById('dynamic-nav-links');
        const user = this.getUser();

        if (dynamicNavLinks) {
            let extraLinks = `
                <a href="/find-parking.html" class="nav-link"><i class="fas fa-search-location"></i> Find Parking</a>
                <a href="/slots.html" class="nav-link"><i class="fas fa-th"></i> Slot Matrix</a>
                <a href="/launch 3d demo.html" class="nav-link"><i class="fas fa-cube"></i> 3D Simulation</a>
            `;

            if (user) {
                extraLinks += `<a href="/dashboard.html" class="nav-link"><i class="fas fa-tachometer-alt"></i> My Dashboard</a>`;
                if (['staff', 'manager', 'admin', 'superadmin'].includes(user.role)) {
                    extraLinks += `<a href="/staff-scanner.html" class="nav-link"><i class="fas fa-qrcode"></i> Gate Scanner</a>`;
                }
                if (['manager', 'admin', 'superadmin'].includes(user.role)) {
                    extraLinks += `<a href="/admin.html" class="nav-link"><i class="fas fa-chart-line"></i> Admin Suite</a>`;
                }
            }

            dynamicNavLinks.innerHTML = extraLinks;
        }

        if (navActions) {
            if (user) {
                navActions.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <span class="badge badge-primary"><i class="fas fa-user-circle"></i> ${user.name} (${user.role.toUpperCase()})</span>
                        <button onclick="Auth.logout()" class="btn btn-secondary btn-sm"><i class="fas fa-sign-out-alt"></i> Logout</button>
                    </div>
                `;
            } else {
                navActions.innerHTML = `
                    <a href="/login.html" class="btn btn-secondary btn-sm"><i class="fas fa-sign-in-alt"></i> Login</a>
                    <a href="/signup.html" class="btn btn-primary btn-sm"><i class="fas fa-user-plus"></i> Sign Up</a>
                `;
            }
        }
    }
};

window.Auth = Auth;
document.addEventListener('DOMContentLoaded', () => Auth.renderNav());
