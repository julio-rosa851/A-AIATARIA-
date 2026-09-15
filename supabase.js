/**
 * Açaí Prime / PULSE FOOD - Módulo de Conexão Supabase
 * supabase.js - Gerencia a integração com banco de dados PostgreSQL / Supabase
 */

class SupabaseService {
    constructor() {
        this.configKey = 'acai_supabase_config';
        this.client = null;
    }

    getConfig() {
        try {
            const data = localStorage.getItem(this.configKey);
            return data ? JSON.parse(data) : { url: '', key: '', enabled: false };
        } catch (e) {
            return { url: '', key: '', enabled: false };
        }
    }

    saveConfig(config) {
        localStorage.setItem(this.configKey, JSON.stringify(config));
        this.client = null; // forçar reinicialização
    }

    isConfigured() {
        const config = this.getConfig();
        return !!(config.enabled && config.url && config.key && config.url.trim().length > 0 && config.key.trim().length > 0);
    }

    getClient() {
        if (this.client) return this.client;
        const config = this.getConfig();
        if (!this.isConfigured()) return null;

        if (window.supabase) {
            this.client = window.supabase.createClient(config.url, config.key);
            return this.client;
        } else {
            console.warn('[Supabase] SDK do Supabase não carregado via CDN');
            return null;
        }
    }

    // ==================== TESTE DE CONEXÃO ====================
    async testConnection() {
        const client = this.getClient();
        if (!client) throw new Error('Supabase não configurado ou SDK não carregado.');

        const { data, error } = await client.from('configuracoes').select('*').limit(1);
        if (error) throw error;
        return true;
    }

    // ==================== PRODUTOS ====================
    async getProdutos() {
        const client = this.getClient();
        if (!client) return null;
        const { data, error } = await client.from('produtos').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('[Supabase] Erro ao buscar produtos:', error);
            return null;
        }
        return data;
    }

    async saveProduto(produto) {
        const client = this.getClient();
        if (!client) return null;
        const { data, error } = await client.from('produtos').upsert([produto]).select();
        if (error) {
            console.error('[Supabase] Erro ao salvar produto:', error);
            throw error;
        }
        return data?.[0];
    }

    async deleteProduto(id) {
        const client = this.getClient();
        if (!client) return false;
        const { error } = await client.from('produtos').delete().eq('id', id);
        if (error) {
            console.error('[Supabase] Erro ao deletar produto:', error);
            throw error;
        }
        return true;
    }

    // ==================== CLIENTES ====================
    async getClientes() {
        const client = this.getClient();
        if (!client) return null;
        const { data, error } = await client.from('clientes').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('[Supabase] Erro ao buscar clientes:', error);
            return null;
        }
        return data;
    }

    async saveCliente(cliente) {
        const client = this.getClient();
        if (!client) return null;
        const { data, error } = await client.from('clientes').upsert([cliente]).select();
        if (error) {
            console.error('[Supabase] Erro ao salvar cliente:', error);
            throw error;
        }
        return data?.[0];
    }

    deleteCliente(id) {
        const client = this.getClient();
        if (!client) return false;
        return client.from('clientes').delete().eq('id', id).then(({ error }) => {
            if (error) {
                console.error('[Supabase] Erro ao deletar cliente:', error);
                throw error;
            }
            return true;
        });
    }

    // ==================== PEDIDOS ====================
    async getPedidos() {
        const client = this.getClient();
        if (!client) return null;
        const { data, error } = await client.from('pedidos').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('[Supabase] Erro ao buscar pedidos:', error);
            return null;
        }
        return data;
    }

    async savePedido(pedido) {
        const client = this.getClient();
        if (!client) return null;
        const { data, error } = await client.from('pedidos').upsert([pedido]).select();
        if (error) {
            console.error('[Supabase] Erro ao salvar pedido:', error);
            throw error;
        }
        return data?.[0];
    }

    async deletePedido(id) {
        const client = this.getClient();
        if (!client) return false;
        const { error } = await client.from('pedidos').delete().eq('id', id);
        if (error) {
            console.error('[Supabase] Erro ao deletar pedido:', error);
            throw error;
        }
        return true;
    }

    // ==================== BUSCA UNIFICADA & AUTO-SYNC ====================
    async getAllData() {
        const client = this.getClient();
        if (!client) return null;
        try {
            const [produtos, clientes, pedidos] = await Promise.all([
                this.getProdutos(),
                this.getClientes(),
                this.getPedidos()
            ]);
            return { produtos, clientes, pedidos };
        } catch (e) {
            console.error('[Supabase] Erro ao carregar dados unificados:', e);
            return null;
        }
    }

    // ==================== REALTIME / WEBSOCKETS ====================
    setupRealtime(onEvent) {
        const client = this.getClient();
        if (!client) return null;
        if (this.realtimeChannel) {
            this.unsubscribeRealtime();
        }

        try {
            const channel = client.channel('pulse-realtime-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, payload => {
                    console.log('[Supabase Realtime] Mudança em pedidos:', payload);
                    if (onEvent) onEvent('pedidos', payload);
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, payload => {
                    console.log('[Supabase Realtime] Mudança em produtos:', payload);
                    if (onEvent) onEvent('produtos', payload);
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, payload => {
                    console.log('[Supabase Realtime] Mudança em clientes:', payload);
                    if (onEvent) onEvent('clientes', payload);
                })
                .subscribe((status) => {
                    console.log('[Supabase Realtime] Status da assinatura:', status);
                });

            this.realtimeChannel = channel;
            return channel;
        } catch (e) {
            console.error('[Supabase Realtime] Erro ao iniciar realtime:', e);
            return null;
        }
    }

    unsubscribeRealtime() {
        if (this.realtimeChannel && this.client) {
            this.client.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
        }
    }
}

// Instância global do SupabaseService
window.supabaseService = new SupabaseService();
