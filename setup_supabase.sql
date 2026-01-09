-- ==========================================
-- SCRIPT DE CORREÇÃO TOTAL - CENTRAL 156
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Habilitar a extensão necessária para logs (opcional, mas útil)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 2. Limpar Políticas Antigas para evitar conflitos
DROP POLICY IF EXISTS "Política de Leitura" ON operators;
DROP POLICY IF EXISTS "Política de Escrita" ON operators;
DROP POLICY IF EXISTS "Leitura Pública" ON config;
DROP POLICY IF EXISTS "Escrita Supervisor" ON config;
DROP FUNCTION IF EXISTS public.is_supervisor() CASCADE;

-- 3. Função de Segurança Robusta (Define quem é Supervisor)
CREATE OR REPLACE FUNCTION public.is_supervisor() 
RETURNS BOOLEAN AS $$
BEGIN
  -- Considera Supervisor se tiver a role 'Supervisor' no metadata ou no banco
  RETURN (
    (auth.jwt() ->> 'email') LIKE '%admin%' OR
    EXISTS (
      SELECT 1 FROM operators 
      WHERE user_id = auth.uid() 
      AND role = 'Supervisor'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-aplicar Políticas de Segurança (RLS) na tabela 'operators'
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

-- Quem pode ler (SELECT)?
-- Supervisores veem tudo. Operadores veem apenas a si mesmos.
CREATE POLICY "Política de Leitura" ON operators FOR SELECT
USING (
  auth.uid() = user_id OR is_supervisor()
);

-- Quem pode escrever (INSERT/UPDATE/DELETE)?
-- Supervisores podem tudo. Operadores podem atualizar seus próprios dados (ex: feedbacks).
CREATE POLICY "Política de Escrita" ON operators FOR ALL
USING (
  auth.uid() = user_id OR is_supervisor()
);

-- 5. Configuração da tabela 'config'
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura Pública" ON config FOR SELECT USING (true);
CREATE POLICY "Escrita Supervisor" ON config FOR ALL USING (is_supervisor());

-- ==========================================
-- CRÍTICO: CONFIGURAÇÃO DO REALTIME
-- ==========================================

-- 6. Garantir que a tabela envie o payload COMPLETO no evento de update
ALTER TABLE operators REPLICA IDENTITY FULL;

-- 7. Adicionar tabela à publicação do Realtime
-- Primeiro remove para garantir que não haja duplicidade/erro
ALTER PUBLICATION supabase_realtime DROP TABLE operators;
ALTER PUBLICATION supabase_realtime ADD TABLE operators;

-- ==========================================
-- CORREÇÃO DE DADOS (Self-Healing)
-- ==========================================

-- 8. Garantir que todos os registros tenham arrays inicializados
-- Isso evita erros no frontend ao tentar fazer .map() em nulos
UPDATE operators 
SET 
  kpis = COALESCE(kpis, '[]'::jsonb),
  feedbacks = COALESCE(feedbacks, '[]'::jsonb),
  documents = COALESCE(documents, '[]'::jsonb)
WHERE 
  kpis IS NULL OR 
  feedbacks IS NULL OR 
  documents IS NULL;

-- FIM DO SCRIPT
