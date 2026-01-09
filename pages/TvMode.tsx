import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Operator, TeamGoals } from '../types';
import { calculateAverageKPIs, getStatusColor, formatDecimal } from '../utils';
import { Clock, ArrowLeft, Maximize, Minimize } from 'lucide-react';

const TvMode: React.FC<{ operators: Operator[], goals: TeamGoals }> = ({ operators, goals }) => {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = calculateAverageKPIs(operators.flatMap(o => o.kpis));

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white z-[9999] flex flex-col p-8 lg:p-12 overflow-hidden">
      {/* Header / Controls */}
      <div className="flex justify-between items-start mb-8 lg:mb-12">
        <div className="flex items-center gap-4 lg:gap-6">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors text-slate-400 hover:text-white group"
            title="Sair do Modo TV"
          >
            <ArrowLeft size={28} />
          </button>
          <div className="h-12 w-px bg-slate-800 mx-2 hidden sm:block"></div>
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 lg:p-4 rounded-2xl shadow-lg shadow-blue-900/20">
              <Clock size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter leading-none">Central 156</h1>
              <p className="text-blue-500 font-bold text-sm lg:text-lg tracking-widest mt-1">PAINEL DE MONITORAMENTO</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <p className="text-4xl lg:text-7xl font-mono font-black tracking-tight text-white drop-shadow-md">
            {time}
          </p>
          <button 
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-400 transition-all"
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            {isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia (F11)'}
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-12 flex-1 items-center">
        <div className="bg-slate-900/50 p-8 lg:p-14 rounded-[2.5rem] border-2 border-slate-800 text-center space-y-6 backdrop-blur-sm transition-transform hover:scale-[1.02]">
          <p className="text-xl lg:text-2xl font-bold text-slate-500 uppercase tracking-[0.2em]">TMA Médio</p>
          <p className={`text-7xl lg:text-9xl font-black tracking-tighter ${getStatusColor(stats.tma, goals.tma, 'lower')}`}>
            {stats.tma}
          </p>
          <div className="inline-block px-6 py-2 bg-slate-800/50 rounded-full">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Meta: {goals.tma}</p>
          </div>
        </div>

        <div className="bg-slate-900/50 p-8 lg:p-14 rounded-[2.5rem] border-2 border-slate-800 text-center space-y-6 backdrop-blur-sm transition-transform hover:scale-[1.02]">
          <p className="text-xl lg:text-2xl font-bold text-slate-500 uppercase tracking-[0.2em]">NPS Geral</p>
          <p className={`text-7xl lg:text-9xl font-black tracking-tighter ${getStatusColor(stats.nps, goals.nps)}`}>
            {formatDecimal(stats.nps)}
          </p>
          <div className="inline-block px-6 py-2 bg-slate-800/50 rounded-full">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Meta: {formatDecimal(goals.nps)}</p>
          </div>
        </div>

        <div className="bg-slate-900/50 p-8 lg:p-14 rounded-[2.5rem] border-2 border-slate-800 text-center space-y-6 backdrop-blur-sm transition-transform hover:scale-[1.02]">
          <p className="text-xl lg:text-2xl font-bold text-slate-500 uppercase tracking-[0.2em]">Qualidade</p>
          <p className={`text-7xl lg:text-9xl font-black tracking-tighter ${getStatusColor(stats.monitoria, goals.monitoria)}`}>
            {formatDecimal(stats.monitoria)}
          </p>
          <div className="inline-block px-6 py-2 bg-slate-800/50 rounded-full">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Meta: {formatDecimal(goals.monitoria)}</p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 flex justify-between items-center text-slate-600 font-bold text-xs lg:text-sm uppercase tracking-widest border-t border-slate-900 pt-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Sistema Operacional Porto Alegre 156</span>
        </div>
        <div className="hidden sm:block">
          Sincronizado com Base de Dados • {operators.length} Colaboradores Ativos
        </div>
        <div>
          Versão 2.5.0 Estratégica
        </div>
      </div>
    </div>
  );
};

export default TvMode;