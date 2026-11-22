// ==============================================================================
// SERVIÇO DE GESTÃO DE INDICADORES (KPIs) POR COMPETÊNCIA MENSAL
// Performance: Filtro Server-Side, Consultas Enxutas, Batch Upsert e Cache em Memória
// ==============================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  Operator,
  KPI,
  WorkMode,
  LinkType,
  OperatorClassification
} from '../types';
import {
  MonthlyKpiRecord,
  MonthlyOperatorStatus,
  MONTHLY_STATUS_LIST,
  MonthlySemaphoreGoals,
  DEFAULT_SEMAPHORE_GOALS,
  SemaphoreLevel,
  ParsedSheetPreview,
  ImportInconsistency,
  ImportMode
} from '../types/monthlyKpi';
import { INITIAL_MONTHLY_KPIS } from '../constants/initialMonthlyKpis';
import { MONTHS } from '../constants';
import { tmaToSeconds, secondsToTma } from '../utils';

export const MONTHLY_KPI_COLS =
  'id, ano, mes, operador_chave, operador_nome, matricula, monitoria, tma, tma_segundos, nps, abs, equipe_turno, status_mes, observacoes, updated_at';

export const MONTHLY_KPIS_UPDATED_EVENT = 'central156:monthly-kpis-updated';

const LOCAL_CACHE_PREFIX = 'central156_monthly_kpis_v1_';
const SEMAPHORE_STORAGE_KEY = 'central156_semaphore_goals_v1';

// Cache em memória para evitar chamadas repetidas ao alternar abas de meses já carregados
const monthMemoryCache = new Map<string, MonthlyKpiRecord[]>();
const yearMemoryCache = new Map<number, MonthlyKpiRecord[]>();
const operatorHistoryMemoryCache = new Map<string, MonthlyKpiRecord[]>();
let tableExistsState: 'unknown' | 'exists' | 'missing' = 'unknown';

export const getCompetenciaKey = (ano: number, mes: number): string =>
  `${ano}-${String(mes).padStart(2, '0')}`;

export const getCompetenciaLabel = (ano: number, mes: number): string =>
  `${MONTHS[mes - 1] || mes}/${ano}`;

export const notifyMonthlyKpisUpdated = (detail?: { ano?: number; mes?: number; operadorChave?: string }) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MONTHLY_KPIS_UPDATED_EVENT, { detail }));
  }
};

export const invalidateMonthlyCache = (ano?: number, mes?: number, operadorChave?: string) => {
  if (ano && mes) {
    monthMemoryCache.delete(getCompetenciaKey(ano, mes));
    yearMemoryCache.delete(ano);
  } else if (ano) {
    yearMemoryCache.delete(ano);
    for (const k of monthMemoryCache.keys()) {
      if (k.startsWith(`${ano}-`)) monthMemoryCache.delete(k);
    }
  } else {
    monthMemoryCache.clear();
    yearMemoryCache.clear();
  }
  if (operadorChave) {
    operatorHistoryMemoryCache.delete(operadorChave);
  } else {
    operatorHistoryMemoryCache.clear();
  }
  notifyMonthlyKpisUpdated({ ano, mes, operadorChave });
};

// Dicionário canônico para unificar variações de escrita, logins (ex: Benjamin.Lisboa) e matrículas
const CANONICAL_OPERATOR_RULES: Array<{
  patterns: string[];
  key: string;
  name: string;
  matricula: string | null;
  team: string;
}> = [
  { patterns: ['sabrina brito', 'sabrina.carvalho'], key: 'op_19195', name: 'Sabrina Brito de Carvalho', matricula: '19195', team: 'Home Office' },
  { patterns: ['vera lucia', 'vera garroni'], key: 'op_19186', name: 'Vera Lúcia Vasconcellos Garroni dos Santos', matricula: '19186', team: 'Home Office' },
  { patterns: ['taise cristina', 'taise.alcantara'], key: 'op_19191', name: 'Taise Cristina da Conceição Alcântara', matricula: '19191', team: 'Home Office' },
  { patterns: ['francisco alexandre', 'francisco.junior'], key: 'op_19439', name: 'Francisco Alexandre Morais Junior', matricula: '19439', team: 'Presencial' },
  { patterns: ['gustavo seevald', 'gustavo.marques'], key: 'op_19453', name: 'Gustavo Seevald Weyne Marques', matricula: '19453', team: 'Home Office' },
  { patterns: ['lucas rafael', 'lucas.silva'], key: 'op_19336', name: 'Lucas Rafael Aires da Silva', matricula: '19336', team: 'SMF / Presencial' },
  { patterns: ['wagner goncalves', 'wagner.goncalves'], key: 'op_19454', name: 'Wagner Gonçalves', matricula: '19454', team: 'SMF / Presencial' },
  { patterns: ['andrize martins'], key: 'op_55615', name: 'Andrize Martins da Silva', matricula: '55615', team: 'Presencial' },
  { patterns: ['benjamin pietro', 'benjamin.lisboa'], key: 'op_56325', name: 'Benjamin Pietro Arrelias Lisboa', matricula: '56325', team: 'Presencial' },
  { patterns: ['kleiton ferraz', 'klaiton ferraz', 'kleiton.souza'], key: 'op_56476', name: 'Kleiton Ferraz de Souza', matricula: '56476', team: 'Presencial' },
  { patterns: ['maike dos santos', 'maike.almeida'], key: 'op_56714', name: 'Maike dos Santos Almeida', matricula: '56714', team: 'SMF / Presencial' },
  { patterns: ['marcelly ribeiro'], key: 'op_56322', name: 'Marcelly Ribeiro Martins', matricula: '56322', team: 'Presencial' },
  { patterns: ['maria eduarda rocha', 'maria.silva'], key: 'op_55941', name: 'Maria Eduarda Rocha da Silva', matricula: '55941', team: 'Presencial' },
  { patterns: ['marilia de souza'], key: 'op_55732', name: 'Marília de Souza Maciel', matricula: '55732', team: 'Presencial' },
  { patterns: ['patricia dos santos', 'patricia.boeira'], key: 'op_56982', name: 'Patrícia dos Santos Boeira', matricula: '56982', team: 'Presencial' },
  { patterns: ['sabrina araujo'], key: 'op_56725', name: 'Sabrina Araújo Mendes Fortes', matricula: '56725', team: 'Presencial' },
  { patterns: ['shaiana meireles', 'shaiana.souza'], key: 'op_56735', name: 'Shaiana Meireles de Souza', matricula: '56735', team: 'Presencial' },
  { patterns: ['tania cristina', 'tania.flores'], key: 'op_56323', name: 'Tania Cristina Machado Flores', matricula: '56323', team: 'SMF / Presencial' },
  { patterns: ['izadora costa', 'isadora costa'], key: 'op_2090', name: 'Izadora Costa da Silveira', matricula: '2090', team: 'Presencial' },
  { patterns: ['bruna baier', 'bruna baptista'], key: 'bruna_baier_baptista', name: 'Bruna Baier Baptista', matricula: '56382', team: 'Central 156' },
  { patterns: ['bruna correa neves', 'bruna neves'], key: 'bruna_correa_neves', name: 'Bruna Correa Neves', matricula: '56597', team: 'Central 156' },
  { patterns: ['bruna fonseca vilanova', 'bruna vilanova'], key: 'bruna_fonseca_vilanova', name: 'Bruna Fonseca Vilanova', matricula: '19496', team: 'SMF / Presencial' },
  { patterns: ['bruno da silva ribeiro'], key: 'bruno_da_silva_ribeiro', name: 'Bruno da Silva Ribeiro', matricula: null, team: 'Central 156' },
  { patterns: ['leonardo de mattos menezes', 'leonardo menezes', 'leonardo.menezes'], key: 'leonardo_de_mattos_menezes', name: 'Leonardo de Mattos Menezes', matricula: '56427', team: 'Central 156' },
  { patterns: ['leonardo coelho de souza'], key: 'leonardo_coelho_de_souza', name: 'Leonardo Coelho de Souza', matricula: '19417', team: 'Central 156' },
  { patterns: ['gisele fagundes santos', 'gisele.santos'], key: 'gisele_fagundes_santos', name: 'Gisele Fagundes Santos', matricula: null, team: 'Central 156' },
  { patterns: ['cristiane.trois', 'cristiane trois'], key: 'cristiane_trois', name: 'Cristiane Trois', matricula: null, team: 'Central 156' },
  { patterns: ['francielli.almenida', 'francielli almeida'], key: 'francielli_almeida', name: 'Francielli Almeida', matricula: null, team: 'Central 156' },
  { patterns: ['gabrielle.longaray', 'gabrielle longaray'], key: 'gabrielle_longaray', name: 'Gabrielle Longaray', matricula: null, team: 'Central 156' },
  { patterns: ['larissa da silva franco', 'larissa franco'], key: 'larissa_da_silva_franco', name: 'Larissa da Silva Franco', matricula: '19401', team: 'Central 156' },
  { patterns: ['lucineia braga nunes'], key: 'lucineia_braga_nunes', name: 'Lucinéia Braga Nunes', matricula: null, team: 'Central 156' },
  { patterns: ['eduarda rodrigues gomes'], key: 'eduarda_rodrigues_gomes', name: 'Eduarda Rodrigues Gomes', matricula: null, team: 'Central 156' },
  { patterns: ['elisiane soares'], key: 'elisiane_soares', name: 'Elisiane Soares', matricula: '19441', team: 'SMF / Presencial' },
  { patterns: ['yago machado fontoura'], key: 'yago_machado_fontoura', name: 'Yago Machado Fontoura', matricula: null, team: 'Central 156' },
  { patterns: ['kamille cardoso da silva'], key: 'kamille_cardoso_da_silva', name: 'Kamille Cardoso da Silva', matricula: '100946', team: 'Central 156' },
  { patterns: ['shaiane de almeida carvalho'], key: 'shaiane_de_almeida_carvalho', name: 'Shaiane de Almeida Carvalho', matricula: '100947', team: 'Central 156' },
  { patterns: ['ana vitoria treptow xavier'], key: 'ana_vitoria_treptow_xavier', name: 'Ana Vitória Treptow Xavier', matricula: null, team: 'Central 156' },
  { patterns: ['joao victor marinho nichele'], key: 'joao_victor_marinho_nichele', name: 'João Victor Marinho Nichele', matricula: null, team: 'Central 156' },
  { patterns: ['vitor barbosa mota de souza'], key: 'vitor_barbosa_mota_de_souza', name: 'Vitor Barbosa Mota de Souza', matricula: null, team: 'Central 156' },
  { patterns: ['brenda da rosa trindade'], key: 'brenda_da_rosa_trindade', name: 'Brenda da Rosa Trindade', matricula: null, team: 'Central 156' },
  { patterns: ['camile simoes da silva'], key: 'camile_simoes_da_silva', name: 'Camile Simões da Silva', matricula: null, team: 'Central 156' },
  { patterns: ['lara julia vargas de andrades flores'], key: 'lara_julia_vargas_de_andrades_flores', name: 'Lara Júlia Vargas de Andrades Flores', matricula: null, team: 'Central 156' },
  { patterns: ['fabiana aragao clementel'], key: 'fabiana_aragao_clementel', name: 'Fabiana Aragão Clementel', matricula: null, team: 'Central 156' },
  { patterns: ['stephanie cristina da costa teixeira'], key: 'stephanie_cristina_da_costa_teixeira', name: 'Stephanie Cristina da Costa Teixeira', matricula: null, team: 'Central 156' },
  { patterns: ['andreia villela ilha da silva'], key: 'andreia_villela_ilha_da_silva', name: 'Andreia Villela Ilha da Silva', matricula: null, team: 'Central 156' },
  { patterns: ['cintia andrea azambuja'], key: 'cintia_andrea_azambuja', name: 'Cintia Andrea Azambuja', matricula: null, team: 'Central 156' },
  { patterns: ['fabio santos moraes duarte'], key: 'fabio_santos_moraes_duarte', name: 'Fábio Santos Moraes Duarte', matricula: null, team: 'Central 156' },
  { patterns: ['matheus vaz de oliveira'], key: 'matheus_vaz_de_oliveira', name: 'Matheus Vaz de Oliveira', matricula: null, team: 'Central 156' },
  { patterns: ['naesha tavares dias'], key: 'naesha_tavares_dias', name: 'Naesha Tavares Dias', matricula: null, team: 'Central 156' }
];

