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
  AlertTriangle
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import OperatorsList from './pages/OperatorsList';
import OperatorDetail from './pages/OperatorDetail';
import Indicators from './pages/Indicators';
import TvMode from './pages/TvMode';
import SettingsPage from './pages/Settings';
import PendingIndicators from './pages/PendingIndicators';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './AuthContext';
import { INITIAL_OPERATORS, GOALS as INITIAL_GOALS } from './constants';
import { Operator, Role, TeamGoals } from './types';

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
  const [operators, setOperators] = useState<Operator[]>([]);
  const [goals, setGoals] = useState<TeamGoals>(INITIAL_GOALS);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [systemError, setSystemError] = useState<{ title: string, msg: string, fix?: string } | null>(null);

  // Carregar dados (Respeitando RLS via Supabase)
  useEffect(() => {
    const loadData = async () => {
      if (!supabase || !user) return;
      setIsDataLoading(true);
      setSystemError(null);

      try {
        // 1. Carregar Operadores (RLS vai filtrar automaticamente)
        const { data: opsData, error: opsError } = await supabase
          .from('operators')
          .select('*')
          .order('name');

        let loadedOps: Operator[] = [];

        if (!opsError && opsData) {
          // Sanitização para garantir que arrays existam mesmo se o JSON for null
          loadedOps = opsData.map((op: any) => ({
            ...op,
            kpis: op.kpis || [],
            feedbacks: op.feedbacks || [],
            documents: op.documents || [],
            active: op.active ?? true
          }));
        }

        // Fallback Crítico: Se RLS retornou vazio, mas temos um perfil carregado no Context (via auto-link), usamos ele.
        // Isso resolve o problema de tela branca logo após o primeiro login do operador.
        if ((!loadedOps || loadedOps.length === 0) && userProfile && !isAdmin) {
          loadedOps = [userProfile];
        }

        if (loadedOps.length > 0) {
          setOperators(loadedOps);
        } else if (opsError) {
          // Tratamento de Erros Específicos
          if (opsError?.code === '42P17') {
            // Recursão Infinita
            console.warn("Alerta: Recursão infinita detectada nas políticas RLS (42P17). Mostrando instrução de correção na UI.");
            setSystemError({
              title: "Erro Crítico: Recursão Infinita (RLS)",
              msg: "A política de segurança do banco entrou em loop infinito. Isso ocorre quando a política tenta ler a própria tabela ('operators') para verificar permissões.",
              fix: `-- SOLUÇÃO COMPLETA PARA ERRO 42P17 + Permissão para Operadores

-- 1. Limpeza Total
DROP FUNCTION IF EXISTS public.is_supervisor() CASCADE;

-- 2. Função de Segurança
CREATE OR REPLACE FUNCTION public.is_supervisor() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role = 'Supervisor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar Políticas da Tabela 'operators'
DROP POLICY IF EXISTS "Política de Leitura" ON operators;
CREATE POLICY "Política de Leitura" ON operators FOR SELECT
USING (
  user_id = auth.uid()            -- O próprio usuário lê seus dados
  OR is_supervisor()              -- Supervisor lê tudo
  OR (auth.jwt() ->> 'email') LIKE '%admin%' 
);

DROP POLICY IF EXISTS "Política de Escrita" ON operators;
CREATE POLICY "Política de Escrita" ON operators FOR ALL
USING (
  user_id = auth.uid()            -- O próprio usuário pode atualizar (ex: feedbacks)
  OR is_supervisor()              -- Supervisor edita
  OR (auth.jwt() ->> 'email') LIKE '%admin%'
);

-- 4. Recriar Políticas da Tabela 'config'
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura Pública" ON config;
CREATE POLICY "Leitura Pública" ON config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Escrita Supervisor" ON config;
CREATE POLICY "Escrita Supervisor" ON config FOR ALL USING (is_supervisor());
`
            });
          } else if (opsError?.code === '42P01') {
            console.warn("Alerta: Tabela 'operators' não encontrada.");
            setSystemError({
              title: "Tabela Inexistente",
              msg: "A tabela 'operators' não foi encontrada. Verifique se você rodou o script de criação do banco de dados."
            });
          } else {
            console.error("Erro ao carregar operadores (Supabase):", JSON.stringify(opsError, null, 2));
            // Fallback para dados locais se for erro de conexão
            setOperators(INITIAL_OPERATORS);
          }
        }

        // 2. Carregar Metas (Geralmente visível a todos ou público)
        const { data: goalsData, error: goalsError } = await supabase
          .from('config')
          .select('value')
          .eq('key', 'metas')
          .single();

        if (goalsData?.value) {
          setGoals(goalsData.value);
        }

      } catch (err) {
        console.error("Falha crítica no carregamento de dados:", err);
        setOperators(INITIAL_OPERATORS);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();

    // Subscription para atualizações em tempo real (Supabase Realtime)
    let channel: any;

    if (supabase && user) {
      channel = supabase
        .channel('operators-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Escuta INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'operators'
          },
          async (payload: any) => {
            console.log('Realtime Event received:', payload);

            if (payload.eventType === 'DELETE' && payload.old) {
              setOperators(prev => prev.filter(op => op.registration !== payload.old.registration));
              return;
            }

            // Para INSERT e UPDATE, buscamos o dado fresco do banco
            if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
              const reg = payload.new.registration;

              const { data: freshOp, error } = await supabase
                .from('operators')
                .select('*')
                .eq('registration', reg)
                .single();

              if (!error && freshOp) {
                const sanitizedOp = {
                  ...freshOp,
                  kpis: freshOp.kpis || [],
                  feedbacks: freshOp.feedbacks || [],
                  documents: freshOp.documents || [],
                  active: freshOp.active ?? true
                };

                setOperators(prev => {
                  const exists = prev.some(op => op.registration === reg);
                  if (exists) {
                    return prev.map(op => op.registration === reg ? sanitizedOp : op);
                  } else {
                    return [...prev, sanitizedOp].sort((a, b) => a.name.localeCompare(b.name));
                  }
                });
              }
            }
          }
        )
        .subscribe((status: string) => {
          console.log("Supabase Realtime Status:", status);
        });
    }

    // --- FALLBACK: Polling de segurança (a cada 5s) ---
    // Garante que, se o socket falhar, os dados ainda serão atualizados
    const intervalId = setInterval(() => {
      // Recarrega apenas se a aba estiver visível para economizar recursos
      if (document.visibilityState === 'visible') {
        supabase?.from('operators').select('*').order('name').then(({ data, error }) => {
          if (data && !error) {
            const loadedOps = data.map((op: any) => ({
              ...op,
              kpis: op.kpis || [],
              feedbacks: op.feedbacks || [],
              documents: op.documents || [],
              active: op.active ?? true
            }));
            // Atualização silenciosa (sem loading state)
            setOperators(current => {
              // Comparação simples para evitar re-renders desnecessários se possível, 
              // mas aqui focamos em garantir a atualização.
              // JSON.stringify é custoso, mas com dataset pequeno é aceitável para garantir sincronia.
              if (JSON.stringify(current) !== JSON.stringify(loadedOps)) {
                console.log("Polling: Dados atualizados detectados.");
                return loadedOps;
              }
              return current;
            });
          }
        });
      }
    }, 5000);

    return () => {
      if (channel) supabase?.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [supabase, user, userProfile]);

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
      const { error } = await supabase
        .from('operators')
        .upsert(updatedOperator, { onConflict: 'registration' });

      if (error) {
        console.error("Erro ao salvar operador individual:", error);
        alert(`Erro ao salvar alterações: ${error.message}`);
        // Reverter em caso de erro (busca do servidor)
        const { data } = await supabase.from('operators').select('*').eq('registration', updatedOperator.registration).single();
        if (data) {
          setOperators(prev => prev.map(op => op.registration === updatedOperator.registration ? { ...data, kpis: data.kpis || [], feedbacks: data.feedbacks || [], documents: data.documents || [] } : op));
        }
      }
    } catch (err: any) {
      console.error("Exceção ao salvar operador:", err);
      alert(`Erro de conexão: ${err.message}`);
    }
  }
}, [supabase]);

