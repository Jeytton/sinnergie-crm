import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const VALID_USER = import.meta.env.VITE_APP_USER as string | undefined;
const VALID_PASS = import.meta.env.VITE_APP_PASSWORD as string | undefined;

export default function Login({ onLogin }: LoginProps) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 400));

    const expectedUser = VALID_USER || 'admin';
    const expectedPass = VALID_PASS || 'sinnergie';

    if (user.trim() === expectedUser && pass === expectedPass) {
      localStorage.setItem('sinnergie_auth', JSON.stringify({ user, ts: Date.now() }));
      onLogin();
    } else {
      setError('Usuário ou senha incorretos.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#3ecf8e] flex items-center justify-center font-extrabold text-xl text-black mb-3 shadow-lg">
            S
          </div>
          <h1 className="text-white font-extrabold text-2xl tracking-tight">Sinnergie</h1>
          <p className="text-gray-500 text-xs mt-1 font-medium">Aesthetic Technologies — CRM</p>
        </div>

        {/* Card */}
        <div className="bg-[#1c1917] border border-gray-800 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-white font-bold text-base mb-5">Entrar na plataforma</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Usuário
              </label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="Digite seu usuário"
                autoComplete="username"
                required
                className="w-full bg-[#0c0a09] border border-gray-700 text-white text-xs rounded-lg py-3 px-4 outline-none focus:border-[#3ecf8e] transition-colors placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                  className="w-full bg-[#0c0a09] border border-gray-700 text-white text-xs rounded-lg py-3 px-4 pr-10 outline-none focus:border-[#3ecf8e] transition-colors placeholder-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-950/40 border border-rose-800 text-rose-400 text-xs rounded-lg px-3 py-2.5 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3ecf8e] hover:bg-emerald-400 disabled:bg-emerald-900 text-black font-extrabold text-sm rounded-xl py-3 transition-all cursor-pointer mt-2"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-[10px] mt-6">
          Sinnergie Aesthetic Technologies · v1.3
        </p>
      </div>
    </div>
  );
}