export const stripAccents = (str: string): string =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const resolveCanonicalOperator = (
  rawName: string,
  explicitMatricula?: string | null
): { operador_chave: string; operador_nome: string; matricula: string | null; equipe_turno: string } => {
  const cleanMat = explicitMatricula ? String(explicitMatricula).trim() : '';
  if (cleanMat) {
    const byMat = CANONICAL_OPERATOR_RULES.find(r => r.matricula === cleanMat);
    if (byMat) {
      return {
        operador_chave: byMat.key,
        operador_nome: byMat.name,
        matricula: byMat.matricula,
        equipe_turno: byMat.team
      };
    }
  }

  const norm = stripAccents(String(rawName || '')).toLowerCase().trim();
  for (const rule of CANONICAL_OPERATOR_RULES) {
    if (rule.patterns.some(p => norm.includes(p))) {
      return {
        operador_chave: rule.key,
        operador_nome: rule.name,
        matricula: cleanMat || rule.matricula,
        equipe_turno: rule.team
      };
    }
  }

  if (cleanMat) {
    return {
      operador_chave: `op_${cleanMat}`,
      operador_nome: formatOperatorDisplayName(rawName),
      matricula: cleanMat,
      equipe_turno: 'Central 156'
    };
  }

  const slug = norm.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'operador';
  return {
    operador_chave: slug,
    operador_nome: formatOperatorDisplayName(rawName),
    matricula: null,
    equipe_turno: 'Central 156'
  };
};

export const formatOperatorDisplayName = (rawName: string): string => {
  const cleaned = String(rawName || '').replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Operador';
  const lowerWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  return cleaned
    .split(' ')
    .map((w, idx) => {
      const low = w.toLowerCase();
      if (idx > 0 && lowerWords.has(low)) return low;
      return low.charAt(0).toUpperCase() + low.slice(1);
    })
    .join(' ');
};

// ==============================================================================
// CONVERSORES DE MÉTRICAS (TMA, PERCENTUAIS, DECIMAIS)
// ==============================================================================

export const normalizeTmaValue = (rawVal: any): { tma: string | null; tma_segundos: number | null; valid: boolean } => {
  if (rawVal === null || rawVal === undefined || rawVal === '' || rawVal === '-') {
    return { tma: null, tma_segundos: null, valid: true };
  }

  if (rawVal instanceof Date) {
    const h = rawVal.getHours();
    const m = rawVal.getMinutes();
    const s = rawVal.getSeconds();
    const total = h * 3600 + m * 60 + s;
    if (total <= 0) return { tma: null, tma_segundos: null, valid: true };
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return { tma: formatted, tma_segundos: total, valid: true };
  }

  if (typeof rawVal === 'number') {
    // Fração de dia do Excel (ex: 0.0028729 => 00:04:08)
    if (rawVal > 0 && rawVal < 1) {
      const totalSeconds = Math.round(rawVal * 86400);
      if (totalSeconds <= 0) return { tma: null, tma_segundos: null, valid: true };
      return { tma: secondsToTma(totalSeconds), tma_segundos: totalSeconds, valid: true };
    }
    // Segundos diretos
    if (rawVal >= 1 && rawVal < 86400) {
      const totalSeconds = Math.round(rawVal);
      return { tma: secondsToTma(totalSeconds), tma_segundos: totalSeconds, valid: true };
    }
    return { tma: null, tma_segundos: null, valid: false };
  }

  const str = String(rawVal).trim();
  if (!str || str === '00:00:00') {
    return { tma: null, tma_segundos: null, valid: true };
  }

  // Formato HH:MM:SS ou MM:SS
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const parts = str.split(':').map(Number);
    let h = 0, m = 0, s = 0;
    if (parts.length === 2) {
      m = parts[0];
      s = parts[1];
    } else {
      h = parts[0];
      m = parts[1];
      s = parts[2];
    }
    const total = h * 3600 + m * 60 + s;
    if (total <= 0) return { tma: null, tma_segundos: null, valid: true };
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return { tma: formatted, tma_segundos: total, valid: true };
  }

  // String numérica (notação científica ou decimal do Excel)
  const parsedNum = Number(str.replace(',', '.'));
  if (!Number.isNaN(parsedNum) && parsedNum > 0 && parsedNum < 1) {
    const totalSeconds = Math.round(parsedNum * 86400);
    return { tma: secondsToTma(totalSeconds), tma_segundos: totalSeconds, valid: true };
  }

  return { tma: null, tma_segundos: null, valid: false };
};

