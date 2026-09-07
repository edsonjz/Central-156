// ==========================================================
// CONSTANTES E PRESETS DO MÓDULO PDI 360° — CENTRAL 156
// ==========================================================

import { ActionCategory702010 } from '../types/pdi';

export interface CompetenceDefinition {
  id: string;
  name: string;
  category: 'Comportamento' | 'Qualidade' | 'Resultados';
  description: string;
  suggestedActions: {
    type: ActionCategory702010;
    text: string;
  }[];
}

// 15 Competências Oficiais do PDI Central 156
export const PDI_COMPETENCES: CompetenceDefinition[] = [
  {
    id: 'comunicacao',
    name: 'Comunicação',
    category: 'Comportamento',
    description: 'Clareza, objetividade, dicção adequada e vocabulário cortês com o cidadão.',
    suggestedActions: [
      { type: '70_pratica', text: 'Escutar e autoavaliar 3 atendimentos próprios por semana focando na clareza e dicção.' },
      { type: '20_social', text: 'Sessão de coaching com o supervisor sobre técnicas de comunicação assertiva.' },
      { type: '10_capacitacao', text: 'Realizar micro-treinamento de técnicas de comunicação no atendimento ao público.' }
    ]
  },
  {
    id: 'escuta_ativa',
    name: 'Escuta Ativa',
    category: 'Comportamento',
    description: 'Capacidade de ouvir sem interromper, compreender a real necessidade e validar o entendimento.',
    suggestedActions: [
      { type: '70_pratica', text: 'Aplicar técnica de paráfrase ("Compreendi que o senhor precisa de...") em todas as chamadas.' },
      { type: '20_social', text: 'Monitoria espelhada com operador referência em escuta ativa.' },
      { type: '10_capacitacao', text: 'Leitura do guia de escuta ativa e acolhimento da Central 156.' }
    ]
  },
  {
    id: 'empatia',
    name: 'Empatia',
    category: 'Comportamento',
    description: 'Demonstrar consideração e respeito pelos sentimentos e urgências do cidadão.',
    suggestedActions: [
      { type: '70_pratica', text: 'Praticar frases acolhedoras e personalizadas no início e conclusão do atendimento.' },
      { type: '20_social', text: 'Feedback quinzenal sobre percepção do usuário e notas de NPS.' },
      { type: '10_capacitacao', text: 'Participar do workshop interno de empatia e humanização do serviço público.' }
    ]
  },
  {
    id: 'inteligencia_emocional',
    name: 'Inteligência Emocional',
    category: 'Comportamento',
    description: 'Identificar e lidar de maneira equilibrada com situações de estresse e cobrança.',
    suggestedActions: [
      { type: '70_pratica', text: 'Aplicar técnica de respiração e pausa estratégica antes de chamadas difíceis.' },
      { type: '20_social', text: 'Alinhamento com supervisor após chamadas críticas para descompressão.' },
      { type: '10_capacitacao', text: 'Webinar sobre gestão de estresse no ambiente de teleatendimento.' }
    ]
  },
  {
    id: 'controle_emocional',
    name: 'Controle Emocional',
    category: 'Comportamento',
    description: 'Manter a calma, neutralidade e equilíbrio em chamadas com munícipes exaltados.',
    suggestedActions: [
      { type: '70_pratica', text: 'Simulações de chamadas de conflito mantendo tom calmo e profissional.' },
      { type: '20_social', text: 'Acompanhar 5 atendimentos de situações difíceis com operador experiente.' },
      { type: '10_capacitacao', text: 'Módulo instrucional sobre desescalonamento de conflitos no telefone.' }
    ]
  },
  {
    id: 'organizacao',
    name: 'Organização',
    category: 'Qualidade',
    description: 'Manter rotina de trabalho organizada, gestão do tempo de pós-atendimento e pausas.',
    suggestedActions: [
      { type: '70_pratica', text: 'Organizar checklist diário de atalhos e protocolos frequentes na estação.' },
      { type: '20_social', text: 'Reunião de alinhamento com a supervisão sobre gestão eficiente de pausas.' },
      { type: '10_capacitacao', text: 'Vídeo-aula sobre produtividade e organização no teleatendimento.' }
    ]
  },
  {
    id: 'proatividade',
    name: 'Proatividade',
    category: 'Comportamento',
    description: 'Antecipar dúvidas do munícipe e propor soluções dentro dos fluxos pré-estabelecidos.',
    suggestedActions: [
      { type: '70_pratica', text: 'Informar prazos e canais de acompanhamento antes que o cidadão pergunte.' },
      { type: '20_social', text: 'Compartilhar boas práticas de resolução nas reuniões de equipe (briefing).' },
      { type: '10_capacitacao', text: 'Estudo do catálogo completo de serviços disponíveis no portal da Prefeitura.' }
    ]
  },
  {
    id: 'responsabilidade',
    name: 'Responsabilidade',
    category: 'Comportamento',
    description: 'Cumprimento de escalas, pontualidade, assiduidade e ética no trabalho.',
    suggestedActions: [
      { type: '70_pratica', text: 'Manter diário de pontualidade de entrada e pausas sem estourar limites.' },
      { type: '20_social', text: 'Reunião mensal com supervisor sobre índice de aderência e assiduidade.' },
      { type: '10_capacitacao', text: 'Revisão da cartilha de normas disciplinares e operacionais da operação.' }
    ]
  },
  {
    id: 'trabalho_equipe',
    name: 'Trabalho em Equipe',
    category: 'Comportamento',
    description: 'Colaboração com os colegas, repasse ágil de informações e ambiente harmonioso.',
    suggestedActions: [
      { type: '70_pratica', text: 'Ajudar ativamente colegas com dúvidas no canal interno de apoio operacional.' },
      { type: '20_social', text: 'Participação ativa nas dinâmicas de alinhamento da equipe.' },
      { type: '10_capacitacao', text: 'Módulo sobre comunicação não-violenta e cooperação entre equipes.' }
    ]
  },
  {
    id: 'adaptabilidade',
    name: 'Adaptabilidade',
    category: 'Comportamento',
    description: 'Facilidade para assimilar mudanças em processos, novos scripts e escalas.',
    suggestedActions: [
      { type: '70_pratica', text: 'Aplicar novos procedimentos no mesmo dia em que forem comunicados.' },
      { type: '20_social', text: 'Tirar dúvidas imediatas com multiplicador ou supervisor sobre novos fluxos.' },
      { type: '10_capacitacao', text: 'Revisão rápida diária do mural de avisos e atualizações de serviço.' }
    ]
  },
  {
    id: 'conhecimento_tecnico',
    name: 'Conhecimento Técnico',
    category: 'Qualidade',
    description: 'Domínio das regras de negócio dos serviços da prefeitura e navegação nos sistemas.',
    suggestedActions: [
      { type: '70_pratica', text: 'Praticar busca rápida na base de conhecimento durante os atendimentos.' },
      { type: '20_social', text: 'Tira-dúvidas semanal de casos complexos com a equipe de qualidade.' },
      { type: '10_capacitacao', text: 'Realizar reciclagem formal sobre serviços de maior complexidade (ex: SMF/DMLU).' }
    ]
  },
  {
    id: 'resolucao_problemas',
    name: 'Resolução de Problemas',
    category: 'Qualidade',
    description: 'Capacidade de entender a solicitação, identificar o órgão correto e orientar sem retrabalho.',
    suggestedActions: [
      { type: '70_pratica', text: 'Garantir que todas as informações necessárias para abertura de protocolo sejam coletadas.' },
      { type: '20_social', text: 'Estudo de caso conjunto com o monitor sobre chamadas reabertas.' },
      { type: '10_capacitacao', text: 'Treinamento de assertividade em triagem e direcionamento de demandas.' }
    ]
  },
  {
    id: 'qualidade_registro',
    name: 'Qualidade do Registro',
    category: 'Qualidade',
    description: 'Preenchimento completo, gramática correta e precisão nas informações inseridas no protocolo.',
    suggestedActions: [
      { type: '70_pratica', text: 'Revisar o texto do protocolo antes de salvar e encerrar o chamado.' },
      { type: '20_social', text: 'Auditoria de 3 chamadas registradas junto com o supervisor de qualidade.' },
      { type: '10_capacitacao', text: 'Guia rápido de redação padrão e termos técnicos para protocolos municipais.' }
    ]
  },
  {
    id: 'conhecimento_processos',
    name: 'Conhecimento dos Processos',
    category: 'Qualidade',
    description: 'Cumprimento estrito dos procedimentos operacionais e fluxogramas da Central 156.',
    suggestedActions: [
      { type: '70_pratica', text: 'Seguir o checklist de triagem de cada serviço sem pular etapas.' },
      { type: '20_social', text: 'Alinhamento quinzenal sobre atualizações de decretos e portarias municipais.' },
      { type: '10_capacitacao', text: 'Reciclagem de procedimentos na plataforma de capacitação interna.' }
    ]
  },
  {
    id: 'postura_profissional',
    name: 'Postura Profissional',
    category: 'Comportamento',
    description: 'Ética, cordialidade, respeito às normas da instituição e representação da Prefeitura.',
    suggestedActions: [
      { type: '70_pratica', text: 'Manter padrão de saudação e encerramento institucional em 100% das chamadas.' },
      { type: '20_social', text: 'Feedback 1:1 mensal com foco em conduta e desenvolvimento de carreira.' },
      { type: '10_capacitacao', text: 'Treinamento sobre código de ética e conduta no serviço público.' }
    ]
  }
];

