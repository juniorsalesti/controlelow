import React from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';
import { TrendingUp, ShieldCheck, Zap } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Este domínio não está autorizado no Firebase Console. Adicione a URL do Vercel em Authentication > Settings > Authorized domains.');
      } else {
        setError('Erro ao fazer login. Verifique se pop-ups estão permitidos ou tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-8 border border-slate-100 dark:border-slate-800"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg shadow-blue-200">
            M
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Command Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            A central de comando definitiva para suas operações low ticket
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-8">
          {[
            { icon: Zap, text: 'Acompanhamento em tempo real' },
            { icon: TrendingUp, text: 'Métricas avançadas de ROI e ROI' },
            { icon: ShieldCheck, text: 'Segurança e controle total dos dados' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <item.icon className="w-5 h-5 text-blue-500" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Acessar com Google
        </button>

        <p className="mt-8 text-center text-xs text-slate-400">
          Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        </p>
      </motion.div>
    </div>
  );
}
