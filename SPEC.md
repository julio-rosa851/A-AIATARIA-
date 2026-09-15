# Açaí Prime - Sistema de Gestão Completo

## 1. Visão Geral do Projeto

**Nome do Projeto:** Açaí Prime - Sistema de Gestão com IA para Açaíteria
**Tipo:** Aplicação Web Completa
**Funcionalidade Principal:** Sistema de gestão para loja de açaí com CRM, WhatsApp, cardápio digital e IA atendente
**Usuários Alvo:** Proprietários de açaíterias e lojas de açaí

---

## 2. Especificação UI/UX

### Estrutura de Layout

**Arquitetura:**
- Dashboard principal com sidebar fixa à esquerda
- Área de conteúdo principal à direita
- Header com logo editável e menu do usuário
- Módulos separados: Principal (CRM) e Cardápio

**Breakpoints:**
- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: < 768px

### Design Visual

**Paleta de Cores (Default):**
- Primary: `#7B1FA2` (Roxo Açaí)
- Secondary: `#1A0A2E` (Roxo Escuro)
- Accent: `#FF9800` (Laranja)
- Background: `#0F0A1A` (Fundo roxo escuro)
- Surface: `#1E1E1E` (Cards/superfícies)
- Text Primary: `#FFFFFF`
- Text Secondary: `#A0A0A0`
- Success: `#00C853`
- Error: `#FF3D00`

**Tipografia:**
- Headings: 'Bebas Neue', sans-serif
- Body: 'Poppins', sans-serif
- Sizes: H1: 48px, H2: 32px, H3: 24px, Body: 16px, Small: 14px

**Espaçamento:**
- Base: 8px
- Padding cards: 24px
- Gap entre elementos: 16px

**Efeitos Visuais:**
- Sombras: `0 8px 32px rgba(255, 107, 0, 0.15)`
- Bordas: `1px solid rgba(255, 215, 0, 0.2)`
- Gradientes: `linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%)`
- Animações: transições 0.3s ease
- Hover glow em botões

### Componentes UI

**Sidebar:**
- Logo editável no topo
- Navegação por ícones + labels
- Itens: Dashboard, Clientes, Produtos, Pedidos, WhatsApp, IA Atendente, Configurações
- Estado ativo com highlight laranja

**Cards:**
- Background surface com borda sutil
- Hover com glow laranja
- Border-radius: 16px

**Botões:**
- Primary: Gradiente laranja com hover glow
- Secondary: Outline amarelo
- Border-radius: 12px

**Formulários:**
- Inputs com background escuro
- Borda laranja no focus
- Labels flutuantes

---

## 3. Especificação de Funcionalidades

### Módulo 1: Dashboard Principal

- Visão geral de pedidos do dia
- Gráfico de vendas semanais
- Clientes ativos
- Status do WhatsApp
- Métricas da IA

### Módulo 2: CRM - Clientes

- Lista de clientes com busca/filtro
- Cadastro de cliente: nome, telefone, email, endereço, observações
- Histórico de pedidos por cliente
- Segmentação (VIP, Regular, Novo)
- Estatísticas do cliente

### Módulo 3: Produtos

- Catálogo de produtos
- Categorias: Açaí (300/500/700ml), Tigelas Especiais, Complementos, Bebidas, Combos & Barcas
- Cadastro: nome, descrição, preço, categoria açaí, imagem, disponibilidade
- Estoque (opcional)
- Variações (tamanhos, sabores)

### Módulo 4: Cardápio Digital (Separado)

- Interface pública para clientes
- Visual diferente do admin
- Carrinho de compras
- Opção de pedido via WhatsApp
- Categorias com imagens

### Módulo 5: WhatsApp Integration

- Conexão com API do WhatsApp (configurável)
- Envio de confirmações de pedido
- Notificações de status
- Modelo de mensagem customizável
- Webhook para receber mensagens

### Módulo 6: IA Atendente

- Chatbot configurável
- Respostas automáticas
- Menu de opções
- Integração com pedidos
- Treinamento de respostas
- Logs de conversa

### Módulo 7: Configurações

- Editor de logo (upload de imagem)
- Paleta de cores (editável via color picker)
- Dados da empresa
- Configurações do WhatsApp
- Configurações da IA

---

## 4. Critérios de Aceitação

1. ✅ Sistema carrega sem erros
2. ✅ Navegação entre todos os módulos funciona
3. ✅ Cadastro de clientes persiste (localStorage)
4. ✅ Cadastro de produtos persiste (localStorage)
5. ✅ Cardápio digital abre em página separada
6. ✅ Logo editável via upload
7. ✅ Cores customizáveis em tempo real
8. ✅ Interface responsiva
9. ✅ Visual moderno e inovador
10. ✅ Botões com efeitos hover
11. ✅ Animações suaves

---

## 5. Stack Tecnológico

- HTML5 semântico
- CSS3 com variáveis customizáveis
- JavaScript vanilla (ES6+)
- localStorage para persistência
- Fontes: Google Fonts
- Ícones: Font Awesome