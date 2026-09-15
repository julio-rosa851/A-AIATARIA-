/**
 * Açaí Prime - Módulo de Clientes com Ranking e Fidelidade
 * clientes.js — sobrescreve as funções de clientes do app.js
 */

// ==================== MIGRAÇÃO E HELPERS ====================

function _migrateClientes() {
    if (!AppState || !AppState.clientes) return;
    AppState.clientes = AppState.clientes.map(c => ({
        pontos: 0,
        totalGasto: 0,
        totalPedidos: 0,
        dataCadastro: new Date().toISOString(),
        ultimoPedido: null,
        aniversario: '',
        instagram: '',
        ...c
    }));
}

function _calcClienteStats(clienteId) {
    const pedidos = (AppState.pedidos || []).filter(p => p.clienteId === clienteId);
    const totalGasto = pedidos.reduce((s, p) => s + (p.total || 0), 0);
    const totalPedidos = pedidos.length;
    const sorted = pedidos.slice().sort((a, b) => new Date(b.data) - new Date(a.data));
    const ultimoPedido = sorted.length > 0 ? sorted[0].data : null;
    return { totalGasto, totalPedidos, ultimoPedido };
}

function _calcPontos(totalGasto) {
    return Math.floor(totalGasto / 10);
}

function _getRankingInfo(totalGasto, totalPedidos) {
    if (totalGasto >= 500 || totalPedidos >= 20) return { label: '🥇 Ouro',     cls: 'rank-gold',    score: 3 };
    if (totalGasto >= 150 || totalPedidos >= 8)  return { label: '🥈 Prata',    cls: 'rank-silver',  score: 2 };
    if (totalGasto >= 50  || totalPedidos >= 3)  return { label: '🥉 Bronze',   cls: 'rank-bronze',  score: 1 };
    return                                               { label: '⭐ Iniciante', cls: 'rank-starter', score: 0 };
}

// ==================== ESTADO DE FILTRO ====================

window._clientFilter = { segment: 'todos', search: '', sort: 'nome' };

