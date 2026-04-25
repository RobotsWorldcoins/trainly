'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError('Credenciais inválidas. Verifica o email e a password.');
      setLoading(false);
      return;
    }

    // ── FIX: profiles FK is user_id → auth.users.id, NOT profiles.id ──
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', data.user.id)   // ← corrected column
      .single();

    if (profileError || profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('Acesso negado. Apenas administradores podem entrar.');
      setLoading(false);
      return;
    }

    // Trigger futuristic success transition
    setSuccess(true);
    // Small delay for animation, then navigate
    setTimeout(() => router.replace('/dashboard'), 1200);
  };

  return (
    <>
      {/* Global styles for the transition */}
      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(-100%); opacity: 0.6; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.03; }
          50%       { opacity: 0.08; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(27,111,235,0); }
          50%       { box-shadow: 0 0 40px 8px rgba(27,111,235,0.35); }
        }
        @keyframes successBurst {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes wipeRight {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .card-anim { animation: fadeSlideUp 0.5s ease both; }
        .success-anim { animation: successBurst 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      <div className="min-h-screen bg-[#050A14] flex items-center justify-center p-4 overflow-hidden relative">

        {/* Animated grid background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(rgba(27,111,235,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(27,111,235,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          animation: 'gridPulse 4s ease-in-out infinite',
        }} />

        {/* Radial glow at centre */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(27,111,235,0.10) 0%, transparent 70%)',
        }} />

        {/* Success overlay — slides in on login */}
        {success && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(5,10,20,0.95)', backdropFilter: 'blur(12px)' }}
          >
            {/* Scan line effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div style={{
                height: '3px',
                background: 'linear-gradient(90deg, transparent, rgba(27,111,235,0.8), rgba(99,202,255,0.9), rgba(27,111,235,0.8), transparent)',
                animation: 'scanLine 0.9s ease-in-out',
                width: '100%',
              }} />
            </div>

            <div className="success-anim text-center">
              <div className="w-20 h-20 rounded-full bg-[#1B6FEB]/20 border-2 border-[#1B6FEB] flex items-center justify-center mx-auto mb-4"
                style={{ boxShadow: '0 0 40px rgba(27,111,235,0.4)' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#1B6FEB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-white text-xl font-bold tracking-wide">Acesso autorizado</p>
              <p className="text-[#1B6FEB] text-sm mt-1 tracking-widest uppercase">A entrar no painel…</p>

              {/* Progress bar */}
              <div className="mt-6 w-48 mx-auto h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#1B6FEB] rounded-full"
                  style={{ animation: 'wipeRight 1.1s cubic-bezier(0.4,0,0.2,1) forwards', transformOrigin: 'left' }} />
              </div>
            </div>
          </div>
        )}

        {/* Login card */}
        <div className="card-anim w-full max-w-md relative z-10">
          {/* Corner accents */}
          <div className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-[#1B6FEB] rounded-tl-2xl" />
          <div className="absolute -top-px -right-px w-6 h-6 border-t-2 border-r-2 border-[#1B6FEB] rounded-tr-2xl" />
          <div className="absolute -bottom-px -left-px w-6 h-6 border-b-2 border-l-2 border-[#1B6FEB] rounded-bl-2xl" />
          <div className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-[#1B6FEB] rounded-br-2xl" />

          <div className="bg-[#0D1526]/90 backdrop-blur-xl rounded-2xl border border-white/8 p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center relative"
                style={{
                  background: 'linear-gradient(135deg, #1B6FEB, #0A40A8)',
                  boxShadow: '0 0 32px rgba(27,111,235,0.4)',
                  animation: 'glowRing 3s ease-in-out infinite',
                }}>
                <span className="text-white text-2xl font-black tracking-tight">TX</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">TrainyX Admin</h1>
              <p className="text-white/40 text-sm mt-1">Painel de controlo · Acesso restrito</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(27,111,235,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,111,235,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  placeholder="admin@trainyx.app"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(27,111,235,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,111,235,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-wide transition-all disabled:opacity-50 relative overflow-hidden"
                style={{
                  background: loading
                    ? 'rgba(27,111,235,0.5)'
                    : 'linear-gradient(135deg, #1B6FEB, #1457C0)',
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(27,111,235,0.4)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                    </svg>
                    A verificar…
                  </span>
                ) : 'Entrar'}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-white/20 text-xs mt-6">
              TrainyX Admin v1.0 · Powered by Supabase + Vercel
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
