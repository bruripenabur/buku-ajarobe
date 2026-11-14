import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { PayloadBukuAjar, ReferensiItem } from '../types/book';

interface Tab3EvaluationRefsProps {
  book: PayloadBukuAjar;
  onChangeBook: (updater: (prev: PayloadBukuAjar) => PayloadBukuAjar) => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const Tab3EvaluationRefs: React.FC<Tab3EvaluationRefsProps> = ({
  book,
  onChangeBook,
  onNotify,
}) => {
  const [expandedBabIds, setExpandedBabIds] = useState<Record<string, boolean>>({});
  const [newKategori, setNewKategori] = useState<'Utama' | 'Pendukung' | 'Mutakhir'>('Utama');
  const [newGaya, setNewGaya] = useState<'APA' | 'IEEE'>('APA');
  const [newTahun, setNewTahun] = useState(String(new Date().getFullYear()));
  const [newSitasi, setNewSitasi] = useState('');
  const [aiCitationStyle, setAiCitationStyle] = useState<'APA' | 'IEEE'>('APA');
  const [isSuggestingRefs, setIsSuggestingRefs] = useState(false);

  const stats = useMemo(() => {
    let totalSoal = 0;
    let lotsCount = 0; // C2-C3
    let hotsCount = 0; // C4-C6

    book.babList.forEach((bab) => {
      bab.latihanSoal.forEach((s) => {
        totalSoal += 1;
        if (s.levelKognitif === 'C2' || s.levelKognitif === 'C3') {
          lotsCount += 1;
        } else {
          hotsCount += 1;
        }
      });
    });

    return {
      totalBab: book.babList.length,
      totalSoal,
      lotsCount,
      hotsCount,
    };
  }, [book.babList]);

  const toggleExpand = (babId: string) => {
    setExpandedBabIds((prev) => ({ ...prev, [babId]: !prev[babId] }));
  };

  const handleAddReference = () => {
    if (!newSitasi.trim()) {
      onNotify('error', 'Masukkan teks sitasi referensi terlebih dahulu.');
      return;
    }
    const item: ReferensiItem = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kategori: newKategori,
      gayaSitasi: newGaya,
      tahun: newTahun.trim() || String(new Date().getFullYear()),
      sitasi: newSitasi.trim(),
    };
    onChangeBook((prev) => ({
      ...prev,
      daftarPustaka: [...prev.daftarPustaka, item],
      lastUpdated: new Date().toISOString(),
    }));
    setNewSitasi('');
  };

  const handleRemoveReference = (refId: string) => {
    onChangeBook((prev) => ({
      ...prev,
      daftarPustaka: prev.daftarPustaka.filter((r) => r.id !== refId),
      lastUpdated: new Date().toISOString(),
    }));
  };

