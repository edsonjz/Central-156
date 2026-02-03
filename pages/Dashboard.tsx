
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
  const borderColor = isSuccess ? 'border-l-emerald-500' : goal ? 'border-l-amber-500' : 'border-l-slate-300';

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
      flex flex-col justify-between
      group
    `}>
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br from-${color}-500/5 to-transparent opacity-60`} />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br from-${color}-50 to-${color}-100/50 text-${color}-600 shadow-sm group-hover:scale-105 transition-transform duration-300`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${trend > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
              {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</h3>
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-black tracking-tight ${statusColor}`}>
              {typeof value === 'number' ? formatDecimal(value) : value}{unit}
            </span>
          </div>
          {goal && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isSuccess ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, (typeof value === 'number' ? (value / goal) * 100 : 50))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                Meta: {typeof goal === 'number' ? formatDecimal(goal) : goal}{unit}
              </span>
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-3 font-medium">{subtitle}</p>
        </div>
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Visão Geral da Operação</h1>
          <p className="text-slate-500 mt-1 font-medium">Acompanhamento de metas e produtividade em tempo real</p>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Operadores Computados" value={operatorsWithKPIs} subtitle={`Registros em ${MONTHS[Number(selectedMonth) - 1]}/${selectedYear}`} icon={<Calendar size={24} />} color="blue" />
        <StatCard title="TMA Médio" value={teamStats.tma} goal={goals.tma} subtitle="Média do período" icon={<Clock size={24} />} color="indigo" />
        <StatCard title="NPS Geral" value={teamStats.nps} goal={goals.nps} subtitle="Satisfação" icon={<Heart size={24} />} color="rose" />
        <StatCard title="Monitoria" value={teamStats.monitoria} goal={goals.monitoria} subtitle="Qualidade" icon={<CheckCircle size={24} />} color="emerald" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Evolution Chart */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="font-black text-lg text-slate-800">Evolução em {selectedYear}</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Métricas consolidadas ao longo do ano</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm" /> NPS
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm" /> Monitoria
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm" /> TMA
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorNPS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="colorMonitoria" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="colorTMA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', padding: '12px 16px' }}
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'TMA') {
                      return [props.payload.tmaFormatted, 'TMA'];
                    }
                    return [formatDecimal(value), name];
                  }}
                />
                <Area type="monotone" dataKey="NPS" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorNPS)" name="NPS" dot={false} activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="Monitoria" stroke="#10b981" strokeWidth={2.5} fill="url(#colorMonitoria)" name="Monitoria" dot={false} activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="TMA" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorTMA)" name="TMA" dot={false} activeDot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Ranking */}
        <div className="bg-gradient-to-br from-white via-white to-slate-50 p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-lg text-slate-800">Top 5</h2>
              <p className="text-xs text-slate-400 font-medium">{MONTHS[Number(selectedMonth) - 1]} {selectedYear}</p>
            </div>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">🏆 Ranking</span>
          </div>
          <div className="space-y-3">
            {topPerformers.length === 0 ? (
              <p className="text-center text-slate-400 italic py-10 text-sm">Sem dados para o período.</p>
            ) : (
              topPerformers.map((op: any, index: number) => (
                <div
                  key={op.name}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-slate-100/50 transition-all duration-200 hover:bg-white hover:shadow-md hover:-translate-x-1 group cursor-pointer"
                >
                  {/* Position Badge */}
                  <div className={`
                    w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0
                    ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm' :
                      index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm' :
                        index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-sm' :
                          'bg-slate-100 text-slate-500'}
                  `}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 flex items-center justify-center font-bold overflow-hidden shrink-0 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                    {op.photoUrl ? (
                      <img src={op.photoUrl} alt={op.name} className="w-full h-full object-cover" />
                    ) : (
                      op.name.charAt(0)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate group-hover:text-slate-900">{op.name}</p>
                    <div className="flex gap-1.5 mt-1.5">
                      <span className="text-[9px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold" title="TMA">
                        ⏱ {op.tma}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold" title="Monitoria">
                        ✓ {formatDecimal(op.monitoria)}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold" title="NPS">
                        ♥ {formatDecimal(op.nps)}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-slate-700">{formatDecimal(op.score)}</span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Score</p>
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