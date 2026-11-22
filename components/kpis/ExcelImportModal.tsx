import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  Loader2,
  Check,
  RefreshCw,
  Layers
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { ParsedSheetPreview, ImportMode, MonthlyKpiRecord } from '../../types/monthlyKpi';
import {
  parseExcelFileForPreview,
  batchUpsertMonthKpis,
  downloadExcelTemplate,
  getCompetenciaLabel
} from '../../services/monthlyKpiService';
import { MONTHS } from '../../constants';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  supabase: SupabaseClient | null;
  currentAno: number;
  currentMes: number;
  onImportSuccess: (
    importedCompetencias: Array<{ ano: number; mes: number }>,
    message: string,
    importedRecords?: MonthlyKpiRecord[],
    mode?: ImportMode
  ) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  supabase,
  currentAno,
  currentMes,
  onImportSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedSheetPreview[]>([]);
  const [activePreviewIdx, setActivePreviewIdx] = useState<number>(0);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setIsParsing(true);
    setParseError(null);
    setSheets([]);
    setConfirmReplace(false);

    const { sheets: parsed, error } = await parseExcelFileForPreview(file, currentAno, currentMes);
    setIsParsing(false);

    if (error) {
      setParseError(error);
      return;
    }

    setSheets(parsed);
    setActivePreviewIdx(0);
  };

  const toggleSheetSelection = (idx: number) => {
    setSheets(prev => prev.map((s, i) => (i === idx ? { ...s, selected: !s.selected } : s)));
  };

  const toggleAllSheets = (selected: boolean) => {
    setSheets(prev => prev.map(s => ({ ...s, selected })));
  };

  const updateSheetCompetencia = (idx: number, newAno: number, newMes: number) => {
    setSheets(prev =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        return {
          ...s,
          ano: newAno,
          mes: newMes,
          competenciaLabel: getCompetenciaLabel(newAno, newMes),
          records: s.records.map(r => ({ ...r, ano: newAno, mes: newMes }))
        };
      })
    );
  };

  const selectedSheets = sheets.filter(s => s.selected);
  const totalSelectedRecords = selectedSheets.reduce((acc, s) => acc + s.records.length, 0);
  const totalInconsistencies = selectedSheets.reduce((acc, s) => acc + s.inconsistencies.length, 0);

  const handleConfirmImport = async () => {
    if (selectedSheets.length === 0) return;
    if (importMode === 'replace' && !confirmReplace) {
      setParseError('Confirme a caixa de verificação antes de substituir todos os dados do(s) mês(es).');
      return;
    }

    setIsSaving(true);
    setParseError(null);
    setSaveProgress({ current: 0, total: selectedSheets.length });

    let totalImported = 0;
    const importedCompetencias: Array<{ ano: number; mes: number }> = [];
    const importedRecords: MonthlyKpiRecord[] = [];

    for (let i = 0; i < selectedSheets.length; i++) {
      const sheet = selectedSheets[i];
      setSaveProgress({ current: i + 1, total: selectedSheets.length });

      const { count, error } = await batchUpsertMonthKpis(
        supabase,
        sheet.ano,
        sheet.mes,
        sheet.records,
        importMode
      );

      if (error) {
        setIsSaving(false);
        setSaveProgress(null);
        setParseError(`Erro ao gravar aba "${sheet.sheetName}" (${sheet.competenciaLabel}): ${error}`);
        return;
      }

      totalImported += count;
      importedCompetencias.push({ ano: sheet.ano, mes: sheet.mes });
      importedRecords.push(...sheet.records);
    }

    setIsSaving(false);
    setSaveProgress(null);
    onImportSuccess(
      importedCompetencias,
      `Importação concluída: ${totalImported} registro(s) gravados em ${selectedSheets.length} competência(s) mensal(is)!`,
      importedRecords,
      importMode
    );
    onClose();
  };

  const currentPreview = sheets[activePreviewIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Importar Planilha Excel de KPIs (.xlsx / .xls)</h2>
              <p className="text-xs text-slate-300">
                Suporta planilha anual com múltiplas abas mensais ou aba única para uma competência específica
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadExcelTemplate(currentAno, currentMes)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-emerald-300 border border-white/15 transition-all"
              title="Baixar planilha modelo no formato padrão do sistema"
            >
              <Download size={15} />
              <span>Baixar Planilha Modelo</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Dropzone / File Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => handleFileSelect(e.target.files?.[0] || null)}
            />
            <div className="p-3 rounded-2xl bg-blue-100 text-blue-700">
              {isParsing ? <Loader2 size={26} className="animate-spin" /> : <Upload size={26} />}
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">
                {fileName ? `Arquivo selecionado: ${fileName}` : 'Clique para selecionar ou arraste sua planilha Excel (.xlsx / .xls)'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Colunas reconhecidas automaticamente: Nome / Agente, Matrícula, TMA (hh:mm:ss), NPS, Monitoria, ABS, Equipe/Turno, Status e Observações
              </p>
            </div>
          </div>

          {parseError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-sm">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{parseError}</div>
            </div>
          )}

          {/* Preview Area */}
          {sheets.length > 0 && (
            <div className="space-y-5">
              {/* Summary Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                    <Layers size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-blue-700">Abas / Meses Detectados</p>
                    <p className="text-xl font-black text-slate-900">
                      {selectedSheets.length} <span className="text-xs font-semibold text-slate-500">de {sheets.length} selecionada(s)</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-emerald-700">Operadores Reconhecidos</p>
                    <p className="text-xl font-black text-slate-900">
                      {totalSelectedRecords} <span className="text-xs font-semibold text-slate-500">registros mensais</span>
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${totalInconsistencies > 0 ? 'bg-amber-50/80 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`p-2.5 rounded-xl ${totalInconsistencies > 0 ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'}`}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-600">Alertas / Células Vazias</p>
                    <p className="text-xl font-black text-slate-900">
                      {totalInconsistencies} <span className="text-xs font-semibold text-slate-500">alerta(s)</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Sheet Tabs & Selection */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Selecione as Abas / Competências para Importar:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAllSheets(true)}
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      Marcar todas
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => toggleAllSheets(false)}
                      className="text-xs font-bold text-slate-500 hover:underline"
                    >
                      Desmarcar todas
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {sheets.map((s, idx) => (
                    <div
                      key={s.sheetName}
                      onClick={() => setActivePreviewIdx(idx)}
                      className={`group flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        activePreviewIdx === idx
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : s.selected
                          ? 'bg-white text-slate-800 border-slate-300 hover:border-blue-400'
                          : 'bg-slate-100 text-slate-400 border-slate-200 opacity-70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={s.selected}
                        onChange={e => {
                          e.stopPropagation();
                          toggleSheetSelection(idx);
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{s.sheetName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          activePreviewIdx === idx ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.competenciaLabel} ({s.records.length})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Sheet Details */}
              {currentPreview && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <span>Pré-visualização da Aba: "{currentPreview.sheetName}"</span>
                        <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                          {currentPreview.records.length} operadores
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Colunas reconhecidas:{' '}
                        {currentPreview.detectedColumns.map(c => (
                          <span key={c} className="inline-block bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded mr-1 text-[11px]">
                            {c}
                          </span>
                        ))}
                      </p>
                    </div>

                    {/* Competency Override Selector */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-500">Gravar em:</span>
                      <select
                        value={currentPreview.mes}
                        onChange={e => updateSheetCompetencia(activePreviewIdx, currentPreview.ano, Number(e.target.value))}
                        className="font-black text-slate-800 bg-transparent outline-none cursor-pointer"
                      >
                        {MONTHS.map((m, i) => (
                          <option key={m} value={i + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <span>/</span>
                      <select
                        value={currentPreview.ano}
                        onChange={e => updateSheetCompetencia(activePreviewIdx, Number(e.target.value), currentPreview.mes)}
                        className="font-black text-slate-800 bg-transparent outline-none cursor-pointer"
                      >
                        {[2024, 2025, 2026, 2027].map(y => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Inconsistencies List for Current Sheet */}
                  {currentPreview.inconsistencies.length > 0 && (
                    <div className="p-3 bg-amber-50/90 border-b border-amber-200 max-h-28 overflow-y-auto space-y-1">
                      <p className="text-[11px] font-black uppercase text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle size={13} />
                        Alertas detectados nesta aba ({currentPreview.inconsistencies.length}):
                      </p>
                      {currentPreview.inconsistencies.map((inc, i) => (
                        <p key={i} className="text-xs text-amber-900 pl-5">
                          • Linha {inc.rowNumber} (<strong>{inc.operatorName}</strong> - {inc.field}): {inc.message}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-slate-600 uppercase font-black sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">Operador Reconhecido</th>
                          <th className="px-3 py-2.5 text-center">Matrícula</th>
                          <th className="px-3 py-2.5 text-center">TMA</th>
                          <th className="px-3 py-2.5 text-center">NPS</th>
                          <th className="px-3 py-2.5 text-center">Monitoria</th>
                          <th className="px-3 py-2.5 text-center">ABS</th>
                          <th className="px-3 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentPreview.records.map((rec, i) => (
                          <tr key={`${rec.operador_chave}_${i}`} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-bold text-slate-800">{rec.operador_nome}</td>
                            <td className="px-3 py-2 text-center font-mono text-slate-500">{rec.matricula || '-'}</td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">{rec.tma || <span className="text-amber-500">Vazio</span>}</td>
                            <td className="px-3 py-2 text-center font-bold text-slate-700">{rec.nps ?? <span className="text-amber-500">Vazio</span>}</td>
                            <td className="px-3 py-2 text-center font-bold text-slate-700">{rec.monitoria !== null ? `${rec.monitoria}%` : <span className="text-amber-500">Vazio</span>}</td>
                            <td className="px-3 py-2 text-center text-slate-600">
                              {rec.abs !== null ? `${(rec.abs <= 1.5 ? rec.abs * 100 : rec.abs).toFixed(1)}%` : '-'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {rec.status_mes}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Mode Selector */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Modo de Gravação no Banco de Dados (Por Competência):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label
                    onClick={() => setImportMode('merge')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      importMode === 'merge'
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-black text-slate-800">Mesclar / Atualizar registros existentes (Recomendado)</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Atualiza os indicadores dos operadores presentes na planilha e mantém os demais operadores já cadastrados naquele mês.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setImportMode('replace')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      importMode === 'replace'
                        ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-black text-rose-900">Substituir todos os dados do mês</p>
                      <p className="text-xs text-rose-700/80 mt-0.5">
                        Remove os registros atuais do(s) mês(es) selecionado(s) e grava apenas os operadores presentes na planilha. Não afeta outros meses.
                      </p>
                    </div>
                  </label>
                </div>

                {importMode === 'replace' && (
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-900 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmReplace}
                      onChange={e => setConfirmReplace(e.target.checked)}
                      className="rounded border-rose-400 text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      Confirmo que desejo substituir todos os registros de {selectedSheets.length} competência(s) selecionada(s).
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            {saveProgress ? (
              <span className="text-blue-700 font-bold flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                Gravando lote {saveProgress.current} de {saveProgress.total} no Supabase...
              </span>
            ) : (
              <span>Gravação otimizada via Batch Upsert (1 requisição por competência mensal)</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving || selectedSheets.length === 0}
              onClick={handleConfirmImport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-black shadow-md transition-all"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>
                Confirmar Importação ({totalSelectedRecords} registros)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
