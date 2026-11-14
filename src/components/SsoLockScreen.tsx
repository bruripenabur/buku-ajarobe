import React, { useState } from 'react';
import { BookOpenCheck, ExternalLink, Loader2, Lock, LogIn } from 'lucide-react';
import { getPortalLoginUrl, writeSsoCookie } from '../lib/ssoAuth';
import { SIMPATTI_URLS, supabase } from '../lib/supabase';

const UNPATTI_LOGO_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Logo_Universitas_Pattimura_Terbaru.png/330px-Logo_Universitas_Pattimura_Terbaru.png';

interface SsoLockScreenProps {
  onAuthenticated: () => void;
}

export const SsoLockScreen: React.FC<SsoLockScreenProps> = ({ onAuthenticated }) => {
  const [logoError, setLogoError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Masukkan email institusional dan kata sandi Anda.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (data.session) {
      writeSsoCookie(data.session);
      onAuthenticated();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="bg-[#0b3d91] border-b-2 border-[#ffcc00] px-6 py-4 text-white">
        <div className="max-w-5xl mx-auto flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
            {!logoError ? (
              <img
                src={UNPATTI_LOGO_URL}
                alt="Logo Universitas Pattimura"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <BookOpenCheck className="w-6 h-6 text-[#0b3d91]" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">
              SIMPEL-OBE 02: PENYUSUNAN BUKU AJAR AKADEMIK
            </p>
            <p className="text-xs text-blue-100">
              Pusat Kurikulum dan Inovasi Pembelajaran · Universitas Pattimura
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-[#0b3d91] px-6 py-5 text-white border-b-2 border-[#ffcc00]">
            <div className="flex items-center gap-2.5 text-[#ffcc00] text-xs font-semibold mb-1.5">
              <Lock className="w-4 h-4" />
              <span>Single Sign-On Ekosistem SIMPEL-OBE</span>
            </div>
            <h1 className="text-lg font-bold leading-snug">
              Sesi SSO Diperlukan — Silakan Login Terlebih Dahulu melalui Portal Ekosistem OBE
            </h1>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Untuk mengakses draf buku ajar, menarik RPS Modul 1, dan menyinkronkan data ke SIRUBRIK, masuk melalui Portal Utama Ekosistem OBE atau gunakan akun SIMPEL-OBE Anda di bawah ini.
            </p>

            <a
              href={getPortalLoginUrl()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#ffcc00] hover:bg-[#eab308] text-[#0f172a] font-bold text-sm transition-colors"
            >
              <span>Login via Portal Utama ({SIMPATTI_URLS.portal.replace('https://', '')})</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200" />
              <span className="shrink mx-3 text-xs font-medium text-slate-400">
                atau login cepat di tempat
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <form onSubmit={handleQuickLogin} className="space-y-3.5">
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
                  Email Akun SIMPEL-OBE
                </label>
                <input
                  id="sso-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dosen@unpatti.ac.id"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0b3d91] hover:bg-[#092f72] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#ffcc00]" />
                    <span>Memverifikasi Sesi...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-[#ffcc00]" />
                    <span>Masuk ke Modul 2</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        Universitas Pattimura · Ekosistem SIMPEL-OBE (`obe.simpatti.site`)
      </footer>
    </div>
  );
};
