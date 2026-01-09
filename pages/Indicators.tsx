
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
  Filter
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
import { Operator, TeamGoals, Role } from '../types';
import { calculateAverageKPIs, getStatusColor, tmaToSeconds, formatDecimal } from '../utils';
import { MONTHS } from '../constants';

interface IndicatorsProps {
  operators: Operator[];
  goals: TeamGoals;
  userRole: Role;
}

const SummaryCard = ({ title, value, goal, unit = '', type = 'higher' as const }: any) => {
  const isSuccess = getStatusColor(value, goal, type) === 'text-green-600';
  
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</span>
        <div className={`p-1.5 rounded-full ${isSuccess ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {isSuccess ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-black ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
          {typeof value === 'number' ? formatDecimal(value) : value}{unit}
        </span>
        <span className="text-xs text-gray-400 font-medium italic">Meta: {typeof goal === 'number' ? formatDecimal(goal) : goal}{unit}</span>
      </div>
    </div>
  );
};

const ToggleFilter = ({ value, onChange }: { value: 'best' | 'worst', onChange: (v: 'best' | 'worst') => void }) => (
  <div className="flex bg-gray-100 p-1 rounded-xl">
    <button 
      onClick={() => onChange('best')}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${value === 'best' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
    >
      Top 10 Melhores
    </button>
    <button 
      onClick={() => onChange('worst')}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${value === 'worst' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
    >
      Top 10 Piores
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

  // Filtros dos gráficos
  const [filterQualidade, setFilterQualidade] = useState<'best' | 'worst'>('best');
  const [filterNPS, setFilterNPS] = useState<'best' | 'worst'>('best');
  const [filterTMA, setFilterTMA] = useState<'best' | 'worst'>('best');
  
  const activeOps = useMemo(() => operators.filter(o => o.active), [operators]);
  
  // Cálculos baseados APENAS no mês selecionado
  const teamStats = useMemo(() => {
    const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
    const allKpis = activeOps.flatMap(o => o.kpis.filter(k => k.month === targetKey));
    return calculateAverageKPIs(allKpis);
  }, [activeOps, selectedMonth, selectedYear]);

  // Prepara dados de ranking considerando apenas o mês selecionado
  const rankingData = useMemo(() => {
    const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;

    return activeOps.map(op => {
      // Filtra KPI específico do mês
      const kpis = op.kpis.filter(k => k.month === targetKey);
      
      // Se não tem KPI no mês, retorna null para ser filtrado depois (não entra no ranking)
      if (kpis.length === 0) return null;

      const stats = calculateAverageKPIs(kpis);
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

  const filteredList = rankingData.filter(op => 
    op.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    op.registration.includes(searchTerm)
  );

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Métricas Consolidadas</h1>
          <p className="text-gray-500">Visão analítica de performance individual e coletiva.</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryCard title="TMA Médio Time" value={teamStats.tma} goal={goals.tma} type="lower" />
        <SummaryCard title="NPS Médio Time" value={teamStats.nps} goal={goals.nps} />
        <SummaryCard title="Qualidade Time" value={teamStats.monitoria} goal={goals.monitoria} />
      </div>

      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mt-4">
        <TrendingUp size={20} className="text-blue-600" />
        Rankings de Performance ({MONTHS[Number(selectedMonth)-1]}/{selectedYear})
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* GRÁFICO 1: QUALIDADE */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-emerald-500" />
              Ranking Qualidade
            </h3>
            <ToggleFilter value={filterQualidade} onChange={setFilterQualidade} />
          </div>
          <div className="h-64">
            {dataQualidade.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataQualidade} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="shortName" type="category" width={80} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                    formatter={(value: number) => [formatDecimal(value), 'Qualidade']}
                  />
                  <Bar dataKey="avgMonitoria" radius={[0, 4, 4, 0]} barSize={20}>
                    {dataQualidade.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={filterQualidade === 'best' ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">Sem dados para este período</div>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: NPS */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
              <Heart size={16} className="text-rose-500" />
              Ranking NPS
            </h3>
            <ToggleFilter value={filterNPS} onChange={setFilterNPS} />
          </div>
          <div className="h-64">
            {dataNPS.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataNPS} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="shortName" type="category" width={80} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                  formatter={(value: number) => [formatDecimal(value), 'NPS']}
                />
                <Bar dataKey="avgNps" radius={[0, 4, 4, 0]} barSize={20}>
                  {dataNPS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={filterNPS === 'best' ? '#3b82f6' : '#f97316'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">Sem dados para este período</div>
            )}
          </div>
        </div>

        {/* GRÁFICO 3: TMA */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
              <Clock size={16} className="text-indigo-500" />
              Ranking TMA
            </h3>
            <ToggleFilter value={filterTMA} onChange={setFilterTMA} />
          </div>
          <div className="h-64">
            {dataTMA.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataTMA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis dataKey="shortName" type="category" width={80} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-100 text-xs font-bold text-gray-600">
                          <p className="mb-1">{data.name}</p>
                          <p className="text-indigo-600">TMA: {data.avgTma}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgTmaSeconds" radius={[0, 4, 4, 0]} barSize={20}>
                  {dataTMA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={filterTMA === 'best' ? '#6366f1' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">Sem dados para este período</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Search size={18} className="text-gray-400" />
              Filtro Rápido
            </h3>
            <input 
              type="text" 
              placeholder="Buscar operador na tabela..."
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-2 px-4 text-sm focus:ring-2 focus:ring-blue-500/10 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Tabela de Performance - {MONTHS[Number(selectedMonth)-1]}/{selectedYear}</h3>
              <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-full">TOTAL: {filteredList.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white border-b border-gray-50">
                    <th className="px-6 py-4">Operador</th>
                    <th className="px-4 py-4 text-center">TMA Médio</th>
                    <th className="px-4 py-4 text-center">NPS</th>
                    <th className="px-4 py-4 text-center">Monitoria</th>
                    <th className="px-6 py-4 text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 italic">Nenhum registro encontrado para o período selecionado.</td>
                    </tr>
                  ) : (
                    filteredList.map((op) => (
                      <tr key={op.registration} className="hover:bg-blue-50/20 transition-colors group">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-slate-300 font-bold overflow-hidden shadow-sm">
                              {op.photoUrl ? <img src={op.photoUrl} className="w-full h-full object-cover" /> : op.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 line-clamp-1">{op.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold tracking-tight">#{op.registration}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold font-mono ${getStatusColor(op.avgTma, goals.tma, 'lower')}`}>
                            {op.avgTma}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${getStatusColor(op.avgNps, goals.nps)}`}>
                            {formatDecimal(op.avgNps)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-20 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${op.avgMonitoria >= goals.monitoria ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${op.avgMonitoria}%` }}
                              ></div>
                            </div>
                            <span className={`text-[10px] font-bold ${getStatusColor(op.avgMonitoria, goals.monitoria)}`}>
                              {formatDecimal(op.avgMonitoria)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button 
                            onClick={() => navigate(`/operator/${op.registration}`)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
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
