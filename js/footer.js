/* ===========================================
   FOOTER LOADER
   Dynamically loads footer.html component
   =========================================== */

(function() {
  'use strict';

  async function loadFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    try {
      const response = await fetch('components/footer.html');
      if (!response.ok) throw new Error('Failed to load footer');
      const html = await response.text();
      placeholder.innerHTML = html;
    } catch (err) {
      // Fallback: inline footer if fetch fails (e.g. file:// protocol)
      placeholder.innerHTML = `
        <footer class="site-footer" id="site-footer">
          <div class="footer-accent-line"></div>
          <div class="footer-inner">
            <p class="footer-copy">&copy; 2026 <strong>My Portfolio</strong>. All rights reserved.</p>
            <div class="footer-social">
              <a href="#" class="footer-social-link" title="GitHub" aria-label="GitHub">
                <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              </a>
              <a href="#" class="footer-social-link" title="Email" aria-label="Email">
                <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              </a>
            </div>
            <p class="footer-tagline">Excellence in Innovation &amp; Technology</p>
          </div>
        </footer>
      `;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFooter);
  } else {
    loadFooter();
  }
})();
