import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ShieldCheck, Loader2, User, Lock, ArrowRight, Sparkles } from 'lucide-react';

const Login: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redireciona automaticamente se o usuário já estiver logado (ou assim que logar)
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await login(identifier, password);

    if (error) {
      setError('Credenciais inválidas. Verifique os dados informados.');
      setLoading(false);
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background glowing meshes */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        {/* Card Principal */}
        <div className="glass-panel-dark rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/60 border border-slate-800/80 backdrop-blur-2xl">
          
          {/* Header Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25 mb-4 ring-4 ring-blue-500/10">
              <ShieldCheck size={34} strokeWidth={2.2} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold tracking-wide uppercase mb-3">
              <Sparkles size={12} /> Porto Alegre
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Central 156
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Gestão Estratégica & Desempenho Operacional
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Identificação
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="E-mail ou Matrícula"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs font-medium text-center animate-fade-in-up">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Acessar Painel</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Dicas de Acesso */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Supervisão:</strong> Acesse com seu e-mail funcional.<br />
              <strong className="text-slate-300">Operação:</strong> Acesse digitando sua matrícula.
            </p>
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Prefeitura Municipal de Porto Alegre • Central de Atendimento ao Cidadão 156
        </p>
      </div>
    </div>
  );
};

export default Login;