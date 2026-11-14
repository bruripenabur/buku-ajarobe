/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Database,
  ExternalLink,
  FileText,
  Info,
  Layers,
  Loader2,
  X,
} from 'lucide-react';
import { SsoLockScreen } from './components/SsoLockScreen';
import { Tab1IdentityMapping } from './components/Tab1IdentityMapping';
import { Tab2ChapterEditor } from './components/Tab2ChapterEditor';
import { Tab3EvaluationRefs } from './components/Tab3EvaluationRefs';
import { Tab4PreviewExport } from './components/Tab4PreviewExport';
import { TopEcosystemBar } from './components/TopEcosystemBar';
import {
  buildModuleHandoffUrl,
  detectSsoSession,
  extractSsoUserProfile,
  signOutSso,
  syncSsoCookie,
} from './lib/ssoAuth';
import {
  checkSupabaseConnection,
  fetchRpsAndExistingBook,
  fetchRpsList,
  MODUL_3_SIRUBRIK_URL,
  saveBookToEcosystem,
  supabase,
} from './lib/supabase';
import type { PayloadBukuAjar, RpsSummary } from './types/book';
import { createEmptyManualBook, mapRpsToBookPayload } from './utils/rpsMapper';

type TabKey = 'tab1' | 'tab2' | 'tab3' | 'tab4';

interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function App() {
  const [isCheckingSso, setIsCheckingSso] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);

  const [dbStatus, setDbStatus] = useState<{
    checked: boolean;
    connected: boolean;
    error?: string;
  }>({ checked: false, connected: false });

  const [activeTab, setActiveTab] = useState<TabKey>('tab1');
  const [rpsList, setRpsList] = useState<RpsSummary[]>([]);
  const [selectedRpsId, setSelectedRpsId] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState<boolean>(true);
  const [hasExistingDraft, setHasExistingDraft] = useState<boolean>(false);

  const [isLoadingRpsList, setIsLoadingRpsList] = useState<boolean>(false);
  const [isLoadingSelectedRps, setIsLoadingSelectedRps] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [supabaseNotice, setSupabaseNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [handoffModalUrl, setHandoffModalUrl] = useState<string | null>(null);

  const [book, setBook] = useState<PayloadBukuAjar>(() => createEmptyManualBook());

  const userProfile = useMemo(() => extractSsoUserProfile(authUser), [authUser]);

  const notify = (type: ToastState['type'], message: string) => {
    setToast({ type, message });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);

  // 1. Deteksi Sesi SSO Otomatis + Listener Auth
  useEffect(() => {
    let mounted = true;

    async function initAuthAndConnection() {
      setIsCheckingSso(true);
      const [ssoRes, connRes] = await Promise.all([
        detectSsoSession(),
        checkSupabaseConnection(),
      ]);

      if (!mounted) return;
      setDbStatus({
        checked: true,
        connected: connRes.connected,
        error: connRes.error,
      });

      if (ssoRes.session && ssoRes.user) {
        setSession(ssoRes.session);
        setAuthUser(ssoRes.user);
      }
      setIsCheckingSso(false);
    }

    initAuthAndConnection();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthUser(nextSession?.user ?? null);
      if (nextSession) {
        syncSsoCookie(nextSession);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Auto-fill Tim Penulis & Program Studi dari metadata pengguna SSO
  useEffect(() => {
    if (!authUser) return;
    const profile = extractSsoUserProfile(authUser);
    if (!profile.fullName && !profile.prodi) return;

    setBook((prev) => {
      const nextPenulis = prev.identitas.timPenulis.trim()
        ? prev.identitas.timPenulis
        : profile.fullName;
      const nextProdi = prev.identitas.programStudi.trim()
        ? prev.identitas.programStudi
        : profile.prodi;
      const nextTarget =
        profile.prodi && prev.identitas.targetPembaca === 'Mahasiswa Program Sarjana Universitas Pattimura'
          ? `Mahasiswa Program Studi ${profile.prodi} Universitas Pattimura`
          : prev.identitas.targetPembaca;

      if (
        nextPenulis === prev.identitas.timPenulis &&
        nextProdi === prev.identitas.programStudi &&
        nextTarget === prev.identitas.targetPembaca
      ) {
        return prev;
      }

      return {
        ...prev,
        identitas: {
          ...prev.identitas,
          timPenulis: nextPenulis,
          programStudi: nextProdi,
          targetPembaca: nextTarget,
        },
      };
    });
  }, [authUser]);

  const handleLoadRpsById = async (rpsId: string, currentUser?: User | null) => {
    setIsLoadingSelectedRps(true);
    setSelectedRpsId(rpsId);
    setIsManualMode(false);

    const { rps, existingBook, error } = await fetchRpsAndExistingBook(rpsId);
    setIsLoadingSelectedRps(false);

    if (error && !rps) {
      notify('error', `Gagal menarik data RPS: ${error}`);
      return;
    }

    if (existingBook && existingBook.payload_buku) {
      setBook(existingBook.payload_buku);
      setHasExistingDraft(true);
      notify(
        'info',
        `Draf tersimpan "${existingBook.judul_buku}" dari tabel obe_buku_ajar berhasil dimuat.`
      );
      return;
    }

    if (rps) {
      const profile = extractSsoUserProfile(currentUser ?? authUser);
      const mapped = mapRpsToBookPayload(rps, {
        fullName: profile.fullName,
        prodi: profile.prodi,
      });
      setBook(mapped);
      setHasExistingDraft(false);
      notify(
        'success',
        `Data RPS ${rps.kode_mk} — ${rps.nama_mk} otomatis dipetakan menjadi ${mapped.babList.length} Bab Buku Ajar.`
      );
    }
  };

  // Tarik daftar obe_rps & cek parameter ?rps_id=... setelah SSO aktif
  useEffect(() => {
    if (!session) return;
    let mounted = true;

    async function loadEcosystemData() {
      setIsLoadingRpsList(true);
      const { data, error } = await fetchRpsList();
      if (!mounted) return;
      setIsLoadingRpsList(false);

      if (error) {
        setSupabaseNotice(error);
      } else {
        setSupabaseNotice(null);
        setRpsList(data);
        setDbStatus({ checked: true, connected: true });
      }

      const params = new URLSearchParams(window.location.search);
      const urlRpsId = params.get('rps_id');
      if (urlRpsId) {
        await handleLoadRpsById(urlRpsId, session?.user);
      }
    }

    loadEcosystemData();
    return () => {
      mounted = false;
    };
  }, [session]);

  const handleSwitchManual = () => {
    setSelectedRpsId(null);
    setIsManualMode(true);
    setHasExistingDraft(false);
    setBook(
      createEmptyManualBook({
        fullName: userProfile.fullName,
        prodi: userProfile.prodi,
      })
    );
    notify(
      'info',
      'Mode Input Manual aktif. Identitas penulis dan program studi diisi otomatis dari profil SSO Anda.'
    );
  };

  const handleSaveAndContinue = async () => {
    const judulFinal =
      book.identitas.judulBuku.trim() ||
      book.identitas.namaMk.trim() ||
      'Buku Ajar Akademik OBE';

    setIsSaving(true);
    const { savedId, error } = await saveBookToEcosystem({
      rpsId: isManualMode ? null : selectedRpsId,
      judulBuku: judulFinal,
      payloadBuku: {
        ...book,
        lastUpdated: new Date().toISOString(),
      },
    });
    setIsSaving(false);

    if (error) {
      notify('error', error);
      return;
    }

    const rpsParam = selectedRpsId || savedId || '';
    const targetUrl = buildModuleHandoffUrl(MODUL_3_SIRUBRIK_URL, rpsParam, session);

    notify(
      'success',
      'Buku ajar berhasil disimpan ke tabel obe_buku_ajar dan status siklus RPS diperbarui menjadi 2_buku_selesai.'
    );

    if (!MODUL_3_SIRUBRIK_URL.includes('[MASUKKAN_')) {
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 1100);
    } else {
      setHandoffModalUrl(targetUrl);
    }
  };

  const handleSignOut = async () => {
    await signOutSso();
    setSession(null);
    setAuthUser(null);
  };

  const tabs: Array<{ key: TabKey; label: string; icon: typeof BookOpen }> = [
    { key: 'tab1', label: '1. Identitas, Prakata & Peta CPL', icon: BookOpen },
    { key: 'tab2', label: '2. Generator & Editor Per Bab', icon: Layers },
    { key: 'tab3', label: '3. Kisi-Kisi TIU-TKD & Pustaka', icon: ClipboardList },
    { key: 'tab4', label: '4. Pratinjau Manuskrip & Ekspor', icon: FileText },
  ];

  // Layar tunggu saat memeriksa sesi SSO
  if (isCheckingSso) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex items-center gap-3 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#0b3d91]" />
          <span className="text-sm font-semibold text-slate-800">
            Memeriksa sesi Single Sign-On (SSO) Ekosistem SIMPEL-OBE...
          </span>
        </div>
      </div>
    );
  }

  // Layar kunci SSO jika belum login
  if (!session || !authUser) {
    return (
      <>
        <SsoLockScreen
          onAuthenticated={(newSession, newUser) => {
            setSession(newSession);
            setAuthUser(newUser);
          }}
        />
        <DbConnectionStatusBadge dbStatus={dbStatus} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopEcosystemBar
        rpsList={rpsList}
        selectedRpsId={selectedRpsId}
        isManualMode={isManualMode}
        isLoadingRpsList={isLoadingRpsList}
        isLoadingSelectedRps={isLoadingSelectedRps}
        isSaving={isSaving}
        hasExistingDraft={hasExistingDraft}
        userProfile={userProfile}
        onSelectRps={(id) => handleLoadRpsById(id)}
        onSwitchManual={handleSwitchManual}
        onSaveAndContinue={handleSaveAndContinue}
        onSignOut={handleSignOut}
      />

      {/* Tab Navigation Bar */}
      <nav
        aria-label="Tahapan Penyusunan Buku Ajar"
        className="no-print bg-white border-b border-slate-200"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-[#0b3d91] text-[#0b3d91] bg-blue-50/40'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {supabaseNotice && (
          <div className="no-print rounded-xl border border-amber-300 bg-amber-50/70 px-4 py-3 flex items-start justify-between gap-3 text-xs sm:text-sm text-amber-950">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Koneksi Hulu Supabase (obe_rps &amp; obe_buku_ajar)</p>
                <p className="text-amber-900/90 mt-0.5">{supabaseNotice}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSupabaseNotice(null)}
              className="text-amber-700 hover:text-amber-950 p-1 cursor-pointer"
              aria-label="Tutup pemberitahuan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'tab1' && (
          <Tab1IdentityMapping
            book={book}
            onChangeBook={setBook}
            onNotify={notify}
          />
        )}

        {activeTab === 'tab2' && (
          <Tab2ChapterEditor
            book={book}
            onChangeBook={setBook}
            onNotify={notify}
          />
        )}

        {activeTab === 'tab3' && (
          <Tab3EvaluationRefs
            book={book}
            onChangeBook={setBook}
            onNotify={notify}
          />
        )}

        {activeTab === 'tab4' && <Tab4PreviewExport book={book} />}
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="no-print border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Pusat Kurikulum dan Inovasi Pembelajaran · Universitas Pattimura
          </span>
          <span>
            Ekosistem SIMPEL-OBE · Tahap 2: Penyusunan Buku Ajar Akademik
          </span>
        </div>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <div className="no-print fixed bottom-16 right-5 z-50 max-w-md rounded-xl border bg-white shadow-lg p-4 flex items-start gap-3 border-slate-200">
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info className="w-5 h-5 text-[#0b3d91] shrink-0 mt-0.5" />
          )}
          <div className="text-xs sm:text-sm text-slate-800 flex-1">{toast.message}</div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Handoff Confirmation Modal */}
      {handoffModalUrl && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  Buku Ajar Tersimpan ke Ekosistem
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHandoffModalUrl(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Data buku ajar telah disimpan ke tabel{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                obe_buku_ajar
              </code>{' '}
              dan status siklus RPS diperbarui menjadi{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                2_buku_selesai
              </code>
              .
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHandoffModalUrl(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = handoffModalUrl;
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0b3d91] text-white text-xs font-semibold hover:bg-[#092f72] cursor-pointer"
              >
                <span>Buka URL SIRUBRIK</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <DbConnectionStatusBadge dbStatus={dbStatus} />
    </div>
  );
}

function DbConnectionStatusBadge({
  dbStatus,
}: {
  dbStatus: { checked: boolean; connected: boolean; error?: string };
}) {
  if (!dbStatus.checked) return null;

  return (
    <div
      title={dbStatus.error || 'Terhubung ke Supabase SIMPEL-OBE'}
      className={`no-print fixed bottom-3.5 right-4 z-40 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm ${
        dbStatus.connected
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}
    >
      <Database className="w-3.5 h-3.5 shrink-0" />
      <span>
        {dbStatus.connected
          ? 'Supabase Connected (SIMPEL-OBE DB)'
          : `Supabase Disconnected${dbStatus.error ? `: ${dbStatus.error}` : ''}`}
      </span>
    </div>
  );
}
