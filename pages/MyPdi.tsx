import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Award, 
  MessageSquare, 
  Brain, 
  TrendingUp, 
  Calendar, 
  HelpCircle, 
  Send,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Activity,
  History
} from 'lucide-react';
import { Operator } from '../types';
import { PDI, PDIAction } from '../types/pdi';
import { PdiService, calculateDynamicPdiStatus } from '../services/pdiService';
import { useAuth } from '../AuthContext';
import { getGapClassification } from '../constants/pdiConstants';

interface MyPdiProps {
  operators: Operator[];
}

const MyPdi: React.FC<MyPdiProps> = ({ operators }) => {
  const { userProfile, supabase } = useAuth();
  const [activePdi, setActivePdi] = useState<PDI | null>(null);
  const [historyPdis, setHistoryPdis] = useState<PDI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado para adicionar comentário/evidência em ação
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionEvidence, setActionEvidence] = useState('');

  // Estado para responder a feedback
  const [replyingFeedbackId, setReplyingFeedbackId] = useState<string | null>(null);
  const [feedbackReply, setFeedbackReply] = useState('');

  // Operador atual
  const operator = useMemo(() => {
    if (!userProfile) return null;
    return operators.find(o => o.registration === userProfile.registration) || userProfile;
  }, [userProfile, operators]);

  // Carregar PDIs do operador
  const loadPdis = useCallback(async () => {
    if (!operator) return;
    setIsLoading(true);
    try {
      const { active, history } = await PdiService.getPdisByOperator(supabase, operator.registration);
      setActivePdi(active);
      setHistoryPdis(history);
    } catch (e) {
      console.error('Erro ao carregar Meu PDI:', e);
    } finally {
      setIsLoading(false);
    }
  }, [operator, supabase]);

  useEffect(() => {
    loadPdis();
  }, [loadPdis]);

  // Atualizar status de uma Ação pelo Operador
  const handleToggleActionStatus = async (action: PDIAction) => {
    if (!activePdi) return;
    const newStatus = action.status === 'Concluído' ? 'Em andamento' : 'Concluído';
    await PdiService.updateAction(supabase, activePdi.id, action.id, { status: newStatus });
    await loadPdis();
  };

  // Salvar evidência/comentário na ação
  const handleSaveActionEvidence = async (actionId: string) => {
    if (!activePdi) return;
    await PdiService.updateAction(supabase, activePdi.id, actionId, { comentario_operador: actionEvidence });
    setEditingActionId(null);
    setActionEvidence('');
    await loadPdis();
  };

  // Responder a um feedback
  const handleSaveFeedbackReply = async (feedbackId: string) => {
    if (!activePdi) return;
    const fb = activePdi.feedbacks.find(f => f.id === feedbackId);
    if (fb) {
      fb.comentario_operador = feedbackReply;
      await PdiService.savePdi(supabase, activePdi);
      setReplyingFeedbackId(null);
      setFeedbackReply('');
      await loadPdis();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se não houver PDI ativo
  if (!activePdi) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
            <Target size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Nenhum PDI Ativo no Momento</h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Olá, <strong>{operator?.name}</strong>! Seu supervisor ainda não iniciou um ciclo de PDI para sua matrícula. Quando o plano for criado, você poderá acompanhar seus objetivos, registrar suas ações e ver suas conquistas aqui.
          </p>
        </div>

        {/* Histórico anterior se existir */}
        {historyPdis.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <History size={18} className="text-blue-600" />
              Histórico de Ciclos Anteriores
            </h3>
            <div className="space-y-3">
              {historyPdis.map(h => (
                <div key={h.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{h.titulo}</h4>
                    <p className="text-[11px] text-slate-400">Ciclo {h.ciclo_dias} dias • Concluído em {h.data_encerramento ? new Date(h.data_encerramento).toLocaleDateString('pt-BR') : h.data_fim}</p>
                    {h.resultado_final && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Resultado: {h.resultado_final}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-blue-600 text-sm">{h.progresso}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Cálculos do PDI ativo
  const dynamicStatus = calculateDynamicPdiStatus(activePdi);
  const statusColor = dynamicStatus === 'Em evolução'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : dynamicStatus === 'Atenção'
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : dynamicStatus === 'Crítico'
    ? 'bg-rose-50 border-rose-200 text-rose-700'
    : 'bg-blue-50 border-blue-200 text-blue-700';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(activePdi.data_fim);
  endDate.setHours(0, 0, 0, 0);
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const completedActionsCount = activePdi.acoes.filter(a => a.status === 'Concluído').length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      
      {/* BANNER MOTIVACIONAL DO TOPO */}
      <div className="bg-gradient-to-br from-[#0c1322] via-[#111c33] to-[#0f172a] text-white p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${statusColor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {dynamicStatus}
              </span>
              <span className="text-xs text-slate-400 font-medium">Ciclo {activePdi.ciclo_dias} dias ({activePdi.tipo})</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {activePdi.titulo}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Supervisor: <strong>{activePdi.supervisor_name}</strong> • Foco: <strong>{activePdi.dimensao_foco}</strong>
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md text-right min-w-[200px]">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-1">
              <span>Progresso Geral</span>
              <span className="font-mono text-emerald-400 text-lg font-black">{activePdi.progresso}%</span>
            </div>
            
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${activePdi.progresso}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 font-medium">
              <Clock size={12} className="inline mr-1 mb-0.5 text-blue-400" />
              <strong>{daysRemaining}</strong> dias restantes (até {activePdi.data_fim})
            </p>
          </div>
        </div>
      </div>

      {/* 5 CARDS DE RESUMO DO DESENVOLVIMENTO */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🎯 Objetivos</span>
          <p className="text-xl font-black text-slate-900 font-mono mt-1">{activePdi.objetivos.length}</p>
          <span className="text-[10px] text-slate-500">Metas SMART ativas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🧠 Competências</span>
          <p className="text-xl font-black text-indigo-700 font-mono mt-1">{activePdi.competencias.length}</p>
          <span className="text-[10px] text-slate-500">Em aprimoramento</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">📚 Ações 70/20/10</span>
          <p className="text-xl font-black text-emerald-700 font-mono mt-1">{completedActionsCount}/{activePdi.acoes.length}</p>
          <span className="text-[10px] text-slate-500">Atividades concluídas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">💬 Feedbacks</span>
          <p className="text-xl font-black text-blue-700 font-mono mt-1">{activePdi.feedbacks.length}</p>
          <span className="text-[10px] text-slate-500">Acompanhamentos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🏆 Conquistas</span>
          <p className="text-xl font-black text-amber-600 font-mono mt-1">{activePdi.reconhecimentos.length}</p>
          <span className="text-[10px] text-slate-500">Reconhecimentos</span>
        </div>
      </div>

      {/* SEÇÃO 1: OBJETIVOS & METAS COMBINADAS */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Target size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Meus Objetivos SMART</h2>
            <p className="text-xs text-slate-400">Metas operacionais e critérios combinados de qualidade</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {activePdi.objetivos.map(obj => (
            <div key={obj.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">{obj.titulo}</h3>
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shrink-0">
                  Meta: {obj.indicador_principal} {obj.meta}
                </span>
              </div>

              {obj.valor_atual && (
                <p className="text-[11px] text-slate-500 font-mono">
                  Ponto de Partida: <strong>{obj.valor_atual}</strong> → Alvo: <strong>{obj.meta}</strong>
                </p>
              )}

              {obj.meta_secundaria && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-medium">
                  🛡️ <strong>Qualidade preservada:</strong> {obj.meta_secundaria}
                </div>
              )}

              {obj.smart_especifica && (
                <p className="text-[11px] text-slate-600 italic">"{obj.smart_especifica}"</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 2: CHECKLIST INTERATIVO DE AÇÕES 70/20/10 */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Meu Plano de Ação (70/20/10)</h2>
              <p className="text-xs text-slate-400">Marque as atividades que concluiu e adicione suas evidências</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {completedActionsCount} de {activePdi.acoes.length} concluídas
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {activePdi.acoes.map(action => {
            const isDone = action.status === 'Concluído';
            const badgeType = action.tipo_70_20_10 === '70_pratica' 
              ? { label: '70% Prática', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
              : action.tipo_70_20_10 === '20_social'
              ? { label: '20% Social (Coaching)', color: 'bg-blue-50 text-blue-700 border-blue-200' }
              : { label: '10% Treinamento', color: 'bg-purple-50 text-purple-700 border-purple-200' };

            return (
              <div 
                key={action.id}
                className={`p-4 rounded-2xl border transition-all ${isDone 
                  ? 'bg-emerald-50/40 border-emerald-200' 
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleActionStatus(action)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-300 hover:border-slate-400 text-transparent'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeType.color}`}>
                          {badgeType.label}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-slate-400">
                          Prazo: {action.data_limite}
                        </span>
                      </div>

                      <p className={`text-xs sm:text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {action.descricao}
                      </p>

                      {action.comentario_operador && (
                        <p className="text-[11px] text-emerald-800 bg-emerald-100/60 px-2.5 py-1 rounded-lg mt-2 inline-block font-medium">
                          Minha evidência: "{action.comentario_operador}"
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingActionId(action.id);
                      setActionEvidence(action.comentario_operador || '');
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-bold px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors shrink-0"
                  >
                    {action.comentario_operador ? 'Editar Evidência' : '+ Evidência'}
                  </button>
                </div>

                {/* Caixa de Texto para Inserir Evidência */}
                {editingActionId === action.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <input
                      type="text"
                      value={actionEvidence}
                      onChange={e => setActionEvidence(e.target.value)}
                      placeholder="Descreva o que realizou (ex: Participei da monitoria com instrutor)..."
                      className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      onClick={() => handleSaveActionEvidence(action.id)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingActionId(null)}
                      className="px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 3: MATRIZ DE COMPETÊNCIAS & GAPS */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Brain size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Minhas Competências Avaliadas</h2>
            <p className="text-xs text-slate-400">Evolução do nível atual em direção ao nível desejado</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {activePdi.competencias.map(comp => {
            const gapInfo = getGapClassification(comp.gap);
            return (
              <div key={comp.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900">{comp.competencia}</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${gapInfo.bg} ${gapInfo.color}`}>
                    Gap: {comp.gap} ({gapInfo.label})
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-500">Nível Atual: {comp.nivel_atual}/5</span>
                    <span className="text-emerald-600">Meta: {comp.nivel_desejado}/5</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(comp.nivel_atual / 5) * 100}%` }} />
                  </div>
                </div>

                {comp.acao_recomendada && (
                  <p className="text-[11px] text-blue-800 bg-blue-50 p-2.5 rounded-xl border border-blue-100 leading-relaxed font-medium">
                    💡 <strong>Orientação:</strong> {comp.acao_recomendada}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 4: MURAL DE RECONHECIMENTOS & CONQUISTAS */}
      {activePdi.reconhecimentos.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-6 sm:p-7 rounded-3xl border border-amber-200/80 space-y-4">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <Award size={20} className="text-amber-600" />
            Mural de Conquistas & Reconhecimentos
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activePdi.reconhecimentos.map(rec => (
              <div key={rec.id} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shrink-0">
                  🏆
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {rec.tipo}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(rec.data).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 mt-1">{rec.titulo}</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{rec.descricao}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Concedido por: <strong>{rec.concedido_por}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO 5: FEEDBACKS DO SUPERVISOR */}
      {activePdi.feedbacks.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Feedbacks do Ciclo</h2>
              <p className="text-xs text-slate-400">Orientações de acompanhamento registradas pela supervisão</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {activePdi.feedbacks.map(fb => (
              <div key={fb.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{fb.supervisor_nome}</span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {fb.tipo}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{new Date(fb.data).toLocaleDateString('pt-BR')}</span>
                </div>

                {fb.pontos_positivos && (
                  <p className="text-xs text-slate-700">
                    <strong className="text-emerald-700">O que você fez de bom:</strong> {fb.pontos_positivos}
                  </p>
                )}

                {fb.orientacoes && (
                  <p className="text-xs text-slate-700">
                    <strong className="text-blue-700">Orientações:</strong> {fb.orientacoes}
                  </p>
                )}

                {/* Comentário do Operador */}
                {fb.comentario_operador ? (
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-700">
                    <strong className="text-slate-900">Sua resposta:</strong> "{fb.comentario_operador}"
                  </div>
                ) : (
                  <div>
                    {replyingFeedbackId === fb.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={feedbackReply}
                          onChange={e => setFeedbackReply(e.target.value)}
                          placeholder="Escreva seu comentário sobre este feedback..."
                          className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                        />
                        <button
                          onClick={() => handleSaveFeedbackReply(fb.id)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                        >
                          Enviar
                        </button>
                        <button
                          onClick={() => setReplyingFeedbackId(null)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingFeedbackId(fb.id)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 mt-1"
                      >
                        + Adicionar comentário a este feedback
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default MyPdi;
