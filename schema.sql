-- ========================================================
-- AÇAÍ PRIME / PULSE FOOD - ESQUEMA DE BANCO DE DADOS SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase
-- ========================================================

-- 1. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    categoria TEXT NOT NULL DEFAULT 'acai',
    disponivel BOOLEAN DEFAULT true,
    destaque BOOLEAN DEFAULT false,
    tag TEXT,
    imagem TEXT,
    order_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    segmento TEXT DEFAULT 'regular',
    total_gasto NUMERIC(10,2) DEFAULT 0.00,
    total_pedidos INT DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_pedido TEXT,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome TEXT,
    cliente_telefone TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    frete NUMERIC(10,2) DEFAULT 0.00,
    total_com_frete NUMERIC(10,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'novo',
    forma_pagamento TEXT DEFAULT 'pix',
    tipo_entrega TEXT DEFAULT 'entrega',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DE CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id TEXT PRIMARY KEY DEFAULT 'main',
    company_name TEXT DEFAULT 'Açaí Prime',
    company_phone TEXT DEFAULT '5524992552754',
    company_address TEXT,
    primary_color TEXT DEFAULT '#E50914',
    secondary_color TEXT DEFAULT '#0B0B0E',
    accent_color TEXT DEFAULT '#FF1744',
    logo TEXT,
    whatsapp_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE RESPOSTAS DA IA
CREATE TABLE IF NOT EXISTS public.ia_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger TEXT NOT NULL,
    response TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    usage INT DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- HABILITAR RLS (Row Level Security) E PERMISSÕES PÚBLICAS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_respostas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para leitura/escrita rápida
CREATE POLICY "Permitir leitura pública de produtos" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "Permitir escrita de produtos" ON public.produtos FOR ALL USING (true);

CREATE POLICY "Permitir leitura pública de clientes" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Permitir escrita de clientes" ON public.clientes FOR ALL USING (true);

CREATE POLICY "Permitir leitura pública de pedidos" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "Permitir escrita de pedidos" ON public.pedidos FOR ALL USING (true);

CREATE POLICY "Permitir leitura pública de configuracoes" ON public.configuracoes FOR SELECT USING (true);
CREATE POLICY "Permitir escrita de configuracoes" ON public.configuracoes FOR ALL USING (true);

CREATE POLICY "Permitir leitura pública de ia_respostas" ON public.ia_respostas FOR SELECT USING (true);
CREATE POLICY "Permitir escrita de ia_respostas" ON public.ia_respostas FOR ALL USING (true);
