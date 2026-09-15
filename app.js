// Açaí Prime - Sistema de Gestão
// App.js - Lógica Principal (atualizado com banco de imagens, preços, logo, disponibilidade, histórico)

// ==================== CONFIGURAÇÕES DE LOGO ====================
function getProductConfig() {
    try {
        const data = localStorage.getItem('acai_products_config');
        return data ? JSON.parse(data) : { logoImageId: null };
    } catch (e) {
        return { logoImageId: null };
    }
}

function saveProductConfig(config) {
    localStorage.setItem('acai_products_config', JSON.stringify(config));
}

const DEFAULT_LOGO_SRC = "assets/logo.jpg";

function getLogoSrc() {
    const config = getProductConfig();
    if (config.logoImageId && window.imageManager) {
        const img = window.imageManager.getById(config.logoImageId);
        if (img) return img.dataUrl;
    }
    return DEFAULT_LOGO_SRC;
}

function updateLogo(imageId) {
    const config = getProductConfig();
    config.logoImageId = imageId;
    saveProductConfig(config);
    const imgItem = window.imageManager ? window.imageManager.getById(imageId) : null;
    const src = imgItem ? imgItem.dataUrl : DEFAULT_LOGO_SRC;
    const logoEl = document.getElementById('companyLogo');
    if (logoEl) logoEl.src = src;
    showToast('Logo atualizada com sucesso!', 'success');
}

// ==================== ESTADO GLOBAL ====================
const AppState = {
    clientes: [],
    produtos: [],
    pedidos: [],
    iaResponses: [],
    chatLogs: [],
    settings: {
        primaryColor: '#7B1FA2',
        secondaryColor: '#1A1A1A',
        accentColor: '#CE93D8',
        companyName: 'Açaí Prime',
        companyPhone: '5524992552754',
        companyAddress: '',
        logo: null
    },
    whatsapp: {
        connected: false,
        number: '5524992552754',
        token: '',
        welcomeMessage: 'Olá! Seja bem-vindo à Açaí Prime! 🍧💜 Como posso ajudar?'
    },
    bot: null, // BotBrain instance
    api: {
        enabled: false,
        baseUrl: ''
    }
};

const ApiEndpoints = {
    status: '/api/status',
    clients: '/api/clients',
    products: '/api/products',
    orders: '/api/orders',
    whatsappConnect: '/api/whatsapp/connect',
    whatsappMessage: '/api/whatsapp/message',
    iaResponses: '/api/ia/responses',
    iaProcess: '/api/ia/process',
    settings: '/api/settings'
};

function isApiEnabled() {
    return AppState.api.enabled && AppState.api.baseUrl && AppState.api.baseUrl.trim().length > 0;
}

function getApiUrl(path) {
    if (!AppState.api.baseUrl) return path;
    return AppState.api.baseUrl.replace(/\/+$|\s+$/g, '') + path;
}

async function apiRequest(path, options = {}) {
    if (!isApiEnabled()) {
        throw new Error('API desabilitada. Configure a URL e ative o uso de API.');
    }

    const requestOptions = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        body: options.body !== undefined ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
    };

    if (requestOptions.body === undefined) {
        delete requestOptions.body;
    }

    const response = await fetch(getApiUrl(path), requestOptions);
    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        throw new Error(`Falha na requisição da API (${response.status}): ${errorText}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

async function saveClientApi(cliente) {
    const path = cliente.id ? `${ApiEndpoints.clients}/${cliente.id}` : ApiEndpoints.clients;
    const method = cliente.id ? 'PUT' : 'POST';
    return apiRequest(path, { method, body: cliente });
}

async function deleteClientApi(id) {
    return apiRequest(`${ApiEndpoints.clients}/${id}`, { method: 'DELETE' });
}

async function saveProductApi(produto) {
    const path = produto.id ? `${ApiEndpoints.products}/${produto.id}` : ApiEndpoints.products;
    const method = produto.id ? 'PUT' : 'POST';
    return apiRequest(path, { method, body: produto });
}

async function deleteProductApi(id) {
    return apiRequest(`${ApiEndpoints.products}/${id}`, { method: 'DELETE' });
}

async function saveOrderApi(pedido) {
    return apiRequest(ApiEndpoints.orders, { method: 'POST', body: pedido });
}

async function connectWhatsAppApi(settings) {
    return apiRequest(ApiEndpoints.whatsappConnect, { method: 'POST', body: settings });
}

async function fetchDataFromApi() {
    if (!isApiEnabled()) {
        throw new Error('API desabilitada.');
    }

    const [clientes, produtos, pedidos] = await Promise.all([
        apiRequest(ApiEndpoints.clients),
        apiRequest(ApiEndpoints.products),
        apiRequest(ApiEndpoints.orders)
    ]);

    AppState.clientes = Array.isArray(clientes) ? clientes : AppState.clientes;
    AppState.produtos = Array.isArray(produtos) ? produtos : AppState.produtos;
    AppState.pedidos = Array.isArray(pedidos) ? pedidos : AppState.pedidos;
    saveData();
    renderDashboard();
    renderClientes();
    renderProdutos();
    renderPedidos();
    return true;
}

async function testApiConnection() {
    if (!isApiEnabled()) {
        showToast('Ative as APIs e informe a URL antes de testar.', 'warning');
        return false;
    }
    try {
        await apiRequest(ApiEndpoints.status);
        showToast('Conexão com a API estabelecida com sucesso!', 'success');
        return true;
    } catch (error) {
        console.warn(error);
        showToast(`Falha na conexão com a API: ${error.message}`, 'error');
        return false;
    }
}

async function syncDataFromApi() {
    try {
        await fetchDataFromApi();
        showToast('Dados sincronizados com a API.', 'success');
    } catch (error) {
        showToast(`Erro ao sincronizar dados: ${error.message}`, 'error');
    }
}

// ==================== SUPABASE SETTINGS ====================
function saveSupabaseSettings() {
    const url = document.getElementById('supabaseUrl')?.value || '';
    const key = document.getElementById('supabaseKey')?.value || '';
    const enabled = document.getElementById('supabaseEnabled')?.checked || false;

    if (enabled && (!url || !key)) {
        showToast('Preencha a URL e a Anon Key do Supabase antes de ativar.', 'warning');
        return;
    }

    if (window.supabaseService) {
        window.supabaseService.saveConfig({ url, key, enabled });
        showToast('Configurações do Supabase salvas!', 'success');
    }
}

async function testSupabaseSettings() {
    if (!window.supabaseService || !window.supabaseService.isConfigured()) {
        showToast('Informe a URL, Anon Key e ative o Supabase antes de testar.', 'warning');
        return;
    }
    try {
        await window.supabaseService.testConnection();
        showToast('Conectado ao Supabase (PostgreSQL) com sucesso!', 'success');
    } catch (error) {
        showToast(`Falha na conexão Supabase: ${error.message}`, 'error');
    }
}

function loadSupabaseSettingsUI() {
    if (!window.supabaseService) return;
    const config = window.supabaseService.getConfig();
    if (document.getElementById('supabaseUrl')) document.getElementById('supabaseUrl').value = config.url || '';
    if (document.getElementById('supabaseKey')) document.getElementById('supabaseKey').value = config.key || '';
    if (document.getElementById('supabaseEnabled')) document.getElementById('supabaseEnabled').checked = config.enabled || false;
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeBot();
    initializeApp();
    setupEventListeners();
    loadSupabaseSettingsUI();
    renderDashboard();

    // Inicializar Auto-Sync e Realtime com Supabase (se habilitado)
    if (window.supabaseService && window.supabaseService.isConfigured()) {
        initSupabaseAutoSync();
    }
});

// ==================== AUTO-SYNC SUPABASE & REALTIME ====================
async function initSupabaseAutoSync() {
    if (!window.supabaseService || !window.supabaseService.isConfigured()) return;

    try {
        console.log('[Supabase Auto-Sync] Sincronizando dados com o PostgreSQL...');
        const remoteData = await window.supabaseService.getAllData();
        if (remoteData) {
            let updated = false;
            if (Array.isArray(remoteData.produtos) && remoteData.produtos.length > 0) {
                AppState.produtos = remoteData.produtos;
                updated = true;
            }
            if (Array.isArray(remoteData.clientes) && remoteData.clientes.length > 0) {
                AppState.clientes = remoteData.clientes;
                updated = true;
            }
            if (Array.isArray(remoteData.pedidos) && remoteData.pedidos.length > 0) {
                AppState.pedidos = remoteData.pedidos;
                updated = true;
            }
            if (updated) {
                saveData();
                refreshCurrentModuleViews();
            }
        }

        // Ativar Realtime WebSockets
        console.log('[Supabase Realtime] Conectando aos WebSockets...');
        window.supabaseService.setupRealtime((table, payload) => {
            handleRealtimeEvent(table, payload);
        });
    } catch (err) {
        console.warn('[Supabase Auto-Sync] Erro na sincronização inicial ou Realtime:', err);
    }
}

function refreshCurrentModuleViews() {
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderClientes === 'function') renderClientes();
    if (typeof renderProdutos === 'function') {
        const cat = document.querySelector('.filter-tab.active')?.dataset.category || 'todos';
        renderProdutos(cat);
    }
    if (typeof renderPedidos === 'function') renderPedidos();
}

function handleRealtimeEvent(table, payload) {
    const { eventType, new: newRow, old: oldRow } = payload;

    if (table === 'pedidos') {
        if (eventType === 'INSERT') {
            const exists = AppState.pedidos.some(p => String(p.id) === String(newRow.id));
            if (!exists) {
                AppState.pedidos.unshift(newRow);
                if (window.notificationManager) {
                    window.notificationManager.add('new_order', `Novo pedido #${newRow.codigo_pedido || newRow.id} registrado!`);
                    if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
                }
                showToast(`🔔 Novo pedido #${newRow.codigo_pedido || newRow.id} recebido em tempo real!`, 'info');
                playNotificationSound();
            }
        } else if (eventType === 'UPDATE') {
            const idx = AppState.pedidos.findIndex(p => String(p.id) === String(newRow.id));
            if (idx !== -1) {
                AppState.pedidos[idx] = { ...AppState.pedidos[idx], ...newRow };
            } else {
                AppState.pedidos.unshift(newRow);
            }
        } else if (eventType === 'DELETE') {
            AppState.pedidos = AppState.pedidos.filter(p => String(p.id) !== String(oldRow.id));
        }
        saveData();
        if (typeof renderPedidos === 'function') renderPedidos();
        if (typeof renderDashboard === 'function') renderDashboard();
    } else if (table === 'produtos') {
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const idx = AppState.produtos.findIndex(p => String(p.id) === String(newRow.id));
            if (idx !== -1) {
                AppState.produtos[idx] = { ...AppState.produtos[idx], ...newRow };
            } else {
                AppState.produtos.unshift(newRow);
            }
        } else if (eventType === 'DELETE') {
            AppState.produtos = AppState.produtos.filter(p => String(p.id) !== String(oldRow.id));
        }
        saveData();
        if (typeof renderProdutos === 'function') {
            const cat = document.querySelector('.filter-tab.active')?.dataset.category || 'todos';
            renderProdutos(cat);
        }
    } else if (table === 'clientes') {
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const idx = AppState.clientes.findIndex(c => String(c.id) === String(newRow.id));
            if (idx !== -1) {
                AppState.clientes[idx] = { ...AppState.clientes[idx], ...newRow };
            } else {
                AppState.clientes.unshift(newRow);
            }
        } else if (eventType === 'DELETE') {
            AppState.clientes = AppState.clientes.filter(c => String(c.id) !== String(oldRow.id));
        }
        saveData();
        if (typeof renderClientes === 'function') renderClientes();
    }
}


