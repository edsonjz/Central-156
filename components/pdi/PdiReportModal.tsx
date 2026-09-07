import React from 'react';
import { X, Printer, ShieldCheck, Target, CheckCircle2, Award, MessageSquare } from 'lucide-react';
import { PDI } from '../../types/pdi';
import { Operator } from '../../types';
import { getGapClassification } from '../../constants/pdiConstants';

interface PdiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdi: PDI | null;
  operator: Operator | null;
}

export const PdiReportModal: React.FC<PdiReportModalProps> = ({
  isOpen,
  onClose,
  pdi,
  operator
}) => {
  if (!isOpen || !pdi) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Actions (Hidden on Print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-blue-400" />
            <span className="font-bold text-sm">Relatório Individual de Desenvolvimento (PDI 360°)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Printer size={15} /> Imprimir / Salvar PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6 text-slate-900 print:p-6 print:overflow-visible">
          
          {/* Institutional Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl">
                156
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">Prefeitura de Porto Alegre</h1>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Central 156 • Gestão Estratégica & PDI 360°</p>
              </div>
            </div>

            <div className="text-right text-xs">
              <p className="font-mono font-bold text-slate-600">DOCUMENTO OFICIAL DE DESENVOLVIMENTO</p>
              <p className="text-[11px] text-slate-400">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Colaborador & Ciclo */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Colaborador</span>
              <strong className="text-slate-900 text-sm">{operator?.name || 'Não identificado'}</strong>
              <p className="text-[11px] text-slate-500">Matrícula: #{pdi.operator_registration}</p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Supervisor Responsável</span>
              <strong className="text-slate-900">{pdi.supervisor_name}</strong>
              <p className="text-[11px] text-slate-500">Operação Central 156</p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Ciclo & Período</span>
              <strong className="text-slate-900">{pdi.ciclo_dias} Dias ({pdi.tipo})</strong>
              <p className="text-[11px] font-mono text-slate-500">{pdi.data_inicio} até {pdi.data_fim}</p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Status & Progresso</span>
              <strong className="text-slate-900">{pdi.status}</strong>
              <p className="text-[11px] font-mono font-bold text-blue-600">{pdi.progresso}% concluído</p>
            </div>
          </div>

          {/* Diagnóstico Inicial */}
          {pdi.diagnostico_inicial && (
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">1. Diagnóstico Inicial & Foco</h3>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed">
                {pdi.diagnostico_inicial}
              </div>
            </div>
          )}

          {/* Matriz de Competências */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">2. Matriz de Competências & Análise de Gaps</h3>
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Competência</th>
                  <th className="p-2.5 text-center">Nível Inicial</th>
                  <th className="p-2.5 text-center">Meta Desejada</th>
                  <th className="p-2.5 text-center">Gap</th>
                  <th className="p-2.5">Ação Recomendada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pdi.competencias.map(c => {
                  const gapInfo = getGapClassification(c.gap);
                  return (
                    <tr key={c.id}>
                      <td className="p-2.5 font-bold text-slate-900">{c.competencia}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{c.nivel_atual} / 5</td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{c.nivel_desejado} / 5</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${gapInfo.bg} ${gapInfo.color}`}>
                          {c.gap} ({gapInfo.label})
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">{c.acao_recomendada || '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Objetivos SMART */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">3. Metas SMART & Indicadores Operacionais</h3>
            <div className="space-y-2">
              {pdi.objetivos.map(obj => (
                <div key={obj.id} className="border border-slate-200 rounded-xl p-3 text-xs bg-white space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{obj.titulo}</span>
                    <span className="font-mono text-blue-700 font-bold">Meta: {obj.indicador_principal} {obj.meta}</span>
                  </div>
                  {obj.meta_secundaria && (
                    <p className="text-[11px] text-emerald-700 font-medium">Critério Combinado de Qualidade: {obj.meta_secundaria}</p>
                  )}
                  {obj.smart_especifica && (
                    <p className="text-slate-500 text-[11px]">Estratégia: {obj.smart_especifica}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ações 70/20/10 */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">4. Plano de Ação (Matriz 70/20/10)</h3>
            <div className="space-y-1.5">
              {pdi.acoes.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 mr-2">
                      [{a.tipo_70_20_10 === '70_pratica' ? '70% Prática' : a.tipo_70_20_10 === '20_social' ? '20% Social' : '10% Treino'}]
                    </span>
                    <span className="font-semibold text-slate-800">{a.descricao}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico de Feedbacks & Reconhecimentos */}
          {(pdi.feedbacks.length > 0 || pdi.reconhecimentos.length > 0) && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">5. Acompanhamento, Feedbacks e Conquistas</h3>
              <div className="space-y-2">
                {pdi.feedbacks.map(f => (
                  <div key={f.id} className="p-3 border border-blue-100 bg-blue-50/50 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <strong>Feedback ({f.tipo}) - {f.supervisor_nome}</strong>
                      <span>{new Date(f.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {f.pontos_positivos && <p><strong className="text-emerald-700">Destaques:</strong> {f.pontos_positivos}</p>}
                    {f.orientacoes && <p><strong className="text-blue-700">Orientações:</strong> {f.orientacoes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assinaturas */}
          <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs text-slate-500 border-t border-slate-200 mt-8">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1">
                <strong>{operator?.name}</strong>
              </div>
              <span>Colaborador / Operador</span>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1">
                <strong>{pdi.supervisor_name}</strong>
              </div>
              <span>Supervisor / Gestor Responsável</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default PdiReportModal;
