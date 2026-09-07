import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Target, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  FileText, 
  Edit, 
  Trash2, 
  Award, 
  MessageSquare, 
  User, 
  Brain, 
  Sparkles,
  Calendar,
  Eye,
  RefreshCw,
  Printer,
  ChevronRight,
  ShieldCheck,
  X,
  Check
} from 'lucide-react';
import { Operator, Role } from '../types';
import { PDI, PDIStatus, PDIType, PDIResult, ActionCategory702010, PDIAction } from '../types/pdi';
import { PdiService, calculateDynamicPdiStatus } from '../services/pdiService';
import { PdiWizardModal } from '../components/pdi/PdiWizardModal';
import { PdiReportModal } from '../components/pdi/PdiReportModal';
import { useAuth } from '../AuthContext';
import { getGapClassification } from '../constants/pdiConstants';

interface PdiManagementProps {
  operators: Operator[];
}

const PdiManagement: React.FC<PdiManagementProps> = ({ operators }) => {
  const { supabase, userProfile } = useAuth();
  const [pdis, setPdis] = useState<PDI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modais
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingPdi, setEditingPdi] = useState<PDI | null>(null);

  const [reportPdi, setReportPdi] = useState<PDI | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  // Modal de Detalhe & Acompanhamento
  const [selectedPdiForDetail, setSelectedPdiForDetail] = useState<PDI | null>(null);

  // Modal de Novo Feedback Rápido
  const [feedbackModalPdi, setFeedbackModalPdi] = useState<PDI | null>(null);
  const [feedbackTipo, setFeedbackTipo] = useState<any>('Acompanhamento');
  const [feedbackPositivos, setFeedbackPositivos] = useState('');
  const [feedbackAtencao, setFeedbackAtencao] = useState('');
  const [feedbackOrientacoes, setFeedbackOrientacoes] = useState('');

  // Modal de Novo Reconhecimento Rápido
  const [recogModalPdi, setRecogModalPdi] = useState<PDI | null>(null);
  const [recogTipo, setRecogTipo] = useState<any>('Evolução destaque');
  const [recogTitulo, setRecogTitulo] = useState('');
  const [recogDesc, setRecogDesc] = useState('');

  // Modal de Encerramento com Avaliação Final
  const [finishModalPdi, setFinishModalPdi] = useState<PDI | null>(null);
  const [resultadoFinal, setResultadoFinal] = useState<PDIResult>('Atingiu expectativas');
  const [comentarioFinal, setComentarioFinal] = useState('');

  // Ações no Modal de Detalhe
  const [showAddActionInDetail, setShowAddActionInDetail] = useState(false);
  const [newActionDesc, setNewActionDesc] = useState('');
  const [newActionCategory, setNewActionCategory] = useState<ActionCategory702010>('70_pratica');
  const [newActionResp, setNewActionResp] = useState('Operador');
  const [newActionDeadline, setNewActionDeadline] = useState('');

  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editActionDesc, setEditActionDesc] = useState('');
  const [editActionCat, setEditActionCat] = useState<ActionCategory702010>('70_pratica');
  const [editActionResp, setEditActionResp] = useState('');
  const [editActionDeadline, setEditActionDeadline] = useState('');

  // Carregar dados
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await PdiService.getAllPdis(supabase);
      setPdis(data);
    } catch (e) {
      console.error('Erro ao carregar PDIs:', e);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Estatísticas do Topo
  const stats = useMemo(() => PdiService.calculateStats(pdis), [pdis]);

  // Filtragem de PDIs
  const filteredPdis = useMemo(() => {
    return pdis.filter(p => {
      const op = operators.find(o => o.registration === p.operator_registration);
      const opName = op?.name || '';

      const matchSearch = opName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.operator_registration.includes(searchTerm) ||
                          p.titulo.toLowerCase().includes(searchTerm.toLowerCase());

      const dynamicStatus = calculateDynamicPdiStatus(p);
      const matchStatus = statusFilter === 'all' || dynamicStatus === statusFilter;
      const matchType = typeFilter === 'all' || p.tipo === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [pdis, operators, searchTerm, statusFilter, typeFilter]);

  // Salvar PDI do Wizard
  const handleSaveWizard = async (pdiData: Partial<PDI>) => {
    await PdiService.savePdi(supabase, pdiData);
    await loadData();
  };

  // Deletar PDI
  const handleDeletePdi = async (pdiId: string, opName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o PDI de ${opName}? Esta ação não pode ser desfeita.`)) {
      await PdiService.deletePdi(supabase, pdiId);
      await loadData();
    }
  };

  // Salvar Feedback Rápido
  const handleSaveFeedback = async () => {
    if (!feedbackModalPdi) return;
    await PdiService.addFeedback(supabase, feedbackModalPdi.id, {
      supervisor_nome: userProfile?.name || 'Supervisor',
      tipo: feedbackTipo,
      pontos_positivos: feedbackPositivos,
      pontos_atencao: feedbackAtencao,
      orientacoes: feedbackOrientacoes
    });
    setFeedbackModalPdi(null);
    setFeedbackPositivos('');
    setFeedbackAtencao('');
    setFeedbackOrientacoes('');
    await loadData();
    alert('Feedback registrado com sucesso no PDI!');
  };

  // Salvar Reconhecimento
  const handleSaveRecognition = async () => {
    if (!recogModalPdi) return;
    if (!recogTitulo || !recogDesc) {
      alert('Preencha o título e a descrição do reconhecimento.');
      return;
    }
    await PdiService.addRecognition(supabase, recogModalPdi.id, recogModalPdi.operator_registration, {
      tipo: recogTipo,
      titulo: recogTitulo,
      descricao: recogDesc,
      concedido_por: userProfile?.name || 'Supervisor'
    });
    setRecogModalPdi(null);
    setRecogTitulo('');
    setRecogDesc('');
    await loadData();
    alert('Reconhecimento concedido com sucesso!');
  };

  // Encerramento do Ciclo
  const handleFinishCycle = async () => {
    if (!finishModalPdi) return;
    await PdiService.finishPdiCycle(supabase, finishModalPdi.id, resultadoFinal, comentarioFinal);
    setFinishModalPdi(null);
    setComentarioFinal('');
    await loadData();
    alert('Ciclo do PDI finalizado com sucesso!');
  };

  // Gerenciamento de Ações 70/20/10 no Modal de Detalhe
  const handleCreateActionInDetail = async () => {
    if (!selectedPdiForDetail) return;
    if (!newActionDesc.trim()) {
      alert('Informe a descrição da ação proposta.');
      return;
    }

    const newAction: PDIAction = {
      id: (crypto as any).randomUUID ? (crypto as any).randomUUID() : `act_${Date.now()}`,
      tipo_70_20_10: newActionCategory,
      descricao: newActionDesc.trim(),
      responsavel: newActionResp.trim() || 'Operador',
      prazo: newActionDeadline || undefined,
      status: 'Não iniciada'
    };

    const updatedAcoes = [...(selectedPdiForDetail.acoes || []), newAction];
    const updatedPdi: PDI = { ...selectedPdiForDetail, acoes: updatedAcoes };
    
    await PdiService.savePdi(supabase, updatedPdi);
    setSelectedPdiForDetail(updatedPdi);
    setNewActionDesc('');
    setNewActionDeadline('');
    setShowAddActionInDetail(false);
    await loadData();
  };

  const handleStartEditAction = (act: PDIAction) => {
    setEditingActionId(act.id);
    setEditActionDesc(act.descricao);
    setEditActionCat(act.tipo_70_20_10);
    setEditActionResp(act.responsavel || 'Operador');
    setEditActionDeadline(act.prazo || '');
  };

  const handleSaveActionEdit = async (actionId: string) => {
    if (!selectedPdiForDetail) return;
    if (!editActionDesc.trim()) {
      alert('A descrição da ação não pode ficar vazia.');
      return;
    }

    const updatedAcoes = selectedPdiForDetail.acoes.map(a => {
      if (a.id === actionId) {
        return {
          ...a,
          descricao: editActionDesc.trim(),
          tipo_70_20_10: editActionCat,
          responsavel: editActionResp.trim() || 'Operador',
          prazo: editActionDeadline || undefined
        };
      }
      return a;
    });

    const updatedPdi: PDI = { ...selectedPdiForDetail, acoes: updatedAcoes };
    await PdiService.savePdi(supabase, updatedPdi);
    setSelectedPdiForDetail(updatedPdi);
    setEditingActionId(null);
    await loadData();
  };

  const handleDeleteActionInDetail = async (actionId: string) => {
    if (!selectedPdiForDetail) return;
    if (!window.confirm('Tem certeza que deseja excluir esta ação do PDI?')) return;

    const updatedAcoes = selectedPdiForDetail.acoes.filter(a => a.id !== actionId);
    const updatedPdi: PDI = { ...selectedPdiForDetail, acoes: updatedAcoes };
    await PdiService.savePdi(supabase, updatedPdi);
    setSelectedPdiForDetail(updatedPdi);
    await loadData();
  };

  const handleToggleActionStatusInDetail = async (actionId: string) => {
    if (!selectedPdiForDetail) return;
    const act = selectedPdiForDetail.acoes.find(a => a.id === actionId);
    if (!act) return;

    const newStatus = act.status === 'Concluído' ? 'Em andamento' : 'Concluído';
    await PdiService.updateActionStatus(supabase, selectedPdiForDetail.id, actionId, newStatus);
    const updatedAcoes = selectedPdiForDetail.acoes.map(a => a.id === actionId ? { ...a, status: newStatus as any } : a);
    const updatedPdi: PDI = { ...selectedPdiForDetail, acoes: updatedAcoes };
    setSelectedPdiForDetail(updatedPdi);
    await loadData();
  };

  // Análise de Gaps mais frequentes na equipe
  const teamCompetenceGaps = useMemo(() => {
    const gapMap: Record<string, { totalGap: number; count: number }> = {};
    pdis.forEach(p => {
      p.competencias.forEach(c => {
        if (!gapMap[c.competencia]) {
          gapMap[c.competencia] = { totalGap: 0, count: 0 };
        }
        gapMap[c.competencia].totalGap += c.gap;
        gapMap[c.competencia].count += 1;
      });
    });

    return Object.entries(gapMap)
      .map(([name, data]) => ({
        name,
        avgGap: (data.totalGap / data.count).toFixed(1),
        count: data.count
      }))
      .sort((a, b) => Number(b.avgGap) - Number(a.avgGap))
      .slice(0, 5);
  }, [pdis]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      
      {/* Header com Ações Principais */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Gestão de PDIs 360°
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
                {pdis.length} planos
              </span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Acompanhamento contínuo de metas SMART, matriz 70/20/10 e desenvolvimento de competências
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setEditingPdi(null);
              setWizardOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus size={18} /> Novo PDI 360°
          </button>
        </div>
      </div>

      {/* Cards de Métricas e Status Geral */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total PDIs</span>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">{stats.total}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Planos no sistema</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Em Evolução</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">{stats.emEvolucao}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Prazos e metas em dia</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Atenção</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700 font-mono mt-1">{stats.emAtencao}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Vencimento próximo</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Críticos</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <p className="text-2xl font-black text-rose-700 font-mono mt-1">{stats.criticos}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Atrasados ou sem avanço</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Concluídos</span>
          <p className="text-2xl font-black text-blue-700 font-mono mt-1">{stats.concluidos}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Ciclos finalizados</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Progresso Médio</span>
          <p className="text-2xl font-black text-indigo-700 font-mono mt-1">{stats.taxaMediaProgresso}%</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Evolução geral</span>
        </div>
      </div>

      {/* Toolbar de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Pesquisar por colaborador, matrícula ou objetivo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-none border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 text-slate-700 outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="Em evolução">🟢 Em evolução</option>
            <option value="Atenção">🟡 Atenção</option>
            <option value="Crítico">🔴 Crítico</option>
            <option value="Concluído">🔵 Concluído</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="flex-1 md:flex-none border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 text-slate-700 outline-none"
          >
            <option value="all">Todos os Tipos</option>
            <option value="Desenvolvimento">Desenvolvimento</option>
            <option value="Recuperação">Recuperação</option>
            <option value="Carreira">Carreira</option>
          </select>
        </div>
      </div>

      {/* Grid Principal com Tabela e Painel de Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Tabela de PDIs (Ocupa 3 colunas) */}
        <div className="xl:col-span-3 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-4">Colaborador</th>
                  <th className="px-4 py-4">Tipo & Foco</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Progresso Geral</th>
                  <th className="px-4 py-4">Prazos</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPdis.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Nenhum PDI encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredPdis.map(pdi => {
                    const op = operators.find(o => o.registration === pdi.operator_registration);
                    const dynamicStatus = calculateDynamicPdiStatus(pdi);

                    const statusBadge = dynamicStatus === 'Em evolução'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : dynamicStatus === 'Atenção'
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : dynamicStatus === 'Crítico'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-blue-50 border-blue-200 text-blue-700';

                    return (
                      <tr key={pdi.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-sm shrink-0">
                              {op?.photoUrl ? (
                                <img src={op.photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                              ) : (
                                (op?.name || pdi.operator_registration).charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs sm:text-sm">{op?.name || 'Não cadastrado'}</p>
                              <p className="text-[11px] text-slate-400 font-mono">#{pdi.operator_registration} • {op?.role || 'Operador'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-bold text-slate-800 block">{pdi.tipo}</span>
                          <span className="text-[11px] text-slate-500 font-medium">Foco: {pdi.dimensao_foco}</span>
                        </td>

                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {dynamicStatus}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1.5 w-32">
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-slate-500 font-bold">{pdi.progresso}%</span>
                              <span className="text-slate-400">{pdi.acoes.filter(a => a.status === 'Concluído').length}/{pdi.acoes.length} ações</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${pdi.progresso >= 70 ? 'bg-emerald-500' : pdi.progresso >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                style={{ width: `${pdi.progresso}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-mono text-slate-700 block font-semibold">{pdi.data_fim}</span>
                          <span className="text-[10px] text-slate-400 block">{pdi.ciclo_dias} dias ({pdi.status === 'Concluído' ? 'Encerrado' : 'Em andamento'})</span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Ver Detalhes / Acompanhar */}
                            <button
                              onClick={() => setSelectedPdiForDetail(pdi)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Acompanhar e Avaliar"
                            >
                              <Eye size={16} />
                            </button>

                            {/* Registrar Feedback Rápido */}
                            <button
                              onClick={() => {
                                setFeedbackModalPdi(pdi);
                                setFeedbackPositivos('');
                                setFeedbackAtencao('');
                                setFeedbackOrientacoes('');
                              }}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Registrar Feedback no PDI"
                            >
                              <MessageSquare size={16} />
                            </button>

                            {/* Conceder Reconhecimento */}
                            <button
                              onClick={() => {
                                setRecogModalPdi(pdi);
                                setRecogTitulo('');
                                setRecogDesc('');
                              }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                              title="Conceder Reconhecimento"
                            >
                              <Award size={16} />
                            </button>

                            {/* Imprimir Relatório Oficial */}
                            <button
                              onClick={() => {
                                setReportPdi(pdi);
                                setReportOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                              title="Gerar Relatório Individual"
                            >
                              <Printer size={16} />
                            </button>

                            {/* Editar */}
                            <button
                              onClick={() => {
                                setEditingPdi(pdi);
                                setWizardOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Editar PDI"
                            >
                              <Edit size={16} />
                            </button>

                            {/* Excluir */}
                            <button
                              onClick={() => handleDeletePdi(pdi.id, op?.name || pdi.operator_registration)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Excluir PDI"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Painel Lateral de Insights da Equipe (1 coluna) */}
        <div className="space-y-6">
          
          {/* Competências com Maior Gap */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                <Brain size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Gaps Críticos da Equipe</h3>
                <p className="text-[11px] text-slate-400">Competências com maior distância da meta</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {teamCompetenceGaps.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhuma competência avaliada ainda.</p>
              ) : (
                teamCompetenceGaps.map(cg => (
                  <div key={cg.name} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">{cg.name}</span>
                      <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Gap Médio: {cg.avgGap}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">{cg.count} colaboradores trabalhando esta competência</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Destaques e Boas Práticas */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Sparkles size={90} />
            </div>

            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Award size={16} /> Reconhecimento Contínuo
            </div>

            <h4 className="font-extrabold text-sm leading-snug">
              O PDI deve focar no desenvolvimento, não na punição.
            </h4>

            <p className="text-xs text-indigo-200/80 leading-relaxed">
              Utilize o modelo 70/20/10 para garantir que 70% do aprendizado ocorra na prática diária, apoiado por feedbacks semanais dos supervisores.
            </p>

            <button
              onClick={() => {
                setEditingPdi(null);
                setWizardOpen(true);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Criar Novo Plano
            </button>
          </div>

        </div>

      </div>

      {/* MODAL DE DETALHES DO PDI / ACOMPANHAMENTO DO SUPERVISOR */}
      {selectedPdiForDetail && (
        <div className="fixed inset-0 z-[65] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Target size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{selectedPdiForDetail.titulo}</h3>
                  <p className="text-xs text-slate-400">
                    Colaborador: #{selectedPdiForDetail.operator_registration} • Ciclo de {selectedPdiForDetail.ciclo_dias} dias
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedPdiForDetail.status !== 'Concluído' && (
                  <button
                    onClick={() => {
                      setFinishModalPdi(selectedPdiForDetail);
                      setSelectedPdiForDetail(null);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Encerrar Ciclo
                  </button>
                )}
                <button
                  onClick={() => setSelectedPdiForDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              
              {/* Status Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status Dinâmico</span>
                  <span className="font-bold text-sm text-slate-800">{selectedPdiForDetail.status}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Progresso Geral</span>
                  <span className="font-bold text-sm text-blue-600 font-mono">{selectedPdiForDetail.progresso}%</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Foco / Dimensões</span>
                  <span className="font-bold text-sm text-slate-800">{selectedPdiForDetail.dimensao_foco || 'Geral'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Período</span>
                  <span className="font-mono text-slate-700">{selectedPdiForDetail.data_inicio} até {selectedPdiForDetail.data_fim}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Supervisor</span>
                  <span className="font-semibold text-slate-800">{selectedPdiForDetail.supervisor_name}</span>
                </div>
              </div>

              {/* Competências com Gaps */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Competências em Desenvolvimento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedPdiForDetail.competencias.map(c => {
                    const gapInfo = getGapClassification(c.gap);
                    return (
                      <div key={c.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-900">{c.competencia}</strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${gapInfo.bg} ${gapInfo.color}`}>
                            Gap: {c.gap} ({gapInfo.label})
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px]">Inicial: {c.nivel_atual}/5 → Alvo: {c.nivel_desejado}/5</p>
                        {c.acao_recomendada && (
                          <p className="text-blue-700 text-[11px] font-medium pt-1">💡 {c.acao_recomendada}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Objetivos SMART */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Objetivos SMART</h4>
                <div className="space-y-2">
                  {selectedPdiForDetail.objetivos.map(obj => (
                    <div key={obj.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
                      <div className="flex justify-between items-center">
                        <strong className="text-slate-900">{obj.titulo}</strong>
                        <span className="font-mono font-bold text-blue-600">Meta: {obj.indicador_principal} {obj.meta}</span>
                      </div>
                      {obj.meta_secundaria && (
                        <span className="text-[11px] text-emerald-700 font-semibold block">Critério de Qualidade: {obj.meta_secundaria}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações 70/20/10 com checklist e gerenciamento completo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Ações 70/20/10 ({selectedPdiForDetail.acoes.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddActionInDetail(!showAddActionInDetail)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus size={14} />
                    {showAddActionInDetail ? 'Cancelar' : 'Nova Ação'}
                  </button>
                </div>

                {/* Formulário para Adicionar Ação no Modal de Detalhes */}
                {showAddActionInDetail && (
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                    <p className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                      <Sparkles size={14} className="text-blue-600" />
                      Incluir Nova Ação no Plano 70/20/10
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewActionCategory('70_pratica')}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition-all ${newActionCategory === '70_pratica' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                      >
                        70% Prática / Desafio
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewActionCategory('20_social')}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition-all ${newActionCategory === '20_social' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                      >
                        20% Social / Mentoria
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewActionCategory('10_curso')}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition-all ${newActionCategory === '10_curso' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                      >
                        10% Treinamento / Formal
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Descrição da Ação Proposta</label>
                      <input
                        type="text"
                        value={newActionDesc}
                        onChange={e => setNewActionDesc(e.target.value)}
                        placeholder="Ex: Realizar 10 simulações de atendimento com foco em empatia..."
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Responsável</label>
                        <input
                          type="text"
                          value={newActionResp}
                          onChange={e => setNewActionResp(e.target.value)}
                          placeholder="Ex: Operador / Supervisor"
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Prazo Estimado (Opcional)</label>
                        <input
                          type="date"
                          value={newActionDeadline}
                          onChange={e => setNewActionDeadline(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddActionInDetail(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateActionInDetail}
                        className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all"
                      >
                        Salvar Nova Ação
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de Ações do PDI com Edição e Exclusão */}
                <div className="space-y-2">
                  {selectedPdiForDetail.acoes.map(act => {
                    const isEditing = editingActionId === act.id;

                    if (isEditing) {
                      return (
                        <div key={act.id} className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-2.5 animate-in fade-in duration-100">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-amber-900 uppercase">Editando Ação</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setEditActionCat('70_pratica')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${editActionCat === '70_pratica' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border'}`}
                              >
                                70%
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditActionCat('20_social')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${editActionCat === '20_social' ? 'bg-purple-600 text-white' : 'bg-white text-slate-700 border'}`}
                              >
                                20%
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditActionCat('10_curso')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${editActionCat === '10_curso' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border'}`}
                              >
                                10%
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={editActionDesc}
                            onChange={e => setEditActionDesc(e.target.value)}
                            className="w-full border border-amber-300 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={editActionResp}
                              onChange={e => setEditActionResp(e.target.value)}
                              placeholder="Responsável"
                              className="border border-amber-300 rounded-xl px-2.5 py-1 text-xs bg-white text-slate-900 outline-none"
                            />
                            <input
                              type="date"
                              value={editActionDeadline}
                              onChange={e => setEditActionDeadline(e.target.value)}
                              className="border border-amber-300 rounded-xl px-2.5 py-1 text-xs bg-white text-slate-900 outline-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingActionId(null)}
                              className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveActionEdit(act.id)}
                              className="px-3 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm"
                            >
                              Salvar Alterações
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={act.id} className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleActionStatusInDetail(act.id)}
                            className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${act.status === 'Concluído' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white hover:border-blue-500'}`}
                            title="Marcar / Desmarcar como concluída"
                          >
                            {act.status === 'Concluído' && <Check size={12} strokeWidth={3} />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${act.tipo_70_20_10 === '70_pratica' ? 'bg-blue-100 text-blue-800' : act.tipo_70_20_10 === '20_social' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                {act.tipo_70_20_10 === '70_pratica' ? '70% Prática' : act.tipo_70_20_10 === '20_social' ? '20% Social' : '10% Treinamento'}
                              </span>
                              <span className="text-[11px] text-slate-500">Resp: {act.responsavel}</span>
                              {act.prazo && <span className="text-[11px] text-slate-400 font-mono">Prazo: {act.prazo}</span>}
                            </div>
                            <p className={`font-semibold mt-1 text-xs ${act.status === 'Concluído' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {act.descricao}
                            </p>
                            {act.comentario_operador && (
                              <p className="text-emerald-700 text-[11px] mt-1 font-medium bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-100">
                                💬 Operador: "{act.comentario_operador}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${act.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                            {act.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEditAction(act)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                            title="Editar ação"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteActionInDetail(act.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                            title="Excluir ação"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedPdiForDetail(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Fechar Detalhes
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE FEEDBACK RÁPIDO */}
      {feedbackModalPdi && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <MessageSquare size={18} className="text-emerald-400" />
                Registrar Feedback do PDI
              </h3>
              <button onClick={() => setFeedbackModalPdi(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipo de Feedback</label>
                <select
                  value={feedbackTipo}
                  onChange={e => setFeedbackTipo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-bold outline-none"
                >
                  <option value="Acompanhamento">Acompanhamento de Metas</option>
                  <option value="Positivo">Evolução Positiva</option>
                  <option value="Corretivo">Ajuste / Corretivo</option>
                  <option value="Desenvolvimento">Desenvolvimento de Carreira</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Pontos Positivos / Destaques</label>
                <textarea
                  rows={2}
                  value={feedbackPositivos}
                  onChange={e => setFeedbackPositivos(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none"
                  placeholder="Destaque as conquistas e avanços do operador..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Pontos de Atenção</label>
                <textarea
                  rows={2}
                  value={feedbackAtencao}
                  onChange={e => setFeedbackAtencao(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none"
                  placeholder="O que ainda precisa de cuidado e ajuste..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Orientações & Próximos Passos</label>
                <textarea
                  rows={2}
                  value={feedbackOrientacoes}
                  onChange={e => setFeedbackOrientacoes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none"
                  placeholder="Ações combinadas para a próxima semana..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setFeedbackModalPdi(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFeedback}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Salvar Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO RECONHECIMENTO */}
      {recogModalPdi && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Award size={18} className="text-amber-400" />
                Conceder Reconhecimento
              </h3>
              <button onClick={() => setRecogModalPdi(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipo de Conquista</label>
                <select
                  value={recogTipo}
                  onChange={e => setRecogTipo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-bold outline-none"
                >
                  <option value="Evolução destaque">🏆 Evolução Destaque</option>
                  <option value="Superação">⭐ Superação de Desafio</option>
                  <option value="Excelente desempenho">👏 Excelente Desempenho</option>
                  <option value="Meta atingida">🎯 Meta Atingida</option>
                  <option value="Boa iniciativa">💡 Boa Iniciativa</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Título da Conquista *</label>
                <input
                  type="text"
                  value={recogTitulo}
                  onChange={e => setRecogTitulo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none font-bold"
                  placeholder="Ex: Domínio Completo dos Protocolos de Fazenda"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Motivo / Mensagem de Reconhecimento *</label>
                <textarea
                  rows={3}
                  value={recogDesc}
                  onChange={e => setRecogDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none"
                  placeholder="Escreva a mensagem que aparecerá no mural do operador..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setRecogModalPdi(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRecognition}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Conceder Conquista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ENCERRAMENTO COM AVALIAÇÃO FINAL */}
      {finishModalPdi && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CheckCircle2 size={18} className="text-blue-400" />
                Avaliação Final & Encerramento do Ciclo
              </h3>
              <button onClick={() => setFinishModalPdi(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl text-blue-900">
                Você está encerrando o ciclo de desenvolvimento de <strong>#{finishModalPdi.operator_registration}</strong>. Esse registro ficará arquivado no histórico do colaborador.
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Resultado Geral do Ciclo</label>
                <select
                  value={resultadoFinal}
                  onChange={e => setResultadoFinal(e.target.value as PDIResult)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-bold outline-none"
                >
                  <option value="Superou expectativas">⭐ Superou expectativas</option>
                  <option value="Atingiu expectativas">✓ Atingiu expectativas</option>
                  <option value="Evoluiu parcialmente">↗ Evoluiu parcialmente</option>
                  <option value="Não atingiu expectativas">✗ Não atingiu expectativas</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Parecer Final do Supervisor *</label>
                <textarea
                  rows={4}
                  value={comentarioFinal}
                  onChange={e => setComentarioFinal(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none"
                  placeholder="Resuma os resultados alcançados pelo operador e recomendações para o próximo ciclo..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setFinishModalPdi(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
              >
                Voltar
              </button>
              <button
                onClick={handleFinishCycle}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Concluir e Arquivar PDI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WIZARD MODAL DE CRIAÇÃO / EDIÇÃO */}
      <PdiWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSave={handleSaveWizard}
        operators={operators}
        editingPdi={editingPdi}
        currentSupervisorName={userProfile?.name || 'Supervisor'}
      />

      {/* MODAL DE RELATÓRIO INDIVIDUAL */}
      <PdiReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        pdi={reportPdi}
        operator={operators.find(o => o.registration === reportPdi?.operator_registration) || null}
      />

    </div>
  );
};

export default PdiManagement;