// ==================== SINCRONIZAÇÃO AUTOMÁTICA PEDIDOS RECENTES ====================
// Atualiza dashboard automaticamente quando cardápio salva novo pedido
window.addEventListener('storage', (e) => {
    if (e.key === 'acaiPrimeData' || e.key === 'acai_notifications') {
        try {
            const raw = localStorage.getItem('acaiPrimeData');
            if (raw) {
                const data = JSON.parse(raw);
                if (data.pedidos) AppState.pedidos = data.pedidos;
                if (data.clientes) AppState.clientes = data.clientes;
                if (data.produtos) AppState.produtos = data.produtos;
            }
        } catch(err){}
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderPedidos === 'function') renderPedidos();
        if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
    }
});
// BroadcastChannel para atualização instantânea na mesma aba/navegador
try {
    const acaiChannel = new BroadcastChannel('acai_prime_orders');
    acaiChannel.onmessage = (ev) => {
        if (ev.data && ev.data.type === 'new_order') {
            try {
                const raw = localStorage.getItem('acaiPrimeData');
                if (raw) {
                    const data = JSON.parse(raw);
                    AppState.pedidos = data.pedidos || AppState.pedidos;
                }
            } catch(e){}
            if (typeof renderDashboard === 'function') renderDashboard();
            if (typeof renderPedidos === 'function') renderPedidos();
            showToast('🔔 Novo pedido recebido!', 'info');
            playNotificationSound();
        }
    };
    window.acaiChannel = acaiChannel;
} catch(e) {}
// Polling leve a cada 3s caso storage event não dispare
setInterval(() => {
    try {
        const raw = localStorage.getItem('acaiPrimeData');
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.pedidos && data.pedidos.length !== AppState.pedidos.length) {
            AppState.pedidos = data.pedidos;
            if (typeof renderDashboard === 'function') renderDashboard();
            if (typeof renderPedidos === 'function') renderPedidos();
        }
    } catch(e){}
}, 3000);

function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
        console.warn('Erro ao tocar áudio de notificação:', e);
    }
}

// Inicializar BotBrain
function initializeBot() {
    const companyId = 'acai_prime_main'; // ID da empresa principal
    AppState.bot = new BotBrain(companyId);
    
    // Migrar respostas manuais para o bot se existirem
    if (AppState.iaResponses.length > 0) {
        migrateManualResponses();
    }
}

// Migrar respostas manuais para o BotBrain
async function migrateManualResponses() {
    for (const response of AppState.iaResponses) {
        try {
            await AppState.bot.train(response.trigger, response.response, 'manual');
        } catch (error) {
            console.warn('Erro ao migrar resposta:', error);
        }
    }
    
    // Limpar respostas manuais após migração
    AppState.iaResponses = [];
    saveData();
}

// Carregar dados do localStorage
function loadData() {
    const savedData = localStorage.getItem('acaiPrimeData');
    if (savedData) {
        const data = JSON.parse(savedData);
        Object.assign(AppState, data);
    }

    // Garantir número do WhatsApp padrão se não configurado
    if (!AppState.whatsapp.number) {
        AppState.whatsapp.number = '5524992552754';
    }
    if (!AppState.settings.companyPhone) {
        AppState.settings.companyPhone = '5524992552754';
    }

    // Migração: garantir campos novos nos produtos existentes
    AppState.produtos = AppState.produtos.map(p => ({
        imagem: null,
        lastPriceUpdate: null,
        orderCount: 0,
        disponivel: true,
        ...p
    }));

    AppState.clientes = AppState.clientes.map(c => ({
        endereco: c.endereco || '',
        segmento: c.segmento || 'novo',
        observacoes: c.observacoes || '',
        addressBook: c.addressBook || (c.endereco ? [c.endereco] : []),
        shippingZone: c.shippingZone || '',
        lastShippingRate: c.lastShippingRate || 0,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
        ...c
    }));
    
    // Aplicar configurações salvas
    applySettings();
}

// Salvar dados no localStorage
function saveData() {
    localStorage.setItem('acaiPrimeData', JSON.stringify(AppState));
}

// Aplicar configurações
function applySettings() {
    const root = document.documentElement;
    root.style.setProperty('--primary', AppState.settings.primaryColor);
    root.style.setProperty('--primary-light', lightenColor(AppState.settings.primaryColor, 20));
    root.style.setProperty('--secondary', AppState.settings.secondaryColor);
    root.style.setProperty('--accent', AppState.settings.accentColor);
    
    const companyNameElement = document.getElementById('companyName');
    if (companyNameElement) {
        if (companyNameElement.tagName.toLowerCase() === 'input' || companyNameElement.tagName.toLowerCase() === 'textarea') {
            companyNameElement.value = AppState.settings.companyName;
        } else {
            companyNameElement.textContent = AppState.settings.companyName;
        }
    }

    const brandNameElement = document.getElementById('brand-name');
    if (brandNameElement) {
        brandNameElement.textContent = AppState.settings.companyName;
    }
    
    // Logo: priorizar banco de imagens, depois settings.logo legado, depois padrão
    const logoEl = document.getElementById('companyLogo');
    if (logoEl) {
        logoEl.src = getLogoSrc() || AppState.settings.logo || DEFAULT_LOGO_SVG;
    }
    
    if (document.getElementById('primaryColor')) document.getElementById('primaryColor').value = AppState.settings.primaryColor;
    if (document.getElementById('secondaryColor')) document.getElementById('secondaryColor').value = AppState.settings.secondaryColor;
    if (document.getElementById('accentColor')) document.getElementById('accentColor').value = AppState.settings.accentColor;

    if (document.querySelectorAll('.color-value').length >= 3) {
        document.querySelectorAll('.color-value')[0].textContent = AppState.settings.primaryColor;
        document.querySelectorAll('.color-value')[1].textContent = AppState.settings.secondaryColor;
        document.querySelectorAll('.color-value')[2].textContent = AppState.settings.accentColor;
    }

    const apiUrlInput = document.getElementById('apiBaseUrl');
    if (apiUrlInput) {
        apiUrlInput.value = AppState.api.baseUrl || '';
    }
    const apiEnabledInput = document.getElementById('apiEnabled');
    if (apiEnabledInput) {
        apiEnabledInput.checked = AppState.api.enabled;
    }

    // Preencher número do WhatsApp nos campos de configuração
    const wpNumberInput = document.getElementById('whatsappNumber');
    if (wpNumberInput && !wpNumberInput.value) {
        wpNumberInput.value = AppState.whatsapp.number || '5524992552754';
    }
    const companyPhoneInput = document.getElementById('companyPhone');
    if (companyPhoneInput && !companyPhoneInput.value) {
        companyPhoneInput.value = AppState.settings.companyPhone || '5524992552754';
    }
}

