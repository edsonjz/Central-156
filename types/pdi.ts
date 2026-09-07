// ==========================================
// TIPAGENS DO MÓDULO PDI 360° — CENTRAL 156
// ==========================================

export type PDIType = 'Desenvolvimento' | 'Recuperação' | 'Carreira' | 'Outro';

export type PDIStatus = 'Em evolução' | 'Atenção' | 'Crítico' | 'Concluído' | 'Cancelado';

export type PDIActionStatus = 'Não iniciado' | 'Em andamento' | 'Concluído' | 'Atrasado' | 'Cancelado';

export type ActionCategory702010 = '70_pratica' | '20_social' | '10_capacitacao';

export type PDIDimension = 'Resultados' | 'Qualidade' | 'Comportamento' | 'Desenvolvimento' | 'Carreira';

export type PDIFeedbackType = 
  | 'Positivo' 
  | 'Corretivo' 
  | 'Acompanhamento' 
  | 'Reconhecimento' 
  | 'Desenvolvimento' 
  | 'Final';

export type PDIRecognitionType = 
  | 'Evolução destaque' 
  | 'Superação' 
  | 'Excelente desempenho' 
  | 'Meta atingida' 
  | 'Evolução significativa' 
  | 'Boa iniciativa';

export type PDIResult = 
  | 'Superou expectativas' 
  | 'Atingiu expectativas' 
  | 'Evoluiu parcialmente' 
  | 'Não atingiu expectativas';

// Objetivo do PDI (com campos SMART e suporte a metas combinadas)
export interface PDIObjective {
  id: string;
  pdi_id?: string;
  titulo: string;
  descricao?: string;
  categoria: PDIDimension;
  indicador_principal?: string; // Ex: TMA, NPS, Monitoria, Postura, Comunicação, etc.
  tipo_indicador?: 'quantitativo' | 'comportamental' | 'qualitativo';
  valor_atual?: string;
  meta: string;
  unidade?: string;
  
  // Metas Combinadas para garantir que qualidade seja preservada
  indicador_secundario?: string; // Ex: Monitoria
  meta_secundaria?: string;      // Ex: >= 96%
  
  // Metodologia SMART
  smart_especifica?: string;
  smart_mensuravel?: string;
  smart_atingivel?: string;
  smart_relevante?: string;
  smart_temporal?: string;
  
  peso: number; // Porcentagem ou peso relativo (ex: 10 a 100)
  prazo: string; // YYYY-MM-DD
  status: PDIActionStatus;
  progresso: number; // 0 a 100
}

// Ação de Desenvolvimento na Matriz 70/20/10
export interface PDIAction {
  id: string;
  pdi_id?: string;
  objetivo_id?: string;
  tipo_70_20_10: ActionCategory702010;
  descricao: string;
  responsavel: string; // 'Operador' | 'Supervisor' | 'Qualidade' | 'Instrutor'
  data_inicio: string; // YYYY-MM-DD
  data_limite: string; // YYYY-MM-DD
  status: PDIActionStatus;
  evidencia?: string;
  comentario?: string;
  comentario_operador?: string;
  data_conclusao?: string;
}

// Matriz de Competência com Gaps (Escala 1 a 5)
export interface PDICompetence {
  id: string;
  pdi_id?: string;
  competencia: string;
  nivel_atual: number; // 1 a 5
  nivel_desejado: number; // 1 a 5
  gap: number; // nivel_desejado - nivel_atual
  observacao_supervisor?: string;
  acao_recomendada?: string;
  data_avaliacao: string; // YYYY-MM-DD
}

// Feedback Específico do Ciclo
export interface PDIFeedback {
  id: string;
  pdi_id?: string;
  autor_id?: string;
  supervisor_nome: string;
  tipo: PDIFeedbackType;
  pontos_positivos?: string;
  pontos_atencao?: string;
  orientacoes?: string;
  proximos_passos?: string;
  comentario_operador?: string;
  data: string; // ISO ou YYYY-MM-DD
}

// Reconhecimento / Conquista
export interface PDIRecognition {
  id: string;
  pdi_id?: string;
  operator_registration: string;
  tipo: PDIRecognitionType;
  titulo: string;
  descricao: string;
  concedido_por: string;
  data: string; // ISO ou YYYY-MM-DD
}

// Registro Mestre do PDI
export interface PDI {
  id: string;
  operator_registration: string;
  supervisor_id?: string;
  supervisor_name: string;
  titulo: string;
  tipo: PDIType;
  dimensao_foco: string; // Ex: "Qualidade, Comportamento"
  dimensoes_foco?: string[]; // Suporte a múltiplas dimensões selecionadas
  ciclo_dias: number; // 30, 45, 60, 90 ou personalizado
  data_inicio: string; // YYYY-MM-DD
  data_fim: string;    // YYYY-MM-DD
  status: PDIStatus;
  progresso: number;   // 0 a 100
  diagnostico_inicial?: string;
  carreira_objetivo?: string;
  observacoes?: string;

  // Coleções filhas
  objetivos: PDIObjective[];
  acoes: PDIAction[];
  competencias: PDICompetence[];
  feedbacks: PDIFeedback[];
  reconhecimentos: PDIRecognition[];

  // Avaliação Final
  resultado_final?: PDIResult;
  avaliacao_final_comentario?: string;
  data_encerramento?: string;

  created_at?: string;
  updated_at?: string;
}

// Estatísticas para o Dashboard do Supervisor
export interface PDISummaryStats {
  total: number;
  emEvolucao: number;
  emAtencao: number;
  criticos: number;
  concluidos: number;
  acoesAtrasadas: number;
  taxaMediaProgresso: number;
}
