/**
 * Açaí Prime - Admin SaaS JavaScript
 * admin-saas.js - Gerencia o painel de administração
 */

// ==================== ESTADO ====================
let saasManager = null;
let globalKnowledge = [];

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    saasManager = new SAASManager();
    loadGlobalKnowledge();
    initializeApp();
    setupEventListeners();
});

// Carregar conhecimento global
function loadGlobalKnowledge() {
    const data = localStorage.getItem('acai_global_knowledge');
    globalKnowledge = data ? JSON.parse(data) : getDefaultGlobalKnowledge();
    renderGlobalKnowledge();
}

// Conhecimento global padrão
function getDefaultGlobalKnowledge() {
    return [
        { id: 1, trigger: 'cardápio', response: 'Cardápio Açaí Prime: Açaí 300ml R$18,90 | 500ml R$24,90 | 700ml R$32,90 | Tigela Power R$29,90 | Barca 1L R$54,90 com complementos! 🍧', category: 'menu' },
        { id: 2, trigger: 'entrega', response: 'Fazemos entrega em toda a região. Tempo: 20-35 min. Taxa: R$5,00 (grátis acima de R$50). 💜', category: 'delivery' },
        { id: 3, trigger: 'horário', response: 'Funcionamos todos os dias das 14h às 23h — açaí fresquinho a tarde toda!', category: 'hours' },
        { id: 4, trigger: 'pagamento', response: 'Aceitamos dinheiro, cartão (crédito/débito) e PIX.', category: 'payment' },
        { id: 5, trigger: 'promoção', response: 'Promoção: Barca Família 1L por R$49,90! 6 complementos + 2 caldas. Aproveite! 🎉', category: 'promotion' },
        { id: 6, trigger: 'complementos', response: 'Complementos: leite em pó, paçoca, granola, confete, leite condensado, Nutella, morango, banana e mel!', category: 'menu' }
    ];
}

// ==================== INICIALIZAÇÃO ====================
function initializeApp() {
    renderDashboard();
    renderCompanies();
    updateStats();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const module = item.dataset.module;
            navigateToModule(module);
        });
    });

    // Fechar modal
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalOverlay')) {
            closeModal();
        }
    });
}

// ==================== NAVEGAÇÃO ====================
function navigateToModule(module) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.module === module) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
    document.getElementById(`module-${module}`).classList.remove('hidden');
}

// ==================== DASHBOARD ====================
function renderDashboard() {
    const companies = saasManager.getCompanies();
    const now = new Date();
    const thisMonth = companies.filter(c => {
        const created = new Date(c.createdAt);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    });

    document.getElementById('activeCompanies').textContent = companies.length;
    document.getElementById('newCompanies').textContent = thisMonth.length;
    document.getElementById('expiringPlans').textContent = 0;
    document.getElementById('totalMessages').textContent = companies.length * 50;

    // Empresas recentes
    const recentCompanies = document.getElementById('recentCompanies');
    if (companies.length > 0) {
        recentCompanies.innerHTML = companies.slice(-5).reverse().map(company => `
            <div class="company-item">
                <div class="company-avatar">${company.name.charAt(0)}</div>
                <div class="company-info">
                    <h4>${company.name}</h4>
                    <p>${company.email}</p>
                </div>
                <span class="company-status ${company.status}">${company.status}</span>
            </div>
        `).join('');
    } else {
        recentCompanies.innerHTML = '<div class="empty-state"><p>Nenhuma empresa cadastrada</p></div>';
    }
}

function updateStats() {
    const companies = saasManager.getCompanies();
    
    document.getElementById('totalCompanies').textContent = companies.length;
    document.getElementById('totalUsers').textContent = companies.length;
    
    // Calcular receita
    let revenue = 0;
    companies.forEach(c => {
        if (c.plan === 'basic') revenue += 49;
        if (c.plan === 'professional') revenue += 99;
    });
    document.getElementById('totalRevenue').textContent = 'R$ ' + revenue.toFixed(0);
}