// ==================== INICIALIZAÇÃO DO APP ====================
async function initializeApp() {
    // Renderizar apenas os módulos cujos elementos existem na página atual
    if (document.getElementById('clientsGrid')) renderClientes();
    if (document.getElementById('productsGrid')) renderProdutos();
    if (document.getElementById('ordersTableBody')) renderPedidos();
    if (document.getElementById('responsesList')) await renderIAResponses();
    if (document.getElementById('chatLogs')) renderChatLogs();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const href = item.getAttribute('href');
            if (href && href !== '#') {
                return;
            }
            e.preventDefault();
            const module = item.dataset.module;
            navigateToModule(module);
        });
    });

    // Menu toggle mobile
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }

    // Logo upload
    const logoInput = document.getElementById('logoInput');
    const logoUpload = document.getElementById('logoUpload');
    if (logoInput) logoInput.addEventListener('change', handleLogoUpload);
    if (logoUpload) {
        logoUpload.addEventListener('click', () => {
            if (logoInput) logoInput.click();
        });
    }

    // Color pickers (só existem em index.html e configuracoes.html)
    const primaryColor = document.getElementById('primaryColor');
    const secondaryColor = document.getElementById('secondaryColor');
    const accentColor = document.getElementById('accentColor');
    const colorValues = document.querySelectorAll('.color-value');
    if (primaryColor && colorValues[0]) {
        primaryColor.addEventListener('input', (e) => { colorValues[0].textContent = e.target.value; });
    }
    if (secondaryColor && colorValues[1]) {
        secondaryColor.addEventListener('input', (e) => { colorValues[1].textContent = e.target.value; });
    }
    if (accentColor && colorValues[2]) {
        accentColor.addEventListener('input', (e) => { colorValues[2].textContent = e.target.value; });
    }

    // Filter tabs (só existem em index.html e produtos.html)
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.category) filterProducts(tab.dataset.category);
        });
    });

    // Search clientes (só existe em index.html e clientes.html)
    const searchClientes = document.getElementById('searchClientes');
    if (searchClientes) {
        searchClientes.addEventListener('input', (e) => {
            window._clientFilter = window._clientFilter || { segment: 'todos', search: '', sort: 'nome' };
            window._clientFilter.search = e.target.value;
            renderClientes(e.target.value);
        });
    }

    // Fechar modal ao clicar fora
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }
}

// ==================== NAVEGAÇÃO ====================
function navigateToModule(module) {
    // Atualizar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.module === module) {
            item.classList.add('active');
        }
    });
    
    // Atualizar módulos
    document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
    const moduleEl = document.getElementById(`module-${module}`);
    if (moduleEl) moduleEl.classList.remove('hidden');
    
    // Atualizar título
    const titles = {
        dashboard: 'Dashboard',
        clientes: 'Clientes',
        produtos: 'Produtos',
        pedidos: 'Pedidos',
        whatsapp: 'WhatsApp',
        ia: 'IA Atendente',
        'gestao-dia': 'Gestão do Dia',
        relatorios: 'Relatórios',
        configuracoes: 'Configurações'
    };
    document.getElementById('pageTitle').textContent = titles[module] || module;
    
    // Fechar sidebar mobile
    document.getElementById('sidebar').classList.remove('active');
}

function renderDashboard() {
    // Só executa se os elementos do dashboard existirem (index.html)
    if (!document.getElementById('pedidosHoje')) return;

    const hoje = new Date().toDateString();
    // Compat: suporta p.data (legado) e p.created_at / p.createdAt (novo)
    const getPedidoDate = (p) => new Date(p.data || p.created_at || p.createdAt || Date.now());
    const pedidosHojeArray = AppState.pedidos.filter(p => getPedidoDate(p).toDateString() === hoje);

    const faturamentoCalculado = pedidosHojeArray.reduce((sum, p) => sum + (p.total || p.total_com_frete || p.totalWithShipping || 0), 0);
    const qtdPedidos = pedidosHojeArray.length;
    const faturamentoTexto = 'R$ ' + faturamentoCalculado.toFixed(2).replace('.', ',');
    const ticketMedioTexto = pedidosHojeArray.length > 0 ? 'R$ ' + (faturamentoCalculado / pedidosHojeArray.length).toFixed(2).replace('.', ',') : 'R$ 0,00';

    document.getElementById('pedidosHoje').textContent = qtdPedidos;
    document.getElementById('faturamentoHoje').textContent = faturamentoTexto;
    if (document.getElementById('ticketMedio')) document.getElementById('ticketMedio').textContent = ticketMedioTexto;
    if (document.getElementById('clientesAtivos')) document.getElementById('clientesAtivos').textContent = AppState.clientes.length;
    if (document.getElementById('pedidosAndamento')) document.getElementById('pedidosAndamento').textContent = AppState.pedidos.filter(p=> ['novo','pendente','preparando'].includes((p.status||'').toLowerCase())).length;
    
    // Pedidos recentes - 100% automatico via cardapio/WhatsApp
    const recentOrders = document.getElementById('recentOrders');
    if (recentOrders) {
        // Usa todos os pedidos ordenados por data decrescente (compatível com cardápio)
        const todosOrdenados = [...AppState.pedidos].sort((a,b) => getPedidoDate(b) - getPedidoDate(a));
        const lista = todosOrdenados.slice(0, 5);
        if (lista.length > 0) {
            recentOrders.innerHTML = lista.map(pedido => {
                const cliente = AppState.clientes.find(c => String(c.id) === String(pedido.clienteId)) || { nome: pedido.cliente_nome || 'Cliente' };
                const hora = getPedidoDate(pedido).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
                const status = pedido.status || 'novo';
                const labelMap = { novo: 'Novo', pendente: 'Pendente', preparando: 'Em preparo', entergue: 'Entregue', entregue: 'Entregue', confirmado: 'Confirmado', entrega: 'Saiu para entrega', preparando: 'Em preparo' };
                const label = labelMap[status] || status;
                const total = pedido.total_com_frete || pedido.totalWithShipping || pedido.total || 0;
                return `
                    <div class="order-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);">
                        <div>
                            <span style="font-weight:700;color:var(--primary);">#${String(pedido.id).slice(-4)} </span>
                            <span style="margin-left:6px;color:var(--text-primary);font-weight:600;">${escapeHtml(cliente.nome || 'Cliente')}</span>
                            <span style="margin-left:6px;color:var(--text-secondary);font-size:12px;">${pedido.itens ? pedido.itens.length : 1} item(s)</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                            <span style="color:var(--text-secondary);font-size:12px;">${hora}</span>
                            <span class="order-total" style="font-weight:700;color:var(--primary);">R$ ${Number(total).toFixed(2).replace('.', ',')}</span>
                            <span class="status-pill status-${escapeHtml(status)}" style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(123,31,162,0.12);color:var(--primary);border:1px solid rgba(123,31,162,0.15);">${escapeHtml(label)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            recentOrders.innerHTML = `
                <div class="empty-state" style="padding:28px;">
                    <i class="fas fa-ice-cream" style="font-size:32px;color:var(--primary);opacity:0.6;"></i>
                    <p style="margin-top:8px;color:var(--text-secondary);">Nenhum pedido ainda.<br><span style="font-size:12px;">Os pedidos do cardápio aparecerão aqui automaticamente.</span></p>
                </div>`;
        }
    }

    // Gráfico de vendas da semana - dados reais (últimos 7 dias)
    const chartBarsEl = document.querySelector('.chart-bars');
    const chartLabelsEl = document.querySelector('.chart-labels');
    if (chartBarsEl && chartLabelsEl) {
        const dias = [];
        const vendasPorDia = [];
        for (let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            const label = d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
            dias.push(label);
            const totalDia = AppState.pedidos.filter(p => {
                const pd = new Date(p.data || p.created_at || p.createdAt);
                return pd.toDateString() === d.toDateString();
            }).reduce((s,p)=> s + (p.total || p.total_com_frete || 0), 0);
            vendasPorDia.push(totalDia);
        }
        const maxV = Math.max(1, ...vendasPorDia);
        chartBarsEl.innerHTML = vendasPorDia.map((v, i) => {
            const pct = Math.round((v/maxV)*100) || 5;
            return `<div class="bar" style="height:${pct}%;background:linear-gradient(180deg, #9C27B0 0%, #7B1FA2 100%);border-radius:4px 4px 0 0;" title="${dias[i]}: R$ ${v.toFixed(2)}"><span style="font-size:10px;">${v>0? 'R$'+v.toFixed(0):''}</span></div>`;
        }).join('');
        chartLabelsEl.innerHTML = dias.map(l => `<span>${l}</span>`).join('');
        if (vendasPorDia.every(v=>v===0)) {
            chartBarsEl.innerHTML = `<div style="width:100%;text-align:center;color:var(--text-secondary);font-size:13px;padding:40px 0;">Sem vendas nos últimos 7 dias</div>`;
        }
    }

    // Top produtos mais vendidos - APENAS dados reais, sem fictícios
    const topProductsEl = document.getElementById('topProductsList');
    if (topProductsEl) {
        const countMap = {};
        AppState.pedidos.forEach(p => (p.itens||[]).forEach(i => { countMap[i.nome] = (countMap[i.nome]||0) + (i.quantidade||1); }));
        const sorted = Object.entries(countMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
        if (sorted.length === 0) {
            topProductsEl.innerHTML = `<div class="empty-state" style="padding:18px;"><i class="fas fa-chart-bar"></i><p>Nenhuma venda registrada ainda. Envie um pedido de teste.</p></div>`;
        } else {
            const max = sorted[0][1];
            topProductsEl.innerHTML = sorted.map(([nome, qtd], idx) => {
                const pct = Math.round((qtd/max)*100);
                return `<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:500;margin-bottom:4px;"><span>${idx+1}. ${escapeHtml(nome)}</span><span style="color:var(--text-secondary);">${qtd} vendas</span></div><div style="height:6px;background:rgba(123,31,162,0.08);border-radius:4px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:var(--primary);border-radius:4px;"></div></div></div>`;
            }).join('');
        }
    }
}

