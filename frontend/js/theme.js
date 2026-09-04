// Theme Toggle & Persistence
(function () {
    const savedTheme = localStorage.getItem('smartpark_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    window.toggleTheme = function () {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('smartpark_theme', newTheme);
        updateThemeIcon();
    };

    function updateThemeIcon() {
        const icons = document.querySelectorAll('.theme-icon');
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        icons.forEach(icon => {
            icon.className = isDark ? 'fas fa-sun theme-icon' : 'fas fa-moon theme-icon';
        });
    }

    document.addEventListener('DOMContentLoaded', updateThemeIcon);
})();
