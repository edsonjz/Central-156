import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Role, Operator, CloudConfig, LinkType, WorkMode, OperatorClassification } from './types';
import { generateSystemEmail } from './utils';
import { INITIAL_OPERATORS } from './constants';

// Configuração Padrão (Usa variáveis de ambiente se disponíveis, senão fallback para desenvolvimento)
const DEFAULT_CLOUD_CONFIG: CloudConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://wdeyalyeodicquajiywy.supabase.co',
  key: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tQ-XWwcY5z47f2NBJWkQWw_seUu03uP',
  enabled: true
};

interface AuthContextType {
  user: User | null;
  session: any | null;
  userRole: Role | null; // Role derivada do banco de dados
  userProfile: Operator | null; // Dados do operador logado
  isLoading: boolean;
  supabase: SupabaseClient | null;
  login: (identifier: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  createOperatorAccount: (email: string, password: string, metaData: any) => Promise<{ data: any; error: any }>;
  updateOperatorPassword: (userId: string, newPassword: string) => Promise<{ error: any }>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userProfile, setUserProfile] = useState<Operator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  // Ref para evitar fetch duplicado de profile (getSession + onAuthStateChange ambos disparam)
  const profileFetchedForUser = useRef<string | null>(null);

  // Inicializa Supabase Principal
  useEffect(() => {
    try {
      const client = createClient(DEFAULT_CLOUD_CONFIG.url, DEFAULT_CLOUD_CONFIG.key);
      setSupabaseClient(client);
    } catch (e) {
      console.error("Erro ao inicializar Supabase Client:", e);
    }
  }, []);

