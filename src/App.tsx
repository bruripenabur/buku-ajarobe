/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
  Layers,
  Loader2,
  X,
} from 'lucide-react';
import { SsoLockScreen } from './components/SsoLockScreen';
import { SupabaseStatusBadge } from './components/SupabaseStatusBadge';
import { Tab1IdentityMapping } from './components/Tab1IdentityMapping';
import { Tab2ChapterEditor } from './components/Tab2ChapterEditor';
import { Tab3EvaluationRefs } from './components/Tab3EvaluationRefs';
import { Tab4PreviewExport } from './components/Tab4PreviewExport';
import { TopEcosystemBar } from './components/TopEcosystemBar';
import {
  buildModuleHandoffUrl,
  extractUserProfile,
  resolveSsoSession,
  signOutSso,
  writeSsoCookie,
} from './lib/ssoAuth';
import {
  checkSupabaseConnection,
  fetchRpsAndExistingBook,
  fetchRpsList,
  MODUL_3_SIRUBRIK_URL,
  saveBookToEcosystem,
  supabase,
  type SupabaseConnectionStatus,
} from './lib/supabase';
import type { PayloadBukuAjar, RpsSummary } from './types/book';
import { createEmptyManualBook, mapRpsToBookPayload } from './utils/rpsMapper';

type TabKey = 'tab1' | 'tab2' | 'tab3' | 'tab4';

interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function App() {
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);
  const [dbStatus, setDbStatus] = useState<SupabaseConnectionStatus>({
    state: 'checking',
    message: 'Memeriksa Koneksi Supabase...',
  });

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

  const [book, setBook] = useState<PayloadBukuAjar>(() => createEmptyManualBook());

  const userProfile = useMemo(
    () => extractUserProfile(session?.user ?? null),
    [session]
  );

  const notify = useCallback((type: ToastState['type'], message: string) => {
    setToast({ type, message });
  }, []);

  const applyUserAutofill = useCallback(
    (payload: PayloadBukuAjar, profile = userProfile): PayloadBukuAjar => {
      const nextPenulis = payload.identitas.timPenulis.trim() || profile.fullName;
      const nextProdi = payload.identitas.programStudi.trim() || profile.prodi;
      const nextTarget =
        profile.prodi &&
        payload.identitas.targetPembaca ===
          'Mahasiswa Program Sarjana Universitas Pattimura'
          ? `Mahasiswa Program Studi ${profile.prodi} — Universitas Pattimura`
          : payload.identitas.targetPembaca;

      if (
        nextPenulis === payload.identitas.timPenulis &&
        nextProdi === payload.identitas.programStudi &&
        nextTarget === payload.identitas.targetPembaca
      ) {
        return payload;
      }

      return {
        ...payload,
        identitas: {
          ...payload.identitas,
          timPenulis: nextPenulis,
          programStudi: nextProdi,
          targetPembaca: nextTarget,
        },
      };
    },
    [userProfile]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);

  const runDbCheck = useCallback(async () => {
    setDbStatus({ state: 'checking', message: 'Memeriksa Koneksi Supabase...' });
    const status = await checkSupabaseConnection();
    setDbStatus(status);
  }, []);

  // 1. Resolve SSO session & subscribe to auth state changes
  useEffect(() => {
    let mounted = true;

    async function initAuthAndDb() {
      setIsCheckingAuth(true);
      const [resolvedSession] = await Promise.all([
        resolveSsoSession(),
        runDbCheck(),
      ]);

      if (!mounted) return;
      setSession(resolvedSession);
      setIsCheckingAuth(false);
    }

    initAuthAndDb();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      writeSsoCookie(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [runDbCheck]);

  // Auto-fill Tim Penulis & Program Studi once user profile is available
  useEffect(() => {
    if (!session?.user) return;
    const profile = extractUserProfile(session.user);
    setBook((prev) => applyUserAutofill(prev, profile));
  }, [session, applyUserAutofill]);

  const handleLoadRpsById = useCallback(
    async (rpsId: string) => {
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
        setBook(applyUserAutofill(existingBook.payload_buku));
        setHasExistingDraft(true);
        notify(
          'info',
          `Draf tersimpan "${existingBook.judul_buku}" dari tabel obe_buku_ajar berhasil dimuat.`
        );
        return;
      }

      if (rps) {
        const mapped = applyUserAutofill(mapRpsToBookPayload(rps));
        setBook(mapped);
        setHasExistingDraft(false);
        notify(
          'success',
          `Data RPS ${rps.kode_mk} — ${rps.nama_mk} otomatis dipetakan menjadi ${mapped.babList.length} Bab Buku Ajar.`
        );
      }
    },
    [applyUserAutofill, notify]
  );

  // 2. Load upstream obe_rps list & ?rps_id=... once authenticated
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
      }

      const params = new URLSearchParams(window.location.search);
      const urlRpsId = params.get('rps_id');
      if (urlRpsId) {
        await handleLoadRpsById(urlRpsId);
      }
    }

    loadEcosystemData();
    return () => {
      mounted = false;
    };
  }, [session, handleLoadRpsById]);

  const handleSwitchManual = () => {
    setSelectedRpsId(null);
    setIsManualMode(true);
    setHasExistingDraft(false);
    setBook(applyUserAutofill(createEmptyManualBook()));
    notify(
      'info',
      'Mode Input Manual aktif. Identitas dosen dan program studi telah diisi otomatis dari profil SSO.'
    );
  };

  const handleSignOut = async () => {
    await signOutSso();
    setSession(null);
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

    const rpsParam = selectedRpsId || savedId || null;
    const targetUrl = buildModuleHandoffUrl(
      MODUL_3_SIRUBRIK_URL,
      rpsParam,
      session
    );

    notify(
      'success',
      'Buku ajar berhasil disimpan ke tabel obe_buku_ajar dan status siklus RPS diperbarui menjadi 2_buku_selesai. Mengarahkan ke SIRUBRIK...'
    );

    setTimeout(() => {
      window.location.href = targetUrl;
    }, 1000);
  };

  const tabs: Array<{ key: TabKey; label: string; icon: typeof BookOpen }> = [
    { key: 'tab1', label: '1. Identitas, Prakata & Peta CPL', icon: BookOpen },
    { key: 'tab2', label: '2. Generator & Editor Per Bab', icon: Layers },
    { key: 'tab3', label: '3. Kisi-Kisi TIU-TKD & Pustaka', icon: ClipboardList },
    { key: 'tab4', label: '4. Pratinjau Manuskrip & Ekspor', icon: FileText },
  ];

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-700">
        <Loader2 className="w-8 h-8 animate-spin text-[#0b3d91] mb-3" />
        <p className="text-sm font-semibold text-slate-900">
          Memeriksa Sesi SSO Ekosistem SIMPEL-OBE...
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Menghubungkan ke obe.simpatti.site &amp; database Supabase
        </p>
        <SupabaseStatusBadge status={dbStatus} onRetry={runDbCheck} />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <SsoLockScreen
          onAuthenticated={async () => {
            const nextSession = await resolveSsoSession();
            setSession(nextSession);
          }}
        />
        <SupabaseStatusBadge status={dbStatus} onRetry={runDbCheck} />
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
        onSelectRps={handleLoadRpsById}
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
            Ekosistem SIMPEL-OBE · Tahap 2: Penyusunan Buku Ajar Akademik (`bukuajar.simpatti.site`)
          </span>
        </div>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <div className="no-print fixed bottom-14 right-5 z-50 max-w-md rounded-xl border bg-white shadow-lg p-4 flex items-start gap-3 border-slate-200">
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

      {/* Diagnostic Status Badge */}
      <SupabaseStatusBadge status={dbStatus} onRetry={runDbCheck} />
    </div>
  );
}
