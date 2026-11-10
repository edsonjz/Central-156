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
  ChevronRight,
  Target
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import OperatorsList from './pages/OperatorsList';
import OperatorDetail from './pages/OperatorDetail';
import Indicators from './pages/Indicators';
// Removed TvMode import
import SettingsPage from './pages/Settings';
import PendingIndicators from './pages/PendingIndicators';
import PerformanceEvaluation from './pages/PerformanceEvaluation';
import PdiManagement from './pages/PdiManagement';
import MyPdi from './pages/MyPdi';
import Login from './pages/Login';
import { PdiNotificationBell } from './components/pdi/PdiNotificationBell';
import { PdiToast } from './components/pdi/PdiToast';
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

  // Função para atualizar operadores (Enviando para Supabase apenas registros novos/alterados)
  const handleUpdateOperators = useCallback(async (newOpsOrFn: Operator[] | ((prev: Operator[]) => Operator[])) => {
    let updatedOps: Operator[];
    const oldOps = operators;

    if (typeof newOpsOrFn === 'function') {
      updatedOps = newOpsOrFn(operators);
    } else {
      updatedOps = newOpsOrFn;
    }

    setOperators(updatedOps);

    // Se foi apenas remoção de operador, a exclusão no banco já é feita diretamente pelo chamador
    if (updatedOps.length < oldOps.length) {
      return;
    }

    // Identifica apenas os operadores que foram adicionados ou modificados
    const changedOps = updatedOps.filter(newOp => {
      const oldOp = oldOps.find(o => String(o.registration).trim() === String(newOp.registration).trim());
      return !oldOp || JSON.stringify(oldOp) !== JSON.stringify(newOp);
    });

    if (supabase && changedOps.length > 0) {
      try {
        if (isAdmin) {
          for (const op of changedOps) {
            const oldOp = oldOps.find(o => String(o.registration).trim() === String(op.registration).trim());
            const payload: any = {
              ...op,
              registration: String(op.registration).trim(),
              kpis: op.kpis || [],
              feedbacks: op.feedbacks || []
            };
            if (oldOp && oldOp.documents === op.documents) {
              delete payload.documents;
            } else {
              payload.documents = op.documents || [];
            }
            if (oldOp && oldOp.photoUrl === op.photoUrl) {
              delete payload.photoUrl;
            }

            const { error } = await supabase
              .from('operators')
              .upsert(payload, { onConflict: 'registration' });
            if (error) throw error;
          }
        } else {
          const myRecord = changedOps.find(op => op.user_id === user?.id || String(op.registration).trim() === String(userProfile?.registration).trim());
          if (myRecord && user?.id) {
            const payload: any = { ...myRecord };
            delete payload.documents;
            delete payload.photoUrl;

            const { error } = await supabase
              .from('operators')
              .update(payload)
              .eq('user_id', user.id);

            if (error) {
              console.error("Erro ao salvar dados do operador:", JSON.stringify(error, null, 2));
              alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
              setOperators(oldOps);
            }
          }
        }
      } catch (e: any) {
        console.error("Erro de sincronização:", e);
        setOperators(oldOps);
        alert(`Erro ao sincronizar dados: ${e.message}`);
      }
    }
  }, [operators, supabase, isAdmin, user, userProfile]);

  // Função OTIMIZADA para atualizar um ÚNICO operador (Evita timeout)
  const handleSaveOperator = useCallback(async (updatedOperator: Operator) => {
    const cleanReg = String(updatedOperator.registration).trim();
    const normalizedUpdated: Operator = {
      ...updatedOperator,
      registration: cleanReg
    };

    // 1. Atualização Otimista Local (atualiza se existir, ou adiciona se for novo)
    setOperators(prev => {
      const exists = prev.some(op => String(op.registration).trim() === cleanReg);
      if (exists) {
        return prev.map(op => String(op.registration).trim() === cleanReg ? normalizedUpdated : op);
      }
      return [...prev, normalizedUpdated].sort((a, b) => a.name.localeCompare(b.name));
    });

    // 2. Salvar no Supabase (Apenas o registro modificado e campos alterados)
    if (supabase) {
      try {
        console.log("Tentando salvar operador:", cleanReg);

        const currentOp = operators.find(op => String(op.registration).trim() === cleanReg);
        const payload: any = { ...normalizedUpdated };

        // OTIMIZAÇÃO CRÍTICA: Remover colunas pesadas (Base64) que não foram alteradas
        if (currentOp && currentOp.documents === normalizedUpdated.documents) {
          delete payload.documents;
        }
        if (currentOp && currentOp.photoUrl === normalizedUpdated.photoUrl) {
          delete payload.photoUrl;
        }
        if (currentOp && currentOp.feedbacks === normalizedUpdated.feedbacks) {
          delete payload.feedbacks;
        }
        if (currentOp && currentOp.kpis === normalizedUpdated.kpis) {
          delete payload.kpis;
        }

        if (payload.kpis !== undefined) payload.kpis = payload.kpis || [];
        if (payload.feedbacks !== undefined) payload.feedbacks = payload.feedbacks || [];
        if (payload.documents !== undefined) payload.documents = payload.documents || [];

        // Usamos UPDATE e selecionamos apenas 'registration' para não trafegar Base64 de volta
        let { data, error } = await supabase
          .from('operators')
          .update(payload)
          .eq('registration', cleanReg)
          .select('registration');

        // Fallback: se o operador ainda não existia na tabela public.operators (0 linhas afetadas), fazemos UPSERT
        if (!error && (!data || data.length === 0)) {
          console.log("Operador ainda não existia no banco. Realizando upsert completo:", cleanReg);
          const upsertPayload = {
            ...normalizedUpdated,
            kpis: normalizedUpdated.kpis || [],
            feedbacks: normalizedUpdated.feedbacks || [],
            documents: normalizedUpdated.documents || []
          };
          const upsertRes = await supabase
            .from('operators')
            .upsert(upsertPayload, { onConflict: 'registration' })
            .select('registration');
          data = upsertRes.data;
          error = upsertRes.error;
        }

        if (error) {
          console.error("ERRO CRÍTICO AO SALVAR NO SUPABASE:", error);
          alert(`Erro ao salvar alterações: ${error.message || JSON.stringify(error)}`);

          // Reverter em caso de erro (busca versão leve do servidor)
          const { data: serverData } = await supabase
            .from('operators')
            .select('user_id, registration, name, admissionDate, role, linkType, costCenter, classification, workMode, birthDate, photoUrl, active, kpis, feedbacks')
            .eq('registration', cleanReg)
            .maybeSingle();
          if (serverData) {
            setOperators(prev => prev.map(op => String(op.registration).trim() === cleanReg ? {
              ...serverData,
              registration: String(serverData.registration).trim(),
              kpis: serverData.kpis || [],
              feedbacks: serverData.feedbacks || [],
              documents: op.documents || []
            } : op));
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
  }, [supabase, operators]);

  const unreadCount = operators.reduce((acc, op) => {
    const opUnread = op.feedbacks?.filter(f => f.operatorResponse && f.isRead === false).length || 0;
    return acc + opUnread;
  }, 0);

  const pendingCount = operators.filter(o => o.active && (!o.kpis || o.kpis.length === 0)).length;

  const location = useLocation();

  const isNavActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Overlay para fechar menu no mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in-up"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Dinâmica */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-950 text-white transform transition-all duration-300 ease-in-out border-r border-slate-800/80 shadow-2xl lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 flex flex-col h-full overflow-hidden">
          
          {/* Logo Header */}
          <div className={`flex items-center gap-3 mb-8 pt-2 ${isSidebarCollapsed ? 'justify-center pl-0' : 'pl-2'}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0 ring-2 ring-blue-500/20">
              <ShieldCheck size={22} strokeWidth={2.3} />
            </div>
            {!isSidebarCollapsed && (
              <div className="animate-fade-in-up">
                <h1 className="font-extrabold text-base leading-tight tracking-tight text-white">Central 156</h1>
                <span className="inline-block text-[9px] text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 mt-0.5">
                  {isAdmin ? 'Módulo Supervisor' : 'Módulo Operador'}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar-dark pr-1">
            {/* Links Comuns */}
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${isNavActive('/') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25' : 'text-slate-400 hover:text-white hover:bg-slate-900'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
              title={isSidebarCollapsed ? 'Dashboard' : ''}
            >
              <LayoutDashboard size={19} className="shrink-0" />
              {!isSidebarCollapsed && <span className="text-sm">Dashboard</span>}
            </Link>

            {/* Links Exclusivos Supervisor */}
            {isAdmin && (
              <>
                <Link
                  to="/operators"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${isNavActive('/operators') || isNavActive('/operator/') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25' : 'text-slate-400 hover:text-white hover:bg-slate-900'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={isSidebarCollapsed ? 'Equipe' : ''}
                >
                  <Users size={19} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="text-sm">Equipe</span>}
                  {unreadCount > 0 && (
                    <span className={`flex h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] ${isSidebarCollapsed ? 'absolute top-2 right-2' : 'ml-auto'}`}></span>
                  )}
                </Link>

                <Link
                  to="/evaluation"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${isNavActive('/evaluation') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25' : 'text-slate-400 hover:text-white hover:bg-slate-900'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={isSidebarCollapsed ? 'Avaliação de Desempenho' : ''}
                >
                  <ClipboardCheck size={19} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="text-sm">Avaliação 90°</span>}
                </Link>

                <Link
                  to="/pdi"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${isNavActive('/pdi') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25' : 'text-slate-400 hover:text-white hover:bg-slate-900'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={isSidebarCollapsed ? 'PDI 360°' : ''}
                >
                  <Target size={19} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="text-sm">PDI 360°</span>}
                </Link>

                <Link
                  to="/indicators"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${isNavActive('/indicators') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25' : 'text-slate-400 hover:text-white hover:bg-slate-900'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={isSidebarCollapsed ? 'Indicadores Consolidados' : ''}
                >
                  <TrendingUp size={19} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="text-sm">Indicadores</span>}
                </Link>

                <Link
                  to="/pending"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${isNavActive('/pending') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25' : 'text-slate-400 hover:text-white hover:bg-slate-900'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={isSidebarCollapsed ? 'Pendências' : ''}
                >
                  <AlertCircle size={19} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="text-sm">Pendências</span>}
                  {pendingCount > 0 && (
                    <span className={`bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm shadow-rose-500/40 ${isSidebarCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}`}>
                      {pendingCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${isNavActive('/settings') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25' : 'text-slate-400 hover:text-white hover:bg-slate-900'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={isSidebarCollapsed ? 'Configurações' : ''}
                >
                  <Settings size={19} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="text-sm">Configurações</span>}
                </Link>
              </>
            )}

            {/* Links Exclusivos Operador */}
            {!isAdmin && (
              <>
                <Link
                  to="/my-pdi"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${isNavActive('/my-pdi') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25' : 'text-slate-400 hover:text-white hover:bg-slate-900'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={isSidebarCollapsed ? 'Meu PDI 360°' : ''}
                >
                  <Target size={19} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="text-sm">Meu PDI 360°</span>}
                </Link>

                <Link
                  to="/my-profile"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${isNavActive('/my-profile') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25' : 'text-slate-400 hover:text-white hover:bg-slate-900'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={isSidebarCollapsed ? 'Meus Indicadores' : ''}
                >
                  <UserCircle size={19} className="shrink-0" />
                  {!isSidebarCollapsed && <span className="text-sm">Meus Indicadores</span>}
                </Link>
              </>
            )}
          </nav>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-slate-800/80 space-y-1.5">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`hidden lg:flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white transition-colors w-full ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
              title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            >
              {isSidebarCollapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
              {!isSidebarCollapsed && <span className="text-xs font-semibold">Recolher Menu</span>}
            </button>

            <button
              onClick={logout}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors w-full ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
              title={isSidebarCollapsed ? 'Sair do Sistema' : ''}
            >
              <LogOut size={19} className="shrink-0" />
              {!isSidebarCollapsed && <span className="text-xs font-semibold">Sair do Sistema</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        
        {/* Header Superior Glassmorphism */}
        <header className="h-16 glass-panel sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 border-b border-slate-200/80">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Menu size={22} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="font-semibold text-slate-800">Central 156</span>
              <span>/</span>
              <span className="capitalize">
                {location.pathname === '/' ? 'Dashboard' : location.pathname.replace('/', '').replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Sino de Notificações / Alertas de PDI */}
            <PdiNotificationBell 
              supabase={supabase}
              userRole={isAdmin ? 'Supervisor' : 'Operador'}
              operatorRegistration={userProfile?.registration}
            />

            <div className="w-px h-6 bg-slate-200" />

            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {userProfile?.name || user?.user_metadata?.name || user?.email || 'Usuário'}
              </p>
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
                {userRole || 'Operador'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-blue-500/20 ring-2 ring-white">
              {userProfile?.name ? userProfile.name.charAt(0) : (user?.email?.charAt(0).toUpperCase() || 'U')}
            </div>
          </div>
        </header>

        {/* Alerta de Erro de Sistema (DB) */}
        {systemError && (
          <div className="bg-rose-50/90 border-b border-rose-200/80 p-4">
            <div className="flex items-start gap-3 max-w-6xl mx-auto">
              <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
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
                <Route path="/operator/:id" element={<OperatorDetail operators={operators} onUpdate={handleUpdateOperators} onSaveOperator={handleSaveOperator} userRole={userRole!} goals={goals} isDataLoading={isDataLoading} />} />
                <Route path="/indicators" element={<Indicators operators={operators} goals={goals} userRole={userRole!} />} />
                <Route path="/pending" element={<PendingIndicators operators={operators} onUpdate={handleUpdateOperators} userRole={userRole!} />} />
                <Route path="/settings" element={<SettingsPage goals={goals} onUpdateGoals={handleUpdateGoals} cloudConfig={null} onUpdateCloudConfig={() => { }} />} />
                <Route path="/evaluation" element={<PerformanceEvaluation operators={operators} goals={goals} userRole={userRole!} />} />
                <Route path="/pdi" element={<PdiManagement operators={operators} />} />
              </>
            )}

            {/* Rotas Operador */}
            {!isAdmin && (
              <>
                <Route path="/my-pdi" element={<MyPdi operators={operators} />} />
                <Route path="/my-profile" element={<OperatorDetail operators={operators} onUpdate={handleUpdateOperators} onSaveOperator={handleSaveOperator} userRole={userRole!} goals={goals} isDataLoading={isDataLoading} />} />
                <Route path="/operator/:id" element={<OperatorDetail operators={operators} onUpdate={handleUpdateOperators} onSaveOperator={handleSaveOperator} userRole={userRole!} goals={goals} isDataLoading={isDataLoading} />} />
              </>
            )}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Toast Flutuante de Alertas de PDI */}
        <PdiToast />
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