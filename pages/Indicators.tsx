import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  Heart,
  CheckCircle,
  Users,
  Filter,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  BarChart2,
  Upload,
  Plus,
  Edit,
  Trash2,
  Target,
  Award,
  Printer,
  History,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Operator, TeamGoals, Role } from '../types';
import {
  MonthlyKpiRecord,
  MonthlyOperatorStatus,
  MONTHLY_STATUS_LIST,
  MonthlySemaphoreGoals,
  SemaphoreLevel
} from '../types/monthlyKpi';
import {
  fetchMonthKpis,
  saveSingleMonthlyKpi,
  deleteMonthlyKpiRecord,
  loadSemaphoreGoals,
  saveSemaphoreGoals,
  evaluateMetricSemaphore,
  exportMonthToExcel,
  downloadExcelTemplate,
  getCompetenciaLabel,
  getAvailableSeedCompetencias
} from '../services/monthlyKpiService';
import { ExcelImportModal } from '../components/kpis/ExcelImportModal';
import { OperatorHistoryDrawer } from '../components/kpis/OperatorHistoryDrawer';
import { MonthlyOperatorModal } from '../components/kpis/MonthlyOperatorModal';
import { SemaphoreConfigModal } from '../components/kpis/SemaphoreConfigModal';
import { useAuth } from '../AuthContext';
import { tmaToSeconds, secondsToTma, formatDecimal } from '../utils';
import { MONTHS } from '../constants';

interface IndicatorsProps {
  operators: Operator[];
  goals: TeamGoals;
  userRole: Role;
}

const SEMAPHORE_STYLES: Record<SemaphoreLevel, { badge: string; dot: string; bar: string; text: string }> = {
  green: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    bar: 'from-emerald-400 to-emerald-600',
    text: 'text-emerald-700'
  },
  yellow: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    bar: 'from-amber-400 to-amber-500',
    text: 'text-amber-700'
  },
  red: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    bar: 'from-rose-400 to-rose-600',
    text: 'text-rose-700'
  },
  neutral: {
    badge: 'bg-slate-50 text-slate-400 border-slate-200',
    dot: 'bg-slate-300',
    bar: 'from-slate-300 to-slate-400',
    text: 'text-slate-400'
  }
};

const STATUS_BADGE_STYLES: Record<MonthlyOperatorStatus, string> = {
  Ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Férias: 'bg-sky-50 text-sky-700 border-sky-200',
  Afastado: 'bg-amber-50 text-amber-700 border-amber-200',
  'Troca de Equipe': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Desligado: 'bg-rose-50 text-rose-700 border-rose-200'
};

