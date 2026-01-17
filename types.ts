
export enum Role {
  SUPERVISOR = 'Supervisor',
  OPERATOR = 'Operador'
}

export enum WorkMode {
  PRESENTIAL = 'Presencial',
  HOME_OFFICE = 'Home Office'
}

export enum LinkType {
  EFETIVO = 'Efetivo',
  TEMPORARIO = 'Temporário',
  APRENDIZ = 'Aprendiz'
}

export enum OperatorClassification {
  SMF = 'SMF',
  OUTROS = 'Outros'
}

export interface KPI {
  id: string;
  month: string; // YYYY-MM
  tma: string | null; // hh:mm:ss ou null
  nps: number | null; // ou null
  monitoria: number | null; // ou null
  createdAt?: string; // Data/Hora do lançamento ISO
  [key: string]: any;
}

export interface Feedback {
  id: string;
  date: string;
  supervisorId: string;
  supervisorName: string;
  comment: string;
  operatorResponse?: string;
  isRead?: boolean; // Novo campo para alertas visuais
  actionPlan?: string;
}

export interface Operator {
  user_id?: string; // Vínculo com auth.users.id
  registration: string; // Cadastro (Unique Key)
  name: string;
  admissionDate: string;
  role: string;
  linkType: LinkType;
  costCenter: string;
  classification: OperatorClassification;
  workMode: WorkMode;
  birthDate: string;
  photoUrl?: string;
  active: boolean;
  kpis: KPI[];
  feedbacks: Feedback[];
  documents: Array<{ id: string; name: string; type: string; url: string; date: string }>;
}

export interface TeamGoals {
  tma: string;
  nps: number;
  monitoria: number;
}

export interface CloudConfig {
  url: string;
  key: string;
  enabled: boolean;
}

// ==========================================
// MÓDULO DE AVALIAÇÃO DE DESEMPENHO
// ==========================================

export enum EvaluationType {
  GRAUS_90 = '90',
  GRAUS_180 = '180',
  GRAUS_360 = '360'
}

export interface EvaluationCriteria {
  assiduidade: number | null;
  qualidade_atendimento: number | null;
  procedimentos: number | null;
  conhecimento_tecnico: number | null;
  produtividade: number | null;
  organizacao: number | null;
  comportamento: number | null;
  trabalho_equipe: number | null;
  adaptabilidade: number | null;
  autonomia: number | null;
}

export interface EvaluationComments {
  comentario_assiduidade?: string;
  comentario_qualidade?: string;
  comentario_procedimentos?: string;
  comentario_conhecimento?: string;
  comentario_produtividade?: string;
  comentario_organizacao?: string;
  comentario_comportamento?: string;
  comentario_equipe?: string;
  comentario_adaptabilidade?: string;
  comentario_autonomia?: string;
}

export interface PerformanceEvaluation extends EvaluationCriteria, EvaluationComments {
  id: string;
  operator_registration: string;
  evaluator_id?: string;
  evaluator_name: string;
  evaluation_type: EvaluationType;
  period: string; // YYYY-MM

  // Notas automáticas de KPIs
  nota_tma?: number;
  nota_nps?: number;
  nota_monitoria?: number;

  // Campos complementares
  pontos_fortes: string;
  pontos_melhoria: string;
  plano_desenvolvimento?: string;

  created_at?: string;
  updated_at?: string;
}

// Tipo de escala para cada critério
export type RatingScaleType = 'professional' | 'behavioral' | 'development' | 'simple';