// ==================== CLIENTES ====================
function renderClientes(filter = '') {
    const grid = document.getElementById('clientsGrid');
    let clientes = AppState.clientes;
    
    if (filter) {
        clientes = clientes.filter(c => 
            c.nome.toLowerCase().includes(filter.toLowerCase()) ||
            c.telefone.includes(filter)
        );
    }
    
    if (clientes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>Nenhum cliente cadastrado</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = clientes.map(cliente => `
        <div class="client-card">
            <div class="client-header">
                <div class="client-avatar">${escapeHtml(cliente.nome.charAt(0))}</div>
                <div>
                    <h3 class="client-name">${escapeHtml(cliente.nome)}</h3>
                    <span class="client-segment ${escapeHtml(cliente.segmento)}">${escapeHtml(cliente.segmento.toUpperCase())}</span>
                </div>
            </div>
            <div class="client-info">
                <p><i class="fas fa-phone"></i> ${escapeHtml(cliente.telefone)}</p>
                <p><i class="fas fa-envelope"></i> ${escapeHtml(cliente.email)}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(cliente.endereco)}</p>
            </div>
            <div class="client-actions">
                <button class="btn-edit" onclick="editCliente(${cliente.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-delete" onclick="deleteCliente(${cliente.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function searchClientes(query) {
    renderClientes(query);
}

function openModalCliente(cliente = null) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    title.textContent = cliente ? 'Editar Cliente' : 'Novo Cliente';
    
    body.innerHTML = `
        <form id="clienteForm">
            <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" id="clienteNome" value="${cliente ? cliente.nome : ''}" required>
            </div>
            <div class="form-group">
                <label>Telefone</label>
                <input type="text" id="clienteTelefone" value="${cliente ? cliente.telefone : ''}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="clienteEmail" value="${cliente ? cliente.email : ''}">
            </div>
            <div class="form-group">
                <label>Endereço</label>
                <input type="text" id="clienteEndereco" value="${cliente ? cliente.endereco : ''}">
            </div>
            <div class="form-group">
                <label>Segmento</label>
                <select id="clienteSegmento">
                    <option value="novo" ${cliente && cliente.segmento === 'novo' ? 'selected' : ''}>Novo</option>
                    <option value="regular" ${cliente && cliente.segmento === 'regular' ? 'selected' : ''}>Regular</option>
                    <option value="vip" ${cliente && cliente.segmento === 'vip' ? 'selected' : ''}>VIP</option>
                </select>
            </div>
            <div class="form-group">
                <label>Observações</label>
                <textarea id="clienteObservacoes" rows="3">${cliente ? cliente.observacoes : ''}</textarea>
            </div>
            <button type="submit" class="btn-primary" style="width: 100%">
                <i class="fas fa-save"></i> Salvar Cliente
            </button>
        </form>
    `;
    
    document.getElementById('clienteForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCliente(cliente ? cliente.id : null);
    });
    
    openModal();
}

async function saveCliente(id) {
    const existing = id ? AppState.clientes.find(c => c.id === id) : null;
    const cliente = {
        ...(existing || {}),
        id: id || Date.now(),
        nome: document.getElementById('clienteNome').value,
        telefone: document.getElementById('clienteTelefone').value,
        email: document.getElementById('clienteEmail').value,
        endereco: document.getElementById('clienteEndereco').value,
        segmento: document.getElementById('clienteSegmento').value,
        observacoes: document.getElementById('clienteObservacoes').value,
        updatedAt: new Date().toISOString(),
        createdAt: existing ? existing.createdAt : new Date().toISOString()
    };
    
    if (isApiEnabled()) {
        try {
            const savedCliente = await saveClientApi(cliente);
            if (savedCliente && savedCliente.id) {
                cliente.id = savedCliente.id;
            }
        } catch (error) {
            console.warn('Falha ao salvar cliente na API:', error);
            showToast('Não foi possível salvar o cliente na API. Os dados foram gravados localmente.', 'warning');
        }
    }

    if (id) {
        const index = AppState.clientes.findIndex(c => c.id === id);
        AppState.clientes[index] = cliente;
        showToast('Cliente atualizado com sucesso!', 'success');
    } else {
        AppState.clientes.push(cliente);
        showToast('Cliente cadastrado com sucesso!', 'success');
    }
    
    // Auto-Sync Supabase
    if (window.supabaseService && window.supabaseService.isConfigured()) {
        window.supabaseService.saveCliente(cliente).catch(err => {
            console.warn('[Supabase] Erro ao auto-salvar cliente:', err);
        });
    }

    saveData();
    renderClientes();
    renderDashboard();
    closeModal();
}

async function deleteCliente(id) {
    showConfirm('Tem certeza que deseja excluir este cliente?', async () => {
        if (isApiEnabled()) {
            try {
                await deleteClientApi(id);
            } catch (error) {
                console.warn('Falha ao excluir cliente na API:', error);
                showToast('Não foi possível excluir o cliente na API. Exclusão local concluída.', 'warning');
            }
        }

        // Auto-Sync Supabase
        if (window.supabaseService && window.supabaseService.isConfigured()) {
            window.supabaseService.deleteCliente(id).catch(err => {
                console.warn('[Supabase] Erro ao excluir cliente remoto:', err);
            });
        }

        AppState.clientes = AppState.clientes.filter(c => c.id !== id);
        saveData();
        renderClientes();
        renderDashboard();
        showToast('Cliente excluído!', 'success');
    });
}

function editCliente(id) {
    const cliente = AppState.clientes.find(c => c.id === id);
    openModalCliente(cliente);
}

// ==================== PRODUTOS ====================
function _getProdutoImageHtml(produto) {
    if (produto.imagem && window.imageManager) {
        const imgItem = window.imageManager.getById(produto.imagem);
        if (imgItem) {
            return `<img src="${imgItem.dataUrl}" alt="${produto.nome}" style="width:100%;height:100%;object-fit:cover;">`;
        }
    }
    const icons = { acai: 'fa-ice-cream', tigelas: 'fa-bowl-rice', complementos: 'fa-plus-circle', bebidas: 'fa-glass-cheers', combos: 'fa-layer-group' };
    return `<i class="fas ${icons[produto.categoria] || 'fa-bowl-rice'}"></i>`;
}

function renderProdutos(filter = 'todos') {
    const grid = document.getElementById('productsGrid');
    let produtos = AppState.produtos;
    
    if (filter !== 'todos') {
        produtos = produtos.filter(p => p.categoria === filter);
    }
    
    if (produtos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ice-cream"></i>
                <p>Nenhum produto cadastrado</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = produtos.map(produto => {
        const lastUpdate = produto.lastPriceUpdate
            ? `<small class="price-update-info" title="Última atualização de preço">
                 <i class="fas fa-clock"></i> ${new Date(produto.lastPriceUpdate).toLocaleDateString('pt-BR')}
               </small>`
            : '';
        return `
        <div class="product-card ${!produto.disponivel ? 'product-unavailable' : ''}">
            <div class="product-image">
                ${_getProdutoImageHtml(produto)}
            </div>
            <div class="product-info">
                <span class="product-category">${escapeHtml(produto.categoria)}</span>
                <h3 class="product-name">${escapeHtml(produto.nome)}</h3>
                <p class="product-description">${escapeHtml(produto.descricao)}</p>
                <div class="product-footer">
                    <div>
                        <span class="product-price" data-price-id="${produto.id}">
                            R$ ${produto.preco.toFixed(2).replace('.', ',')}
                        </span>
                        ${lastUpdate}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <label class="switch" title="${produto.disponivel ? 'Disponível — clique para desativar' : 'Indisponível — clique para ativar'}">
                            <input type="checkbox" ${produto.disponivel ? 'checked' : ''} onchange="toggleProductAvailability(${produto.id})">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="product-actions-row">
                    <button class="btn-edit btn-sm" onclick="editProduto(${produto.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-price btn-sm" onclick="enableQuickPriceEdit(${produto.id})" title="Editar preço rapidamente">
                        <i class="fas fa-tag"></i> Preço
                    </button>
                    <button class="btn-img btn-sm" onclick="openImageManagerForProduct(${produto.id})" title="Trocar imagem">
                        <i class="fas fa-image"></i>
                    </button>
                    <button class="btn-delete btn-sm" onclick="deleteProduto(${produto.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${produto.orderCount > 0 ? `<div class="order-count-badge"><i class="fas fa-chart-bar"></i> ${produto.orderCount} pedido${produto.orderCount !== 1 ? 's' : ''}</div>` : ''}
            </div>
        </div>
    `}).join('');
}

function filterProducts(category) {
    renderProdutos(category);
}

// ==================== IMAGEM DO PRODUTO ====================
let _currentProductImageId = null; // usado no formulário de produto

function openImageManagerForProduct(productId) {
    if (productId !== undefined) {
        // Modo rápido: trocar imagem diretamente do card
        if (window.openImageManager) {
            window.openImageManager('selection', (imageId) => {
                const idx = AppState.produtos.findIndex(p => p.id === productId);
                if (idx !== -1) {
                    AppState.produtos[idx].imagem = imageId;
                    saveData();
                    renderProdutos(document.querySelector('.filter-tab.active')?.dataset.category || 'todos');
                    showToast('Imagem do produto atualizada!', 'success');
                }
            });
        }
    } else {
        // Modo formulário: selecionar imagem para o produto em edição
        if (window.openImageManager) {
            window.openImageManager('selection', (imageId) => {
                _currentProductImageId = imageId;
                const preview = document.getElementById('productImagePreview');
                const placeholder = document.getElementById('productImagePlaceholder');
                if (preview && window.imageManager) {
                    const imgItem = window.imageManager.getById(imageId);
                    if (imgItem) {
                        preview.src = imgItem.dataUrl;
                        preview.style.display = 'block';
                        if (placeholder) placeholder.style.display = 'none';
                    }
                }
            });
        }
    }
}

function removeProductImage() {
    _currentProductImageId = null;
    const preview = document.getElementById('productImagePreview');
    const placeholder = document.getElementById('productImagePlaceholder');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (placeholder) placeholder.style.display = 'block';
}

// ==================== EDIÇÃO RÁPIDA DE PREÇO ====================
function enableQuickPriceEdit(productId) {
    const priceEl = document.querySelector(`[data-price-id="${productId}"]`);
    if (!priceEl) return;
    const produto = AppState.produtos.find(p => p.id === productId);
    if (!produto) return;

    priceEl.innerHTML = `
        <div class="quick-price-edit" style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:13px;color:var(--text-secondary)">R$</span>
            <input type="number" class="quick-price-input" id="quickPrice_${productId}"
                   value="${produto.preco.toFixed(2)}" step="0.01" min="0.01"
                   style="width:80px;padding:4px 8px;background:var(--background);border:1px solid var(--primary);border-radius:8px;color:var(--text-primary);font-size:14px;font-weight:600;"
                   onkeydown="if(event.key==='Enter')confirmQuickPrice(${productId});if(event.key==='Escape')cancelQuickPrice(${productId})">
            <button onclick="confirmQuickPrice(${productId})" style="background:var(--success);border:none;border-radius:6px;color:white;padding:4px 8px;cursor:pointer;font-size:13px;" title="Confirmar">✓</button>
            <button onclick="cancelQuickPrice(${productId})" style="background:var(--error);border:none;border-radius:6px;color:white;padding:4px 8px;cursor:pointer;font-size:13px;" title="Cancelar">✗</button>
        </div>
    `;
    document.getElementById(`quickPrice_${productId}`)?.focus();
}

function confirmQuickPrice(productId) {
    const input = document.getElementById(`quickPrice_${productId}`);
    if (!input) return;
    const newPrice = parseFloat(input.value);
    if (isNaN(newPrice) || newPrice <= 0) {
        showToast('Preço inválido. Informe um valor maior que zero.', 'error');
        return;
    }
    const idx = AppState.produtos.findIndex(p => p.id === productId);
    if (idx === -1) return;
    AppState.produtos[idx].preco = newPrice;
    AppState.produtos[idx].lastPriceUpdate = new Date().toISOString();

    if (window.supabaseService && window.supabaseService.isConfigured()) {
        window.supabaseService.saveProduto(AppState.produtos[idx]).catch(err => {
            console.warn('[Supabase] Erro ao atualizar preço do produto:', err);
        });
    }

    saveData();
    renderProdutos(document.querySelector('.filter-tab.active')?.dataset.category || 'todos');
    showToast('Preço atualizado!', 'success');
}

function cancelQuickPrice(productId) {
    renderProdutos(document.querySelector('.filter-tab.active')?.dataset.category || 'todos');
}

// ==================== TOGGLE DISPONIBILIDADE ====================
function toggleProductAvailability(productId) {
    const idx = AppState.produtos.findIndex(p => p.id === productId);
    if (idx === -1) return;
    AppState.produtos[idx].disponivel = !AppState.produtos[idx].disponivel;

    if (window.supabaseService && window.supabaseService.isConfigured()) {
        window.supabaseService.saveProduto(AppState.produtos[idx]).catch(err => {
            console.warn('[Supabase] Erro ao atualizar disponibilidade:', err);
        });
    }

    saveData();
    renderProdutos(document.querySelector('.filter-tab.active')?.dataset.category || 'todos');
    showToast(`Produto ${AppState.produtos[idx].disponivel ? 'ativado' : 'desativado'}!`, 'success');
}

// ==================== MODAL PRODUTO ====================
function openModalProduto(produto = null) {
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    title.textContent = produto ? 'Editar Produto' : 'Novo Produto';
    _currentProductImageId = produto ? (produto.imagem || null) : null;

    // Montar preview da imagem atual
    let imgPreviewHtml = '';
    if (_currentProductImageId && window.imageManager) {
        const imgItem = window.imageManager.getById(_currentProductImageId);
        if (imgItem) {
            imgPreviewHtml = `<img id="productImagePreview" src="${imgItem.dataUrl}" alt="preview" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:8px;">`;
        }
    }
    if (!imgPreviewHtml) {
        imgPreviewHtml = `<img id="productImagePreview" src="" alt="" style="display:none;width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:8px;">`;
    }
    
    body.innerHTML = `
        <form id="produtoForm">
            <div class="form-group">
                <label>Nome do Produto</label>
                <input type="text" id="produtoNome" value="${produto ? produto.nome : ''}" required>
            </div>
            <div class="form-group">
                <label>Descrição</label>
                <textarea id="produtoDescricao" rows="3" required>${produto ? produto.descricao : ''}</textarea>
            </div>
            <div class="form-group">
                <label>Preço</label>
                <input type="number" id="produtoPreco" step="0.01" value="${produto ? produto.preco : ''}" required>
            </div>
            <div class="form-group">
                <label>Categoria</label>
                <select id="produtoCategoria" required>
                    <option value="acai" ${produto && produto.categoria === 'acai' ? 'selected' : ''}>Açaí</option>
                    <option value="tigelas" ${produto && produto.categoria === 'tigelas' ? 'selected' : ''}>Tigelas Especiais</option>
                    <option value="complementos" ${produto && produto.categoria === 'complementos' ? 'selected' : ''}>Complementos</option>
                    <option value="bebidas" ${produto && produto.categoria === 'bebidas' ? 'selected' : ''}>Bebidas</option>
                    <option value="combos" ${produto && produto.categoria === 'combos' ? 'selected' : ''}>Combos & Barcas</option>
                </select>
            </div>
            <div class="form-group">
                <label>Imagem do Produto</label>
                <div class="image-picker" id="productImagePicker">
                    ${imgPreviewHtml}
                    <span id="productImagePlaceholder" style="${_currentProductImageId ? 'display:none' : ''}; font-size:13px; color:var(--text-secondary);">Nenhuma imagem selecionada</span>
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <button type="button" class="btn-secondary" style="padding:8px 16px;font-size:13px;" onclick="openImageManagerForProduct()">
                            <i class="fas fa-images"></i> Selecionar do Banco
                        </button>
                        <button type="button" class="btn-outline" style="padding:8px 16px;font-size:13px;" onclick="removeProductImage()">
                            <i class="fas fa-times"></i> Remover
                        </button>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Disponível</label>
                <label class="switch" style="margin-top: 8px">
                    <input type="checkbox" id="produtoDisponivel" ${!produto || produto.disponivel ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            <button type="submit" class="btn-primary" style="width: 100%">
                <i class="fas fa-save"></i> Salvar Produto
            </button>
        </form>
    `;
    
    document.getElementById('produtoForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProduto(produto ? produto.id : null);
    });
    
    openModal();
}