  const handleSuggestReferences = async () => {
    setIsSuggestingRefs(true);
    try {
      const res = await fetch('/api/ai/suggest-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identitas: book.identitas,
          topikBab: book.babList.slice(0, 8).map((b) => b.judulBab),
          gayaSitasi: aiCitationStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyarankan referensi.');
      }

      const added: ReferensiItem[] = (data.references || []).map(
        (r: any, idx: number) => ({
          id: `ref-ai-${Date.now()}-${idx}`,
          kategori:
            r.kategori === 'Utama' || r.kategori === 'Pendukung'
              ? r.kategori
              : 'Mutakhir',
          gayaSitasi: aiCitationStyle,
          tahun: String(r.tahun || new Date().getFullYear()),
          sitasi: String(r.sitasi || ''),
        })
      );

      onChangeBook((prev) => ({
        ...prev,
        daftarPustaka: [...prev.daftarPustaka, ...added],
        lastUpdated: new Date().toISOString(),
      }));

      onNotify(
        'success',
        `${added.length} referensi mutakhir berformat ${aiCitationStyle} ditambahkan ke Daftar Pustaka.`
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Gagal menyarankan referensi.'
      );
    } finally {
      setIsSuggestingRefs(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Cakupan Bab Buku</p>
          <p className="text-2xl font-bold text-[#0b3d91] tabular-nums mt-1">
            {stats.totalBab} Bab
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Bank Soal Evaluasi</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.totalSoal} Butir
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Kognitif C2–C3 (Pemahaman/Aplikasi)</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.lotsCount} Soal
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Kognitif C4–C6 (Analisis/Evaluasi/Kreasi)</p>
          <p className="text-2xl font-bold text-amber-700 tabular-nums mt-1">
            {stats.hotsCount} Soal
          </p>
        </div>
      </div>

      {/* Section A: Kompilasi Kisi-Kisi Evaluasi TIU & TKD untuk SIRUBRIK */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="pb-4 mb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            Kompilasi Kisi-Kisi Evaluasi Pembelajaran (TIU &amp; TKD) — Masukan Modul 3 (SIRUBRIK)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Rekapitulasi otomatis seluruh Tujuan Instruksional Umum (TIU / CPMK), Tujuan Instruksional Khusus / Kompetensi Dasar (TKD / Sub-CPMK), dan bank soal latihan dari Bab 1 s.d. Bab {book.babList.length}.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                <th className="py-2.5 px-3 w-20">Bab</th>
                <th className="py-2.5 px-3">TIU (CPMK)</th>
                <th className="py-2.5 px-3">TKD / TIK (Sub-CPMK)</th>
                <th className="py-2.5 px-3 w-36">Level Kognitif</th>
                <th className="py-2.5 px-3 w-28 text-right">Butir Soal</th>
                <th className="py-2.5 px-3 w-28 text-right">Total Bobot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {book.babList.map((bab) => {
                const isExpanded = Boolean(expandedBabIds[bab.id]);
                const levels = Array.from(
                  new Set(bab.latihanSoal.map((s) => s.levelKognitif))
                ).join(', ');
                const totalBobot = bab.latihanSoal.reduce(
                  (acc, s) => acc + (Number(s.bobotSkor) || 0),
                  0
                );

                return (
                  <React.Fragment key={bab.id}>
                    <tr
                      onClick={() => toggleExpand(bab.id)}
                      className="hover:bg-slate-50 cursor-pointer align-top"
                    >
                      <td className="py-3 px-3 font-mono font-semibold text-[#0b3d91] tabular-nums whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          Bab {bab.nomorBab}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-700 leading-relaxed">
                        {bab.tiuCpmk}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-800 font-medium leading-relaxed">
                        {bab.tikSubCpmk}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-700">
                        {levels || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                        {bab.latihanSoal.length}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-semibold tabular-nums">
                        {totalBobot}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="space-y-2.5">
                            <p className="text-xs font-bold text-[#0b3d91]">
                              Bank Soal &amp; Pedoman Penskoran — Bab {bab.nomorBab}: {bab.judulBab}
                            </p>
                            {bab.latihanSoal.length === 0 ? (
                              <p className="text-xs text-slate-500">
                                Belum ada soal pada bab ini. Tambahkan melalui Tab 2.
                              </p>
                            ) : (
                              bab.latihanSoal.map((s, qIdx) => (
                                <div
                                  key={s.id}
                                  className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between font-mono text-slate-600">
                                    <span>
                                      Soal {qIdx + 1} · Level {s.levelKognitif}
                                    </span>
                                    <span className="tabular-nums">Bobot: {s.bobotSkor}</span>
                                  </div>
                                  <p className="text-sm text-slate-900 font-medium">
                                    {s.pertanyaan}
                                  </p>
                                  <p className="text-slate-600">
                                    <strong>Kunci:</strong> {s.kunciJawaban}
                                  </p>
                                  <p className="text-slate-600">
                                    <strong>Pedoman Penskoran:</strong> {s.pedomanPenskoran}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section B: Manajemen Daftar Pustaka Terintegrasi */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Manajemen Daftar Pustaka Terintegrasi
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Kombinasi referensi utama &amp; pendukung dari RPS serta referensi mutakhir 5–10 tahun terakhir (format APA / IEEE).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={aiCitationStyle}
              onChange={(e) => setAiCitationStyle(e.target.value as 'APA' | 'IEEE')}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800"
            >
              <option value="APA">Format APA 7th</option>
              <option value="IEEE">Format IEEE</option>
            </select>
            <button
              type="button"
              onClick={handleSuggestReferences}
              disabled={isSuggestingRefs}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0b3d91] hover:bg-[#092f72] disabled:opacity-60 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSuggestingRefs ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ffcc00]" />
                  <span>Mencari Referensi...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#ffcc00]" />
                  <span>Sarankan Referensi Mutakhir (5–10 Tahun)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Add Reference Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori
            </label>
            <select
              value={newKategori}
              onChange={(e) =>
                setNewKategori(e.target.value as 'Utama' | 'Pendukung' | 'Mutakhir')
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
            >
              <option value="Utama">Utama</option>
              <option value="Pendukung">Pendukung</option>
              <option value="Mutakhir">Mutakhir</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gaya Sitasi
            </label>
            <select
              value={newGaya}
              onChange={(e) => setNewGaya(e.target.value as 'APA' | 'IEEE')}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
            >
              <option value="APA">APA</option>
              <option value="IEEE">IEEE</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahun
            </label>
            <input
              type="text"
              value={newTahun}
              onChange={(e) => setNewTahun(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-mono tabular-nums"
            />
          </div>
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sitasi Lengkap
            </label>
            <input
              type="text"
              value={newSitasi}
              onChange={(e) => setNewSitasi(e.target.value)}
              placeholder="Contoh: Creswell, J. W. (2023). Research Design (6th ed.). SAGE Publications."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              type="button"
              onClick={handleAddReference}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Pustaka
            </button>
          </div>
        </div>

        {/* List */}
        {book.daftarPustaka.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
            Belum ada daftar pustaka. Tambahkan referensi manual di atas atau gunakan saran AI.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {book.daftarPustaka.map((ref, idx) => (
              <div
                key={ref.id}
                className="py-3 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-0.5">
                    <span className="tabular-nums">[{idx + 1}]</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#0b3d91]">{ref.kategori}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ref.gayaSitasi}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{ref.tahun}</span>
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">{ref.sitasi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveReference(ref.id)}
                  title="Hapus referensi"
                  className="text-slate-400 hover:text-red-600 p-1.5 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
