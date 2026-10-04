/**
 * Generator Module - Handles generating QR Codes and 1D Barcodes, customization, and image downloads.
 */

window.GeneratorModule = (function () {
  let debounceTimer = null;

  function initGenerator() {
    setupEventListeners();
    renderGeneratedCode();
  }

  function setupEventListeners() {
    const typeSelect = document.getElementById('gen-type');
    const contentInput = document.getElementById('gen-content');
    const colorFgInput = document.getElementById('gen-color-fg');
    const colorBgInput = document.getElementById('gen-color-bg');
    const scaleInput = document.getElementById('gen-scale');
    const saveBtn = document.getElementById('btn-generate-save');
    const downloadPngBtn = document.getElementById('btn-download-png');
    const downloadSvgBtn = document.getElementById('btn-download-svg');

    // Color label updates
    colorFgInput.addEventListener('input', (e) => {
      document.getElementById('gen-color-fg-val').textContent = e.target.value.toUpperCase();
      debouncedRender();
    });

    colorBgInput.addEventListener('input', (e) => {
      document.getElementById('gen-color-bg-val').textContent = e.target.value.toUpperCase();
      debouncedRender();
    });

    typeSelect.addEventListener('change', () => {
      updateHelperText();
      renderGeneratedCode();
    });

    contentInput.addEventListener('input', debouncedRender);
    scaleInput.addEventListener('input', debouncedRender);

    saveBtn.addEventListener('click', saveToHistory);
    downloadPngBtn.addEventListener('click', downloadAsPNG);
    downloadSvgBtn.addEventListener('click', downloadAsSVG);
  }

  function debouncedRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderGeneratedCode, 200);
  }

  function updateHelperText() {
    const type = document.getElementById('gen-type').value;
    const helper = document.getElementById('gen-helper');

    switch (type) {
      case 'EAN13':
        helper.textContent = 'Requer 12 ou 13 dígitos numéricos.';
        break;
      case 'EAN8':
        helper.textContent = 'Requer 7 ou 8 dígitos numéricos.';
        break;
      case 'UPC':
        helper.textContent = 'Requer 11 ou 12 dígitos numéricos.';
        break;
      case 'CODE39':
        helper.textContent = 'Aceita letras maiúsculas (A-Z), números (0-9) e caracteres especiais (- . $ / + % espaço).';
        break;
      case 'CODE128':
        helper.textContent = 'Aceita qualquer caractere ASCII.';
        break;
      case 'QR_CODE':
      default:
        helper.textContent = 'Digite qualquer texto, número ou URL para o QR Code.';
        break;
    }
  }

  function renderGeneratedCode() {
    const type = document.getElementById('gen-type').value;
    const content = document.getElementById('gen-content').value.trim();
    const colorFg = document.getElementById('gen-color-fg').value;
    const colorBg = document.getElementById('gen-color-bg').value;
    const scale = parseInt(document.getElementById('gen-scale').value, 10);

    const outputContainer = document.getElementById('code-output');
    const errorBox = document.getElementById('gen-error');
    const errorMsg = document.getElementById('gen-error-msg');

    outputContainer.innerHTML = '';
    errorBox.classList.add('hidden');

    if (!content) {
      showError('O conteúdo do código não pode estar vazio.');
      return;
    }

    try {
      if (type === 'QR_CODE') {
        renderQRCode(content, colorFg, colorBg, scale, outputContainer);
      } else {
        renderBarcode(type, content, colorFg, colorBg, scale, outputContainer);
      }
    } catch (err) {
      console.warn('Erro ao gerar código:', err);
      showError(err.message || 'Falha ao gerar o código com as configurações atuais.');
    }
  }

  function renderQRCode(content, colorFg, colorBg, scale, container) {
    if (typeof QRCode === 'undefined' && typeof QRCode?.toCanvas === 'undefined') {
      showError('Biblioteca QRCode não carregada.');
      return;
    }

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const size = scale * 70; // responsive scale sizing

    QRCode.toCanvas(
      canvas,
      content,
      {
        width: size,
        margin: 2,
        color: {
          dark: colorFg,
          light: colorBg
        }
      },
      (err) => {
        if (err) {
          container.innerHTML = '';
          showError('Conteúdo inválido para gerar QR Code.');
        }
      }
    );
  }

  function renderBarcode(format, content, colorFg, colorBg, scale, container) {
    if (typeof JsBarcode === 'undefined') {
      showError('Biblioteca JsBarcode não carregada.');
      return;
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'barcode-svg');
    container.appendChild(svg);

    try {
      JsBarcode(svg, content, {
        format: format,
        lineColor: colorFg,
        background: colorBg,
        width: Math.max(1, Math.floor(scale / 2)),
        height: 100,
        displayValue: true,
        fontSize: 16,
        margin: 10,
        valid: (valid) => {
          if (!valid) {
            container.innerHTML = '';
            showError(`Formato ${format} inválido para os dados fornecidos.`);
          }
        }
      });
    } catch (err) {
      container.innerHTML = '';
      showError(`Formato ${format} inválido para os dados fornecidos.`);
    }
  }

  function showError(msg) {
    const errorBox = document.getElementById('gen-error');
    const errorMsg = document.getElementById('gen-error-msg');
    errorMsg.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  function saveToHistory() {
    const type = document.getElementById('gen-type').value;
    const content = document.getElementById('gen-content').value.trim();

    if (!content) {
      window.AppModule?.showToast('Digite algum conteúdo antes de salvar.', 'error');
      return;
    }

    window.HistoryModule?.addHistoryItem({
      type: 'generated',
      codeType: type,
      content: content
    });

    window.AppModule?.showToast('Código salvo no Histórico!');
  }

  function downloadAsPNG() {
    const type = document.getElementById('gen-type').value;
    const container = document.getElementById('code-output');
    const canvas = container.querySelector('canvas');
    const svg = container.querySelector('svg');

    if (canvas) {
      triggerDownload(canvas.toDataURL('image/png'), `scancode-${type.toLowerCase()}.png`);
      window.AppModule?.showToast('Download de PNG iniciado!');
      return;
    }

    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width || 300;
        tempCanvas.height = img.height || 150;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(blobURL);
        triggerDownload(tempCanvas.toDataURL('image/png'), `scancode-${type.toLowerCase()}.png`);
        window.AppModule?.showToast('Download de PNG iniciado!');
      };
      img.src = blobURL;
      return;
    }

    window.AppModule?.showToast('Nenhum código gerado para baixar.', 'error');
  }

  function downloadAsSVG() {
    const type = document.getElementById('gen-type').value;
    const container = document.getElementById('code-output');
    const svg = container.querySelector('svg');
    const canvas = container.querySelector('canvas');

    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `scancode-${type.toLowerCase()}.svg`);
      URL.revokeObjectURL(url);
      window.AppModule?.showToast('Download de SVG iniciado!');
      return;
    }

    if (canvas) {
      // Convert Canvas QR code to SVG representation
      const typeSelect = document.getElementById('gen-type').value;
      const content = document.getElementById('gen-content').value.trim();
      const colorFg = document.getElementById('gen-color-fg').value;
      const colorBg = document.getElementById('gen-color-bg').value;

      if (typeof QRCode !== 'undefined' && QRCode.toString) {
        QRCode.toString(content, { type: 'svg', color: { dark: colorFg, light: colorBg } }, (err, svgString) => {
          if (!err && svgString) {
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            triggerDownload(url, `scancode-qrcode.svg`);
            URL.revokeObjectURL(url);
            window.AppModule?.showToast('Download de SVG iniciado!');
          } else {
            window.AppModule?.showToast('Erro ao converter QR Code para SVG.', 'error');
          }
        });
        return;
      }
    }

    window.AppModule?.showToast('Nenhum código gerado para baixar.', 'error');
  }

  function triggerDownload(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function setGeneratorContent(content, type) {
    const typeSelect = document.getElementById('gen-type');
    const contentInput = document.getElementById('gen-content');

    if (typeSelect && type) {
      const matchOpt = Array.from(typeSelect.options).find(opt => opt.value === type);
      if (matchOpt) {
        typeSelect.value = type;
      } else {
        typeSelect.value = 'QR_CODE';
      }
    }

    if (contentInput && content) {
      contentInput.value = content;
    }

    updateHelperText();
    renderGeneratedCode();
  }

  return {
    init: initGenerator,
    setGeneratorContent: setGeneratorContent
  };
})();
