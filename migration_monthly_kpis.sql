-- ==============================================================================
-- MIGRAÇÃO SEGURA: GESTÃO DE INDICADORES (KPIs) POR COMPETÊNCIA MENSAL
-- Central 156 Porto Alegre
-- Execute este script no SQL Editor do Supabase
-- ==============================================================================

-- 1. Tabela de Snapshots Mensais Independentes de KPIs
CREATE TABLE IF NOT EXISTS public.monthly_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Competência Mensal (Snapshot independente)
  ano SMALLINT NOT NULL CHECK (ano BETWEEN 2020 AND 2100),
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  
  -- Identificação do Operador no Mês (Sem FK com CASCADE para garantir independência mensal)
  operador_chave TEXT NOT NULL,          -- Chave canônica normalizada (ex: matricula ou nome canônico sem acento)
  operador_nome TEXT NOT NULL,           -- Nome exibido no mês
  matricula TEXT,                        -- Matrícula opcional vinculada ao cadastro (ex: '19191', '56323', '2090')
  
  -- Indicadores (KPIs)
  monitoria NUMERIC(6, 2),               -- Nota de Monitoria / Qualidade (0 a 100)
  tma TEXT,                              -- Tempo Médio de Atendimento formatado ('HH:MM:SS')
  tma_segundos INTEGER,                  -- TMA em segundos para cálculo rápido de média e ordenação
  nps NUMERIC(6, 2),                     -- Nota de NPS (0 a 100)
  abs NUMERIC(6, 4),                     -- Índice de Absenteísmo/Assiduidade (ex: 1.0000 ou 0.9231)
  
  -- Campos de Gestão Mensal do Operador
  equipe_turno TEXT DEFAULT 'Central 156',
  status_mes TEXT NOT NULL DEFAULT 'Ativo' CHECK (
    status_mes IN ('Ativo', 'Férias', 'Afastado', 'Troca de Equipe', 'Desligado')
  ),
  observacoes TEXT,
  
  -- Metadados de auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint UNIQUE para impedir duplicidade no mesmo mês e permitir Batch Upsert (onConflict)
  CONSTRAINT monthly_kpis_ano_mes_operador_unique UNIQUE (ano, mes, operador_chave)
);

-- Garantir colunas caso a tabela já exista parcialmente
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS ano SMALLINT;
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS mes SMALLINT;
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS operador_chave TEXT;
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS operador_nome TEXT;
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS matricula TEXT;
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS monitoria NUMERIC(6, 2);
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS tma TEXT;
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS tma_segundos INTEGER;
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS nps NUMERIC(6, 2);
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS abs NUMERIC(6, 4);
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS equipe_turno TEXT DEFAULT 'Central 156';
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS status_mes TEXT DEFAULT 'Ativo';
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.monthly_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Índices Compostos para Performance e Economia de Cota (Server-Side Filtering)
CREATE INDEX IF NOT EXISTS idx_monthly_kpis_ano_mes
  ON public.monthly_kpis (ano, mes);

CREATE INDEX IF NOT EXISTS idx_monthly_kpis_operador_historico
  ON public.monthly_kpis (operador_chave, ano, mes);

CREATE INDEX IF NOT EXISTS idx_monthly_kpis_matricula
  ON public.monthly_kpis (matricula)
  WHERE matricula IS NOT NULL;

-- 3. Trigger leve para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_monthly_kpis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monthly_kpis_updated_at ON public.monthly_kpis;
CREATE TRIGGER trg_monthly_kpis_updated_at
  BEFORE UPDATE ON public.monthly_kpis
  FOR EACH ROW
  EXECUTE FUNCTION public.set_monthly_kpis_updated_at();

-- 4. Segurança: Row Level Security (RLS)
ALTER TABLE public.monthly_kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_kpis_select_policy" ON public.monthly_kpis;
DROP POLICY IF EXISTS "monthly_kpis_insert_policy" ON public.monthly_kpis;
DROP POLICY IF EXISTS "monthly_kpis_update_policy" ON public.monthly_kpis;
DROP POLICY IF EXISTS "monthly_kpis_delete_policy" ON public.monthly_kpis;

-- SELECT: Supervisores veem todos os registros do mês; Operadores autenticados veem a operação/próprios registros
CREATE POLICY "monthly_kpis_select_policy" ON public.monthly_kpis
  FOR SELECT TO authenticated
  USING (
    public.is_supervisor()
    OR auth.uid() IS NOT NULL
  );

-- INSERT / UPDATE / DELETE: Apenas Supervisores gerenciam e importam competências mensais
CREATE POLICY "monthly_kpis_insert_policy" ON public.monthly_kpis
  FOR INSERT TO authenticated
  WITH CHECK (public.is_supervisor());

CREATE POLICY "monthly_kpis_update_policy" ON public.monthly_kpis
  FOR UPDATE TO authenticated
  USING (public.is_supervisor())
  WITH CHECK (public.is_supervisor());

CREATE POLICY "monthly_kpis_delete_policy" ON public.monthly_kpis
  FOR DELETE TO authenticated
  USING (public.is_supervisor());

SELECT 'Tabela public.monthly_kpis, índices compostos e políticas de RLS configurados com sucesso!' AS status;
