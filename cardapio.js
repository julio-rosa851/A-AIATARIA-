// Cardápio Digital - Açaí Prime
// cardapio.js

// ==================== ESTADO ====================
// Carrinho isolado por sessão/aba - não compartilha entre usuários
let cart = [];
try { const s = sessionStorage.getItem('acai_cart_session'); if (s) cart = JSON.parse(s); } catch(e){}
function persistCart(){ try{ sessionStorage.setItem('acai_cart_session', JSON.stringify(cart)); }catch(e){} }
let products = [];

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadSettings();
    renderProducts();
    setupEventListeners();
    updateCartUI();
});

// ==================== UTILITÁRIOS ====================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const DEFAULT_PRODUCTS = [
    { id: 1, nome: 'Açaí Tradicional 300ml', descricao: 'Açaí puro batido na hora, cremoso e refrescante', preco: 18.90, categoria: 'acai', disponivel: true, destaque: true, tag: 'MAIS PEDIDO' },
    { id: 2, nome: 'Açaí Tradicional 500ml', descricao: 'Açaí puro 500ml — tamanho ideal para compartilhar', preco: 24.90, categoria: 'acai', disponivel: true, destaque: true },
    { id: 3, nome: 'Açaí Premium 700ml', descricao: 'Açaí 700ml com até 4 complementos grátis', preco: 32.90, categoria: 'acai', disponivel: true, destaque: true },
    { id: 4, nome: 'Tigela Power Nutella', descricao: 'Açaí 500ml + Nutella, leite em pó, paçoca e morango', preco: 29.90, categoria: 'tigelas', disponivel: true, destaque: true, tag: 'PREMIUM' },
    { id: 5, nome: 'Tigela Tropical', descricao: 'Açaí + banana, granola, mel, kiwi e manga', preco: 27.90, categoria: 'tigelas', disponivel: true },
    { id: 6, nome: 'Barca Família 1L', descricao: 'Barca de açaí 1 litro + 6 complementos + 2 caldas', preco: 54.90, categoria: 'combos', disponivel: true, destaque: true },
    { id: 7, nome: 'Complemento Extra', descricao: 'Leite em pó, paçoca, granola, confete, leite condensado, Nutella', preco: 3.50, categoria: 'complementos', disponivel: true },
    { id: 8, nome: 'Água 500ml', descricao: 'Água mineral gelada', preco: 4.00, categoria: 'bebidas', disponivel: true },
    { id: 9, nome: 'Refrigerante Lata', descricao: 'Lata 350ml gelada', preco: 6.00, categoria: 'bebidas', disponivel: true }
];

// Carregar produtos do localStorage
function loadProducts() {
    try {
        const savedData = localStorage.getItem('acaiPrimeData');
        if (savedData) {
            const data = JSON.parse(savedData);
            products = (data.produtos && data.produtos.length > 0) ? data.produtos : DEFAULT_PRODUCTS;
        } else {
            products = DEFAULT_PRODUCTS;
        }
    } catch (e) {
        console.warn('[cardapio] Erro ao carregar produtos:', e);
        products = DEFAULT_PRODUCTS;
    }
}

