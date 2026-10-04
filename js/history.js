/**
 * History Module - Manages LocalStorage, filtering, search, favorites, deletion and JSON/CSV exports.
 */

window.HistoryModule = (function () {
  const STORAGE_KEY = 'scancode_history_v1';
  let historyItems = [];
  let currentFilter = 'all';
  let searchQuery = '';

  function initHistory() {
    loadHistory();
    setupEventListeners();
    renderHistory();
  }

  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      historyItems = stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.warn('Erro ao carregar histórico do localStorage:', err);
      historyItems = [];
    }
    updateHistoryBadge();
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyItems));
    } catch (err) {
      console.warn('Erro ao salvar histórico:', err);
    }
    updateHistoryBadge();
  }

  function addHistoryItem(item) {
    // Avoid duplicate rapid entries
    const isDuplicate = historyItems.some(
      h => h.content === item.content && h.type === item.type && (Date.now() - h.timestamp < 3000)
    );
    if (isDuplicate) return;

    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: item.type, // 'scanned' or 'generated'
      codeType: item.codeType || 'QR_CODE',
      content: item.content,
      timestamp: Date.now(),
      isFavorite: false
    };

    historyItems.unshift(newItem);
    saveHistory();
    renderHistory();
  }

  function toggleFavorite(id) {
    const item = historyItems.find(h => h.id === id);
    if (item) {
      item.isFavorite = !item.isFavorite;
      saveHistory();
      renderHistory();
      window.AppModule?.showToast(item.isFavorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
    }
  }

  function deleteItem(id) {
    historyItems = historyItems.filter(h => h.id !== id);
    saveHistory();
    renderHistory();
    window.AppModule?.showToast('Item removido do histórico.');
  }

  function clearAllHistory() {
    if (historyItems.length === 0) return;
    if (confirm('Tem certeza que deseja apagar todo o histórico? Esta ação não pode ser desfeita.')) {
      historyItems = [];
      saveHistory();
      renderHistory();
      window.AppModule?.showToast('Histórico totalmente limpo.');
    }
  }

  function setupEventListeners() {
    const searchInput = document.getElementById('history-search');
    const chips = document.querySelectorAll('.filter-chips .chip');
    const exportJsonBtn = document.getElementById('btn-export-json');
    const exportCsvBtn = document.getElementById('btn-export-csv');
    const clearBtn = document.getElementById('btn-clear-history');

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderHistory();
    });

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.getAttribute('data-filter');
        renderHistory();
      });
    });

    exportJsonBtn.addEventListener('click', exportAsJSON);
    exportCsvBtn.addEventListener('click', exportAsCSV);
    clearBtn.addEventListener('click', clearAllHistory);
  }

  function renderHistory() {
    const listContainer = document.getElementById('history-list');
    if (!listContainer) return;

    const filtered = getFilteredItems();

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-history">
          <svg class="icon-lg" viewBox="0 0 24 24"><path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 7 7 7.07 7.07 0 0 1-6-3.41l-1.42 1.42A8.92 8.92 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
          <p style="margin-top:0.5rem; font-weight:600;">Nenhum item no histórico</p>
          <p class="subtitle">Códigos lidos ou gerados aparecerão aqui.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(item => {
      const formattedDate = new Date(item.timestamp).toLocaleString('pt-BR');
      const categoryTag = item.type === 'scanned' ? '📷 Lido' : '⚡ Gerado';
      const favClass = item.isFavorite ? 'fav-active' : '';

      return `
        <div class="history-item" data-id="${item.id}">
          <div class="history-item-info">
            <div class="history-item-header">
              <span class="badge ${item.type === 'scanned' ? 'badge-success' : 'badge-type'}">${categoryTag}</span>
              <span class="badge" style="background-color: var(--bg-subtle); color: var(--text-muted);">${escapeHtml(item.codeType)}</span>
              <span class="history-item-date">${formattedDate}</span>
            </div>
            <div class="history-item-content" title="${escapeHtml(item.content)}">${escapeHtml(item.content)}</div>
          </div>

          <div class="history-item-actions">
            <button class="btn-icon ${favClass}" onclick="window.HistoryModule.toggleFavorite('${item.id}')" title="Favoritar">
              <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            </button>
            <button class="btn-icon" onclick="window.HistoryModule.copyContent('${escapeJsString(item.content)}')" title="Copiar">
              <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            </button>
            <button class="btn-icon" onclick="window.HistoryModule.openInGenerator('${escapeJsString(item.content)}', '${escapeJsString(item.codeType)}')" title="Abrir no Gerador">
              <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 5v14h2V5H3zm4 0v14h1V5H7zm3 0v14h2V5h-2zm4 0v14h1V5h-1zm3 0v14h2V5h-2zm4 0v14h1V5h-1z"/></svg>
            </button>
            <button class="btn-icon" onclick="window.HistoryModule.deleteItem('${item.id}')" title="Excluir">
              <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function getFilteredItems() {
    return historyItems.filter(item => {
      const matchesFilter =
        currentFilter === 'all' ||
        (currentFilter === 'scanned' && item.type === 'scanned') ||
        (currentFilter === 'generated' && item.type === 'generated') ||
        (currentFilter === 'favorites' && item.isFavorite);

      const matchesSearch =
        !searchQuery ||
        item.content.toLowerCase().includes(searchQuery) ||
        item.codeType.toLowerCase().includes(searchQuery);

      return matchesFilter && matchesSearch;
    });
  }

  function updateHistoryBadge() {
    const badge = document.getElementById('history-badge');
    if (badge) {
      badge.textContent = historyItems.length;
    }
  }

  function copyContent(text) {
    navigator.clipboard.writeText(text)
      .then(() => window.AppModule?.showToast('Copiado para a área de transferência!'))
      .catch(() => window.AppModule?.showToast('Erro ao copiar.', 'error'));
  }

  function openInGenerator(content, type) {
    window.AppModule?.switchTab('tab-generator');
    window.GeneratorModule?.setGeneratorContent(content, type);
  }

  function exportAsJSON() {
    if (historyItems.length === 0) {
      window.AppModule?.showToast('Histórico vazio para exportar.', 'error');
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historyItems, null, 2));
    triggerDownload(dataStr, `scancode-historico-${getTimestampStr()}.json`);
    window.AppModule?.showToast('Exportação JSON concluída!');
  }

  function exportAsCSV() {
    if (historyItems.length === 0) {
      window.AppModule?.showToast('Histórico vazio para exportar.', 'error');
      return;
    }

    const headers = ['ID', 'Tipo', 'Formato', 'Conteudo', 'Data', 'Favorito'];
    const rows = historyItems.map(item => [
      item.id,
      item.type,
      item.codeType,
      `"${item.content.replace(/"/g, '""')}"`,
      new Date(item.timestamp).toISOString(),
      item.isFavorite ? 'Sim' : 'Nao'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(csvContent, `scancode-historico-${getTimestampStr()}.csv`);
    window.AppModule?.showToast('Exportação CSV concluída!');
  }

  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function getTimestampStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeJsString(str) {
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"');
  }

  return {
    init: initHistory,
    addHistoryItem: addHistoryItem,
    toggleFavorite: toggleFavorite,
    deleteItem: deleteItem,
    copyContent: copyContent,
    openInGenerator: openInGenerator
  };
})();
