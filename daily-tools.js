/**
 * Açaí Prime - Módulo de Ferramentas de Gestão Diária + Relatórios
 * daily-tools.js
 *
 * Expõe: window.dailyTools (singleton DailyTools)
 *        window.renderDailyToolsModule()
 *        window.generateReport(period)
 */

// ==================== CLASSE DAILYTOOLS ====================
class DailyTools {
    constructor() {
        this.tasksKey = 'acai_tasks';
    }

    _cashKey(date) {
        return `acai_daily_cash_${date}`;
    }

    _todayStr() {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // ==================== CAIXA DO DIA ====================

    getTodayCash() {
        const key = this._cashKey(this._todayStr());
        try {
            const data = localStorage.getItem(key);
            if (data) return JSON.parse(data);
        } catch (e) {}
        return { date: this._todayStr(), entries: [], closed: false, closedAt: null };
    }

    saveCash(cash) {
        localStorage.setItem(this._cashKey(cash.date), JSON.stringify(cash));
    }

    /**
     * Adiciona lançamento ao caixa do dia
     * @param {'entrada'|'saida'} type
     * @param {string} description
     * @param {number} value
     * @returns {object} entry criada
     */
    addCashEntry(type, description, value) {
        if (!value || isNaN(value) || value <= 0) {
            throw new Error('Valor inválido. Informe um valor maior que zero.');
        }
        const cash = this.getTodayCash();
        if (cash.closed) {
            throw new Error('O caixa do dia já foi fechado.');
        }
        const entry = {
            id: 'cash_' + Date.now(),
            type,
            description: description || '',
            value: parseFloat(value),
            createdAt: new Date().toISOString()
        };
        cash.entries.push(entry);
        this.saveCash(cash);

        // Notificar saldo negativo
        const balance = this.calculateBalance(cash);
        if (balance < 0 && window.notificationManager) {
            window.notificationManager.add('negative_balance', `⚠️ Saldo do caixa ficou negativo: R$ ${balance.toFixed(2).replace('.', ',')}`);
            if (window.updateNotificationBadge) window.updateNotificationBadge();
        }

        return entry;
    }

    closeCash() {
        const cash = this.getTodayCash();
        cash.closed = true;
        cash.closedAt = new Date().toISOString();
        this.saveCash(cash);
        return cash;
    }

    calculateBalance(cash) {
        return (cash.entries || []).reduce((acc, entry) => {
            return entry.type === 'entrada' ? acc + entry.value : acc - entry.value;
        }, 0);
    }

    // ==================== TAREFAS ====================

    getTasks() {
        try {
            const data = localStorage.getItem(this.tasksKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveTasks(tasks) {
        localStorage.setItem(this.tasksKey, JSON.stringify(tasks));
    }

    addTask(title, priority = 'media') {
        const tasks = this.getTasks();
        const task = {
            id: 'task_' + Date.now(),
            title,
            priority,
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString()
        };
        tasks.push(task);
        this.saveTasks(tasks);
        return task;
    }

    completeTask(id) {
        const tasks = this.getTasks();
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
            tasks[idx].completed = true;
            tasks[idx].completedAt = new Date().toISOString();
            this.saveTasks(tasks);
            return tasks[idx];
        }
        return null;
    }

    uncompleteTask(id) {
        const tasks = this.getTasks();
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
            tasks[idx].completed = false;
            tasks[idx].completedAt = null;
            this.saveTasks(tasks);
        }
    }

    deleteTask(id) {
        const tasks = this.getTasks().filter(t => t.id !== id);
        this.saveTasks(tasks);
    }

    // ==================== RESUMO DO DIA ====================

    getDaySummary(appState) {
        const hoje = new Date().toDateString();
        const pedidosHoje = (appState.pedidos || []).filter(p => new Date(p.data).toDateString() === hoje);

        if (pedidosHoje.length === 0) {
            return { orderCount: 0, totalRevenue: 0, averageTicket: 0, topProduct: null };
        }

        const totalRevenue = pedidosHoje.reduce((s, p) => s + (p.total || 0), 0);
        const averageTicket = totalRevenue / pedidosHoje.length;

        // Produto mais pedido do dia
        const productCounts = {};
        pedidosHoje.forEach(pedido => {
            (pedido.itens || []).forEach(item => {
                productCounts[item.produtoId] = (productCounts[item.produtoId] || 0) + (item.quantidade || 1);
            });
        });

        let topProductId = null;
        let topCount = 0;
        Object.entries(productCounts).forEach(([id, count]) => {
            if (count > topCount) { topCount = count; topProductId = parseInt(id); }
        });

        const topProduct = topProductId
            ? (appState.produtos || []).find(p => p.id === topProductId)?.nome || null
            : null;

        return { orderCount: pedidosHoje.length, totalRevenue, averageTicket, topProduct };
    }

    // ==================== RELATÓRIOS ====================

    generateReport(period, appState) {
        const now = new Date();
        let pedidos = [];

        if (period === 'today') {
            const today = now.toDateString();
            pedidos = (appState.pedidos || []).filter(p => new Date(p.data).toDateString() === today);
        } else if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            pedidos = (appState.pedidos || []).filter(p => new Date(p.data) >= weekAgo);
        }

        if (pedidos.length === 0) return null;

        const totalRevenue = pedidos.reduce((s, p) => s + (p.total || 0), 0);
        const averageTicket = totalRevenue / pedidos.length;

        // Produto mais vendido
        const productCounts = {};
        pedidos.forEach(pedido => {
            (pedido.itens || []).forEach(item => {
                productCounts[item.produtoId] = (productCounts[item.produtoId] || 0) + (item.quantidade || 1);
            });
        });
        let topProductId = null, topCount = 0;
        Object.entries(productCounts).forEach(([id, count]) => {
            if (count > topCount) { topCount = count; topProductId = parseInt(id); }
        });
        const topProduct = topProductId
            ? (appState.produtos || []).find(p => p.id === topProductId)?.nome || 'N/A'
            : 'N/A';

        // Dia de maior movimento (para semana)
        let busiestDay = null;
        if (period === 'week') {
            const dayMap = {};
            pedidos.forEach(p => {
                const d = new Date(p.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
                dayMap[d] = (dayMap[d] || 0) + 1;
            });
            busiestDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        }

        return { period, pedidosCount: pedidos.length, totalRevenue, averageTicket, topProduct, busiestDay };
    }

    formatReport(report, companyName = 'Açaí Prime') {
        if (!report) return 'Sem dados para o período selecionado.';
        const periodLabel = report.period === 'today' ? 'Hoje' : 'Esta Semana';
        const lines = [
            `📊 RELATÓRIO — ${periodLabel.toUpperCase()}`,
            `🏪 ${companyName}`,
            `📅 Gerado em: ${new Date().toLocaleString('pt-BR')}`,
            ``,
            `📦 Total de pedidos: ${report.pedidosCount}`,
            `💰 Faturamento: R$ ${report.totalRevenue.toFixed(2).replace('.', ',')}`,
            `🎯 Ticket médio: R$ ${report.averageTicket.toFixed(2).replace('.', ',')}`,
            `🏆 Produto mais vendido: ${report.topProduct}`,
        ];
        if (report.busiestDay) {
            lines.push(`📈 Dia de maior movimento: ${report.busiestDay}`);
        }
        return lines.join('\n');
    }
}

// Singleton global
window.dailyTools = new DailyTools();

// ==================== UI DO MÓDULO ====================

window.renderDailyToolsModule = function() {
    const container = document.getElementById('module-gestao-dia');
    if (!container) return;

    const cash = window.dailyTools.getTodayCash();
    const balance = window.dailyTools.calculateBalance(cash);
    const tasks = window.dailyTools.getTasks();
    const summary = window.dailyTools.getDaySummary(window.AppState || {});

    container.innerHTML = `
        <div class="daily-tabs">
            <button class="daily-tab active" onclick="_switchDailyTab('resumo', this)">
                <i class="fas fa-chart-pie"></i> Resumo do Dia
            </button>
            <button class="daily-tab" onclick="_switchDailyTab('caixa', this)">
                <i class="fas fa-cash-register"></i> Caixa do Dia
            </button>
            <button class="daily-tab" onclick="_switchDailyTab('tarefas', this)">
                <i class="fas fa-tasks"></i> Tarefas
                ${tasks.filter(t => !t.completed).length > 0 ? `<span class="tab-badge">${tasks.filter(t => !t.completed).length}</span>` : ''}
            </button>
        </div>

        <!-- Resumo -->
        <div id="daily-tab-resumo" class="daily-tab-content active">
            <div class="daily-summary-grid">
                <div class="summary-card">
                    <i class="fas fa-shopping-bag"></i>
                    <div>
                        <h4>Pedidos Hoje</h4>
                        <p class="summary-value">${summary.orderCount}</p>
                    </div>
                </div>
                <div class="summary-card">
                    <i class="fas fa-dollar-sign"></i>
                    <div>
                        <h4>Faturamento</h4>
                        <p class="summary-value">R$ ${summary.totalRevenue.toFixed(2).replace('.', ',')}</p>
                    </div>
                </div>
                <div class="summary-card">
                    <i class="fas fa-receipt"></i>
                    <div>
                        <h4>Ticket Médio</h4>
                        <p class="summary-value">R$ ${summary.averageTicket.toFixed(2).replace('.', ',')}</p>
                    </div>
                </div>
                <div class="summary-card">
                    <i class="fas fa-trophy"></i>
                    <div>
                        <h4>Mais Pedido</h4>
                        <p class="summary-value" style="font-size:16px;">${summary.topProduct || '—'}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Caixa -->
        <div id="daily-tab-caixa" class="daily-tab-content" style="display:none;">
            <div class="cash-balance ${balance < 0 ? 'negative' : ''}">
                <span>Saldo do Dia</span>
                <strong>R$ ${balance.toFixed(2).replace('.', ',')}</strong>
                ${cash.closed ? '<span class="cash-closed-badge">FECHADO</span>' : ''}
            </div>
            ${!cash.closed ? `
            <div class="cash-form">
                <select id="cashType" style="padding:10px;background:var(--background);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;">
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                </select>
                <input type="text" id="cashDesc" placeholder="Descrição" style="flex:1;padding:10px;background:var(--background);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;">
                <input type="number" id="cashValue" placeholder="Valor (R$)" step="0.01" min="0.01" style="width:120px;padding:10px;background:var(--background);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;">
                <button onclick="_addCashEntry()" class="btn-primary" style="padding:10px 20px;">
                    <i class="fas fa-plus"></i> Lançar
                </button>
            </div>
            ` : ''}
            <div class="cash-history">
                ${cash.entries.length === 0
                    ? '<p style="color:var(--text-secondary);text-align:center;padding:24px;">Nenhum lançamento hoje.</p>'
                    : cash.entries.slice().reverse().map(e => `
                        <div class="cash-entry ${e.type}">
                            <div>
                                <span class="cash-entry-type">${e.type === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span>
                                <span class="cash-entry-desc">${e.description || '—'}</span>
                            </div>
                            <div>
                                <strong class="cash-entry-value ${e.type}">
                                    ${e.type === 'entrada' ? '+' : '-'} R$ ${e.value.toFixed(2).replace('.', ',')}
                                </strong>
                                <small style="color:var(--text-secondary);display:block;text-align:right;">
                                    ${new Date(e.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </small>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            ${!cash.closed ? `
            <button onclick="_closeCash()" class="btn-secondary" style="width:100%;margin-top:16px;">
                <i class="fas fa-lock"></i> Fechar Caixa do Dia
            </button>
            ` : `<p style="color:var(--text-secondary);text-align:center;margin-top:16px;font-size:13px;">Caixa fechado em ${new Date(cash.closedAt).toLocaleString('pt-BR')}</p>`}
        </div>

        <!-- Tarefas -->
        <div id="daily-tab-tarefas" class="daily-tab-content" style="display:none;">
            <div class="task-form">
                <input type="text" id="taskTitle" placeholder="Nova tarefa..." style="flex:1;padding:10px;background:var(--background);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;">
                <select id="taskPriority" style="padding:10px;background:var(--background);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;">
                    <option value="alta">🔴 Alta</option>
                    <option value="media" selected>🟡 Média</option>
                    <option value="baixa">🟢 Baixa</option>
                </select>
                <button onclick="_addTask()" class="btn-primary" style="padding:10px 20px;">
                    <i class="fas fa-plus"></i> Adicionar
                </button>
            </div>
            <div class="task-list">
                <h4 style="color:var(--text-secondary);font-size:13px;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;">
                    Pendentes (${tasks.filter(t => !t.completed).length})
                </h4>
                ${tasks.filter(t => !t.completed).length === 0
                    ? '<p style="color:var(--text-secondary);font-size:13px;padding:8px 0;">Nenhuma tarefa pendente 🎉</p>'
                    : tasks.filter(t => !t.completed)
                        .sort((a, b) => { const o = { alta: 0, media: 1, baixa: 2 }; return o[a.priority] - o[b.priority]; })
                        .map(t => `
                            <div class="task-item priority-${t.priority}">
                                <label class="task-check">
                                    <input type="checkbox" onchange="_toggleTask('${t.id}', this.checked)">
                                    <span>${t.title}</span>
                                </label>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span class="task-priority-badge ${t.priority}">${t.priority}</span>
                                    <button onclick="_deleteTask('${t.id}')" style="background:none;border:none;color:var(--error);cursor:pointer;font-size:14px;"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        `).join('')
                }
                ${tasks.filter(t => t.completed).length > 0 ? `
                <h4 style="color:var(--text-secondary);font-size:13px;margin:20px 0 12px;text-transform:uppercase;letter-spacing:1px;">
                    Concluídas (${tasks.filter(t => t.completed).length})
                </h4>
                ${tasks.filter(t => t.completed).map(t => `
                    <div class="task-item completed">
                        <label class="task-check">
                            <input type="checkbox" checked onchange="_toggleTask('${t.id}', this.checked)">
                            <span style="text-decoration:line-through;opacity:0.6;">${t.title}</span>
                        </label>
                        <small style="color:var(--text-secondary);">
                            ${t.completedAt ? new Date(t.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </small>
                    </div>
                `).join('')}
                ` : ''}
            </div>
        </div>
    `;
};

// ==================== RELATÓRIOS UI ====================

window.renderReportsModule = function() {
    const container = document.getElementById('module-relatorios');
    if (!container) return;

    container.innerHTML = `
        <div class="reports-card">
            <h3><i class="fas fa-chart-bar"></i> Gerar Relatório</h3>
            <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:24px;">
                <select id="reportPeriod" style="padding:12px 16px;background:var(--background);border:1px solid var(--border);border-radius:12px;color:var(--text-primary);font-size:14px;">
                    <option value="today">Hoje</option>
                    <option value="week">Esta Semana</option>
                </select>
                <button onclick="_generateAndShowReport()" class="btn-primary">
                    <i class="fas fa-file-alt"></i> Gerar Relatório
                </button>
            </div>
            <div id="reportOutput" style="display:none;">
                <pre id="reportText" style="background:var(--background);border:1px solid var(--border);border-radius:12px;padding:20px;font-family:'Poppins',sans-serif;font-size:14px;line-height:1.8;white-space:pre-wrap;color:var(--text-primary);"></pre>
                <button onclick="_copyReport()" class="btn-secondary" style="margin-top:12px;">
                    <i class="fas fa-copy"></i> Copiar Relatório
                </button>
            </div>
        </div>
    `;
};

// ==================== HANDLERS INTERNOS ====================

window._switchDailyTab = function(tab, btn) {
    document.querySelectorAll('.daily-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.daily-tab-content').forEach(c => c.style.display = 'none');
    btn.classList.add('active');
    const content = document.getElementById(`daily-tab-${tab}`);
    if (content) content.style.display = 'block';
};

window._addCashEntry = function() {
    const type = document.getElementById('cashType')?.value;
    const desc = document.getElementById('cashDesc')?.value;
    const value = parseFloat(document.getElementById('cashValue')?.value);
    try {
        window.dailyTools.addCashEntry(type, desc, value);
        window.renderDailyToolsModule();
        if (typeof showToast === 'function') showToast('Lançamento registrado!', 'success');
    } catch (err) {
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
};

window._closeCash = function() {
    const cash = window.dailyTools.getTodayCash();
    const balance = window.dailyTools.calculateBalance(cash);
    const totalEntradas = cash.entries.filter(e => e.type === 'entrada').reduce((s, e) => s + e.value, 0);
    const totalSaidas = cash.entries.filter(e => e.type === 'saida').reduce((s, e) => s + e.value, 0);

    const msg = `Fechar o caixa do dia?\n\nEntradas: R$ ${totalEntradas.toFixed(2).replace('.', ',')}\nSaídas: R$ ${totalSaidas.toFixed(2).replace('.', ',')}\nSaldo final: R$ ${balance.toFixed(2).replace('.', ',')}`;

    if (typeof showConfirm === 'function') {
        showConfirm(msg, () => {
            window.dailyTools.closeCash();
            window.renderDailyToolsModule();
            if (typeof showToast === 'function') showToast('Caixa fechado!', 'success');
        });
    } else {
        if (confirm(msg)) {
            window.dailyTools.closeCash();
            window.renderDailyToolsModule();
            if (typeof showToast === 'function') showToast('Caixa fechado!', 'success');
        }
    }
};

window._addTask = function() {
    const title = document.getElementById('taskTitle')?.value?.trim();
    const priority = document.getElementById('taskPriority')?.value || 'media';
    if (!title) {
        if (typeof showToast === 'function') showToast('Digite o título da tarefa!', 'error');
        return;
    }
    window.dailyTools.addTask(title, priority);
    window.renderDailyToolsModule();
    // Manter aba de tarefas ativa
    setTimeout(() => {
        const tabBtn = document.querySelector('.daily-tab:nth-child(3)');
        if (tabBtn) window._switchDailyTab('tarefas', tabBtn);
    }, 10);
};

window._toggleTask = function(id, checked) {
    if (checked) {
        window.dailyTools.completeTask(id);
    } else {
        window.dailyTools.uncompleteTask(id);
    }
    window.renderDailyToolsModule();
    setTimeout(() => {
        const tabBtn = document.querySelector('.daily-tab:nth-child(3)');
        if (tabBtn) window._switchDailyTab('tarefas', tabBtn);
    }, 10);
};

window._deleteTask = function(id) {
    window.dailyTools.deleteTask(id);
    window.renderDailyToolsModule();
    setTimeout(() => {
        const tabBtn = document.querySelector('.daily-tab:nth-child(3)');
        if (tabBtn) window._switchDailyTab('tarefas', tabBtn);
    }, 10);
};

window._generateAndShowReport = function() {
    const period = document.getElementById('reportPeriod')?.value || 'today';
    const report = window.dailyTools.generateReport(period, window.AppState || {});
    const output = document.getElementById('reportOutput');
    const textEl = document.getElementById('reportText');
    if (!output || !textEl) return;

    if (!report) {
        textEl.textContent = 'Sem dados para o período selecionado.';
    } else {
        const companyName = window.AppState?.settings?.companyName || 'Açaí Prime';
        textEl.textContent = window.dailyTools.formatReport(report, companyName);
    }
    output.style.display = 'block';
};

window._copyReport = function() {
    const text = document.getElementById('reportText')?.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        if (typeof showToast === 'function') showToast('Relatório copiado!', 'success');
    }).catch(() => {
        if (typeof showToast === 'function') showToast('Erro ao copiar. Selecione e copie manualmente.', 'error');
    });
};