export const normalizeNumericMetric = (
  rawVal: any,
  digits = 2
): { value: number | null; valid: boolean } => {
  if (rawVal === null || rawVal === undefined || rawVal === '' || rawVal === '-') {
    return { value: null, valid: true };
  }
  if (typeof rawVal === 'number') {
    if (Number.isNaN(rawVal)) return { value: null, valid: false };
    return { value: Number(rawVal.toFixed(digits)), valid: true };
  }
  const clean = String(rawVal).replace('%', '').replace(',', '.').trim();
  if (!clean) return { value: null, valid: true };
  const num = Number(clean);
  if (Number.isNaN(num)) return { value: null, valid: false };
  return { value: Number(num.toFixed(digits)), valid: true };
};

// ==============================================================================
// FAROL DE METAS (SEMÁFORO VERDE / AMARELO / VERMELHO)
// ==============================================================================

export const loadSemaphoreGoals = (): MonthlySemaphoreGoals => {
  try {
    const raw = localStorage.getItem(SEMAPHORE_STORAGE_KEY);
    if (!raw) return DEFAULT_SEMAPHORE_GOALS;
    return { ...DEFAULT_SEMAPHORE_GOALS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SEMAPHORE_GOALS;
  }
};

export const syncSemaphoreGoalsFromCloud = async (
  supabase: SupabaseClient | null
): Promise<MonthlySemaphoreGoals> => {
  const local = loadSemaphoreGoals();
  if (!supabase) return local;
  try {
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'metas_semaforo_mensal')
      .maybeSingle();
    if (!error && data?.value && typeof data.value === 'object') {
      const merged: MonthlySemaphoreGoals = {
        ...DEFAULT_SEMAPHORE_GOALS,
        ...(data.value as Partial<MonthlySemaphoreGoals>)
      };
      localStorage.setItem(SEMAPHORE_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {
    // fallback local
  }
  return local;
};

export const saveSemaphoreGoals = async (
  supabase: SupabaseClient | null,
  goals: MonthlySemaphoreGoals,
  isAdmin: boolean
): Promise<{ error: string | null }> => {
  try {
    localStorage.setItem(SEMAPHORE_STORAGE_KEY, JSON.stringify(goals));
    if (supabase && isAdmin) {
      const { error } = await supabase
        .from('config')
        .upsert({ key: 'metas_semaforo_mensal', value: goals });
      if (error) {
        console.error('[MonthlyKpiService] Erro ao salvar metas do semáforo no Supabase:', error);
        return { error: error.message };
      }
    }
    return { error: null };
  } catch (e: any) {
    return { error: e.message || 'Erro ao salvar configuração de metas' };
  }
};

export const evaluateMetricSemaphore = (
  metric: 'monitoria' | 'nps' | 'tma' | 'abs',
  value: number | string | null | undefined,
  goals: MonthlySemaphoreGoals
): SemaphoreLevel => {
  if (value === null || value === undefined || value === '' || value === '-') {
    return 'neutral';
  }

  if (metric === 'tma') {
    const sec = typeof value === 'number' ? value : tmaToSeconds(String(value));
    if (sec <= 0) return 'neutral';
    const metaSec = tmaToSeconds(goals.tma.meta);
    const atencaoSec = tmaToSeconds(goals.tma.atencao);
    if (sec <= metaSec) return 'green';
    if (sec <= atencaoSec) return 'yellow';
    return 'red';
  }

  const num = Number(value);
  if (Number.isNaN(num)) return 'neutral';

  if (metric === 'abs') {
    // abs pode estar em fração (0 a 1) ou percentual (0 a 100)
    const pct = num <= 1.5 ? num * 100 : num;
    if (pct >= goals.abs.meta) return 'green';
    if (pct >= goals.abs.atencao) return 'yellow';
    return 'red';
  }

  const rule = metric === 'monitoria' ? goals.monitoria : goals.nps;
  if (num >= rule.meta) return 'green';
  if (num >= rule.atencao) return 'yellow';
  return 'red';
};

// ==============================================================================
// PERSISTÊNCIA SUPABASE + CACHE EM MEMÓRIA E FALLBACK SEGURO EM PUBLIC.CONFIG
// ==============================================================================

const getConfigFallbackKey = (ano: number, mes: number) =>
  `monthly_kpis_${ano}_${String(mes).padStart(2, '0')}`;

const saveLocalMonthCache = (ano: number, mes: number, records: MonthlyKpiRecord[]) => {
  const key = getCompetenciaKey(ano, mes);
  monthMemoryCache.set(key, records);
  try {
    localStorage.setItem(LOCAL_CACHE_PREFIX + key, JSON.stringify(records));
  } catch {
    // Ignora quota de localStorage se excedida
  }
};

const loadLocalMonthCache = (ano: number, mes: number): MonthlyKpiRecord[] | null => {
  const key = getCompetenciaKey(ano, mes);
  if (monthMemoryCache.has(key)) {
    return monthMemoryCache.get(key)!;
  }
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        monthMemoryCache.set(key, parsed);
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
};

export const getInitialSeedForMonth = (ano: number, mes: number): MonthlyKpiRecord[] => {
  return INITIAL_MONTHLY_KPIS.filter(r => r.ano === ano && r.mes === mes).sort((a, b) =>
    a.operador_nome.localeCompare(b.operador_nome, 'pt-BR')
  );
};

export const getAvailableSeedCompetencias = (): Array<{ ano: number; mes: number }> => {
  const seen = new Set<string>();
  const list: Array<{ ano: number; mes: number }> = [];
  for (const r of INITIAL_MONTHLY_KPIS) {
    const k = getCompetenciaKey(r.ano, r.mes);
    if (!seen.has(k)) {
      seen.add(k);
      list.push({ ano: r.ano, mes: r.mes });
    }
  }
  return list.sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));
};

/**
 * Busca os KPIs de um mês específico filtrando server-side (ano, mes).
 * Usa cache em memória para não repetir chamadas ao alternar abas.
 */
export const fetchMonthKpis = async (
  supabase: SupabaseClient | null,
  ano: number,
  mes: number,
  options?: { forceRefresh?: boolean; isAdmin?: boolean }
): Promise<{
  data: MonthlyKpiRecord[];
  error: string | null;
  usingFallbackTable: boolean;
}> => {
  const key = getCompetenciaKey(ano, mes);

  if (!options?.forceRefresh && monthMemoryCache.has(key)) {
    return {
      data: monthMemoryCache.get(key)!,
      error: null,
      usingFallbackTable: tableExistsState === 'missing'
    };
  }

  if (!supabase) {
    const seed = loadLocalMonthCache(ano, mes) || getInitialSeedForMonth(ano, mes);
    saveLocalMonthCache(ano, mes, seed);
    return { data: seed, error: null, usingFallbackTable: true };
  }

  // 1. Tenta consultar a tabela dedicada public.monthly_kpis com filtro Server-Side (ano, mes)
  if (tableExistsState !== 'missing') {
    const { data, error } = await supabase
      .from('monthly_kpis')
      .select(MONTHLY_KPI_COLS)
      .eq('ano', ano)
      .eq('mes', mes)
      .order('operador_nome', { ascending: true });

    if (!error && data) {
      tableExistsState = 'exists';

      // Se a tabela existe mas este mês da planilha inicial ainda não foi populado no banco,
      // fazemos o Batch Upsert automático da base inicial para este mês
      if (data.length === 0) {
        const seedRows = getInitialSeedForMonth(ano, mes);
        const alreadyCleared = localStorage.getItem(`${LOCAL_CACHE_PREFIX}cleared_${key}`) === '1';

        if (seedRows.length > 0 && !alreadyCleared && options?.isAdmin) {
          const payload = seedRows.map(({ id, ...rest }) => rest);
          const { data: inserted, error: seedErr } = await supabase
            .from('monthly_kpis')
            .upsert(payload, { onConflict: 'ano,mes,operador_chave' })
            .select(MONTHLY_KPI_COLS);

          if (!seedErr && inserted) {
            const sorted = [...(inserted as MonthlyKpiRecord[])].sort((a, b) =>
              a.operador_nome.localeCompare(b.operador_nome, 'pt-BR')
            );
            saveLocalMonthCache(ano, mes, sorted);
            return { data: sorted, error: null, usingFallbackTable: false };
          }
        }

        if (seedRows.length > 0 && !alreadyCleared) {
          saveLocalMonthCache(ano, mes, seedRows);
          return { data: seedRows, error: null, usingFallbackTable: false };
        }
      }

      const records = data as MonthlyKpiRecord[];
      saveLocalMonthCache(ano, mes, records);
      return { data: records, error: null, usingFallbackTable: false };
    }

    // Verifica se o erro é porque a tabela public.monthly_kpis ainda não foi criada no SQL Editor
    if (error && (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('monthly_kpis'))) {
      tableExistsState = 'missing';
      console.warn('[MonthlyKpiService] Tabela public.monthly_kpis ainda não criada no Supabase. Usando persistência Cloud por competência em public.config.');
    } else if (error) {
      console.error('[MonthlyKpiService] Erro ao buscar KPIs do mês:', error);
      const cached = loadLocalMonthCache(ano, mes) || getInitialSeedForMonth(ano, mes);
      return { data: cached, error: error.message, usingFallbackTable: false };
    }
  }

  // 2. Fallback Cloud no Supabase via public.config (filtrado Server-Side pela chave do mês)
  try {
    const cfgKey = getConfigFallbackKey(ano, mes);
    const { data: cfgData, error: cfgError } = await supabase
      .from('config')
      .select('value')
      .eq('key', cfgKey)
      .maybeSingle();

    if (cfgError) {
      console.error('[MonthlyKpiService] Erro na leitura de fallback config:', cfgError);
    }

    if (cfgData?.value && Array.isArray(cfgData.value)) {
      const records = (cfgData.value as MonthlyKpiRecord[]).sort((a, b) =>
        a.operador_nome.localeCompare(b.operador_nome, 'pt-BR')
      );
      saveLocalMonthCache(ano, mes, records);
      return { data: records, error: null, usingFallbackTable: true };
    }

    // Se ainda não está gravado no Supabase config e existe na planilha inicial anexada, sincroniza automaticamente
    const seedRows = getInitialSeedForMonth(ano, mes);
    if (seedRows.length > 0 && options?.isAdmin) {
      await supabase.from('config').upsert({ key: cfgKey, value: seedRows });
    }
    saveLocalMonthCache(ano, mes, seedRows);
    return { data: seedRows, error: null, usingFallbackTable: true };
  } catch (e: any) {
    const seedRows = loadLocalMonthCache(ano, mes) || getInitialSeedForMonth(ano, mes);
    return { data: seedRows, error: e.message || 'Erro de conexão', usingFallbackTable: true };
  }
};

/**
 * Salva (Incluir ou Editar) um único registro de operador dentro de um mês específico,
 * sem afetar nenhum outro mês.
 */
export const saveSingleMonthlyKpi = async (
  supabase: SupabaseClient | null,
  record: MonthlyKpiRecord
): Promise<{ data: MonthlyKpiRecord | null; error: string | null }> => {
  const canonical = resolveCanonicalOperator(record.operador_nome, record.matricula);
  const tmaParsed = normalizeTmaValue(record.tma);

  const cleanRecord: MonthlyKpiRecord = {
    id: record.id,
    ano: Number(record.ano),
    mes: Number(record.mes),
    operador_chave: record.operador_chave || canonical.operador_chave,
    operador_nome: record.operador_nome.trim(),
    matricula: record.matricula ? String(record.matricula).trim() : canonical.matricula,
    monitoria: record.monitoria !== null && record.monitoria !== undefined ? Number(record.monitoria) : null,
    tma: tmaParsed.tma,
    tma_segundos: tmaParsed.tma_segundos,
    nps: record.nps !== null && record.nps !== undefined ? Number(record.nps) : null,
    abs: record.abs !== null && record.abs !== undefined ? Number(record.abs) : null,
    equipe_turno: record.equipe_turno?.trim() || canonical.equipe_turno || 'Central 156',
    status_mes: record.status_mes || 'Ativo',
    observacoes: record.observacoes?.trim() || null,
    updated_at: new Date().toISOString()
  };

  if (!supabase) {
    return { data: null, error: 'Cliente Supabase não inicializado.' };
  }

  if (tableExistsState !== 'missing') {
    const payload = {
      ano: cleanRecord.ano,
      mes: cleanRecord.mes,
      operador_chave: cleanRecord.operador_chave,
      operador_nome: cleanRecord.operador_nome,
      matricula: cleanRecord.matricula,
      monitoria: cleanRecord.monitoria,
      tma: cleanRecord.tma,
      tma_segundos: cleanRecord.tma_segundos,
      nps: cleanRecord.nps,
      abs: cleanRecord.abs,
      equipe_turno: cleanRecord.equipe_turno,
      status_mes: cleanRecord.status_mes,
      observacoes: cleanRecord.observacoes
    };

    const { data, error } = await supabase
      .from('monthly_kpis')
      .upsert(payload, { onConflict: 'ano,mes,operador_chave' })
      .select(MONTHLY_KPI_COLS)
      .single();

    if (!error && data) {
      tableExistsState = 'exists';
      invalidateMonthlyCache(cleanRecord.ano, cleanRecord.mes, cleanRecord.operador_chave);
      return { data: data as MonthlyKpiRecord, error: null };
    }

    if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
      console.error('[MonthlyKpiService] Erro ao salvar registro mensal:', error);
      return { data: null, error: error.message };
    }
    tableExistsState = 'missing';
  }

  // Fallback Cloud via public.config
  const currentRes = await fetchMonthKpis(supabase, cleanRecord.ano, cleanRecord.mes);
  const currentList = currentRes.data || [];
  const existsIdx = currentList.findIndex(r => r.operador_chave === cleanRecord.operador_chave);
  const withId: MonthlyKpiRecord = {
    ...cleanRecord,
    id: cleanRecord.id || `cfg_${cleanRecord.ano}_${cleanRecord.mes}_${cleanRecord.operador_chave}`
  };

  const nextList =
    existsIdx >= 0
      ? currentList.map((item, i) => (i === existsIdx ? withId : item))
      : [...currentList, withId];

  nextList.sort((a, b) => a.operador_nome.localeCompare(b.operador_nome, 'pt-BR'));

  const cfgKey = getConfigFallbackKey(cleanRecord.ano, cleanRecord.mes);
  const { error: cfgErr } = await supabase.from('config').upsert({ key: cfgKey, value: nextList });
  if (cfgErr) {
    console.error('[MonthlyKpiService] Erro ao salvar no Supabase (config):', cfgErr);
    return { data: null, error: cfgErr.message };
  }

  invalidateMonthlyCache(cleanRecord.ano, cleanRecord.mes, cleanRecord.operador_chave);
  saveLocalMonthCache(cleanRecord.ano, cleanRecord.mes, nextList);
  return { data: withId, error: null };
};

