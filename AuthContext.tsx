import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Role, Operator, CloudConfig, LinkType, WorkMode } from './types';
import { generateSystemEmail } from './utils';

// Configuração Padrão
const DEFAULT_CLOUD_CONFIG: CloudConfig = {
  url: 'https://wdeyalyeodicquajiywy.supabase.co',
  key: 'sb_publishable_tQ-XWwcY5z47f2NBJWkQWw_seUu03uP',
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
        setUserRole(null);
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  const fetchUserProfile = async (currentUser: User) => {
    if (!supabaseClient) return;
    
    // 1. Tenta busca padrão pelo user_id
    const { data, error } = await supabaseClient
      .from('operators')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    if (data && !error) {
      // Cenário Perfeito: Vínculo já existe
      setUserProfile(data);
      const role = data.role === 'Supervisor' ? Role.SUPERVISOR : Role.OPERATOR;
      setUserRole(role);
    } else {
      // 2. Cenário de Falha de Vínculo (Comum em contas criadas separadamente)
      // Tenta recuperar a matrícula através do padrão de e-mail 'opXXXXX@...'
      const email = currentUser.email || '';
      let potentialRegistration = '';

      // Tenta extrair matrícula de e-mails padrão op12345@...
      const match = email.match(/^op(\w+)@/);
      if (match) {
        potentialRegistration = match[1];
      } else if (!email.includes('@')) {
        // Fallback se o email for apenas a matrícula (caso raro no auth objeto)
        potentialRegistration = email;
      }

      if (potentialRegistration) {
        // Busca na tabela pela Matrícula (Registration)
        const { data: regData } = await supabaseClient
          .from('operators')
          .select('*')
          .eq('registration', potentialRegistration)
          .single();

        if (regData) {
          // ENCONTRADO! Vamos consertar o vínculo (Self-Healing)
          console.log("Vínculo encontrado por matrícula. Atualizando user_id...");
          
          await supabaseClient
            .from('operators')
            .update({ user_id: currentUser.id })
            .eq('registration', potentialRegistration);

          // Atualiza estado local com os dados encontrados
          setUserProfile(regData);
          const role = regData.role === 'Supervisor' ? Role.SUPERVISOR : Role.OPERATOR;
          setUserRole(role);
          setIsLoading(false);
          return;
        }
      }

      // 3. Fallback Final: Verifica se é Admin pelo email
      const isSystemEmail = email.includes('@example.com') ||
                            email.includes('@sistema156.com') || 
                            email.includes('@operadores.sistema.local');
      
      if (!isSystemEmail && email) {
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
         // Usuário logado mas sem perfil de dados encontrado
         console.warn("Usuário logado sem perfil de operador correspondente.");
         setUserRole(Role.OPERATOR);
      }
    }
    setIsLoading(false);
  };

  const login = async (identifier: string, password: string) => {
    if (!supabaseClient) return { error: 'Cliente não inicializado' };
    
    let email = identifier;
    
    // Regra de negócio:
    // Se NÃO contém '@', assume que é Matrícula de Operador e converte para e-mail técnico.
    if (!identifier.includes('@')) {
      email = generateSystemEmail(identifier);
    }
    
    let { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    // --- FALLBACK LOGIC ---
    // Se falhar o login com o novo padrão, e for matrícula, tenta padrões antigos
    if (error && !identifier.includes('@')) {
      const fallbacks = [
        `op${identifier}@sistema156.com`, // Formato anterior
        `${identifier}@operadores.sistema.local` // Formato original
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

      return await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: metaData
        }
      });
    } catch (e: any) {
      return { data: null, error: e };
    }
  };

  const isAdmin = userRole === Role.SUPERVISOR;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userRole, 
      userProfile, 
      isLoading, 
      supabase: supabaseClient,
      login, 
      logout,
      createOperatorAccount,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);