async function saveProduto(id) {
    const existingProduto = id ? AppState.produtos.find(p => p.id === id) : null;
    const produto = {
        id: id || Date.now(),
        nome: document.getElementById('produtoNome').value,
        descricao: document.getElementById('produtoDescricao').value,
        preco: parseFloat(document.getElementById('produtoPreco').value),
        categoria: document.getElementById('produtoCategoria').value,
        disponivel: document.getElementById('produtoDisponivel').checked,
        imagem: _currentProductImageId,
        lastPriceUpdate: existingProduto && existingProduto.preco !== parseFloat(document.getElementById('produtoPreco').value)
            ? new Date().toISOString()
            : (existingProduto ? existingProduto.lastPriceUpdate : null),
        orderCount: existingProduto ? (existingProduto.orderCount || 0) : 0
    };
    
    if (isApiEnabled()) {
        try {
            const savedProduto = await saveProductApi(produto);
            if (savedProduto && savedProduto.id) {
                produto.id = savedProduto.id;
            }
        } catch (error) {
            console.warn('Falha ao salvar produto na API:', error);
            showToast('Não foi possível salvar o produto na API. Os dados foram gravados localmente.', 'warning');
        }
    }

    if (id) {
        const index = AppState.produtos.findIndex(p => p.id === id);
        AppState.produtos[index] = produto;
        showToast('Produto atualizado com sucesso!', 'success');
    } else {
        AppState.produtos.push(produto);
        showToast('Produto cadastrado com sucesso!', 'success');
    }
    
    // Auto-Sync Supabase
    if (window.supabaseService && window.supabaseService.isConfigured()) {
        window.supabaseService.saveProduto(produto).catch(err => {
            console.warn('[Supabase] Erro ao auto-salvar produto:', err);
        });
    }

    saveData();
    renderProdutos(document.querySelector('.filter-tab.active')?.dataset.category || 'todos');
    closeModal();
}