/**
 * Exclui um operador APENAS do mês especificado, sem causar nenhum impacto
 * nos meses anteriores ou posteriores.
 */
export const deleteMonthlyKpiRecord = async (
  supabase: SupabaseClient | null,
  ano: number,
  mes: number,
  operadorChave: string
): Promise<{ error: string | null }> => {
  if (!supabase) return { error: 'Cliente Supabase não inicializado.' };

  if (tableExistsState !== 'missing') {
    const { error } = await supabase
      .from('monthly_kpis')
      .delete()
      .eq('ano', ano)
      .eq('mes', mes)
      .eq('operador_chave', operadorChave);

    if (!error) {
      invalidateMonthlyCache(ano, mes, operadorChave);
      return { error: null };
    }

    if (error.code !== 'PGRST205' && error.code !== '42P01') {
      console.error('[MonthlyKpiService] Erro ao excluir registro mensal:', error);
      return { error: error.message };
    }
    tableExistsState = 'missing';
  }

  // Fallback Cloud via public.config
  const currentRes = await fetchMonthKpis(supabase, ano, mes);
  const nextList = (currentRes.data || []).filter(r => r.operador_chave !== operadorChave);
  if (nextList.length === 0) {
    localStorage.setItem(`${LOCAL_CACHE_PREFIX}cleared_${getCompetenciaKey(ano, mes)}`, '1');
  }

  const cfgKey = getConfigFallbackKey(ano, mes);
  const { error: cfgErr } = await supabase.from('config').upsert({ key: cfgKey, value: nextList });
  if (cfgErr) {
    console.error('[MonthlyKpiService] Erro ao excluir no Supabase (config):', cfgErr);
    return { error: cfgErr.message };
  }

  invalidateMonthlyCache(ano, mes, operadorChave);
  saveLocalMonthCache(ano, mes, nextList);
  return { error: null };
};

/**
 * Gravação em Lote (Batch Upsert) por mês/aba:
 * - mode === 'merge': mescla/atualiza registros existentes usando UNIQUE (ano, mes, operador_chave)
 * - mode === 'replace': substitui todos os registros daquele mês específico
 */
