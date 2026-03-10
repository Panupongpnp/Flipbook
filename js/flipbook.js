/* ===========================================
   FLIPBOOK ENGINE v2
   Realistic book-style page flip with drag
   Uses PDF.js + StPageFlip (page-flip)
   =========================================== */

const FlipBook = (function () {
  'use strict';

  // ─── State ───
  let pdfDoc = null;
  let pageFlip = null;
  let totalPages = 0;
  let renderedCanvases = {};
  let isReady = false;

  // ─── Zoom State ───
  let currentZoom = 1;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.25;
  let panX = 0, panY = 0;
  let isPanning = false;
  let panStartX = 0, panStartY = 0;
  let zoomWrapper = null;

  // ─── DOM ───
  let flipbookEl = null;
  let containerEl = null;
  let loadingEl = null;
  let controlsEl = null;
  let prevBtn = null;
  let nextBtn = null;
  let pageCurrentEl = null;
  let pageTotalEl = null;
  let progressBar = null;
  let uploadArea = null;
  let fileInput = null;
  let changePdfBtn = null;
  let changePdfInput = null;
  let zoomInBtn = null;
  let zoomOutBtn = null;
  let zoomResetBtn = null;
  let zoomLevelEl = null;

  // ─── Config ───
  const PDF_PATH = 'assets/portfolio.pdf';
  const RENDER_SCALE = 2; // Higher scale = sharper rendering

  /* ───────────────────────────────────────────
     INIT
     ─────────────────────────────────────────── */
  function init() {
    flipbookEl = document.getElementById('flipbook');
    containerEl = document.getElementById('flipbook-container');
    loadingEl = document.getElementById('flipbook-loading');
    controlsEl = document.getElementById('flipbook-controls');
    prevBtn = document.getElementById('flipbook-prev');
    nextBtn = document.getElementById('flipbook-next');
    pageCurrentEl = document.getElementById('page-current');
    pageTotalEl = document.getElementById('page-total');
    progressBar = document.getElementById('flipbook-progress-bar');
    uploadArea = document.getElementById('flipbook-upload-area');
    fileInput = document.getElementById('pdf-file-input');
    changePdfBtn = document.getElementById('change-pdf-btn');
    changePdfInput = document.getElementById('change-pdf-input');
    zoomInBtn = document.getElementById('zoom-in-btn');
    zoomOutBtn = document.getElementById('zoom-out-btn');
    zoomResetBtn = document.getElementById('zoom-reset-btn');
    zoomLevelEl = document.getElementById('zoom-level');

    if (!flipbookEl) return;

    // Wrap flipbook in zoom wrapper
    zoomWrapper = document.createElement('div');
    zoomWrapper.className = 'flipbook-zoom-wrapper';
    containerEl.insertBefore(zoomWrapper, flipbookEl);
    zoomWrapper.appendChild(flipbookEl);

    bindControlEvents();
    bindZoomEvents();
    tryLoadPDF(PDF_PATH);
  }

  /* ───────────────────────────────────────────
     EVENTS
     ─────────────────────────────────────────── */
  function bindControlEvents() {
    if (prevBtn) prevBtn.addEventListener('click', function () { if (pageFlip) pageFlip.flipPrev(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { if (pageFlip) pageFlip.flipNext(); });

    document.addEventListener('keydown', function (e) {
      if (!pageFlip) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); pageFlip.flipNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); pageFlip.flipPrev(); }
    });

    // Upload area handling
    if (uploadArea) {
      uploadArea.addEventListener('click', function (e) {
        // Only trigger file input if not clicking on another interactive element
        if (e.target === uploadArea || e.target.closest('.flipbook-upload-icon') ||
            e.target.closest('.flipbook-upload-title') || e.target.closest('.flipbook-upload-desc') ||
            e.target.closest('.flipbook-upload-btn')) {
          if (fileInput) fileInput.click();
        }
      });
      uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--color-accent)';
        uploadArea.style.background = 'linear-gradient(145deg, rgba(198,40,40,0.08), var(--color-gray-900))';
      });
      uploadArea.addEventListener('dragleave', function () {
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
      });
      uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
        if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type === 'application/pdf') {
          loadPDFFromFile(e.dataTransfer.files[0]);
        }
      });
    }
    if (fileInput) {
      fileInput.addEventListener('change', function (e) {
        if (e.target.files[0]) loadPDFFromFile(e.target.files[0]);
      });
    }

    // Change PDF button (shown after book is loaded)
    if (changePdfBtn) {
      changePdfBtn.addEventListener('click', function () {
        if (changePdfInput) changePdfInput.click();
      });
    }
    if (changePdfInput) {
      changePdfInput.addEventListener('change', function (e) {
        if (e.target.files[0]) loadPDFFromFile(e.target.files[0]);
      });
    }
  }

  /* ───────────────────────────────────────────
     PDF LOADING
     ─────────────────────────────────────────── */
  async function tryLoadPDF(url) {
    showLoading();
    try {
      pdfDoc = await pdfjsLib.getDocument(url).promise;
      totalPages = pdfDoc.numPages;
      await buildBook();
    } catch (err) {
      console.log('Could not auto-load PDF:', err.message);
      console.log('If opening via file://, please use a local server or upload the PDF manually.');
      showUploadArea();
    }
  }

  async function loadPDFFromFile(file) {
    showLoading();
    try {
      const buf = await file.arrayBuffer();
      pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      totalPages = pdfDoc.numPages;
      await buildBook();
    } catch (err) {
      console.error('Error loading PDF:', err);
      showUploadArea();
    }
  }

  /* ───────────────────────────────────────────
     BUILD BOOK — render all pages, then init StPageFlip
     ─────────────────────────────────────────── */
  async function buildBook() {
    // Clear previous
    flipbookEl.innerHTML = '';
    renderedCanvases = {};

    // Destroy old pageFlip instance if exists
    if (pageFlip) {
      try { pageFlip.destroy(); } catch (_) {}
      pageFlip = null;
    }

    // Render all pages to get dimensions
    const firstPage = await pdfDoc.getPage(1);
    const vp = firstPage.getViewport({ scale: 1 });
    const pageRatio = vp.height / vp.width;

    // Calculate optimal single-page size based on container
    const wrapperRect = containerEl.getBoundingClientRect();
    const availW = wrapperRect.width;
    const availH = wrapperRect.height;

    // Each page is half the width of the book
    let singlePageW = Math.floor(availW / 2);
    let singlePageH = Math.floor(singlePageW * pageRatio);

    if (singlePageH > availH) {
      singlePageH = availH;
      singlePageW = Math.floor(singlePageH / pageRatio);
    }

    // Update loading text for large PDFs
    const loadingText = document.querySelector('.flipbook-loading-text');
    
    // Render all pages as canvases with progress
    const canvases = [];
    for (let i = 1; i <= totalPages; i++) {
      if (loadingText) {
        loadingText.textContent = 'Rendering page ' + i + ' / ' + totalPages + '...';
      }
      const canvas = await renderPageCanvas(i, singlePageW, singlePageH);
      canvases.push(canvas);
    }

    // Build page elements for StPageFlip
    canvases.forEach(function (canvas, idx) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page-content';
      pageDiv.dataset.page = idx + 1;
      pageDiv.appendChild(canvas);
      flipbookEl.appendChild(pageDiv);
    });

    // If odd number of pages, add blank last page for even spread
    if (totalPages % 2 !== 0) {
      const blankDiv = document.createElement('div');
      blankDiv.className = 'page-content page-blank';
      blankDiv.innerHTML = '<div class="blank-page-inner"></div>';
      flipbookEl.appendChild(blankDiv);
    }

    // Init StPageFlip
    pageFlip = new St.PageFlip(flipbookEl, {
      width: singlePageW,
      height: singlePageH,
      size: 'fixed',
      minWidth: 200,
      maxWidth: 900,
      minHeight: 280,
      maxHeight: 1200,
      showCover: true,
      maxShadowOpacity: 0.6,
      mobileScrollSupport: false,
      drawShadow: true,
      flippingTime: 800,
      usePortrait: false,
      startZIndex: 0,
      autoSize: true,
      startPage: 0,
      clickEventForward: true,
      useMouseEvents: true,
      swipeDistance: 30,
      showPageCorners: true
    });

    pageFlip.loadFromHTML(document.querySelectorAll('#flipbook .page-content'));

    pageFlip.on('flip', function (e) {
      updatePageInfo(e.data);
    });

    pageFlip.on('changeState', function (e) {
      if (e.data === 'read') {
        const current = pageFlip.getCurrentPageIndex();
        updatePageInfo(current);
      }
    });

    hideLoading();
    hideUploadArea();
    showControls();
    updatePageInfo(0);
    isReady = true;
  }

  /* ───────────────────────────────────────────
     RENDER SINGLE PAGE TO CANVAS (high resolution)
     ─────────────────────────────────────────── */
  async function renderPageCanvas(pageNum, displayW, displayH) {
    const page = await pdfDoc.getPage(pageNum);

    // Render at higher resolution for sharpness
    const vp = page.getViewport({ scale: 1 });
    const scaleX = (displayW * RENDER_SCALE) / vp.width;
    const scaleY = (displayH * RENDER_SCALE) / vp.height;
    const scale = Math.min(scaleX, scaleY);
    const scaledVp = page.getViewport({ scale: scale });

    const canvas = document.createElement('canvas');
    canvas.width = scaledVp.width;
    canvas.height = scaledVp.height;
    // Display at 1x size but render at 2x for sharpness
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: scaledVp }).promise;

    renderedCanvases[pageNum] = canvas;
    return canvas;
  }

  /* ───────────────────────────────────────────
     UI
     ─────────────────────────────────────────── */
  function updatePageInfo(pageIndex) {
    const spreadLeft = pageIndex + 1;
    const spreadRight = Math.min(pageIndex + 2, totalPages);

    if (pageCurrentEl) {
      if (spreadLeft === spreadRight || spreadLeft >= totalPages) {
        pageCurrentEl.textContent = spreadLeft;
      } else {
        pageCurrentEl.textContent = spreadLeft + '-' + spreadRight;
      }
    }
    if (pageTotalEl) pageTotalEl.textContent = totalPages;

    if (prevBtn) prevBtn.disabled = (pageIndex <= 0);
    if (nextBtn) nextBtn.disabled = (pageIndex >= totalPages - 1);

    if (progressBar) {
      const pct = totalPages > 1 ? (pageIndex / (totalPages - 1)) * 100 : 100;
      progressBar.style.width = pct + '%';
    }
  }

  function showLoading() {
    if (loadingEl) loadingEl.style.display = 'flex';
    if (uploadArea) uploadArea.style.display = 'none';
  }
  function hideLoading() {
    if (loadingEl) loadingEl.style.display = 'none';
  }
  function showUploadArea() {
    hideLoading();
    if (uploadArea) uploadArea.style.display = 'flex';
    if (controlsEl) controlsEl.style.display = 'none';
  }
  function hideUploadArea() {
    if (uploadArea) uploadArea.style.display = 'none';
  }
  function showControls() {
    if (controlsEl) controlsEl.style.display = 'flex';
  }

  /* ───────────────────────────────────────────
     ZOOM SYSTEM
     ─────────────────────────────────────────── */
  function bindZoomEvents() {
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', zoomReset);

    // Mouse wheel zoom
    containerEl.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    }, { passive: false });

    // Pan when zoomed (mouse)
    containerEl.addEventListener('mousedown', function (e) {
      if (currentZoom <= 1) return;
      isPanning = true;
      panStartX = e.clientX - panX;
      panStartY = e.clientY - panY;
      zoomWrapper.classList.add('is-dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!isPanning) return;
      panX = e.clientX - panStartX;
      panY = e.clientY - panStartY;
      applyZoom();
    });

    document.addEventListener('mouseup', function () {
      if (isPanning) {
        isPanning = false;
        zoomWrapper.classList.remove('is-dragging');
        clampPan();
        applyZoom();
      }
    });

    // Pinch-to-zoom (touch)
    let lastTouchDist = 0;
    let touchPanStartX = 0, touchPanStartY = 0;
    let isTouchPanning = false;

    containerEl.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        // Pinch start
        lastTouchDist = getTouchDist(e.touches);
        e.preventDefault();
      } else if (e.touches.length === 1 && currentZoom > 1) {
        // Pan start
        isTouchPanning = true;
        touchPanStartX = e.touches[0].clientX - panX;
        touchPanStartY = e.touches[0].clientY - panY;
      }
    }, { passive: false });

    containerEl.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const delta = dist - lastTouchDist;
        if (Math.abs(delta) > 5) {
          if (delta > 0) zoomIn();
          else zoomOut();
          lastTouchDist = dist;
        }
      } else if (e.touches.length === 1 && isTouchPanning && currentZoom > 1) {
        e.preventDefault();
        panX = e.touches[0].clientX - touchPanStartX;
        panY = e.touches[0].clientY - touchPanStartY;
        applyZoom();
      }
    }, { passive: false });

    containerEl.addEventListener('touchend', function () {
      isTouchPanning = false;
      lastTouchDist = 0;
      clampPan();
      applyZoom();
    });
  }

  function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function zoomIn() {
    currentZoom = Math.min(currentZoom + ZOOM_STEP, ZOOM_MAX);
    clampPan();
    applyZoom();
  }

  function zoomOut() {
    currentZoom = Math.max(currentZoom - ZOOM_STEP, ZOOM_MIN);
    if (currentZoom <= 1) { panX = 0; panY = 0; }
    clampPan();
    applyZoom();
  }

  function zoomReset() {
    currentZoom = 1;
    panX = 0;
    panY = 0;
    applyZoom();
  }

  function clampPan() {
    if (currentZoom <= 1) { panX = 0; panY = 0; return; }
    const rect = containerEl.getBoundingClientRect();
    const maxPanX = (rect.width * (currentZoom - 1)) / 2;
    const maxPanY = (rect.height * (currentZoom - 1)) / 2;
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
  }

  function applyZoom() {
    if (zoomWrapper) {
      zoomWrapper.style.transform = 'scale(' + currentZoom + ') translate(' + (panX / currentZoom) + 'px, ' + (panY / currentZoom) + 'px)';
    }
    if (zoomLevelEl) {
      zoomLevelEl.textContent = Math.round(currentZoom * 100) + '%';
    }
    // Update cursor
    if (zoomWrapper) {
      zoomWrapper.style.cursor = currentZoom > 1 ? 'grab' : 'default';
    }
  }

  return { init: init };
})();
