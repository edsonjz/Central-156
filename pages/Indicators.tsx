import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
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
  BarChart2
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
import { Operator, TeamGoals, Role, OperatorClassification } from '../types';
import { calculateAverageKPIs, getStatusColor, tmaToSeconds, formatDecimal, exportToCSV } from '../utils';
import { MONTHS } from '../constants';

interface IndicatorsProps {
  operators: Operator[];
  goals: TeamGoals;
  userRole: Role;
}

const SummaryCard = ({ title, value, goal, unit = '', type = 'higher' as const, onClick, isActive, icon, subtitle }: any) => {
  const statusColor = getStatusColor(value, goal, type);
  const isSuccess = statusColor === 'text-green-600';

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white rounded-2xl p-5 shadow-sm border transition-all duration-300 group cursor-pointer hover:shadow-lg hover:-translate-y-0.5 select-none ${
        isActive ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-md bg-blue-50/20' : 'border-slate-200/80 hover:border-blue-200'
      }`}
      title="Clique para ordenar a tabela por este indicador"
    >
      {/* Top accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${isActive ? 'bg-blue-600' : isSuccess ? 'bg-emerald-500' : goal ? 'bg-amber-500' : 'bg-slate-400'}`} />

      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {icon && <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{icon}</div>}
          <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{title}</span>
        </div>
        <div className={`p-1 rounded-full ${isActive ? 'bg-blue-600 text-white' : isSuccess ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20' : 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20'}`}>
          {isActive ? <ArrowUpDown size={13} /> : isSuccess ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <span className={`text-2xl sm:text-3xl font-black tracking-tight ${isActive ? 'text-blue-700' : isSuccess ? 'text-emerald-600' : goal ? 'text-amber-600' : 'text-slate-900'}`}>
          {typeof value === 'number' ? formatDecimal(value) : value}{unit}
        </span>
        {goal && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSuccess ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
            {isSuccess ? 'Atingida' : 'Abaixo'}
          </span>
        )}
      </div>

      {goal && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
          <span className="text-slate-400 text-[11px]">Meta:</span>
          <span className="font-bold text-slate-700 text-[11px]">
            {typeof goal === 'number' ? formatDecimal(goal) : goal}{unit}
          </span>
        </div>
      )}

      <div className={`mt-2 text-[10px] font-extrabold flex items-center gap-1 transition-colors ${isActive ? 'text-blue-700 underline' : 'text-slate-400 group-hover:text-blue-600'}`}>
        <span>{isActive ? '● Ativo na tabela (clique p/ alternar)' : subtitle || 'Clique para ordenar na tabela ↓'}</span>
      </div>
    </div>
  );
};

