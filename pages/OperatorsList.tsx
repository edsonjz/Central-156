import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  Trash2,
  Edit,
  X,
  CheckCircle2,
  XCircle,
  Lock,
  Info,
  KeyRound,
  UserPlus
} from 'lucide-react';
import { Operator, Role, LinkType, WorkMode } from '../types';
import { useAuth } from '../AuthContext';
import { generateSystemEmail } from '../utils';

interface OperatorsListProps {
  operators: Operator[];
  onUpdate: (ops: Operator[] | ((prev: Operator[]) => Operator[])) => void;
  onSaveOperator: (op: Operator) => void;
  userRole: Role;
}

const OperatorsList: React.FC<OperatorsListProps> = ({ operators, onUpdate, onSaveOperator, userRole }) => {
  const navigate = useNavigate();
  const { supabase, createOperatorAccount } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | WorkMode>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Operator>>({
    name: '', registration: '', role: 'Operador', admissionDate: '',
    linkType: LinkType.EFETIVO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL,
    birthDate: '', active: true
  });

  // New Password State (Only for creation)
  const [newPassword, setNewPassword] = useState('');

  const filteredOperators = operators.filter(op => {
    const matchesSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase()) || op.registration.includes(searchTerm);
    const matchesMode = filterMode === 'all' || op.workMode === filterMode;
    return matchesSearch && matchesMode;
  });

  const handleOpenModal = (op?: Operator) => {
    if (op) {
      setEditingOperator(op);
      setFormData(op);
      setNewPassword(''); // Não editamos senha aqui por segurança, resetar
    } else {
      setEditingOperator(null);
      setFormData({
        name: '', registration: '', role: 'Operador', admissionDate: '',
        linkType: LinkType.EFETIVO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL,
        birthDate: '', active: true
      });
      setNewPassword('123456'); // Senha padrão sugerida
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registration || !formData.name) return;
    setIsSubmitting(true);

    try {
      if (editingOperator) {
        // --- EDIÇÃO DE OPERADOR (OTIMIZADO) ---
        onSaveOperator({ ...editingOperator, ...formData } as Operator);
        alert('Dados cadastrais atualizados com sucesso!');
      } else {
        // --- CRIAÇÃO DE NOVO OPERADOR ---
        if (operators.some(o => o.registration === formData.registration)) {
          alert('Erro: Esta matrícula já está cadastrada no sistema!');
          setIsSubmitting(false);
          return;
        }

        let userId = null;

        // 1. Criar Usuário no Supabase Auth usando o método SEGURO (sem logar)
        if (supabase && newPassword) {
          const email = generateSystemEmail(formData.registration);

          const { data, error } = await createOperatorAccount(
            email,
            newPassword,
            {
              registration: formData.registration,
              role: 'Operador',
              name: formData.name
            }
          );

          if (error) {
            alert(`Erro ao criar login: ${error.message}`);
            setIsSubmitting(false);
            return;
          }

          if (data.user) {
            userId = data.user.id;
          }
        }

        // 2. Salvar Dados na Tabela Operators
        const newOp = {
          ...formData,
          user_id: userId || undefined,
          kpis: [],
          feedbacks: [],
          documents: [],
          photoUrl: undefined
        } as Operator;

        // Atualiza estado local
        onUpdate(prev => [...prev, newOp]);

        // Salva no Banco
        if (supabase) {
          const { error: dbError } = await supabase.from('operators').insert(newOp);
          if (dbError) {
            console.error("Erro BD:", dbError);
            alert("Erro ao salvar perfil. O login foi criado, mas o registro no banco falhou.");
          }
        }

        alert(`Cadastro Realizado!\n\nVocê continua logado como Supervisor.\n\nEntregue estas credenciais ao colaborador:\nLOGIN: ${formData.registration}\nSENHA: ${newPassword}`);
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, registration: string) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmMessage = `ATENÇÃO: Você está prestes a excluir permanentemente o operador #${registration}.\n\nIsso removerá o acesso ao sistema e todos os dados.\nDeseja continuar?`;

    if (window.confirm(confirmMessage)) {
      onUpdate(prev => prev.filter(o => o.registration !== registration));

      if (supabase) {
        await supabase.from('operators').delete().eq('registration', registration);
        // Nota: O usuário Auth permanece "órfão" até ser deletado no painel do Supabase, mas perde acesso aos dados via RLS.
      }

      alert('Colaborador removido.');
    }
  };

  const handleToggleStatus = async (registration: string) => {
    const target = operators.find(o => o.registration === registration);
    if (!target) return;

    const newStatus = !target.active;

    // OTIMIZADO
    onSaveOperator({ ...target, active: newStatus });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão da Equipe</h1>
          <p className="text-gray-500">Administre o cadastro e acesso de colaboradores.</p>
        </div>
        {userRole === Role.SUPERVISOR && (
          <div className="flex items-center gap-3">
            <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-blue-700 transition-colors">
              <Plus size={18} /> Novo Operador
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text" placeholder="Pesquisar por nome ou matrícula..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500/20"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
          >
            <option value="all">Todas Modalidades</option>
            <option value={WorkMode.PRESENTIAL}>Presencial</option>
            <option value={WorkMode.HOME_OFFICE}>Home Office</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Cadastro</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Colaborador</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Vínculo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Modalidade</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOperators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    Nenhum colaborador encontrado.
                  </td>
                </tr>
              ) : (
                filteredOperators.map((op) => (
                  <tr key={op.registration} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">#{op.registration}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase shrink-0 overflow-hidden">
                          {op.photoUrl ? (
                            <img src={op.photoUrl} alt={op.name} className="w-full h-full object-cover" />
                          ) : (
                            op.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{op.name}</p>
                            {op.feedbacks.some(f => f.operatorResponse && f.isRead === false) && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" title="Nova resposta de feedback"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{op.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{op.linkType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{op.workMode}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(op.registration)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full transition-colors ${op.active ? 'text-green-600 bg-green-50' : 'text-red-400 bg-red-50'}`}
                        title="Alterar status"
                      >
                        {op.active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {op.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/operator/${op.registration}`)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <FileText size={18} />
                        </button>
                        {userRole === Role.SUPERVISOR && (
                          <>
                            <button
                              onClick={() => handleOpenModal(op)}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, op.registration)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {editingOperator ? <Edit size={20} className="text-blue-600" /> : <UserPlus size={20} className="text-blue-600" />}
                {editingOperator ? 'Editar Operador' : 'Novo Cadastro'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {!editingOperator && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 items-start mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600 shrink-0">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-800">Criação de Acesso</h4>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                      Ao salvar este formulário, o sistema criará automaticamente um <strong>Login</strong> e <strong>Senha</strong> para o operador acessar a plataforma.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Nome Completo</label>
                  <input required type="text" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Matrícula (Login)</label>
                  <input
                    required
                    type="text"
                    className={`w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none ${editingOperator ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                    disabled={!!editingOperator}
                    value={formData.registration}
                    onChange={e => setFormData({ ...formData, registration: e.target.value })}
                  />
                  {!editingOperator && <p className="text-[10px] text-gray-400 mt-1">Este será o login do usuário.</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Data Admissão</label>
                  <input type="text" placeholder="DD/MM/AAAA" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.admissionDate} onChange={e => setFormData({ ...formData, admissionDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Modalidade</label>
                  <select className="w-full border rounded-lg p-2 text-sm bg-white outline-none" value={formData.workMode} onChange={e => setFormData({ ...formData, workMode: e.target.value as WorkMode })}>
                    <option value={WorkMode.PRESENTIAL}>Presencial</option>
                    <option value={WorkMode.HOME_OFFICE}>Home Office</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Vínculo</label>
                  <select className="w-full border rounded-lg p-2 text-sm bg-white outline-none" value={formData.linkType} onChange={e => setFormData({ ...formData, linkType: e.target.value as LinkType })}>
                    <option value={LinkType.EFETIVO}>Efetivo</option>
                    <option value={LinkType.TEMPORARIO}>Temporário</option>
                    <option value={LinkType.APRENDIZ}>Aprendiz</option>
                  </select>
                </div>

                {!editingOperator && (
                  <div className="col-span-2 bg-yellow-50 p-4 rounded-xl border border-yellow-200 mt-2">
                    <label className="text-xs font-black text-yellow-800 block mb-2 uppercase tracking-wider flex items-center gap-1">
                      <Lock size={12} /> Senha Inicial de Acesso
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full border border-yellow-300 rounded-lg p-3 text-sm font-mono font-bold tracking-wider focus:ring-2 focus:ring-yellow-500/20 outline-none bg-white text-gray-800"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Ex: 123456"
                    />
                    <p className="text-[10px] text-yellow-700 mt-2 font-medium">
                      Anote esta senha! O operador precisará dela para entrar.
                    </p>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center"
              >
                {isSubmitting ? 'Processando...' : (editingOperator ? 'Salvar Alterações' : 'Criar Operador e Gerar Acesso')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorsList;