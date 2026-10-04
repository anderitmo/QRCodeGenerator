/**
 * Scanner Module - Handles live camera scanning and file upload parsing using Html5Qrcode
 */

window.ScannerModule = (function () {
  let html5QrCode = null;
  let isScanning = false;
  let currentScanResult = null;

  function initScanner() {
    setupModeToggle();
    setupCameraControls();
    setupFileUpload();
    setupResultActions();
    populateCameras();
  }

  function setupModeToggle() {
    const btnCamera = document.getElementById('mode-camera-btn');
    const btnFile = document.getElementById('mode-file-btn');
    const cameraSection = document.getElementById('camera-section');
    const fileSection = document.getElementById('file-section');

    btnCamera.addEventListener('click', () => {
      btnCamera.classList.add('active');
      btnFile.classList.remove('active');
      cameraSection.classList.remove('hidden');
      fileSection.classList.add('hidden');
    });

    btnFile.addEventListener('click', () => {
      btnFile.classList.add('active');
      btnCamera.classList.remove('active');
      fileSection.classList.remove('hidden');
      cameraSection.classList.add('hidden');
      stopCamera();
    });
  }

  async function populateCameras() {
    const cameraSelect = document.getElementById('camera-select');
    if (!cameraSelect) return;

    try {
      if (typeof Html5Qrcode === 'undefined') {
        cameraSelect.innerHTML = '<option value="">Erro ao carregar bibliotecas de scanner</option>';
        return;
      }
      const devices = await Html5Qrcode.getCameras();
      cameraSelect.innerHTML = '';

      if (devices && devices.length > 0) {
        devices.forEach((device, index) => {
          const option = document.createElement('option');
          option.value = device.id;
          option.text = device.label || `Câmera ${index + 1}`;
          cameraSelect.appendChild(option);
        });
      } else {
        cameraSelect.innerHTML = '<option value="">Nenhuma câmera encontrada</option>';
      }
    } catch (err) {
      console.warn('Erro ao listar câmeras:', err);
      cameraSelect.innerHTML = '<option value="">Câmera indisponível / Sem permissão</option>';
    }
  }

  function setupCameraControls() {
    const toggleBtn = document.getElementById('toggle-camera-btn');
    toggleBtn.addEventListener('click', () => {
      if (isScanning) {
        stopCamera();
      } else {
        startCamera();
      }
    });
  }

  async function startCamera() {
    const cameraSelect = document.getElementById('camera-select');
    const toggleBtn = document.getElementById('toggle-camera-btn');
    const placeholder = document.getElementById('camera-placeholder');

    if (typeof Html5Qrcode === 'undefined') {
      window.AppModule?.showToast('Biblioteca de scanner não carregada.', 'error');
      return;
    }

    try {
      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode('reader');
      }

      const cameraId = cameraSelect.value;
      const cameraConfig = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' };

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      placeholder.classList.add('hidden');

      await html5QrCode.start(
        cameraConfig,
        config,
        onScanSuccess,
        onScanError
      );

      isScanning = true;
      toggleBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
        Parar Câmera
      `;
      toggleBtn.classList.replace('btn-primary', 'btn-secondary');
      window.AppModule?.showToast('Câmera iniciada com sucesso.');

    } catch (err) {
      console.error('Falha ao iniciar câmera:', err);
      placeholder.classList.remove('hidden');
      window.AppModule?.showToast('Não foi possível acessar a câmera.', 'error');
    }
  }

  async function stopCamera() {
    const toggleBtn = document.getElementById('toggle-camera-btn');
    const placeholder = document.getElementById('camera-placeholder');

    if (html5QrCode && isScanning) {
      try {
        await html5QrCode.stop();
      } catch (err) {
        console.warn('Erro ao parar câmera:', err);
      }
      isScanning = false;
    }

    if (toggleBtn) {
      toggleBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>
        Iniciar Câmera
      `;
      toggleBtn.classList.replace('btn-secondary', 'btn-primary');
    }

    if (placeholder) {
      placeholder.classList.remove('hidden');
    }
  }

  function setupFileUpload() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const filePreviewContainer = document.getElementById('file-preview-container');
    const filePreview = document.getElementById('file-preview');
    const clearFileBtn = document.getElementById('clear-file-btn');

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });

    clearFileBtn.addEventListener('click', () => {
      fileInput.value = '';
      filePreviewContainer.classList.add('hidden');
      dropZone.classList.remove('hidden');
      document.getElementById('scan-result-card').classList.add('hidden');
    });
  }

  async function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
      window.AppModule?.showToast('Por favor, selecione um arquivo de imagem válido.', 'error');
      return;
    }

    const dropZone = document.getElementById('drop-zone');
    const filePreviewContainer = document.getElementById('file-preview-container');
    const filePreview = document.getElementById('file-preview');

    const reader = new FileReader();
    reader.onload = (e) => {
      filePreview.src = e.target.result;
      dropZone.classList.add('hidden');
      filePreviewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    try {
      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode('reader');
      }

      const decodedResult = await html5QrCode.scanFileV2(file, true);
      if (decodedResult && decodedResult.decodedText) {
        onScanSuccess(decodedResult.decodedText, decodedResult);
      } else {
        window.AppModule?.showToast('Nenhum código reconhecido na imagem.', 'error');
      }
    } catch (err) {
      console.warn('Erro ao decodificar imagem:', err);
      window.AppModule?.showToast('Nenhum QR Code ou Código de Barras válido encontrado.', 'error');
    }
  }

  function onScanSuccess(decodedText, decodedResult) {
    currentScanResult = decodedText;
    const formatName = decodedResult?.result?.format?.formatName || 'CÓDIGO DILIGENCIADO';

    const resultCard = document.getElementById('scan-result-card');
    const resultText = document.getElementById('scan-result-text');
    const formatBadge = document.getElementById('scan-format-badge');
    const openLinkBtn = document.getElementById('open-link-btn');

    resultText.value = decodedText;
    formatBadge.textContent = formatName;
    resultCard.classList.remove('hidden');

    // Link check
    if (isValidUrl(decodedText)) {
      openLinkBtn.href = decodedText;
      openLinkBtn.classList.remove('hidden');
    } else {
      openLinkBtn.classList.add('hidden');
    }

    // Save to history
    window.HistoryModule?.addHistoryItem({
      type: 'scanned',
      codeType: formatName,
      content: decodedText
    });

    window.AppModule?.showToast('Código lido com sucesso!');

    // Vibrate feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
  }

  function onScanError(errorMessage) {
    // Ignore continuous frame search logs
  }

  function setupResultActions() {
    const copyBtn = document.getElementById('copy-scan-btn');
    const searchBtn = document.getElementById('search-google-btn');
    const clearBtn = document.getElementById('clear-scan-btn');
    const resultCard = document.getElementById('scan-result-card');

    copyBtn.addEventListener('click', () => {
      if (!currentScanResult) return;
      navigator.clipboard.writeText(currentScanResult)
        .then(() => window.AppModule?.showToast('Copiado para a área de transferência!'))
        .catch(() => window.AppModule?.showToast('Erro ao copiar.', 'error'));
    });

    searchBtn.addEventListener('click', () => {
      if (!currentScanResult) return;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(currentScanResult)}`;
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    });

    clearBtn.addEventListener('click', () => {
      currentScanResult = null;
      resultCard.classList.add('hidden');
    });
  }

  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  return {
    init: initScanner,
    stopCamera: stopCamera
  };
})();
