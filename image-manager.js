/**
 * Açaí Prime - Módulo Banco de Imagens
 * image-manager.js
 * 
 * Gerencia upload, armazenamento, listagem, busca e exclusão de imagens.
 * Expõe: window.imageManager, window.openImageManager(), window.closeImageManager()
 */

// ==================== CONSTANTES ====================
const IMAGE_BANK_KEY = 'acai_image_bank';
const PRODUCTS_CONFIG_KEY = 'acai_products_config';
const APP_DATA_KEY = 'acaiPrimeData';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ==================== CLASSE IMAGEMANAGER ====================
class ImageManager {
    constructor() {
        this.storageKey = IMAGE_BANK_KEY;
    }

    /**
     * Retorna todas as imagens do banco
     * @returns {ImageItem[]}
     */
    getAll() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('[ImageManager] Erro ao carregar banco de imagens:', e);
            return [];
        }
    }

    /**
     * Retorna imagem por ID
     * @param {string} id
     * @returns {ImageItem|null}
     */
    getById(id) {
        if (!id) return null;
        const images = this.getAll();
        return images.find(img => img.id === id) || null;
    }

    /**
     * Faz upload de um File, valida e armazena no localStorage
     * @param {File} file
     * @returns {Promise<ImageItem>}
     */
    async upload(file) {
        // Validação de formato
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error(`Formato inválido. Use: JPEG, PNG, GIF ou WebP.`);
        }
        // Validação de tamanho
        if (file.size > MAX_SIZE_BYTES) {
            throw new Error(`Arquivo muito grande. Máximo: 5 MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(2)} MB.`);
        }

        // Converter para Base64
        const dataUrl = await this._fileToBase64(file);

        const imageItem = {
            id: this._generateId(),
            name: file.name,
            dataUrl: dataUrl,
            size: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString()
        };

        // Persistir
        const images = this.getAll();
        images.push(imageItem);
        this._save(images);

        return imageItem;
    }

    /**
     * Remove imagem por ID. Retorna lista de itens vinculados.
     * @param {string} id
     * @returns {{ linkedItems: string[], deleted: boolean }}
     */
    delete(id) {
        const linkedItems = this.getLinkedItems(id);
        const images = this.getAll().filter(img => img.id !== id);
        this._save(images);
        return { linkedItems, deleted: true };
    }

    /**
     * Busca imagens por nome (case-insensitive, parcial)
     * @param {string} term
     * @returns {ImageItem[]}
     */
    search(term) {
        if (!term || term.trim() === '') return this.getAll();
        const lower = term.toLowerCase();
        return this.getAll().filter(img => img.name.toLowerCase().includes(lower));
    }

    /**
     * Verifica se imagem está vinculada a algum produto ou logo
     * @param {string} id
     * @returns {string[]} nomes dos itens vinculados
     */
    getLinkedItems(id) {
        const linked = [];

        // Verificar produtos
        try {
            const appData = localStorage.getItem(APP_DATA_KEY);
            if (appData) {
                const data = JSON.parse(appData);
                const produtos = data.produtos || [];
                produtos.forEach(p => {
                    if (p.imagem === id) {
                        linked.push(`Produto: ${p.nome}`);
                    }
                });
            }
        } catch (e) {
            console.warn('[ImageManager] Erro ao verificar produtos vinculados:', e);
        }

        // Verificar logo
        try {
            const configData = localStorage.getItem(PRODUCTS_CONFIG_KEY);
            if (configData) {
                const config = JSON.parse(configData);
                if (config.logoImageId === id) {
                    linked.push('Logo do estabelecimento');
                }
            }
        } catch (e) {
            console.warn('[ImageManager] Erro ao verificar logo vinculada:', e);
        }

        return linked;
    }

    // ==================== MÉTODOS PRIVADOS ====================

    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
            reader.readAsDataURL(file);
        });
    }

    _generateId() {
        return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    _save(images) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(images));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                throw new Error('Espaço de armazenamento esgotado. Exclua imagens antigas para liberar espaço.');
            }
            throw e;
        }
    }

    /**
     * Formata tamanho em bytes para exibição
     * @param {number} bytes
     * @returns {string}
     */
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    }

    /**
     * Formata data ISO para exibição
     * @param {string} isoDate
     * @returns {string}
     */
    formatDate(isoDate) {
        return new Date(isoDate).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
}