// Configuração dos critérios de avaliação
export const EVALUATION_CRITERIA_CONFIG = [
  {
    key: 'assiduidade',
    label: 'Assiduidade, Pontualidade e Comprometimento',
    question: 'O operador demonstra assiduidade, pontualidade e compromisso com a jornada?',
    scaleType: 'behavioral' as RatingScaleType,
    indicators: ['Cumpre jornada', 'Pontualidade nas pausas', 'Poucas ausências', 'Compromisso com escala']
  },
  {
    key: 'qualidade_atendimento',
    label: 'Qualidade do Atendimento ao Cidadão',
    question: 'O operador mantém um atendimento respeitoso, claro e adequado ao cidadão?',
    scaleType: 'professional' as RatingScaleType,
    indicators: ['Cordialidade', 'Clareza', 'Escuta ativa', 'Respeito', 'Postura adequada']
  },
  {
    key: 'procedimentos',
    label: 'Cumprimento dos Procedimentos e Fluxos',
    question: 'O operador segue corretamente os procedimentos e fluxos do 156?',
    scaleType: 'simple' as RatingScaleType,
    indicators: ['Segue fluxos', 'Cumpre orientações', 'Sem atalhos indevidos', 'Atualizado']
  },
  {
    key: 'conhecimento_tecnico',
    label: 'Conhecimento Técnico (Hardskill)',
    question: 'O operador demonstra domínio técnico suficiente para executar o atendimento?',
    scaleType: 'development' as RatingScaleType,
    indicators: ['Conhece protocolos', 'Informações corretas', 'Domínio dos sistemas', 'Segurança']
  },
  {
    key: 'produtividade',
    label: 'Produtividade e Gestão do Tempo',
    question: 'O operador administra bem o tempo de atendimento, mantendo qualidade e produtividade?',
    scaleType: 'professional' as RatingScaleType,
    indicators: ['Boa gestão do tempo', 'Evita prolongar chamadas', 'Ritmo adequado', 'Cumpre metas']
  },
  {
    key: 'organizacao',
    label: 'Organização e Registro das Informações',
    question: 'Os registros feitos pelo operador são claros, completos e corretos?',
    scaleType: 'simple' as RatingScaleType,
    indicators: ['Registros completos', 'Informações corretas', 'Escrita objetiva', 'Atenção aos detalhes']
  },
  {
    key: 'comportamento',
    label: 'Comportamento e Postura Profissional (Softskill)',
    question: 'O operador mantém postura profissional e respeitosa no ambiente de trabalho?',
    scaleType: 'behavioral' as RatingScaleType,
    indicators: ['Respeito', 'Postura ética', 'Linguagem adequada', 'Colaboração', 'Responsabilidade']
  },
  {
    key: 'trabalho_equipe',
    label: 'Trabalho em Equipe',
    question: 'O operador contribui positivamente para o trabalho em equipe?',
    scaleType: 'behavioral' as RatingScaleType,
    indicators: ['Cooperação', 'Compartilha informações', 'Ajuda colegas', 'Não gera conflitos']
  },
  {
    key: 'adaptabilidade',
    label: 'Adaptabilidade e Aprendizado',
    question: 'O operador demonstra abertura para aprender, receber feedback e se adaptar?',
    scaleType: 'development' as RatingScaleType,
    indicators: ['Aceita feedback', 'Corrige erros', 'Adapta-se', 'Vontade de aprender', 'Evolução']
  },
  {
    key: 'autonomia',
    label: 'Autonomia e Responsabilidade',
    question: 'O operador atua com autonomia e responsabilidade no atendimento?',
    scaleType: 'development' as RatingScaleType,
    indicators: ['Resolve sozinho', 'Sabe pedir ajuda', 'Assume erros', 'Cumpre combinados', 'Maturidade']
  }
] as const;

// Escalas de avaliação por tipo
export const RATING_SCALES: Record<RatingScaleType, { value: number; label: string; color: string }[]> = {
  // Modelo 2 - neutro e profissional (para qualidade, produtividade)
  professional: [
    { value: 1, label: 'Muito abaixo do esperado', color: 'bg-red-500' },
    { value: 2, label: 'Abaixo do esperado', color: 'bg-orange-500' },
    { value: 3, label: 'Dentro do esperado', color: 'bg-yellow-500' },
    { value: 4, label: 'Acima do esperado', color: 'bg-lime-500' },
    { value: 5, label: 'Muito acima do esperado', color: 'bg-green-500' }
  ],
  // Modelo 6 - comportamental (para assiduidade, comportamento, equipe)
  behavioral: [
    { value: 1, label: 'Nunca demonstra', color: 'bg-red-500' },
    { value: 2, label: 'Raramente demonstra', color: 'bg-orange-500' },
    { value: 3, label: 'Às vezes demonstra', color: 'bg-yellow-500' },
    { value: 4, label: 'Frequentemente demonstra', color: 'bg-lime-500' },
    { value: 5, label: 'Sempre demonstra', color: 'bg-green-500' }
  ],
  // Modelo 4 - foco em desenvolvimento (para conhecimento, adaptabilidade, autonomia)
  development: [
    { value: 1, label: 'Insuficiente', color: 'bg-red-500' },
    { value: 2, label: 'Em desenvolvimento', color: 'bg-orange-500' },
    { value: 3, label: 'Atende às expectativas', color: 'bg-yellow-500' },
    { value: 4, label: 'Supera as expectativas', color: 'bg-lime-500' },
    { value: 5, label: 'Excelência', color: 'bg-green-500' }
  ],
  // Modelo 5 - simples para operação (para procedimentos, organização)
  simple: [
    { value: 1, label: 'Não atende', color: 'bg-red-500' },
    { value: 2, label: 'Atende parcialmente', color: 'bg-orange-500' },
    { value: 3, label: 'Atende', color: 'bg-yellow-500' },
    { value: 4, label: 'Atende bem', color: 'bg-lime-500' },
    { value: 5, label: 'Atende muito bem', color: 'bg-green-500' }
  ]
};

// Opções de plano de desenvolvimento
export const DEVELOPMENT_PLAN_OPTIONS = [
  'Treinamento específico',
  'Acompanhamento próximo',
  'Reciclagem de conteúdo',
  'Feedback contínuo',
  'Mentoria com operador experiente',
  'Participação em workshops'
] as const;