-- ==========================================
-- SCRIPT DE CORREÇÃO FINAL (RLS RECURSION FIX)
-- Este script corrige o erro de "Recursão Infinita"
-- ==========================================

-- 1. Definir função de segurança que EVITA o loop
-- O segredo é 'SECURITY DEFINER': ela roda como admin e ignora o RLS ao checar a role
CREATE OR REPLACE FUNCTION public.is_supervisor_safe() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM operators 
    WHERE user_id = auth.uid() 
    AND role = 'Supervisor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- <--- ISSO É O IMPORTANTE

-- 2. Limpar políticas quebradas
DROP POLICY IF EXISTS "Operators Select Policy" ON operators;
DROP POLICY IF EXISTS "Operators Insert Update Delete Policy" ON operators;
DROP POLICY IF EXISTS "Operators Full Access" ON operators;
DROP POLICY IF EXISTS "Operators Self Access" ON operators;

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas Seguras usando a função

-- Política de Leitura
CREATE POLICY "Operators Select Policy" ON operators
FOR SELECT
USING (
  (auth.jwt() ->> 'email') LIKE '%admin%' OR  -- Admin do Supabase
  auth.uid() = user_id OR                     -- O próprio usuário pode se ver
  is_supervisor_safe()                        -- Supervisor (usando a função segura)
);

-- Política de Escrita (Updates, Inserts)
CREATE POLICY "Operators Write Policy" ON operators
FOR ALL
USING (
  (auth.jwt() ->> 'email') LIKE '%admin%' OR  -- Admin do Supabase
  auth.uid() = user_id OR                     -- O próprio usuário pode editar seus dados
  is_supervisor_safe()                        -- Supervisor pode editar tudo
);

-- 4. Notificar sucesso
SELECT 'Políticas corrigidas com sucesso. Loop infinito resolvido.' as status;
