import React, { useState, useEffect } from 'react';
import { X, Target, Save, RotateCcw } from 'lucide-react';
import {
  MonthlySemaphoreGoals,
  DEFAULT_SEMAPHORE_GOALS
} from '../../types/monthlyKpi';

interface SemaphoreConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: MonthlySemaphoreGoals;
  onSave: (newGoals: MonthlySemaphoreGoals) => Promise<void>;
}

export const SemaphoreConfigModal: React.FC<SemaphoreConfigModalProps> = ({
  isOpen,
  onClose,
  goals,
  onSave
}) => {
  const [form, setForm] = useState<MonthlySemaphoreGoals>(goals);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(goals);
  }, [isOpen, goals]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(form);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <Target size={20} />
            </div>
            <div>
              <h2 className="text-base font-black">Configurar Farol de Metas (Semáforo)</h2>
              <p className="text-xs text-slate-300">
                Define as faixas de destaque Verde (Na Meta), Amarelo (Atenção) e Vermelho (Fora)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* TMA */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700">TMA Médio (Menor é melhor)</span>
              <span className="text-[11px] text-slate-500 font-mono">Formato HH:MM:SS</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                  🟢 Verde (Até)
                </label>
                <input
                  type="text"
                  value={form.tma.meta}
                  onChange={e => setForm({ ...form, tma: { ...form.tma, meta: e.target.value } })}
                  className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-700 mb-1">
                  🟡 Amarelo (Até — acima é 🔴)
                </label>
                <input
                  type="text"
                  value={form.tma.atencao}
                  onChange={e => setForm({ ...form, tma: { ...form.tma, atencao: e.target.value } })}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* NPS */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-black uppercase text-slate-700">NPS (Maior é melhor)</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                  🟢 Verde (Mínimo)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.nps.meta}
                  onChange={e => setForm({ ...form, nps: { ...form.nps, meta: Number(e.target.value) } })}
                  className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-700 mb-1">
                  🟡 Amarelo (Mínimo — abaixo é 🔴)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.nps.atencao}
                  onChange={e => setForm({ ...form, nps: { ...form.nps, atencao: Number(e.target.value) } })}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Monitoria */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-black uppercase text-slate-700">Monitoria / Qualidade % (Maior é melhor)</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                  🟢 Verde (Mínimo %)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.monitoria.meta}
                  onChange={e => setForm({ ...form, monitoria: { ...form.monitoria, meta: Number(e.target.value) } })}
                  className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-700 mb-1">
                  🟡 Amarelo (Mínimo % — abaixo é 🔴)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.monitoria.atencao}
                  onChange={e => setForm({ ...form, monitoria: { ...form.monitoria, atencao: Number(e.target.value) } })}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* ABS */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-black uppercase text-slate-700">Assiduidade / ABS % (Maior é melhor)</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                  🟢 Verde (Mínimo %)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.abs.meta}
                  onChange={e => setForm({ ...form, abs: { ...form.abs, meta: Number(e.target.value) } })}
                  className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-700 mb-1">
                  🟡 Amarelo (Mínimo % — abaixo é 🔴)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.abs.atencao}
                  onChange={e => setForm({ ...form, abs: { ...form.abs, atencao: Number(e.target.value) } })}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setForm(DEFAULT_SEMAPHORE_GOALS)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              <RotateCcw size={13} />
              <span>Restaurar padrão</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md"
              >
                <Save size={14} />
                <span>Salvar Farol</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