// Escala 1 a 5 para Avaliação de Competências
export const COMPETENCE_LEVELS = [
  { value: 1, label: 'Necessita desenvolvimento intenso', color: 'bg-rose-500', text: 'text-rose-600', badge: 'bg-rose-50 border-rose-200 text-rose-700' },
  { value: 2, label: 'Em desenvolvimento', color: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  { value: 3, label: 'Adequado', color: 'bg-blue-500', text: 'text-blue-600', badge: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 4, label: 'Acima do esperado', color: 'bg-indigo-500', text: 'text-indigo-600', badge: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { value: 5, label: 'Referência', color: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
];

// Classificação de Gaps de Desenvolvimento
export const getGapClassification = (gap: number) => {
  if (gap <= 0) return { label: 'Desenvolvido', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
  if (gap === 1) return { label: 'Baixa necessidade', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' };
  if (gap === 2) return { label: 'Necessidade moderada', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
  if (gap === 3) return { label: 'Necessidade alta', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' };
  return { label: 'Necessidade crítica', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', dot: 'bg-rose-500' };
};

// Opções de Ciclo Padrão
export const PDI_CYCLES = [
  { days: 30, label: '30 Dias (PDI Corretivo / Foco Rápido)', recommendedFor: 'Recuperação de indicadores e gaps críticos' },
  { days: 45, label: '45 Dias (Ciclo Intermediário)', recommendedFor: 'Ajustes comportamentais e de processos' },
  { days: 60, label: '60 Dias (PDI de Desenvolvimento)', recommendedFor: 'Evolução contínua de competências e qualidade' },
  { days: 90, label: '90 Dias (PDI de Carreira / Liderança)', recommendedFor: 'Preparação para novas funções e monitoria' }
];

// Metas de Carreira Sugeridas
export const CAREER_GOALS = [
  'Permanecer como Operador de Referência',
  'Preparação para Monitor de Qualidade',
  'Preparação para Instrutor / Multiplicador de Treinamento',
  'Preparação para Supervisor de Operação',
  'Especialista em Serviços Complexos (SMF / Fazenda)',
  'Outras Oportunidades Internas na Central 156'
];

// Presets de Indicadores (Quantitativos e Comportamentais/Subjetivos)
export interface IndicatorPreset {
  id: string;
  name: string;
  type: 'quantitativo' | 'comportamental' | 'qualitativo';
  defaultUnit?: string;
  exampleTarget: string;
  isBehavioral: boolean;
}

export const PRESET_INDICATORS: IndicatorPreset[] = [
  // Quantitativos Operacionais
  { id: 'tma', name: 'TMA (Tempo Médio de Atendimento)', type: 'quantitativo', defaultUnit: 'hh:mm', exampleTarget: '04:00', isBehavioral: false },
  { id: 'nps', name: 'NPS (Satisfação do Cidadão)', type: 'quantitativo', defaultUnit: 'pontos', exampleTarget: '90', isBehavioral: false },
  { id: 'monitoria', name: 'Monitoria de Qualidade', type: 'quantitativo', defaultUnit: '%', exampleTarget: '96%', isBehavioral: false },
  { id: 'aderencia', name: 'Aderência à Escala e Pausas', type: 'quantitativo', defaultUnit: '%', exampleTarget: '95%', isBehavioral: false },
  { id: 'produtividade', name: 'Produtividade de Chamadas', type: 'quantitativo', defaultUnit: 'chamadas/hora', exampleTarget: '12', isBehavioral: false },
  
  // Comportamentais e Subjetivos
  { id: 'comunicacao_diccao', name: 'Clareza na Dicção e Vocabulário', type: 'comportamental', exampleTarget: 'Adequado / Sem gírias', isBehavioral: true },
  { id: 'escuta_ativa', name: 'Escuta Ativa sem Interrupções', type: 'comportamental', exampleTarget: '100% de escuta atenta', isBehavioral: true },
  { id: 'empatia_acolhimento', name: 'Empatia e Acolhimento ao Cidadão', type: 'comportamental', exampleTarget: 'Comportamento acolhedor e empático', isBehavioral: true },
  { id: 'controle_emocional', name: 'Controle Emocional em Conflitos', type: 'comportamental', exampleTarget: 'Postura equilibrada e calma', isBehavioral: true },
  { id: 'qualidade_registro', name: 'Qualidade e Precisão no Registro de Protocolo', type: 'qualitativo', exampleTarget: 'Zero retrabalho de cadastro', isBehavioral: true },
  { id: 'postura_etica', name: 'Postura Ética e Trabalho em Equipe', type: 'comportamental', exampleTarget: 'Colaborativo e assíduo', isBehavioral: true },
  { id: 'resolucao_primeiro_contato', name: 'Capacidade de Resolução na Triagem', type: 'qualitativo', exampleTarget: 'Direcionamento assertivo', isBehavioral: true }
];

