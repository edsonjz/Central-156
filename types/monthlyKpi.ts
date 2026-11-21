// ==============================================================================
// TIPAGENS DO MÓDULO DE GESTÃO DE INDICADORES (KPIs) POR COMPETÊNCIA MENSAL
// Central 156 Porto Alegre
// ==============================================================================

export type MonthlyOperatorStatus =
  | 'Ativo'
  | 'Férias'
  | 'Afastado'
  | 'Troca de Equipe'
  | 'Desligado';

export const MONTHLY_STATUS_LIST: MonthlyOperatorStatus[] = [
  'Ativo',
  'Férias',
  'Afastado',
  'Troca de Equipe',
  'Desligado'
];

export interface MonthlyKpiRecord {
  id?: string;
  ano: number;
  mes: number;
  operador_chave: string;
  operador_nome: string;
  matricula?: string | null;
  monitoria: number | null;
  tma: string | null; // formato 'HH:MM:SS'
  tma_segundos: number | null;
  nps: number | null;
  abs: number | null; // ex: 1.0 = 100%, 0.9231 = 92.31%
  equipe_turno?: string | null;
  status_mes: MonthlyOperatorStatus;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface KpiSemaphoreRule {
  meta: number;     // Limite para VERDE (Na Meta)
  atencao: number;  // Limite para AMARELO (Atenção) — abaixo/acima disso é VERMELHO
}

export interface TmaSemaphoreRule {
  meta: string;     // 'HH:MM:SS' para VERDE (<= meta)
  atencao: string;  // 'HH:MM:SS' para AMARELO (<= atencao) — acima disso é VERMELHO
}

export interface MonthlySemaphoreGoals {
  monitoria: KpiSemaphoreRule;
  nps: KpiSemaphoreRule;
  tma: TmaSemaphoreRule;
  abs: KpiSemaphoreRule; // Em percentual 0-100 (ex: meta 95, atencao 90)
}

export const DEFAULT_SEMAPHORE_GOALS: MonthlySemaphoreGoals = {
  monitoria: { meta: 95, atencao: 88 },
  nps: { meta: 90, atencao: 85 },
  tma: { meta: '00:04:30', atencao: '00:05:15' },
  abs: { meta: 95, atencao: 90 }
};

export type SemaphoreLevel = 'green' | 'yellow' | 'red' | 'neutral';

export interface ImportInconsistency {
  sheetName: string;
  rowNumber: number;
  operatorName: string;
  field: string;
  severity: 'warning' | 'error';
  message: string;
}

export interface ParsedSheetPreview {
  sheetName: string;
  ano: number;
  mes: number;
  competenciaLabel: string;
  detectedColumns: string[];
  records: MonthlyKpiRecord[];
  inconsistencies: ImportInconsistency[];
  selected: boolean;
}

export type ImportMode = 'merge' | 'replace';