async function deleteProduto(id) {
    showConfirm('Tem certeza que deseja excluir este produto?', async () => {
        if (isApiEnabled()) {
            try {
                await deleteProductApi(id);
            } catch (error) {
                console.warn('Falha ao excluir produto na API:', error);
                showToast('Não foi possível excluir o produto na API. Exclusão local concluída.', 'warning');
            }
        }

        // Auto-Sync Supabase
        if (window.supabaseService && window.supabaseService.isConfigured()) {
            window.supabaseService.deleteProduto(id).catch(err => {
                console.warn('[Supabase] Erro ao excluir produto remoto:', err);
            });
        }

        AppState.produtos = AppState.produtos.filter(p => p.id !== id);
        saveData();
        renderProdutos(document.querySelector('.filter-tab.active')?.dataset.category || 'todos');
        showToast('Produto excluído!', 'success');
    });
}

function editProduto(id) {
    const produto = AppState.produtos.find(p => p.id === id);
    openModalProduto(produto);
}

// ==================== HISTÓRICO DE PEDIDOS POR PRODUTO ====================
function getTopProducts(limit = 5) {
    return [...AppState.produtos]
        .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
        .slice(0, limit);
}

// ==================== PEDIDOS ====================
async function savePedido(pedido) {
    // Incrementar orderCount dos produtos incluídos
    pedido.itens.forEach(item => {
        const idx = AppState.produtos.findIndex(p => p.id === item.produtoId);
        if (idx !== -1) {
            AppState.produtos[idx].orderCount = (AppState.produtos[idx].orderCount || 0) + (item.quantidade || 1);
        }
    });

    if (isApiEnabled()) {
        try {
            const savedOrder = await saveOrderApi(pedido);
            if (savedOrder && savedOrder.id) {
                pedido.id = savedOrder.id;
            }
        } catch (error) {
            console.warn('Falha ao salvar pedido na API:', error);
            showToast('Não foi possível enviar o pedido para a API. O pedido foi salvo localmente.', 'warning');
        }
    }

    AppState.pedidos.push(pedido);

    // Auto-Sync Supabase
    if (window.supabaseService && window.supabaseService.isConfigured()) {
        window.supabaseService.savePedido(pedido).catch(err => {
            console.warn('[Supabase] Erro ao auto-salvar pedido:', err);
        });
    }

    saveData();
    renderPedidos();
    renderDashboard();
    // Notificação de novo pedido
    if (window.notificationManager) {
        window.notificationManager.add('new_order', `Novo pedido #${pedido.id} registrado!`);
        updateNotificationBadge();
    }
}

function renderPedidos() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    let lista = [...AppState.pedidos];
    // filtros
    const statusF = document.getElementById('orderStatusFilter')?.value || 'todos';
    const tipoF = document.getElementById('orderTipoFilter')?.value || 'todos';
    const dataF = document.getElementById('orderDateFilter')?.value || '';
    if (statusF !== 'todos') lista = lista.filter(p => String(p.status||'').toLowerCase() === statusF);
    if (tipoF !== 'todos') lista = lista.filter(p => {
        const t = (p.tipo_entrega || p.tipo || (p.mesa ? 'mesa' : 'entrega') || '').toLowerCase();
        return t === tipoF;
    });
    if (dataF) lista = lista.filter(p => {
        const d = new Date(p.data || p.created_at || p.createdAt);
        return d.toISOString().slice(0,10) === dataF;
    });
    lista = lista.sort((a,b)=> new Date(b.data||b.created_at||b.createdAt) - new Date(a.data||a.created_at||a.createdAt));
    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px;">
                    <i class="fas fa-ice-cream" style="font-size: 32px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>Nenhum pedido encontrado. Os pedidos do cardápio aparecerão aqui automaticamente.</p>
                </td>
            </tr>
        `;
        return;
    }
    tbody.innerHTML = lista.map(pedido => {
        const cliente = AppState.clientes.find(c => String(c.id) === String(pedido.clienteId));
        const nomeCliente = pedido.cliente_nome || pedido.clienteNome || (cliente ? cliente.nome : 'Cliente');
        const total = pedido.total_com_frete || pedido.totalWithShipping || pedido.total || 0;
        const tipo = pedido.tipo_entrega || pedido.tipo || (pedido.mesa ? 'mesa' : 'entrega');
        const tipoLabel = tipo==='mesa' ? `Mesa ${pedido.mesa||''}` : tipo;
        const dataStr = new Date(pedido.data || pedido.created_at || pedido.createdAt).toLocaleDateString('pt-BR');
        return `
            <tr>
                <td>#${String(pedido.id).slice(-6)} <small style="color:var(--text-secondary);">(${escapeHtml(tipoLabel)})</small></td>
                <td>${escapeHtml(nomeCliente)}</td>
                <td>${pedido.itens ? pedido.itens.length : 0} item(s)</td>
                <td>R$ ${Number(total).toFixed(2).replace('.', ',')}</td>
                <td><span class="order-status ${escapeHtml(pedido.status||'novo')}">${escapeHtml(pedido.status||'novo')}</span></td>
                <td>${dataStr}</td>
                <td style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="btn-edit" onclick="viewOrder('${pedido.id}')" title="Ver"><i class="fas fa-eye"></i></button>
                    <button class="btn-edit" onclick="window.imprimirPedido && window.imprimirPedido(AppState.pedidos.find(p=>String(p.id)==='${pedido.id}'))" style="background:rgba(123,31,162,0.10);" title="Imprimir 80mm"><i class="fas fa-print"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    // listeners para filtros dinâmicos
    ['orderStatusFilter','orderTipoFilter','orderDateFilter'].forEach(id=>{
        const el=document.getElementById(id);
        if(el && !el._bound){ el.addEventListener('change', renderPedidos); el._bound=true; }
    });
}