// ==================== EMPRESAS ====================
function renderCompanies() {
    const companies = saasManager.getCompanies();
    const tbody = document.getElementById('companiesTableBody');

    if (companies.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px;">
                    <i class="fas fa-building" style="font-size: 32px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>Nenhuma empresa cadastrada</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = companies.map(company => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="company-avatar" style="width: 40px; height: 40px; font-size: 14px;">${company.name.charAt(0)}</div>
                    <div>
                        <strong>${company.name}</strong>
                        <div style="font-size: 12px; color: var(--text-secondary);">${company.email}</div>
                    </div>
                </div>
            </td>
            <td><span class="plan-badge" style="padding: 4px 12px; background: var(--surface-light); border-radius: 8px; font-size: 12px;">${company.plan}</span></td>
            <td><span class="company-status ${company.status}">${company.status}</span></td>
            <td>${getClientCount(company.id)}</td>
            <td>${getOrderCount(company.id)}</td>
            <td>${new Date(company.createdAt).toLocaleDateString('pt-BR')}</td>
            <td>
                <button class="btn-action" onclick="viewCompany(${company.id})" title="Visualizar">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action" onclick="editCompany(${company.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action danger" onclick="deleteCompany(${company.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getClientCount(companyId) {
    const data = localStorage.getItem(`acai_clients_${companyId}`);
    return data ? JSON.parse(data).length : 0;
}

function getOrderCount(companyId) {
    const data = localStorage.getItem(`acai_orders_${companyId}`);
    return data ? JSON.parse(data).length : 0;
}

function viewCompany(id) {
    const company = saasManager.getCompany(id);
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:var(--surface,#1e1e1e);border:1px solid var(--border,#333);border-radius:16px;padding:28px 32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="color:var(--text-primary,#fff);font-size:18px;">${company.name}</h3>
                <button id="closeCompanyView" style="background:none;border:none;color:var(--text-secondary,#aaa);cursor:pointer;font-size:20px;">✕</button>
            </div>
            <p style="color:var(--text-secondary,#aaa);font-size:13px;margin-bottom:8px;"><strong style="color:var(--text-primary,#fff);">Email:</strong> ${company.email}</p>
            <p style="color:var(--text-secondary,#aaa);font-size:13px;margin-bottom:8px;"><strong style="color:var(--text-primary,#fff);">Plano:</strong> ${company.plan}</p>
            <p style="color:var(--text-secondary,#aaa);font-size:13px;margin-bottom:8px;"><strong style="color:var(--text-primary,#fff);">Status:</strong> ${company.status}</p>
            <p style="color:var(--text-secondary,#aaa);font-size:13px;margin-bottom:20px;"><strong style="color:var(--text-primary,#fff);">Criado em:</strong> ${new Date(company.createdAt).toLocaleDateString('pt-BR')}</p>
            <button id="closeCompanyViewBtn" style="width:100%;padding:10px;border-radius:10px;border:none;background:#7B1FA2;color:white;cursor:pointer;font-size:14px;font-weight:600;">Fechar</button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#closeCompanyView').onclick = () => overlay.remove();
    overlay.querySelector('#closeCompanyViewBtn').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function editCompany(id) {
    const company = saasManager.getCompany(id);
    openModalCompany(company);
}

function deleteCompany(id) {
    showConfirm('Tem certeza que deseja excluir esta empresa?', () => {
        saasManager.deleteCompany(id);
        renderCompanies();
        renderDashboard();
        updateStats();
        showToast('Empresa excluída!', 'success');
    });
}

// ==================== MODAL EMPRESA ====================
function openModalCompany(company = null) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = company ? 'Editar Empresa' : 'Nova Empresa';

    body.innerHTML = `
        <form id="companyForm">
            <div class="form-group">
                <label>Nome da Empresa</label>
                <input type="text" id="companyName" value="${company ? company.name : ''}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="companyEmail" value="${company ? company.email : ''}" required>
            </div>
            <div class="form-group">
                <label>Telefone</label>
                <input type="tel" id="companyPhone" value="${company ? company.phone : ''}">
            </div>
            <div class="form-group">
                <label>Plano</label>
                <select id="companyPlan">
                    <option value="free" ${company && company.plan === 'free' ? 'selected' : ''}>Grátis</option>
                    <option value="basic" ${company && company.plan === 'basic' ? 'selected' : ''}>Básico</option>
                    <option value="professional" ${company && company.plan === 'professional' ? 'selected' : ''}>Profissional</option>
                    <option value="corporate" ${company && company.plan === 'corporate' ? 'selected' : ''}>Corporativo</option>
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="companyStatus">
                    <option value="active" ${company && company.status === 'active' ? 'selected' : ''}>Ativo</option>
                    <option value="inactive" ${company && company.status === 'inactive' ? 'selected' : ''}>Inativo</option>
                    <option value="suspended" ${company && company.status === 'suspended' ? 'selected' : ''}>Suspenso</option>
                </select>
            </div>
            <button type="submit" class="btn-primary" style="width: 100%">
                <i class="fas fa-save"></i> Salvar
            </button>
        </form>
    `;

    document.getElementById('companyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCompany(company ? company.id : null);
    });

    openModal();
}

function saveCompany(id) {
    const companyData = {
        name: document.getElementById('companyName').value,
        email: document.getElementById('companyEmail').value,
        phone: document.getElementById('companyPhone').value,
        plan: document.getElementById('companyPlan').value,
        status: document.getElementById('companyStatus').value
    };

    if (id) {
        saasManager.updateCompany(id, companyData);
        showToast('Empresa atualizada!', 'success');
    } else {
        saasManager.createCompany(companyData);
        showToast('Empresa criada!', 'success');
    }

    saveData();
    renderCompanies();
    renderDashboard();
    updateStats();
    closeModal();
}

// ==================== BOT GLOBAL ====================
function renderGlobalKnowledge() {
    const list = document.getElementById('globalKnowledge');

    if (globalKnowledge.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>Nenhum conhecimento cadastrado</p></div>';
        return;
    }

    list.innerHTML = globalKnowledge.map(item => `
        <div class="knowledge-item">
            <div class="knowledge-trigger">${item.trigger}</div>
            <div class="knowledge-response">${item.response}</div>
            <span class="knowledge-category">${item.category}</span>
            <button class="btn-action danger" style="margin-top: 8px; padding: 6px 12px;" onclick="deleteGlobalKnowledge(${item.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function addGlobalTraining() {
    const trigger = document.getElementById('globalTrigger').value.trim();
    const response = document.getElementById('globalResponse').value.trim();
    const category = document.getElementById('globalCategory').value;

    if (!trigger || !response) {
        showToast('Preencha palavra-chave e resposta!', 'error');
        return;
    }

    const newKnowledge = {
        id: Date.now(),
        trigger: trigger,
        response: response,
        category: category
    };

    globalKnowledge.push(newKnowledge);
    localStorage.setItem('acai_global_knowledge', JSON.stringify(globalKnowledge));

    document.getElementById('globalTrigger').value = '';
    document.getElementById('globalResponse').value = '';

    renderGlobalKnowledge();
    showToast('Conhecimento adicionado!', 'success');
}

function deleteGlobalKnowledge(id) {
    showConfirm('Tem certeza que deseja excluir este conhecimento?', () => {
        globalKnowledge = globalKnowledge.filter(k => k.id !== id);
        localStorage.setItem('acai_global_knowledge', JSON.stringify(globalKnowledge));
        renderGlobalKnowledge();
        showToast('Conhecimento removido!', 'success');
    });
}

// ==================== CONFIGURAÇÕES ====================
function saveGlobalColors() {
    const primary = document.getElementById('globalPrimaryColor').value;
    const secondary = document.getElementById('globalSecondaryColor').value;
    const accent = document.getElementById('globalAccentColor').value;

    const root = document.documentElement;
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--secondary', secondary);
    root.style.setProperty('--accent', accent);

    localStorage.setItem('acai_global_colors', JSON.stringify({ primary, secondary, accent }));
    showToast('Cores globais salvas!', 'success');
}

function saveEmailSettings() {
    const adminEmail = document.getElementById('adminEmail').value;
    const supportEmail = document.getElementById('supportEmail').value;

    localStorage.setItem('acai_email_settings', JSON.stringify({ adminEmail, supportEmail }));
    showToast('Configurações de email salvas!', 'success');
}

// ==================== MODAL ====================
function openModal(type) {
    document.getElementById('modalOverlay').classList.remove('hidden');
    if (type === 'company') {
        openModalCompany();
    }
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

// ==================== CONFIRMAÇÃO CUSTOMIZADA ====================
function showConfirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:var(--surface,#1e1e1e);border:1px solid var(--border,#333);border-radius:16px;padding:28px 32px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <i class="fas fa-exclamation-triangle" style="font-size:32px;color:#7B1FA2;margin-bottom:16px;"></i>
            <p style="font-size:15px;color:var(--text-primary,#fff);margin-bottom:24px;line-height:1.5;">${message}</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button id="confirmNo" style="padding:10px 24px;border-radius:10px;border:1px solid var(--border,#333);background:transparent;color:var(--text-secondary,#aaa);cursor:pointer;font-size:14px;">Cancelar</button>
                <button id="confirmYes" style="padding:10px 24px;border-radius:10px;border:none;background:#7B1FA2;color:white;cursor:pointer;font-size:14px;font-weight:600;">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirmYes').onclick = () => { overlay.remove(); onConfirm(); };
    overlay.querySelector('#confirmNo').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

// ==================== TOAST ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} toast-icon"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// ==================== SALVAR DADOS ====================
function saveData() {
    localStorage.setItem('acai_saas_companies', JSON.stringify(saasManager.getCompanies()));
}

// Carregar cores globais salvas
function loadGlobalColors() {
    const colors = localStorage.getItem('acai_global_colors');
    if (colors) {
        const { primary, secondary, accent } = JSON.parse(colors);
        document.getElementById('globalPrimaryColor').value = primary;
        document.getElementById('globalSecondaryColor').value = secondary;
        document.getElementById('globalAccentColor').value = accent;
        
        const root = document.documentElement;
        root.style.setProperty('--primary', primary);
        root.style.setProperty('--secondary', secondary);
        root.style.setProperty('--accent', accent);
    }
}

// Inicializar cores globais
loadGlobalColors();