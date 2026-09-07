
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  Plus, 
  User, 
  Search,
  ChevronRight,
  Info
} from 'lucide-react';
import { Operator, Role } from '../types';

interface PendingIndicatorsProps {
  operators: Operator[];
  onUpdate: (ops: Operator[]) => void;
  userRole: Role;
}

const PendingIndicators: React.FC<PendingIndicatorsProps> = ({ operators, onUpdate, userRole }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const pendingOperators = operators.filter(o => {
    const hasNoKpis = o.kpis.length === 0;
    const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.registration.includes(searchTerm);
    return hasNoKpis && o.active && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Pendências de Indicadores
            {pendingOperators.length > 0 && (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60">
                {pendingOperators.length} pendentes
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Colaboradores ativos sem nenhum registro de KPI lançado</p>
        </div>
      </div>

      <div className="bg-blue-50/80 border border-blue-200/70 p-4 rounded-2xl flex gap-3 items-start shadow-sm">
        <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <p className="text-xs sm:text-sm text-blue-900 leading-relaxed font-medium">
          Estes operadores ainda não possuem nenhum indicador de TMA, NPS ou Monitoria computado. Clique no cartão para realizar o primeiro lançamento.
        </p>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input 
            type="text" 
            placeholder="Filtrar por nome ou matrícula..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {pendingOperators.length === 0 ? (
          <div className="col-span-full bg-white p-12 sm:p-16 rounded-2xl border border-dashed border-slate-200 text-center shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-500/10">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Todos os colaboradores em dia!</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Nenhum operador ativo possui pendência de lançamento no sistema.</p>
          </div>
        ) : (
          pendingOperators.map((op) => (
            <div key={op.registration} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-base uppercase ring-1 ring-slate-200/60">
                    {op.name.charAt(0)}
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                    #{op.registration}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1 group-hover:text-blue-600 transition-colors mb-1">{op.name}</h3>
                <p className="text-xs text-slate-400 font-medium mb-6">{op.role} • {op.workMode}</p>
              </div>
              
              <button 
                onClick={() => navigate(`/operator/${op.registration}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={16} /> Lançar Primeiro KPI
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PendingIndicators;