function viewOrder(id) {
    const pedido = AppState.pedidos.find(p => String(p.id) === String(id));
    if (!pedido) return;
    const cliente = AppState.clientes.find(c => String(c.id) === String(pedido.clienteId));
    const nomeCliente = pedido.cliente_nome || pedido.clienteNome || (cliente ? cliente.nome : 'N/A');
    const total = pedido.total_com_frete || pedido.totalWithShipping || pedido.total || 0;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(30,16,53,0.45);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;';
    const itensHtml = (pedido.itens||[]).map(i => `<li style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;"><span>${i.quantidade}x ${escapeHtml(i.nome)}</span><span>R$ ${(i.preco*i.quantidade).toFixed(2).replace('.',',')}</span></li>`).join('');
    overlay.innerHTML = `
        <div style="background:#fff;border:1px solid rgba(123,31,162,0.12);border-radius:16px;padding:28px 32px;max-width:460px;width:90%;box-shadow:0 20px 60px rgba(123,31,162,0.15);max-height:90vh;overflow:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="color:var(--text-primary);font-size:18px;">Pedido #${String(pedido.id).slice(-6)} ${pedido.mesa ? '• Mesa '+escapeHtml(pedido.mesa) : ''}</h3>
                <button id="closeOrderView" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;">✕</button>
            </div>
            <p style="color:var(--text-secondary);font-size:13px;margin-bottom:6px;"><strong style="color:var(--text-primary);">Cliente:</strong> ${escapeHtml(nomeCliente)} ${pedido.cliente_telefone ? ' • '+escapeHtml(pedido.cliente_telefone) : ''}</p>
            ${pedido.cliente_endereco || pedido.endereco ? `<p style="color:var(--text-secondary);font-size:12px;margin-bottom:6px;"><strong>Endereço:</strong> ${escapeHtml(pedido.cliente_endereco||pedido.endereco)}</p>`:''}
            <p style="color:var(--text-secondary);font-size:13px;margin-bottom:6px;"><strong>Status:</strong> <span class="order-status ${escapeHtml(pedido.status||'novo')}">${escapeHtml(pedido.status||'novo')}</span> • <strong>Tipo:</strong> ${escapeHtml(pedido.tipo_entrega||pedido.tipo|| (pedido.mesa?'mesa':'entrega'))}</p>
            <div style="background:rgba(123,31,162,0.06);border:1px solid rgba(123,31,162,0.10);border-radius:12px;padding:12px;margin:12px 0;font-size:13px;">
                <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>R$ ${Number(pedido.subtotal||total).toFixed(2).replace('.',',')}</span></div>
                ${pedido.frete ? `<div style="display:flex;justify-content:space-between;"><span>Frete</span><span>R$ ${Number(pedido.frete).toFixed(2).replace('.',',')}</span></div>`:''}
                ${pedido.imposto||pedido.taxaServico ? `<div style="display:flex;justify-content:space-between;"><span>Imposto/Taxa</span><span>R$ ${Number(pedido.imposto||pedido.taxaServico).toFixed(2).replace('.',',')}</span></div>`:''}
                <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--border);margin-top:6px;padding-top:6px;"><span>Total</span><span style="color:var(--primary);">R$ ${Number(total).toFixed(2).replace('.',',')}</span></div>
            </div>
            <p style="color:var(--text-primary);font-size:13px;font-weight:600;margin-bottom:8px;">Itens:</p>
            <ul style="list-style:none;padding:0;margin:0;color:var(--text-secondary);font-size:13px;">${itensHtml||'<li>Nenhum item</li>'}</ul>
            ${pedido.observacoes ? `<p style="margin-top:12px;font-size:12px;background:rgba(123,31,162,0.06);padding:10px;border-radius:10px;"><strong>Obs:</strong> ${escapeHtml(pedido.observacoes)}</p>`:''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px;">
                <button onclick="window.imprimirPedido && window.imprimirPedido(AppState.pedidos.find(p=>String(p.id)==='${pedido.id}'))" style="padding:12px;border-radius:12px;border:1px solid var(--border);background:rgba(123,31,162,0.08);color:var(--primary);cursor:pointer;font-weight:600;"><i class="fas fa-print"></i> Imprimir 80mm</button>
                <button id="closeOrderViewBtn" style="padding:12px;border-radius:12px;border:none;background:var(--primary);color:white;cursor:pointer;font-weight:600;">Fechar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#closeOrderView').onclick = () => overlay.remove();
    overlay.querySelector('#closeOrderViewBtn').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

// ==================== WHATSAPP ====================
async function connectWhatsApp() {
    const number = document.getElementById('whatsappNumber').value;
    const token = document.getElementById('whatsappToken').value;
    const welcomeMessage = document.getElementById('welcomeMessage').value;
    
    if (!number || !token) {
        showToast('Preencha o número e o token!', 'error');
        return;
    }

    if (isApiEnabled()) {
        try {
            await connectWhatsAppApi({ number, token, welcomeMessage });
            showToast('WhatsApp conectado com sucesso na API!', 'success');
        } catch (error) {
            console.warn('Falha ao conectar WhatsApp na API:', error);
            showToast('Não foi possível conectar ao WhatsApp pela API. Conexão local aplicada.', 'warning');
        }
    }
    
    AppState.whatsapp = {
        connected: true,
        number: number,
        token: token,
        welcomeMessage: welcomeMessage
    };
    
    saveData();
    updateWhatsAppStatus(true);
    showToast('WhatsApp conectado com sucesso!', 'success');
}

function updateWhatsAppStatus(connected) {
    const status = document.getElementById('whatsappStatus');
    if (connected) {
        status.classList.add('connected');
        status.innerHTML = '<i class="fab fa-whatsapp"></i><span>Conectado</span>';
    } else {
        status.classList.remove('connected');
        status.innerHTML = '<i class="fab fa-whatsapp"></i><span>Desconectado</span>';
    }
}

// ==================== IA ATENDENTE ====================
async function renderIAResponses() {
    const list = document.getElementById('responsesList');
    
    if (!AppState.bot) {
        list.innerHTML = '<div class="empty-state"><p>Bot não inicializado</p></div>';
        return;
    }
    
    try {
        const knowledgeBase = await AppState.bot.getKnowledgeBase();
        
        if (knowledgeBase.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>Nenhuma resposta treinada</p></div>';
            return;
        }
        
        list.innerHTML = knowledgeBase.map((item, index) => `
            <div class="response-item">
                <div class="response-trigger">${item.trigger}</div>
                <div class="response-text">${item.response}</div>
                <div class="response-meta">
                    <span class="response-category">${item.category}</span>
                    <span class="response-usage">Usado ${item.usage || 0}x</span>
                    <span class="response-rating">⭐ ${item.rating ? item.rating.toFixed(1) : '0.0'}</span>
                </div>
                <button class="btn-delete" style="margin-top: 12px; padding: 8px 16px;" onclick="deleteIAResponse(${item.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar base de conhecimento:', error);
        list.innerHTML = '<div class="empty-state"><p>Erro ao carregar respostas</p></div>';
    }
}

async function addIAResponse() {
    const trigger = document.getElementById('triggerWord').value.trim();
    const response = document.getElementById('triggerResponse').value.trim();
    
    if (!trigger || !response) {
        showToast('Preencha palavra-chave e resposta!', 'error');
        return;
    }
    
    if (!AppState.bot) {
        showToast('Bot não inicializado!', 'error');
        return;
    }
    
    try {
        await AppState.bot.train(trigger, response, 'manual');
        renderIAResponses();
        
        document.getElementById('triggerWord').value = '';
        document.getElementById('triggerResponse').value = '';
        
        showToast('Resposta treinada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao treinar resposta:', error);
        showToast('Erro ao adicionar resposta!', 'error');
    }
}

async function deleteIAResponse(id) {
    if (!AppState.bot) {
        showToast('Bot não inicializado!', 'error');
        return;
    }
    
    try {
        await AppState.bot.deleteKnowledge(id);
        renderIAResponses();
        showToast('Resposta removida!', 'success');
    } catch (error) {
        console.error('Erro ao remover resposta:', error);
        showToast('Erro ao remover resposta!', 'error');
    }
}

