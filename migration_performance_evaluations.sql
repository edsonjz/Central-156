-- ==========================================
-- TABELA DE AVALIAÇÕES DE DESEMPENHO - 156+POA
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Criar tabela de avaliações de desempenho
CREATE TABLE IF NOT EXISTS performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_registration TEXT NOT NULL,
  evaluator_id UUID,
  evaluator_name TEXT NOT NULL,
  evaluation_type TEXT NOT NULL DEFAULT '90' CHECK (evaluation_type IN ('90', '180', '360')),
  period TEXT NOT NULL, -- YYYY-MM
  
  -- Critérios manuais com notas 1-5
  assiduidade INTEGER CHECK (assiduidade BETWEEN 1 AND 5),
  qualidade_atendimento INTEGER CHECK (qualidade_atendimento BETWEEN 1 AND 5),
  procedimentos INTEGER CHECK (procedimentos BETWEEN 1 AND 5),
  conhecimento_tecnico INTEGER CHECK (conhecimento_tecnico BETWEEN 1 AND 5),
  produtividade INTEGER CHECK (produtividade BETWEEN 1 AND 5),
  organizacao INTEGER CHECK (organizacao BETWEEN 1 AND 5),
  comportamento INTEGER CHECK (comportamento BETWEEN 1 AND 5),
  trabalho_equipe INTEGER CHECK (trabalho_equipe BETWEEN 1 AND 5),
  adaptabilidade INTEGER CHECK (adaptabilidade BETWEEN 1 AND 5),
  autonomia INTEGER CHECK (autonomia BETWEEN 1 AND 5),
  
  -- Notas calculadas automaticamente (baseado em KPIs do mês)
  nota_tma INTEGER CHECK (nota_tma BETWEEN 1 AND 5),
  nota_nps INTEGER CHECK (nota_nps BETWEEN 1 AND 5),
  nota_monitoria INTEGER CHECK (nota_monitoria BETWEEN 1 AND 5),
  
  -- Comentários obrigatórios para extremos (1 ou 5)
  comentario_assiduidade TEXT,
  comentario_qualidade TEXT,
  comentario_procedimentos TEXT,
  comentario_conhecimento TEXT,
  comentario_produtividade TEXT,
  comentario_organizacao TEXT,
  comentario_comportamento TEXT,
  comentario_equipe TEXT,
  comentario_adaptabilidade TEXT,
  comentario_autonomia TEXT,
  
  -- Campos complementares obrigatórios
  pontos_fortes TEXT NOT NULL,
  pontos_melhoria TEXT NOT NULL,
  plano_desenvolvimento TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_evaluations_operator ON performance_evaluations(operator_registration);
CREATE INDEX IF NOT EXISTS idx_evaluations_period ON performance_evaluations(period);
CREATE INDEX IF NOT EXISTS idx_evaluations_type ON performance_evaluations(evaluation_type);

-- 3. RLS (Row Level Security)
ALTER TABLE performance_evaluations ENABLE ROW LEVEL SECURITY;

-- 4. Política: Supervisores podem ver e editar tudo
CREATE POLICY "Supervisor full access" ON performance_evaluations
  FOR ALL USING (is_supervisor());

-- 5. Política: Operadores podem ver apenas suas próprias avaliações
CREATE POLICY "Operator read own evaluations" ON performance_evaluations
  FOR SELECT USING (
    operator_registration = (
      SELECT registration FROM operators WHERE user_id = auth.uid()
    )
  );

-- 6. Adicionar à publicação Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE performance_evaluations;

-- FIM DO SCRIPT
