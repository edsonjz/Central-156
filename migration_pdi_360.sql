-- ==========================================================
-- MÓDULO PDI 360° — PLANO DE DESENVOLVIMENTO INDIVIDUAL
-- Central 156 Porto Alegre
-- Execute este script no SQL Editor do Supabase se desejar persistência na nuvem
-- ==========================================================

-- 1. Tabela Principal de PDIs
CREATE TABLE IF NOT EXISTS pdis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_registration TEXT NOT NULL,
  supervisor_id UUID,
  supervisor_name TEXT NOT NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Desenvolvimento' CHECK (tipo IN ('Desenvolvimento', 'Recuperacao', 'Carreira', 'Outro')),
  dimensao_foco TEXT DEFAULT 'Resultados',
  ciclo_dias INTEGER NOT NULL DEFAULT 30,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Em evolução' CHECK (status IN ('Em evolução', 'Atenção', 'Crítico', 'Concluído', 'Cancelado')),
  progresso NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  diagnostico_inicial TEXT,
  carreira_objetivo TEXT,
  observacoes TEXT,
  
  -- Avaliação Final do Ciclo
  resultado_final TEXT CHECK (resultado_final IN ('Superou expectativas', 'Atingiu expectativas', 'Evoluiu parcialmente', 'Não atingiu expectativas')),
  avaliacao_final_comentario TEXT,
  data_encerramento TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Objetivos do PDI (com suporte a SMART e Metas Combinadas)
CREATE TABLE IF NOT EXISTS pdi_objetivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id UUID NOT NULL REFERENCES pdis(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'Resultados', -- Resultados, Qualidade, Comportamento, Carreira
  indicador_principal TEXT, -- TMA, NPS, Monitoria, etc.
  valor_atual TEXT,
  meta TEXT NOT NULL,
  unidade TEXT DEFAULT '',
  
  -- Metas Combinadas (ex: TMA <= 04:00 E Monitoria >= 96%)
  indicador_secundario TEXT,
  meta_secundaria TEXT,
  
  -- Campos SMART
  smart_especifica TEXT,
  smart_mensuravel TEXT,
  smart_atingivel TEXT,
  smart_relevante TEXT,
  smart_temporal TEXT,
  
  peso NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  prazo DATE,
  status TEXT NOT NULL DEFAULT 'Em andamento' CHECK (status IN ('Não iniciado', 'Em andamento', 'Concluído', 'Atrasado', 'Cancelado')),
  progresso NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Ações do PDI (Matriz 70/20/10)
CREATE TABLE IF NOT EXISTS pdi_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id UUID NOT NULL REFERENCES pdis(id) ON DELETE CASCADE,
  objetivo_id UUID REFERENCES pdi_objetivos(id) ON DELETE SET NULL,
  tipo_70_20_10 TEXT NOT NULL CHECK (tipo_70_20_10 IN ('70_pratica', '20_social', '10_capacitacao')),
  descricao TEXT NOT NULL,
  responsavel TEXT NOT NULL DEFAULT 'Operador',
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_limite DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Não iniciado' CHECK (status IN ('Não iniciado', 'Em andamento', 'Concluído', 'Atrasado', 'Cancelado')),
  evidencia TEXT,
  comentario TEXT,
  comentario_operador TEXT,
  data_conclusao DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Competências e Gaps Avaliados
CREATE TABLE IF NOT EXISTS pdi_competencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id UUID NOT NULL REFERENCES pdis(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  nivel_atual INTEGER NOT NULL CHECK (nivel_atual BETWEEN 1 AND 5),
  nivel_desejado INTEGER NOT NULL CHECK (nivel_desejado BETWEEN 1 AND 5),
  gap INTEGER NOT NULL,
  observacao_supervisor TEXT,
  acao_recomendada TEXT,
  data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Feedbacks Específicos do PDI
CREATE TABLE IF NOT EXISTS pdi_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id UUID NOT NULL REFERENCES pdis(id) ON DELETE CASCADE,
  autor_id UUID,
  supervisor_nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Acompanhamento' CHECK (tipo IN ('Positivo', 'Corretivo', 'Acompanhamento', 'Reconhecimento', 'Desenvolvimento', 'Final')),
  pontos_positivos TEXT,
  pontos_atencao TEXT,
  orientacoes TEXT,
  proximos_passos TEXT,
  comentario_operador TEXT,
  data TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Reconhecimentos e Conquistas (Gamificação Moderada)
CREATE TABLE IF NOT EXISTS pdi_reconhecimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id UUID REFERENCES pdis(id) ON DELETE SET NULL,
  operator_registration TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Evolução destaque', 'Superação', 'Excelente desempenho', 'Meta atingida', 'Evolução significativa', 'Boa iniciativa')),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  concedido_por TEXT NOT NULL,
  data TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_pdis_operator ON pdis(operator_registration);
CREATE INDEX IF NOT EXISTS idx_pdis_status ON pdis(status);
CREATE INDEX IF NOT EXISTS idx_pdi_acoes_pdi ON pdi_acoes(pdi_id);
CREATE INDEX IF NOT EXISTS idx_pdi_objetivos_pdi ON pdi_objetivos(pdi_id);
CREATE INDEX IF NOT EXISTS idx_pdi_competencias_pdi ON pdi_competencias(pdi_id);
CREATE INDEX IF NOT EXISTS idx_pdi_feedbacks_pdi ON pdi_feedbacks(pdi_id);
CREATE INDEX IF NOT EXISTS idx_pdi_reconhecimentos_op ON pdi_reconhecimentos(operator_registration);

-- RLS (Row Level Security)
ALTER TABLE pdis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdi_objetivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdi_acoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdi_competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdi_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdi_reconhecimentos ENABLE ROW LEVEL SECURITY;

-- Políticas de Supervisor (Acesso Total se for supervisor)
CREATE POLICY "Supervisor full access pdis" ON pdis FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role = 'Supervisor')
);
CREATE POLICY "Supervisor full access objetivos" ON pdi_objetivos FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role = 'Supervisor')
);
CREATE POLICY "Supervisor full access acoes" ON pdi_acoes FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role = 'Supervisor')
);
CREATE POLICY "Supervisor full access competencias" ON pdi_competencias FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role = 'Supervisor')
);
CREATE POLICY "Supervisor full access feedbacks" ON pdi_feedbacks FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role = 'Supervisor')
);
CREATE POLICY "Supervisor full access reconhecimentos" ON pdi_reconhecimentos FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role = 'Supervisor')
);

