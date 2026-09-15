/**
 * Açaí Prime - Sistema de Banco de Memória do Bot Avançado
 * brain.js - Gerencia o aprendizado e memória da IA com NLP
 */

/**
 * NLPEngine - Processamento de Linguagem Natural Avançado
 */
class NLPEngine {
    constructor() {
        this.intentPatterns = {
            greeting: /^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|ei|hello|hi)/i,
            menu: /(cardápio|cardapio|menu|opções|opcoes|açaí|acai|tigela|barca|complementos)/i,
            price: /(preço|preco|valor|custa|quanto|caro|barato)/i,
            delivery: /(entrega|entregar|delivery|domicílio|domicilio|enviar)/i,
            hours: /(horário|horario|hora|aberto|funciona|fecha)/i,
            payment: /(pagamento|pagar|forma|pix|dinheiro|cartão|cartao)/i,
            promotion: /(promoção|promocao|desconto|oferta|especial)/i,
            order: /(pedir|pedido|comprar|queria|quero)/i,
            thanks: /(obrigado|obrigada|vlw| valeu|agradeço)/i,
            goodbye: /(tchau|adeus|até|ate|flw|bye)/i
        };
        
        this.sentimentWords = {
            positive: ['obrigado', 'ótimo', 'excelente', 'perfeito', 'amei', 'adorei', 'parabéns', 'sucesso', 'maravilhoso', 'incrível', 'fantástico', 'delícia', 'delicioso'],
            negative: ['ruim', 'péssimo', 'horrível', 'nunca', 'decepção', 'problema', 'erro', 'falha', 'lento', 'atrasado', 'frio', 'queimado']
        };
    }

    analyzeIntent(message) {
        for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
            if (pattern.test(message)) {
                return intent;
            }
        }
        return 'unknown';
    }

    analyzeSentiment(message) {
        const lowerMessage = message.toLowerCase();
        let score = 0;
        
        this.sentimentWords.positive.forEach(word => {
            if (lowerMessage.includes(word)) score += 1;
        });
        
        this.sentimentWords.negative.forEach(word => {
            if (lowerMessage.includes(word)) score -= 1;
        });
        
        if (score > 0) return 'positive';
        if (score < 0) return 'negative';
        return 'neutral';
    }

    extractEntities(message) {
        const entities = {
            products: [],
            numbers: [],
            time: null
        };
        
        const products = ['açaí', 'acai', 'tigela', 'barca', 'complemento', 'nutella', 'granola', 'leite em pó', 'morango', 'cupuaçu'];
        products.forEach(product => {
            if (message.toLowerCase().includes(product)) {
                entities.products.push(product);
            }
        });
        
        const numberMatches = message.match(/\d+/g);
        if (numberMatches) {
            entities.numbers = numberMatches.map(n => parseInt(n));
        }
        
        entities.urgent = /urgente|agora|rápido|com pressa/i.test(message);
        
        return entities;
    }
}

class BotBrain {
    constructor(companyId) {
        this.companyId = companyId;
        this.memory = new BotMemory(companyId);
        this.conversation = new ConversationEngine(companyId);
        this.nlp = new NLPEngine();
    }

    // Processar mensagem recebida com NLP
    async processMessage(message, userInfo = {}) {
        // Tentar IA Groq primeiro se estiver ativa
        if (window.grokService && window.grokService.isEnabled()) {
            try {
                const grokResponse = await window.grokService.sendMessage(message, window.AppState || {});
                await this.conversation.saveConversation(message, grokResponse, userInfo);
                await this.memory.updateContext(message, grokResponse);
                await this.memory.updateAnalytics(true);
                return {
                    type: 'grok',
                    response: grokResponse,
                    confidence: 1.0,
                    source: 'groq_api',
                    intent: this.nlp.analyzeIntent(message)
                };
            } catch (error) {
                console.error('[Groq] Falha, usando fallback:', error);
                // Continua para o sistema de regras abaixo
            }
        }

        // Análise de intenção
        const intent = this.nlp.analyzeIntent(message);
        
        // Obter contexto
        const context = await this.memory.getContext();
        
        // Buscar resposta no conhecimento
        const knowledgeMatch = await this.conversation.findMatch(message);
        
        let response;
        if (knowledgeMatch && knowledgeMatch.confidence > 0.3) {
            response = {
                type: 'trained',
                response: knowledgeMatch.response,
                confidence: knowledgeMatch.confidence,
                source: 'knowledge_base',
                intent: intent
            };
        } else {
            // Gerar resposta inteligente
            response = await this.generateSmartResponse(message, context, intent);
        }
        
        // Salvar conversa
        await this.conversation.saveConversation(message, response.response, userInfo);
        
        // Atualizar contexto
        await this.memory.updateContext(message, response.response);
        
        // Atualizar analytics
        await this.memory.updateAnalytics(response.confidence > 0.5);
        
        return response;
    }

