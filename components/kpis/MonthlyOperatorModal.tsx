import React, { useState, useEffect } from 'react';
import { X, Save, UserPlus, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { Operator } from '../../types';
import {
  MonthlyKpiRecord,
  MonthlyOperatorStatus,
  MONTHLY_STATUS_LIST
} from '../../types/monthlyKpi';
import {
  resolveCanonicalOperator,
  normalizeTmaValue,
  normalizeNumericMetric,
  getCompetenciaLabel
} from '../../services/monthlyKpiService';

interface MonthlyOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  ano: number;
  mes: number;
  editingRecord: MonthlyKpiRecord | null;
  registeredOperators: Operator[];
  onSave: (record: MonthlyKpiRecord) => Promise<{ error: string | null }>;
}

export const MonthlyOperatorModal: React.FC<MonthlyOperatorModalProps> = ({
  isOpen,
  onClose,
  ano,
  mes,
  editingRecord,
  registeredOperators,
  onSave
}) => {
  const [operadorNome, setOperadorNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [equipeTurno, setEquipeTurno] = useState('Central 156');
  const [statusMes, setStatusMes] = useState<MonthlyOperatorStatus>('Ativo');
  const [tma, setTma] = useState('');
  const [nps, setNps] = useState('');
  const [monitoria, setMonitoria] = useState('');
  const [absPct, setAbsPct] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    if (editingRecord) {
      setOperadorNome(editingRecord.operador_nome || '');
      setMatricula(editingRecord.matricula || '');
      setEquipeTurno(editingRecord.equipe_turno || 'Central 156');
      setStatusMes(editingRecord.status_mes || 'Ativo');
      setTma(editingRecord.tma || '');
      setNps(editingRecord.nps !== null && editingRecord.nps !== undefined ? String(editingRecord.nps) : '');
      setMonitoria(
        editingRecord.monitoria !== null && editingRecord.monitoria !== undefined
          ? String(editingRecord.monitoria)
          : ''
      );
      if (editingRecord.abs !== null && editingRecord.abs !== undefined) {
        const pct = editingRecord.abs <= 1.5 ? editingRecord.abs * 100 : editingRecord.abs;
        setAbsPct(String(Number(pct.toFixed(2))));
      } else {
        setAbsPct('');
      }
      setObservacoes(editingRecord.observacoes || '');
    } else {
      setOperadorNome('');
      setMatricula('');
      setEquipeTurno('Central 156');
      setStatusMes('Ativo');
      setTma('');
      setNps('');
      setMonitoria('');
      setAbsPct('');
      setObservacoes('');
    }
  }, [isOpen, editingRecord]);

  if (!isOpen) return null;

  const handleSelectPresetOperator = (reg: string) => {
    const found = registeredOperators.find(o => o.registration === reg);
    if (!found) return;
    setOperadorNome(found.name);
    setMatricula(found.registration);
    setEquipeTurno(`${found.classification || 'Central 156'} / ${found.workMode || 'Presencial'}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!operadorNome.trim()) {
      setFormError('Informe o nome do operador.');
      return;
    }

    const tmaParsed = normalizeTmaValue(tma);
    if (!tmaParsed.valid) {
      setFormError('Formato de TMA inválido. Use HH:MM:SS (ex: 00:04:15) ou deixe em branco.');
      return;
    }

    const npsParsed = normalizeNumericMetric(nps, 2);
    if (!npsParsed.valid || (npsParsed.value !== null && (npsParsed.value < 0 || npsParsed.value > 100))) {
      setFormError('NPS deve ser um número entre 0 e 100.');
      return;
    }

    const monParsed = normalizeNumericMetric(monitoria, 2);
    if (!monParsed.valid || (monParsed.value !== null && (monParsed.value < 0 || monParsed.value > 100))) {
      setFormError('Monitoria deve ser um número entre 0 e 100%.');
      return;
    }

    const absParsed = normalizeNumericMetric(absPct, 4);
    if (!absParsed.valid) {
      setFormError('ABS deve ser um número válido (ex: 100 ou 95.5).');
      return;
    }

    const canonical = resolveCanonicalOperator(operadorNome, matricula || null);
    const absStored =
      absParsed.value !== null
        ? absParsed.value > 1.5
          ? Number((absParsed.value / 100).toFixed(4))
          : absParsed.value
        : null;

    const record: MonthlyKpiRecord = {
      id: editingRecord?.id,
      ano,
      mes,
      operador_chave: editingRecord?.operador_chave || canonical.operador_chave,
      operador_nome: operadorNome.trim(),
      matricula: matricula.trim() || canonical.matricula,
      monitoria: monParsed.value,
      tma: tmaParsed.tma,
      tma_segundos: tmaParsed.tma_segundos,
      nps: npsParsed.value,
      abs: absStored,
      equipe_turno: equipeTurno.trim() || 'Central 156',
      status_mes: statusMes,
      observacoes: observacoes.trim() || null
    };

    setIsSaving(true);
    const { error } = await onSave(record);
    setIsSaving(false);

    if (error) {
      setFormError(error);
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              {editingRecord ? <Edit3 size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h2 className="text-base font-black">
                {editingRecord ? 'Editar Indicadores do Mês' : 'Incluir Operador na Competência'}
              </h2>
              <p className="text-xs text-slate-300">
                Competência: <strong>{getCompetenciaLabel(ano, mes)}</strong> (Snapshot independente)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {!editingRecord && registeredOperators.length > 0 && (
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                Autocompletar de Operador Cadastrado (Opcional)
              </label>
              <select
                onChange={e => handleSelectPresetOperator(e.target.value)}
                defaultValue=""
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">-- Ou digite um novo nome manualmente abaixo --</option>
                {registeredOperators.map(op => (
                  <option key={op.registration} value={op.registration}>
                    {op.name} (#{op.registration})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                Nome do Operador *
              </label>
              <input
                type="text"
                required
                value={operadorNome}
                onChange={e => setOperadorNome(e.target.value)}
                placeholder="Ex: Taise Cristina da Conceição Alcântara"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                Matrícula (Opcional)
              </label>
              <input
                type="text"
                value={matricula}
                onChange={e => setMatricula(e.target.value)}
                placeholder="Ex: 19191"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                Equipe / Turno
              </label>
              <input
                type="text"
                value={equipeTurno}
                onChange={e => setEquipeTurno(e.target.value)}
                placeholder="Ex: SMF / Presencial ou Home Office"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                Status no Mês
              </label>
              <select
                value={statusMes}
                onChange={e => setStatusMes(e.target.value as MonthlyOperatorStatus)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
              >
                {MONTHLY_STATUS_LIST.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KPIs */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-blue-700">
              Indicadores do Mês ({getCompetenciaLabel(ano, mes)})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  TMA (hh:mm:ss)
                </label>
                <input
                  type="text"
                  value={tma}
                  onChange={e => setTma(e.target.value)}
                  placeholder="00:04:15"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  NPS (0 - 100)
                </label>
                <input
                  type="text"
                  value={nps}
                  onChange={e => setNps(e.target.value)}
                  placeholder="92.5"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Monitoria (%)
                </label>
                <input
                  type="text"
                  value={monitoria}
                  onChange={e => setMonitoria(e.target.value)}
                  placeholder="97.5"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Assiduidade / ABS (%)
                </label>
                <input
                  type="text"
                  value={absPct}
                  onChange={e => setAbsPct(e.target.value)}
                  placeholder="100"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
              Observações / Feedback do Mês (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Anotações sobre férias, afastamento, destaque ou feedback específico deste mês..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>Salvar no Mês</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
