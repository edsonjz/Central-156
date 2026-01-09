
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="text-red-500" />
            Pendências de Indicadores
          </h1>
          <p className="text-gray-500">Operadores ativos sem nenhum KPI registrado no sistema.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-start">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-blue-800">
          Esta lista exibe colaboradores que precisam de atenção imediata da supervisão para o primeiro lançamento de metas e performance.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar por nome ou matrícula..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingOperators.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-dashed text-center">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Tudo em dia!</h3>
            <p className="text-gray-500">Todos os operadores ativos possuem pelo menos um KPI registrado.</p>
          </div>
        ) : (
          pendingOperators.map((op) => (
            <div key={op.registration} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xl uppercase">
                  {op.name.charAt(0)}
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                  #{op.registration}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 line-clamp-1 mb-1">{op.name}</h3>
              <p className="text-xs text-gray-500 mb-6">{op.role}</p>
              
              <button 
                onClick={() => navigate(`/operator/${op.registration}`)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors"
              >
                <Plus size={18} /> Lançar Primeiro KPI
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PendingIndicators;
