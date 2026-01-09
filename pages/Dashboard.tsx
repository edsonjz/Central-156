
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
import { Operator, TeamGoals } from '../types';
import { calculateAverageKPIs, getStatusColor, formatDecimal } from '../utils';
import { MONTHS } from '../constants';

const StatCard = ({ title, value, subtitle, icon, trend, color, goal, unit = '' }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>{icon}</div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={`text-2xl font-bold ${getStatusColor(value, goal, title === 'TMA Médio' ? 'lower' : 'higher')}`}>
          {typeof value === 'number' ? formatDecimal(value) : value}{unit}
        </span>
        {goal && <span className="text-xs text-gray-400">Meta: {typeof goal === 'number' ? formatDecimal(goal) : goal}{unit}</span>}
      </div>
      <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
    </div>
  </div>
);

const Dashboard: React.FC<{ operators: Operator[], goals: TeamGoals }> = ({ operators, goals }) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));

  const activeOperators = useMemo(() => operators.filter(o => o.active), [operators]);

  // Filtra os KPIs baseados na seleção para os Cards e Rankings
  const currentPeriodKPIs = useMemo(() => {
    const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
    return activeOperators.flatMap(op => op.kpis.filter(k => k.month === targetKey));
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

      const monthKpis = activeOperators.flatMap(o => o.kpis.filter(k => k.month === monthKey));
      const stats = calculateAverageKPIs(monthKpis);

      // Converte TMA de HH:MM:SS para minutos para o gráfico
      const tmaMinutes = stats.tma ? (() => {
        const parts = stats.tma.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
      })() : 0;

      return {
        name: monthName,
        nps: stats.nps,
        monitoria: stats.monitoria,
        tma: Number(tmaMinutes.toFixed(2))
      };
    });
  }, [activeOperators, selectedYear]);

  const topPerformers = useMemo(() => {
    const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;

    return activeOperators
      .map(o => {
        // Pega apenas o KPI do mês selecionado
        const kpi = o.kpis.find(k => k.month === targetKey);
        if (!kpi) return null;

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visão Geral da Operação</h1>
          <p className="text-gray-500">Acompanhamento de metas e produtividade.</p>
        </div>

        {/* Filtros de Data */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
            <Filter size={18} />
          </div>
          <select
            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {MONTHS.map((m, idx) => (
              <option key={idx} value={String(idx + 1)}>{m}</option>
            ))}
          </select>
          <div className="w-px h-4 bg-gray-200 mx-1"></div>
          <select
            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Operadores Computados" value={operatorsWithKPIs} subtitle={`Registros em ${MONTHS[Number(selectedMonth) - 1]}/${selectedYear}`} icon={<Calendar size={24} />} color="blue" />
        <StatCard title="TMA Médio" value={teamStats.tma} goal={goals.tma} subtitle="Média do período" icon={<Clock size={24} />} color="indigo" />
        <StatCard title="NPS Geral" value={teamStats.nps} goal={goals.nps} subtitle="Satisfação" icon={<Heart size={24} />} color="rose" />
        <StatCard title="Monitoria" value={teamStats.monitoria} goal={goals.monitoria} subtitle="Qualidade" icon={<CheckCircle size={24} />} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-bold text-lg">Evolução em {selectedYear}</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> NPS
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Monitoria
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div> TMA (min)
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none' }}
                  formatter={(value: number) => formatDecimal(value)}
                />
                <Area type="monotone" dataKey="nps" stroke="#3b82f6" fill="#3b82f620" />
                <Area type="monotone" dataKey="monitoria" stroke="#10b981" fill="#10b98120" />
                <Area type="monotone" dataKey="tma" stroke="#f59e0b" fill="#f59e0b20" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-6">Top 5 - {MONTHS[Number(selectedMonth) - 1]}</h2>
          <div className="space-y-6">
            {topPerformers.length === 0 ? (
              <p className="text-center text-gray-400 italic py-10">Sem dados para o período.</p>
            ) : (
              topPerformers.map((op: any) => (
                <div key={op.name} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold overflow-hidden shrink-0 border-2 border-white shadow-sm">
                    {op.photoUrl ? (
                      <img src={op.photoUrl} alt={op.name} className="w-full h-full object-cover" />
                    ) : (
                      op.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{op.name}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-medium" title="TMA">
                        ⏱ {op.tma}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-medium" title="Monitoria">
                        ✓ {formatDecimal(op.monitoria)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium" title="NPS">
                        ♥ {formatDecimal(op.nps)}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-700 shrink-0">{formatDecimal(op.score)}</span>
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