export const batchUpsertMonthKpis = async (
  supabase: SupabaseClient | null,
  ano: number,
  mes: number,
  records: MonthlyKpiRecord[],
  mode: ImportMode
): Promise<{ count: number; error: string | null }> => {
  if (!supabase) return { count: 0, error: 'Cliente Supabase não inicializado.' };

  // Deduplica por operador_chave dentro do mesmo lote para evitar erro do Postgres no ON CONFLICT
  const dedupMap = new Map<string, MonthlyKpiRecord>();
  for (const r of records) {
    const canonical = resolveCanonicalOperator(r.operador_nome, r.matricula);
    const tmaParsed = normalizeTmaValue(r.tma);
    const key = r.operador_chave || canonical.operador_chave;
    dedupMap.set(key, {
      ano,
      mes,
      operador_chave: key,
      operador_nome: r.operador_nome.trim(),
      matricula: r.matricula ? String(r.matricula).trim() : canonical.matricula,
      monitoria: r.monitoria !== null && r.monitoria !== undefined ? Number(r.monitoria) : null,
      tma: tmaParsed.tma,
      tma_segundos: tmaParsed.tma_segundos,
      nps: r.nps !== null && r.nps !== undefined ? Number(r.nps) : null,
      abs: r.abs !== null && r.abs !== undefined ? Number(r.abs) : null,
      equipe_turno: r.equipe_turno || canonical.equipe_turno || 'Central 156',
      status_mes: r.status_mes || 'Ativo',
      observacoes: r.observacoes || null
    });
  }

  const cleanBatch = Array.from(dedupMap.values());

  if (tableExistsState !== 'missing') {
    if (mode === 'replace') {
      const { error: delErr } = await supabase
        .from('monthly_kpis')
        .delete()
        .eq('ano', ano)
        .eq('mes', mes);

      if (delErr && delErr.code !== 'PGRST205' && delErr.code !== '42P01') {
        console.error('[MonthlyKpiService] Erro ao limpar mês para substituição:', delErr);
        return { count: 0, error: delErr.message };
      }
    }

    if (cleanBatch.length > 0) {
      const { data, error } = await supabase
        .from('monthly_kpis')
        .upsert(cleanBatch, { onConflict: 'ano,mes,operador_chave' })
        .select(MONTHLY_KPI_COLS);

      if (!error && data) {
        tableExistsState = 'exists';
        invalidateMonthlyCache(ano, mes);
        return { count: data.length, error: null };
      }

      if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
        console.error('[MonthlyKpiService] Erro no Batch Upsert:', error);
        return { count: 0, error: error.message };
      }
      tableExistsState = 'missing';
    } else if (mode === 'replace') {
      invalidateMonthlyCache(ano, mes);
      return { count: 0, error: null };
    }
  }

  // Fallback Cloud via public.config (1 único upsert em lote por mês)
  let finalRecords: MonthlyKpiRecord[] = [];
  if (mode === 'replace') {
    finalRecords = cleanBatch.map(r => ({
      ...r,
      id: `cfg_${ano}_${mes}_${r.operador_chave}`
    }));
  } else {
    const existingRes = await fetchMonthKpis(supabase, ano, mes);
    const mergedMap = new Map<string, MonthlyKpiRecord>();
    for (const oldRec of existingRes.data || []) {
      mergedMap.set(oldRec.operador_chave, oldRec);
    }
    for (const newRec of cleanBatch) {
      const prev = mergedMap.get(newRec.operador_chave);
      mergedMap.set(newRec.operador_chave, {
        ...prev,
        ...newRec,
        id: prev?.id || `cfg_${ano}_${mes}_${newRec.operador_chave}`
      });
    }
    finalRecords = Array.from(mergedMap.values());
  }

  finalRecords.sort((a, b) => a.operador_nome.localeCompare(b.operador_nome, 'pt-BR'));

  const cfgKey = getConfigFallbackKey(ano, mes);
  const { error: cfgErr } = await supabase.from('config').upsert({ key: cfgKey, value: finalRecords });
  if (cfgErr) {
    console.error('[MonthlyKpiService] Erro no Batch Upsert via config:', cfgErr);
    return { count: 0, error: cfgErr.message };
  }

  invalidateMonthlyCache(ano, mes);
  saveLocalMonthCache(ano, mes, finalRecords);
  return { count: cleanBatch.length, error: null };
};

/**
 * Busca sob demanda (On-Demand) o histórico evolutivo de um operador ao longo dos meses
 * em que possui registro, usando o índice composto (operador_chave, ano, mes).
 */
export const fetchOperatorMonthlyHistory = async (
  supabase: SupabaseClient | null,
  operadorChave: string
): Promise<{ data: MonthlyKpiRecord[]; error: string | null }> => {
  if (operatorHistoryMemoryCache.has(operadorChave)) {
    return { data: operatorHistoryMemoryCache.get(operadorChave)!, error: null };
  }

  if (supabase && tableExistsState !== 'missing') {
    const { data, error } = await supabase
      .from('monthly_kpis')
      .select(MONTHLY_KPI_COLS)
      .eq('operador_chave', operadorChave)
      .order('ano', { ascending: true })
      .order('mes', { ascending: true });

    if (!error && data && data.length > 0) {
      const list = data as MonthlyKpiRecord[];
      operatorHistoryMemoryCache.set(operadorChave, list);
      return { data: list, error: null };
    }

    if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
      console.error('[MonthlyKpiService] Erro ao buscar histórico do operador:', error);
    }
  }

  // Combina registros do cache em memória + seed inicial para o operador_chave
  const byComp = new Map<string, MonthlyKpiRecord>();
  for (const r of INITIAL_MONTHLY_KPIS) {
    if (r.operador_chave === operadorChave) {
      byComp.set(getCompetenciaKey(r.ano, r.mes), r);
    }
  }

  for (const [compKey, monthList] of monthMemoryCache.entries()) {
    const found = monthList.find(r => r.operador_chave === operadorChave);
    if (found) {
      byComp.set(compKey, found);
    } else {
      byComp.delete(compKey);
    }
  }

  const history = Array.from(byComp.values()).sort((a, b) =>
    a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
  );

  operatorHistoryMemoryCache.set(operadorChave, history);
  return { data: history, error: null };
};

/**
 * Busca todos os KPIs de um ano inteiro em 1 única consulta leve ao banco,
 * combinando registros salvos no Supabase (monthly_kpis ou config) com o seed inicial
 * para meses ainda não gravados no banco. Usado pelo Dashboard para evolução anual real.
 */
export const fetchYearKpis = async (
  supabase: SupabaseClient | null,
  ano: number,
  options?: { forceRefresh?: boolean }
): Promise<{ data: MonthlyKpiRecord[]; error: string | null }> => {
  if (!options?.forceRefresh && yearMemoryCache.has(ano)) {
    return { data: yearMemoryCache.get(ano)!, error: null };
  }

  const byMonth = new Map<number, MonthlyKpiRecord[]>();

  if (supabase && tableExistsState !== 'missing') {
    const { data, error } = await supabase
      .from('monthly_kpis')
      .select(MONTHLY_KPI_COLS)
      .eq('ano', ano)
      .order('mes', { ascending: true })
      .order('operador_nome', { ascending: true });

    if (!error && data) {
      tableExistsState = 'exists';
      for (const row of data as MonthlyKpiRecord[]) {
        const list = byMonth.get(row.mes) || [];
        list.push(row);
        byMonth.set(row.mes, list);
      }
    } else if (error && (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('monthly_kpis'))) {
      tableExistsState = 'missing';
    }
  }

  if (supabase && tableExistsState === 'missing') {
    try {
      const { data: cfgRows } = await supabase
        .from('config')
        .select('key, value')
        .like('key', `monthly_kpis_${ano}_%`);

      if (cfgRows) {
        for (const row of cfgRows) {
          const match = String(row.key || '').match(/monthly_kpis_\d{4}_(\d{2})/);
          if (match && Array.isArray(row.value)) {
            const mesNum = Number(match[1]);
            byMonth.set(mesNum, row.value as MonthlyKpiRecord[]);
          }
        }
      }
    } catch {
      // fallback para cache local / seed abaixo
    }
  }

  const allRecords: MonthlyKpiRecord[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = getCompetenciaKey(ano, m);
    if (byMonth.has(m)) {
      const monthRows = byMonth.get(m)!;
      saveLocalMonthCache(ano, m, monthRows);
      allRecords.push(...monthRows);
    } else {
      const alreadyCleared = typeof localStorage !== 'undefined' && localStorage.getItem(`${LOCAL_CACHE_PREFIX}cleared_${key}`) === '1';
      if (alreadyCleared) continue;
      const fallback = loadLocalMonthCache(ano, m) || getInitialSeedForMonth(ano, m);
      allRecords.push(...fallback);
    }
  }

  yearMemoryCache.set(ano, allRecords);
  return { data: allRecords, error: null };
};

