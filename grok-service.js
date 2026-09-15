/**
 * Açaí Prime - Serviço de Integração com IA (OpenAI)
 * grok-service.js
 *
 * Endpoint: https://api.openai.com/v1 (OpenAI)
 * Modelo: gpt-4o-mini
 *
 * Expõe: window.grokService (singleton GrokService)
 */

class GrokService {
    constructor() {
        this.configKey = 'acai_grok_config';
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.timeout = 15000;
    }

    // ==================== CONFIGURAÇÃO ====================

    getConfig() {
        try {
            const data = localStorage.getItem(this.configKey);
            return data ? JSON.parse(data) : { apiKey: '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', enabled: true, insecure: true, model: 'gpt-4o-mini' };
        } catch (e) {
            return { apiKey: '', enabled: false, model: 'gpt-4o-mini' };
        }
    }

    saveConfig(config) {
        localStorage.setItem(this.configKey, JSON.stringify(config));
    }

    isEnabled() {
        const config = this.getConfig();
        return !!(config.enabled && config.apiKey && config.apiKey.trim().length > 0);
    }

    // ==================== PROMPT DE SISTEMA ====================

    buildSystemPrompt(appState) {
        const settings = appState.settings || {};
        const companyName = settings.companyName || 'Açaí Prime';

        const produtos = (appState.produtos || [])
            .filter(p => p.disponivel)
            .map(p => `- ${p.nome}: R$ ${p.preco.toFixed(2)}${p.descricao ? ' — ' + p.descricao : ''}`)
            .join('\n');

        const telefone = settings.companyPhone || '(24) 99255-2754';
        const endereco = settings.companyAddress || 'Consulte nosso WhatsApp';

        return `Você é o atendente virtual da açaíteria ${companyName}. Seu nome é Açaí Bot 💜.

PERSONALIDADE:
- Seja simpático, animado e use emojis com moderação 🍧💜
- Responda sempre em português brasileiro
- Seja objetivo e direto — respostas curtas e claras
- Se o cliente perguntar algo fora do seu escopo, diga que vai verificar com a equipe
- Nunca invente preços, produtos ou informações que não estejam abaixo

CARDÁPIO AÇAÍ ATUAL:
${produtos || 'Cardápio em atualização. Entre em contato pelo WhatsApp.'}

INFORMAÇÕES DO ESTABELECIMENTO:
- Nome: ${companyName}
- Telefone/WhatsApp: ${telefone}
- Endereço: ${endereco}
- Horário: Todos os dias das 14h às 23h
- Formas de pagamento: Dinheiro, cartão de crédito/débito e PIX
- Entrega: Taxa de R$ 5,00 (grátis para pedidos acima de R$ 50,00) — barcas e tigelas entregues com gelo seco
- Tempo médio de entrega: 20 a 35 minutos

COMO AJUDAR:
- Para fazer pedidos: informe o tamanho do açaí (300/500/700ml ou barca), complementos e seu endereço
- Para dúvidas sobre o cardápio: apresente os tamanhos, tigelas e barcas com preços e complementos
- Para reclamações: peça desculpas e diga que vai repassar para a equipe
- Para promoções: mencione o combo mais em conta disponível no cardápio`;
    }

    // ==================== ENVIO DE MENSAGEM ====================

    async sendMessage(userMessage, appState) {
        const config = this.getConfig();
        if (!config.apiKey) throw new Error('Chave de API OpenAI não configurada.');

        const systemPrompt = this.buildSystemPrompt(appState);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`Erro da API OpenAI: ${response.status} — ${errData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) throw new Error('Resposta vazia da API OpenAI.');
            return content.trim();

        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('Timeout: a OpenAI demorou mais de 15 segundos para responder.');
            }
            throw err;
        }
    }

    // ==================== TESTE DE CONEXÃO ====================

    async testConnection(appState) {
        return await this.sendMessage('Olá! Você está funcionando?', appState);
    }
}

// Singleton global
window.grokService = new GrokService();

// Salvar chave OpenAI automaticamente na primeira carga
(function () {
    const config = window.grokService.getConfig();
    if (!config.apiKey || config.apiKey.startsWith('gsk_')) {
        window.grokService.saveConfig({
            apiKey: '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',
            enabled: true,
            model: 'gpt-4o-mini'
        });
    }
})();

// Configure ou atualize a chave em: IA Atendente → Chave de API OpenAI
// Obtenha sua chave em: https://platform.openai.com/api-keys
