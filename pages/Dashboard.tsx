
import React, { useMemo, useState } from 'react';
import {
  Users,
  Clock,
  Heart,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter
} from 'lucide-react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Operator, TeamGoals, OperatorClassification } from '../types';
import { calculateAverageKPIs, getStatusColor, formatDecimal } from '../utils';
import { MONTHS } from '../constants';

const StatCard = ({ title, value, subtitle, icon, trend, color, goal, unit = '' }: any) => {
  const statusColor = getStatusColor(value, goal, title === 'TMA Médio' ? 'lower' : 'higher');
  const isSuccess = statusColor === 'text-green-600';

  const colorVariants: Record<string, { bg: string; text: string; ring: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', ring: 'ring-blue-500/20' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', ring: 'ring-indigo-500/20' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-600', ring: 'ring-rose-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', ring: 'ring-emerald-500/20' },
  };

  const theme = colorVariants[color] || colorVariants.blue;

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-lg hover:border-slate-300 transition-all duration-300 group">
      {/* Top bar accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${isSuccess ? 'bg-emerald-500' : goal ? 'bg-amber-500' : 'bg-blue-500'}`} />

      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${theme.bg} ${theme.text} ring-1 ${theme.ring} group-hover:scale-105 transition-transform duration-300`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${trend > 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60' : 'text-rose-700 bg-rose-50 border border-rose-200/60'}`}>
            {trend > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            {typeof value === 'number' ? formatDecimal(value) : value}{unit}
          </span>
          {goal && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isSuccess ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
              {isSuccess ? 'Na Meta' : 'Atenção'}
            </span>
          )}
        </div>

        {goal && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Meta Estipulada:</span>
            <span className="font-bold text-slate-700">
              {typeof goal === 'number' ? formatDecimal(goal) : goal}{unit}
            </span>
          </div>
        )}

        <p className="text-[11px] text-slate-400 mt-2 font-medium">{subtitle}</p>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ operators: Operator[], goals: TeamGoals }> = ({ operators, goals }) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [selectedClassification, setSelectedClassification] = useState<'all' | OperatorClassification>('all');

  const activeOperators = useMemo(() => {
    return operators.filter(o => {
      const isActive = o.active !== false;
      const matchesClassification = selectedClassification === 'all' || o.classification === selectedClassification;
      return isActive && matchesClassification;
    });
  }, [operators, selectedClassification]);

  // Filtra os KPIs baseados na seleção para os Cards e Rankings
  const currentPeriodKPIs = useMemo(() => {
    const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
    // IMPORTANTE: Para cada operador no período, pegamos apenas o lançamento MAIS RECENTE daquele mês específico.
    return activeOperators.flatMap(op => {
      const monthKpis = op.kpis.filter(k => k.month === targetKey);
      if (monthKpis.length === 0) return [];

      // Ordena por createdAt desc e pega o primeiro
      return monthKpis.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 1);
    });
  }, [activeOperators, selectedMonth, selectedYear]);

  // Conta operadores únicos que tem KPIs no período
  const operatorsWithKPIs = useMemo(() => {
    const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
    return activeOperators.filter(op => op.kpis.some(k => k.month === targetKey)).length;
  }, [activeOperators, selectedMonth, selectedYear]);

  const teamStats = useMemo(() => {
    return calculateAverageKPIs(currentPeriodKPIs);
  }, [currentPeriodKPIs]);

  // Dados do gráfico: Mostra todos os meses do ANO selecionado para dar contexto
  const chartData = useMemo(() => {
    return MONTHS.map((monthName, index) => {
      const monthNum = String(index + 1).padStart(2, '0');
      const monthKey = `${selectedYear}-${monthNum}`;

      // PEGA APENAS O ÚLTIMO LANÇAMENTO DE CADA OPERADOR PARA ESTE MÊS
      const monthKpis = activeOperators.flatMap(o => {
        const kpis = o.kpis.filter(k => k.month === monthKey);
        if (kpis.length === 0) return [];
        // Ordena por createdAt desc e pega o primeiro
        return kpis.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }).slice(0, 1);
      });

      const stats = calculateAverageKPIs(monthKpis);

      // Converte TMA de HH:MM:SS para segundos para o gráfico (para ter uma escala numérica)
      const tmaSeconds = stats.tma ? (() => {
        const parts = stats.tma.split(':');
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      })() : 0;

      return {
        name: monthName,
        NPS: stats.nps,
        Monitoria: stats.monitoria,
        TMA: tmaSeconds,
        tmaFormatted: stats.tma || '00:00:00'
      };
    });
  }, [activeOperators, selectedYear]);

  const topPerformers = useMemo(() => {
    const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;

    return activeOperators
      .map(o => {
        // Pega apenas o ÚLTIMO lançamento do mês selecionado
        const monthKpis = o.kpis.filter(k => k.month === targetKey);
        if (monthKpis.length === 0) return null;

        const kpi = [...monthKpis].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })[0];

        const score = (kpi.nps + kpi.monitoria) / 2;
        return {
          name: o.name,
          score: score,
          photoUrl: o.photoUrl,
          tma: kpi.tma,
          monitoria: kpi.monitoria,
          nps: kpi.nps
        };
      })
      .filter(Boolean) // Remove quem não tem KPI no mês
      .sort((a: any, b: any) => Number(b.score) - Number(a.score))
      .slice(0, 5);
  }, [activeOperators, selectedMonth, selectedYear]);

  // Gera lista de anos (do atual para trás)
  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Visão Geral da Operação</h1>
          <p className="text-slate-500 text-sm mt-1">Acompanhamento e evolução dos principais indicadores de atendimento</p>
        </div>

        {/* Premium Filter Bar */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
            <Filter size={16} />
          </div>
          <select
            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {MONTHS.map((m, idx) => (
              <option key={idx} value={String(idx + 1)}>{m}</option>
            ))}
          </select>
          <div className="w-px h-5 bg-slate-200" />
          <select
            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="w-px h-5 bg-slate-200" />
          <select
            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value as any)}
          >
            <option value="all">Todas Atribuições</option>
            <option value={OperatorClassification.SMF}>SMF</option>
            <option value={OperatorClassification.OUTROS}>Outros</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Operadores Computados" value={operatorsWithKPIs} subtitle={`Registros em ${MONTHS[Number(selectedMonth) - 1]}/${selectedYear}`} icon={<Calendar size={24} />} color="blue" />
        <StatCard title="TMA Médio" value={teamStats.tma} goal={goals.tma} subtitle="Média do período" icon={<Clock size={24} />} color="indigo" />
        <StatCard title="NPS Geral" value={teamStats.nps} goal={goals.nps} subtitle="Satisfação" icon={<Heart size={24} />} color="rose" />
        <StatCard title="Monitoria" value={teamStats.monitoria} goal={goals.monitoria} subtitle="Qualidade" icon={<CheckCircle size={24} />} color="emerald" />
      </div>

      {/* Charts Section */}
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Chart */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">Evolução dos Indicadores em {selectedYear}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Histórico consolidado mês a mês</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> NPS
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Monitoria
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> TMA
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorNPS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorMonitoria" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorTMA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', boxShadow: '0 12px 32px -4px rgba(0,0,0,0.3)', padding: '12px 16px', color: '#fff' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'TMA') {
                      return [props.payload.tmaFormatted, 'TMA'];
                    }
                    return [formatDecimal(value), name];
                  }}
                />
                <Area type="monotone" dataKey="NPS" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorNPS)" name="NPS" dot={false} activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="Monitoria" stroke="#10b981" strokeWidth={2.5} fill="url(#colorMonitoria)" name="Monitoria" dot={false} activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="TMA" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorTMA)" name="TMA" dot={false} activeDot={{ r: 5, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Ranking */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">Destaques da Equipe</h2>
              <p className="text-xs text-slate-500 mt-0.5">{MONTHS[Number(selectedMonth) - 1]} / {selectedYear}</p>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
              Top 5
            </span>
          </div>

          <div className="space-y-2.5">
            {topPerformers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Nenhum lançamento encontrado para este período.
              </div>
            ) : (
              topPerformers.map((op: any, index: number) => (
                <div
                  key={op.name}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/80 hover:border-slate-200/80 transition-all group"
                >
                  {/* Position Badge */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                    index === 0 ? 'bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/30' :
                    index === 1 ? 'bg-slate-300 text-slate-800' :
                    index === 2 ? 'bg-amber-700 text-amber-100' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-sm">
                    {op.photoUrl ? (
                      <img src={op.photoUrl} alt={op.name} className="w-full h-full object-cover" />
                    ) : (
                      op.name.charAt(0)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                      {op.name}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-100/70 text-amber-800">
                        ⏱ {op.tma}
                      </span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100/70 text-emerald-800">
                        ✓ {formatDecimal(op.monitoria)}
                      </span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-100/70 text-blue-800">
                        ♥ {formatDecimal(op.nps)}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0 pl-1">
                    <span className="text-base font-extrabold text-slate-900">{formatDecimal(op.score)}</span>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase">Média</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;