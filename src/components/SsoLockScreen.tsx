import React, { useState } from 'react';
import { BookOpenCheck, ExternalLink, Loader2, Lock, LogIn } from 'lucide-react';
import { PORTAL_OBE_URL } from '../lib/supabase';
import { signInWithEmailPassword } from '../lib/ssoAuth';
import type { Session, User } from '@supabase/supabase-js';

const UNPATTI_LOGO_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Logo_Universitas_Pattimura_Terbaru.png/330px-Logo_Universitas_Pattimura_Terbaru.png';

interface SsoLockScreenProps {
  onAuthenticated: (session: Session, user: User) => void;
}

export const SsoLockScreen: React.FC<SsoLockScreenProps> = ({ onAuthenticated }) => {
  const [logoError, setLogoError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePortalRedirect = () => {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${PORTAL_OBE_URL}?redirect=${returnUrl}`;
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Masukkan email institusi dan kata sandi Anda.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    const { session, user, error } = await signInWithEmailPassword(email, password);
    setIsSubmitting(false);

    if (error || !session || !user) {
      setErrorMsg(error || 'Autentikasi gagal.');
      return;
    }

    onAuthenticated(session, user);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Institutional Navy & Gold Header */}
        <div className="bg-[#0b3d91] text-white px-6 py-6 border-b-2 border-[#ffcc00] text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-xl bg-white p-1.5 flex items-center justify-center border border-[#ffcc00]/70">
            {!logoError ? (
              <img
                src={UNPATTI_LOGO_URL}
                alt="Logo Universitas Pattimura"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <BookOpenCheck className="w-7 h-7 text-[#0b3d91]" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#ffcc00] tracking-wide">
              SIMPEL-OBE 02 · UNIVERSITAS PATTIMURA
            </p>
            <h1 className="text-lg font-bold text-white mt-1 leading-snug">
              Sesi SSO Diperlukan — Silakan Login Terlebih Dahulu melalui Portal Ekosistem OBE
            </h1>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 leading-relaxed">
            <Lock className="w-4 h-4 text-[#0b3d91] mt-0.5 shrink-0" />
            <p>
              Modul Penyusunan Buku Ajar Akademik terintegrasi dengan akun Single Sign-On (SSO) Ekosistem SIMPEL-OBE agar identitas dosen pengampu, program studi, dan RPS tersinkronisasi otomatis.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePortalRedirect}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#ffcc00] hover:bg-[#eab308] text-[#0f172a] font-bold text-sm transition-colors cursor-pointer"
          >
            <span>Login via Portal Utama (https://obe.simpatti.site)</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="shrink mx-3 text-xs font-medium text-slate-400">
              atau login cepat di tempat
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <form onSubmit={handleQuickLogin} className="space-y-4">
            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            <div>
              <label
                htmlFor="sso-email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Email Akun OBE / Dosen
              </label>
              <input
                id="sso-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dosen@unpatti.ac.id"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
            </div>

            <div>
              <label
                htmlFor="sso-password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Kata Sandi
              </label>
              <input
                id="sso-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0b3d91] hover:bg-[#092f72] disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#ffcc00]" />
                  <span>Memverifikasi Sesi...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-[#ffcc00]" />
                  <span>Masuk ke Modul Buku Ajar</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