    // Treinar o bot com nova resposta
    async train(trigger, response, category = 'general') {
        return await this.memory.addKnowledge(trigger, response, category);
    }

    // Obter todas as respostas treinadas
    async getKnowledgeBase() {
        return await this.memory.getAllKnowledge();
    }

    // Excluir conhecimento
    async deleteKnowledge(id) {
        return await this.memory.removeKnowledge(id);
    }

    // Atualizar conhecimento
    async updateKnowledge(id, trigger, response, category) {
        return await this.memory.updateKnowledge(id, trigger, response, category);
    }

    // Buscar resposta mais adequada
    async findBestResponse(message) {
        return await this.conversation.findMatch(message);
    }

    // Analisar sentimento da mensagem
    analyzeSentiment(message) {
        return this.nlp.analyzeSentiment(message);
    }

    // Extrair entidades da mensagem
    extractEntities(message) {
        return this.nlp.extractEntities(message);
    }

    // Gerar resposta baseada em IA simulada
    async generateSmartResponse(message, context, intent) {
        const knowledge = await this.findBestResponse(message);
        
        if (knowledge) {
            return {
                type: 'trained',
                response: knowledge.response,
                confidence: knowledge.confidence,
                source: 'knowledge_base',
                intent: intent
            };
        }

        // Respostas baseadas em intenção
        const defaultResponses = this.getResponsesByIntent(intent, context);
        
        return {
            type: 'default',
            response: defaultResponses[Math.floor(Math.random() * defaultResponses.length)],
            confidence: 0.5,
            source: 'default_responses',
            intent: intent
        };
    }

    getResponsesByIntent(intent, context) {
        const responses = {
            greeting: [
                'Olá! Como posso ajudar você hoje? 😊',
                'Oi! Estou aqui para atender você. O que gostaria de pedir?',
                'Olá! Seja bem-vindo! Em que posso ajudar?',
                'Bom dia! Bem-vindo à Açaí Prime! 💜 O que você gostaria?'
            ],
            menu: [
                'Temos açaís de 300ml, 500ml, 700ml, Tigelas Especiais e Barcas! Qual tamanho você prefere? 🍧',
                'Nosso açaí é 100% puro e cremoso! Quer com quais complementos? Leite em pó, Nutella, morango...',
                'Açaí 300ml R$18,90 | 500ml R$24,90 | 700ml R$32,90 | Barca 1L R$54,90 com complementos! 💜'
            ],
            price: [
                'Nossos preços são muito justos! Tem desde R$ 15,90.',
                'Temos opções para todos os gostos e bolsos!',
                'O menor é o Açaí 300ml por R$18,90 e a Barca Família 1L por R$54,90 com tudo incluso!'
            ],
            delivery: [
                'Fazemos entrega! O tempo é de 30-45 minutos.',
                'Entregamos em toda a região. Taxa de R$ 5,00 (grátis acima de R$ 50).',
                'Nossa entrega é rápida! Em média 35 minutos.'
            ],
            hours: [
                'Funcionamos de segunda a domingo, das 18h às 23h.',
                'Estamos abertos todos os dias, das 18h às 23h (sáb e dom até 00h).',
                'Das 18h às 23h de segunda a quinta. Sexta, sábado e domingo até meia-noite!'
            ],
            payment: [
                'Aceitamos dinheiro, cartão de crédito/débito e PIX.',
                'Todas as formas de pagamento! Dinheiro, cartão (crédito/débito) e PIX.',
                'PIX disponível! Transferência instantânea.'
            ],
            promotion: [
                'Aproveite! Combo Família por R$ 89,90 (4 hambúrgueres + 4 batatas + 4 refrigerantes).',
                'Temos promoções especiais toda semana!',
                'Combo do dia com 20% de desconto!'
            ],
            order: [
                'Para fazer um pedido, é só dizer o que você gostaria!',
                'Qual lanche você quer pedir?',
                'Pode me dizer o que deseja pedir?'
            ],
            thanks: [
                'De nada! 😊',
                'Estamos à disposição!',
                'Foi um prazer atender você!'
            ],
            goodbye: [
                'Até logo! Obrigado pela visita!',
                'Tchau! Volte sempre!',
                'Até mais! Bom apetite!'
            ],
            unknown: [
                'Desculpe, não entendi. Pode reformular sua pergunta?',
                'Não tenho certeza sobre isso. Quer falar com um atendente?',
                'Hmm, me explique melhor o que você precisa.',
                'Posso te ajudar com algo específico?'
            ]
        };

        return responses[intent] || responses.unknown;
    }
}