// Carregar configurações
function loadSettings() {
    try {
        const savedData = localStorage.getItem('acaiPrimeData');
        if (savedData) {
            const data = JSON.parse(savedData);
            const settings = data.settings;

            if (settings) {
                const root = document.documentElement;
                if (settings.primaryColor) {
                    root.style.setProperty('--primary', settings.primaryColor);
                    root.style.setProperty('--primary-light', lightenColor(settings.primaryColor, 20));
                }
                if (settings.accentColor) {
                    root.style.setProperty('--accent', settings.accentColor);
                }
                if (settings.companyName) {
                    const brandEl = document.querySelector('.brand-title');
                    if (brandEl) brandEl.textContent = settings.companyName;
                    document.title = `Cardápio Digital - ${settings.companyName}`;
                }
                // Atualizar número do WhatsApp nos links do footer e hero
                if (settings.companyPhone) {
                    const phone = settings.companyPhone.replace(/\D/g, '');
                    document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
                        const url = new URL(a.href);
                        a.href = `https://wa.me/${phone}${url.search}`;
                    });
                }
                // Atualizar horário e endereço no footer
                if (settings.companyAddress) {
                    const addrEl = document.querySelector('.footer-info p:last-child');
                    if (addrEl) addrEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${escapeHtml(settings.companyAddress)}`;
                }
            }
        }
    } catch (e) {
        console.warn('[cardapio] Erro ao carregar configurações:', e);
    }

    // Logo: priorizar banco de imagens, depois settings.logo legado
    const menuLogo = document.getElementById('menuLogo');
    if (menuLogo) {
        try {
            const configData = localStorage.getItem('acai_products_config');
            if (configData) {
                const config = JSON.parse(configData);
                if (config.logoImageId && window.imageManager) {
                    const imgItem = window.imageManager.getById(config.logoImageId);
                    if (imgItem) { menuLogo.src = imgItem.dataUrl; return; }
                }
            }
            const appData = localStorage.getItem('acaiPrimeData');
            if (appData) {
                const data = JSON.parse(appData);
                if (data.settings && data.settings.logo) {
                    menuLogo.src = data.settings.logo;
                }
            }
        } catch (e) {
            console.warn('[cardapio] Erro ao carregar logo:', e);
        }
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Category tabs
    document.querySelectorAll('.cat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterProducts(tab.dataset.category);
        });
    });
}

// ==================== PRODUTOS ====================
function renderProducts(filter = 'todos') {
    const grid = document.getElementById('productsMenu');
    let filteredProducts = products;
    
    if (filter !== 'todos') {
        filteredProducts = products.filter(p => p.categoria === filter && p.disponivel);
    } else {
        filteredProducts = products.filter(p => p.disponivel);
    }
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 64px;">
                <i class="fas fa-bowl-rice" style="font-size: 64px; margin-bottom: 24px; opacity: 0.5;"></i>
                <p style="font-size: 18px; color: var(--text-secondary);">Nenhum produto disponível</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredProducts.map(produto => {
        // Buscar imagem real do banco de imagens
        let imageHtml = getProductIcon(produto.categoria);
        if (produto.imagem && window.imageManager) {
            const imgItem = window.imageManager.getById(produto.imagem);
            if (imgItem) {
                imageHtml = `<img src="${imgItem.dataUrl}" alt="${escapeHtml(produto.nome)}" class="product-img" style="width:100%;height:100%;object-fit:cover;">`;
            }
        }
        return `
        <div class="menu-product" onclick="addToCart(${produto.id})">
            <div class="product-image">
                ${imageHtml}
                <span class="product-badge">${escapeHtml(produto.categoria)}</span>
            </div>
            <div class="product-info">
                <span class="product-category">${escapeHtml(produto.categoria)}</span>
                <h3 class="product-name">${escapeHtml(produto.nome)}</h3>
                <p class="product-description">${escapeHtml(produto.descricao)}</p>
                <div class="product-footer">
                    <span class="product-price">R$ ${produto.preco.toFixed(2).replace('.', ',')}</span>
                    <button class="product-btn" onclick="event.stopPropagation(); addToCart(${produto.id})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

function filterProducts(category) {
    renderProducts(category);
}

function getProductIcon(categoria) {
    const icons = {
        acai: '<i class="fas fa-ice-cream"></i>',
        tigelas: '<i class="fas fa-bowl-rice"></i>',
        complementos: '<i class="fas fa-plus-circle"></i>',
        bebidas: '<i class="fas fa-glass-cheers"></i>',
        combos: '<i class="fas fa-layer-group"></i>'
    };
    return icons[categoria] || '<i class="fas fa-ice-cream"></i>';
}

// ==================== CARRINHO ====================
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantidade++;
    } else {
        cart.push({
            id: product.id,
            nome: product.nome,
            preco: product.preco,
            quantidade: 1
        });
    }
    
    persistCart();
    updateCartUI();
    showToast(`${product.nome} adicionado!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    persistCart();
    updateCartUI();
}

function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantidade += change;
        if (item.quantidade <= 0) {
            removeFromCart(productId);
        } else {
            persistCart();
            updateCartUI();
        }
    }
}

function updateCartUI() {
    // Atualizar badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantidade, 0);
    document.getElementById('cartBadge').textContent = totalItems;
    
    // Atualizar itens do carrinho
    const cartItems = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>Carrinho vazio</p>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => {
            // Buscar imagem real do produto no carrinho
            const produto = products.find(p => p.id === item.id);
            let cartImageHtml = '<i class="fas fa-ice-cream"></i>';
            if (produto && produto.imagem && window.imageManager) {
                const imgItem = window.imageManager.getById(produto.imagem);
                if (imgItem) {
                    cartImageHtml = `<img src="${imgItem.dataUrl}" alt="${escapeHtml(item.nome)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
                }
            }
            return `
            <div class="cart-item">
                <div class="cart-item-image">
                    ${cartImageHtml}
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHtml(item.nome)}</div>
                    <div class="cart-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span class="qty-value">${item.quantidade}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `}).join('');
    }
    
    // Atualizar resumo detalhado (frete/imposto) se função existir
    if (typeof atualizarResumoCheckout === 'function') atualizarResumoCheckout();
    else {
        const total = cart.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        const formattedTotal = 'R$ ' + total.toFixed(2).replace('.', ',');
        const el = document.getElementById('cartTotal');
        if (el) el.textContent = formattedTotal;
        const headerTotalEl = document.getElementById('cartHeaderTotal');
        if (headerTotalEl) headerTotalEl.textContent = formattedTotal;
    }
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function atualizarResumoCheckout() {
    const subtotal = cart.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    const endereco = document.getElementById('checkoutEndereco')?.value || '';
    const tipoEntrega = document.getElementById('checkoutTipoEntrega')?.value || 'entrega';
    let calc = { subtotal, shippingRate: 0, imposto: 0, total: subtotal, zone: 'Retirada' };
    if (window.ShippingRates && typeof window.ShippingRates.calculateTotal === 'function') {
        calc = window.ShippingRates.calculateTotal(endereco, subtotal, tipoEntrega);
    } else {
        // fallback frete fixo
        const frete = tipoEntrega === 'retirada' ? 0 : 7.00;
        calc = { subtotal, shippingRate: frete, imposto: 0, total: subtotal + frete, zone: frete===0?'Retirada':'Zona geral' };
    }
    const fmt = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
    const elSub = document.getElementById('resumoSubtotal');
    if (elSub) elSub.textContent = fmt(calc.subtotal);
    const elFrete = document.getElementById('resumoFrete');
    if (elFrete) elFrete.textContent = fmt(calc.shippingRate);
    const elImp = document.getElementById('resumoImposto');
    if (elImp) elImp.textContent = fmt(calc.imposto);
    const elZona = document.getElementById('resumoZona');
    if (elZona) elZona.textContent = calc.zone ? `(${calc.zone})` : '';
    const elTotal = document.getElementById('cartTotal');
    if (elTotal) elTotal.textContent = fmt(calc.total);
    const headerTotalEl = document.getElementById('cartHeaderTotal');
    if (headerTotalEl) headerTotalEl.textContent = fmt(calc.total);
    return calc;
}

