import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Briefcase,
  TrendingUp,
  MessageSquare,
  FileText,
  Upload,
  Plus,
  X,
  Trash2,
  Heart,
  Clock,
  Eye,
  Edit,
  Download,
  AlertTriangle,
  UserX,
  Camera,
  Lock,
  Key,
  ShieldAlert,
  Loader2,
  User,
  Send,
  Check
} from 'lucide-react';
import { Operator, Role, KPI, Feedback, TeamGoals } from '../types';
import { calculateAverageKPIs, getStatusColor, formatDecimal, generateSystemEmail } from '../utils';
import { useAuth } from '../AuthContext';

interface OperatorDetailProps {
  operators: Operator[];
  onUpdate: (ops: Operator[] | ((prev: Operator[]) => Operator[])) => void;
  userRole: Role;
  goals: TeamGoals;
}

const OperatorDetail: React.FC<OperatorDetailProps> = ({ operators, onUpdate, userRole, goals }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { supabase, userProfile, user, createOperatorAccount } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'kpis' | 'feedback' | 'documents'>('kpis');
  const [newFeedback, setNewFeedback] = useState('');
  const [modalKPI, setModalKPI] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
  
  // States para Edição de Feedback
  const [editingFeedback, setEditingFeedback] = useState<string | null>(null); // ID do feedback
  const [editFeedbackText, setEditFeedbackText] = useState('');

  // States para Modal de Acesso
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isCreatingAccess, setIsCreatingAccess] = useState(false);
  
  // Estado do formulário KPI
  const [kpiForm, setKpiForm] = useState({ 
    month: '', 
    tma: '', 
    nps: '', 
    monitoria: '' 
  });

  // Estado para rascunho de respostas de feedback (Key: FeedbackID, Value: Text)
  const [replyDrafts, setReplyDrafts] = useState<{[key: string]: string}>({});

  // Lógica de Seleção do Operador (Robustez Aprimorada):
  let operator: Operator | undefined = undefined;

  if (id) {
    operator = operators.find(o => o.registration === id);
  } else {
    if (userProfile?.registration) {
      operator = operators.find(o => o.registration === userProfile.registration);
    }
    if (!operator && user?.id) {
      operator = operators.find(o => o.user_id === user.id);
    }
    if (!operator && userRole === Role.OPERATOR && operators.length === 1) {
      operator = operators[0];
    }
  }

  if (!operator) {
    return (
      <div className="p-20 text-center space-y-4 animate-in fade-in">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
          <UserX size={40} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Operador não encontrado</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          {id 
            ? "O colaborador pode ter sido removido ou o link está incorreto." 
            : "Não foi possível carregar seus dados no momento. Se você acabou de ser cadastrado, solicite ao supervisor que verifique se o seu perfil foi vinculado corretamente."}
        </p>
        <button onClick={() => navigate('/')} className="text-blue-600 font-bold hover:underline">Voltar ao início</button>
      </div>
    );
  }

  const targetRegistration = operator.registration;
  const stats = calculateAverageKPIs(operator.kpis);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Photo = event.target?.result as string;
      onUpdate(prev => prev.map(o => o.registration === targetRegistration ? { ...o, photoUrl: base64Photo } : o));
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteOperator = async () => {
    const confirmPrimary = window.confirm(`Deseja realmente EXCLUIR PERMANENTEMENTE o operador ${operator!.name}?`);
    if (confirmPrimary) {
      const confirmSecondary = window.confirm(`Atenção: Esta ação NÃO PODE SER DESFEITA e apagará todo o histórico de KPIs e documentos. Confirmar exclusão?`);
      if (confirmSecondary) {
        // 1. Atualiza UI Local
        onUpdate(prev => {
          const newList = (Array.isArray(prev) ? prev : []).filter(o => o.registration !== targetRegistration);
          return newList;
        });

        // 2. Remove do Banco de Dados (Supabase)
        if (supabase) {
          try {
            const { error } = await supabase.from('operators').delete().eq('registration', targetRegistration);
            if (error) {
              console.error("Erro ao excluir do banco:", error);
              alert("Erro ao excluir do banco de dados. Verifique o console.");
              // Opcional: Recarregar página se falhar
              return;
            }
          } catch (err) {
            console.error(err);
          }
        }
        
        navigate('/operators');
      }
    }
  };

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    
    setIsCreatingAccess(true);
    
    try {
      if (!supabase || !operator) throw new Error("Conexão com banco não estabelecida.");

      const email = generateSystemEmail(operator.registration);

      const { data, error } = await createOperatorAccount(
        email, 
        newPassword, 
        {
          registration: operator.registration,
          role: 'Operador',
          name: operator.name
        }
      );

      if (error) {
        if (error.message.includes("already registered")) {
           alert("Este login já existe no sistema de autenticação. Tente excluir o operador e criar novamente se precisar resetar o acesso.");
        } else {
           throw error;
        }
        setIsCreatingAccess(false);
        return;
      }

      if (data.user) {
        const { error: updateError } = await supabase
          .from('operators')
          .update({ user_id: data.user.id })
          .eq('registration', operator.registration);
          
        if (updateError) throw updateError;

        onUpdate(prev => prev.map(o => o.registration === targetRegistration ? { ...o, user_id: data.user!.id } : o));

        setAccessModalOpen(false);
        alert(`ACESSO CRIADO COM SUCESSO!\n\nEntregue ao operador:\nLogin: ${operator.registration}\nSenha: ${newPassword}`);
      }

    } catch (err: any) {
      console.error(err);
      alert(`Erro ao criar acesso: ${err.message}`);
    } finally {
      setIsCreatingAccess(false);
    }
  };

  // --- KPI LOGIC ---

  const handleOpenKPIModal = (kpi?: KPI) => {
    if (kpi) {
      setEditingKPI(kpi);
      setKpiForm({ 
        month: kpi.month, 
        tma: kpi.tma || '', 
        nps: kpi.nps !== null ? String(kpi.nps) : '', 
        monitoria: kpi.monitoria !== null ? String(kpi.monitoria) : '' 
      });
    } else {
      setEditingKPI(null);
      // Ao abrir novo, campos vazios
      setKpiForm({ month: '', tma: '', nps: '', monitoria: '' });
    }
    setModalKPI(true);
  };

  const handleSaveKPI = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Converte strings vazias para null
    const finalKPI = {
       tma: kpiForm.tma.trim() === '' ? null : kpiForm.tma,
       nps: kpiForm.nps === '' ? null : Number(kpiForm.nps),
       monitoria: kpiForm.monitoria === '' ? null : Number(kpiForm.monitoria),
       month: kpiForm.month
    };

    onUpdate(prev => {
      return prev.map(o => {
        if (o.registration === targetRegistration) {
          let updatedKpis;
          if (editingKPI) {
            updatedKpis = o.kpis.map(k => k.id === editingKPI.id ? { ...k, ...finalKPI } : k);
          } else {
            const newKpi: KPI = { id: Math.random().toString(), ...finalKPI };
            updatedKpis = [...o.kpis, newKpi].sort((a, b) => b.month.localeCompare(a.month));
          }
          return { ...o, kpis: updatedKpis };
        }
        return o;
      });
    });
    setModalKPI(false);
  };

  const handleDeleteKPI = (kpiId: string) => {
    if (window.confirm('Tem certeza que deseja excluir permanentemente este indicador de KPI?')) {
      onUpdate(prev => prev.map(o => o.registration === targetRegistration ? { ...o, kpis: o.kpis.filter(k => k.id !== kpiId) } : o));
    }
  };

  // --- FEEDBACK LOGIC ---

  const handleAddFeedback = () => {
    if (!newFeedback.trim()) return;
    const feedback: Feedback = { 
      id: Math.random().toString(), 
      date: new Date().toLocaleDateString('pt-BR'), 
      supervisorId: 'sup-1', 
      supervisorName: 'Supervisor', 
      comment: newFeedback 
    };
    onUpdate(prev => prev.map(o => o.registration === targetRegistration ? { ...o, feedbacks: [feedback, ...o.feedbacks] } : o));
    setNewFeedback('');
  };

  const handleDeleteFeedback = (feedbackId: string) => {
    if (window.confirm('Deseja excluir este feedback permanentemente?')) {
      onUpdate(prev => prev.map(o => o.registration === targetRegistration ? { ...o, feedbacks: o.feedbacks.filter(f => f.id !== feedbackId) } : o));
    }
  };

  const handleStartEditFeedback = (feedback: Feedback) => {
    setEditingFeedback(feedback.id);
    setEditFeedbackText(feedback.comment);
  };

  const handleSaveEditedFeedback = (feedbackId: string) => {
    if (!editFeedbackText.trim()) return;
    
    onUpdate(prev => prev.map(o => {
      if (o.registration === targetRegistration) {
        return {
          ...o,
          feedbacks: o.feedbacks.map(f => f.id === feedbackId ? { ...f, comment: editFeedbackText } : f)
        };
      }
      return o;
    }));
    
    setEditingFeedback(null);
    setEditFeedbackText('');
  };

  const handleSendResponse = (feedbackId: string) => {
    const responseText = replyDrafts[feedbackId];
    if (!responseText?.trim()) return;

    onUpdate(prev => prev.map(o => {
        if (o.registration === targetRegistration) {
            return {
                ...o,
                feedbacks: o.feedbacks.map(f => f.id === feedbackId ? { ...f, operatorResponse: responseText } : f)
            };
        }
        return o;
    }));

    // Limpa o rascunho
    const newDrafts = { ...replyDrafts };
    delete newDrafts[feedbackId];
    setReplyDrafts(newDrafts);
  };

  // --- DOCUMENTS LOGIC ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newDoc = { 
        id: Math.random().toString(), 
        name: file.name, 
        type: file.name.split('.').pop()?.toUpperCase() || 'PDF', 
        url: event.target?.result as string, 
        date: new Date().toLocaleDateString('pt-BR') 
      };
      onUpdate(prev => prev.map(o => o.registration === targetRegistration ? { ...o, documents: [...(o.documents || []), newDoc] } : o));
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteDocument = (docId: string) => {
    if (window.confirm('Deseja excluir este anexo permanentemente?')) {
      onUpdate(prev => prev.map(o => o.registration === targetRegistration ? { ...o, documents: o.documents.filter(d => d.id !== docId) } : o));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-500">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Perfil do Colaborador</h1>
            <p className="text-sm text-gray-500">{operator.name}</p>
          </div>
        </div>
        
        {userRole === Role.SUPERVISOR && (
          <button 
            onClick={handleDeleteOperator}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold transition-colors border border-transparent hover:border-red-100"
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">Excluir Colaborador</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Info */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div 
              className="relative group cursor-pointer mb-6"
              onClick={() => userRole === Role.SUPERVISOR && photoInputRef.current?.click()}
            >
              <div className="w-32 h-32 rounded-3xl bg-blue-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl overflow-hidden">
                {operator.photoUrl ? (
                  <img src={operator.photoUrl} alt={operator.name} className="w-full h-full object-cover" />
                ) : (
                  operator.name.charAt(0)
                )}
              </div>
              {userRole === Role.SUPERVISOR && (
                <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                  <span className="sr-only">Trocar foto</span>
                </div>
              )}
              <input 
                type="file" 
                ref={photoInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handlePhotoUpload}
              />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{operator.name}</h2>
            <p className="text-blue-600 font-semibold text-sm mb-6">{operator.role}</p>
            
            {/* Indicador de Acesso */}
            {operator.user_id ? (
              <div className="w-full bg-green-50 border border-green-100 rounded-xl p-3 mb-6 flex items-center justify-center gap-2">
                <ShieldAlert size={16} className="text-green-600" />
                <span className="text-xs font-bold text-green-700">Acesso ao Sistema Ativo</span>
              </div>
            ) : (
              <div className="w-full mb-6">
                {userRole === Role.SUPERVISOR && (
                  <button 
                    onClick={() => {
                      setNewPassword('123456'); // Sugestão
                      setAccessModalOpen(true);
                    }}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Key size={16} />
                    Criar Acesso / Senha
                  </button>
                )}
                <p className="text-[10px] text-gray-400 mt-2 text-center">Usuário ainda não possui login.</p>
              </div>
            )}

            <div className="w-full grid grid-cols-2 gap-4 pt-6 border-t">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Matrícula</p>
                <p className="font-bold">#{operator.registration}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Status</p>
                <p className={`font-bold ${operator.active ? 'text-green-600' : 'text-red-500'}`}>
                  {operator.active ? 'Ativo' : 'Inativo'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-4">Dados Funcionais</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <Briefcase className="text-gray-400" size={18} />
                <span>{operator.workMode}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Calendar className="text-gray-400" size={18} />
                <span>Admissão: {operator.admissionDate}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <AlertTriangle className="text-gray-400" size={18} />
                <span>Vínculo: {operator.linkType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: KPIs e Abas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border">
              <p className="text-xs font-bold text-gray-400 uppercase">TMA</p>
              <p className={`text-xl font-black ${getStatusColor(stats.tma, goals.tma, 'lower')}`}>
                {stats.tma === '00:00:00' ? '-' : stats.tma}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border">
              <p className="text-xs font-bold text-gray-400 uppercase">NPS</p>
              <p className={`text-xl font-black ${getStatusColor(stats.nps, goals.nps)}`}>
                {formatDecimal(stats.nps)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border">
              <p className="text-xs font-bold text-gray-400 uppercase">Qualidade</p>
              <p className={`text-xl font-black ${getStatusColor(stats.monitoria, goals.monitoria)}`}>
                {formatDecimal(stats.monitoria)}
              </p>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
            {(['kpis', 'feedback', 'documents'] as const).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab === 'kpis' ? 'Indicadores' : tab === 'feedback' ? 'Feedbacks' : 'Documentos'}
              </button>
            ))}
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border min-h-[400px]">
            {activeTab === 'kpis' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-lg">Histórico de Performance</h4>
                  {userRole === Role.SUPERVISOR && (
                    <button 
                      onClick={() => handleOpenKPIModal()} 
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md"
                    >
                      <Plus size={18} /> Novo Lançamento
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="text-left border-b text-xs font-bold text-gray-400">
                        <th className="pb-4 uppercase">Mês/Ano</th>
                        <th className="pb-4 uppercase">TMA</th>
                        <th className="pb-4 uppercase">NPS</th>
                        <th className="pb-4 uppercase">Monitoria</th>
                        {userRole === Role.SUPERVISOR && <th className="pb-4 text-right">AÇÕES</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {operator.kpis.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-gray-400 italic">
                            <TrendingUp className="mx-auto mb-2 opacity-20" size={48} />
                            Nenhum indicador registrado para este período.
                          </td>
                        </tr>
                      ) : (
                        operator.kpis.map(kpi => (
                          <tr key={kpi.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors group">
                            <td className="py-4 font-bold">{kpi.month}</td>
                            <td className={`py-4 font-semibold ${getStatusColor(kpi.tma, goals.tma, 'lower')}`}>
                                {kpi.tma || '-'}
                            </td>
                            <td className={`py-4 font-semibold ${getStatusColor(kpi.nps, goals.nps)}`}>
                                {formatDecimal(kpi.nps)}
                            </td>
                            <td className={`py-4 font-semibold ${getStatusColor(kpi.monitoria, goals.monitoria)}`}>
                                {formatDecimal(kpi.monitoria)}
                            </td>
                            {userRole === Role.SUPERVISOR && (
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => handleOpenKPIModal(kpi)} 
                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Editar lançamento"
                                  >
                                    <Edit size={16}/>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteKPI(kpi.id)} 
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Excluir lançamento"
                                  >
                                    <Trash2 size={16}/>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'feedback' && (
              <div className="space-y-6">
                {userRole === Role.SUPERVISOR && (
                  <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                    <textarea 
                      value={newFeedback} 
                      onChange={e => setNewFeedback(e.target.value)} 
                      placeholder="Descreva o feedback para o colaborador..." 
                      className="w-full p-4 border rounded-xl h-24 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" 
                    />
                    <button 
                      onClick={handleAddFeedback} 
                      className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold ml-auto block shadow-md hover:bg-blue-700 transition-colors"
                    >
                      Registrar Feedback
                    </button>
                  </div>
                )}
                <div className="space-y-6">
                  {operator.feedbacks.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 italic">Sem feedbacks registrados.</div>
                  ) : (
                    operator.feedbacks.map(f => (
                      <div key={f.id} className="relative group">
                        {/* Box Supervisor */}
                        <div className="p-5 border rounded-2xl bg-gray-50 flex gap-4 relative z-10">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <MessageSquare size={18} className="text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between mb-2 text-xs font-bold uppercase text-gray-400">
                                    <span>{f.supervisorName}</span>
                                    <span>{f.date}</span>
                                </div>
                                {editingFeedback === f.id ? (
                                  <div className="space-y-2">
                                    <textarea 
                                      value={editFeedbackText}
                                      onChange={(e) => setEditFeedbackText(e.target.value)}
                                      className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none bg-white"
                                      rows={4}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => setEditingFeedback(null)}
                                        className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg flex items-center gap-1"
                                      >
                                        <X size={14} /> Cancelar
                                      </button>
                                      <button 
                                        onClick={() => handleSaveEditedFeedback(f.id)}
                                        className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center gap-1"
                                      >
                                        <Check size={14} /> Salvar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{f.comment}</p>
                                )}
                            </div>
                            
                            {/* Botões de Ação para Supervisor */}
                            {userRole === Role.SUPERVISOR && !editingFeedback && (
                              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleStartEditFeedback(f)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar Feedback"
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteFeedback(f.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Excluir Feedback"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                        </div>
                        
                        {/* Linha de conexão */}
                        <div className="absolute left-10 top-14 bottom-0 w-px bg-gray-200 z-0"></div>

                        {/* Box Resposta Operador */}
                        <div className="ml-12 mt-3 p-4 bg-white border border-l-4 border-l-blue-500 rounded-r-xl rounded-bl-xl shadow-sm relative z-10">
                            {f.operatorResponse ? (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                        <User size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-wider">Resposta do Colaborador</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">{f.operatorResponse}</p>
                                    </div>
                                </div>
                            ) : (
                                userRole === Role.OPERATOR ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                <User size={12} className="text-gray-500"/>
                                            </div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Sua Resposta</p>
                                        </div>
                                        <textarea
                                            className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                            placeholder="Escreva sua resposta, justificativa ou plano de ação..."
                                            rows={2}
                                            value={replyDrafts[f.id] || ''}
                                            onChange={(e) => setReplyDrafts({...replyDrafts, [f.id]: e.target.value})}
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleSendResponse(f.id)}
                                                disabled={!replyDrafts[f.id]?.trim()}
                                                className="flex items-center gap-2 text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Send size={12} /> Enviar Resposta
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-400 italic text-xs py-2">
                                        <Clock size={14} />
                                        Aguardando resposta do colaborador.
                                    </div>
                                )
                            )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-lg">Documentos e Arquivos</h4>
                  <div className="relative">
                    {(userRole === Role.SUPERVISOR || true) && (
                         <>
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept=".pdf,.doc,.docx" 
                              onChange={handleFileUpload}
                            />
                            <button 
                              onClick={() => fileInputRef.current?.click()} 
                              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors"
                            >
                              <Upload size={18} /> Novo Anexo
                            </button>
                         </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(operator.documents || []).length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-400 italic">
                      <FileText className="mx-auto mb-2 opacity-20" size={48} />
                      Nenhum documento anexado ao perfil.
                    </div>
                  ) : (
                    (operator.documents || []).map(doc => (
                      <div key={doc.id} className="p-4 border rounded-2xl flex items-center justify-between group bg-white hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${['DOC', 'DOCX'].includes(doc.type) ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold truncate max-w-[150px]">{doc.name}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">{doc.type} • {doc.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={doc.url} download={doc.name} className="p-2 text-gray-400 hover:text-blue-600">
                            <Download size={18} />
                          </a>
                          {userRole === Role.SUPERVISOR && (
                            <button 
                              className="p-2 text-gray-400 hover:text-red-600" 
                              onClick={() => handleDeleteDocument(doc.id)}
                              title="Excluir Documento"
                            >
                              <Trash2 size={18}/>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalKPI && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {editingKPI ? 'Editar Indicadores' : 'Lançar Indicadores'}
              </h3>
              <button onClick={() => setModalKPI(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20}/>
              </button>
            </div>
            <form onSubmit={handleSaveKPI} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1 uppercase">Mês de Referência</label>
                <input 
                  required 
                  type="month" 
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" 
                  value={kpiForm.month} 
                  onChange={e => setKpiForm({...kpiForm, month: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1 uppercase">TMA (Tempo Médio)</label>
                  <input 
                    type="text" 
                    placeholder="Deixe em branco se não houver" 
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-mono" 
                    value={kpiForm.tma} 
                    onChange={e => setKpiForm({...kpiForm, tma: e.target.value})} 
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Ex: 00:04:30. Deixe vazio para não contabilizar.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1 uppercase">NPS (0-100)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      max="100" 
                      min="0" 
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" 
                      value={kpiForm.nps} 
                      onChange={e => setKpiForm({...kpiForm, nps: e.target.value})} 
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1 uppercase">Monitoria</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      max="100" 
                      min="0" 
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" 
                      value={kpiForm.monitoria} 
                      onChange={e => setKpiForm({...kpiForm, monitoria: e.target.value})} 
                      placeholder="-"
                    />
                  </div>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-2 shadow-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                {editingKPI ? 'Salvar Alterações' : 'Confirmar Lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {accessModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-slate-900 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2 bg-blue-600 rounded-lg">
                      <Lock size={20} />
                   </div>
                   <h3 className="font-bold text-lg">Gerar Credenciais</h3>
                </div>
                <p className="text-xs text-slate-400">
                   Crie um login e senha para que <strong>{operator.name}</strong> possa acessar o painel.
                </p>
             </div>
             
             <form onSubmit={handleCreateAccess} className="p-6 pt-8 space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-gray-400">Login (Matrícula)</label>
                   <div className="bg-gray-100 p-3 rounded-xl border border-gray-200 font-mono text-sm font-bold text-gray-600 select-none">
                      {operator.registration}
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-gray-400">Definir Senha de Acesso</label>
                   <input 
                      type="text" 
                      autoFocus
                      className="w-full border-2 border-blue-100 focus:border-blue-500 rounded-xl p-3 font-mono text-lg font-bold text-gray-800 outline-none transition-colors"
                      placeholder="Ex: 123456"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                   />
                </div>

                <div className="pt-2">
                   <button 
                      type="submit"
                      disabled={isCreatingAccess}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                   >
                      {isCreatingAccess ? 'Criando...' : 'Confirmar e Criar Acesso'}
                   </button>
                   <button 
                      type="button"
                      onClick={() => setAccessModalOpen(false)}
                      className="w-full mt-2 py-3 text-xs font-bold text-gray-400 hover:text-gray-600"
                   >
                      Cancelar
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorDetail;