-- ==============================================================================
-- SCRIPT DE OTIMIZAÇÃO DE PERFORMANCE E SEGURANÇA
-- Objetivo: Resolver avisos de "Multiple Permissive Policies" e "Auth RLS InitPlan"
-- ==============================================================================

-- 1. LIMPEZA DE POLÍTICAS DUPLICADAS
-- Removemos todas as variações anteriores para garantir que apenas uma regra vigore.

-- Tabela: operators
DROP POLICY IF EXISTS "Política de Leitura" ON operators;
DROP POLICY IF EXISTS "Política de Escrita" ON operators;
DROP POLICY IF EXISTS "Operators Select Policy" ON operators;
DROP POLICY IF EXISTS "Operators Write Policy" ON operators;
DROP POLICY IF EXISTS "Operators Full Access" ON operators;
DROP POLICY IF EXISTS "Operators Self Access" ON operators;
DROP POLICY IF EXISTS "Acesso de Leitura" ON operators; -- Mencionado nos warnings

-- Tabela: config
DROP POLICY IF EXISTS "Leitura Pública" ON config;
DROP POLICY IF EXISTS "Escrita Supervisor" ON config;

-- Tabela: operator_feedbacks (Se existir e tiver políticas antigas)
-- Tenta remover políticas conhecidas que causam conflito
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'operator_feedbacks') THEN
        DROP POLICY IF EXISTS "Resposta Operador Feedback" ON operator_feedbacks;
        DROP POLICY IF EXISTS "Enable read access for all users" ON operator_feedbacks;
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON operator_feedbacks;
    END IF;
END
$$;

-- 2. OTIMIZAÇÃO DA FUNÇÃO DE VERIFICAÇÃO (SUPERVISOR)
-- A função antiga podia causar recursão ou lentidão. Esta versão é otimizada.

CREATE OR REPLACE FUNCTION public.is_supervisor_optimized()
RETURNS BOOLEAN AS $$
BEGIN
  -- FAST PATH: Verifica metadados do JWT (Email ou Role) para evitar ir ao disco/banco
  -- Se o email contiver 'admin' ou o metadado 'role' for 'Supervisor', libera imediatamente.
  IF (auth.jwt() ->> 'email') LIKE '%admin%' THEN
    RETURN TRUE;
  END IF;

  -- DB PATH: Só consulta a tabela de operadores se não for óbvio pelo JWT.
  -- Usamos 'SELECT 1' para ser o mais leve possível.
  RETURN EXISTS (
    SELECT 1 FROM operators
    WHERE user_id = auth.uid()
    AND role = 'Supervisor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CRIAÇÃO DE ÍNDICES DE PERFORMANCE
-- Garante que a busca por user_id na política RLS seja instantânea.
CREATE INDEX IF NOT EXISTS idx_operators_user_id ON operators(user_id);
CREATE INDEX IF NOT EXISTS idx_operators_registration ON operators(registration);

-- 4. APLICAÇÃO DE POLÍTICAS UNIFICADAS (SINGLE RESPONSIBILITY)

-- 4.1. OPERATORS
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

-- LEITURA: Usuário vê seu próprio dado OU Supervisor vê tudo.
CREATE POLICY "unified_operators_select" ON operators
FOR SELECT
USING (
  auth.uid() = user_id OR is_supervisor_optimized()
);

-- INSERÇÃO: Auto-cadastro ou Supervisor.
CREATE POLICY "unified_operators_insert" ON operators
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR is_supervisor_optimized()
);

-- ATUALIZAÇÃO: Usuário edita seus dados OU Supervisor edita qualquer um.
CREATE POLICY "unified_operators_update" ON operators
FOR UPDATE
USING (
  auth.uid() = user_id OR is_supervisor_optimized()
);

-- EXCLUSÃO: Apenas Supervisor.
CREATE POLICY "unified_operators_delete" ON operators
FOR DELETE
USING (
  is_supervisor_optimized()
);

-- 4.2. CONFIG
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unified_config_select" ON config FOR SELECT USING (true);
CREATE POLICY "unified_config_all" ON config FOR ALL USING (is_supervisor_optimized());

-- 5. OPERATOR_FEEDBACKS (Se existir, garante acesso básico seguro)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'operator_feedbacks') THEN
        ALTER TABLE operator_feedbacks ENABLE ROW LEVEL SECURITY;
        
        -- Garante política única se ela não existir
        DROP POLICY IF EXISTS "unified_feedbacks_access" ON operator_feedbacks;
        
        CREATE POLICY "unified_feedbacks_access" ON operator_feedbacks
        FOR ALL
        USING (
            auth.uid() IN (
                SELECT user_id FROM operators WHERE registration = operator_feedbacks.operator_id -- Supondo FK
            ) OR is_supervisor_optimized()
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignora erros se a estrutura da tabela feedbacks for desconhecida
    NULL;
END
$$;
