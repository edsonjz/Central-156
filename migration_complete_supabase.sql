-- ==============================================================================
-- SCRIPT CONSOLIDADO DE MANUTENÇÃO E LIMPEZA RLS — CENTRAL 156 PORTO ALEGRE
-- Projeto Supabase: wdeyalyeodicquajiywy
-- Execute este script no SQL Editor do Supabase caso deseje remover políticas
-- permissivas duplicadas antigas e índices não utilizados.
-- ==============================================================================

-- 1. Limpeza de políticas duplicadas antigas em public.config
DROP POLICY IF EXISTS "Escrita Supervisor Config" ON public.config;
DROP POLICY IF EXISTS "Leitura Pública Config" ON public.config;
DROP POLICY IF EXISTS "config_select_policy" ON public.config;
DROP POLICY IF EXISTS "config_write_policy" ON public.config;

CREATE POLICY "config_select_policy" ON public.config
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "config_insert_policy" ON public.config
  FOR INSERT TO authenticated
  WITH CHECK (private.is_supervisor());
CREATE POLICY "config_update_policy" ON public.config
  FOR UPDATE TO authenticated
  USING (private.is_supervisor())
  WITH CHECK (private.is_supervisor());
CREATE POLICY "config_delete_policy" ON public.config
  FOR DELETE TO authenticated
  USING (private.is_supervisor());

-- 2. Limpeza de políticas duplicadas em public.operators
DROP POLICY IF EXISTS "Gerenciamento Supervisor" ON public.operators;
DROP POLICY IF EXISTS "operators_select_policy" ON public.operators;
DROP POLICY IF EXISTS "operators_insert_policy" ON public.operators;
DROP POLICY IF EXISTS "operators_update_policy" ON public.operators;
DROP POLICY IF EXISTS "operators_delete_policy" ON public.operators;

CREATE POLICY "operators_select_policy" ON public.operators
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_supervisor());
CREATE POLICY "operators_insert_policy" ON public.operators
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id OR private.is_supervisor());
CREATE POLICY "operators_update_policy" ON public.operators
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR private.is_supervisor())
  WITH CHECK ((SELECT auth.uid()) = user_id OR private.is_supervisor());
CREATE POLICY "operators_delete_policy" ON public.operators
  FOR DELETE TO authenticated
  USING (private.is_supervisor());

-- 3. Limpeza de políticas duplicadas em public.performance_evaluations
DROP POLICY IF EXISTS "evaluations_select_policy" ON public.performance_evaluations;
DROP POLICY IF EXISTS "evaluations_write_policy" ON public.performance_evaluations;

CREATE POLICY "evaluations_select_policy" ON public.performance_evaluations
  FOR SELECT TO authenticated
  USING (
    private.is_supervisor()
    OR operator_registration IN (
      SELECT o.registration FROM public.operators o WHERE o.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "evaluations_insert_policy" ON public.performance_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (private.is_supervisor());
CREATE POLICY "evaluations_update_policy" ON public.performance_evaluations
  FOR UPDATE TO authenticated
  USING (private.is_supervisor())
  WITH CHECK (private.is_supervisor());
CREATE POLICY "evaluations_delete_policy" ON public.performance_evaluations
  FOR DELETE TO authenticated
  USING (private.is_supervisor());

-- 4. Remoção opcional das funções SECURITY DEFINER públicas redundantes após recriar as policies acima
DROP FUNCTION IF EXISTS public.is_supervisor();
DROP FUNCTION IF EXISTS public.is_supervisor_optimized();
DROP FUNCTION IF EXISTS public.is_supervisor_safe();

-- 5. Remoção opcional de índices não utilizados
DROP INDEX IF EXISTS public.idx_evaluations_type;
DROP INDEX IF EXISTS public.idx_operators_documents;
DROP INDEX IF EXISTS public.idx_operators_kpis;
DROP INDEX IF EXISTS public.idx_operators_feedbacks;
DROP INDEX IF EXISTS public.idx_operator_kpis_reg_month;

SELECT 'Limpeza RLS e índices concluída com sucesso!' AS status;