// ==============================================================================
// MOTOR DE SINCRONIZAÇÃO BIDIRECIONAL: SNAPSHOT MENSAL <-> EQUIPE / FICHA / 90° / PDI
// ==============================================================================

export const findMatchingOperatorIndex = (
  operators: Operator[],
  target: { matricula?: string | null; operador_chave: string; operador_nome: string }
): number => {
  const cleanMat = target.matricula ? String(target.matricula).trim() : '';
  if (cleanMat) {
    const byMat = operators.findIndex(op => String(op.registration || '').trim() === cleanMat);
    if (byMat >= 0) return byMat;
  }

  const byCanonical = operators.findIndex(op => {
    const canonical = resolveCanonicalOperator(op.name, op.registration);
    return canonical.operador_chave === target.operador_chave;
  });
  if (byCanonical >= 0) return byCanonical;

  const byKeyAsReg = operators.findIndex(
    op => String(op.registration || '').trim() === target.operador_chave
  );
  if (byKeyAsReg >= 0) return byKeyAsReg;

  const normTargetName = stripAccents(String(target.operador_nome || '')).toLowerCase().trim();
  if (normTargetName) {
    const byName = operators.findIndex(
      op => stripAccents(String(op.name || '')).toLowerCase().trim() === normTargetName
    );
    if (byName >= 0) return byName;

    // Fallback seguro por primeiro + último nome (ex: "Bruna Neves" vs "Bruna Correa Neves"), apenas se houver correspondência única
    const targetParts = normTargetName.split(/\s+/).filter(Boolean);
    if (targetParts.length >= 2) {
      const targetFirstLast = `${targetParts[0]} ${targetParts[targetParts.length - 1]}`;
      const matchedIndices = operators
        .map((op, idx) => {
          const parts = stripAccents(String(op.name || '')).toLowerCase().trim().split(/\s+/).filter(Boolean);
          if (parts.length < 2) return -1;
          const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
          return firstLast === targetFirstLast ? idx : -1;
        })
        .filter(idx => idx >= 0);

      if (matchedIndices.length === 1) return matchedIndices[0];
    }
  }

  return -1;
};

const parseTeamAttributes = (
  equipeTurno?: string | null,
  existing?: Operator
): { workMode: WorkMode; classification: OperatorClassification } => {
  const norm = stripAccents(String(equipeTurno || '')).toLowerCase();

  let workMode = existing?.workMode || WorkMode.PRESENTIAL;
  if (norm.includes('home')) {
    workMode = WorkMode.HOME_OFFICE;
  } else if (norm.includes('presencial')) {
    workMode = WorkMode.PRESENTIAL;
  }

  let classification = existing?.classification || OperatorClassification.OUTROS;
  if (norm.includes('smf')) {
    classification = OperatorClassification.SMF;
  }

  return { workMode, classification };
};

const getLatestCompetenciaStr = (op: Operator): string => {
  if (!op.kpis || op.kpis.length === 0) return '0000-00';
  return op.kpis.reduce((max, k) => (k.month > max ? k.month : max), '0000-00');
};

const hasValidKpiMetrics = (rec: MonthlyKpiRecord): boolean => {
  const hasTma = !!(rec.tma && rec.tma !== '00:00:00');
  const hasNps = rec.nps !== null && rec.nps !== undefined;
  const hasMon = rec.monitoria !== null && rec.monitoria !== undefined;
  return hasTma || hasNps || hasMon;
};

const isSameKpiValues = (a: KPI | undefined, rec: MonthlyKpiRecord): boolean => {
  if (!a) return false;
  const recTma = rec.tma && rec.tma !== '00:00:00' ? rec.tma : null;
  const aTma = a.tma && a.tma !== '00:00:00' ? a.tma : null;
  const recNps = rec.nps !== null && rec.nps !== undefined ? Number(rec.nps) : null;
  const aNps = a.nps !== null && a.nps !== undefined ? Number(a.nps) : null;
  const recMon = rec.monitoria !== null && rec.monitoria !== undefined ? Number(rec.monitoria) : null;
  const aMon = a.monitoria !== null && a.monitoria !== undefined ? Number(a.monitoria) : null;
  return aTma === recTma && aNps === recNps && aMon === recMon;
};

/**
 * Mescla registros mensais (da importação Excel ou lançamento manual em Indicadores)
 * diretamente na lista global de operadores (`public.operators`), criando novos
 * colaboradores quando ainda não existem e atualizando seus KPIs, modalidade e status.
 */
export const mergeMonthlyRecordsIntoOperators = (
  currentOperators: Operator[],
  records: MonthlyKpiRecord[],
  options?: {
    mode?: ImportMode;
    affectedCompetencias?: Array<{ ano: number; mes: number }>;
    syncStatus?: boolean;
  }
): { updatedOperators: Operator[]; changedOperators: Operator[] } => {
  const shouldSyncStatus = options?.syncStatus !== false;
  const nextList: Operator[] = currentOperators.map(op => ({
    ...op,
    kpis: [...(op.kpis || [])]
  }));
  const changedRegs = new Set<string>();

  // Em modo 'replace', remove o KPI dos meses substituídos para operadores que não vieram na nova planilha
  if (options?.mode === 'replace' && options.affectedCompetencias && options.affectedCompetencias.length > 0) {
    const keysByMonth = new Map<string, Set<string>>();
    for (const comp of options.affectedCompetencias) {
      keysByMonth.set(getCompetenciaKey(comp.ano, comp.mes), new Set<string>());
    }
    for (const rec of records) {
      const mKey = getCompetenciaKey(rec.ano, rec.mes);
      keysByMonth.get(mKey)?.add(rec.operador_chave);
      if (rec.matricula) {
        keysByMonth.get(mKey)?.add(String(rec.matricula).trim());
      }
    }

    for (const op of nextList) {
      const cleanReg = String(op.registration).trim();
      const canonical = resolveCanonicalOperator(op.name, cleanReg);
      let modified = false;

      const filteredKpis = op.kpis.filter(k => {
        const allowedKeys = keysByMonth.get(k.month);
        if (!allowedKeys) return true;
        const stays = allowedKeys.has(cleanReg) || allowedKeys.has(canonical.operador_chave);
        if (!stays) modified = true;
        return stays;
      });

      if (modified) {
        op.kpis = filteredKpis;
        changedRegs.add(cleanReg);
      }
    }
  }

  // Descobre a competência mais recente por operador dentro do próprio lote recebido
  const latestBatchMonthByTarget = new Map<string, string>();
  for (const rec of records) {
    const mKey = getCompetenciaKey(rec.ano, rec.mes);
    const idKey = rec.operador_chave || String(rec.matricula || rec.operador_nome);
    const prev = latestBatchMonthByTarget.get(idKey) || '0000-00';
    if (mKey > prev) latestBatchMonthByTarget.set(idKey, mKey);
  }

  const usedRegistrations = new Set<string>(
    nextList.map(o => String(o.registration || '').trim()).filter(Boolean)
  );

  for (const rec of records) {
    const monthStr = getCompetenciaKey(rec.ano, rec.mes);
    const hasMetrics = hasValidKpiMetrics(rec);
    const idx = findMatchingOperatorIndex(nextList, rec);

    if (idx === -1) {
      // Cria automaticamente novo colaborador na Gestão de Equipe
      let regCandidate =
        (rec.matricula && String(rec.matricula).trim()) ||
        rec.operador_chave.replace(/^op_/, '') ||
        rec.operador_chave;

      if (!regCandidate || usedRegistrations.has(regCandidate)) {
        regCandidate = rec.operador_chave;
      }
      if (usedRegistrations.has(regCandidate)) {
        let suffix = 2;
        while (usedRegistrations.has(`${regCandidate}_${suffix}`)) suffix++;
        regCandidate = `${regCandidate}_${suffix}`;
      }
      usedRegistrations.add(regCandidate);

      const { workMode, classification } = parseTeamAttributes(rec.equipe_turno);
      const newKpis: KPI[] = hasMetrics
        ? [
            {
              id: `kpi_${monthStr}_${regCandidate}`,
              month: monthStr,
              tma: rec.tma && rec.tma !== '00:00:00' ? rec.tma : null,
              nps: rec.nps !== null && rec.nps !== undefined ? Number(rec.nps) : null,
              monitoria: rec.monitoria !== null && rec.monitoria !== undefined ? Number(rec.monitoria) : null,
              abs: rec.abs !== null && rec.abs !== undefined ? Number(rec.abs) : null,
              createdAt: rec.updated_at || new Date().toISOString()
            }
          ]
        : [];

      const newOperator: Operator = {
        registration: regCandidate,
        name: formatOperatorDisplayName(rec.operador_nome),
        admissionDate: new Date().toLocaleDateString('pt-BR'),
        role: 'Op. Receptivo 1',
        linkType: LinkType.EFETIVO,
        costCenter: 'CENTRAL 156',
        classification,
        workMode,
        birthDate: '',
        active: (rec.status_mes || 'Ativo') === 'Ativo',
        kpis: newKpis,
        feedbacks: [],
        documents: []
      };

      nextList.push(newOperator);
      changedRegs.add(regCandidate);
      continue;
    }

    const op = nextList[idx];
    const cleanReg = String(op.registration).trim();
    const latestExisting = getLatestCompetenciaStr(op);
    const idKey = rec.operador_chave || String(rec.matricula || rec.operador_nome);
    const latestInBatch = latestBatchMonthByTarget.get(idKey) || monthStr;
    const isLatestForOperator = monthStr >= latestExisting && monthStr >= latestInBatch;

    let opChanged = false;

    // 1. Atualiza ou insere o KPI da competência YYYY-MM dentro de op.kpis
    const monthMatches = op.kpis.filter(k => k.month === monthStr);
    const latestMonthKpi =
      monthMatches.length > 0
        ? monthMatches.reduce((lat, cur) => {
            if (!lat.createdAt) return cur;
            if (!cur.createdAt) return lat;
            return new Date(cur.createdAt) > new Date(lat.createdAt) ? cur : lat;
          }, monthMatches[0])
        : undefined;

    if (hasMetrics) {
      if (!isSameKpiValues(latestMonthKpi, rec) || monthMatches.length > 1) {
        const updatedKpi: KPI = {
          id: latestMonthKpi?.id || `kpi_${monthStr}_${cleanReg}`,
          month: monthStr,
          tma: rec.tma && rec.tma !== '00:00:00' ? rec.tma : null,
          nps: rec.nps !== null && rec.nps !== undefined ? Number(rec.nps) : null,
          monitoria: rec.monitoria !== null && rec.monitoria !== undefined ? Number(rec.monitoria) : null,
          abs: rec.abs !== null && rec.abs !== undefined ? Number(rec.abs) : null,
          createdAt: new Date().toISOString()
        };
        op.kpis = [...op.kpis.filter(k => k.month !== monthStr), updatedKpi];
        opChanged = true;
      }
    } else if (monthMatches.length > 0) {
      op.kpis = op.kpis.filter(k => k.month !== monthStr);
      opChanged = true;
    }

    // 2. Sincroniza status Ativo/Inativo, Modalidade e Atribuição quando é a competência mais recente
    if (isLatestForOperator && shouldSyncStatus) {
      const shouldBeActive = (rec.status_mes || 'Ativo') === 'Ativo';
      if ((op.active !== false) !== shouldBeActive) {
        op.active = shouldBeActive;
        opChanged = true;
      }

      const { workMode, classification } = parseTeamAttributes(rec.equipe_turno, op);
      if (op.workMode !== workMode) {
        op.workMode = workMode;
        opChanged = true;
      }
      if (op.classification !== classification) {
        op.classification = classification;
        opChanged = true;
      }
    }

    if (opChanged) {
      changedRegs.add(cleanReg);
    }
  }

  nextList.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const changedOperators = nextList.filter(o => changedRegs.has(String(o.registration).trim()));

  return { updatedOperators: nextList, changedOperators };
};