-- Políticas de Operador (Leitura do próprio PDI e atualização de evidências em ações)
CREATE POLICY "Operator read own pdi" ON pdis FOR SELECT USING (
  operator_registration = (SELECT registration FROM operators WHERE user_id = auth.uid())
);
CREATE POLICY "Operator read own objetivos" ON pdi_objetivos FOR SELECT USING (
  pdi_id IN (SELECT id FROM pdis WHERE operator_registration = (SELECT registration FROM operators WHERE user_id = auth.uid()))
);
CREATE POLICY "Operator read own acoes" ON pdi_acoes FOR SELECT USING (
  pdi_id IN (SELECT id FROM pdis WHERE operator_registration = (SELECT registration FROM operators WHERE user_id = auth.uid()))
);
CREATE POLICY "Operator update own acoes evidence" ON pdi_acoes FOR UPDATE USING (
  pdi_id IN (SELECT id FROM pdis WHERE operator_registration = (SELECT registration FROM operators WHERE user_id = auth.uid()))
);
CREATE POLICY "Operator read own competencias" ON pdi_competencias FOR SELECT USING (
  pdi_id IN (SELECT id FROM pdis WHERE operator_registration = (SELECT registration FROM operators WHERE user_id = auth.uid()))
);
CREATE POLICY "Operator read own feedbacks" ON pdi_feedbacks FOR SELECT USING (
  pdi_id IN (SELECT id FROM pdis WHERE operator_registration = (SELECT registration FROM operators WHERE user_id = auth.uid()))
);
CREATE POLICY "Operator add comment to feedback" ON pdi_feedbacks FOR UPDATE USING (
  pdi_id IN (SELECT id FROM pdis WHERE operator_registration = (SELECT registration FROM operators WHERE user_id = auth.uid()))
);
CREATE POLICY "Operator read own reconhecimentos" ON pdi_reconhecimentos FOR SELECT USING (
  operator_registration = (SELECT registration FROM operators WHERE user_id = auth.uid())
);