const SummaryCard = ({
  title,
  value,
  goalLabel,
  unit = '',
  semaphore = 'neutral' as SemaphoreLevel,
  onClick,
  isActive,
  icon,
  subtitle
}: any) => {
  const semStyle = SEMAPHORE_STYLES[semaphore as SemaphoreLevel] || SEMAPHORE_STYLES.neutral;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white rounded-2xl p-5 shadow-sm border transition-all duration-300 group cursor-pointer hover:shadow-lg hover:-translate-y-0.5 select-none ${
        isActive ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-md bg-blue-50/20' : 'border-slate-200/80 hover:border-blue-200'
      }`}
      title="Clique para ordenar a tabela por este indicador"
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          isActive
            ? 'bg-blue-600'
            : semaphore === 'green'
            ? 'bg-emerald-500'
            : semaphore === 'yellow'
            ? 'bg-amber-500'
            : semaphore === 'red'
            ? 'bg-rose-500'
            : 'bg-slate-400'
        }`}
      />

      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
              {icon}
            </div>
          )}
          <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{title}</span>
        </div>
        <div
          className={`p-1 rounded-full ${
            isActive
              ? 'bg-blue-600 text-white'
              : semaphore === 'green'
              ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20'
              : semaphore === 'yellow'
              ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20'
              : semaphore === 'red'
              ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-500/20'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isActive ? <ArrowUpDown size={13} /> : semaphore === 'green' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <span
          className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isActive ? 'text-blue-700' : semaphore !== 'neutral' ? semStyle.text : 'text-slate-900'
          }`}
        >
          {typeof value === 'number' ? formatDecimal(value) : value}
          {unit}
        </span>
        {semaphore !== 'neutral' && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${semStyle.badge}`}>
            {semaphore === 'green' ? 'Na Meta' : semaphore === 'yellow' ? 'Atenção' : 'Fora da Meta'}
          </span>
        )}
      </div>

      {goalLabel && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
          <span className="text-slate-400 text-[11px]">Farol (Meta):</span>
          <span className="font-bold text-slate-700 text-[11px]">{goalLabel}</span>
        </div>
      )}

      <div
        className={`mt-2 text-[10px] font-extrabold flex items-center gap-1 transition-colors ${
          isActive ? 'text-blue-700 underline' : 'text-slate-400 group-hover:text-blue-600'
        }`}
      >
        <span>{isActive ? '● Ativo na tabela (clique p/ alternar)' : subtitle || 'Clique para ordenar na tabela ↓'}</span>
      </div>
    </div>
  );
};

const ToggleFilter = ({ value, onChange }: { value: 'best' | 'worst'; onChange: (v: 'best' | 'worst') => void }) => (
  <div className="flex bg-slate-100 p-1 rounded-xl">
    <button
      onClick={() => onChange('best')}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
        value === 'best' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      Top 10
    </button>
    <button
      onClick={() => onChange('worst')}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
        value === 'worst' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      Atenção
    </button>
  </div>
);

type TableSortColumn = 'name' | 'tma' | 'nps' | 'monitoria' | 'abs';
type TableSortDirection = 'asc' | 'desc';

const Indicators: React.FC<IndicatorsProps> = ({ operators, userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { supabase, isAdmin } = useAuth();

  // Competência Mensal Selecionada (Padrão: Novembro/2026 — última aba da planilha oficial)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(11);

  // Estado dos registros do mês atual (Snapshot Mensal Independente)
  const [monthRecords, setMonthRecords] = useState<MonthlyKpiRecord[]>([]);
  const [isLoadingMonth, setIsLoadingMonth] = useState<boolean>(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Busca com Debounce (250ms) e Filtro de Status no Mês
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | MonthlyOperatorStatus>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearchTerm.trim().toLowerCase());
    }, 250);
    return () => clearTimeout(timer);
  }, [rawSearchTerm]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Farol de Metas (Semáforo)
  const [semaphoreGoals, setSemaphoreGoals] = useState<MonthlySemaphoreGoals>(() => loadSemaphoreGoals());
  const [isSemaphoreModalOpen, setIsSemaphoreModalOpen] = useState(false);

  // Modais de CRUD Mensal, Importação Excel e Histórico do Operador
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MonthlyKpiRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<MonthlyKpiRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [historyTarget, setHistoryTarget] = useState<{
    operadorChave: string;
    operadorNome: string;
    matricula?: string | null;
  } | null>(null);

  // Lista de competências rápidas disponíveis (Jun/2025 a Nov/2026 + mês selecionado)
  const quickCompetencias = useMemo(() => {
    const base = getAvailableSeedCompetencias();
    const exists = base.some(c => c.ano === selectedYear && c.mes === selectedMonth);
    if (!exists) {
      return [...base, { ano: selectedYear, mes: selectedMonth }].sort((a, b) =>
        a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
      );
    }
    return base;
  }, [selectedYear, selectedMonth]);

  // Carrega os KPIs APENAS do mês selecionado (Server-Side Filtering + In-Memory Cache)
  const loadSelectedMonth = useCallback(
    async (ano: number, mes: number, forceRefresh = false) => {
      setIsLoadingMonth(true);
      const { data, error } = await fetchMonthKpis(supabase, ano, mes, {
        forceRefresh,
        isAdmin
      });
      setMonthRecords(data || []);
      if (error) {
        setToast({ type: 'error', message: `Aviso ao consultar mês: ${error}` });
      }
      setIsLoadingMonth(false);
    },
    [supabase, isAdmin]
  );

  useEffect(() => {
    loadSelectedMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, loadSelectedMonth]);

  // Filtros dos gráficos comparativos
  const [filterQualidade, setFilterQualidade] = useState<'best' | 'worst'>('best');
  const [filterNPS, setFilterNPS] = useState<'best' | 'worst'>('best');
  const [filterTMA, setFilterTMA] = useState<'best' | 'worst'>('best');

  // Ordenação da Tabela de Performance
  const urlSort = (searchParams.get('sort') || location.state?.sort) as TableSortColumn | null;
  const urlDir = (searchParams.get('dir') || (urlSort === 'name' ? 'asc' : 'desc')) as TableSortDirection;

  const [sortColumn, setSortColumn] = useState<TableSortColumn | null>(urlSort || null);
  const [sortDirection, setSortDirection] = useState<TableSortDirection>(urlDir);

  useEffect(() => {
    if (urlSort && ['name', 'tma', 'nps', 'monitoria', 'abs'].includes(urlSort)) {
      setSortColumn(urlSort);
      if (searchParams.get('dir')) {
        setSortDirection(searchParams.get('dir') as TableSortDirection);
      } else {
        setSortDirection(urlSort === 'name' ? 'asc' : 'desc');
      }
    }
  }, [urlSort]);

  const handleSort = (column: TableSortColumn) => {
    if (sortColumn === column) {
      const nextDir: TableSortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      setSortDirection(nextDir);
      setSearchParams({ sort: column, dir: nextDir });
    } else {
      setSortColumn(column);
      const nextDir: TableSortDirection = column === 'name' ? 'asc' : 'desc';
      setSortDirection(nextDir);
      setSearchParams({ sort: column, dir: nextDir });
    }
  };

  const clearSort = () => {
    setSortColumn(null);
    setSortDirection('desc');
    setSearchParams({});
  };

  // Mapa rápido de fotos/cadastros existentes para enriquecer o avatar quando o operador tiver matrícula
  const operatorAvatarMap = useMemo(() => {
    const map = new Map<string, Operator>();
    for (const op of operators) {
      if (op.registration) {
        map.set(String(op.registration).trim(), op);
      }
    }
    return map;
  }, [operators]);

  // Verifica se algum registro do mês possui coluna ABS preenchida
  const monthHasAbsColumn = useMemo(() => {
    return monthRecords.some(r => r.abs !== null && r.abs !== undefined);
  }, [monthRecords]);

  // Prepara os dados do mês selecionado
  const tableOperatorsData = useMemo(() => {
    return monthRecords.map(rec => {
      const linkedOp = rec.matricula ? operatorAvatarMap.get(String(rec.matricula).trim()) : undefined;
      const hasTma = !!(rec.tma && rec.tma !== '00:00:00');
      const tmaSec = rec.tma_segundos ?? (hasTma ? tmaToSeconds(rec.tma) : null);
      const hasNps = rec.nps !== null && rec.nps !== undefined;
      const hasMonitoria = rec.monitoria !== null && rec.monitoria !== undefined;
      const hasAbs = rec.abs !== null && rec.abs !== undefined;
      const absPct = hasAbs ? (Number(rec.abs) <= 1.5 ? Number(rec.abs) * 100 : Number(rec.abs)) : null;

      return {
        ...rec,
        photoUrl: linkedOp?.photoUrl,
        shortName: rec.operador_nome.split(' ')[0],
        avgNps: hasNps ? Number(rec.nps) : null,
        avgMonitoria: hasMonitoria ? Number(rec.monitoria) : null,
        avgTma: hasTma ? rec.tma : null,
        avgTmaSeconds: tmaSec && tmaSec > 0 ? tmaSec : null,
        avgAbsPct: absPct
      };
    });
  }, [monthRecords, operatorAvatarMap]);

  // Cálculos consolidados do mês selecionado + Top Performers
  const monthStats = useMemo(() => {
    const activeInMonth = tableOperatorsData.filter(r => r.status_mes === 'Ativo');
    const tmaList = tableOperatorsData.filter(r => r.avgTmaSeconds !== null && r.avgTmaSeconds > 0);
    const npsList = tableOperatorsData.filter(r => r.avgNps !== null);
    const monList = tableOperatorsData.filter(r => r.avgMonitoria !== null);
    const absList = tableOperatorsData.filter(r => r.avgAbsPct !== null);

    const avgTmaSec =
      tmaList.length > 0
        ? tmaList.reduce((acc, r) => acc + (r.avgTmaSeconds || 0), 0) / tmaList.length
        : 0;
    const avgTma = avgTmaSec > 0 ? secondsToTma(avgTmaSec) : '00:00:00';
    const avgNps =
      npsList.length > 0
        ? Number((npsList.reduce((acc, r) => acc + (r.avgNps || 0), 0) / npsList.length).toFixed(1))
        : 0;
    const avgMonitoria =
      monList.length > 0
        ? Number((monList.reduce((acc, r) => acc + (r.avgMonitoria || 0), 0) / monList.length).toFixed(1))
        : 0;
    const avgAbs =
      absList.length > 0
        ? Number((absList.reduce((acc, r) => acc + (r.avgAbsPct || 0), 0) / absList.length).toFixed(1))
        : null;

    const topMonitoria = [...monList].sort((a, b) => (b.avgMonitoria || 0) - (a.avgMonitoria || 0))[0] || null;
    const topNps = [...npsList].sort((a, b) => (b.avgNps || 0) - (a.avgNps || 0))[0] || null;
    const topTma = [...tmaList].sort((a, b) => (a.avgTmaSeconds || 999999) - (b.avgTmaSeconds || 999999))[0] || null;

    return {
      totalOperators: tableOperatorsData.length,
      activeCount: activeInMonth.length,
      tma: avgTma,
      nps: avgNps,
      monitoria: avgMonitoria,
      abs: avgAbs,
      topMonitoria,
      topNps,
      topTma
    };
  }, [tableOperatorsData]);

  // Dados ordenados para os 3 gráficos comparativos
  const getSortedChartData = useCallback(
    (metric: 'avgMonitoria' | 'avgNps' | 'avgTmaSeconds', mode: 'best' | 'worst') => {
      const valid = tableOperatorsData.filter(op => {
        const val = op[metric];
        if (val === null || val === undefined) return false;
        if (metric === 'avgTmaSeconds' && val <= 0) return false;
        return true;
      });

      const sorted = [...valid].sort((a, b) => {
        if (metric === 'avgTmaSeconds') {
          return mode === 'best'
            ? (a.avgTmaSeconds || 0) - (b.avgTmaSeconds || 0)
            : (b.avgTmaSeconds || 0) - (a.avgTmaSeconds || 0);
        }
        return mode === 'best' ? (b[metric] || 0) - (a[metric] || 0) : (a[metric] || 0) - (b[metric] || 0);
      });
      return sorted.slice(0, 10);
    },
    [tableOperatorsData]
  );

  const dataQualidade = useMemo(() => getSortedChartData('avgMonitoria', filterQualidade), [getSortedChartData, filterQualidade]);
  const dataNPS = useMemo(() => getSortedChartData('avgNps', filterNPS), [getSortedChartData, filterNPS]);
  const dataTMA = useMemo(() => getSortedChartData('avgTmaSeconds', filterTMA), [getSortedChartData, filterTMA]);

  // Filtro e Ordenação da Tabela Principal
  const sortedAndFilteredList = useMemo(() => {
    const list = tableOperatorsData.filter(op => {
      const matchesStatus = selectedStatusFilter === 'all' || op.status_mes === selectedStatusFilter;
      if (!matchesStatus) return false;
      if (!debouncedSearch) return true;
      return (
        op.operador_nome.toLowerCase().includes(debouncedSearch) ||
        (op.matricula && String(op.matricula).toLowerCase().includes(debouncedSearch)) ||
        (op.equipe_turno && op.equipe_turno.toLowerCase().includes(debouncedSearch))
      );
    });

    if (!sortColumn) {
      return [...list].sort((a, b) =>
        a.operador_nome.localeCompare(b.operador_nome, 'pt-BR', { sensitivity: 'base' })
      );
    }

    return [...list].sort((a, b) => {
      if (sortColumn === 'name') {
        const cmp = a.operador_nome.localeCompare(b.operador_nome, 'pt-BR', { sensitivity: 'base' });
        return sortDirection === 'desc' ? -cmp : cmp;
      }

      const valA =
        sortColumn === 'tma'
          ? a.avgTmaSeconds
          : sortColumn === 'nps'
          ? a.avgNps
          : sortColumn === 'monitoria'
          ? a.avgMonitoria
          : a.avgAbsPct;
      const valB =
        sortColumn === 'tma'
          ? b.avgTmaSeconds
          : sortColumn === 'nps'
          ? b.avgNps
          : sortColumn === 'monitoria'
          ? b.avgMonitoria
          : b.avgAbsPct;

      if (valA === null && valB === null) {
        return a.operador_nome.localeCompare(b.operador_nome, 'pt-BR', { sensitivity: 'base' });
      }
      if (valA === null) return 1;
      if (valB === null) return -1;

      const comparison = Number(valA) - Number(valB);
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [tableOperatorsData, debouncedSearch, selectedStatusFilter, sortColumn, sortDirection]);

  // Handlers de CRUD Mensal
  const handleSaveOperatorInMonth = async (record: MonthlyKpiRecord): Promise<{ error: string | null }> => {
    const { error } = await saveSingleMonthlyKpi(supabase, record);
    if (error) {
      setToast({ type: 'error', message: `Erro ao salvar: ${error}` });
      return { error };
    }
    await loadSelectedMonth(selectedYear, selectedMonth, true);
    setToast({
      type: 'success',
      message: `Indicadores de "${record.operador_nome}" salvos em ${getCompetenciaLabel(selectedYear, selectedMonth)}!`
    });
    return { error: null };
  };

  const handleConfirmDeleteFromMonth = async () => {
    if (!deletingRecord) return;
    setIsDeleting(true);
    const { error } = await deleteMonthlyKpiRecord(
      supabase,
      selectedYear,
      selectedMonth,
      deletingRecord.operador_chave
    );
    setIsDeleting(false);

    if (error) {
      setToast({ type: 'error', message: `Erro ao excluir operador do mês: ${error}` });
      return;
    }

    const deletedName = deletingRecord.operador_nome;
    setDeletingRecord(null);
    await loadSelectedMonth(selectedYear, selectedMonth, true);
    setToast({
      type: 'success',
      message: `"${deletedName}" foi removido apenas de ${getCompetenciaLabel(selectedYear, selectedMonth)} (demais meses preservados).`
    });
  };

  const handleSaveSemaphore = async (newGoals: MonthlySemaphoreGoals) => {
    setSemaphoreGoals(newGoals);
    const { error } = await saveSemaphoreGoals(supabase, newGoals, isAdmin);
    if (error) {
      setToast({ type: 'error', message: `Farol salvo localmente, mas houve aviso no Supabase: ${error}` });
    } else {
      setToast({ type: 'success', message: 'Configuração do Farol de Metas atualizada com sucesso!' });
    }
  };

  const years = [2024, 2025, 2026, 2027];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12 print:p-0">
      {/* Toast Flutuante */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md px-5 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : 'bg-rose-950 text-rose-100 border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-bold leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-white/60 hover:text-white font-black text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              Gestão Mensal de Indicadores
            </h1>
            <span className="text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              {getCompetenciaLabel(selectedYear, selectedMonth)}
            </span>
          </div>
          <p className="text-slate-500 mt-1 font-medium text-sm">
            Competências mensais independentes (Snapshots) • Clique no nome do operador para ver seu histórico evolutivo
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {userRole === Role.SUPERVISOR && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingRecord(null);
                  setIsOperatorModalOpen(true);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm hover:shadow transition-all text-xs"
              >
                <Plus size={16} />
                <span>Adicionar Operador no Mês</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm hover:shadow transition-all text-xs"
              >
                <Upload size={16} />
                <span>Importar Planilha Excel</span>
              </button>

              <button
                type="button"
                onClick={() => downloadExcelTemplate(selectedYear, selectedMonth)}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all text-xs"
                title="Baixar Planilha Modelo (.xlsx)"
              >
                <FileSpreadsheet size={15} className="text-emerald-600" />
                <span>Planilha Modelo</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsSemaphoreModalOpen(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all text-xs"
            title="Configurar Farol de Metas (Verde, Amarelo, Vermelho)"
          >
            <Target size={15} className="text-emerald-600" />
            <span>Farol de Metas</span>
          </button>

          <button
            type="button"
            onClick={() => exportMonthToExcel(selectedYear, selectedMonth, sortedAndFilteredList)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all text-xs"
            title="Exportar dados do mês selecionado em Excel (.xlsx)"
          >
            <Download size={15} />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all text-xs"
            title="Imprimir ou Salvar PDF do mês"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* BARRA DE NAVEGAÇÃO POR ABAS DE COMPETÊNCIAS MENSAIS */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
            <Calendar size={16} className="text-blue-600" />
            <span>Competências Mensais (Snapshots Independentes):</span>
          </div>

          {/* Seletor Direto de Mês / Ano e Filtro de Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs">
              <Filter size={14} className="text-slate-500" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent font-black text-slate-800 outline-none cursor-pointer"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">/</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-black text-slate-800 outline-none cursor-pointer"
              >
                {years.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value as any)}
              className="bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Todos os Status no Mês</option>
              {MONTHLY_STATUS_LIST.map(st => (
                <option key={st} value={st}>
                  Status: {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Abas Horizontais dos Meses */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {quickCompetencias.map(comp => {
            const isSelected = comp.ano === selectedYear && comp.mes === selectedMonth;
            return (
              <button
                key={`${comp.ano}-${comp.mes}`}
                type="button"
                onClick={() => {
                  setSelectedYear(comp.ano);
                  setSelectedMonth(comp.mes);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {getCompetenciaLabel(comp.ano, comp.mes)}
              </button>
            );
          })}
        </div>
      </div>

      {/* CARDS DE RESUMO DO MÊS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard
          title="Operadores no Mês"
          value={monthStats.totalOperators}
          unit={` (${monthStats.activeCount} ativos)`}
          icon={<Users size={16} />}
          subtitle="Clique p/ ordenar (A-Z ou Z-A)"
          isActive={sortColumn === 'name'}
          onClick={() => handleSort('name')}
        />
        <SummaryCard
          title="TMA Médio do Mês"
          value={monthStats.tma}
          goalLabel={`🟢 ≤ ${semaphoreGoals.tma.meta} | 🟡 ≤ ${semaphoreGoals.tma.atencao}`}
          semaphore={evaluateMetricSemaphore('tma', monthStats.tma, semaphoreGoals)}
          icon={<Clock size={16} />}
          subtitle="Clique p/ ordenar (Maior / Menor)"
          isActive={sortColumn === 'tma'}
          onClick={() => handleSort('tma')}
        />
        <SummaryCard
          title="NPS Médio do Mês"
          value={monthStats.nps}
          goalLabel={`🟢 ≥ ${semaphoreGoals.nps.meta} | 🟡 ≥ ${semaphoreGoals.nps.atencao}`}
          semaphore={evaluateMetricSemaphore('nps', monthStats.nps, semaphoreGoals)}
          icon={<Heart size={16} />}
          subtitle="Clique p/ ordenar (Maior / Menor)"
          isActive={sortColumn === 'nps'}
          onClick={() => handleSort('nps')}
        />
        <SummaryCard
          title="Monitoria do Mês"
          value={monthStats.monitoria}
          unit="%"
          goalLabel={`🟢 ≥ ${semaphoreGoals.monitoria.meta}% | 🟡 ≥ ${semaphoreGoals.monitoria.atencao}%`}
          semaphore={evaluateMetricSemaphore('monitoria', monthStats.monitoria, semaphoreGoals)}
          icon={<CheckCircle size={16} />}
          subtitle="Clique p/ ordenar (Maior / Menor)"
          isActive={sortColumn === 'monitoria'}
          onClick={() => handleSort('monitoria')}
        />
      </div>

      {/* DESTAQUES DO MÊS (TOP PERFORMERS) */}
      {(monthStats.topMonitoria || monthStats.topNps || monthStats.topTma) && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Award size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                Destaques da Competência — {getCompetenciaLabel(selectedYear, selectedMonth)}
              </p>
              <p className="text-[11px] text-slate-300">
                Top Performers calculados automaticamente com base nos registros deste mês
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-3xl">
            {monthStats.topMonitoria && (
              <div className="bg-white/10 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-emerald-300">🏆 Melhor Monitoria</p>
                  <p className="text-xs font-black truncate">{monthStats.topMonitoria.operador_nome}</p>
                </div>
                <span className="text-sm font-black text-emerald-300 shrink-0">
                  {formatDecimal(monthStats.topMonitoria.avgMonitoria!)}%
                </span>
              </div>
            )}

            {monthStats.topNps && (
              <div className="bg-white/10 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-blue-300">⭐ Melhor NPS</p>
                  <p className="text-xs font-black truncate">{monthStats.topNps.operador_nome}</p>
                </div>
                <span className="text-sm font-black text-blue-300 shrink-0">
                  {formatDecimal(monthStats.topNps.avgNps!)}
                </span>
              </div>
            )}

            {monthStats.topTma && (
              <div className="bg-white/10 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-indigo-300">⚡ Menor TMA</p>
                  <p className="text-xs font-black truncate">{monthStats.topTma.operador_nome}</p>
                </div>
                <span className="text-sm font-mono font-black text-indigo-300 shrink-0">
                  {monthStats.topTma.avgTma}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TABELA DE PERFORMANCE DO MÊS */}
      <div
        id="performance-table-section"
        className="bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-200/80 flex flex-col"
      >
        {/* Barra superior de busca e botões rápidos */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 print:hidden">
          <div className="flex items-center gap-3 w-full lg:w-auto flex-1 max-w-md">
            <div className="p-2.5 rounded-xl bg-slate-100">
              <Search size={18} className="text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Buscar operador por nome, matrícula ou equipe..."
              className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none transition-all shadow-sm"
              value={rawSearchTerm}
              onChange={e => setRawSearchTerm(e.target.value)}
            />
          </div>

          {/* Botões de Ordenação Rápida */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <ArrowUpDown size={14} className="text-blue-600" />
              Ordenar por:
            </span>
            <button
              type="button"
              onClick={() => handleSort('name')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-2 shadow-sm ${
                sortColumn === 'name'
                  ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>Operador</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/10">
                {sortColumn === 'name' ? (sortDirection === 'asc' ? 'A → Z ↑' : 'Z → A ↓') : 'A-Z'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSort('tma')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-2 shadow-sm ${
                sortColumn === 'tma'
                  ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>TMA Médio</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/10">
                {sortColumn === 'tma' ? (sortDirection === 'desc' ? 'Maior ↓' : 'Menor ↑') : '⇅'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSort('nps')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-2 shadow-sm ${
                sortColumn === 'nps'
                  ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>NPS</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/10">
                {sortColumn === 'nps' ? (sortDirection === 'desc' ? 'Maior ↓' : 'Menor ↑') : '⇅'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSort('monitoria')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-2 shadow-sm ${
                sortColumn === 'monitoria'
                  ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>Monitoria</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/10">
                {sortColumn === 'monitoria' ? (sortDirection === 'desc' ? 'Maior ↓' : 'Menor ↑') : '⇅'}
              </span>
            </button>
            {sortColumn && (
              <button
                type="button"
                onClick={clearSort}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors flex items-center gap-1"
              >
                <RotateCcw size={12} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
          <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                <span>Snapshot Mensal de Indicadores</span>
                <span className="text-blue-700 font-black">({getCompetenciaLabel(selectedYear, selectedMonth)})</span>
              </h3>
              {/* Legenda rápida do Farol */}
              <div className="hidden md:flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Na Meta
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Atenção
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Fora da Meta
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-full shadow-sm">
                TOTAL NO MÊS: {sortedAndFilteredList.length}
              </span>
            </div>
          </div>

          {isLoadingMonth ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <p className="text-xs font-bold">
                Carregando snapshot de {getCompetenciaLabel(selectedYear, selectedMonth)}...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] font-black uppercase tracking-wider bg-slate-50/90 border-b border-slate-200 select-none">
                    {/* COLUNA 1: OPERADOR */}
                    <th
                      onClick={() => handleSort('name')}
                      className={`px-6 py-4 cursor-pointer transition-all hover:bg-blue-100/60 group ${
                        sortColumn === 'name' ? 'bg-blue-50/90 text-blue-800' : 'text-slate-700 hover:text-blue-700'
                      }`}
                    >
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs font-black">Operador</span>
                        <div
                          className={`p-1 rounded-md ${
                            sortColumn === 'name'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200/80 text-slate-500 group-hover:bg-blue-200'
                          }`}
                        >
                          {sortColumn === 'name' ? (
                            sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </div>
                      </div>
                    </th>

                    {/* COLUNA STATUS / EQUIPE */}
                    <th className="px-3 py-4 text-center text-slate-600">Status / Equipe</th>

                    {/* COLUNA 2: TMA MÉDIO */}
                    <th
                      onClick={() => handleSort('tma')}
                      className={`px-4 py-4 text-center cursor-pointer transition-all hover:bg-blue-100/60 group ${
                        sortColumn === 'tma' ? 'bg-blue-50/90 text-blue-800' : 'text-slate-700 hover:text-blue-700'
                      }`}
                    >
                      <div className="inline-flex items-center justify-center gap-2">
                        <span className="text-xs font-black">TMA Médio</span>
                        <div
                          className={`p-1 rounded-md ${
                            sortColumn === 'tma'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200/80 text-slate-500 group-hover:bg-blue-200'
                          }`}
                        >
                          {sortColumn === 'tma' ? (
                            sortDirection === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </div>
                      </div>
                    </th>

                    {/* COLUNA 3: NPS */}
                    <th
                      onClick={() => handleSort('nps')}
                      className={`px-4 py-4 text-center cursor-pointer transition-all hover:bg-blue-100/60 group ${
                        sortColumn === 'nps' ? 'bg-blue-50/90 text-blue-800' : 'text-slate-700 hover:text-blue-700'
                      }`}
                    >
                      <div className="inline-flex items-center justify-center gap-2">
                        <span className="text-xs font-black">NPS</span>
                        <div
                          className={`p-1 rounded-md ${
                            sortColumn === 'nps'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200/80 text-slate-500 group-hover:bg-blue-200'
                          }`}
                        >
                          {sortColumn === 'nps' ? (
                            sortDirection === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </div>
                      </div>
                    </th>

                    {/* COLUNA 4: MONITORIA */}
                    <th
                      onClick={() => handleSort('monitoria')}
                      className={`px-4 py-4 text-center cursor-pointer transition-all hover:bg-blue-100/60 group ${
                        sortColumn === 'monitoria'
                          ? 'bg-blue-50/90 text-blue-800'
                          : 'text-slate-700 hover:text-blue-700'
                      }`}
                    >
                      <div className="inline-flex items-center justify-center gap-2">
                        <span className="text-xs font-black">Monitoria</span>
                        <div
                          className={`p-1 rounded-md ${
                            sortColumn === 'monitoria'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200/80 text-slate-500 group-hover:bg-blue-200'
                          }`}
                        >
                          {sortColumn === 'monitoria' ? (
                            sortDirection === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </div>
                      </div>
                    </th>

                    {/* COLUNA 5: ABS (Quando presente no mês) */}
                    {monthHasAbsColumn && (
                      <th
                        onClick={() => handleSort('abs')}
                        className="px-3 py-4 text-center cursor-pointer hover:bg-blue-100/60 text-slate-700"
                      >
                        ABS (%)
                      </th>
                    )}

                    <th className="px-6 py-4 text-right text-slate-400 font-bold print:hidden">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedAndFilteredList.length === 0 ? (
                    <tr>
                      <td colSpan={monthHasAbsColumn ? 7 : 6} className="py-12 text-center text-slate-400 italic">
                        Nenhum operador registrado para a competência {getCompetenciaLabel(selectedYear, selectedMonth)}.
                      </td>
                    </tr>
                  ) : (
                    sortedAndFilteredList.map(op => {
                      const tmaSem = evaluateMetricSemaphore('tma', op.avgTma, semaphoreGoals);
                      const npsSem = evaluateMetricSemaphore('nps', op.avgNps, semaphoreGoals);
                      const monSem = evaluateMetricSemaphore('monitoria', op.avgMonitoria, semaphoreGoals);
                      const absSem = evaluateMetricSemaphore('abs', op.avgAbsPct, semaphoreGoals);

                      return (
                        <tr key={op.operador_chave} className="hover:bg-blue-50/40 transition-all duration-150 group">
                          {/* Operador (Clicável para abrir Histórico Evolutivo) */}
                          <td className="px-6 py-3.5">
                            <div
                              onClick={() =>
                                setHistoryTarget({
                                  operadorChave: op.operador_chave,
                                  operadorNome: op.operador_nome,
                                  matricula: op.matricula
                                })
                              }
                              className="flex items-center gap-3 cursor-pointer"
                              title="Clique para abrir o histórico comparativo deste operador ao longo dos meses"
                            >
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/60 flex items-center justify-center text-slate-600 font-bold overflow-hidden shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                {op.photoUrl ? (
                                  <img src={op.photoUrl} alt={op.operador_nome} className="w-full h-full object-cover" />
                                ) : (
                                  op.operador_nome.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors flex items-center gap-1.5">
                                  <span>{op.operador_nome}</span>
                                  <History size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
                                  {op.matricula ? <span>#{op.matricula}</span> : <span>Snapshot Mensal</span>}
                                  {op.observacoes && (
                                    <span
                                      className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded"
                                      title={op.observacoes}
                                    >
                                      <MessageSquare size={10} />
                                      <span className="truncate max-w-[140px]">{op.observacoes}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Status / Equipe */}
                          <td className="px-3 py-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                STATUS_BADGE_STYLES[op.status_mes || 'Ativo']
                              }`}
                            >
                              {op.status_mes || 'Ativo'}
                            </span>
                            {op.equipe_turno && (
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{op.equipe_turno}</p>
                            )}
                          </td>

                          {/* TMA Médio (Semáforo) */}
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-black font-mono px-2.5 py-1 rounded-lg border ${SEMAPHORE_STYLES[tmaSem].badge}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${SEMAPHORE_STYLES[tmaSem].dot}`} />
                              {op.avgTma || '-'}
                            </span>
                          </td>

                          {/* NPS (Semáforo) */}
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg border ${SEMAPHORE_STYLES[npsSem].badge}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${SEMAPHORE_STYLES[npsSem].dot}`} />
                              {op.avgNps !== null ? formatDecimal(op.avgNps) : '-'}
                            </span>
                          </td>

                          {/* Monitoria (Semáforo + Barra) */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${SEMAPHORE_STYLES[monSem].bar}`}
                                  style={{
                                    width: `${op.avgMonitoria !== null ? Math.min(100, Math.max(0, op.avgMonitoria)) : 0}%`
                                  }}
                                />
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-md border ${SEMAPHORE_STYLES[monSem].badge}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${SEMAPHORE_STYLES[monSem].dot}`} />
                                {op.avgMonitoria !== null ? `${formatDecimal(op.avgMonitoria)}%` : '-'}
                              </span>
                            </div>
                          </td>

                          {/* ABS */}
                          {monthHasAbsColumn && (
                            <td className="px-3 py-3.5 text-center">
                              <span
                                className={`text-xs font-black px-2 py-1 rounded-lg border ${SEMAPHORE_STYLES[absSem].badge}`}
                              >
                                {op.avgAbsPct !== null ? `${formatDecimal(op.avgAbsPct)}%` : '-'}
                              </span>
                            </td>
                          )}

                          {/* Ações (Histórico, Editar no Mês, Excluir do Mês, Perfil) */}
                          <td className="px-6 py-3.5 text-right print:hidden">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setHistoryTarget({
                                    operadorChave: op.operador_chave,
                                    operadorNome: op.operador_nome,
                                    matricula: op.matricula
                                  })
                                }
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="Ver Histórico Evolutivo nos Meses"
                              >
                                <History size={16} />
                              </button>

                              {userRole === Role.SUPERVISOR && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRecord(op);
                                      setIsOperatorModalOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                    title={`Editar indicadores de ${op.operador_nome} em ${getCompetenciaLabel(selectedYear, selectedMonth)}`}
                                  >
                                    <Edit size={16} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDeletingRecord(op)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                    title={`Remover ${op.operador_nome} apenas de ${getCompetenciaLabel(selectedYear, selectedMonth)}`}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}

                              {op.matricula && operatorAvatarMap.has(String(op.matricula).trim()) && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/operator/${op.matricula}`)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                  title={`Abrir ficha cadastral completa (#${op.matricula})`}
                                >
                                  <ChevronRight size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO DE GRÁFICOS COMPARATIVOS */}
      <div className="space-y-4 pt-4 border-t border-slate-200/80 print:hidden">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <BarChart2 size={22} className="text-blue-600" />
          Rankings Gráficos Comparativos — {getCompetenciaLabel(selectedYear, selectedMonth)}
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* CHART 1: QUALIDADE */}
          <div className="bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-sm border border-slate-100/80 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm">
                <div className="p-1.5 rounded-lg bg-emerald-50">
                  <CheckCircle size={14} className="text-emerald-500" />
                </div>
                Qualidade (Monitoria)
              </h3>
              <ToggleFilter value={filterQualidade} onChange={setFilterQualidade} />
            </div>
            <div className="h-64">
              {dataQualidade.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataQualidade} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      dataKey="shortName"
                      type="category"
                      width={85}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      formatter={(value: number) => [formatDecimal(value) + '%', 'Qualidade']}
                    />
                    <Bar
                      dataKey="avgMonitoria"
                      radius={[0, 6, 6, 0]}
                      barSize={18}
                      fill={filterQualidade === 'best' ? '#10b981' : '#f59e0b'}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                  Sem dados para este período
                </div>
              )}
            </div>
          </div>

          {/* CHART 2: NPS */}
          <div className="bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-sm border border-slate-100/80 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <Heart size={14} className="text-blue-500" />
                </div>
                NPS
              </h3>
              <ToggleFilter value={filterNPS} onChange={setFilterNPS} />
            </div>
            <div className="h-64">
              {dataNPS.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataNPS} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      dataKey="shortName"
                      type="category"
                      width={85}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      formatter={(value: number) => [formatDecimal(value), 'NPS']}
                    />
                    <Bar
                      dataKey="avgNps"
                      radius={[0, 6, 6, 0]}
                      barSize={18}
                      fill={filterNPS === 'best' ? '#3b82f6' : '#f59e0b'}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                  Sem dados para este período
                </div>
              )}
            </div>
          </div>

          {/* CHART 3: TMA */}
          <div className="bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-sm border border-slate-100/80 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm">
                <div className="p-1.5 rounded-lg bg-indigo-50">
                  <Clock size={14} className="text-indigo-500" />
                </div>
                TMA
              </h3>
              <ToggleFilter value={filterTMA} onChange={setFilterTMA} />
            </div>
            <div className="h-64">
              {dataTMA.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataTMA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="shortName"
                      type="category"
                      width={85}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      formatter={(value: number) => [secondsToTma(value), 'TMA']}
                    />
                    <Bar
                      dataKey="avgTmaSeconds"
                      radius={[0, 6, 6, 0]}
                      barSize={18}
                      fill={filterTMA === 'best' ? '#6366f1' : '#f43f5e'}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                  Sem dados para este período
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: IMPORTAR PLANILHA EXCEL */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        supabase={supabase}
        currentAno={selectedYear}
        currentMes={selectedMonth}
        onImportSuccess={(importedCompetencias, msg) => {
          setToast({ type: 'success', message: msg });
          if (importedCompetencias.length > 0) {
            const last = importedCompetencias[importedCompetencias.length - 1];
            setSelectedYear(last.ano);
            setSelectedMonth(last.mes);
            loadSelectedMonth(last.ano, last.mes, true);
          } else {
            loadSelectedMonth(selectedYear, selectedMonth, true);
          }
        }}
      />

      {/* MODAL: ADICIONAR / EDITAR OPERADOR NO MÊS */}
      <MonthlyOperatorModal
        isOpen={isOperatorModalOpen}
        onClose={() => {
          setIsOperatorModalOpen(false);
          setEditingRecord(null);
        }}
        ano={selectedYear}
        mes={selectedMonth}
        editingRecord={editingRecord}
        registeredOperators={operators}
        onSave={handleSaveOperatorInMonth}
      />

      {/* MODAL: CONFIGURAR FAROL DE METAS (SEMÁFORO) */}
      <SemaphoreConfigModal
        isOpen={isSemaphoreModalOpen}
        onClose={() => setIsSemaphoreModalOpen(false)}
        goals={semaphoreGoals}
        onSave={handleSaveSemaphore}
      />

      {/* DRAWER: HISTÓRICO EVOLUTIVO DO OPERADOR */}
      <OperatorHistoryDrawer
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        supabase={supabase}
        operadorChave={historyTarget?.operadorChave || null}
        operadorNome={historyTarget?.operadorNome || ''}
        matricula={historyTarget?.matricula}
        semaphoreGoals={semaphoreGoals}
        onNavigateProfile={mat => navigate(`/operator/${mat}`)}
      />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO APENAS DO MÊS ATUAL */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Remover Operador de {getCompetenciaLabel(selectedYear, selectedMonth)}?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Você está prestes a remover <strong>{deletingRecord.operador_nome}</strong> apenas da competência{' '}
                  <strong>{getCompetenciaLabel(selectedYear, selectedMonth)}</strong>.
                </p>
                <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mt-2">
                  ✓ Independência Mensal: Os indicadores deste operador nos meses anteriores e posteriores não sofrerão nenhum impacto.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteFromMonth}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Excluir Apenas deste Mês</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Indicators;