/**
 * Remove o lançamento de um mês específico (YYYY-MM) de dentro de operator.kpis
 * quando o operador é excluído daquela competência na aba Indicadores.
 */
export const removeMonthFromOperatorKpis = (
  currentOperators: Operator[],
  ano: number,
  mes: number,
  target: { matricula?: string | null; operador_chave: string; operador_nome: string }
): Operator | null => {
  const idx = findMatchingOperatorIndex(currentOperators, target);
  if (idx === -1) return null;

  const op = currentOperators[idx];
  const monthStr = getCompetenciaKey(ano, mes);
  if (!op.kpis?.some(k => k.month === monthStr)) return null;

  return {
    ...op,
    kpis: op.kpis.filter(k => k.month !== monthStr)
  };
};

// ==============================================================================
// PARSER DE PLANILHA EXCEL (.XLSX / .XLS) COM PREVIEW E VALIDAÇÃO
// ==============================================================================

const MONTH_NAME_MAP: Record<string, number> = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  marco: 3, mar: 3,
  abril: 4, abr: 4,
  maio: 5, mai: 5,
  junho: 6, jun: 6,
  julho: 7, jul: 7,
  agosto: 8, ago: 8,
  setembro: 9, set: 9,
  outubro: 10, out: 10,
  novembro: 11, nov: 11,
  dezembro: 12, dez: 12
};

export const detectSheetCompetencia = (
  sheetName: string,
  fallbackAno: number,
  fallbackMes: number
): { ano: number; mes: number } => {
  const norm = stripAccents(sheetName).toLowerCase().trim();

  // Padrão YYYY-MM ou MM-YYYY ou MM/YYYY
  const ymMatch = norm.match(/(20\d{2})[-/_](\d{1,2})/);
  if (ymMatch) {
    const y = Number(ymMatch[1]);
    const m = Number(ymMatch[2]);
    if (m >= 1 && m <= 12) return { ano: y, mes: m };
  }

  const myMatch = norm.match(/(\d{1,2})[-/_](20\d{2})/);
  if (myMatch) {
    const m = Number(myMatch[1]);
    const y = Number(myMatch[2]);
    if (m >= 1 && m <= 12) return { ano: y, mes: m };
  }

  let detectedMes: number | null = null;
  for (const [mName, mNum] of Object.entries(MONTH_NAME_MAP)) {
    if (new RegExp(`\\b${mName}\\b`).test(norm) || norm.includes(mName)) {
      detectedMes = mNum;
      break;
    }
  }

  const yearMatch = norm.match(/\b(20\d{2})\b/) || norm.match(/\/(\d{2})\b/);
  let detectedAno = fallbackAno;
  if (yearMatch) {
    const yNum = Number(yearMatch[1]);
    detectedAno = yNum < 100 ? 2000 + yNum : yNum;
  }

  return {
    ano: detectedAno,
    mes: detectedMes || fallbackMes
  };
};

