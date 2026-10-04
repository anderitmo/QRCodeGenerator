/**
 * App Module - Main initialization, tab routing, PWA installation, Service Worker, Toast alerts.
 */

window.AppModule = (function () {
  let deferredPrompt = null;

  function initApp() {
    setupTabNavigation();
    setupPWAInstall();
    registerServiceWorker();

    // Initialize sub-modules
    window.HistoryModule?.init();
    window.ScannerModule?.init();
    window.GeneratorModule?.init();
  }

  function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.nav-tabs .tab-btn');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    const tabBtns = document.querySelectorAll('.nav-tabs .tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(b => {
      const isTarget = b.getAttribute('data-tab') === tabId;
      b.classList.toggle('active', isTarget);
      b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    panels.forEach(panel => {
      if (panel.id === tabId) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    // Stop camera if user switches away from scanner tab
    if (tabId !== 'tab-scanner') {
      window.ScannerModule?.stopCamera();
    }
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  function setupPWAInstall() {
    const installBtn = document.getElementById('pwa-install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) {
        installBtn.classList.remove('hidden');
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('Aplicativo instalado com sucesso!');
        }
        deferredPrompt = null;
        installBtn.classList.add('hidden');
      });
    }

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      if (installBtn) installBtn.classList.add('hidden');
      showToast('ScanCode instalado no dispositivo!');
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('[PWA] Service Worker registrado:', reg.scope))
          .catch(err => console.warn('[PWA] Falha ao registrar Service Worker:', err));
      });
    }
  }

  return {
    init: initApp,
    switchTab: switchTab,
    showToast: showToast
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.AppModule.init();
});
