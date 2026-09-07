import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Target, 
  User, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Brain, 
  Award, 
  HelpCircle,
  Lightbulb,
  Clock,
  Briefcase,
  Copy,
  Edit3
} from 'lucide-react';
import { Operator } from '../../types';
import { 
  PDI, 
  PDIObjective, 
  PDIAction, 
  PDICompetence, 
  PDIType, 
  PDIDimension, 
  ActionCategory702010 
} from '../../types/pdi';
import { 
  PDI_COMPETENCES, 
  COMPETENCE_LEVELS, 
  getGapClassification, 
  PDI_CYCLES, 
  CAREER_GOALS,
  PRESET_INDICATORS,
  IndicatorPreset
} from '../../constants/pdiConstants';

interface PdiWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pdiData: Partial<PDI>) => Promise<void>;
  operators: Operator[];
  editingPdi?: PDI | null;
  currentSupervisorName: string;
}

export const PdiWizardModal: React.FC<PdiWizardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  operators,
  editingPdi,
  currentSupervisorName
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [operatorReg, setOperatorReg] = useState('');
  const [operatorSearch, setOperatorSearch] = useState('');
  const [titulo, setTitulo] = useState('Plano de Desenvolvimento Individual');
  const [tipo, setTipo] = useState<PDIType>('Desenvolvimento');
  const [dimensoesFoco, setDimensoesFoco] = useState<string[]>(['Resultados']);
  const [cicloDias, setCicloDias] = useState(30);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [carreiraObjetivo, setCarreiraObjetivo] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Coleções filhas
  const [competencias, setCompetencias] = useState<PDICompetence[]>([]);
  const [objetivos, setObjetivos] = useState<PDIObjective[]>([]);
  const [acoes, setAcoes] = useState<PDIAction[]>([]);

  // Atualizar data de fim automaticamente quando ciclo ou data início mudar
  useEffect(() => {
    if (dataInicio && cicloDias) {
      const start = new Date(dataInicio);
      const end = new Date(start.getTime() + cicloDias * 86400000);
      setDataFim(end.toISOString().split('T')[0]);
    }
  }, [dataInicio, cicloDias]);

  // Carregar dados se for edição
  useEffect(() => {
    if (editingPdi) {
      setOperatorReg(editingPdi.operator_registration);
      setTitulo(editingPdi.titulo);
      setTipo(editingPdi.tipo);
      
      // Carregar múltiplas dimensões
      if (editingPdi.dimensoes_foco && editingPdi.dimensoes_foco.length > 0) {
        setDimensoesFoco(editingPdi.dimensoes_foco);
      } else if (editingPdi.dimensao_foco) {
        const split = editingPdi.dimensao_foco.split(',').map(s => s.trim()).filter(Boolean);
        setDimensoesFoco(split.length > 0 ? split : ['Resultados']);
      } else {
        setDimensoesFoco(['Resultados']);
      }

      setCicloDias(editingPdi.ciclo_dias);
      setDataInicio(editingPdi.data_inicio);
      setDataFim(editingPdi.data_fim);
      setDiagnostico(editingPdi.diagnostico_inicial || '');
      setCarreiraObjetivo(editingPdi.carreira_objetivo || '');
      setObservacoes(editingPdi.observacoes || '');
      setCompetencias(editingPdi.competencias || []);
      setObjetivos(editingPdi.objetivos || []);
      setAcoes(editingPdi.acoes || []);
    } else {
      // Padrão novo
      setCurrentStep(1);
      setOperatorReg('');
      setTitulo('Plano de Desenvolvimento Individual');
      setTipo('Desenvolvimento');
      setDimensoesFoco(['Resultados']);
      setCicloDias(30);
      setDataInicio(new Date().toISOString().split('T')[0]);
      setDiagnostico('');
      setCarreiraObjetivo('');
      setObservacoes('');
      setCompetencias([]);
      setObjetivos([]);
      setAcoes([]);
    }
  }, [editingPdi, isOpen]);

  if (!isOpen) return null;

  const selectedOperator = operators.find(op => op.registration === operatorReg) || null;
  const latestKpi = selectedOperator?.kpis?.[0];

  // Alternar dimensão de foco (multi-seleção)
  const toggleDimensao = (dim: string) => {
    if (dimensoesFoco.includes(dim)) {
      if (dimensoesFoco.length === 1) return; // manter ao menos 1
      setDimensoesFoco(dimensoesFoco.filter(d => d !== dim));
    } else {
      setDimensoesFoco([...dimensoesFoco, dim]);
    }
  };

  // Alternar seleção de competência
  const toggleCompetence = (compDef: typeof PDI_COMPETENCES[0]) => {
    const existing = competencias.find(c => c.competencia === compDef.name);
    if (existing) {
      setCompetencias(competencias.filter(c => c.competencia !== compDef.name));
    } else {
      setCompetencias([
        ...competencias,
        {
          id: 'comp_' + Math.random().toString(36).substring(2, 7),
          competencia: compDef.name,
          nivel_atual: 2,
          nivel_desejado: 4,
          gap: 2,
          observacao_supervisor: '',
          acao_recomendada: compDef.suggestedActions[0]?.text || '',
          data_avaliacao: new Date().toISOString().split('T')[0]
        }
      ]);
    }
  };

  const updateCompetenceLevel = (index: number, field: 'nivel_atual' | 'nivel_desejado', val: number) => {
    const next = [...competencias];
    next[index][field] = val;
    next[index].gap = Math.max(0, next[index].nivel_desejado - next[index].nivel_atual);
    setCompetencias(next);
  };

  // Adicionar Objetivo SMART
  const handleAddObjective = (type: 'quantitativo' | 'comportamental' = 'quantitativo') => {
    const newObj: PDIObjective = {
      id: 'obj_' + Math.random().toString(36).substring(2, 7),
      titulo: type === 'quantitativo' ? 'Atingir meta operacional preservando qualidade' : 'Desenvolver postura e comunicação no atendimento',
      categoria: (dimensoesFoco[0] as PDIDimension) || 'Resultados',
      indicador_principal: type === 'quantitativo' ? 'TMA' : 'Clareza na Dicção e Vocabulário',
      tipo_indicador: type,
      valor_atual: type === 'quantitativo' ? (latestKpi?.tma || '04:45') : 'Vocabulário informal em certas chamadas',
      meta: type === 'quantitativo' ? '04:00' : 'Adequado / Dicção clara sem gírias',
      indicador_secundario: type === 'quantitativo' ? 'Monitoria' : undefined,
      meta_secundaria: type === 'quantitativo' ? '>= 96%' : undefined,
      smart_especifica: type === 'quantitativo' ? 'Reduzir TMA médio mantendo conformidade dos scripts' : 'Adotar tom institucional e acolhedor em 100% das ligações',
      smart_mensuravel: type === 'quantitativo' ? 'Acompanhamento semanal nos relatórios' : 'Avaliação semanal por monitoria de qualidade',
      smart_atingivel: 'Adequado à rotina da operação',
      smart_relevante: 'Melhoria direta do serviço prestado ao cidadão de Porto Alegre',
      smart_temporal: dataFim,
      peso: 100,
      prazo: dataFim,
      status: 'Em andamento',
      progresso: 0
    };
    setObjetivos([...objetivos, newObj]);
  };

  // Adicionar Ação 70/20/10
  const handleAddAction = (category: ActionCategory702010, desc?: string) => {
    const newAct: PDIAction = {
      id: 'act_' + Math.random().toString(36).substring(2, 7),
      tipo_70_20_10: category,
      descricao: desc || (
        category === '70_pratica' 
          ? 'Prática monitorada em atendimento e simulações' 
          : category === '20_social' 
          ? 'Reunião de coaching 1:1 com supervisor' 
          : 'Participação em reciclagem de procedimentos'
      ),
      responsavel: 'Operador',
      data_inicio: dataInicio,
      data_limite: dataFim,
      status: 'Não iniciado'
    };
    setAcoes([...acoes, newAct]);
  };

  // Duplicar Ação
  const handleDuplicateAction = (act: PDIAction) => {
    const copy: PDIAction = {
      ...act,
      id: 'act_' + Math.random().toString(36).substring(2, 7),
      descricao: `${act.descricao} (Cópia)`
    };
    setAcoes([...acoes, copy]);
  };

  // Submissão Final
  const handleSubmit = async () => {
    if (!operatorReg) {
      alert('Por favor, selecione o operador.');
      setCurrentStep(1);
      return;
    }

    if (competencias.length === 0) {
      alert('Selecione ao menos 1 competência para desenvolvimento.');
      setCurrentStep(3);
      return;
    }

    if (objetivos.length === 0) {
      alert('Adicione ao menos 1 objetivo SMART.');
      setCurrentStep(4);
      return;
    }

    if (acoes.length === 0) {
      alert('Adicione ao menos 1 ação de desenvolvimento (Matriz 70/20/10).');
      setCurrentStep(5);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: editingPdi?.id,
        operator_registration: operatorReg,
        supervisor_name: currentSupervisorName || 'Supervisor',
        titulo,
        tipo,
        dimensao_foco: dimensoesFoco.join(', '),
        dimensoes_foco: dimensoesFoco,
        ciclo_dias: cicloDias,
        data_inicio: dataInicio,
        data_fim: dataFim,
        diagnostico_inicial: diagnostico,
        carreira_objetivo: carreiraObjetivo,
        observacoes,
        competencias,
        objetivos,
        acoes
      });
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar PDI: ${err.message || 'Falha de comunicação'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Operador & Ciclo' },
    { num: 2, label: 'Diagnóstico & Dimensões' },
    { num: 3, label: 'Competências' },
    { num: 4, label: 'Metas SMART' },
    { num: 5, label: 'Plano 70/20/10' },
    { num: 6, label: 'Revisão' }
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Target size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                {editingPdi ? 'Editar PDI 360°' : 'Novo PDI 360°'}
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300">
                  SMART + 70/20/10
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                {selectedOperator ? `Colaborador: ${selectedOperator.name} (#${selectedOperator.registration})` : 'Assistente de estruturação de desenvolvimento'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Stepper Wizard Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between overflow-x-auto gap-2">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${currentStep === s.num
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : currentStep > s.num
                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${currentStep === s.num ? 'bg-white text-blue-600' : currentStep > s.num ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {currentStep > s.num ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </button>
              {idx < steps.length - 1 && <span className="text-slate-300">›</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* ETAPA 1: Operador & Tipo & Ciclo */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                <Lightbulb className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong className="font-bold">Etapa 1: Definição Inicial.</strong> Selecione o colaborador para o qual este PDI será estruturado, a duração do ciclo e o foco principal.
                </div>
              </div>

              {/* Seletor de Operador */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Colaborador Alvo *
                </label>
                {!editingPdi ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Pesquisar por nome ou matrícula..."
                      value={operatorSearch}
                      onChange={e => setOperatorSearch(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2">
                      {operators
                        .filter(op => op.active && (op.name.toLowerCase().includes(operatorSearch.toLowerCase()) || op.registration.includes(operatorSearch)))
                        .map(op => (
                          <button
                            key={op.registration}
                            type="button"
                            onClick={() => setOperatorReg(op.registration)}
                            className={`p-3 rounded-xl text-left flex items-center gap-3 transition-all ${operatorReg === op.registration
                              ? 'bg-blue-50 border-2 border-blue-600 shadow-sm'
                              : 'bg-white hover:bg-slate-50 border border-slate-100'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                              {op.photoUrl ? <img src={op.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" /> : op.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 truncate">{op.name}</p>
                              <p className="text-[11px] text-slate-500">#{op.registration} • {op.role}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 rounded-xl font-bold text-sm text-slate-800">
                    {selectedOperator?.name} (#{selectedOperator?.registration})
                  </div>
                )}
              </div>

              {/* Tipo de PDI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'Desenvolvimento' as PDIType, label: 'Desenvolvimento', desc: 'Evolução contínua para operadores em bom nível' },
                  { key: 'Recuperação' as PDIType, label: 'Recuperação', desc: 'Foco corretivo em indicadores ou gaps específicos' },
                  { key: 'Carreira' as PDIType, label: 'Carreira / Futuro', desc: 'Preparação para monitoria, liderança ou novos cargos' }
                ].map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTipo(t.key)}
                    className={`p-4 rounded-2xl text-left border transition-all ${tipo === t.key
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="font-bold text-xs text-slate-900 block">{t.label}</span>
                    <span className="text-[11px] text-slate-500 mt-1 block leading-tight">{t.desc}</span>
                  </button>
                ))}
              </div>

              {/* Ciclo e Datas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Ciclo do PDI</label>
                  <select
                    value={cicloDias}
                    onChange={e => setCicloDias(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 font-semibold outline-none"
                  >
                    {PDI_CYCLES.map(c => (
                      <option key={c.days} value={c.days}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Data Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Previsão Término</label>
                  <input
                    type="date"
                    value={dataFim}
                    disabled
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-100 font-mono text-slate-600 outline-none"
                  />
                </div>
              </div>

              {/* Objetivo de Carreira */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Objetivo Profissional / Carreira (Opcional)</label>
                <select
                  value={carreiraObjetivo}
                  onChange={e => setCarreiraObjetivo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 outline-none"
                >
                  <option value="">Selecione ou deixe em branco...</option>
                  {CAREER_GOALS.map(cg => (
                    <option key={cg} value={cg}>{cg}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ETAPA 2: Diagnóstico & Dimensões de Foco */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                <Lightbulb className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong className="font-bold">Etapa 2: Diagnóstico & Dimensões de Foco.</strong> Você pode selecionar <strong>uma ou mais dimensões</strong> simultaneamente (ex: Qualidade e Comportamento).
                </div>
              </div>

              {selectedOperator && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <User className="text-blue-600" size={24} />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{selectedOperator.name}</h4>
                      <p className="text-xs text-slate-500">Admissão: {selectedOperator.admissionDate} • Modalidade: {selectedOperator.workMode}</p>
                    </div>
                  </div>
                  {latestKpi && (
                    <div className="flex gap-4 text-xs font-mono">
                      <div><span className="text-slate-400 block text-[10px] uppercase">TMA Atual</span><strong>{latestKpi.tma || '--'}</strong></div>
                      <div><span className="text-slate-400 block text-[10px] uppercase">NPS</span><strong>{latestKpi.nps || '--'}</strong></div>
                      <div><span className="text-slate-400 block text-[10px] uppercase">Monitoria</span><strong>{latestKpi.monitoria || '--'}%</strong></div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Título do PDI
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ex: Aprimoramento de TMA e Redação de Protocolos"
                />
              </div>

              {/* MÚLTIPLAS DIMENSÕES DE FOCO */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Dimensões de Foco (Selecione uma ou mais) *
                  </label>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {dimensoesFoco.length} selecionada(s): {dimensoesFoco.join(' + ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['Resultados', 'Qualidade', 'Comportamento', 'Desenvolvimento', 'Carreira'] as PDIDimension[]).map(d => {
                    const isSelected = dimensoesFoco.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDimensao(d)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-center gap-1.5 ${isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-1 ring-blue-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-black ${isSelected ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                          {isSelected ? '✓' : '+'}
                        </span>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Diagnóstico Inicial & Justificativa do Supervisor *
                </label>
                <textarea
                  rows={4}
                  value={diagnostico}
                  onChange={e => setDiagnostico(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  placeholder="Descreva o momento atual do operador, principais desafios observados em monitorias e oportunidades de crescimento..."
                />
              </div>
            </div>
          )}

          {/* ETAPA 3: Competências & Gaps */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                <Brain className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong className="font-bold">Etapa 3: Matriz de Competências & Análise de Gap.</strong> Selecione quais competências serão desenvolvidas no ciclo. O sistema calcula automaticamente: <code className="bg-white px-1 py-0.5 rounded font-mono">Gap = Desejado - Atual</code>.
                </div>
              </div>

              {/* Botões de Seleção Rápida */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Competências Mapeadas (Selecione para incluir)
                </label>
                <div className="flex flex-wrap gap-2">
                  {PDI_COMPETENCES.map(cDef => {
                    const isSelected = competencias.some(c => c.competencia === cDef.name);
                    return (
                      <button
                        key={cDef.id}
                        type="button"
                        onClick={() => toggleCompetence(cDef)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {cDef.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lista de Competências Selecionadas */}
              <div className="space-y-4 pt-2">
                {competencias.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                    Nenhuma competência selecionada ainda. Clique nos botões acima para selecionar.
                  </div>
                ) : (
                  competencias.map((comp, idx) => {
                    const gapClass = getGapClassification(comp.gap);
                    return (
                      <div key={comp.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            <h4 className="font-bold text-sm text-slate-900">{comp.competencia}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${gapClass.bg} ${gapClass.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${gapClass.dot}`} />
                              Gap: {comp.gap} • {gapClass.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCompetencias(competencias.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Remover competência"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                              Nível Atual: <strong className="text-blue-600">{comp.nivel_atual} - {COMPETENCE_LEVELS[comp.nivel_atual - 1]?.label}</strong>
                            </label>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map(lvl => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => updateCompetenceLevel(idx, 'nivel_atual', lvl)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${comp.nivel_atual === lvl
                                    ? 'bg-slate-800 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                              Meta Desejada: <strong className="text-emerald-600">{comp.nivel_desejado} - {COMPETENCE_LEVELS[comp.nivel_desejado - 1]?.label}</strong>
                            </label>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map(lvl => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => updateCompetenceLevel(idx, 'nivel_desejado', lvl)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${comp.nivel_desejado === lvl
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Ação Recomendada pelo Supervisor
                          </label>
                          <input
                            type="text"
                            value={comp.acao_recomendada || ''}
                            onChange={e => {
                              const next = [...competencias];
                              next[idx].acao_recomendada = e.target.value;
                              setCompetencias(next);
                            }}
                            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 outline-none"
                            placeholder="Ex: Treinamento específico + acompanhamento com monitor"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ETAPA 4: Metas SMART - COM INCLUSÃO/EDIÇÃO/EXCLUSÃO MANUAL DE INDICADORES QUANTITATIVOS E COMPORTAMENTAIS */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                <Target className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong className="font-bold">Etapa 4: Metodologia SMART + Indicadores Flexíveis.</strong> Você pode incluir indicadores <strong>quantitativos</strong> (ex: TMA, NPS) ou <strong>comportamentais/subjetivos</strong> (ex: Dicção, Empatia, Escuta Ativa, Registro de Protocolos). Você pode criar, editar o nome e excluir os indicadores manualmente.
                </div>
              </div>

              {/* Botões para Adicionar Objetivos Quantitativos e Comportamentais */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Objetivos SMART Definidos ({objetivos.length})</h3>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddObjective('quantitativo')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    <Plus size={14} /> + Meta Quantitativa
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddObjective('comportamental')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    <Plus size={14} /> + Meta Comportamental / Subjetiva
                  </button>
                </div>
              </div>

              {/* Lista de Objetivos */}
              <div className="space-y-5">
                {objetivos.map((obj, idx) => {
                  const isBehavioral = obj.tipo_indicador === 'comportamental' || obj.tipo_indicador === 'qualitativo';

                  return (
                    <div key={obj.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                      
                      {/* Topo do Objetivo: Título e Excluir */}
                      <div className="flex items-center justify-between border-b pb-3 border-slate-100 gap-3">
                        <div className="flex items-center gap-2.5 flex-1">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={obj.titulo}
                            onChange={e => {
                              const next = [...objetivos];
                              next[idx].titulo = e.target.value;
                              setObjetivos(next);
                            }}
                            className="font-bold text-sm text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full"
                            placeholder="Título do Objetivo SMART..."
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Alternador de Tipo: Quantitativo vs Comportamental */}
                          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...objetivos];
                                next[idx].tipo_indicador = 'quantitativo';
                                setObjetivos(next);
                              }}
                              className={`px-2 py-1 rounded-md transition-colors ${!isBehavioral ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                            >
                              Quantitativo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...objetivos];
                                next[idx].tipo_indicador = 'comportamental';
                                setObjetivos(next);
                              }}
                              className={`px-2 py-1 rounded-md transition-colors ${isBehavioral ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                            >
                              Comportamental
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setObjetivos(objetivos.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50"
                            title="Excluir Objetivo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Bloco de Configuração do Indicador Principal */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                          <div className="flex items-center gap-2">
                            <Target size={16} className={isBehavioral ? "text-indigo-600" : "text-blue-600"} />
                            <span className="text-xs font-bold text-slate-800">Indicador Principal & Parâmetros</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isBehavioral ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                              {isBehavioral ? 'Comportamental / Subjetivo' : 'Métrica Quantitativa'}
                            </span>
                          </div>

                          {/* Seletor Rápido de Presets */}
                          <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Preset:</span>
                            <select
                              onChange={e => {
                                const found = PRESET_INDICATORS.find(p => p.id === e.target.value);
                                if (found) {
                                  const next = [...objetivos];
                                  next[idx].indicador_principal = found.name;
                                  next[idx].tipo_indicador = found.type;
                                  next[idx].meta = found.exampleTarget;
                                  setObjetivos(next);
                                }
                              }}
                              className="text-[11px] font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none"
                            >
                              <option value="">Escolher da lista...</option>
                              <optgroup label="Quantitativos">
                                {PRESET_INDICATORS.filter(p => !p.isBehavioral).map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </optgroup>
                              <optgroup label="Comportamentais / Subjetivos">
                                {PRESET_INDICATORS.filter(p => p.isBehavioral).map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                        </div>

                        {/* Campos Editáveis do Indicador Principal */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          
                          {/* Nome Editável do Indicador */}
                          <div className="sm:col-span-1">
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                Nome do Indicador *
                              </label>
                              {obj.indicador_principal && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...objetivos];
                                    next[idx].indicador_principal = '';
                                    setObjetivos(next);
                                  }}
                                  className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={obj.indicador_principal || ''}
                              onChange={e => {
                                const next = [...objetivos];
                                next[idx].indicador_principal = e.target.value;
                                setObjetivos(next);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                              placeholder="Ex: Escuta Ativa, TMA, Empatia..."
                            />
                          </div>

                          {/* Valor Atual / Ponto de Partida */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              {isBehavioral ? 'Situação Inicial Observada' : 'Valor Atual'}
                            </label>
                            <input
                              type="text"
                              value={obj.valor_atual || ''}
                              onChange={e => {
                                const next = [...objetivos];
                                next[idx].valor_atual = e.target.value;
                                setObjetivos(next);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                              placeholder={isBehavioral ? "Ex: Interrompe munícipe / Postura defensiva" : "Ex: 04:52"}
                            />
                          </div>

                          {/* Meta Alvo Desejada */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                              {isBehavioral ? 'Comportamento Alvo / Meta *' : 'Meta Desejada *'}
                            </label>
                            <input
                              type="text"
                              value={obj.meta}
                              onChange={e => {
                                const next = [...objetivos];
                                next[idx].meta = e.target.value;
                                setObjetivos(next);
                              }}
                              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 ${isBehavioral ? 'border-indigo-300 text-indigo-800 bg-white' : 'border-blue-300 text-blue-800 bg-white'}`}
                              placeholder={isBehavioral ? "Ex: Escuta empática sem interrupções" : "Ex: 04:00"}
                            />
                          </div>

                        </div>

                        {/* Chips Rápidos de Metas Comportamentais (Se for comportamental) */}
                        {isBehavioral && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Sugestões de Meta:</span>
                            {['Adequado', 'Sem interrupções', 'Acolhimento exemplar', 'Zero retrabalho', 'Comunicação clara'].map(chip => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => {
                                  const next = [...objetivos];
                                  next[idx].meta = chip;
                                  setObjetivos(next);
                                }}
                                className="text-[10px] bg-white hover:bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-lg border border-indigo-200 transition-colors"
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Meta Combinada de Qualidade (Para evitar que TMA degrade qualidade) */}
                        {!isBehavioral && (
                          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                                Critério de Qualidade Combinado (Opcional - Evita degradação da qualidade)
                              </label>
                              <input
                                type="text"
                                value={obj.meta_secundaria || ''}
                                onChange={e => {
                                  const next = [...objetivos];
                                  next[idx].meta_secundaria = e.target.value;
                                  setObjetivos(next);
                                }}
                                className="w-full border border-emerald-200 rounded-xl px-3 py-1.5 text-xs bg-emerald-50 text-emerald-800 font-semibold outline-none"
                                placeholder="Ex: Monitoria >= 96% e zero chamadas sem protocolo"
                              />
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Detalhamento SMART */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">S (Específica)</span>
                          <input
                            type="text"
                            value={obj.smart_especifica || ''}
                            onChange={e => {
                              const next = [...objetivos];
                              next[idx].smart_especifica = e.target.value;
                              setObjetivos(next);
                            }}
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 outline-none"
                            placeholder="O que exatamente será aprimorado?"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">M (Mensurável)</span>
                          <input
                            type="text"
                            value={obj.smart_mensuravel || ''}
                            onChange={e => {
                              const next = [...objetivos];
                              next[idx].smart_mensuravel = e.target.value;
                              setObjetivos(next);
                            }}
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 outline-none"
                            placeholder="Como avaliaremos o avanço?"
                          />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ETAPA 5: Plano 70/20/10 - COM TOTAL CRIAÇÃO, INCLUSÃO, EDIÇÃO E EXCLUSÃO */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                <Sparkles className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong className="font-bold">Etapa 5: Gestão Completa de Ações 70/20/10.</strong> Crie, edite a descrição, altere a categoria, atribua responsáveis e ajuste prazos livremente em cada ação proposta.
                </div>
              </div>

              {/* Toolbar de Inclusão de Ações */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Criar e Incluir Novas Ações:
                  </span>
                  
                  {/* Biblioteca Rápida */}
                  <select
                    onChange={e => {
                      if (!e.target.value) return;
                      const [cat, text] = e.target.value.split(':::');
                      handleAddAction(cat as ActionCategory702010, text);
                      e.target.value = '';
                    }}
                    className="text-xs font-semibold border border-slate-300 rounded-xl px-3 py-1.5 bg-white outline-none"
                  >
                    <option value="">💡 Inserir Sugestão da Biblioteca...</option>
                    <optgroup label="70% Prática">
                      <option value="70_pratica:::Escutar e autoavaliar 3 atendimentos próprios por semana">Escutar 3 atendimentos próprios por semana</option>
                      <option value="70_pratica:::Aplicar técnica de paráfrase no início e final de chamadas">Aplicar técnica de paráfrase</option>
                      <option value="70_pratica:::Revisar o texto do protocolo antes de salvar e encerrar chamado">Revisar texto do protocolo antes de salvar</option>
                      <option value="70_pratica:::Simulações de chamadas de conflito mantendo tom calmo">Simulações de chamadas difíceis</option>
                    </optgroup>
                    <optgroup label="20% Social (Coaching / Mentoria)">
                      <option value="20_social:::Sessão quinzenal de feedback 1:1 com o supervisor">Sessão quinzenal de feedback com supervisor</option>
                      <option value="20_social:::Monitoria espelhada com operador referência">Monitoria espelhada com operador referência</option>
                      <option value="20_social:::Alinhamento com qualidade sobre chamadas reabertas">Alinhamento de dúvidas com equipe de qualidade</option>
                    </optgroup>
                    <optgroup label="10% Capacitação / Treinamento">
                      <option value="10_capacitacao:::Realizar reciclagem formal sobre serviços complexos (SMF/DMLU)">Reciclagem formal de serviços municipais</option>
                      <option value="10_capacitacao:::Workshop interno de empatia e acolhimento no atendimento">Workshop de acolhimento ao cidadão</option>
                      <option value="10_capacitacao:::Leitura do guia de redação padrão de protocolos">Leitura do guia de redação padrão</option>
                    </optgroup>
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddAction('70_pratica')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
                  >
                    <Plus size={15} /> + Ação 70% Prática
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddAction('20_social')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
                  >
                    <Plus size={15} /> + Ação 20% Social (Coaching)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddAction('10_capacitacao')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
                  >
                    <Plus size={15} /> + Ação 10% Treinamento
                  </button>
                </div>
              </div>

              {/* Lista Editável de Ações */}
              <div className="space-y-3">
                {acoes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                    Nenhuma ação cadastrada ainda. Utilize os botões acima para criar ações.
                  </div>
                ) : (
                  acoes.map((act, idx) => {
                    return (
                      <div key={act.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                        
                        {/* Linha 1: Categoria, Responsável, Prazos e Botões */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Categoria Editável */}
                            <select
                              value={act.tipo_70_20_10}
                              onChange={e => {
                                const next = [...acoes];
                                next[idx].tipo_70_20_10 = e.target.value as ActionCategory702010;
                                setAcoes(next);
                              }}
                              className={`text-xs font-bold border rounded-lg px-2.5 py-1 outline-none ${
                                act.tipo_70_20_10 === '70_pratica' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                  : act.tipo_70_20_10 === '20_social' 
                                  ? 'bg-blue-50 text-blue-800 border-blue-200' 
                                  : 'bg-purple-50 text-purple-800 border-purple-200'
                              }`}
                            >
                              <option value="70_pratica">70% — Prática Operacional</option>
                              <option value="20_social">20% — Aprendizado Social (Coaching)</option>
                              <option value="10_capacitacao">10% — Capacitação / Cursos</option>
                            </select>

                            {/* Responsável Editável */}
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                              <span className="font-bold">Resp:</span>
                              <input
                                type="text"
                                value={act.responsavel}
                                onChange={e => {
                                  const next = [...acoes];
                                  next[idx].responsavel = e.target.value;
                                  setAcoes(next);
                                }}
                                className="bg-transparent font-semibold text-slate-800 outline-none w-24"
                                placeholder="Responsável..."
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Prazo Limite */}
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <span className="font-bold">Prazo:</span>
                              <input
                                type="date"
                                value={act.data_limite}
                                onChange={e => {
                                  const next = [...acoes];
                                  next[idx].data_limite = e.target.value;
                                  setAcoes(next);
                                }}
                                className="border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-mono bg-slate-50 outline-none"
                              />
                            </div>

                            {/* Duplicar Ação */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateAction(act)}
                              className="text-slate-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Duplicar Ação"
                            >
                              <Copy size={15} />
                            </button>

                            {/* Excluir Ação */}
                            <button
                              type="button"
                              onClick={() => setAcoes(acoes.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Excluir Ação"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Linha 2: Descrição Completa Editável */}
                        <div>
                          <textarea
                            rows={2}
                            value={act.descricao}
                            onChange={e => {
                              const next = [...acoes];
                              next[idx].descricao = e.target.value;
                              setAcoes(next);
                            }}
                            className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                            placeholder="Descreva exatamente o que deve ser praticado ou executado..."
                          />
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ETAPA 6: Revisão Geral */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <strong className="font-bold">Pronto para Publicar!</strong> Revise abaixo a estrutura completa do PDI. Ao publicar, o colaborador poderá visualizar seu desenvolvimento imediatamente no painel <em>Meu PDI 360°</em>.
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-200 pb-4">
                  <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Colaborador</span><strong>{selectedOperator?.name}</strong></div>
                  <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Tipo & Foco</span><strong>{tipo} ({dimensoesFoco.join(' + ')})</strong></div>
                  <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Duração</span><strong>{cicloDias} dias</strong></div>
                  <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Término</span><strong className="font-mono">{dataFim}</strong></div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">Competências Selecionadas ({competencias.length})</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {competencias.map(c => (
                      <span key={c.id} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-700">
                        {c.competencia}: {c.nivel_atual} → {c.nivel_desejado} (Gap: {c.gap})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">Objetivos SMART ({objetivos.length})</h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    {objetivos.map(o => (
                      <li key={o.id}>
                        <strong>{o.titulo}</strong> ({o.tipo_indicador === 'comportamental' ? 'Comportamental' : 'Quantitativo'}): Indicador <em>"{o.indicador_principal}"</em> → Meta <strong>{o.meta}</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">Ações na Matriz 70/20/10 ({acoes.length})</h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                    <div className="bg-emerald-100 text-emerald-800 p-2 rounded-xl">70% Prática: {acoes.filter(a => a.tipo_70_20_10 === '70_pratica').length} ações</div>
                    <div className="bg-blue-100 text-blue-800 p-2 rounded-xl">20% Social: {acoes.filter(a => a.tipo_70_20_10 === '20_social').length} ações</div>
                    <div className="bg-purple-100 text-purple-800 p-2 rounded-xl">10% Treino: {acoes.filter(a => a.tipo_70_20_10 === '10_capacitacao').length} ações</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Voltar
          </button>

          <div className="flex items-center gap-2">
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && !operatorReg) {
                    alert('Selecione um colaborador para avançar.');
                    return;
                  }
                  setCurrentStep(prev => Math.min(6, prev + 1));
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                Próximo Passo <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <CheckCircle2 size={16} />
                {isSubmitting ? 'Salvando...' : (editingPdi ? 'Salvar Alterações' : 'Publicar PDI')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PdiWizardModal;
