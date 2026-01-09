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
  Key
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
    alert('Metas operacionais atualizadas!');
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

    if (window.confirm('Substituir base de dados atual?')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (Array.isArray(json)) {
            localStorage.setItem('callcenter_operators', JSON.stringify(json));
            window.location.reload();
          }
        } catch (err) { alert('Erro ao importar.'); }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-6xl space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações Estratégicas</h1>
          <p className="text-gray-500">Gerencie metas, backups e banco de dados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Metas */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <RefreshCw className="text-blue-600" size={20} />
            Metas Operacionais
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Meta TMA</label>
              <input type="text" className="w-full border rounded-xl p-3 font-mono text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.tma} onChange={e => setFormData({...formData, tma: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">NPS Mínimo</label>
              <input type="number" className="w-full border rounded-xl p-3 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.nps} onChange={e => setFormData({...formData, nps: Number(e.target.value)})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Monitoria</label>
              <input type="number" className="w-full border rounded-xl p-3 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.monitoria} onChange={e => setFormData({...formData, monitoria: Number(e.target.value)})} />
            </div>
          </div>
          <button onClick={handleSaveGoals} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
            <Save size={18} /> Salvar Metas
          </button>
        </div>

        {/* Supabase Config */}
        <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Globe size={120} />
          </div>

          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Globe className="text-green-400" size={20} />
              Supabase Database
            </h2>
            {cloudConfig?.enabled && (
              <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-black uppercase bg-emerald-400/10 px-2 py-1 rounded-md">
                <CheckCircle2 size={12} /> Conectado
              </div>
            )}
          </div>
          
          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl">
            <p className="text-[11px] text-green-200 leading-relaxed font-medium">
              <Info size={14} className="inline mr-1 mb-1" />
              Conexão direta com Supabase. As alterações são sincronizadas automaticamente em tempo real (Upsert).
            </p>
          </div>

          <div className="space-y-3 relative z-10">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Project URL</span>
              <input type="text" placeholder="https://xxx.supabase.co" className="w-full bg-slate-800 border-none rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-green-500/50 outline-none" value={cloudData.url} onChange={e => setCloudData({...cloudData, url: e.target.value})} />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Anon / Public Key</span>
              <input type="password" placeholder="ey..." className="w-full bg-slate-800 border-none rounded-xl p-2.5 text-xs text-blue-300 focus:ring-2 focus:ring-green-500/50 outline-none" value={cloudData.key} onChange={e => setCloudData({...cloudData, key: e.target.value})} />
            </div>
          </div>

          <button onClick={handleSaveCloud} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-500 transition-all active:scale-95 shadow-lg shadow-green-500/10">
            <RefreshCw size={18} /> Salvar e Conectar
          </button>
          
          <a href="https://supabase.com/dashboard/project" target="_blank" className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 hover:text-white transition-colors">
            Painel do Projeto <ExternalLink size={10} />
          </a>
        </div>

        {/* Backup Local */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Database className="text-gray-400" size={20} />
            Backups Manuais
          </h2>
          
          <div className="space-y-3">
            <button onClick={handleExportDB} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl border border-gray-100 transition-all">
              <div className="flex items-center gap-3">
                <Download className="text-blue-600" size={20} />
                <span className="text-sm font-bold text-gray-700">Baixar JSON</span>
              </div>
              <span className="text-[9px] bg-white px-2 py-1 rounded-md border font-black text-gray-400">EXPORTAR</span>
            </button>

            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-emerald-50 rounded-2xl border border-gray-100 transition-all">
              <div className="flex items-center gap-3">
                <Upload className="text-emerald-600" size={20} />
                <span className="text-sm font-bold text-gray-700">Subir JSON</span>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportDB} />
              <span className="text-[9px] bg-white px-2 py-1 rounded-md border font-black text-gray-400">IMPORTAR</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;