export const parseExcelFileForPreview = async (
  file: File,
  fallbackAno: number,
  fallbackMes: number
): Promise<{ sheets: ParsedSheetPreview[]; error: string | null }> => {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { sheets: [], error: 'A planilha enviada não possui abas válidas.' };
    }

    const parsedSheets: ParsedSheetPreview[] = [];

    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      if (!ws) continue;

      const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
        blankrows: false
      });

      if (!rawRows || rawRows.length < 2) continue;

      // Localiza a linha de cabeçalho (primeira linha com Nome/Agente/Operador e algum KPI)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(5, rawRows.length); i++) {
        const rowCells = rawRows[i].map(c => stripAccents(String(c || '')).toLowerCase().trim());
        if (
          rowCells.some(c => ['nome', 'agente', 'operador', 'colaborador'].includes(c)) ||
          rowCells.some(c => ['tma', 'nps', 'monitoria', 'qualidade', 'abs'].includes(c))
        ) {
          headerRowIndex = i;
          break;
        }
      }

      const headerRow = rawRows[headerRowIndex].map(c => String(c || '').trim());
      const normHeaders = headerRow.map(h => stripAccents(h).toLowerCase());

      const findColIdx = (candidates: string[]) =>
        normHeaders.findIndex(h => candidates.some(c => h === c || h.includes(c)));

      const nameIdx = findColIdx(['nome', 'agente', 'operador', 'colaborador']);
      const matIdx = findColIdx(['matricula', 'cadastro', 'registro']);
      const monIdx = findColIdx(['monitoria', 'qualidade']);
      const tmaIdx = findColIdx(['tma', 'tempo medio']);
      const npsIdx = findColIdx(['nps', 'satisfacao']);
      const absIdx = findColIdx(['abs', 'absenteismo', 'assiduidade']);
      const teamIdx = findColIdx(['equipe', 'turno', 'setor']);
      const statusIdx = findColIdx(['status', 'situacao']);
      const obsIdx = findColIdx(['observacoes', 'obs', 'feedback', 'comentario']);

      const detectedColumns = headerRow.filter(Boolean);
      const { ano, mes } = detectSheetCompetencia(sheetName, fallbackAno, fallbackMes);

      const records: MonthlyKpiRecord[] = [];
      const inconsistencies: ImportInconsistency[] = [];
      const seenKeysInSheet = new Set<string>();

      for (let rIdx = headerRowIndex + 1; rIdx < rawRows.length; rIdx++) {
        const row = rawRows[rIdx];
        if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) {
          continue;
        }

        const rawName = String(row[nameIdx >= 0 ? nameIdx : 0] ?? '').trim();
        const normName = stripAccents(rawName).toLowerCase();

        // Ignora linhas de rodapé de média da planilha (ex: "Média Geral", "Média Total", "Média equipe")
        if (
          !rawName ||
          normName.startsWith('media') ||
          normName.includes('media geral') ||
          normName.includes('media total') ||
          normName.includes('media equipe')
        ) {
          continue;
        }

        const rawMatricula = matIdx >= 0 ? String(row[matIdx] ?? '').trim() : null;
        const canonical = resolveCanonicalOperator(rawName, rawMatricula);

        if (seenKeysInSheet.has(canonical.operador_chave)) {
          inconsistencies.push({
            sheetName,
            rowNumber: rIdx + 1,
            operatorName: rawName,
            field: 'Operador',
            severity: 'warning',
            message: `Operador duplicado na mesma aba (${canonical.operador_nome}). O último registro prevalecerá.`
          });
        }
        seenKeysInSheet.add(canonical.operador_chave);

        const monParsed = monIdx >= 0 ? normalizeNumericMetric(row[monIdx], 2) : { value: null, valid: true };
        const tmaParsed = tmaIdx >= 0 ? normalizeTmaValue(row[tmaIdx]) : { tma: null, tma_segundos: null, valid: true };
        const npsParsed = npsIdx >= 0 ? normalizeNumericMetric(row[npsIdx], 2) : { value: null, valid: true };
        const absParsed = absIdx >= 0 ? normalizeNumericMetric(row[absIdx], 4) : { value: null, valid: true };

        if (!monParsed.valid) {
          inconsistencies.push({
            sheetName,
            rowNumber: rIdx + 1,
            operatorName: rawName,
            field: 'Monitoria',
            severity: 'error',
            message: `Formato inválido em Monitoria: "${row[monIdx]}"`
          });
        } else if (monParsed.value !== null && (monParsed.value < 0 || monParsed.value > 100)) {
          inconsistencies.push({
            sheetName,
            rowNumber: rIdx + 1,
            operatorName: rawName,
            field: 'Monitoria',
            severity: 'warning',
            message: `Valor fora da faixa 0-100%: ${monParsed.value}`
          });
        }

        if (!tmaParsed.valid) {
          inconsistencies.push({
            sheetName,
            rowNumber: rIdx + 1,
            operatorName: rawName,
            field: 'TMA',
            severity: 'error',
            message: `Formato de tempo inválido em TMA: "${row[tmaIdx]}"`
          });
        }

        if (!npsParsed.valid) {
          inconsistencies.push({
            sheetName,
            rowNumber: rIdx + 1,
            operatorName: rawName,
            field: 'NPS',
            severity: 'error',
            message: `Formato inválido em NPS: "${row[npsIdx]}"`
          });
        }

        if (monParsed.value === null && tmaParsed.tma === null && npsParsed.value === null) {
          inconsistencies.push({
            sheetName,
            rowNumber: rIdx + 1,
            operatorName: rawName,
            field: 'KPIs',
            severity: 'warning',
            message: 'Todos os indicadores principais (TMA, NPS e Monitoria) estão em branco.'
          });
        }

        const rawStatus = statusIdx >= 0 ? String(row[statusIdx] ?? '').trim() : 'Ativo';
        const matchedStatus: MonthlyOperatorStatus =
          MONTHLY_STATUS_LIST.find(s => stripAccents(s).toLowerCase() === stripAccents(rawStatus).toLowerCase()) ||
          'Ativo';

        records.push({
          ano,
          mes,
          operador_chave: canonical.operador_chave,
          operador_nome: canonical.operador_nome,
          matricula: rawMatricula || canonical.matricula,
          monitoria: monParsed.value,
          tma: tmaParsed.tma,
          tma_segundos: tmaParsed.tma_segundos,
          nps: npsParsed.value,
          abs: absParsed.value,
          equipe_turno:
            teamIdx >= 0 && String(row[teamIdx] ?? '').trim()
              ? String(row[teamIdx]).trim()
              : canonical.equipe_turno,
          status_mes: matchedStatus,
          observacoes:
            obsIdx >= 0 && String(row[obsIdx] ?? '').trim() ? String(row[obsIdx]).trim() : null
        });
      }

      if (records.length > 0) {
        parsedSheets.push({
          sheetName,
          ano,
          mes,
          competenciaLabel: getCompetenciaLabel(ano, mes),
          detectedColumns,
          records,
          inconsistencies,
          selected: true
        });
      }
    }

    if (parsedSheets.length === 0) {
      return {
        sheets: [],
        error: 'Nenhum registro de operador válido foi encontrado nas abas da planilha.'
      };
    }

    return { sheets: parsedSheets, error: null };
  } catch (e: any) {
    console.error('[MonthlyKpiService] Falha ao ler arquivo Excel:', e);
    return {
      sheets: [],
      error: `Não foi possível processar o arquivo Excel: ${e.message || 'Formato inválido'}`
    };
  }
};

// ==============================================================================
// EXPORTAÇÃO EXCEL (.XLSX) E DOWNLOAD DE PLANILHA MODELO
// ==============================================================================

export const downloadExcelTemplate = (ano: number, mes: number) => {
  const wb = XLSX.utils.book_new();
  const sampleRows = [
    {
      Nome: 'Sabrina Brito de Carvalho',
      Matrícula: '19195',
      TMA: '00:03:37',
      NPS: 94.0,
      Monitoria: 95.0,
      ABS: 1.0,
      'Equipe/Turno': 'Home Office',
      'Status no Mês': 'Ativo',
      Observações: 'Meta atingida em todos os indicadores'
    },
    {
      Nome: 'Taise Cristina da Conceição Alcântara',
      Matrícula: '19191',
      TMA: '00:04:26',
      NPS: 91.2,
      Monitoria: 100.0,
      ABS: 1.0,
      'Equipe/Turno': 'Home Office',
      'Status no Mês': 'Ativo',
      Observações: ''
    },
    {
      Nome: 'Tania Cristina Machado Flores',
      Matrícula: '56323',
      TMA: '00:04:32',
      NPS: 89.3,
      Monitoria: 97.0,
      ABS: 1.0,
      'Equipe/Turno': 'SMF / Presencial',
      'Status no Mês': 'Ativo',
      Observações: ''
    },
    {
      Nome: 'Izadora Costa da Silveira',
      Matrícula: '2090',
      TMA: '00:03:24',
      NPS: 92.1,
      Monitoria: 90.0,
      ABS: 1.0,
      'Equipe/Turno': 'Presencial',
      'Status no Mês': 'Ativo',
      Observações: ''
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 38 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
    { wch: 16 },
    { wch: 35 }
  ];

  const sheetTitle = `${MONTHS[mes - 1] || 'Mes'} ${ano}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  XLSX.writeFile(wb, `Modelo_KPIs_Central156_${MONTHS[mes - 1]}_${ano}.xlsx`);
};

export const exportMonthToExcel = (ano: number, mes: number, records: MonthlyKpiRecord[]) => {
  const wb = XLSX.utils.book_new();

  const rows = records.map(r => ({
    Nome: r.operador_nome,
    Matrícula: r.matricula || '-',
    'Equipe/Turno': r.equipe_turno || 'Central 156',
    'Status no Mês': r.status_mes || 'Ativo',
    TMA: r.tma || '-',
    NPS: r.nps !== null && r.nps !== undefined ? r.nps : '',
    'Monitoria (%)': r.monitoria !== null && r.monitoria !== undefined ? r.monitoria : '',
    'ABS (%)':
      r.abs !== null && r.abs !== undefined
        ? Number((r.abs <= 1.5 ? r.abs * 100 : r.abs).toFixed(2))
        : '',
    'Observações/Feedback': r.observacoes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 38 },
    { wch: 12 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 40 }
  ];

  const sheetTitle = `${MONTHS[mes - 1] || 'Mes'} ${ano}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  XLSX.writeFile(wb, `KPIs_Central156_${MONTHS[mes - 1]}_${ano}.xlsx`);
};
