/**
 * auth.js — Jain University Portal Authentication Utility
 * Include this script on EVERY protected page.
 * Usage: <script src="auth.js"></script>
 */

(function () {
  const AUTH_KEY = 'jain_portal_auth';

  /* ── Public API ── */
  window.JainAuth = {

    /** Returns true if a valid session exists */
    isLoggedIn: function () {
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        // Basic session expiry check (24 h default; 7 days if remember=true)
        if (data.expiry && Date.now() > data.expiry) {
          localStorage.removeItem(AUTH_KEY);
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    },

    /** Store login session */
    setLogin: function (userData, remember) {
      const ttl = remember ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const payload = Object.assign({}, userData, {
        expiry: Date.now() + ttl,
        loginTime: new Date().toISOString(),
      });
      localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
    },

    /** Retrieve stored user data */
    getUser: function () {
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    /** Clear session and redirect to login */
    logout: function () {
      localStorage.removeItem(AUTH_KEY);
      window.location.href = 'login.html';
    },

    /**
     * Call this at the top of every protected page.
     * If not logged in, instantly redirects to login.html.
     */
    requireAuth: function () {
      if (!this.isLoggedIn()) {
        // Save the page they tried to visit so we can redirect back after login
        sessionStorage.setItem('jain_redirect_after_login', window.location.href);
        window.location.replace('login.html');
      }
    },

    /** Inject user info into the navbar (call after DOM ready) */
    populateNavbar: function () {
      const user = this.getUser();
      if (!user) return;

      const initials = (user.name || 'JU')
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const nameEl  = document.getElementById('navUserName');
      const roleEl  = document.getElementById('navUserRole');
      const initEl  = document.getElementById('navUserInitials');
      const emailEl = document.getElementById('navUserEmail');

      if (nameEl)  nameEl.textContent  = user.name  || 'Jain University';
      if (roleEl)  roleEl.textContent  = user.role  || 'Student';
      if (initEl)  initEl.textContent  = initials;
      if (emailEl) emailEl.textContent = user.email || '';
    },
  };
})();