window.filterClientsBySegment = function(segment, btn) {
    window._clientFilter.segment = segment;
    document.querySelectorAll('#clientSegmentTabs .filter-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderClientes();
};

window.sortAndRenderClientes = function() {
    window._clientFilter.sort = document.getElementById('clientSortSelect')?.value || 'nome';
    renderClientes();
};

// ==================== RENDER PRINCIPAL ====================

function renderClientes(filter) {
    // Compatibilidade: se chamado com string (busca), atualiza o filtro
    if (typeof filter === 'string') {
        window._clientFilter.search = filter;
    }

    _renderClientStats();
    _renderClientRankingTop();

    const grid = document.getElementById('clientsGrid');
    if (!grid) return;

    const list = _getFilteredSortedClientes();

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <i class="fas fa-users"></i>
                <p>Nenhum cliente encontrado</p>
            </div>`;
        return;
    }

    grid.innerHTML = list.map(cliente => {
        const ranking = _getRankingInfo(cliente.totalGasto, cliente.totalPedidos);
        const segColors = { vip: '#7B1FA2', regular: '#CE93D8', novo: '#00C853' };
        const segColor = segColors[cliente.segmento] || '#A0A0A0';
        const ultimoPedidoStr = cliente.ultimoPedido
            ? new Date(cliente.ultimoPedido).toLocaleDateString('pt-BR')
            : '—';

        return `
        <div class="client-card client-card-enhanced">
            <div class="client-rank-badge ${ranking.cls}">${ranking.label}</div>
            <div class="client-header">
                <div class="client-avatar" style="background:linear-gradient(135deg,${segColor},${segColor}88);">
                    ${cliente.nome.charAt(0).toUpperCase()}
                </div>
                <div style="flex:1;min-width:0;">
                    <h3 class="client-name">${cliente.nome}</h3>
                    <span class="client-segment ${cliente.segmento}">${cliente.segmento.toUpperCase()}</span>
                </div>
                <div class="client-points-badge" title="Pontos de fidelidade">
                    <i class="fas fa-star"></i> ${cliente.pontos} pts
                </div>
            </div>
            <div class="client-info">
                <p><i class="fas fa-phone"></i> ${cliente.telefone}</p>
                ${cliente.email    ? `<p><i class="fas fa-envelope"></i> ${cliente.email}</p>` : ''}
                ${cliente.endereco ? `<p><i class="fas fa-map-marker-alt"></i> ${cliente.endereco}</p>` : ''}
                ${cliente.instagram ? `<p><i class="fab fa-instagram"></i> ${cliente.instagram}</p>` : ''}
                ${cliente.aniversario ? `<p><i class="fas fa-birthday-cake"></i> ${new Date(cliente.aniversario + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit',month:'long'})}</p>` : ''}
            </div>
            <div class="client-metrics">
                <div class="client-metric">
                    <span class="metric-value">${cliente.totalPedidos}</span>
                    <span class="metric-label">Pedidos</span>
                </div>
                <div class="client-metric">
                    <span class="metric-value">R$ ${cliente.totalGasto.toFixed(0)}</span>
                    <span class="metric-label">Total Gasto</span>
                </div>
                <div class="client-metric">
                    <span class="metric-value">${ultimoPedidoStr}</span>
                    <span class="metric-label">Último Pedido</span>
                </div>
            </div>
            ${_renderProgressBar(cliente.totalGasto)}
            ${cliente.observacoes ? `<p class="client-obs"><i class="fas fa-sticky-note"></i> ${cliente.observacoes}</p>` : ''}
            <div class="client-actions">
                <button class="btn-edit" onclick="editCliente(${cliente.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-sm" style="background:rgba(0,200,83,0.15);color:var(--success);padding:8px 12px;border:none;border-radius:8px;cursor:pointer;" onclick="viewClienteHistorico(${cliente.id})" title="Histórico de pedidos">
                    <i class="fas fa-history"></i>
                </button>
                <button class="btn-delete" onclick="deleteCliente(${cliente.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

function _getFilteredSortedClientes() {
    _migrateClientes();
    let list = (AppState.clientes || []).map(c => {
        const stats = _calcClienteStats(c.id);
        return { ...c, ...stats, pontos: _calcPontos(stats.totalGasto) };
    });

    if (window._clientFilter.segment !== 'todos') {
        list = list.filter(c => c.segmento === window._clientFilter.segment);
    }

    if (window._clientFilter.search) {
        const q = window._clientFilter.search.toLowerCase();
        list = list.filter(c =>
            c.nome.toLowerCase().includes(q) ||
            c.telefone.includes(q) ||
            (c.email || '').toLowerCase().includes(q)
        );
    }

    switch (window._clientFilter.sort) {
        case 'ranking':
        case 'gasto':   list.sort((a, b) => b.totalGasto - a.totalGasto);    break;
        case 'pedidos': list.sort((a, b) => b.totalPedidos - a.totalPedidos); break;
        case 'recente': list.sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro)); break;
        default:        list.sort((a, b) => a.nome.localeCompare(b.nome));    break;
    }
    return list;
}

function _renderProgressBar(totalGasto) {
    const levels = [
        { min: 0,   max: 50,  label: 'Bronze', color: '#CD7F32' },
        { min: 50,  max: 150, label: 'Prata',  color: '#C0C0C0' },
        { min: 150, max: 500, label: 'Ouro',   color: '#CE93D8' },
    ];
    const current = levels.find(l => totalGasto >= l.min && totalGasto < l.max);
    if (!current) return '';
    const pct = Math.min(100, ((totalGasto - current.min) / (current.max - current.min)) * 100);
    const remaining = (current.max - totalGasto).toFixed(0);
    return `
        <div class="client-progress">
            <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${pct}%;background:${current.color};"></div>
            </div>
            <span class="progress-label">R$ ${remaining} para ${current.label}</span>
        </div>`;
}

function _renderClientStats() {
    const el = document.getElementById('clientsStatsRow');
    if (!el) return;
    _migrateClientes();

    const total = (AppState.clientes || []).length;
    const vip = (AppState.clientes || []).filter(c => c.segmento === 'vip').length;
    const novos = (AppState.clientes || []).filter(c => c.segmento === 'novo').length;
    const totalGastoGeral = (AppState.clientes || []).reduce((s, c) => {
        return s + (AppState.pedidos || []).filter(p => p.clienteId === c.id).reduce((ss, p) => ss + (p.total || 0), 0);
    }, 0);

    el.innerHTML = `
        <div class="client-stat-card">
            <i class="fas fa-users"></i>
            <div><h4>Total de Clientes</h4><p class="stat-big">${total}</p></div>
        </div>
        <div class="client-stat-card">
            <i class="fas fa-crown" style="color:#7B1FA2;"></i>
            <div><h4>Clientes VIP</h4><p class="stat-big">${vip}</p></div>
        </div>
        <div class="client-stat-card">
            <i class="fas fa-user-plus" style="color:#00C853;"></i>
            <div><h4>Novos Clientes</h4><p class="stat-big">${novos}</p></div>
        </div>
        <div class="client-stat-card">
            <i class="fas fa-dollar-sign" style="color:#CE93D8;"></i>
            <div><h4>Receita Total</h4><p class="stat-big">R$ ${totalGastoGeral.toFixed(0)}</p></div>
        </div>`;
}

