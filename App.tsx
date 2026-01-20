import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  Users,
  LayoutDashboard,
  TrendingUp,
  Settings,
  Menu,
  ShieldCheck,
  Monitor,
  AlertCircle,
  LogOut,
  UserCircle,
  AlertTriangle,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import OperatorsList from './pages/OperatorsList';
import OperatorDetail from './pages/OperatorDetail';
import Indicators from './pages/Indicators';
// Removed TvMode import
import SettingsPage from './pages/Settings';
import PendingIndicators from './pages/PendingIndicators';
import PerformanceEvaluation from './pages/PerformanceEvaluation';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './AuthContext';
import { GOALS as INITIAL_GOALS } from './constants';
import { Operator, Role, TeamGoals } from './types';
import { useOperatorsData } from './useOperatorsData';

// Componente Layout Protegido
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Componente App Principal (Interno)
const AppContent: React.FC = () => {
  const { user, userRole, userProfile, isAdmin, logout, supabase } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const {
    operators,
    setOperators,
    goals,
    isDataLoading,
    systemError,
    handleUpdateGoals
  } = useOperatorsData(supabase, user, userProfile, isAdmin);

  // Função para atualizar operadores (Enviando para Supabase)
  const handleUpdateOperators = useCallback(async (newOpsOrFn: Operator[] | ((prev: Operator[]) => Operator[])) => {
    let updatedOps: Operator[];
    let oldOps = operators;

    if (typeof newOpsOrFn === 'function') {
      updatedOps = newOpsOrFn(operators);
    } else {
      updatedOps = newOpsOrFn;
    }

    setOperators(updatedOps);

    if (supabase && updatedOps.length > 0) {
      try {
        if (isAdmin) {
          const { error } = await supabase.from('operators').upsert(updatedOps, { onConflict: 'registration' });
          if (error) throw error;
        } else {
          const myRecord = updatedOps.find(op => op.user_id === user?.id);
          if (myRecord && user?.id) {
            const { error } = await supabase
              .from('operators')
              .update(myRecord)
              .eq('user_id', user.id);

            if (error) {
              console.error("Erro ao salvar dados do operador:", JSON.stringify(error, null, 2));
              alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
              setOperators(oldOps); // Reverte em caso de erro
            }
          }
        }
      } catch (e: any) {
        console.error("Erro de sincronização:", e);
        setOperators(oldOps); // Reverte
        alert(`Erro ao sincronizar dados: ${e.message}`);
      }
    }
  }, [operators, supabase, isAdmin, user]);

  // Função OTIMIZADA para atualizar um ÚNICO operador (Evita timeout)
  const handleSaveOperator = useCallback(async (updatedOperator: Operator) => {
    // 1. Atualização Otimista Local
    setOperators(prev => prev.map(op => op.registration === updatedOperator.registration ? updatedOperator : op));

    // 2. Salvar no Supabase (Apenas o registro modificado)
    if (supabase) {
      try {
        console.log("Tentando salvar operador:", updatedOperator.registration);

        // Garantir que os campos JSON não sejam undefined (o que o Supabase pode rejeitar ou ignorar)
        const payload = {
          ...updatedOperator,
          kpis: updatedOperator.kpis || [],
          feedbacks: updatedOperator.feedbacks || [],
          documents: updatedOperator.documents || []
        };

        const { data, error } = await supabase
          .from('operators')
          .upsert(payload, { onConflict: 'registration' })
          .select();

        if (error) {
          console.error("ERRO CRÍTICO AO SALVAR NO SUPABASE:", error);
          alert(`Erro ao salvar alterações: ${error.message || JSON.stringify(error)}`);

          // Reverter em caso de erro (busca do servidor)
          const { data: serverData } = await supabase.from('operators').select('*').eq('registration', updatedOperator.registration).single();
          if (serverData) {
            console.log("Revertendo para dados do servidor:", serverData);
            setOperators(prev => prev.map(op => op.registration === updatedOperator.registration ? { ...serverData, kpis: serverData.kpis || [], feedbacks: serverData.feedbacks || [], documents: serverData.documents || [] } : op));
          }
        } else {
          console.log("Sucesso ao salvar no Supabase:", data);
        }
      } catch (err: any) {
        console.error("EXCEÇÃO NÃO TRATADA AO SALVAR:", err);
        alert(`Erro de conexão fatal: ${err.message}`);
      }
    } else {
      console.warn("Supabase client não disponível para salvar.");
    }
  }, [supabase]);

  const unreadCount = operators.reduce((acc, op) => {
    const opUnread = op.feedbacks?.filter(f => f.operatorResponse && f.isRead === false).length || 0;
    return acc + opUnread;
  }, 0);

  const pendingCount = operators.filter(o => o.active && (!o.kpis || o.kpis.length === 0)).length;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Overlay para fechar menu no mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Dinâmica */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transform transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 flex flex-col h-full overflow-hidden">
          <div className={`flex items-center gap-3 mb-10 ${isSidebarCollapsed ? 'justify-center pl-0' : 'pl-2'}`}>
            <ShieldCheck className="text-blue-500 shrink-0" size={32} />
            {!isSidebarCollapsed && (
              <div className="animate-in fade-in duration-300">
                <h1 className="font-bold text-lg leading-tight whitespace-nowrap">Central 156</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {isAdmin ? 'Módulo Supervisor' : 'Módulo Operador'}
                </p>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1">
            {/* Links Comuns */}
            <Link to="/" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors group relative ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Dashboard' : ''}>
              <LayoutDashboard size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Dashboard</span>}
            </Link>

            {/* Links Exclusivos Supervisor */}
            {isAdmin && (
              <>
                <Link to="/operators" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors group relative ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Equipe' : ''}>
                  <Users size={20} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Equipe</span>}
                  {unreadCount > 0 && (
                    <span className={`flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] ${isSidebarCollapsed ? 'absolute top-2 right-2' : 'ml-auto'}`}></span>
                  )}
                </Link>

                <Link to="/evaluation" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors group relative ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Avaliação de Desempenho' : ''}>
                  <ClipboardCheck size={20} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Avaliação de Desempenho</span>}
                </Link>

                <Link to="/indicators" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors group relative ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Indicadores Consolidados' : ''}>
                  <TrendingUp size={20} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Indicadores Consolidados</span>}
                </Link>

                <Link to="/pending" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors group relative ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Pendências' : ''}>
                  <AlertCircle size={20} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="animate-in fade-in duration-300 font-medium">Pendências</span>}
                  {pendingCount > 0 && (
                    <span className={`bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isSidebarCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}`}>
                      {pendingCount}
                    </span>
                  )}
                </Link>

                <Link to="/settings" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors group relative ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Configurações' : ''}>
                  <Settings size={20} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Configurações</span>}
                </Link>
              </>
            )}

            {/* Links Exclusivos Operador */}
            {!isAdmin && (
              <Link to="/my-profile" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors group relative ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Meus Indicadores' : ''}>
                <UserCircle size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Meus Indicadores</span>}
              </Link>
            )}
          </nav>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`hidden lg:flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors w-full ${isSidebarCollapsed ? 'justify-center' : ''}`}
              title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            >
              {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              {!isSidebarCollapsed && <span className="text-sm font-medium">Recolher Menu</span>}
            </button>

            <button onClick={logout} className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors w-full ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Sair do Sistema' : ''}>
              <LogOut size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="text-sm font-medium">Sair do Sistema</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2"><Menu size={24} /></button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-900">
                {/* Prioriza nome do perfil carregado, depois metadata, depois email */}
                {userProfile?.name || user?.user_metadata?.name || user?.email || 'Usuário'}
              </p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{userRole}</p>
            </div>
            <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
              {userProfile?.name ? userProfile.name.charAt(0) : (user?.email?.charAt(0).toUpperCase() || 'U')}
            </div>
          </div>
        </header>

        {/* Alerta de Erro de Sistema (DB) */}
        {systemError && (
          <div className="bg-red-50 border-b border-red-200 p-4">
            <div className="flex items-start gap-3 max-w-6xl mx-auto">
              <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-800">{systemError.title}</h3>
                <p className="text-sm text-red-600 mt-1">{systemError.msg}</p>
                {systemError.fix && (
                  <div className="mt-3">
                    <div className="bg-red-100 p-3 rounded-lg border border-red-200 font-mono text-[10px] text-red-900 overflow-x-auto max-h-64 custom-scrollbar">
                      <pre>{systemError.fix}</pre>
                    </div>
                    <p className="text-[10px] text-red-500 mt-1 font-bold">
                      Copie o código acima e execute no SQL Editor do Supabase para corrigir as políticas de segurança.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-4 lg:p-8 flex-1 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Dashboard operators={operators} goals={goals} />} />

            {/* Rotas Supervisor */}
            {isAdmin && (
              <>
                <Route path="/operators" element={<OperatorsList operators={operators} onUpdate={handleUpdateOperators} onSaveOperator={handleSaveOperator} userRole={userRole!} />} />
                <Route path="/operator/:id" element={<OperatorDetail operators={operators} onUpdate={handleUpdateOperators} onSaveOperator={handleSaveOperator} userRole={userRole!} goals={goals} />} />
                <Route path="/indicators" element={<Indicators operators={operators} goals={goals} userRole={userRole!} />} />
                <Route path="/pending" element={<PendingIndicators operators={operators} onUpdate={handleUpdateOperators} userRole={userRole!} />} />
                <Route path="/settings" element={<SettingsPage goals={goals} onUpdateGoals={handleUpdateGoals} cloudConfig={null} onUpdateCloudConfig={() => { }} />} />
                <Route path="/evaluation" element={<PerformanceEvaluation operators={operators} goals={goals} userRole={userRole!} />} />
              </>
            )}

            {/* Rotas Operador */}
            {!isAdmin && (
              <>
                <Route path="/my-profile" element={<OperatorDetail operators={operators} onUpdate={handleUpdateOperators} onSaveOperator={handleSaveOperator} userRole={userRole!} goals={goals} />} />
                <Route path="/operator/:id" element={<OperatorDetail operators={operators} onUpdate={handleUpdateOperators} onSaveOperator={handleSaveOperator} userRole={userRole!} goals={goals} />} />
              </>
            )}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedLayout>
                <AppContent />
              </ProtectedLayout>
            }
          />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;