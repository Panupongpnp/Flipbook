/* ===========================================
   HEADER LOADER
   Dynamically loads header.html component
   =========================================== */

(function() {
  'use strict';

  async function loadHeader() {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    try {
      const response = await fetch('components/header.html');
      if (!response.ok) throw new Error('Failed to load header');
      const html = await response.text();
      placeholder.innerHTML = html;
    } catch (err) {
      // Fallback: inline header if fetch fails (e.g. file:// protocol)
      placeholder.innerHTML = `
        <header class="site-header" id="site-header">
          <div class="header-inner">
            <a href="index.html" class="header-logo">
              <div class="header-logo-icon">P</div>
              <div class="header-logo-text">MY <span>PORTFOLIO</span></div>
            </a>
            <nav class="header-nav">
              <a href="#" class="header-nav-link active">Portfolio</a>
              <div class="header-status">
                <span class="header-status-dot"></span>
                <span>Available</span>
              </div>
            </nav>
          </div>
          <div class="header-accent-line"></div>
        </header>
      `;
    }
  }

  // Load on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHeader);
  } else {
    loadHeader();
  }
})();