const unreadCount = operators.reduce((acc, op) => {
  const opUnread = op.feedbacks?.filter(f => f.operatorResponse && f.isRead === false).length || 0;
  return acc + opUnread;
}, 0);

const handleUpdateGoals = async (newGoals: TeamGoals) => {
  setGoals(newGoals);
  if (supabase && isAdmin) {
    await supabase.from('config').upsert({ key: 'metas', value: newGoals });
  }
};

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
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-10">
          <ShieldCheck className="text-blue-500" size={32} />
          <div>
            <h1 className="font-bold text-lg leading-tight">Central 156</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {isAdmin ? 'Módulo Supervisor' : 'Módulo Operador'}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {/* Links Comuns */}
          <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <LayoutDashboard size={20} /> Dashboard
          </Link>

          {/* Links Exclusivos Supervisor */}
          {isAdmin && (
            <>
              <Link to="/operators" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors relative">
                <Users size={20} /> Equipe
                {unreadCount > 0 && (
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                )}
              </Link>
              <Link to="/pending" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <AlertCircle size={20} /> Pendências
                {pendingCount > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{pendingCount}</span>}
              </Link>
              <Link to="/tv-mode" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <Monitor size={20} /> Modo TV
              </Link>
              <Link to="/settings" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <Settings size={20} /> Configurações
              </Link>
            </>
          )}

          {/* Links Exclusivos Operador */}
          {!isAdmin && (
            <Link to="/my-profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <UserCircle size={20} /> Meus Indicadores
            </Link>
          )}

          {/* Link Comum (Indicadores - com filtro interno) */}
          {isAdmin && (
            <Link to="/indicators" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <TrendingUp size={20} /> Indicadores Consolidados
            </Link>
          )}
        </nav>

        <div className="pt-6 border-t border-slate-800">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors w-full">
            <LogOut size={20} /> Sair do Sistema
          </button>
        </div>
      </div>
    </aside>

    {/* Conteúdo Principal */}
    <main className="flex-1 lg:ml-64 flex flex-col min-w-0">
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