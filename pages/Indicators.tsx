
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Filter,
  Download
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Operator, TeamGoals, Role, OperatorClassification } from '../types';
import { calculateAverageKPIs, getStatusColor, tmaToSeconds, formatDecimal, exportToCSV, getLatestKPIsPerMonth } from '../utils';
import { MONTHS } from '../constants';

interface IndicatorsProps {
  operators: Operator[];
  goals: TeamGoals;
  userRole: Role;
}

const SummaryCard = ({ title, value, goal, unit = '', type = 'higher' as const }: any) => {
  const statusColor = getStatusColor(value, goal, type);
  const isSuccess = statusColor === 'text-green-600';
  const borderColor = isSuccess ? 'border-l-emerald-500' : 'border-l-amber-500';

  return (
    <div className={`
      relative overflow-hidden
      bg-gradient-to-br from-white via-white to-slate-50
      p-6 rounded-2xl 
      shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]
      border border-slate-100/80
      border-l-4 ${borderColor}
      transition-all duration-300 ease-out
      hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)]
      hover:-translate-y-1
      group
    `}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
        <div className={`p-1.5 rounded-full transition-transform duration-300 group-hover:scale-110 ${isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {isSuccess ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        </div>
      </div>
      <div className="flex items-baseline gap-3">
        <span className={`text-4xl font-black tracking-tight ${isSuccess ? 'text-emerald-600' : 'text-amber-600'}`}>
          {typeof value === 'number' ? formatDecimal(value) : value}{unit}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isSuccess ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(100, (typeof value === 'number' ? (value / (typeof goal === 'number' ? goal : 100)) * 100 : 50))}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap italic">
          Meta: {typeof goal === 'number' ? formatDecimal(goal) : goal}{unit}
        </span>
      </div>
    </div>
  );
};


const ToggleFilter = ({ value, onChange }: { value: 'best' | 'worst', onChange: (v: 'best' | 'worst') => void }) => (
  <div className="flex bg-slate-100/80 p-1 rounded-xl backdrop-blur-sm">
    <button
      onClick={() => onChange('best')}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${value === 'best' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
    >
      🏆 Top 10
    </button>
    <button
      onClick={() => onChange('worst')}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${value === 'worst' ? 'bg-white text-amber-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
    >
      ⚠️ Atenção
    </button>
  </div>
);

const Indicators: React.FC<IndicatorsProps> = ({ operators, goals, userRole }) => {
  const navigate = useNavigate();
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

  // Função auxiliar para ordenar e cortar os dados
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

  const filteredList = rankingData.filter(op =>
    op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.registration.includes(searchTerm)
  );

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Métricas Consolidadas</h1>
          <p className="text-slate-500 mt-1 font-medium">Visão analítica de performance individual e coletiva</p>
        </div>

        {/* Premium Filter Bar */}
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryCard title="TMA Médio Time" value={teamStats.tma} goal={goals.tma} type="lower" />
        <SummaryCard title="NPS Médio Time" value={teamStats.nps} goal={goals.nps} />
        <SummaryCard title="Qualidade Time" value={teamStats.monitoria} goal={goals.monitoria} />
      </div>

      <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mt-4">
        <TrendingUp size={20} className="text-blue-600" />
        Rankings de Performance — {MONTHS[Number(selectedMonth) - 1]}/{selectedYear}
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* CHART 1: QUALIDADE */}
        <div className="bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 flex flex-col transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded-lg bg-emerald-50"><CheckCircle size={14} className="text-emerald-500" /></div>
              Qualidade
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

      {/* Performance Table Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-4 bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-100"><Search size={16} className="text-slate-500" /></div>
              Filtro Rápido
            </h3>
            <input
              type="text"
              placeholder="Buscar operador na tabela..."
              className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/80 flex justify-between items-center">
              <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide">Tabela de Performance — {MONTHS[Number(selectedMonth) - 1]}/{selectedYear}</h3>
              <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full shadow-sm">TOTAL: {filteredList.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/80 border-b border-slate-100">
                    <th className="px-6 py-4">Operador</th>
                    <th className="px-4 py-4 text-center">TMA Médio</th>
                    <th className="px-4 py-4 text-center">NPS</th>
                    <th className="px-4 py-4 text-center">Monitoria</th>
                    <th className="px-6 py-4 text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 italic">Nenhum registro encontrado para o período selecionado.</td>
                    </tr>
                  ) : (
                    filteredList.map((op) => (
                      <tr key={op.registration} className="hover:bg-blue-50/30 transition-all duration-200 group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/50 flex items-center justify-center text-slate-400 font-bold overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                              {op.photoUrl ? <img src={op.photoUrl} className="w-full h-full object-cover" /> : op.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-slate-900">{op.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold tracking-tight">#{op.registration}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-sm font-black font-mono ${getStatusColor(op.avgTma, goals.tma, 'lower')}`}>
                            {op.avgTma}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-sm font-black ${getStatusColor(op.avgNps, goals.nps)}`}>
                            {formatDecimal(op.avgNps)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${op.avgMonitoria >= goals.monitoria ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}
                                style={{ width: `${op.avgMonitoria}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-black ${getStatusColor(op.avgMonitoria, goals.monitoria)}`}>
                              {formatDecimal(op.avgMonitoria)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => navigate(`/operator/${op.registration}`)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:shadow-sm"
                          >
                            <ChevronRight size={18} />
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
      </div>
    </div>
  );
};

export default Indicators;