  // Monitora estado da sessão
  useEffect(() => {
    if (!supabaseClient) return;

    // Verificar sessão atual
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Escutar mudanças
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        profileFetchedForUser.current = null;
        setUserRole(null);
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  const fetchUserProfile = async (currentUser: User) => {
    if (!supabaseClient) return;

    // OTIMIZAÇÃO: Evitar fetch duplicado para o mesmo usuário
    // (getSession e onAuthStateChange podem ambos disparar fetchUserProfile)
    if (profileFetchedForUser.current === currentUser.id) {
      console.log('[AuthContext] Profile already fetched for user:', currentUser.id);
      return;
    }
    profileFetchedForUser.current = currentUser.id;
    setIsLoading(true);

    const LIGHT_COLS = 'user_id, registration, name, admissionDate, role, linkType, costCenter, classification, workMode, birthDate, photoUrl, active, kpis, feedbacks';

    // 1. Tenta busca padrão pelo user_id (sem documentos pesados para evitar timeout)
    const { data, error } = await supabaseClient
      .from('operators')
      .select(LIGHT_COLS)
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (data && !error) {
      // Cenário Perfeito: Vínculo já existe
      const normalizedData: Operator = {
        ...data,
        registration: String(data.registration).trim(),
        kpis: data.kpis || [],
        feedbacks: data.feedbacks || [],
        documents: (data as any).documents || [],
        active: data.active ?? true
      };
      setUserProfile(normalizedData);
      const role = data.role === 'Supervisor' ? Role.SUPERVISOR : Role.OPERATOR;
      setUserRole(role);
      setIsLoading(false);
      return;
    }

    // 2. Cenário de Falha de Vínculo (Comum em contas criadas separadamente)
    // Tenta recuperar a matrícula através de user_metadata ou padrão de e-mail
    const email = currentUser.email || '';
    let potentialRegistration = currentUser.user_metadata?.registration
      ? String(currentUser.user_metadata.registration).trim()
      : '';

    if (!potentialRegistration) {
      // Tenta extrair matrícula de e-mails padrão op12345@... ou 12345@...
      const match = email.match(/^(?:op)?([a-zA-Z0-9]+)@/);
      if (match) {
        potentialRegistration = match[1].trim();
      } else if (!email.includes('@')) {
        potentialRegistration = email.trim();
      }
    }

    if (potentialRegistration) {
      // Tenta atualizar o vínculo diretamente (caso RLS permita update por matrícula)
      await supabaseClient
        .from('operators')
        .update({ user_id: currentUser.id })
        .eq('registration', potentialRegistration);

      // Busca na tabela pela Matrícula (Registration) ou pelo user_id recém vinculado
      const { data: regData } = await supabaseClient
        .from('operators')
        .select(LIGHT_COLS)
        .or(`registration.eq.${potentialRegistration},user_id.eq.${currentUser.id}`)
        .maybeSingle();

      if (regData) {
        console.log("Vínculo encontrado por matrícula. Atualizando user_id...");
        if (regData.user_id !== currentUser.id) {
          await supabaseClient
            .from('operators')
            .update({ user_id: currentUser.id })
            .eq('registration', potentialRegistration);
        }

        const normalizedReg: Operator = {
          ...regData,
          user_id: currentUser.id,
          registration: String(regData.registration).trim(),
          kpis: regData.kpis || [],
          feedbacks: regData.feedbacks || [],
          documents: (regData as any).documents || [],
          active: regData.active ?? true
        };
        setUserProfile(normalizedReg);
        const role = regData.role === 'Supervisor' ? Role.SUPERVISOR : Role.OPERATOR;
        setUserRole(role);
        setIsLoading(false);
        return;
      }
    }

    // 3. Fallback Final: Verifica se é Admin pelo email ou metadados
    const isSystemEmail = email.includes('@example.com') ||
      email.includes('@sistema156.com') ||
      email.includes('@operadores.sistema.local');

    if (!isSystemEmail && email && currentUser.user_metadata?.role !== 'Operador') {
      // É Supervisor (Admin) sem registro na tabela operators
      setUserRole(Role.SUPERVISOR);

      setUserProfile({
        name: currentUser.user_metadata?.name || 'Administrador',
        registration: 'SUPERVISOR',
        role: 'Supervisor',
        user_id: currentUser.id,
        active: true,
        kpis: [],
        feedbacks: [],
        documents: [],
        linkType: LinkType.EFETIVO,
        workMode: WorkMode.PRESENTIAL,
        costCenter: 'ADM',
        admissionDate: new Date().toLocaleDateString('pt-BR'),
        birthDate: ''
      });
    } else {
      // Operador autenticado cujo registro no banco está com user_id pendente de vínculo (bloqueado por RLS)
      // ou ainda não inserido na tabela public.operators. Construímos perfil completo para nunca quebrar a tela.
      console.warn("Construindo perfil de fallback para operador:", potentialRegistration || email);
      const initialMatch = INITIAL_OPERATORS.find(
        o => String(o.registration).trim() === String(potentialRegistration).trim()
      );

      const fallbackProfile: Operator = {
        registration: potentialRegistration || initialMatch?.registration || currentUser.id.slice(0, 8),
        name: currentUser.user_metadata?.name || initialMatch?.name || 'Colaborador',
        admissionDate: initialMatch?.admissionDate || new Date().toLocaleDateString('pt-BR'),
        role: currentUser.user_metadata?.role || initialMatch?.role || 'Operador',
        linkType: initialMatch?.linkType || LinkType.EFETIVO,
        costCenter: initialMatch?.costCenter || 'CENTRAL 156',
        classification: initialMatch?.classification || OperatorClassification.OUTROS,
        workMode: initialMatch?.workMode || WorkMode.PRESENTIAL,
        birthDate: initialMatch?.birthDate || '',
        user_id: currentUser.id,
        active: initialMatch?.active ?? true,
        kpis: initialMatch?.kpis || [],
        feedbacks: initialMatch?.feedbacks || [],
        documents: initialMatch?.documents || []
      };

      setUserRole(Role.OPERATOR);
      setUserProfile(fallbackProfile);
    }
    setIsLoading(false);
  };

  const login = async (identifier: string, password: string) => {
    if (!supabaseClient) return { error: 'Cliente não inicializado' };

    const cleanIdentifier = identifier.trim().toLowerCase();
    let email = cleanIdentifier;

    // Regra de negócio:
    // Se NÃO contém '@', assume que é Matrícula de Operador e converte para e-mail técnico.
    if (!cleanIdentifier.includes('@')) {
      email = generateSystemEmail(cleanIdentifier);
    }

    console.log(`Tentando login para: ${email}`);

    let { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    // --- FALLBACK LOGIC ---
    // Se falhar o login com o novo padrão, e for matrícula, tenta padrões antigos
    if (error && !identifier.includes('@')) {
      const fallbacks = [
        `op${cleanIdentifier}@sistema156.com`, // Formato anterior
        `${cleanIdentifier}@operadores.sistema.local`, // Formato original
        `${cleanIdentifier}@example.com` // Sem o prefixo 'op'
      ];

      for (const fallbackEmail of fallbacks) {
        const { data: retryData, error: retryError } = await supabaseClient.auth.signInWithPassword({
          email: fallbackEmail,
          password
        });

        if (!retryError && retryData.user) {
          return { data: retryData, error: null };
        }
      }
    }

    return { data, error };
  };

  const logout = async () => {
    if (!supabaseClient) return;
    profileFetchedForUser.current = null;
    await supabaseClient.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserProfile(null);
  };

  // --- NOVA FUNÇÃO: Criar Conta sem Logar ---
  // Cria um cliente temporário que NÃO persiste a sessão, evitando trocar o usuário atual
  const createOperatorAccount = async (email: string, password: string, metaData: any) => {
    try {
      const tempClient = createClient(DEFAULT_CLOUD_CONFIG.url, DEFAULT_CLOUD_CONFIG.key, {
        auth: {
          persistSession: false, // CRÍTICO: Não salvar no localStorage
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      const signUpRes = await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: metaData
        }
      });

      // Self-Healing: Se a conta já existe no Auth mas estava sem vínculo user_id na tabela operators,
      // tentamos autenticar no cliente isolado para recuperar o user.id e refazer o vínculo automaticamente.
      if (signUpRes.error && String(signUpRes.error.message || '').toLowerCase().includes('already registered')) {
        for (const candidatePassword of [password, '123456']) {
          const signInRes = await tempClient.auth.signInWithPassword({
            email,
            password: candidatePassword
          });
          if (!signInRes.error && signInRes.data?.user) {
            return { data: signInRes.data, error: null };
          }
        }
      }

      return signUpRes;
    } catch (e: any) {
      return { data: null, error: e };
    }
  };

  const updateOperatorPassword = async (userId: string, newPassword: string) => {
    if (!supabaseClient) return { error: { message: 'Cliente não inicializado' } };

    // Chama Edge Function para atualizar senha (Requer Service Role no Backend)
    const { data, error } = await supabaseClient.functions.invoke('update-user-password', {
      body: { userId, newPassword }
    });

    return { data, error };
  };

  const isAdmin = userRole === Role.SUPERVISOR;

  const value = React.useMemo(() => ({
    user,
    session,
    userRole,
    userProfile,
    isLoading,
    supabase: supabaseClient,
    login, // Note: Function references change on render, consider wrapping in useCallback if further opt needed
    logout,
    createOperatorAccount,
    updateOperatorPassword,
    isAdmin
  }), [user, session, userRole, userProfile, isLoading, supabaseClient, isAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);