const ToggleFilter = ({ value, onChange }: { value: 'best' | 'worst', onChange: (v: 'best' | 'worst') => void }) => (
  <div className="flex bg-slate-100 p-1 rounded-xl">
    <button
      onClick={() => onChange('best')}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${value === 'best' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
    >
      Top 10
    </button>
    <button
      onClick={() => onChange('worst')}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${value === 'worst' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
    >
      Atenção
    </button>
  </div>
);

type TableSortColumn = 'name' | 'tma' | 'nps' | 'monitoria';
type TableSortDirection = 'asc' | 'desc';

const Indicators: React.FC<IndicatorsProps> = ({ operators, goals, userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');

  // Filtros de Data
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [selectedClassification, setSelectedClassification] = useState<'all' | OperatorClassification>('all');

  // Filtros dos gráficos
  const [filterQualidade, setFilterQualidade] = useState<'best' | 'worst'>('best');
  const [filterNPS, setFilterNPS] = useState<'best' | 'worst'>('best');
  const [filterTMA, setFilterTMA] = useState<'best' | 'worst'>('best');

  // Ordenação da Tabela de Performance
  const urlSort = (searchParams.get('sort') || location.state?.sort) as TableSortColumn | null;
  const urlDir = (searchParams.get('dir') || (urlSort === 'name' ? 'asc' : 'desc')) as TableSortDirection;

  const [sortColumn, setSortColumn] = useState<TableSortColumn | null>(urlSort || null);
  const [sortDirection, setSortDirection] = useState<TableSortDirection>(urlDir);

  // Sincroniza se vier por navegação de rota ou query param
  useEffect(() => {
    if (urlSort && ['name', 'tma', 'nps', 'monitoria'].includes(urlSort)) {
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
      // Alterna direção
      const nextDir: TableSortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      setSortDirection(nextDir);
      setSearchParams({ sort: column, dir: nextDir });
    } else {
      setSortColumn(column);
      // Para 'name': padrão inicial A-Z ('asc').
      // Para métricas numéricas (TMA, NPS, Monitoria): padrão inicial maior para menor ('desc').
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

  const activeOps = useMemo(() => {
    return operators.filter(o => {
      const isActive = o.active !== false;
      const matchesClassification = selectedClassification === 'all' || o.classification === selectedClassification;
      return isActive && matchesClassification;
    });
  }, [operators, selectedClassification]);

  // Cálculos baseados APENAS no mês selecionado
  const teamStats = useMemo(() => {
    const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
    const allKpis = activeOps.flatMap(o => {
      const kpis = o.kpis.filter(k => k.month === targetKey);
      if (kpis.length === 0) return [];
      return kpis.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 1);
    });
    return calculateAverageKPIs(allKpis);
  }, [activeOps, selectedMonth, selectedYear]);

  // Prepara dados de ranking considerando apenas o mês selecionado
  const rankingData = useMemo(() => {
    const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;

    return activeOps.map(op => {
      // Filtra KPI específico do mês
      const monthKpis = op.kpis.filter(k => k.month === targetKey);

      // Se não tem KPI no mês, retorna null para ser filtrado depois (não entra no ranking)
      if (monthKpis.length === 0) return null;

      // Pega apenas o MAIS RECENTE
      const latestKpi = [...monthKpis].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })[0];

      const stats = calculateAverageKPIs([latestKpi]);
      return {
        ...op,
        shortName: op.name.split(' ')[0],
        avgNps: stats.nps,
        avgMonitoria: stats.monitoria,
        avgTma: stats.tma,
        avgTmaSeconds: tmaToSeconds(stats.tma)
      };
    }).filter(Boolean) as any[]; // Remove operadores sem dados no mês
  }, [activeOps, selectedMonth, selectedYear]);

  // Função auxiliar para ordenar e cortar os dados dos gráficos
  const getSortedData = (metric: 'avgMonitoria' | 'avgNps' | 'avgTmaSeconds', mode: 'best' | 'worst') => {
    const sorted = [...rankingData].sort((a, b) => {
      if (metric === 'avgTmaSeconds') {
        return mode === 'best' ? a.avgTmaSeconds - b.avgTmaSeconds : b.avgTmaSeconds - a.avgTmaSeconds;
      } else {
        return mode === 'best' ? b[metric] - a[metric] : a[metric] - b[metric];
      }
    });
    return sorted.slice(0, 10);
  };

  const dataQualidade = useMemo(() => getSortedData('avgMonitoria', filterQualidade), [rankingData, filterQualidade]);
  const dataNPS = useMemo(() => getSortedData('avgNps', filterNPS), [rankingData, filterNPS]);
  const dataTMA = useMemo(() => getSortedData('avgTmaSeconds', filterTMA), [rankingData, filterTMA]);

  const handleExportReport = () => {
    if (rankingData.length === 0) return;

    const dataToExport = rankingData.map(op => ({
      'Matrícula': op.registration,
      'Nome': op.name,
      'Atribuição': op.classification || '-',
      'Mês': `${MONTHS[Number(selectedMonth) - 1]}/${selectedYear}`,
      'TMA': op.avgTma,
      'NPS': op.avgNps,
      'Qualidade (%)': op.avgMonitoria,
      'Status': op.active !== false ? 'Ativo' : 'Inativo'
    }));

    exportToCSV(dataToExport, `Relatorio_Geral_${MONTHS[Number(selectedMonth) - 1]}_${selectedYear}`);
  };

  const sortedAndFilteredList = useMemo(() => {
    const list = rankingData.filter(op =>
      op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.registration.includes(searchTerm)
    );

    if (!sortColumn) return list;

    return [...list].sort((a, b) => {
      let comparison = 0;

      if (sortColumn === 'name') {
        comparison = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      } else if (sortColumn === 'tma') {
        comparison = (a.avgTmaSeconds || 0) - (b.avgTmaSeconds || 0);
      } else if (sortColumn === 'nps') {
        comparison = (Number(a.avgNps) || 0) - (Number(b.avgNps) || 0);
      } else if (sortColumn === 'monitoria') {
        comparison = (Number(a.avgMonitoria) || 0) - (Number(b.avgMonitoria) || 0);
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [rankingData, searchTerm, sortColumn, sortDirection]);

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span>Métricas Consolidadas</span>
            <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              Indicadores
            </span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">
            Acompanhamento analítico e ordenação de performance por Operador, TMA Médio, NPS e Monitoria
          </p>
        </div>

        {/* Premium Filter Bar */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]">
          <div className="p-2.5 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl text-slate-500">
            <Filter size={18} />
          </div>
          <select
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer px-2 py-1 hover:bg-slate-50 rounded-lg transition-colors"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {MONTHS.map((m, idx) => (
              <option key={idx} value={String(idx + 1)}>{m}</option>
            ))}
          </select>
          <div className="w-px h-5 bg-slate-200" />
          <select
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer px-2 py-1 hover:bg-slate-50 rounded-lg transition-colors"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="w-px h-5 bg-slate-200" />
          <select
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer px-2 py-1 hover:bg-slate-50 rounded-lg transition-colors"
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value as any)}
          >
            <option value="all">Todas Atribuições</option>
            <option value={OperatorClassification.SMF}>SMF</option>
            <option value={OperatorClassification.OUTROS}>Outros</option>
          </select>
        </div>

        {userRole === Role.SUPERVISOR && (
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_4px_16px_-4px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 transition-all duration-200 text-sm"
          >
            <Download size={18} />
            Exportar Excel
          </button>
        )}
      </div>

      {/* 4 SUMMARY CARDS (TODOS OS 4 INDICADORES SOLICITADOS CLICÁVEIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard 
          title="Operador" 
          value={rankingData.length} 
          unit=" com dados" 
          icon={<Users size={16} />}
          subtitle="Clique p/ ordenar (A-Z ou Z-A)"
          isActive={sortColumn === 'name'}
          onClick={() => handleSort('name')}
        />
        <SummaryCard 
          title="TMA Médio" 
          value={teamStats.tma} 
          goal={goals.tma} 
          type="lower" 
          icon={<Clock size={16} />}
          subtitle="Clique p/ ordenar (Maior / Menor)"
          isActive={sortColumn === 'tma'}
          onClick={() => handleSort('tma')}
        />
        <SummaryCard 
          title="NPS" 
          value={teamStats.nps} 
          goal={goals.nps} 
          icon={<Heart size={16} />}
          subtitle="Clique p/ ordenar (Maior / Menor)"
          isActive={sortColumn === 'nps'}
          onClick={() => handleSort('nps')}
        />
        <SummaryCard 
          title="Monitoria" 
          value={teamStats.monitoria} 
          goal={goals.monitoria} 
          icon={<CheckCircle size={16} />}
          subtitle="Clique p/ ordenar (Maior / Menor)"
          isActive={sortColumn === 'monitoria'}
          onClick={() => handleSort('monitoria')}
        />
      </div>

      {/* TABELA DE PERFORMANCE (LOCALIZADA DIRETAMENTE NO TOPO PARA TOTAL VISIBILIDADE) */}
      <div id="performance-table-section" className="bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-200/80 flex flex-col">
        {/* Barra superior de busca e botões rápidos */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 w-full lg:w-auto flex-1 max-w-md">
            <div className="p-2.5 rounded-xl bg-slate-100"><Search size={18} className="text-slate-500" /></div>
            <input
              type="text"
              placeholder="Buscar operador pelo nome ou matrícula..."
              className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* BARRINHA DE BOTÕES DE ORDENAÇÃO RÁPIDA */}
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
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
                title="Limpar ordenação"
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
                <span>Tabela de Performance de Indicadores</span>
                <span className="text-slate-400 font-normal">({MONTHS[Number(selectedMonth) - 1]}/{selectedYear})</span>
              </h3>
              {sortColumn && (
                <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
                  <span>
                    Ordenado por: <strong>{sortColumn === 'name' ? 'Operador' : sortColumn === 'tma' ? 'TMA Médio' : sortColumn === 'nps' ? 'NPS' : 'Monitoria'}</strong>
                    {' '}({sortColumn === 'name' ? (sortDirection === 'asc' ? 'A → Z (Crescente)' : 'Z → A (Decrescente)') : (sortDirection === 'desc' ? 'Maior para Menor' : 'Menor para Maior')})
                  </span>
                  <button
                    type="button"
                    onClick={clearSort}
                    className="text-slate-400 hover:text-rose-600 font-black ml-1 text-sm"
                    title="Remover ordenação"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 italic hidden sm:inline">
                💡 Dica: Clique nas palavras no cabeçalho da tabela para alternar a ordenação
              </span>
              <span className="text-xs font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-full shadow-sm">
                TOTAL: {sortedAndFilteredList.length}
              </span>
            </div>
          </div>

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
                    title="Clique na palavra Operador para ordenar (A-Z ou Z-A)"
                  >
                    <div className="inline-flex items-center gap-2.5">
                      <span className="text-xs font-black tracking-wide border-b border-transparent group-hover:border-blue-400">
                        Operador
                      </span>
                      <div className={`p-1 rounded-md transition-colors ${sortColumn === 'name' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200/80 text-slate-500 group-hover:bg-blue-200 group-hover:text-blue-800'}`}>
                        {sortColumn === 'name' ? (
                          sortDirection === 'asc' ? <ArrowUp size={13} className="stroke-[3]" /> : <ArrowDown size={13} className="stroke-[3]" />
                        ) : (
                          <ArrowUpDown size={12} />
                        )}
                      </div>
                      {sortColumn === 'name' && (
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                          {sortDirection === 'asc' ? 'A-Z' : 'Z-A'}
                        </span>
                      )}
                    </div>
                  </th>

                  {/* COLUNA 2: TMA MÉDIO */}
                  <th 
                    onClick={() => handleSort('tma')}
                    className={`px-4 py-4 text-center cursor-pointer transition-all hover:bg-blue-100/60 group ${
                      sortColumn === 'tma' ? 'bg-blue-50/90 text-blue-800' : 'text-slate-700 hover:text-blue-700'
                    }`}
                    title="Clique na palavra TMA Médio para ordenar (Maior para menor ou Menor para maior)"
                  >
                    <div className="inline-flex items-center justify-center gap-2.5">
                      <span className="text-xs font-black tracking-wide border-b border-transparent group-hover:border-blue-400">
                        TMA Médio
                      </span>
                      <div className={`p-1 rounded-md transition-colors ${sortColumn === 'tma' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200/80 text-slate-500 group-hover:bg-blue-200 group-hover:text-blue-800'}`}>
                        {sortColumn === 'tma' ? (
                          sortDirection === 'desc' ? <ArrowDown size={13} className="stroke-[3]" /> : <ArrowUp size={13} className="stroke-[3]" />
                        ) : (
                          <ArrowUpDown size={12} />
                        )}
                      </div>
                      {sortColumn === 'tma' && (
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                          {sortDirection === 'desc' ? 'Maior' : 'Menor'}
                        </span>
                      )}
                    </div>
                  </th>

                  {/* COLUNA 3: NPS */}
                  <th 
                    onClick={() => handleSort('nps')}
                    className={`px-4 py-4 text-center cursor-pointer transition-all hover:bg-blue-100/60 group ${
                      sortColumn === 'nps' ? 'bg-blue-50/90 text-blue-800' : 'text-slate-700 hover:text-blue-700'
                    }`}
                    title="Clique na palavra NPS para ordenar (Maior para menor ou Menor para maior)"
                  >
                    <div className="inline-flex items-center justify-center gap-2.5">
                      <span className="text-xs font-black tracking-wide border-b border-transparent group-hover:border-blue-400">
                        NPS
                      </span>
                      <div className={`p-1 rounded-md transition-colors ${sortColumn === 'nps' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200/80 text-slate-500 group-hover:bg-blue-200 group-hover:text-blue-800'}`}>
                        {sortColumn === 'nps' ? (
                          sortDirection === 'desc' ? <ArrowDown size={13} className="stroke-[3]" /> : <ArrowUp size={13} className="stroke-[3]" />
                        ) : (
                          <ArrowUpDown size={12} />
                        )}
                      </div>
                      {sortColumn === 'nps' && (
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                          {sortDirection === 'desc' ? 'Maior' : 'Menor'}
                        </span>
                      )}
                    </div>
                  </th>

                  {/* COLUNA 4: MONITORIA */}
                  <th 
                    onClick={() => handleSort('monitoria')}
                    className={`px-4 py-4 text-center cursor-pointer transition-all hover:bg-blue-100/60 group ${
                      sortColumn === 'monitoria' ? 'bg-blue-50/90 text-blue-800' : 'text-slate-700 hover:text-blue-700'
                    }`}
                    title="Clique na palavra Monitoria para ordenar (Maior para menor ou Menor para maior)"
                  >
                    <div className="inline-flex items-center justify-center gap-2.5">
                      <span className="text-xs font-black tracking-wide border-b border-transparent group-hover:border-blue-400">
                        Monitoria
                      </span>
                      <div className={`p-1 rounded-md transition-colors ${sortColumn === 'monitoria' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200/80 text-slate-500 group-hover:bg-blue-200 group-hover:text-blue-800'}`}>
                        {sortColumn === 'monitoria' ? (
                          sortDirection === 'desc' ? <ArrowDown size={13} className="stroke-[3]" /> : <ArrowUp size={13} className="stroke-[3]" />
                        ) : (
                          <ArrowUpDown size={12} />
                        )}
                      </div>
                      {sortColumn === 'monitoria' && (
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                          {sortDirection === 'desc' ? 'Maior' : 'Menor'}
                        </span>
                      )}
                    </div>
                  </th>

                  <th className="px-6 py-4 text-right text-slate-400 font-bold">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedAndFilteredList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                      Nenhum registro encontrado para o período selecionado ({MONTHS[Number(selectedMonth) - 1]}/{selectedYear}).
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredList.map((op) => (
                    <tr key={op.registration} className="hover:bg-blue-50/40 transition-all duration-150 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/60 flex items-center justify-center text-slate-500 font-bold overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                            {op.photoUrl ? <img src={op.photoUrl} alt={op.name} className="w-full h-full object-cover" /> : op.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{op.name}</p>
                            <p className="text-[11px] text-slate-400 font-bold tracking-tight">#{op.registration}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 ${getStatusColor(op.avgTma, goals.tma, 'lower')}`}>
                          {op.avgTma}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-sm font-black px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 ${getStatusColor(op.avgNps, goals.nps)}`}>
                          {formatDecimal(op.avgNps)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${op.avgMonitoria >= goals.monitoria ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}
                              style={{ width: `${Math.min(100, Math.max(0, op.avgMonitoria))}%` }}
                            />
                          </div>
                          <span className={`text-xs font-black ${getStatusColor(op.avgMonitoria, goals.monitoria)}`}>
                            {formatDecimal(op.avgMonitoria)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/operator/${op.registration}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:shadow-sm"
                          title={`Ver perfil de ${op.name}`}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE GRÁFICOS COMPARATIVOS */}
      <div className="space-y-4 pt-4 border-t border-slate-200/80">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <BarChart2 size={22} className="text-blue-600" />
          Rankings Gráficos Comparativos — {MONTHS[Number(selectedMonth) - 1]}/{selectedYear}
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* CHART 1: QUALIDADE */}
          <div className="bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 flex flex-col transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm">
                <div className="p-1.5 rounded-lg bg-emerald-50"><CheckCircle size={14} className="text-emerald-500" /></div>
                Qualidade (Monitoria)
              </h3>
              <ToggleFilter value={filterQualidade} onChange={setFilterQualidade} />
            </div>
            <div className="h-64">
              {dataQualidade.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataQualidade} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <defs>
                      <linearGradient id="qualidadeGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={filterQualidade === 'best' ? '#10b981' : '#f59e0b'} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={filterQualidade === 'best' ? '#059669' : '#d97706'} stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="shortName" type="category" width={80} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', padding: '12px 16px' }}
                      formatter={(value: number) => [formatDecimal(value) + '%', 'Qualidade']}
                    />
                    <Bar dataKey="avgMonitoria" radius={[0, 6, 6, 0]} barSize={18} fill="url(#qualidadeGradient)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">Sem dados para este período</div>
              )}
            </div>
          </div>

          {/* CHART 2: NPS */}
          <div className="bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 flex flex-col transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm">
                <div className="p-1.5 rounded-lg bg-blue-50"><Heart size={14} className="text-blue-500" /></div>
                NPS
              </h3>
              <ToggleFilter value={filterNPS} onChange={setFilterNPS} />
            </div>
            <div className="h-64">
              {dataNPS.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataNPS} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <defs>
                      <linearGradient id="npsGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={filterNPS === 'best' ? '#3b82f6' : '#f59e0b'} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={filterNPS === 'best' ? '#2563eb' : '#d97706'} stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="shortName" type="category" width={80} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', padding: '12px 16px' }}
                      formatter={(value: number) => [formatDecimal(value), 'NPS']}
                    />
                    <Bar dataKey="avgNps" radius={[0, 6, 6, 0]} barSize={18} fill="url(#npsGradient)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">Sem dados para este período</div>
              )}
            </div>
          </div>

          {/* CHART 3: TMA */}
          <div className="bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 flex flex-col transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm">
                <div className="p-1.5 rounded-lg bg-indigo-50"><Clock size={14} className="text-indigo-500" /></div>
                TMA
              </h3>
              <ToggleFilter value={filterTMA} onChange={setFilterTMA} />
            </div>
            <div className="h-64">
              {dataTMA.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataTMA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <defs>
                      <linearGradient id="tmaGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={filterTMA === 'best' ? '#6366f1' : '#f59e0b'} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={filterTMA === 'best' ? '#4f46e5' : '#d97706'} stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="shortName" type="category" width={80} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', padding: '12px 16px' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-xs font-bold text-slate-600">
                              <p className="mb-1 text-slate-800">{data.name}</p>
                              <p className="text-indigo-600 text-sm">TMA: {data.avgTma}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="avgTmaSeconds" radius={[0, 6, 6, 0]} barSize={18} fill="url(#tmaGradient)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">Sem dados para este período</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Indicators;
