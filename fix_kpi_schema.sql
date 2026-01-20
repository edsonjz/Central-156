-- ==========================================
-- SCRIPT DE CORREÇÃO DE SCHEMA E RLS - CENTRAL 156
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Garantir que as colunas JSONB existem e estão corretas
ALTER TABLE operators 
ADD COLUMN IF NOT EXISTS kpis JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS feedbacks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- 2. Garantir que arrays nulos sejam convertidos para vazios (evita erros no frontend)
UPDATE operators SET kpis = '[]'::jsonb WHERE kpis IS NULL;
UPDATE operators SET feedbacks = '[]'::jsonb WHERE feedbacks IS NULL;
UPDATE operators SET documents = '[]'::jsonb WHERE documents IS NULL;

-- 3. Recriar Políticas de Segurança (RLS) para garantir permissão de escrita

-- Habilitar RLS
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Política de Leitura" ON operators;
DROP POLICY IF EXISTS "Política de Escrita" ON operators;
DROP POLICY IF EXISTS "Supervisors Full Access" ON operators;
DROP POLICY IF EXISTS "Operators Read Own" ON operators;
DROP POLICY IF EXISTS "Operators Update Own" ON operators;

-- Política 1: Leitura (Supervisores veem todos, Operadores veem a si mesmos)
CREATE POLICY "Operators Select Policy" ON operators
FOR SELECT
USING (
  (auth.jwt() ->> 'email') LIKE '%admin%' OR  -- Admin/Supervisor via email
  auth.uid() = user_id OR                     -- O próprio operador
  EXISTS (                                    -- Supervisor checado no banco
    SELECT 1 FROM operators 
    WHERE user_id = auth.uid() 
    AND role = 'Supervisor'
  )
);

-- Política 2: Escrita/Modificação (Supervisores podem tudo, Operadores podem atualizar seus dados)
CREATE POLICY "Operators Insert Update Delete Policy" ON operators
FOR ALL
USING (
  (auth.jwt() ->> 'email') LIKE '%admin%' OR  -- Admin/Supervisor via email
  auth.uid() = user_id OR                     -- O próprio operador (ex: responder feedback)
  EXISTS (                                    -- Supervisor checado no banco
    SELECT 1 FROM operators 
    WHERE user_id = auth.uid() 
    AND role = 'Supervisor'
  )
);

-- 4. Notificar sucesso
SELECT 'Correção aplicada com sucesso. Tabela operators atualizada.' as status;