function _renderClientRankingTop() {
    const el = document.getElementById('clientsRankingTop');
    if (!el) return;

    const top3 = (AppState.clientes || [])
        .map(c => { const s = _calcClienteStats(c.id); return { ...c, ...s }; })
        .sort((a, b) => b.totalGasto - a.totalGasto)
        .slice(0, 3)
        .filter(c => c.totalGasto > 0);

    if (top3.length === 0) { el.innerHTML = ''; return; }

    const medals = ['🥇', '🥈', '🥉'];
    const medalColors = ['#CE93D8', '#C0C0C0', '#CD7F32'];

    el.innerHTML = `
        <div class="ranking-top-card">
            <h3 style="font-size:16px;margin-bottom:16px;display:flex;align-items:center;gap:8px;color:var(--primary);">
                <i class="fas fa-trophy"></i> Top Clientes — Ranking de Fidelidade
            </h3>
            <div class="ranking-top-list">
                ${top3.map((c, i) => `
                    <div class="ranking-top-item" style="border-left:3px solid ${medalColors[i]};">
                        <span class="ranking-medal">${medals[i]}</span>
                        <div class="ranking-avatar" style="background:linear-gradient(135deg,${medalColors[i]},${medalColors[i]}88);">
                            ${c.nome.charAt(0)}
                        </div>
                        <div class="ranking-info">
                            <strong>${c.nome}</strong>
                            <span>${c.totalPedidos} pedido${c.totalPedidos !== 1 ? 's' : ''} · R$ ${c.totalGasto.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div class="ranking-points">
                            <i class="fas fa-star" style="color:${medalColors[i]};font-size:12px;"></i>
                            ${_calcPontos(c.totalGasto)} pts
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
}

// ==================== MODAL CLIENTE ====================

function escapeAttr(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function openModalCliente(cliente) {
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    title.textContent = cliente ? 'Editar Cliente' : 'Novo Cliente';

    const stats = cliente ? _calcClienteStats(cliente.id) : null;
    const pontosCalc = stats ? _calcPontos(stats.totalGasto) : 0;
    const pontos = cliente ? (typeof cliente.pontos === 'number' ? cliente.pontos : pontosCalc) : pontosCalc;

    body.innerHTML = `
        <form id="clienteForm" novalidate>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group" style="grid-column:1/-1;">
                    <label>Nome Completo *</label>
                    <input type="text" id="clienteNome" value="${escapeAttr(cliente ? cliente.nome : '')}" required placeholder="Nome do cliente">
                </div>
                <div class="form-group">
                    <label>Telefone / WhatsApp *</label>
                    <input type="text" id="clienteTelefone" value="${escapeAttr(cliente ? cliente.telefone : '')}" required placeholder="(11) 99999-9999">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="clienteEmail" value="${escapeAttr(cliente ? (cliente.email || '') : '')}" placeholder="email@exemplo.com">
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label>Endereço de Entrega *</label>
                    <input type="text" id="clienteEndereco" value="${escapeAttr(cliente ? (cliente.endereco || '') : '')}" placeholder="Rua, número, bairro - ex: Rua das Flores 123, Centro" autocomplete="street-address">
                    <small style="color:var(--text-secondary);font-size:11px;">Será usado para cálculo automático de frete. Pode ser só "rua" para teste.</small>
                </div>
                <div class="form-group">
                    <label>Instagram</label>
                    <input type="text" id="clienteInstagram" value="${escapeAttr(cliente ? (cliente.instagram || '') : '')}" placeholder="@usuario">
                </div>
                <div class="form-group">
                    <label>Aniversário</label>
                    <input type="date" id="clienteAniversario" value="${cliente ? (cliente.aniversario || '') : ''}">
                </div>
                <div class="form-group">
                    <label>Segmento</label>
                    <select id="clienteSegmento">
                        <option value="novo"    ${cliente && cliente.segmento === 'novo'    ? 'selected' : ''}>⭐ Novo</option>
                        <option value="regular" ${cliente && cliente.segmento === 'regular' ? 'selected' : ''}>🔵 Regular</option>
                        <option value="vip"     ${cliente && cliente.segmento === 'vip'     ? 'selected' : ''}>👑 VIP</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Pontos de Fidelidade <small style="color:var(--text-secondary);">(auto: ${pontosCalc} pts)</small></label>
                    <input type="number" id="clientePontos" value="${pontos}" min="0" placeholder="0">
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label>Observações</label>
                    <textarea id="clienteObservacoes" rows="2" placeholder="Preferências, alergias, notas...">${cliente ? escapeAttr(cliente.observacoes || '') : ''}</textarea>
                </div>
            </div>
            ${stats && stats.totalPedidos > 0 ? `
            <div style="background:var(--background);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px;">
                <p style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Histórico</p>
                <div style="display:flex;gap:20px;flex-wrap:wrap;">
                    <span style="font-size:13px;"><strong>${stats.totalPedidos}</strong> pedidos</span>
                    <span style="font-size:13px;"><strong>R$ ${stats.totalGasto.toFixed(2).replace('.', ',')}</strong> gasto total</span>
                    ${stats.ultimoPedido ? '<span style="font-size:13px;">Último: <strong>' + new Date(stats.ultimoPedido).toLocaleDateString('pt-BR') + '</strong></span>' : ''}
                </div>
            </div>` : ''}
            <button type="submit" class="btn-primary" style="width:100%;">
                <i class="fas fa-save"></i> Salvar Cliente
            </button>
        </form>`;

    document.getElementById('clienteForm').addEventListener('submit', e => {
        e.preventDefault();
        saveCliente(cliente ? cliente.id : null);
    });

    openModal();
}

function saveCliente(id) {
    const nomeEl = document.getElementById('clienteNome');
    const telEl = document.getElementById('clienteTelefone');
    const endEl = document.getElementById('clienteEndereco');
    if (!nomeEl.value.trim() || !telEl.value.trim()) {
        showToast('Preencha nome e telefone!', 'error');
        return;
    }
    // valida endereço: aceita "rua" mas avisa se muito curto
    const enderecoRaw = endEl.value.trim();
    if (enderecoRaw && enderecoRaw.length < 3) {
        showToast('Endereço muito curto. Use ao menos 3 caracteres.', 'error');
        endEl.focus();
        return;
    }
    const existente = id ? AppState.clientes.find(c => String(c.id) === String(id)) : null;
    const pontosCalculados = existente ? _calcPontos(_calcClienteStats(existente.id).totalGasto) : 0;
    const pontosInput = parseInt(document.getElementById('clientePontos').value);
    const pontosFinal = isNaN(pontosInput) ? pontosCalculados : pontosInput;
    const cliente = {
        ...(existente || {}),
        id: id || Date.now(),
        nome: nomeEl.value.trim(),
        telefone: telEl.value.trim(),
        email: document.getElementById('clienteEmail').value.trim(),
        endereco: enderecoRaw,
        // mantém histórico de endereços para frete
        addressBook: enderecoRaw ? [...new Set([...(existente?.addressBook || []), enderecoRaw])] : (existente?.addressBook || []),
        instagram: document.getElementById('clienteInstagram').value.trim(),
        aniversario: document.getElementById('clienteAniversario').value,
        segmento: document.getElementById('clienteSegmento').value,
        pontos: pontosFinal,
        observacoes: document.getElementById('clienteObservacoes').value.trim(),
        dataCadastro: existente ? existente.dataCadastro : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    if (id) {
        const index = AppState.clientes.findIndex(c => String(c.id) === String(id));
        if (index !== -1) AppState.clientes[index] = cliente;
        else AppState.clientes.push(cliente);
        showToast('Cliente atualizado! ✓ Endereço salvo', 'success');
    } else {
        AppState.clientes.push(cliente);
        showToast('Cliente cadastrado! ✓', 'success');
    }

    saveData();
    // força recálculo de frete se cliente em checkout
    try { if (typeof atualizarResumoCheckout === 'function') atualizarResumoCheckout(); } catch(e){}
    renderClientes();
    if (typeof renderDashboard === 'function') renderDashboard();
    closeModal();
    // garante que o endereço aparece imediatamente no card
    setTimeout(() => renderClientes(), 100);
}

function editCliente(id) {
    const cliente = AppState.clientes.find(c => c.id === id);
    openModalCliente(cliente);
}

function deleteCliente(id) {
    const c = AppState.clientes.find(c => c.id === id);
    showConfirm('Excluir o cliente "' + (c ? c.nome : '') + '"? Esta ação não pode ser desfeita.', () => {
        AppState.clientes = AppState.clientes.filter(c => c.id !== id);
        saveData();
        renderClientes();
        renderDashboard();
        showToast('Cliente excluído!', 'success');
    });
}

function searchClientes(query) {
    window._clientFilter.search = query;
    renderClientes();
}

// ==================== HISTÓRICO DO CLIENTE ====================

window.viewClienteHistorico = function(clienteId) {
    const cliente = AppState.clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const pedidos = (AppState.pedidos || [])
        .filter(p => p.clienteId === clienteId)
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    const stats = _calcClienteStats(clienteId);
    const ranking = _getRankingInfo(stats.totalGasto, stats.totalPedidos);
    const ticketMedio = stats.totalPedidos > 0 ? (stats.totalGasto / stats.totalPedidos) : 0;

    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    title.textContent = 'Histórico — ' + cliente.nome;

    body.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:var(--background);border-radius:12px;">
            <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,var(--primary),var(--primary-light));
                        display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:white;flex-shrink:0;">
                ${cliente.nome.charAt(0)}
            </div>
            <div style="flex:1;">
                <h3 style="font-size:18px;margin-bottom:4px;">${cliente.nome}</h3>
                <span class="client-segment ${cliente.segmento}">${cliente.segmento.toUpperCase()}</span>
                <span style="margin-left:8px;font-size:13px;color:var(--text-secondary);">${ranking.label}</span>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <p style="font-size:24px;font-weight:700;color:var(--primary);font-family:'Bebas Neue',sans-serif;line-height:1;">
                    ${_calcPontos(stats.totalGasto)}
                </p>
                <p style="font-size:11px;color:var(--text-secondary);">pontos</p>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
            <div style="background:var(--background);border-radius:12px;padding:14px;text-align:center;">
                <p style="font-size:24px;font-weight:700;color:var(--primary);font-family:'Bebas Neue',sans-serif;">${stats.totalPedidos}</p>
                <p style="font-size:11px;color:var(--text-secondary);">Pedidos</p>
            </div>
            <div style="background:var(--background);border-radius:12px;padding:14px;text-align:center;">
                <p style="font-size:24px;font-weight:700;color:var(--accent);font-family:'Bebas Neue',sans-serif;">R$ ${stats.totalGasto.toFixed(0)}</p>
                <p style="font-size:11px;color:var(--text-secondary);">Total Gasto</p>
            </div>
            <div style="background:var(--background);border-radius:12px;padding:14px;text-align:center;">
                <p style="font-size:24px;font-weight:700;color:var(--success);font-family:'Bebas Neue',sans-serif;">R$ ${ticketMedio.toFixed(0)}</p>
                <p style="font-size:11px;color:var(--text-secondary);">Ticket Médio</p>
            </div>
        </div>

        <h4 style="font-size:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
            Pedidos Realizados
        </h4>
        <div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
            ${pedidos.length === 0
                ? '<p style="color:var(--text-secondary);text-align:center;padding:24px;font-size:13px;">Nenhum pedido registrado.</p>'
                : pedidos.map(p => `
                    <div style="background:var(--background);border:1px solid var(--border);border-radius:10px;padding:12px 16px;
                                display:flex;justify-content:space-between;align-items:center;gap:12px;">
                        <div style="flex:1;min-width:0;">
                            <p style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                #${p.id} — ${p.itens.map(i => i.nome).join(', ')}
                            </p>
                            <p style="font-size:11px;color:var(--text-secondary);">
                                ${new Date(p.data).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                            </p>
                        </div>
                        <div style="text-align:right;flex-shrink:0;">
                            <p style="font-weight:700;color:var(--primary);font-size:14px;">R$ ${p.total.toFixed(2).replace('.', ',')}</p>
                            <span class="order-status ${p.status}">${p.status}</span>
                        </div>
                    </div>`).join('')
            }
        </div>`;

    openModal();
};