/**
 * BotMemory - Gerencia o banco de memória com versionamento
 */
class BotMemory {
    constructor(companyId) {
        this.companyId = companyId;
        this.storageKey = `acai_bot_memory_${companyId}`;
    }

    async getData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : this.getDefaultData();
    }

    getDefaultData() {
        return {
            version: '1.0.0',
            knowledge: [
                {
                    id: 1,
                    trigger: 'cardápio',
                    response: 'Nosso cardápio Açaí Prime: Açaí 300ml R$18,90 | 500ml R$24,90 | 700ml R$32,90 | Tigela Power R$29,90 | Barca 1L R$54,90. Todos com complementos à escolha! 🍧',
                    category: 'menu',
                    usage: 0,
                    rating: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 2,
                    trigger: 'entrega',
                    response: 'Fazemos entrega! Tempo médio de 20-35 minutos. Taxa de entrega: R$5,00 para pedidos acima de R$50,00 entrega grátis! 💜',
                    category: 'delivery',
                    usage: 0,
                    rating: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 3,
                    trigger: 'horário',
                    response: 'Funcionamos todos os dias das 14h às 23h — açaí fresquinho a tarde toda!',
                    category: 'hours',
                    usage: 0,
                    rating: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 4,
                    trigger: 'promoção',
                    response: 'Promoção do dia: Barca Família 1L por R$49,90! Leva 6 complementos + 2 caldas. Aproveite! 🎉',
                    category: 'promotion',
                    usage: 0,
                    rating: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 5,
                    trigger: 'pagamento',
                    response: 'Aceitamos dinheiro, cartão de crédito/débito e PIX. 💳',
                    category: 'payment',
                    usage: 0,
                    rating: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 6,
                    trigger: 'complementos',
                    response: 'Complementos disponíveis: leite em pó, paçoca, granola, confete, leite condensado, Nutella, morango, banana, kiwi e mel!',
                    category: 'menu',
                    usage: 0,
                    rating: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ],
            context: {
                lastMessage: '',
                lastResponse: '',
                conversationCount: 0,
                userPreferences: {},
                recentTopics: [],
                averageSentiment: 'neutral'
            },
            analytics: {
                totalConversations: 0,
                successfulResponses: 0,
                failedResponses: 0,
                averageConfidence: 0,
                topIntents: {},
                sentimentDistribution: { positive: 0, negative: 0, neutral: 0 }
            }
        };
    }

    async saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    async getContext() {
        const data = await this.getData();
        return data.context;
    }

    async updateContext(message, response) {
        const data = await this.getData();
        
        data.context.lastMessage = message;
        data.context.lastResponse = response;
        data.context.conversationCount++;
        
        const words = message.toLowerCase().split(' ');
        words.forEach(word => {
            if (word.length > 3 && !data.context.recentTopics.includes(word)) {
                data.context.recentTopics.push(word);
                if (data.context.recentTopics.length > 10) {
                    data.context.recentTopics.shift();
                }
            }
        });
        
        await this.saveData(data);
    }

    async addKnowledge(trigger, response, category = 'general') {
        const data = await this.getData();
        
        const newKnowledge = {
            id: Date.now(),
            trigger: trigger.toLowerCase().trim(),
            response: response.trim(),
            category: category,
            usage: 0,
            rating: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        data.knowledge.push(newKnowledge);
        await this.saveData(data);
        
        return newKnowledge;
    }

    async getAllKnowledge() {
        const data = await this.getData();
        return data.knowledge;
    }

    async removeKnowledge(id) {
        const data = await this.getData();
        data.knowledge = data.knowledge.filter(k => k.id !== id);
        await this.saveData(data);
    }

    async updateKnowledge(id, trigger, response, category) {
        const data = await this.getData();
        const index = data.knowledge.findIndex(k => k.id === id);
        
        if (index !== -1) {
            data.knowledge[index] = {
                ...data.knowledge[index],
                trigger: trigger.toLowerCase().trim(),
                response: response.trim(),
                category: category,
                updatedAt: new Date().toISOString()
            };
            await this.saveData(data);
        }
    }

    async getAnalytics() {
        const data = await this.getData();
        return data.analytics;
    }

    async updateAnalytics(success) {
        const data = await this.getData();
        
        data.analytics.totalConversations++;
        if (success) {
            data.analytics.successfulResponses++;
        } else {
            data.analytics.failedResponses++;
        }
        
        data.analytics.averageConfidence = 
            (data.analytics.successfulResponses / data.analytics.totalConversations) * 100;
        
        await this.saveData(data);
    }

    // Avaliar resposta
    async rateResponse(knowledgeId, rating) {
        const data = await this.getData();
        const index = data.knowledge.findIndex(k => k.id === knowledgeId);
        
        if (index !== -1) {
            const currentRating = data.knowledge[index].rating || 0;
            const currentUsage = data.knowledge[index].usage || 0;
            data.knowledge[index].rating = ((currentRating * currentUsage) + rating) / (currentUsage + 1);
            data.knowledge[index].usage = currentUsage + 1;
            await this.saveData(data);
        }
    }
}

/**
 * ConversationEngine - Gerencia conversas com NLP integrado
 */
class ConversationEngine {
    constructor(companyId) {
        this.companyId = companyId;
        this.conversationsKey = `acai_conversations_${companyId}`;
        this.nlp = new NLPEngine();
    }

    async generateResponse(message, context, userInfo) {
        await this.delay(50);
        
        const intent = this.nlp.analyzeIntent(message);
        const sentiment = this.nlp.analyzeSentiment(message);
        const entities = this.nlp.extractEntities(message);
        
        const match = await this.findMatch(message, intent);
        
        if (match) {
            await this.updateAnalytics(true, intent, sentiment);
            return this.enhanceResponse(match.response, intent, entities, sentiment);
        }
        
        const defaultResponse = this.getDefaultResponse(intent, sentiment);
        await this.updateAnalytics(false, intent, sentiment);
        
        return defaultResponse;
    }

    async findMatch(message, intent) {
        const memory = new BotMemory(this.companyId);
        const knowledge = await memory.getAllKnowledge();
        
        const lowerMessage = message.toLowerCase();
        let bestMatch = null;
        let highestScore = 0;

        knowledge.forEach(item => {
            const score = this.calculateSimilarity(lowerMessage, item.trigger);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = { ...item, confidence: score };
            }
        });

        if (highestScore > 0.3) {
            return bestMatch;
        }
        
        return null;
    }

    calculateSimilarity(text1, text2) {
        const words1 = text1.split(' ');
        const words2 = text2.split(' ');
        
        let matches = 0;
        words2.forEach(word => {
            if (text1.includes(word)) {
                matches++;
            }
        });
        
        return matches / words2.length;
    }

    enhanceResponse(response, intent, entities, sentiment) {
        let enhanced = response;
        
        if (entities.products.length > 0) {
            enhanced += `\n\n📦 Produtos detectados: ${entities.products.join(', ')}`;
        }
        
        if (entities.numbers.length > 0) {
            enhanced += `\n💰 Valores mencionados: R$ ${entities.numbers.join(', ')},00`;
        }
        
        if (entities.urgent) {
            enhanced += `\n\n⚡ Pedido prioritário identificado!`;
        }
        
        if (sentiment === 'positive') {
            enhanced += `\n\n😊 Ficamos felizes em ajudar!`;
        } else if (sentiment === 'negative') {
            enhanced += `\n\n😔 Lamentamos. Em que podemos melhorar?`;
        }
        
        return enhanced;
    }

    getDefaultResponse(intent, sentiment) {
        const responses = {
            greeting: [
                'Olá! Bem-vindo à Açaí Prime! 🍧 Como posso ajudar hoje?',
                'Oi! Que bom ter você aqui! O que gostaria de pedir?',
                'Olá! Estou pronto para atender! Me conta o que você quer.'
            ],
            menu: [
                'Temos opções deliciosas! Acesse nosso cardápio digital ou me diga o que procura.',
                'Nosso cardápio tem açaís, tigelas, barcas e bebidas. O que te interessa? 🍧'
            ],
            price: [
                'Posso te passar os valores! Qual produto gostaria de saber?',
                'Temos opções para todos os orçamentos. O que você gostaria de saber?'
            ],
            delivery: [
                'Fazemos entrega! Tempo de 30-45min. Taxa de R$5,00 (grátis acima de R$50).',
                'Entregamos na região! Quer verificar se entregamos no seu endereço?'
            ],
            hours: [
                'Funcionamos 18h-23h (até 00h nos fins de semana).',
                'Estamos abertos! Das 18h às 23h (sexta e sábado até meia-noite).'
            ],
            payment: [
                'Aceitamos dinheiro, cartão e PIX. Escolha a forma mais conveniente!',
                'Pagamento facilitado: dinheiro, cartão de crédito/débito ou PIX.'
            ],
            promotion: [
                'Temos promoções especiais! Combo Família por R$89,90.',
                'Aproveite! Barca Família 1L com 6 complementos e 2 caldas por R$54,90!'
            ],
            order: [
                'Perfeito! Me diz o que você gostaria de pedir.',
                'Ótimo! Qual é o pedido?'
            ],
            thanks: [
                'De nada! Sempre à disposição! 😊',
                'Estamos à disposição! Qualquer coisa, é só chamar!'
            ],
            goodbye: [
                'Tchau! Obrigado pela visita! Volte sempre! 👋',
                'Até mais! Foi um prazer atender! 😊'
            ],
            unknown: [
                'Entendi! Em que posso ajudar?',
                'Pode me explicar melhor? Posso te ajudar com cardápio, pedidos ou informações.',
                'Não tenho certeza sobre isso. Quer falar com um atendente ou ver nosso cardápio?'
            ]
        };
        
        const intentResponses = responses[intent] || responses.unknown;
        let response = intentResponses[Math.floor(Math.random() * intentResponses.length)];
        
        if (sentiment === 'positive') {
            response += ' Fico feliz em ajudar!';
        } else if (sentiment === 'negative') {
            response += ' Posso fazer algo para melhorar?';
        }
        
        return response;
    }

    async saveConversation(message, response, userInfo) {
        const conversations = this.getConversations();
        
        const nlpAnalysis = {
            intent: this.nlp.analyzeIntent(message),
            sentiment: this.nlp.analyzeSentiment(message),
            entities: this.nlp.extractEntities(message)
        };
        
        conversations.push({
            id: Date.now(),
            message: message,
            response: response,
            userInfo: userInfo,
            nlpAnalysis: nlpAnalysis,
            timestamp: new Date().toISOString()
        });

        if (conversations.length > 100) {
            conversations.splice(0, conversations.length - 100);
        }

        localStorage.setItem(this.conversationsKey, JSON.stringify(conversations));
    }

    getConversations() {
        const data = localStorage.getItem(this.conversationsKey);
        return data ? JSON.parse(data) : [];
    }

    getRecentConversations(limit = 10) {
        const conversations = this.getConversations();
        return conversations.slice(-limit).reverse();
    }

    async updateAnalytics(success, intent, sentiment) {
        const memory = new BotMemory(this.companyId);
        const data = await memory.getData();
        
        data.analytics.totalConversations++;
        if (success) {
            data.analytics.successfulResponses++;
        } else {
            data.analytics.failedResponses++;
        }
        
        if (!data.analytics.topIntents[intent]) {
            data.analytics.topIntents[intent] = 0;
        }
        data.analytics.topIntents[intent]++;
        
        data.analytics.sentimentDistribution[sentiment] = 
            (data.analytics.sentimentDistribution[sentiment] || 0) + 1;
        
        data.analytics.averageConfidence = 
            (data.analytics.successfulResponses / data.analytics.totalConversations) * 100;
        
        await memory.saveData(data);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * SAASManager - Gerencia multi-tenancy
 */
class SAASManager {
    constructor() {
        this.superAdminKey = 'acai_saas_admin';
        this.companiesKey = 'acai_saas_companies';
    }

    // Obter todas as empresas
    getCompanies() {
        const data = localStorage.getItem(this.companiesKey);
        return data ? JSON.parse(data) : [];
    }

    // Criar nova empresa
    createCompany(companyData) {
        const companies = this.getCompanies();
        
        const newCompany = {
            id: Date.now(),
            name: companyData.name,
            email: companyData.email,
            phone: companyData.phone || '',
            plan: companyData.plan || 'free',
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            settings: {
                primaryColor: '#7B1FA2',
                secondaryColor: '#1A1A1A',
                accentColor: '#CE93D8',
                logo: null
            },
            limits: this.getPlanLimits(companyData.plan || 'free')
        };

        companies.push(newCompany);
        localStorage.setItem(this.companiesKey, JSON.stringify(companies));

        // Inicializar dados da empresa
        this.initializeCompanyData(newCompany.id);

        return newCompany;
    }

    // Obter limites do plano
    getPlanLimits(plan) {
        const plans = {
            free: { clients: 50, ordersPerMonth: 100, products: 20, features: ['basic_crm', 'basic_menu'] },
            basic: { clients: 200, ordersPerMonth: 500, products: 50, features: ['basic_crm', 'basic_menu', 'whatsapp_basic'] },
            professional: { clients: -1, ordersPerMonth: -1, products: -1, features: ['full_crm', 'full_menu', 'whatsapp_full', 'ia_advanced', 'analytics'] },
            corporate: { clients: -1, ordersPerMonth: -1, products: -1, features: ['full_crm', 'full_menu', 'whatsapp_full', 'ia_advanced', 'analytics', 'api', 'multi_branch'] }
        };
        return plans[plan] || plans.free;
    }

    // Inicializar dados da empresa
    initializeCompanyData(companyId) {
        // Clientes
        localStorage.setItem(`acai_clients_${companyId}`, JSON.stringify([]));
        
        // Produtos
        localStorage.setItem(`acai_products_${companyId}`, JSON.stringify([]));
        
        // Pedidos
        localStorage.setItem(`acai_orders_${companyId}`, JSON.stringify([]));
        
        // Bot Memory
        localStorage.setItem(`acai_bot_memory_${companyId}`, JSON.stringify({
            knowledge: [],
            context: { lastMessage: '', lastResponse: '', conversationCount: 0 },
            analytics: { totalConversations: 0, successfulResponses: 0 }
        }));
        
        // Conversas
        localStorage.setItem(`acai_conversations_${companyId}`, JSON.stringify([]));
    }

    // Obter empresa por ID
    getCompany(companyId) {
        const companies = this.getCompanies();
        return companies.find(c => c.id === companyId);
    }

    // Atualizar empresa
    updateCompany(companyId, data) {
        const companies = this.getCompanies();
        const index = companies.findIndex(c => c.id === companyId);
        
        if (index !== -1) {
            companies[index] = { ...companies[index], ...data };
            localStorage.setItem(this.companiesKey, JSON.stringify(companies));
        }
    }

    // Excluir empresa
    deleteCompany(companyId) {
        let companies = this.getCompanies();
        companies = companies.filter(c => c.id !== companyId);
        localStorage.setItem(this.companiesKey, JSON.stringify(companies));
    }

    // Verificar limites do plano
    checkLimits(companyId, type) {
        const company = this.getCompany(companyId);
        if (!company) return { allowed: false, reason: 'Empresa não encontrada' };

        const limits = company.limits;
        
        switch (type) {
            case 'clients':
                if (limits.clients === -1) return { allowed: true };
                const currentClients = this.getCurrentCount(companyId, 'clients');
                return { allowed: currentClients < limits.clients, current: currentClients, limit: limits.clients };
            
            case 'orders':
                if (limits.ordersPerMonth === -1) return { allowed: true };
                const currentOrders = this.getCurrentCount(companyId, 'orders');
                return { allowed: currentOrders < limits.ordersPerMonth, current: currentOrders, limit: limits.ordersPerMonth };
            
            case 'products':
                if (limits.products === -1) return { allowed: true };
                const currentProducts = this.getCurrentCount(companyId, 'products');
                return { allowed: currentProducts < limits.products, current: currentProducts, limit: limits.products };
        }
        
        return { allowed: true };
    }

    // Obter contagem atual
    getCurrentCount(companyId, type) {
        switch (type) {
            case 'clients':
                const clients = localStorage.getItem(`acai_clients_${companyId}`);
                return clients ? JSON.parse(clients).length : 0;
            
            case 'orders':
                const orders = localStorage.getItem(`acai_orders_${companyId}`);
                return orders ? JSON.parse(orders).length : 0;
            
            case 'products':
                const products = localStorage.getItem(`acai_products_${companyId}`);
                return products ? JSON.parse(products).length : 0;
            
            default:
                return 0;
        }
    }

    // Verificar recurso disponível
    hasFeature(companyId, feature) {
        const company = this.getCompany(companyId);
        if (!company) return false;
        return company.limits.features.includes(feature);
    }
}

// Exportar classes
window.BotBrain = BotBrain;
window.BotMemory = BotMemory;
window.ConversationEngine = ConversationEngine;
window.NLPEngine = NLPEngine;
window.SAASManager = SAASManager;