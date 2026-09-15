/**
 * Açaí Prime - Módulo de Notificações Operacionais
 * notifications.js
 *
 * Expõe: window.notificationManager (singleton NotificationManager)
 *        window.updateNotificationBadge()
 *        window.toggleNotifications()
 */

class NotificationManager {
    constructor() {
        this.storageKey = 'acai_notifications';
        this.maxAgeDays = 7;
    }

    // ==================== CRUD ====================

    getAll() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    getUnread() {
        return this.getAll().filter(n => !n.read);
    }

    /**
     * Adiciona nova notificação
     * @param {'new_order'|'negative_balance'|'info'} type
     * @param {string} message
     * @returns {object} notificação criada
     */
    add(type, message) {
        const notifications = this.getAll();
        const notification = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            type,
            message,
            read: false,
            createdAt: new Date().toISOString()
        };
        notifications.unshift(notification); // mais recente primeiro
        this._save(notifications);
        return notification;
    }

    markAsRead(id) {
        const notifications = this.getAll();
        const idx = notifications.findIndex(n => n.id === id);
        if (idx !== -1) {
            notifications[idx].read = true;
            this._save(notifications);
        }
    }

    markAllAsRead() {
        const notifications = this.getAll().map(n => ({ ...n, read: true }));
        this._save(notifications);
    }

    /**
     * Remove notificações com mais de maxAgeDays dias
     */
    purgeOld() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.maxAgeDays);
        const filtered = this.getAll().filter(n => new Date(n.createdAt) >= cutoff);
        this._save(filtered);
    }

    _save(notifications) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(notifications));
        } catch (e) {
            console.warn('[NotificationManager] Erro ao salvar notificações:', e);
        }
    }

    _typeIcon(type) {
        const icons = {
            new_order: '🛍️',
            negative_balance: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    _formatDate(isoDate) {
        return new Date(isoDate).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }
}

// Singleton global
window.notificationManager = new NotificationManager();

// Limpar notificações antigas ao inicializar
window.notificationManager.purgeOld();

// ==================== UI ====================

/**
 * Atualiza o badge do sino no header
 */
window.updateNotificationBadge = function() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    const count = window.notificationManager.getUnread().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
};

/**
 * Abre/fecha o painel de notificações
 */
window.toggleNotifications = function() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    const isOpen = panel.classList.contains('active');
    if (isOpen) {
        panel.classList.remove('active');
    } else {
        _renderNotificationPanel();
        panel.classList.add('active');
    }
};

function _renderNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;

    const notifications = window.notificationManager.getAll().slice(0, 20);
    const unreadCount = window.notificationManager.getUnread().length;

    panel.innerHTML = `
        <div class="notif-panel-header">
            <h4><i class="fas fa-bell"></i> Notificações ${unreadCount > 0 ? `<span class="notif-unread-count">${unreadCount}</span>` : ''}</h4>
            <div style="display:flex;gap:8px;">
                ${unreadCount > 0 ? `<button onclick="_markAllNotifRead()" class="notif-action-btn">Marcar todas como lidas</button>` : ''}
                <button onclick="toggleNotifications()" class="notif-close-btn"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="notif-list">
            ${notifications.length === 0
                ? '<div class="notif-empty"><i class="fas fa-bell-slash"></i><p>Nenhuma notificação</p></div>'
                : notifications.map(n => `
                    <div class="notif-item ${n.read ? 'read' : 'unread'}" onclick="_markNotifRead('${n.id}')">
                        <span class="notif-icon">${window.notificationManager._typeIcon(n.type)}</span>
                        <div class="notif-content">
                            <p class="notif-message">${n.message}</p>
                            <span class="notif-time">${window.notificationManager._formatDate(n.createdAt)}</span>
                        </div>
                        ${!n.read ? '<span class="notif-dot"></span>' : ''}
                    </div>
                `).join('')
            }
        </div>
    `;
}

window._markNotifRead = function(id) {
    window.notificationManager.markAsRead(id);
    window.updateNotificationBadge();
    _renderNotificationPanel();
};

window._markAllNotifRead = function() {
    window.notificationManager.markAllAsRead();
    window.updateNotificationBadge();
    _renderNotificationPanel();
};

// Fechar painel ao clicar fora
document.addEventListener('click', (e) => {
    const panel = document.getElementById('notificationPanel');
    const bell = document.getElementById('notificationBell');
    if (panel && panel.classList.contains('active')) {
        if (!panel.contains(e.target) && (!bell || !bell.contains(e.target))) {
            panel.classList.remove('active');
        }
    }
});

// Inicializar badge quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.updateNotificationBadge();
});
