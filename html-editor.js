/**
 * Açaí Prime - Editor de Conteúdo HTML Inline
 * html-editor.js
 *
 * Permite editar textos, títulos, descrições e elementos do cardápio
 * diretamente na tela, sem precisar mexer no código.
 *
 * Expõe:
 *   window.htmlEditor          — singleton HtmlEditor
 *   window.toggleEditMode()    — ativa/desativa modo de edição
 *   window.isEditModeActive()  — retorna true se modo ativo
 */

// ==================== CHAVE DE PERSISTÊNCIA ====================
const HTML_EDITOR_KEY = 'acai_html_edits';

// ==================== CLASSE PRINCIPAL ====================
class HtmlEditor {
    constructor() {
        this.storageKey = HTML_EDITOR_KEY;
        this.active = false;
        this._observers = [];
        this._toolbar = null;
        this._currentTarget = null;
        this._savedEdits = this._loadEdits();
    }

    // ==================== PERSISTÊNCIA ====================

    _loadEdits() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    _saveEdits() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this._savedEdits));
        } catch (e) {
            console.warn('[HtmlEditor] Erro ao salvar edições:', e);
        }
    }

    /**
     * Aplica todas as edições salvas ao DOM atual.
     * Chamado na inicialização e após navegação entre módulos.
     */
    applyAllEdits() {
        Object.entries(this._savedEdits).forEach(([selector, value]) => {
            try {
                const el = document.querySelector(selector);
                if (el) el.innerHTML = value;
            } catch (e) {
                // seletor inválido — ignora
            }
        });
    }

    /**
     * Gera um seletor CSS único para um elemento.
     */
    _getSelector(el) {
        if (el.id) return `#${el.id}`;

        // Tenta construir seletor por posição
        const parts = [];
        let current = el;
        while (current && current !== document.body) {
            let tag = current.tagName.toLowerCase();
            if (current.id) {
                parts.unshift(`#${current.id}`);
                break;
            }
            const siblings = Array.from(current.parentNode?.children || []).filter(c => c.tagName === current.tagName);
            if (siblings.length > 1) {
                const idx = siblings.indexOf(current) + 1;
                tag += `:nth-of-type(${idx})`;
            }
            parts.unshift(tag);
            current = current.parentNode;
        }
        return parts.join(' > ');
    }

    // ==================== MODO DE EDIÇÃO ====================

    enable() {
        this.active = true;
        document.body.classList.add('edit-mode-active');
        this._injectStyles();
        this._injectToolbar();
        this._attachListeners();
        this._showToast('✏️ Modo de edição ativado. Clique em qualquer texto para editar.', 'info');
    }

    disable() {
        this.active = false;
        document.body.classList.remove('edit-mode-active');
        this._detachListeners();
        this._hideInlineEditor();
        this._showToast('✅ Edições salvas!', 'success');
    }

    toggle() {
        if (this.active) {
            this.disable();
        } else {
            this.enable();
        }
    }

    // ==================== ESTILOS ====================

    _injectStyles() {
        if (document.getElementById('htmlEditorStyles')) return;
        const style = document.createElement('style');
        style.id = 'htmlEditorStyles';
        style.textContent = `
            /* Modo de edição: destaque nos elementos editáveis */
            body.edit-mode-active [data-editable]:hover {
                outline: 2px dashed var(--primary, #7B1FA2) !important;
                outline-offset: 3px;
                cursor: text !important;
                border-radius: 4px;
            }
            body.edit-mode-active [data-editable].editing {
                outline: 2px solid var(--primary, #7B1FA2) !important;
                outline-offset: 3px;
                border-radius: 4px;
                background: rgba(255,107,0,0.05) !important;
            }

            /* Barra de ferramentas flutuante */
            #htmlEditorToolbar {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--surface, #1E1E1E);
                border: 1px solid var(--border, rgba(206, 147, 216,0.15));
                border-radius: 16px;
                padding: 10px 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 8000;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                flex-wrap: wrap;
                max-width: 90vw;
            }

            .editor-toolbar-label {
                font-size: 12px;
                color: var(--text-secondary, #A0A0A0);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
                padding-right: 8px;
                border-right: 1px solid var(--border, rgba(206, 147, 216,0.15));
            }

            .editor-toolbar-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                border: none;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-family: 'Poppins', sans-serif;
            }

            .editor-toolbar-btn.primary {
                background: linear-gradient(135deg, var(--primary, #7B1FA2), #9C27B0);
                color: white;
            }
            .editor-toolbar-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 0 12px rgba(255,107,0,0.4); }

            .editor-toolbar-btn.danger {
                background: rgba(255,61,0,0.15);
                color: #FF3D00;
            }
            .editor-toolbar-btn.danger:hover { background: #FF3D00; color: white; }

            .editor-toolbar-btn.secondary {
                background: var(--surface-light, #2A2A2A);
                color: var(--text-secondary, #A0A0A0);
            }
            .editor-toolbar-btn.secondary:hover { color: var(--text-primary, #fff); }

            .editor-toolbar-btn.active {
                background: rgba(255,107,0,0.2);
                color: var(--primary, #7B1FA2);
            }

            .editor-toolbar-sep {
                width: 1px;
                height: 24px;
                background: var(--border, rgba(206, 147, 216,0.15));
            }

            /* Painel de edição inline */
            #htmlEditorPanel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--surface, #1E1E1E);
                border: 1px solid var(--border, rgba(206, 147, 216,0.15));
                border-radius: 20px;
                padding: 24px;
                z-index: 8500;
                width: 90%;
                max-width: 600px;
                box-shadow: 0 16px 48px rgba(0,0,0,0.6);
                display: none;
            }
            #htmlEditorPanel.open { display: block; }

            #htmlEditorPanel h3 {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 20px;
                letter-spacing: 1px;
                color: var(--primary, #7B1FA2);
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            #htmlEditorTextarea {
                width: 100%;
                min-height: 120px;
                background: var(--background, #0D0D0D);
                border: 1px solid var(--border, rgba(206, 147, 216,0.15));
                border-radius: 12px;
                color: var(--text-primary, #fff);
                font-size: 14px;
                font-family: 'Poppins', sans-serif;
                padding: 14px 16px;
                resize: vertical;
                outline: none;
                transition: border-color 0.2s;
                line-height: 1.6;
            }
            #htmlEditorTextarea:focus { border-color: var(--primary, #7B1FA2); }

            .editor-panel-actions {
                display: flex;
                gap: 10px;
                margin-top: 16px;
                flex-wrap: wrap;
            }

            /* Overlay do painel */
            #htmlEditorOverlay {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.6);
                z-index: 8400;
                display: none;
            }
            #htmlEditorOverlay.open { display: block; }

            /* Badge "Editável" no hover */
            body.edit-mode-active [data-editable]:hover::before {
                content: '✏️ Editar';
                position: absolute;
                top: -24px;
                left: 0;
                background: var(--primary, #7B1FA2);
                color: white;
                font-size: 11px;
                font-weight: 600;
                padding: 2px 8px;
                border-radius: 6px;
                white-space: nowrap;
                pointer-events: none;
                z-index: 100;
            }
            body.edit-mode-active [data-editable] {
                position: relative;
            }

            /* Indicador de modo ativo no header */
            .edit-mode-indicator {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 12px;
                background: rgba(255,107,0,0.2);
                border: 1px solid var(--primary, #7B1FA2);
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                color: var(--primary, #7B1FA2);
                animation: pulse-edit 2s ease-in-out infinite;
            }
            @keyframes pulse-edit {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }

    // ==================== TOOLBAR ====================

    _injectToolbar() {
        if (document.getElementById('htmlEditorToolbar')) {
            document.getElementById('htmlEditorToolbar').style.display = 'flex';
            return;
        }

        const toolbar = document.createElement('div');
        toolbar.id = 'htmlEditorToolbar';
        toolbar.innerHTML = `
            <span class="editor-toolbar-label">✏️ Modo Edição</span>
            <button class="editor-toolbar-btn secondary" onclick="window.htmlEditor._formatText('bold')" title="Negrito">
                <i class="fas fa-bold"></i>
            </button>
            <button class="editor-toolbar-btn secondary" onclick="window.htmlEditor._formatText('italic')" title="Itálico">
                <i class="fas fa-italic"></i>
            </button>
            <button class="editor-toolbar-btn secondary" onclick="window.htmlEditor._formatText('underline')" title="Sublinhado">
                <i class="fas fa-underline"></i>
            </button>
            <div class="editor-toolbar-sep"></div>
            <button class="editor-toolbar-btn secondary" onclick="window.htmlEditor.openPageEditor()" title="Editar página completa">
                <i class="fas fa-code"></i> HTML
            </button>
            <button class="editor-toolbar-btn secondary" onclick="window.htmlEditor.resetAllEdits()" title="Desfazer todas as edições">
                <i class="fas fa-undo"></i> Resetar
            </button>
            <div class="editor-toolbar-sep"></div>
            <button class="editor-toolbar-btn danger" onclick="window.toggleEditMode()">
                <i class="fas fa-times"></i> Sair
            </button>
        `;
        document.body.appendChild(toolbar);
        this._toolbar = toolbar;

        // Painel de edição inline
        const overlay = document.createElement('div');
        overlay.id = 'htmlEditorOverlay';
        overlay.onclick = () => this._hideInlineEditor();
        document.body.appendChild(overlay);

        const panel = document.createElement('div');
        panel.id = 'htmlEditorPanel';
        panel.innerHTML = `
            <h3><i class="fas fa-edit"></i> Editar Conteúdo</h3>
            <div id="htmlEditorContext" style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;"></div>
            <textarea id="htmlEditorTextarea" placeholder="Digite o conteúdo..."></textarea>
            <div class="editor-panel-actions">
                <button class="editor-toolbar-btn primary" onclick="window.htmlEditor._applyEdit()">
                    <i class="fas fa-check"></i> Aplicar
                </button>
                <button class="editor-toolbar-btn secondary" onclick="window.htmlEditor._hideInlineEditor()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="editor-toolbar-btn danger" onclick="window.htmlEditor._resetCurrentEdit()" style="margin-left:auto;">
                    <i class="fas fa-undo"></i> Resetar este
                </button>
            </div>
        `;
        document.body.appendChild(panel);
    }

    _hideToolbar() {
        const tb = document.getElementById('htmlEditorToolbar');
        if (tb) tb.style.display = 'none';
    }

    // ==================== LISTENERS ====================

    _attachListeners() {
        // Marcar elementos editáveis
        this._markEditableElements();

        this._clickHandler = (e) => {
            if (!this.active) return;
            const target = e.target.closest('[data-editable]');
            if (!target) return;
            e.preventDefault();
            e.stopPropagation();
            this._openInlineEditor(target);
        };

        document.addEventListener('click', this._clickHandler, true);
    }

    _detachListeners() {
        if (this._clickHandler) {
            document.removeEventListener('click', this._clickHandler, true);
        }
        this._hideToolbar();
    }

    /**
     * Marca elementos editáveis no DOM atual.
     * Chamado ao ativar o modo e após navegação.
     */
    _markEditableElements() {
        const selectors = [
            // Textos de UI
            '.brand-name',
            '.brand-title',
            '#pageTitle',
            // Cards de stat
            '.stat-info h3',
            // Títulos de cards
            '.chart-card h3',
            '.recent-orders-card h3',
            '.config-card h3',
            '.messages-card h3',
            '.ia-status-card h3',
            '.ia-training-card h3',
            '.ia-logs-card h3',
            '.settings-card h3',
            '.summary-card h4',
            // Textos de configurações
            '.toggle-option label:first-child',
            // Templates de mensagem
            '.template-item h4',
            '.template-item p',
            // Info cards do auth
            '.info-card h3',
            '.info-card p',
            // Hero do cardápio
            '.hero-title',
            '.hero-subtitle',
            // Footer do cardápio
            '.footer-info p',
            // Botões de texto
            '.btn-cardapio span',
            // Módulo IA
            '.ia-status-card p.ia-status',
        ];

        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (!el.hasAttribute('data-editable')) {
                    el.setAttribute('data-editable', 'true');
                    el.setAttribute('data-original', el.innerHTML);
                }
            });
        });
    }

    // ==================== EDITOR INLINE ====================

    _openInlineEditor(target) {
        this._currentTarget = target;
        target.classList.add('editing');

        const panel = document.getElementById('htmlEditorPanel');
        const overlay = document.getElementById('htmlEditorOverlay');
        const textarea = document.getElementById('htmlEditorTextarea');
        const context = document.getElementById('htmlEditorContext');

        if (!panel || !textarea) return;

        textarea.value = target.innerHTML;

        // Mostrar contexto do elemento
        const tag = target.tagName.toLowerCase();
        const cls = target.className ? `.${target.className.split(' ').join('.')}` : '';
        const id = target.id ? `#${target.id}` : '';
        if (context) context.textContent = `Elemento: <${tag}${id}${cls}>`;

        panel.classList.add('open');
        if (overlay) overlay.classList.add('open');
        textarea.focus();
        textarea.select();
    }

    _hideInlineEditor() {
        const panel = document.getElementById('htmlEditorPanel');
        const overlay = document.getElementById('htmlEditorOverlay');
        if (panel) panel.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        if (this._currentTarget) {
            this._currentTarget.classList.remove('editing');
            this._currentTarget = null;
        }
    }

    _applyEdit() {
        if (!this._currentTarget) return;
        const textarea = document.getElementById('htmlEditorTextarea');
        if (!textarea) return;

        const newValue = textarea.value;
        this._currentTarget.innerHTML = newValue;

        // Salvar com seletor
        const selector = this._getSelector(this._currentTarget);
        this._savedEdits[selector] = newValue;
        this._saveEdits();

        this._hideInlineEditor();
        this._showToast('✅ Conteúdo atualizado!', 'success');
    }

    _resetCurrentEdit() {
        if (!this._currentTarget) return;
        const original = this._currentTarget.getAttribute('data-original');
        if (original !== null) {
            this._currentTarget.innerHTML = original;
            const selector = this._getSelector(this._currentTarget);
            delete this._savedEdits[selector];
            this._saveEdits();
        }
        this._hideInlineEditor();
        this._showToast('↩️ Conteúdo restaurado ao original.', 'success');
    }

    // ==================== FORMATAÇÃO ====================

    _formatText(command) {
        document.execCommand(command, false, null);
    }

    // ==================== EDITOR DE PÁGINA COMPLETA ====================

    openPageEditor() {
        const modal = document.createElement('div');
        modal.id = 'htmlPageEditorModal';
        modal.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.9);z-index:9500;
            display:flex;align-items:center;justify-content:center;padding:16px;
        `;

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const editablePages = ['index.html', 'cardapio.html', 'auth.html'];

        modal.innerHTML = `
            <div style="background:var(--surface,#1E1E1E);border:1px solid var(--border);border-radius:20px;
                        width:100%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
                <div style="display:flex;align-items:center;gap:12px;padding:20px 24px;border-bottom:1px solid var(--border);">
                    <h2 style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--primary,#7B1FA2);margin-right:auto;">
                        <i class="fas fa-code"></i> Editor de Página HTML
                    </h2>
                    <select id="pageEditorSelect" style="padding:8px 12px;background:var(--background);border:1px solid var(--border);
                            border-radius:10px;color:var(--text-primary);font-size:13px;" onchange="window.htmlEditor._loadPageContent(this.value)">
                        ${editablePages.map(p => `<option value="${p}" ${p === currentPage ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                    <button onclick="document.getElementById('htmlPageEditorModal').remove()"
                            style="width:36px;height:36px;background:var(--surface-light);border:none;border-radius:8px;
                                   color:var(--text-secondary);cursor:pointer;font-size:16px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:16px 24px;background:rgba(255,107,0,0.05);border-bottom:1px solid var(--border);">
                    <p style="font-size:12px;color:var(--text-secondary);">
                        ⚠️ Edição avançada. Alterações são salvas no banco de edições local.
                        Use com cuidado para não quebrar a estrutura da página.
                    </p>
                </div>
                <textarea id="pageEditorContent"
                    style="flex:1;background:var(--background);border:none;color:#e0e0e0;
                           font-family:'Courier New',monospace;font-size:13px;padding:20px;
                           resize:none;outline:none;line-height:1.6;overflow-y:auto;min-height:400px;"
                    placeholder="Carregando..."></textarea>
                <div style="display:flex;gap:10px;padding:16px 24px;border-top:1px solid var(--border);">
                    <button onclick="window.htmlEditor._savePageEdit()"
                            style="display:flex;align-items:center;gap:8px;padding:10px 20px;
                                   background:linear-gradient(135deg,var(--primary,#7B1FA2),#9C27B0);
                                   color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">
                        <i class="fas fa-save"></i> Salvar Edições
                    </button>
                    <button onclick="window.htmlEditor._copyPageContent()"
                            style="display:flex;align-items:center;gap:8px;padding:10px 20px;
                                   background:var(--surface-light);color:var(--text-secondary);
                                   border:none;border-radius:10px;font-size:14px;cursor:pointer;">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                    <button onclick="document.getElementById('htmlPageEditorModal').remove()"
                            style="margin-left:auto;padding:10px 20px;background:rgba(255,61,0,0.15);
                                   color:#FF3D00;border:none;border-radius:10px;font-size:14px;cursor:pointer;">
                        <i class="fas fa-times"></i> Fechar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this._loadPageContent(currentPage);
    }

    _loadPageContent(page) {
        const textarea = document.getElementById('pageEditorContent');
        if (!textarea) return;

        // Carregar edições salvas para esta página
        const key = `acai_page_edit_${page}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            textarea.value = saved;
            return;
        }

        // Tentar carregar via fetch
        textarea.value = '⏳ Carregando...';
        fetch(page)
            .then(r => r.text())
            .then(html => { textarea.value = html; })
            .catch(() => {
                textarea.value = `<!-- Não foi possível carregar ${page} automaticamente.\nCole o conteúdo HTML aqui para editar. -->`;
            });
    }

    _savePageEdit() {
        const select = document.getElementById('pageEditorSelect');
        const textarea = document.getElementById('pageEditorContent');
        if (!select || !textarea) return;

        const page = select.value;
        const content = textarea.value;
        const key = `acai_page_edit_${page}`;
        localStorage.setItem(key, content);

        this._showToast(`✅ Edições de "${page}" salvas no banco local!`, 'success');
    }

    _copyPageContent() {
        const textarea = document.getElementById('pageEditorContent');
        if (!textarea) return;
        navigator.clipboard.writeText(textarea.value).then(() => {
            this._showToast('📋 Conteúdo copiado!', 'success');
        });
    }

    // ==================== RESET ====================

    resetAllEdits() {
        const doReset = () => {
            document.querySelectorAll('[data-editable][data-original]').forEach(el => {
                el.innerHTML = el.getAttribute('data-original');
            });
            this._savedEdits = {};
            this._saveEdits();
            this._showToast('↩️ Todas as edições foram resetadas.', 'success');
        };

        if (typeof showConfirm === 'function') {
            showConfirm('Resetar TODAS as edições de texto? Os conteúdos voltarão ao original.', doReset);
        } else {
            if (confirm('Resetar TODAS as edições de texto? Os conteúdos voltarão ao original.')) doReset();
        }
    }

    // ==================== TOAST ====================

    _showToast(message, type = 'success') {
        if (typeof showToast === 'function') {
            showToast(message, type);
            return;
        }
        const toast = document.createElement('div');
        toast.style.cssText = `
            position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
            background:${type === 'error' ? '#FF3D00' : type === 'info' ? '#1E88E5' : '#00C853'};
            color:white;padding:12px 24px;border-radius:12px;
            font-weight:600;z-index:99999;font-size:13px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// ==================== SINGLETON E API GLOBAL ====================
window.htmlEditor = new HtmlEditor();

window.toggleEditMode = function() {
    window.htmlEditor.toggle();
    // Atualizar botão no header se existir
    const btn = document.getElementById('editModeToggleBtn');
    if (btn) {
        if (window.htmlEditor.active) {
            btn.classList.add('active');
            btn.title = 'Sair do modo de edição';
        } else {
            btn.classList.remove('active');
            btn.title = 'Ativar modo de edição';
        }
    }
};

window.isEditModeActive = function() {
    return window.htmlEditor.active;
};

// Aplicar edições salvas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.htmlEditor.applyAllEdits();
});
