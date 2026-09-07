import React, { useState, useRef, useEffect } from 'react';
import { TeamGoals, CloudConfig } from '../types';
import { 
  Save, 
  Download, 
  Upload, 
  Database, 
  RefreshCw,
  Globe,
  CheckCircle2,
  ExternalLink,
  Info,
  Target,
  FileJson,
  ShieldCheck
} from 'lucide-react';

interface SettingsProps {
  goals: TeamGoals;
  onUpdateGoals: (g: TeamGoals) => void;
  cloudConfig: CloudConfig | null;
  onUpdateCloudConfig: (c: CloudConfig) => void;
}

const SettingsPage: React.FC<SettingsProps> = ({ goals, onUpdateGoals, cloudConfig, onUpdateCloudConfig }) => {
  const [formData, setFormData] = useState(goals);
  const [cloudData, setCloudData] = useState<CloudConfig>(cloudConfig || {
    url: '', key: '', enabled: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cloudConfig) setCloudData(cloudConfig);
  }, [cloudConfig]);

  const handleSaveGoals = () => {
    onUpdateGoals(formData);
    alert('Metas operacionais atualizadas com sucesso!');
  };

  const handleSaveCloud = () => {
    if (!cloudData.url || !cloudData.key) {
      alert('Por favor, preencha a URL e a API Key.');
      return;
    }
    onUpdateCloudConfig({ ...cloudData, enabled: true });
  };

  const handleExportDB = () => {
    const data = localStorage.getItem('callcenter_operators');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_central156_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm('Atenção: Deseja realmente substituir a base de dados local atual pelo arquivo selecionado?')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (Array.isArray(json)) {
            localStorage.setItem('callcenter_operators', JSON.stringify(json));
            window.location.reload();
          }
        } catch (err) { alert('Erro ao importar base de dados. Arquivo JSON inválido.'); }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-400 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Configurações do Sistema</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestão de metas de atendimento, conexão com nuvem e rotinas de backup.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 items-start">
        
        {/* Metas Operacionais */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 lg:p-7 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100/80">
              <Target size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Metas Operacionais</h2>
              <p className="text-xs text-slate-400 font-medium">Indicadores globais de referência</p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Meta TMA Alvo</label>
                <span className="text-[10px] font-bold text-slate-400">Minutos:Segundos</span>
              </div>
              <input 
                type="text" 
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-sm font-semibold bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                value={formData.tma} 
                onChange={e => setFormData({...formData, tma: e.target.value})} 
                placeholder="Ex: 03:00"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">NPS Mínimo Alvo</label>
                <span className="text-[10px] font-bold text-slate-400">Escala de 0 a 100</span>
              </div>
              <input 
                type="number" 
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-sm font-semibold bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                value={formData.nps} 
                onChange={e => setFormData({...formData, nps: Number(e.target.value)})} 
                placeholder="Ex: 85"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Qualidade (Monitoria)</label>
                <span className="text-[10px] font-bold text-slate-400">Porcentagem (0-100)</span>
              </div>
              <input 
                type="number" 
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-sm font-semibold bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                value={formData.monitoria} 
                onChange={e => setFormData({...formData, monitoria: Number(e.target.value)})} 
                placeholder="Ex: 90"
              />
            </div>
          </div>

          <button 
            onClick={handleSaveGoals} 
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            <Save size={18} /> Salvar Metas
          </button>
        </div>

        {/* Supabase Config */}
        <div className="bg-[#0b101e] p-6 lg:p-7 rounded-3xl text-white space-y-6 relative overflow-hidden border border-slate-800 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Globe size={140} />
          </div>

          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Globe size={20} />
              </div>
              <div>
                <h2 className="font-bold text-base text-white">Supabase Cloud</h2>
                <p className="text-xs text-slate-400 font-medium">Sincronização em tempo real</p>
              </div>
            </div>

            {cloudConfig?.enabled && (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado
              </span>
            )}
          </div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl relative z-10">
            <p className="text-xs text-emerald-200/90 leading-relaxed font-medium flex items-start gap-2">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Conexão persistente segura. Os dados dos colaboradores e feedbacks são sincronizados automaticamente.</span>
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1.5">Project URL</span>
              <input 
                type="text" 
                placeholder="https://xxx.supabase.co" 
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all" 
                value={cloudData.url} 
                onChange={e => setCloudData({...cloudData, url: e.target.value})} 
              />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1.5">Anon / Public API Key</span>
              <input 
                type="password" 
                placeholder="ey..." 
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all" 
                value={cloudData.key} 
                onChange={e => setCloudData({...cloudData, key: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            <button 
              onClick={handleSaveCloud} 
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-2xl font-bold transition-all duration-200 active:scale-[0.98] shadow-lg shadow-emerald-600/20 text-sm"
            >
              <RefreshCw size={16} /> Salvar e Conectar Nuvem
            </button>
            
            <a 
              href="https://supabase.com/dashboard/project" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors py-1"
            >
              Acessar Painel do Supabase <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Backup Local */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 lg:p-7 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100/80">
              <Database size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Backups e Arquivos</h2>
              <p className="text-xs text-slate-400 font-medium">Exportação e importação manual JSON</p>
            </div>
          </div>
          
          <div className="space-y-3 pt-1">
            <button 
              onClick={handleExportDB} 
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-200 rounded-2xl transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Download size={18} />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">Exportar Base</span>
                  <span className="text-xs text-slate-400 font-normal">Baixar arquivo JSON completo</span>
                </div>
              </div>
              <span className="text-[10px] bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                JSON
              </span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-200 rounded-2xl transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload size={18} />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">Restaurar Base</span>
                  <span className="text-xs text-slate-400 font-normal">Carregar arquivo de backup JSON</span>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportDB} />
              <span className="text-[10px] bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                RESTORE
              </span>
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700">Dica:</span> Realize backups periódicos em JSON para manter snapshots históricos independentes.
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;