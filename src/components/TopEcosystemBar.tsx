import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  ChevronDown,
  Database,
  FileEdit,
  Loader2,
  LogOut,
  UserCircle2,
} from 'lucide-react';
import type { SsoUserProfile } from '../lib/ssoAuth';
import { PORTAL_OBE_URL } from '../lib/supabase';
import type { RpsSummary } from '../types/book';

const UNPATTI_LOGO_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Logo_Universitas_Pattimura_Terbaru.png/330px-Logo_Universitas_Pattimura_Terbaru.png';

interface TopEcosystemBarProps {
  rpsList: RpsSummary[];
  selectedRpsId: string | null;
  isManualMode: boolean;
  isLoadingRpsList: boolean;
  isLoadingSelectedRps: boolean;
  isSaving: boolean;
  hasExistingDraft: boolean;
  userProfile: SsoUserProfile;
  onSelectRps: (rpsId: string) => void;
  onSwitchManual: () => void;
  onSaveAndContinue: () => void;
  onSignOut: () => void;
}

export const TopEcosystemBar: React.FC<TopEcosystemBarProps> = ({
  rpsList,
  selectedRpsId,
  isManualMode,
  isLoadingRpsList,
  isLoadingSelectedRps,
  isSaving,
  hasExistingDraft,
  userProfile,
  onSelectRps,
  onSwitchManual,
  onSaveAndContinue,
  onSignOut,
}) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="no-print lg:sticky lg:top-0 z-40 bg-[#0b3d91] text-white border-b-2 border-[#ffcc00] shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">
        {/* Row 1: Institutional Identity + SSO Identity & Primary Action */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-white/95 p-1 flex items-center justify-center shrink-0 border border-[#ffcc00]/60">
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
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  SIMPEL-OBE 02: PENYUSUNAN BUKU AJAR AKADEMIK
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#ffcc00] text-[#0f172a] whitespace-nowrap shrink-0">
                  Tahap 2 • Pelaksanaan (Do)
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-blue-100/90 truncate">
                Pengembangan Naskah Buku Ajar Berbasis RPS OBE, Integrasi Riset/PkM/SDGs &amp; Evaluasi TIU-TKD · Pusat Kurikulum dan Inovasi Pembelajaran — Universitas Pattimura
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* SSO User Info + Portal & Sign Out */}
            <div className="flex items-center gap-2.5 bg-[#0f172a]/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs">
              <UserCircle2 className="w-4 h-4 text-[#ffcc00] shrink-0" />
              <div className="leading-tight max-w-[200px]">
                <p className="font-semibold text-white truncate">
                  {userProfile.fullName || userProfile.email || 'Dosen Pengampu'}
                </p>
                <p className="text-[11px] text-blue-100/80 truncate">
                  {userProfile.prodi || 'Universitas Pattimura'}
                </p>
              </div>
              <span className="text-white/25" aria-hidden="true">|</span>
              <a
                href={PORTAL_OBE_URL}
                className="inline-flex items-center gap-1 text-blue-100 hover:text-[#ffcc00] font-medium whitespace-nowrap transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Portal OBE</span>
              </a>
              <span className="text-white/25" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1 text-red-200 hover:text-white font-medium whitespace-nowrap transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onSaveAndContinue}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#ffcc00] hover:bg-[#eab308] disabled:opacity-60 text-[#0f172a] font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Ekosistem...</span>
                </>
              ) : (
                <>
                  <span>Simpan Buku Ajar ke Ekosistem &amp; Lanjut ke SIRUBRIK</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Upstream Connector (obe_rps dropdown + Manual mode) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/15">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            <label
              htmlFor="rps-selector"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ffcc00] whitespace-nowrap shrink-0"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Pilih Mata Kuliah / RPS Tersimpan:</span>
            </label>

            <div className="relative flex-1 max-w-xl min-w-[240px]">
              <select
                id="rps-selector"
                value={isManualMode ? '__manual__' : selectedRpsId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__manual__') {
                    onSwitchManual();
                  } else if (val) {
                    onSelectRps(val);
                  }
                }}
                disabled={isLoadingRpsList || isLoadingSelectedRps}
                className="w-full appearance-none bg-[#0f172a]/80 hover:bg-[#0f172a] text-white text-xs sm:text-sm rounded-lg pl-3 pr-9 py-2 border border-white/25 focus:outline-none focus:border-[#ffcc00] transition-colors cursor-pointer"
              >
                <option value="" disabled>
                  {isLoadingRpsList
                    ? 'Memuat daftar RPS dari Modul 1 (obe_rps)...'
                    : rpsList.length > 0
                    ? '-- Pilih Mata Kuliah dari Modul 1 (obe_rps) --'
                    : '-- Belum ada RPS termuat / pilih Mode Input Manual --'}
                </option>
                <option value="__manual__">
                  [Mode Manual] Buat Buku Ajar Baru Tanpa RPS
                </option>
                {rpsList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.kode_mk} — {item.nama_mk} ({item.prodi} · {item.tahun_akademik} · {item.dosen_pengampu})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-blue-200 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            {isLoadingSelectedRps && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-100 whitespace-nowrap">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ffcc00]" />
                Menarik RPS &amp; draf buku...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-blue-100">
            {selectedRpsId && !isManualMode && (
              <span className="whitespace-nowrap">
                {hasExistingDraft
                  ? 'Draf tersimpan dari obe_buku_ajar dimuat'
                  : 'Terhubung ke RPS Modul 1'}
              </span>
            )}
            <button
              type="button"
              onClick={onSwitchManual}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isManualMode
                  ? 'bg-white text-[#0b3d91]'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Input Manual Tanpa RPS</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
