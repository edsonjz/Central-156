import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Operator, TeamGoals } from '../types';
import { calculateAverageKPIs, getStatusColor, formatDecimal } from '../utils';
import { Clock, ArrowLeft, Maximize, Minimize, Activity, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 bg-[#060913] text-white z-[9999] flex flex-col p-8 lg:p-14 overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header / Controls */}
      <div className="relative z-10 flex justify-between items-center mb-10 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate(-1)}
            className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition-all duration-200 text-slate-400 hover:text-white group hover:scale-105 shadow-lg active:scale-95"
            title="Sair do Modo TV"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-xl shadow-blue-500/20">
                <div className="w-full h-full bg-slate-950/40 rounded-[14px] flex items-center justify-center backdrop-blur-sm">
                  <Clock size={28} className="text-white animate-pulse" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
            </div>
            
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white">Central 156</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                  Live Wallboard
                </span>
              </div>
              <p className="text-xs lg:text-sm font-semibold text-slate-400 tracking-wider uppercase mt-0.5 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
                Porto Alegre • Painel de Monitoramento em Tempo Real
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-4xl lg:text-6xl font-mono font-black tracking-tight text-white drop-shadow-[0_0_25px_rgba(59,130,246,0.35)]">
              {time}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">
              Horário Oficial de Brasília
            </p>
          </div>

          <button 
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 rounded-2xl text-xs font-bold text-slate-300 hover:text-white transition-all duration-200 hover:scale-105 shadow-lg active:scale-95"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}</span>
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 flex-1 items-center">
        {/* TMA Médio */}
        <div className="relative group bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 lg:p-12 rounded-[2.5rem] border border-slate-800/90 text-center space-y-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-blue-500/10 hover:-translate-y-1">
          <div className="flex justify-center">
            <span className="px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs font-bold text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={14} className="text-blue-400" />
              TMA Médio
            </span>
          </div>

          <div className="py-2">
            <p className={`text-6xl lg:text-8xl font-mono font-black tracking-tight drop-shadow-lg ${getStatusColor(stats.tma, goals.tma, 'lower')}`}>
              {stats.tma}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800/60 border border-slate-700/40 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <p className="text-slate-300 font-bold text-xs uppercase tracking-widest">
              Meta Alvo: <span className="font-mono text-white">{goals.tma}</span>
            </p>
          </div>
        </div>

        {/* NPS Geral */}
        <div className="relative group bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 lg:p-12 rounded-[2.5rem] border border-slate-800/90 text-center space-y-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-emerald-500/10 hover:-translate-y-1">
          <div className="flex justify-center">
            <span className="px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs font-bold text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-400" />
              NPS Geral
            </span>
          </div>

          <div className="py-2">
            <p className={`text-6xl lg:text-8xl font-mono font-black tracking-tight drop-shadow-lg ${getStatusColor(stats.nps, goals.nps)}`}>
              {formatDecimal(stats.nps)}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800/60 border border-slate-700/40 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-slate-300 font-bold text-xs uppercase tracking-widest">
              Meta Alvo: <span className="font-mono text-white">{formatDecimal(goals.nps)}</span>
            </p>
          </div>
        </div>

        {/* Qualidade / Monitoria */}
        <div className="relative group bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 lg:p-12 rounded-[2.5rem] border border-slate-800/90 text-center space-y-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-purple-500/40 hover:shadow-purple-500/10 hover:-translate-y-1">
          <div className="flex justify-center">
            <span className="px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs font-bold text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={14} className="text-purple-400" />
              Qualidade (Monitoria)
            </span>
          </div>

          <div className="py-2">
            <p className={`text-6xl lg:text-8xl font-mono font-black tracking-tight drop-shadow-lg ${getStatusColor(stats.monitoria, goals.monitoria)}`}>
              {formatDecimal(stats.monitoria)}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800/60 border border-slate-700/40 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <p className="text-slate-300 font-bold text-xs uppercase tracking-widest">
              Meta Alvo: <span className="font-mono text-white">{formatDecimal(goals.monitoria)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 mt-10 flex justify-between items-center text-slate-400 font-semibold text-xs uppercase tracking-wider border-t border-slate-800/80 pt-6">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-slate-300">Central 156 Porto Alegre • Operação Ativa</span>
        </div>
        
        <div className="hidden sm:flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          <span>Sincronizado em tempo real • <strong className="text-white font-mono">{operators.length}</strong> colaboradores monitorados</span>
        </div>
        
        <div className="text-slate-500 text-[11px] font-mono">
          V2.5 ENTERPRISE
        </div>
      </div>
    </div>
  );
};

export default TvMode;