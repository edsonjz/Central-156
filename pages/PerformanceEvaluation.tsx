import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ClipboardCheck,
    Save,
    AlertCircle,
    Star,
    ChevronDown,
    ChevronUp,
    Info,
    Calendar,
    User,
    Search,
    CheckCircle2,
    History,
    Target,
    MessageSquare,
    Trash2,
    Edit,
    Eye,
    X,
    BarChart3
} from 'lucide-react';
import {
    Operator,
    PerformanceEvaluation,
    EvaluationType,
    EVALUATION_CRITERIA_CONFIG,
    RATING_SCALES,
    RatingScaleType,
    DEVELOPMENT_PLAN_OPTIONS,
    TeamGoals,
    Role
} from '../types';
import { useAuth } from '../AuthContext';
import EvaluationDashboard from '../components/EvaluationDashboard';

interface PerformanceEvaluationPageProps {
    operators: Operator[];
    goals: TeamGoals;
    userRole: Role;
}

// Componente de seleção de nota
const RatingSelector: React.FC<{
    value: number | null;
    onChange: (value: number) => void;
    scaleType: RatingScaleType;
    disabled?: boolean;
}> = ({ value, onChange, scaleType, disabled }) => {
    const scale = RATING_SCALES[scaleType];

    return (
        <div className="flex gap-2 flex-wrap">
            {scale.map((item) => (
                <button
                    key={item.value}
                    type="button"
                    onClick={() => !disabled && onChange(item.value)}
                    disabled={disabled}
                    className={`relative px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ${value === item.value
                        ? `${item.color} text-white border-transparent shadow-lg scale-105`
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={item.label}
                >
                    <span className="flex items-center gap-1.5">
                        <span className="text-sm font-black">{item.value}</span>
                        <span className="hidden sm:inline text-[10px] font-medium opacity-90">{item.label}</span>
                    </span>
                </button>
            ))}
        </div>
    );
};

// Componente de critério de avaliação
const CriterionCard: React.FC<{
    criterion: typeof EVALUATION_CRITERIA_CONFIG[number];
    value: number | null;
    comment: string;
    onValueChange: (value: number) => void;
    onCommentChange: (comment: string) => void;
    expanded: boolean;
    onToggle: () => void;
    readOnly?: boolean;
}> = ({ criterion, value, comment, onValueChange, onCommentChange, expanded, onToggle, readOnly }) => {
    const needsComment = value === 1 || value === 5;
    const scale = RATING_SCALES[criterion.scaleType];
    const selectedLabel = value ? scale.find(s => s.value === value)?.label : null;

    return (
        <div className={`bg-white rounded-2xl border transition-all ${expanded ? 'shadow-md border-blue-200' : 'shadow-sm border-gray-100'}`}>
            <button onClick={onToggle} className="w-full p-4 flex items-center justify-between text-left">
                <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm">{criterion.label}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{criterion.question}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                    {value && (
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold text-white ${RATING_SCALES[criterion.scaleType][value - 1]?.color || 'bg-gray-400'}`}>
                            {value} - {selectedLabel}
                        </span>
                    )}
                    {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-4 border-t pt-4">
                    <div className="flex flex-wrap gap-2">
                        {criterion.indicators.map((ind, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-full">{ind}</span>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nota</label>
                        <RatingSelector value={value} onChange={onValueChange} scaleType={criterion.scaleType} disabled={readOnly} />
                    </div>

                    {needsComment && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                <AlertCircle size={14} className="text-amber-500" />
                                Comentário {readOnly ? '' : 'obrigatório'} (nota {value})
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => onCommentChange(e.target.value)}
                                placeholder={value === 1 ? "Descreva os motivos da nota baixa..." : "Destaque os pontos que justificam a excelência..."}
                                className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none bg-amber-50 border-amber-200"
                                rows={3}
                                readOnly={readOnly}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Função para calcular nota de TMA (tempo - menor é melhor)
const calculateTMAScore = (value: string | null): number => {
    if (!value) return 3;

    const parts = value.split(':').map(Number);
    const totalSeconds = parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);

    // Regras específicas para TMA
    // 00:02:59 a 00:01:00 = 5 (muito acima do esperado)
    if (totalSeconds >= 60 && totalSeconds <= 179) return 5;
    // 00:03:59 a 00:03:00 = 4 (acima do esperado)
    if (totalSeconds >= 180 && totalSeconds <= 239) return 4;
    // 00:04:30 a 00:04:00 = 3 (dentro do esperado)
    if (totalSeconds >= 240 && totalSeconds <= 270) return 3;
    // 00:06:29 a 00:04:31 = 2 (abaixo do esperado)
    if (totalSeconds >= 271 && totalSeconds <= 389) return 2;
    // 00:20:00 a 00:06:30 = 1 (muito abaixo do esperado)
    if (totalSeconds >= 390 && totalSeconds <= 1200) return 1;
    // Fora dos ranges definidos
    if (totalSeconds > 1200) return 1;
    if (totalSeconds < 60) return 5;

    return 3;
};

// Função para calcular nota de NPS (maior é melhor)
const calculateNPSScore = (value: number | null): number => {
    if (value === null || value === undefined) return 3;

    // Regras específicas para NPS
    if (value >= 95) return 5; // 95 a 100 = muito acima do esperado
    if (value >= 93) return 4; // 93 a 95 = acima do esperado
    if (value >= 90) return 3; // 90 a 92 = dentro do esperado
    if (value >= 84) return 2; // 84 a 89 = abaixo do esperado
    return 1; // 70 a 83 = muito abaixo do esperado
};

// Função para calcular nota de Monitoria (maior é melhor)
const calculateMonitoriaScore = (value: number | null): number => {
    if (value === null || value === undefined) return 3;

    // Regras específicas para Monitoria
    if (value >= 99) return 5; // 99 a 100 = muito acima do esperado
    if (value >= 96) return 4; // 96 a 98 = acima do esperado
    if (value >= 90) return 3; // 90 a 95 = dentro do esperado
    if (value >= 81) return 2; // 81 a 89 = abaixo do esperado
    return 1; // 0 a 80 = muito abaixo do esperado
};

const PerformanceEvaluationPage: React.FC<PerformanceEvaluationPageProps> = ({ operators, goals, userRole }) => {
    const navigate = useNavigate();
    const { supabase, user, userProfile } = useAuth();

    // Estados
    const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [period, setPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const [expandedCriteria, setExpandedCriteria] = useState<string | null>(null);

    // Form state
    const [criteria, setCriteria] = useState<Record<string, number | null>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [pontosFortes, setPontosFortes] = useState('');
    const [pontosMelhoria, setPontosMelhoria] = useState('');
    const [planoDesenvolvimento, setPlanoDesenvolvimento] = useState('');

    // KPI scores calculados automaticamente
    const [kpiScores, setKpiScores] = useState<{ tma: number; nps: number; monitoria: number }>({ tma: 3, nps: 3, monitoria: 3 });

    // Histórico de avaliações
    const [evaluations, setEvaluations] = useState<PerformanceEvaluation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Estado para visualização/edição de avaliação
    const [viewingEvaluation, setViewingEvaluation] = useState<PerformanceEvaluation | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Estado para alternar entre formulário e dashboard
    const [viewMode, setViewMode] = useState<'form' | 'dashboard'>('form');

    // Operadores ativos filtrados
    const activeOperators = operators.filter(op => op.active);
    const filteredOperators = activeOperators.filter(op =>
        op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.registration.includes(searchTerm)
    );

    // Carregar avaliações do operador selecionado
    const loadEvaluations = useCallback(async () => {
        if (!supabase || !selectedOperator) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('performance_evaluations')
                .select('*')
                .eq('operator_registration', selectedOperator.registration)
                .order('period', { ascending: false });

            if (error) throw error;
            setEvaluations(data || []);
        } catch (err) {
            console.error('Erro ao carregar avaliações:', err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, selectedOperator]);

    useEffect(() => {
        loadEvaluations();
    }, [loadEvaluations]);

    // Calcular KPIs quando operador ou período mudar
    useEffect(() => {
        if (!selectedOperator?.kpis) return;

        const kpisOfPeriod = selectedOperator.kpis.filter(k => k.month === period);
        if (kpisOfPeriod.length === 0) {
            setKpiScores({ tma: 3, nps: 3, monitoria: 3 });
            return;
        }

        const latestKpi = kpisOfPeriod.reduce((latest, current) => {
            if (!latest.createdAt) return current;
            if (!current.createdAt) return latest;
            return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
        }, kpisOfPeriod[0]);

        setKpiScores({
            tma: calculateTMAScore(latestKpi.tma),
            nps: calculateNPSScore(latestKpi.nps),
            monitoria: calculateMonitoriaScore(latestKpi.monitoria)
        });
    }, [selectedOperator, period, goals]);

    // Reset form
    const resetForm = () => {
        setCriteria({});
        setComments({});
        setPontosFortes('');
        setPontosMelhoria('');
        setPlanoDesenvolvimento('');
        setExpandedCriteria(null);
        setViewingEvaluation(null);
        setIsEditing(false);
    };

    // Selecionar operador
    const handleSelectOperator = (op: Operator) => {
        setSelectedOperator(op);
        resetForm();
        setShowHistory(false);
    };

    // Carregar avaliação para edição
    const loadEvaluationForEdit = (ev: PerformanceEvaluation) => {
        setViewingEvaluation(ev);
        setIsEditing(true);
        setCriteria({
            assiduidade: ev.assiduidade,
            qualidade_atendimento: ev.qualidade_atendimento,
            procedimentos: ev.procedimentos,
            conhecimento_tecnico: ev.conhecimento_tecnico,
            produtividade: ev.produtividade,
            organizacao: ev.organizacao,
            comportamento: ev.comportamento,
            trabalho_equipe: ev.trabalho_equipe,
            adaptabilidade: ev.adaptabilidade,
            autonomia: ev.autonomia
        });
        setComments({
            comentario_assiduidade: ev.comentario_assiduidade || '',
            comentario_qualidade: ev.comentario_qualidade || '',
            comentario_procedimentos: ev.comentario_procedimentos || '',
            comentario_conhecimento: ev.comentario_conhecimento || '',
            comentario_produtividade: ev.comentario_produtividade || '',
            comentario_organizacao: ev.comentario_organizacao || '',
            comentario_comportamento: ev.comentario_comportamento || '',
            comentario_equipe: ev.comentario_equipe || '',
            comentario_adaptabilidade: ev.comentario_adaptabilidade || '',
            comentario_autonomia: ev.comentario_autonomia || ''
        });
        setPontosFortes(ev.pontos_fortes || '');
        setPontosMelhoria(ev.pontos_melhoria || '');
        setPlanoDesenvolvimento(ev.plano_desenvolvimento || '');
        setPeriod(ev.period);
        setShowHistory(false);
    };

    // Excluir avaliação
    const handleDeleteEvaluation = async (ev: PerformanceEvaluation) => {
        if (!supabase) return;
        if (!window.confirm('Tem certeza que deseja excluir esta avaliação permanentemente?')) return;

        try {
            const { error } = await supabase
                .from('performance_evaluations')
                .delete()
                .eq('id', ev.id);

            if (error) throw error;
            alert('Avaliação excluída com sucesso!');
            loadEvaluations();
            setViewingEvaluation(null);
        } catch (err: any) {
            console.error('Erro ao excluir:', err);
            alert(`Erro ao excluir: ${err.message}`);
        }
    };

    // Validação do form
    const isFormValid = () => {
        const allCriteriaFilled = EVALUATION_CRITERIA_CONFIG.every(c => criteria[c.key] !== null && criteria[c.key] !== undefined);
        if (!allCriteriaFilled) return false;

        for (const c of EVALUATION_CRITERIA_CONFIG) {
            const value = criteria[c.key];
            if ((value === 1 || value === 5) && !comments[`comentario_${c.key}`]?.trim()) {
                return false;
            }
        }

        // Pontos fortes e melhoria agora são opcionais

        return true;
    };

    // Salvar avaliação (nova ou edição)
    const handleSave = async () => {
        if (!supabase || !selectedOperator || !isFormValid()) return;

        setIsSaving(true);
        try {
            const evaluationData: any = {
                operator_registration: selectedOperator.registration,
                evaluator_id: user?.id,
                evaluator_name: userProfile?.name || user?.email || 'Supervisor',
                evaluation_type: EvaluationType.GRAUS_90,
                period,
                assiduidade: criteria.assiduidade ?? null,
                qualidade_atendimento: criteria.qualidade_atendimento ?? null,
                procedimentos: criteria.procedimentos ?? null,
                conhecimento_tecnico: criteria.conhecimento_tecnico ?? null,
                produtividade: criteria.produtividade ?? null,
                organizacao: criteria.organizacao ?? null,
                comportamento: criteria.comportamento ?? null,
                trabalho_equipe: criteria.trabalho_equipe ?? null,
                adaptabilidade: criteria.adaptabilidade ?? null,
                autonomia: criteria.autonomia ?? null,
                nota_tma: kpiScores.tma,
                nota_nps: kpiScores.nps,
                nota_monitoria: kpiScores.monitoria,
                comentario_assiduidade: comments.comentario_assiduidade || null,
                comentario_qualidade: comments.comentario_qualidade || null,
                comentario_procedimentos: comments.comentario_procedimentos || null,
                comentario_conhecimento: comments.comentario_conhecimento || null,
                comentario_produtividade: comments.comentario_produtividade || null,
                comentario_organizacao: comments.comentario_organizacao || null,
                comentario_comportamento: comments.comentario_comportamento || null,
                comentario_equipe: comments.comentario_equipe || null,
                comentario_adaptabilidade: comments.comentario_adaptabilidade || null,
                comentario_autonomia: comments.comentario_autonomia || null,
                pontos_fortes: pontosFortes,
                pontos_melhoria: pontosMelhoria,
                plano_desenvolvimento: planoDesenvolvimento || null
            };

            let error;
            if (isEditing && viewingEvaluation) {
                // Update existing
                const result = await supabase
                    .from('performance_evaluations')
                    .update(evaluationData)
                    .eq('id', viewingEvaluation.id);
                error = result.error;
            } else {
                // Insert new
                const result = await supabase
                    .from('performance_evaluations')
                    .insert([evaluationData]);
                error = result.error;
            }

            if (error) throw error;

            alert(isEditing ? 'Avaliação atualizada com sucesso!' : 'Avaliação salva com sucesso!');
            resetForm();
            loadEvaluations();

        } catch (err: any) {
            console.error('Erro ao salvar avaliação:', err);
            alert(`Erro ao salvar: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Calcular nota geral
    const calculateOverallScore = (): number => {
        const manualScores = Object.values(criteria).filter(v => v !== null) as number[];
        const allScores = [...manualScores, kpiScores.tma, kpiScores.nps, kpiScores.monitoria];
        if (allScores.length === 0) return 0;
        return allScores.reduce((a, b) => a + b, 0) / allScores.length;
    };

    const overallScore = calculateOverallScore();
    const overallColor = overallScore >= 4 ? 'text-green-600' : overallScore >= 3 ? 'text-yellow-600' : 'text-red-600';

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <ClipboardCheck className="text-blue-600" size={28} />
                            Avaliação de Desempenho
                        </h1>
                        <p className="text-sm text-gray-500">Avaliação 90° - Supervisor → Operador</p>
                    </div>
                </div>

                {/* Toggle View Mode */}
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('form')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'form' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ClipboardCheck size={18} />
                        Avaliações
                    </button>
                    <button
                        onClick={() => setViewMode('dashboard')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <BarChart3 size={18} />
                        Dashboard
                    </button>
                </div>
            </div>

            {viewMode === 'dashboard' ? (
                <EvaluationDashboard operators={operators} />
            ) : (

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Lista de Operadores */}
                    <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Equipe</h3>
                            <span className="text-xs text-gray-400 font-medium">{activeOperators.length} ativos</span>
                        </div>

                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar operador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {filteredOperators.map(op => {
                                const hasEvalThisPeriod = evaluations.some(e => e.operator_registration === op.registration && e.period === period);

                                return (
                                    <button
                                        key={op.registration}
                                        onClick={() => handleSelectOperator(op)}
                                        className={`w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all ${selectedOperator?.registration === op.registration
                                            ? 'bg-blue-50 border-2 border-blue-500'
                                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                            {op.photoUrl ? (
                                                <img src={op.photoUrl} alt={op.name} className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                op.name.charAt(0)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-900 truncate">{op.name}</p>
                                            <p className="text-xs text-gray-500">#{op.registration}</p>
                                        </div>
                                        {hasEvalThisPeriod && (
                                            <CheckCircle2 size={16} className="text-green-500 shrink-0" title="Já avaliado neste período" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Formulário de Avaliação */}
                    <div className="lg:col-span-2 space-y-6">
                        {!selectedOperator ? (
                            <div className="bg-white rounded-2xl border shadow-sm p-12 text-center">
                                <User size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="font-bold text-gray-700">Selecione um operador</h3>
                                <p className="text-sm text-gray-400 mt-1">Escolha um operador na lista para iniciar a avaliação</p>
                            </div>
                        ) : (
                            <>
                                {/* Cabeçalho do operador selecionado */}
                                <div className="bg-white rounded-2xl border shadow-sm p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                                                {selectedOperator.photoUrl ? (
                                                    <img src={selectedOperator.photoUrl} alt={selectedOperator.name} className="w-full h-full object-cover rounded-2xl" />
                                                ) : (
                                                    selectedOperator.name.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <h2 className="font-bold text-lg text-gray-900">{selectedOperator.name}</h2>
                                                <p className="text-sm text-gray-500">#{selectedOperator.registration} • {selectedOperator.role}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {isEditing && (
                                                <button
                                                    onClick={resetForm}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                >
                                                    <X size={16} />
                                                    Cancelar Edição
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { setShowHistory(!showHistory); setViewingEvaluation(null); setIsEditing(false); }}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${showHistory ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                            >
                                                <History size={16} />
                                                Histórico
                                            </button>
                                        </div>
                                    </div>

                                    {/* Período */}
                                    <div className="mt-6 flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                            <Calendar size={16} />
                                            Período de Avaliação:
                                        </label>
                                        <input
                                            type="month"
                                            value={period}
                                            onChange={(e) => setPeriod(e.target.value)}
                                            className="px-4 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                                            disabled={isEditing}
                                        />
                                    </div>
                                </div>

                                {showHistory ? (
                                    /* Histórico de Avaliações */
                                    <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <History size={18} className="text-blue-600" />
                                            Histórico de Avaliações
                                        </h3>

                                        {isLoading ? (
                                            <div className="py-8 text-center text-gray-400">Carregando...</div>
                                        ) : evaluations.length === 0 ? (
                                            <div className="py-8 text-center text-gray-400">
                                                <ClipboardCheck size={40} className="mx-auto mb-2 opacity-30" />
                                                Nenhuma avaliação registrada
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {evaluations.map((ev) => {
                                                    const scores = [
                                                        ev.assiduidade, ev.qualidade_atendimento, ev.procedimentos,
                                                        ev.conhecimento_tecnico, ev.produtividade, ev.organizacao,
                                                        ev.comportamento, ev.trabalho_equipe, ev.adaptabilidade,
                                                        ev.autonomia, ev.nota_tma, ev.nota_nps, ev.nota_monitoria
                                                    ].filter(s => s !== null) as number[];
                                                    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
                                                    const avgColor = Number(avg) >= 4 ? 'bg-green-500' : Number(avg) >= 3 ? 'bg-yellow-500' : 'bg-red-500';

                                                    return (
                                                        <div key={ev.id} className="p-4 border rounded-xl bg-gray-50">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-bold text-sm text-gray-900">
                                                                        {new Date(ev.period + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Por: {ev.evaluator_name} • {ev.created_at ? new Date(ev.created_at).toLocaleDateString('pt-BR') : ''}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`px-3 py-1.5 rounded-lg text-white font-bold ${avgColor}`}>
                                                                        {avg}
                                                                    </div>
                                                                    {userRole === Role.SUPERVISOR && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => setViewingEvaluation(viewingEvaluation?.id === ev.id ? null : ev)}
                                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                                title="Ver detalhes"
                                                                            >
                                                                                <Eye size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => loadEvaluationForEdit(ev)}
                                                                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                                title="Editar avaliação"
                                                                            >
                                                                                <Edit size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteEvaluation(ev)}
                                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                                title="Excluir avaliação"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Detalhes expandidos */}
                                                            {viewingEvaluation?.id === ev.id && (
                                                                <div className="mt-4 pt-4 border-t space-y-4">
                                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                        {EVALUATION_CRITERIA_CONFIG.map(c => {
                                                                            const val = (ev as any)[c.key];
                                                                            const color = val ? RATING_SCALES[c.scaleType][val - 1]?.color : 'bg-gray-300';
                                                                            return (
                                                                                <div key={c.key} className="p-3 bg-white rounded-lg border">
                                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{c.label}</p>
                                                                                    <div className={`inline-block px-2 py-0.5 mt-1 rounded text-xs font-bold text-white ${color}`}>
                                                                                        {val || '-'}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        <div className="p-3 bg-white rounded-lg border">
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">TMA (Auto)</p>
                                                                            <div className={`inline-block px-2 py-0.5 mt-1 rounded text-xs font-bold text-white ${RATING_SCALES.professional[(ev.nota_tma || 3) - 1]?.color}`}>
                                                                                {ev.nota_tma || '-'}
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-3 bg-white rounded-lg border">
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">NPS (Auto)</p>
                                                                            <div className={`inline-block px-2 py-0.5 mt-1 rounded text-xs font-bold text-white ${RATING_SCALES.professional[(ev.nota_nps || 3) - 1]?.color}`}>
                                                                                {ev.nota_nps || '-'}
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-3 bg-white rounded-lg border">
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Monitoria (Auto)</p>
                                                                            <div className={`inline-block px-2 py-0.5 mt-1 rounded text-xs font-bold text-white ${RATING_SCALES.professional[(ev.nota_monitoria || 3) - 1]?.color}`}>
                                                                                {ev.nota_monitoria || '-'}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                                                            <p className="text-xs font-bold text-green-700 uppercase mb-1">Pontos Fortes</p>
                                                                            <p className="text-sm text-gray-700">{ev.pontos_fortes}</p>
                                                                        </div>
                                                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                                            <p className="text-xs font-bold text-amber-700 uppercase mb-1">Pontos de Melhoria</p>
                                                                            <p className="text-sm text-gray-700">{ev.pontos_melhoria}</p>
                                                                        </div>
                                                                    </div>

                                                                    {ev.plano_desenvolvimento && (
                                                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                                            <p className="text-xs font-bold text-blue-700 uppercase mb-1">Plano de Desenvolvimento</p>
                                                                            <p className="text-sm text-gray-700">{ev.plano_desenvolvimento}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {/* Notas automáticas de KPIs */}
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                                                <Target size={18} className="text-blue-600" />
                                                Indicadores do Período (Calculados Automaticamente)
                                            </h3>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">TMA</p>
                                                    <div className={`text-2xl font-black ${RATING_SCALES.professional[kpiScores.tma - 1]?.color.replace('bg-', 'text-')}`}>
                                                        {kpiScores.tma}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-1">{RATING_SCALES.professional[kpiScores.tma - 1]?.label}</p>
                                                </div>
                                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">NPS</p>
                                                    <div className={`text-2xl font-black ${RATING_SCALES.professional[kpiScores.nps - 1]?.color.replace('bg-', 'text-')}`}>
                                                        {kpiScores.nps}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-1">{RATING_SCALES.professional[kpiScores.nps - 1]?.label}</p>
                                                </div>
                                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Monitoria</p>
                                                    <div className={`text-2xl font-black ${RATING_SCALES.professional[kpiScores.monitoria - 1]?.color.replace('bg-', 'text-')}`}>
                                                        {kpiScores.monitoria}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-1">{RATING_SCALES.professional[kpiScores.monitoria - 1]?.label}</p>
                                                </div>
                                            </div>

                                            <p className="text-xs text-blue-600 mt-4 flex items-center gap-1">
                                                <Info size={12} />
                                                Notas calculadas com base nos KPIs lançados para o período selecionado
                                            </p>
                                        </div>

                                        {/* Critérios de Avaliação */}
                                        <div className="space-y-3">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                <Star size={18} className="text-amber-500" />
                                                Critérios de Avaliação Manual
                                                {isEditing && <span className="text-xs text-blue-600 font-normal">(Editando avaliação existente)</span>}
                                            </h3>

                                            {EVALUATION_CRITERIA_CONFIG.map((criterion) => (
                                                <CriterionCard
                                                    key={criterion.key}
                                                    criterion={criterion}
                                                    value={criteria[criterion.key] ?? null}
                                                    comment={comments[`comentario_${criterion.key}`] || ''}
                                                    onValueChange={(v) => setCriteria(prev => ({ ...prev, [criterion.key]: v }))}
                                                    onCommentChange={(c) => setComments(prev => ({ ...prev, [`comentario_${criterion.key}`]: c }))}
                                                    expanded={expandedCriteria === criterion.key}
                                                    onToggle={() => setExpandedCriteria(expandedCriteria === criterion.key ? null : criterion.key)}
                                                />
                                            ))}
                                        </div>

                                        {/* Campos Complementares */}
                                        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                <MessageSquare size={18} className="text-green-600" />
                                                Campos Complementares
                                            </h3>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                                        Pontos Fortes do Operador <span className="text-red-500">*</span>
                                                    </label>
                                                    <textarea
                                                        value={pontosFortes}
                                                        onChange={(e) => setPontosFortes(e.target.value)}
                                                        placeholder="Destaque as principais qualidades e competências do operador..."
                                                        className="w-full p-4 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                                                        rows={3}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                                        Pontos de Melhoria <span className="text-red-500">*</span>
                                                    </label>
                                                    <textarea
                                                        value={pontosMelhoria}
                                                        onChange={(e) => setPontosMelhoria(e.target.value)}
                                                        placeholder="Identifique comportamentos ou resultados que precisam de desenvolvimento..."
                                                        className="w-full p-4 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                                                        rows={3}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                                        Plano de Desenvolvimento Sugerido
                                                    </label>
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {DEVELOPMENT_PLAN_OPTIONS.map((opt) => (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                onClick={() => setPlanoDesenvolvimento(prev =>
                                                                    prev.includes(opt)
                                                                        ? prev.replace(opt + ', ', '').replace(', ' + opt, '').replace(opt, '')
                                                                        : prev ? prev + ', ' + opt : opt
                                                                )}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${planoDesenvolvimento.includes(opt)
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                    }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <textarea
                                                        value={planoDesenvolvimento}
                                                        onChange={(e) => setPlanoDesenvolvimento(e.target.value)}
                                                        placeholder="Descreva ações específicas ou adicione mais sugestões..."
                                                        className="w-full p-4 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Resumo e Botão Salvar */}
                                        <div className="bg-white rounded-2xl border shadow-sm p-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase">Nota Geral Prévia</p>
                                                    <p className={`text-3xl font-black ${overallColor}`}>
                                                        {overallScore > 0 ? overallScore.toFixed(1) : '-'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {Object.values(criteria).filter(v => v !== null).length}/10 critérios preenchidos
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={handleSave}
                                                    disabled={!isFormValid() || isSaving}
                                                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all ${isFormValid() && !isSaving
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {isSaving ? (
                                                        <>
                                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                            Salvando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save size={20} />
                                                            {isEditing ? 'Atualizar Avaliação' : 'Salvar Avaliação'}
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {!isFormValid() && (
                                                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
                                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                                    <div>
                                                        <strong>Para salvar a avaliação:</strong>
                                                        <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                                            {Object.values(criteria).filter(v => v !== null).length < 10 && <li>Preencha todos os 10 critérios de avaliação</li>}
                                                            {EVALUATION_CRITERIA_CONFIG.some(c => (criteria[c.key] === 1 || criteria[c.key] === 5) && !comments[`comentario_${c.key}`]?.trim()) && <li>Adicione comentários para notas 1 ou 5</li>}
                                                            {!pontosFortes.trim() && <li>Preencha os pontos fortes</li>}
                                                            {!pontosMelhoria.trim() && <li>Preencha os pontos de melhoria</li>}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceEvaluationPage;