function finalizarPedido() {
    if (cart.length === 0) {
        showToast('Carrinho vazio!', 'error');
        return;
    }
    const nome = document.getElementById('checkoutNome')?.value.trim() || '';
    const telefone = document.getElementById('checkoutTelefone')?.value.trim() || '';
    const endereco = document.getElementById('checkoutEndereco')?.value.trim() || '';
    const tipoEntrega = document.getElementById('checkoutTipoEntrega')?.value || 'entrega';
    const pagamento = document.getElementById('checkoutPagamento')?.value || 'pix';
    const obs = document.getElementById('checkoutObs')?.value.trim() || '';

    if (!nome || !telefone) {
        showToast('Preencha nome e WhatsApp para entrega! 🍧', 'error');
        document.getElementById('checkoutNome')?.focus();
        return;
    }
    if (tipoEntrega === 'entrega' && !endereco) {
        showToast('Informe o endereço para calcular frete! 📍', 'error');
        document.getElementById('checkoutEndereco')?.focus();
        return;
    }

    const calc = atualizarResumoCheckout();
    const subtotal = calc.subtotal;
    const frete = calc.shippingRate;
    const imposto = calc.imposto;
    const total = calc.total;

    // Mensagem WhatsApp rica
    let message = `*Novo Pedido - Açaí Prime*%0A%0A`;
    message += `*Cliente:* ${nome} - ${telefone}%0A`;
    message += `*Endereço:* ${tipoEntrega==='retirada' ? 'Retirada na loja' : endereco}%0A`;
    message += `*Entrega:* ${tipoEntrega} | *Pagamento:* ${pagamento}%0A`;
    if (obs) message += `*Obs:* ${obs}%0A`;
    message += `%0A*Itens:*%0A`;
    cart.forEach(item => {
        message += `• ${item.quantidade}x ${item.nome} - R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}%0A`;
    });
    message += `%0A*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}%0A`;
    message += `*Frete (${calc.zone}):* R$ ${frete.toFixed(2).replace('.', ',')}%0A`;
    if (imposto>0) message += `*Imposto/taxa:* R$ ${imposto.toFixed(2).replace('.', ',')}%0A`;
    message += `*Total:* R$ ${total.toFixed(2).replace('.', ',')}`;

    let phone = '5524992552754';
    try {
        const savedData = localStorage.getItem('acaiPrimeData');
        if (savedData) {
            const data = JSON.parse(savedData);
            const wpNumber = data.whatsapp?.number?.replace(/\D/g, '');
            const phoneNumber = data.settings?.companyPhone?.replace(/\D/g, '');
            if (wpNumber && wpNumber.length >= 10) phone = wpNumber;
            else if (phoneNumber && phoneNumber.length >= 10) phone = phoneNumber;
        }
    } catch (e) { console.warn(e); }

    const codigoPedido = 'PED-' + Math.floor(1000 + Math.random() * 9000);
    const nowISO = new Date().toISOString();
    const novoPedido = {
        id: Date.now(),
        codigo_pedido: codigoPedido,
        clienteId: null,
        cliente_nome: nome,
        cliente_telefone: telefone,
        cliente_endereco: endereco,
        endereco: endereco,
        itens: cart.map(item => ({ produtoId: item.id, nome: item.nome, quantidade: item.quantidade, preco: item.preco })),
        subtotal: subtotal,
        frete: frete,
        imposto: imposto,
        total: total,
        total_com_frete: total,
        totalWithShipping: total,
        zona: calc.zone,
        status: 'novo',
        forma_pagamento: pagamento,
        tipo_entrega: tipoEntrega,
        observacoes: obs,
        data: nowISO,
        created_at: nowISO,
        createdAt: nowISO
    };

    // Salva cliente automaticamente se não existir (cadastro prévio)
    try {
        const raw = localStorage.getItem('acaiPrimeData');
        const data = raw ? JSON.parse(raw) : { clientes: [], pedidos: [], produtos: [] };
        if (!data.clientes) data.clientes = [];
        let clienteExist = data.clientes.find(c => c.telefone && c.telefone.replace(/\D/g,'') === telefone.replace(/\D/g,''));
        if (!clienteExist) {
            const novoCliente = { id: Date.now(), nome, telefone, endereco, segmento: 'novo', observacoes: obs, createdAt: nowISO, updatedAt: nowISO };
            data.clientes.push(novoCliente);
            novoPedido.clienteId = novoCliente.id;
        } else {
            novoPedido.clienteId = clienteExist.id;
            if (endereco && !clienteExist.endereco) clienteExist.endereco = endereco;
        }
        // Lead capture
        try{
          const leadsRaw = localStorage.getItem('acai_leads');
          const leads = leadsRaw ? JSON.parse(leadsRaw) : [];
          const jaExisteLead = leads.some(l=> (l.telefone||'').replace(/\D/g,'') === telefone.replace(/\D/g,''));
          if(!jaExisteLead){
            leads.unshift({id: String(Date.now()), nome, telefone, origem: 'cardapio', createdAt: nowISO});
            localStorage.setItem('acai_leads', JSON.stringify(leads));
            try{ new BroadcastChannel('acai_prime_orders').postMessage({type:'new_lead'});}catch(e){}
          }
        }catch(e){}
        if (!data.pedidos) data.pedidos = [];
        data.pedidos.unshift(novoPedido);
        localStorage.setItem('acaiPrimeData', JSON.stringify(data));
        try { if (window.acaiChannel) window.acaiChannel.postMessage({type:'new_order', pedido: novoPedido}); } catch(e){}
        try { localStorage.setItem('acai_last_order', String(Date.now())); } catch(e){}
        window.dispatchEvent(new CustomEvent('acai:new_order', { detail: novoPedido }));
    } catch (e) {
        console.warn('[cardapio] Erro ao salvar pedido local:', e);
    }

    if (window.supabaseService && window.supabaseService.isConfigured()) {
        window.supabaseService.savePedido(novoPedido).then(()=> console.log('[cardapio] Pedido Supabase ok')).catch(err=> console.warn(err));
    }
    if (window.notificationManager) {
        window.notificationManager.add('new_order', `Novo pedido ${codigoPedido} de ${nome} - R$ ${total.toFixed(2).replace('.',',')}`);
        if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
    }

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    cart = [];
    persistCart();
    try{ sessionStorage.removeItem('acai_cart_session'); }catch(e){}
    ['checkoutNome','checkoutTelefone','checkoutEndereco','checkoutObs'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const tipoEl=document.getElementById('checkoutTipoEntrega'); if(tipoEl) tipoEl.value='entrega';
    const pagEl=document.getElementById('checkoutPagamento'); if(pagEl) pagEl.value='pix';
    updateCartUI();
    toggleCart();
    showToast('Pedido enviado! Apareceu automaticamente no Dashboard 🍧', 'success');
}

// ==================== TOAST ====================
function showToast(message, type = 'success') {
    // Criar toast simples
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? 'var(--error)' : 'var(--success)'};
        color: white;
        padding: 16px 32px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 1000;
        animation: fadeInUp 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Adicionar animação
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);

// ==================== UTILITÁRIOS ====================
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