// Processar mensagem do WhatsApp
async function processWhatsAppMessage(message, userInfo = {}) {
    if (!AppState.bot) {
        return 'Bot não está disponível no momento.';
    }
    
    try {
        const response = await AppState.bot.processMessage(message, userInfo);
        
        // Adicionar ao histórico de conversas
        AppState.chatLogs.push({
            usuario: userInfo.name || userInfo.phone || 'Cliente',
            mensagem: message,
            resposta: response.response,
            data: new Date().toISOString(),
            intent: response.intent,
            confidence: response.confidence
        });
        
        // Manter apenas últimas 100 conversas
        if (AppState.chatLogs.length > 100) {
            AppState.chatLogs = AppState.chatLogs.slice(-100);
        }
        
        saveData();
        renderChatLogs();
        
        return response.response;
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        return 'Desculpe, ocorreu um erro. Tente novamente mais tarde.';
    }
}

// Testar resposta do bot (função para debug)
async function testBotResponse() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:var(--surface,#1e1e1e);border:1px solid var(--border,#333);border-radius:16px;padding:28px 32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="color:var(--text-primary,#fff);font-size:16px;"><i class="fas fa-robot" style="color:#7B1FA2;margin-right:8px;"></i>Testar Bot</h3>
                <button id="closeBotTest" style="background:none;border:none;color:var(--text-secondary,#aaa);cursor:pointer;font-size:20px;">✕</button>
            </div>
            <input id="botTestInput" type="text" placeholder="Digite uma mensagem para testar..."
                style="width:100%;padding:10px 14px;background:var(--background,#111);border:1px solid var(--border,#333);border-radius:10px;color:var(--text-primary,#fff);font-size:14px;box-sizing:border-box;margin-bottom:12px;">
            <div id="botTestResult" style="display:none;padding:12px;background:rgba(255,107,0,0.1);border:1px solid rgba(255,107,0,0.3);border-radius:10px;font-size:13px;color:var(--text-primary,#fff);margin-bottom:16px;"></div>
            <div style="display:flex;gap:10px;">
                <button id="botTestCancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid var(--border,#333);background:transparent;color:var(--text-secondary,#aaa);cursor:pointer;font-size:14px;">Fechar</button>
                <button id="botTestSend" style="flex:1;padding:10px;border-radius:10px;border:none;background:#7B1FA2;color:white;cursor:pointer;font-size:14px;font-weight:600;">Testar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#botTestInput');
    const result = overlay.querySelector('#botTestResult');
    const close = () => overlay.remove();
    overlay.querySelector('#closeBotTest').onclick = close;
    overlay.querySelector('#botTestCancel').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    overlay.querySelector('#botTestSend').onclick = async () => {
        const msg = input.value.trim();
        if (!msg) return;
        result.style.display = 'block';
        result.textContent = 'Processando...';
        const response = await processWhatsAppMessage(msg, { name: 'Teste' });
        result.innerHTML = `<strong>Resposta:</strong> ${response}`;
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') overlay.querySelector('#botTestSend').click(); });
    setTimeout(() => input.focus(), 100);
}

// Função para testar NLP
async function testNLP() {
    if (!AppState.bot) {
        showToast('Bot não inicializado', 'error');
        return;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:var(--surface,#1e1e1e);border:1px solid var(--border,#333);border-radius:16px;padding:28px 32px;max-width:460px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="color:var(--text-primary,#fff);font-size:16px;"><i class="fas fa-brain" style="color:#7B1FA2;margin-right:8px;"></i>Analisar NLP</h3>
                <button id="closeNlpTest" style="background:none;border:none;color:var(--text-secondary,#aaa);cursor:pointer;font-size:20px;">✕</button>
            </div>
            <input id="nlpTestInput" type="text" placeholder="Digite uma mensagem para analisar..."
                style="width:100%;padding:10px 14px;background:var(--background,#111);border:1px solid var(--border,#333);border-radius:10px;color:var(--text-primary,#fff);font-size:14px;box-sizing:border-box;margin-bottom:12px;">
            <div id="nlpTestResult" style="display:none;padding:12px;background:rgba(255,107,0,0.08);border:1px solid rgba(255,107,0,0.3);border-radius:10px;font-size:13px;color:var(--text-primary,#fff);margin-bottom:16px;white-space:pre-wrap;"></div>
            <div style="display:flex;gap:10px;">
                <button id="nlpTestCancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid var(--border,#333);background:transparent;color:var(--text-secondary,#aaa);cursor:pointer;font-size:14px;">Fechar</button>
                <button id="nlpTestSend" style="flex:1;padding:10px;border-radius:10px;border:none;background:#7B1FA2;color:white;cursor:pointer;font-size:14px;font-weight:600;">Analisar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#nlpTestInput');
    const result = overlay.querySelector('#nlpTestResult');
    const close = () => overlay.remove();
    overlay.querySelector('#closeNlpTest').onclick = close;
    overlay.querySelector('#nlpTestCancel').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    overlay.querySelector('#nlpTestSend').onclick = () => {
        const msg = input.value.trim();
        if (!msg) return;
        const intent = AppState.bot.analyzeSentiment(msg);
        const sentiment = AppState.bot.analyzeSentiment(msg);
        const entities = AppState.bot.extractEntities(msg);
        result.style.display = 'block';
        result.textContent = `Intenção: ${intent}\nSentimento: ${sentiment}\nEntidades: ${JSON.stringify(entities, null, 2)}`;
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') overlay.querySelector('#nlpTestSend').click(); });
    setTimeout(() => input.focus(), 100);
}

function renderChatLogs() {
    const logs = document.getElementById('chatLogs');
    
    if (AppState.chatLogs.length === 0) {
        logs.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>Nenhuma conversa registrada</p></div>';
        return;
    }
    
    logs.innerHTML = AppState.chatLogs.slice(0, 10).map(log => `
        <div class="chat-log-item">
            <div class="chat-log-header">
                <span class="chat-log-user">${escapeHtml(log.usuario)}</span>
                <span class="chat-log-time">${new Date(log.data).toLocaleString('pt-BR')}</span>
                ${log.intent ? `<span class="chat-log-intent">${escapeHtml(log.intent)}</span>` : ''}
                ${log.confidence ? `<span class="chat-log-confidence">${(log.confidence * 100).toFixed(0)}%</span>` : ''}
            </div>
            <div class="chat-log-messages">
                <div class="chat-message user">${escapeHtml(log.mensagem)}</div>
                <div class="chat-message bot">${escapeHtml(log.resposta)}</div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('totalConversas').textContent = AppState.chatLogs.length;
}

// ==================== CONFIGURAÇÕES ====================
function saveColors() {
    AppState.settings.primaryColor = document.getElementById('primaryColor').value;
    AppState.settings.secondaryColor = document.getElementById('secondaryColor').value;
    AppState.settings.accentColor = document.getElementById('accentColor').value;
    
    saveData();
    applySettings();
    showToast('Cores salvas com sucesso!', 'success');
}

function saveCompanyData() {
    AppState.settings.companyName = document.getElementById('companyName').value;
    AppState.settings.companyPhone = document.getElementById('companyPhone').value;
    AppState.settings.companyAddress = document.getElementById('companyAddress').value;
    
    const apiBaseUrl = document.getElementById('apiBaseUrl');
    const apiEnabled = document.getElementById('apiEnabled');
    if (apiBaseUrl) {
        AppState.api.baseUrl = apiBaseUrl.value.trim();
    }
    if (apiEnabled) {
        AppState.api.enabled = apiEnabled.checked;
    }
    
    saveData();
    applySettings();
    showToast('Dados da empresa salvos!', 'success');
}

function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (window.imageManager) {
        // Upload para o banco de imagens e definir como logo
        window.imageManager.upload(file).then(imgItem => {
            updateLogo(imgItem.id);
        }).catch(err => {
            showToast('Erro ao fazer upload da logo: ' + err.message, 'error');
        });
    } else {
        // Fallback legado
        const reader = new FileReader();
        reader.onload = (event) => {
            AppState.settings.logo = event.target.result;
            document.getElementById('companyLogo').src = event.target.result;
            saveData();
            showToast('Logo atualizado!', 'success');
        };
        reader.readAsDataURL(file);
    }
}

// ==================== MODAL ====================
function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('hidden');
    
    if (type === 'cliente') {
        openModalCliente();
    } else if (type === 'produto') {
        openModalProduto();
    }
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

// ==================== LOGO VIA BANCO DE IMAGENS (Configurações) ====================
function openLogoManager() {
    if (window.openImageManager) {
        window.openImageManager('selection', (imageId) => {
            updateLogo(imageId);
            // Atualizar preview na tela de configurações
            const logoPreview = document.getElementById('logoSettingsPreview');
            if (logoPreview && window.imageManager) {
                const img = window.imageManager.getById(imageId);
                if (img) logoPreview.src = img.dataUrl;
            }
        });
    }
}

function openBankManager() {
    if (window.openImageManager) {
        window.openImageManager('management');
    }
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

// ==================== UTILITÁRIOS ====================

// Sanitizar texto para inserção segura no DOM via innerHTML
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Utilitário: lighten color
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (
        0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
}