// ==================== SINGLETON ====================
window.imageManager = new ImageManager();

// ==================== MODAL UI ====================

let _modalCallback = null;
let _modalMode = 'management'; // 'management' | 'selection'
let _modalInjected = false;

/**
 * Abre o modal do Banco de Imagens
 * @param {'management'|'selection'} mode
 * @param {function|null} onSelect - callback(imageId) para modo seleção
 */
window.openImageManager = function(mode = 'management', onSelect = null) {
    _modalMode = mode;
    _modalCallback = onSelect;

    if (!_modalInjected) {
        _injectModalStyles();
        _injectModalHTML();
        _modalInjected = true;
    }

    _renderImageGrid();
    document.getElementById('imgMgrModal').classList.add('active');
    document.body.style.overflow = 'hidden';
};

/**
 * Fecha o modal do Banco de Imagens
 */
window.closeImageManager = function() {
    const modal = document.getElementById('imgMgrModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    _modalCallback = null;
};

// ==================== FUNÇÕES INTERNAS DO MODAL ====================

function _injectModalStyles() {
    const style = document.createElement('style');
    style.id = 'imgMgrStyles';
    style.textContent = `
        #imgMgrModal {
            display: none;
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.85);
            z-index: 9000;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        #imgMgrModal.active { display: flex; }

        .imgmgr-container {
            background: var(--surface, #1E1E1E);
            border: 1px solid var(--border, rgba(206, 147, 216,0.15));
            border-radius: 20px;
            width: 100%;
            max-width: 900px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .imgmgr-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 20px 24px;
            border-bottom: 1px solid var(--border, rgba(206, 147, 216,0.15));
            flex-wrap: wrap;
        }

        .imgmgr-header h2 {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 24px;
            letter-spacing: 1px;
            color: var(--primary, #7B1FA2);
            margin-right: auto;
        }

        .imgmgr-search {
            display: flex;
            align-items: center;
            background: var(--background, #0D0D0D);
            border: 1px solid var(--border, rgba(206, 147, 216,0.15));
            border-radius: 10px;
            padding: 8px 14px;
            gap: 8px;
            min-width: 200px;
        }

        .imgmgr-search input {
            background: none;
            border: none;
            color: var(--text-primary, #fff);
            font-size: 14px;
            outline: none;
            width: 100%;
        }

        .imgmgr-search input::placeholder { color: var(--text-secondary, #A0A0A0); }

        .imgmgr-upload-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: linear-gradient(135deg, var(--primary, #7B1FA2), #9C27B0);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .imgmgr-upload-btn:hover { transform: translateY(-1px); box-shadow: 0 0 16px rgba(255,107,0,0.4); }

        .imgmgr-close-btn {
            width: 40px; height: 40px;
            background: var(--surface-light, #2A2A2A);
            border: none; border-radius: 10px;
            color: var(--text-secondary, #A0A0A0);
            font-size: 18px; cursor: pointer;
            transition: color 0.2s;
        }
        .imgmgr-close-btn:hover { color: #FF3D00; }

        .imgmgr-mode-badge {
            padding: 4px 12px;
            background: rgba(206, 147, 216,0.15);
            color: var(--accent, #CE93D8);
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }

        .imgmgr-body {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
        }

        .imgmgr-empty {
            text-align: center;
            padding: 64px 24px;
            color: var(--text-secondary, #A0A0A0);
        }
        .imgmgr-empty i { font-size: 48px; margin-bottom: 16px; opacity: 0.4; display: block; }

        .imgmgr-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 16px;
        }

        .imgmgr-card {
            background: var(--background, #0D0D0D);
            border: 2px solid var(--border, rgba(206, 147, 216,0.15));
            border-radius: 14px;
            overflow: hidden;
            transition: all 0.2s;
            cursor: pointer;
            position: relative;
        }

        .imgmgr-card:hover {
            border-color: var(--primary, #7B1FA2);
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(255,107,0,0.2);
        }

        .imgmgr-card.selection-mode:hover::after {
            content: '✓ Selecionar';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,107,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 14px;
            border-radius: 12px;
        }

        .imgmgr-thumb {
            width: 100%;
            height: 120px;
            object-fit: cover;
            display: block;
        }

        .imgmgr-card-info {
            padding: 10px 12px;
        }

        .imgmgr-card-name {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-primary, #fff);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 4px;
        }

        .imgmgr-card-meta {
            font-size: 11px;
            color: var(--text-secondary, #A0A0A0);
            margin-bottom: 8px;
        }

        .imgmgr-delete-btn {
            width: 100%;
            padding: 6px;
            background: rgba(255,61,0,0.15);
            color: #FF3D00;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .imgmgr-delete-btn:hover { background: #FF3D00; color: white; }

        .imgmgr-count {
            font-size: 13px;
            color: var(--text-secondary, #A0A0A0);
            padding: 12px 24px;
            border-top: 1px solid var(--border, rgba(206, 147, 216,0.15));
        }

        @media (max-width: 600px) {
            .imgmgr-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
            .imgmgr-header { gap: 8px; }
            .imgmgr-search { min-width: 140px; }
        }
    `;
    document.head.appendChild(style);
}

function _injectModalHTML() {
    const div = document.createElement('div');
    div.id = 'imgMgrModal';
    div.innerHTML = `
        <div class="imgmgr-container">
            <div class="imgmgr-header">
                <h2><i class="fas fa-images"></i> Banco de Imagens</h2>
                <span class="imgmgr-mode-badge" id="imgMgrModeBadge">Gerenciamento</span>
                <div class="imgmgr-search">
                    <i class="fas fa-search" style="color:var(--text-secondary,#A0A0A0);font-size:13px;"></i>
                    <input type="text" id="imgMgrSearch" placeholder="Buscar por nome..." oninput="_imgMgrSearch(this.value)">
                </div>
                <button class="imgmgr-upload-btn" onclick="_imgMgrTriggerUpload()">
                    <i class="fas fa-upload"></i> Upload
                </button>
                <input type="file" id="imgMgrFileInput" accept="image/jpeg,image/png,image/gif,image/webp" hidden onchange="_imgMgrHandleUpload(this)">
                <button class="imgmgr-close-btn" onclick="closeImageManager()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="imgmgr-body" id="imgMgrBody">
                <!-- Grid renderizado dinamicamente -->
            </div>
            <div class="imgmgr-count" id="imgMgrCount">0 imagens</div>
        </div>
    `;
    document.body.appendChild(div);

    // Fechar ao clicar no overlay
    div.addEventListener('click', (e) => {
        if (e.target === div) closeImageManager();
    });
}

function _renderImageGrid(searchTerm = '') {
    const body = document.getElementById('imgMgrBody');
    const countEl = document.getElementById('imgMgrCount');
    const modeBadge = document.getElementById('imgMgrModeBadge');
    const searchInput = document.getElementById('imgMgrSearch');

    if (!body) return;

    // Atualizar badge de modo
    if (modeBadge) {
        modeBadge.textContent = _modalMode === 'selection' ? '🖱 Clique para selecionar' : 'Gerenciamento';
        modeBadge.style.background = _modalMode === 'selection' ? 'rgba(0,200,83,0.2)' : 'rgba(206, 147, 216,0.15)';
        modeBadge.style.color = _modalMode === 'selection' ? '#00C853' : 'var(--accent,#CE93D8)';
    }

    const images = searchTerm ? window.imageManager.search(searchTerm) : window.imageManager.getAll();

    if (countEl) {
        countEl.textContent = `${images.length} imagem${images.length !== 1 ? 's' : ''}`;
    }

    if (images.length === 0) {
        body.innerHTML = `
            <div class="imgmgr-empty">
                <i class="fas fa-images"></i>
                <p>${searchTerm ? 'Nenhuma imagem encontrada para "' + searchTerm + '"' : 'Nenhuma imagem no banco. Clique em Upload para adicionar.'}</p>
            </div>
        `;
        return;
    }

    const isSelection = _modalMode === 'selection';

    body.innerHTML = `
        <div class="imgmgr-grid">
            ${images.map(img => `
                <div class="imgmgr-card ${isSelection ? 'selection-mode' : ''}"
                     onclick="${isSelection ? `_imgMgrSelect('${img.id}')` : ''}">
                    <img class="imgmgr-thumb" src="${img.dataUrl}" alt="${_escapeHtml(img.name)}" loading="lazy">
                    <div class="imgmgr-card-info">
                        <div class="imgmgr-card-name" title="${_escapeHtml(img.name)}">${_escapeHtml(img.name)}</div>
                        <div class="imgmgr-card-meta">
                            ${window.imageManager.formatSize(img.size)}<br>
                            ${window.imageManager.formatDate(img.uploadedAt)}
                        </div>
                        ${!isSelection ? `
                            <button class="imgmgr-delete-btn" onclick="event.stopPropagation(); _imgMgrDelete('${img.id}')">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function _imgMgrSearch(term) {
    _renderImageGrid(term);
}

function _imgMgrTriggerUpload() {
    const input = document.getElementById('imgMgrFileInput');
    if (input) {
        input.value = ''; // reset para permitir re-upload do mesmo arquivo
        input.click();
    }
}

async function _imgMgrHandleUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const btn = document.querySelector('.imgmgr-upload-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        btn.disabled = true;
    }

    try {
        await window.imageManager.upload(file);
        const searchTerm = document.getElementById('imgMgrSearch')?.value || '';
        _renderImageGrid(searchTerm);
        _showImgMgrToast(`✅ "${file.name}" adicionada ao banco!`, 'success');
    } catch (err) {
        _showImgMgrToast(`❌ ${err.message}`, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-upload"></i> Upload';
            btn.disabled = false;
        }
    }
}

function _imgMgrSelect(imageId) {
    if (_modalCallback && typeof _modalCallback === 'function') {
        _modalCallback(imageId);
    }
    closeImageManager();
}

function _imgMgrDelete(imageId) {
    const img = window.imageManager.getById(imageId);
    if (!img) return;

    const linkedItems = window.imageManager.getLinkedItems(imageId);

    let confirmMsg = `Excluir a imagem "${img.name}"?`;
    if (linkedItems.length > 0) {
        confirmMsg += ` Esta imagem está vinculada a: ${linkedItems.join(', ')}. Ao excluir, esses itens voltarão ao ícone padrão.`;
    }

    const doDelete = () => {
        window.imageManager.delete(imageId);
        const searchTerm = document.getElementById('imgMgrSearch')?.value || '';
        _renderImageGrid(searchTerm);
        _showImgMgrToast('🗑️ Imagem excluída.', 'success');
    };

    if (typeof showConfirm === 'function') {
        showConfirm(confirmMsg, doDelete);
    } else {
        if (confirm(confirmMsg)) doDelete();
    }
}

function _showImgMgrToast(message, type = 'success') {
    // Usar o sistema de toast do app se disponível
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    // Fallback simples
    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
        background:${type === 'error' ? '#FF3D00' : '#00C853'};
        color:white; padding:14px 28px; border-radius:12px;
        font-weight:600; z-index:99999; font-size:14px;
        animation: fadeInUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function _escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
