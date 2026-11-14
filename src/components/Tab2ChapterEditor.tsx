import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  BabBukuAjar,
  CognitiveLevel,
  PayloadBukuAjar,
  SoalEvaluasi,
} from '../types/book';
import { createChapterSkeleton } from '../utils/rpsMapper';

interface Tab2ChapterEditorProps {
  book: PayloadBukuAjar;
  onChangeBook: (updater: (prev: PayloadBukuAjar) => PayloadBukuAjar) => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

const COGNITIVE_LEVELS: CognitiveLevel[] = ['C2', 'C3', 'C4', 'C5', 'C6'];

export const Tab2ChapterEditor: React.FC<Tab2ChapterEditorProps> = ({
  book,
  onChangeBook,
  onNotify,
}) => {
  const [selectedBabId, setSelectedBabId] = useState<string>(
    book.babList[0]?.id || ''
  );
  const [isGeneratingChapter, setIsGeneratingChapter] = useState(false);
  const [isGeneratingAllOutlines, setIsGeneratingAllOutlines] = useState(false);

  const activeBab =
    book.babList.find((b) => b.id === selectedBabId) || book.babList[0];

  const updateActiveBab = (updater: (bab: BabBukuAjar) => BabBukuAjar) => {
    if (!activeBab) return;
    onChangeBook((prev) => ({
      ...prev,
      babList: prev.babList.map((b) => (b.id === activeBab.id ? updater(b) : b)),
      lastUpdated: new Date().toISOString(),
    }));
  };

  const handleGenerateSingleChapter = async () => {
    if (!activeBab) return;
    setIsGeneratingChapter(true);
    try {
      const res = await fetch('/api/ai/generate-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identitas: book.identitas,
          bab: activeBab,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghasilkan naskah bab.');
      }

      const generatedSoal: SoalEvaluasi[] = Array.isArray(data.latihanSoal)
        ? data.latihanSoal.map((s: any, idx: number) => ({
            id: `soal-${activeBab.nomorBab}-${idx}-${Date.now()}`,
            pertanyaan: String(s.pertanyaan || ''),
            levelKognitif: COGNITIVE_LEVELS.includes(s.levelKognitif)
              ? s.levelKognitif
              : 'C4',
            kunciJawaban: String(s.kunciJawaban || ''),
            pedomanPenskoran: String(s.pedomanPenskoran || ''),
            bobotSkor: Number(s.bobotSkor) || 25,
          }))
        : activeBab.latihanSoal;

      updateActiveBab((bab) => ({
        ...bab,
        petaKonsep: data.petaKonsep || bab.petaKonsep,
        pendahuluan: data.pendahuluan || bab.pendahuluan,
        uraianMateri: data.uraianMateri || bab.uraianMateri,
        studiKasus: data.studiKasus || bab.studiKasus,
        integrasiRisetPkmSdgs: {
          topikRisetPkm:
            data.integrasiRisetPkmSdgs?.topikRisetPkm ||
            bab.integrasiRisetPkmSdgs.topikRisetPkm,
          kontribusiSdgs:
            data.integrasiRisetPkmSdgs?.kontribusiSdgs ||
            bab.integrasiRisetPkmSdgs.kontribusiSdgs,
          konteksKepulauan:
            data.integrasiRisetPkmSdgs?.konteksKepulauan ||
            bab.integrasiRisetPkmSdgs.konteksKepulauan,
        },
        rangkuman: data.rangkuman || bab.rangkuman,
        latihanSoal: generatedSoal,
      }));

      onNotify(
        'success',
        `Naskah lengkap Bab ${activeBab.nomorBab} (${activeBab.judulBab}) berhasil dibuat.`
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Gagal menghubungi layanan AI.'
      );
    } finally {
      setIsGeneratingChapter(false);
    }
  };

  const handleGenerateAllOutlines = async () => {
    if (book.babList.length === 0) return;
    setIsGeneratingAllOutlines(true);
    try {
      const res = await fetch('/api/ai/generate-all-outlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identitas: book.identitas,
          babList: book.babList.map((b) => ({
            id: b.id,
            nomorBab: b.nomorBab,
            judulBab: b.judulBab,
            tiuCpmk: b.tiuCpmk,
            tikSubCpmk: b.tikSubCpmk,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghasilkan kerangka semua bab.');
      }

      const outlineMap = new Map<string, any>();
      (data.outlines || []).forEach((o: any) => {
        outlineMap.set(o.id, o);
      });

      onChangeBook((prev) => ({
        ...prev,
        babList: prev.babList.map((b) => {
          const match = outlineMap.get(b.id);
          if (!match) return b;
          return {
            ...b,
            petaKonsep: match.petaKonsep || b.petaKonsep,
            pendahuluan: b.pendahuluan || match.pendahuluan || '',
            rangkuman: b.rangkuman || match.rangkuman || '',
          };
        }),
        lastUpdated: new Date().toISOString(),
      }));

      onNotify(
        'success',
        `Kerangka Peta Konsep, Pendahuluan & Rangkuman untuk ${book.babList.length} bab berhasil dilengkapi.`
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Gagal menghasilkan kerangka semua bab.'
      );
    } finally {
      setIsGeneratingAllOutlines(false);
    }
  };

  const handleAddChapter = () => {
    const nextNum = book.babList.length + 1;
    const newBab = createChapterSkeleton({
      nomorBab: nextNum,
      pertemuanAsal: `Pertemuan ${nextNum + 1}`,
      judulBab: `Bab ${nextNum}: Topik Baru`,
    });
    onChangeBook((prev) => ({
      ...prev,
      babList: [...prev.babList, newBab],
      lastUpdated: new Date().toISOString(),
    }));
    setSelectedBabId(newBab.id);
  };

  const handleAddQuestion = () => {
    if (!activeBab) return;
    const nextQ: SoalEvaluasi = {
      id: `soal-${Date.now()}`,
      pertanyaan: '',
      levelKognitif: 'C4',
      kunciJawaban: '',
      pedomanPenskoran: '',
      bobotSkor: 25,
    };
    updateActiveBab((bab) => ({
      ...bab,
      latihanSoal: [...bab.latihanSoal, nextQ],
    }));
  };

  const handleRemoveQuestion = (qId: string) => {
    if (!activeBab) return;
    updateActiveBab((bab) => ({
      ...bab,
      latihanSoal: bab.latihanSoal.filter((s) => s.id !== qId),
    }));
  };

  if (!activeBab) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <p className="text-sm text-slate-600 mb-4">Belum ada daftar bab.</p>
        <button
          type="button"
          onClick={handleAddChapter}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0b3d91] text-white text-sm font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Bab Pertama
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Sidebar: Chapter Navigator */}
      <aside className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Struktur Bab ({book.babList.length} Bab)
            </h2>
            <button
              type="button"
              onClick={handleAddChapter}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b3d91] hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Bab
            </button>
          </div>

          <button
            type="button"
            onClick={handleGenerateAllOutlines}
            disabled={isGeneratingAllOutlines}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0f172a] hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {isGeneratingAllOutlines ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ffcc00]" />
                <span>Menyusun Kerangka...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#ffcc00]" />
                <span>Generate Semua Kerangka &amp; Rangkuman Bab</span>
              </>
            )}
          </button>
        </div>

        <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
          {book.babList.map((bab) => {
            const isSelected = bab.id === activeBab.id;
            const isComplete =
              bab.uraianMateri.trim().length > 120 &&
              bab.rangkuman.trim().length > 20;

            return (
              <button
                key={bab.id}
                type="button"
                onClick={() => setSelectedBabId(bab.id)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/90 text-[#0b3d91]'
                    : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-500">
                    <span className={isSelected ? 'text-[#0b3d91]' : ''}>
                      Bab {bab.nomorBab}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{bab.pertemuanAsal}</span>
                  </div>
                  <p
                    className={`text-sm mt-0.5 line-clamp-2 ${
                      isSelected ? 'font-semibold text-[#0b3d91]' : 'font-medium'
                    }`}
                  >
                    {bab.judulBab}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Editor Canvas */}
      <div className="lg:col-span-8 xl:col-span-9 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        {/* Chapter Header & AI Generator */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#0b3d91] mb-1.5">
              <span>BAB {activeBab.nomorBab}</span>
              <span aria-hidden="true">·</span>
              <span>{activeBab.pertemuanAsal}</span>
              <span aria-hidden="true">·</span>
              <span>CPL: {activeBab.kontribusiCpl.join(', ') || '-'}</span>
            </div>
            <input
              type="text"
              value={activeBab.judulBab}
              onChange={(e) =>
                updateActiveBab((b) => ({ ...b, judulBab: e.target.value }))
              }
              className="w-full text-xl font-bold text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-[#0b3d91] focus:bg-white rounded-lg px-2 py-1 -mx-2 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerateSingleChapter}
            disabled={isGeneratingChapter}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0b3d91] hover:bg-[#092f72] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isGeneratingChapter ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#ffcc00]" />
                <span>Menulis Naskah Bab {activeBab.nomorBab}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#ffcc00]" />
                <span>Generate Naskah Lengkap Bab Ini dengan AI</span>
              </>
            )}
          </button>
        </div>

        {/* 1. TIU & TIK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div>
            <label className="block text-xs font-bold text-[#0b3d91] mb-1.5">
              1a. Tujuan Instruksional Umum (TIU / CPMK)
            </label>
            <textarea
              rows={2}
              value={activeBab.tiuCpmk}
              onChange={(e) =>
                updateActiveBab((b) => ({ ...b, tiuCpmk: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#0b3d91] mb-1.5">
              1b. Tujuan Instruksional Khusus (TIK / Sub-CPMK / TKD)
            </label>
            <textarea
              rows={2}
              value={activeBab.tikSubCpmk}
              onChange={(e) =>
                updateActiveBab((b) => ({ ...b, tikSubCpmk: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>
        </div>

        {/* 2. Peta Konsep & Pendahuluan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              2a. Peta Konsep Bab
            </label>
            <textarea
              rows={5}
              value={activeBab.petaKonsep}
              onChange={(e) =>
                updateActiveBab((b) => ({ ...b, petaKonsep: e.target.value }))
              }
              placeholder="Hubungan konsep utama -> sub-konsep -> aplikasi..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              2b. Pendahuluan Bab
            </label>
            <textarea
              rows={5}
              value={activeBab.pendahuluan}
              onChange={(e) =>
                updateActiveBab((b) => ({ ...b, pendahuluan: e.target.value }))
              }
              placeholder="Apersepsi keilmuan dan pengantar ketercapaian TIK..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>
        </div>

        {/* 3. Uraian Materi & Studi Kasus */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              3a. Uraian Materi Komprehensif
            </label>
            <textarea
              rows={11}
              value={activeBab.uraianMateri}
              onChange={(e) =>
                updateActiveBab((b) => ({ ...b, uraianMateri: e.target.value }))
              }
              placeholder="Tuliskan uraian materi mendalam lengkap dengan sub-bab, teori, formulasi, dan contoh konkret..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              3b. Studi Kasus Kontekstual
            </label>
            <textarea
              rows={4}
              value={activeBab.studiKasus}
              onChange={(e) =>
                updateActiveBab((b) => ({ ...b, studiKasus: e.target.value }))
              }
              placeholder="Studi kasus berbasis permasalahan nyata untuk melatih kemampuan analisis mahasiswa..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>
        </div>

        {/* Kotak Khusus Integrasi Riset / PkM Dosen, SDGs & Konteks Kepulauan */}
        <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#0b3d91]">
              Integrasi Hasil Riset / PkM Dosen, Kontribusi SDGs &amp; Konteks Kepulauan
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Khas buku ajar Universitas Pattimura: tautkan materi dengan temuan riset/pengabdian dosen, target SDGs, dan konteks wilayah kepulauan/kelautan.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Integrasi Riset / PkM Dosen
              </label>
              <textarea
                rows={3}
                value={activeBab.integrasiRisetPkmSdgs.topikRisetPkm}
                onChange={(e) =>
                  updateActiveBab((b) => ({
                    ...b,
                    integrasiRisetPkmSdgs: {
                      ...b.integrasiRisetPkmSdgs,
                      topikRisetPkm: e.target.value,
                    },
                  }))
                }
                placeholder="Temuan penelitian atau program PkM dosen..."
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Kontribusi SDGs
              </label>
              <textarea
                rows={3}
                value={activeBab.integrasiRisetPkmSdgs.kontribusiSdgs}
                onChange={(e) =>
                  updateActiveBab((b) => ({
                    ...b,
                    integrasiRisetPkmSdgs: {
                      ...b.integrasiRisetPkmSdgs,
                      kontribusiSdgs: e.target.value,
                    },
                  }))
                }
                placeholder="Contoh: SDG 14 (Ekosistem Lautan), SDG 4..."
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Konteks Kepulauan / Kelautan
              </label>
              <textarea
                rows={3}
                value={activeBab.integrasiRisetPkmSdgs.konteksKepulauan}
                onChange={(e) =>
                  updateActiveBab((b) => ({
                    ...b,
                    integrasiRisetPkmSdgs: {
                      ...b.integrasiRisetPkmSdgs,
                      konteksKepulauan: e.target.value,
                    },
                  }))
                }
                placeholder="Relevansi wilayah Maluku / kepulauan..."
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
            </div>
          </div>
        </div>

        {/* 4. Rangkuman Bab */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            4. Rangkuman Bab
          </label>
          <textarea
            rows={4}
            value={activeBab.rangkuman}
            onChange={(e) =>
              updateActiveBab((b) => ({ ...b, rangkuman: e.target.value }))
            }
            placeholder="Inti sari pokok bahasan bab ini..."
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
          />
        </div>

        {/* 5. Latihan Soal & Pedoman Penskoran */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                5. Latihan Soal &amp; Kisi-Kisi Evaluasi (Kognitif C2–C6)
              </h3>
              <p className="text-xs text-slate-500">
                Setiap soal dikompilasi otomatis ke Tab 3 sebagai masukan langsung bagi Modul 3 (SIRUBRIK).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Soal
            </button>
          </div>

          <div className="space-y-4">
            {activeBab.latihanSoal.map((soal, idx) => (
              <div
                key={soal.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-xs font-bold text-[#0b3d91]">
                    SOAL {idx + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                      <span>Taksonomi:</span>
                      <select
                        value={soal.levelKognitif}
                        onChange={(e) => {
                          const lvl = e.target.value as CognitiveLevel;
                          updateActiveBab((b) => ({
                            ...b,
                            latihanSoal: b.latihanSoal.map((q) =>
                              q.id === soal.id ? { ...q, levelKognitif: lvl } : q
                            ),
                          }));
                        }}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-semibold"
                      >
                        {COGNITIVE_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                      <span>Bobot:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={soal.bobotSkor}
                        onChange={(e) => {
                          const score = Number(e.target.value) || 0;
                          updateActiveBab((b) => ({
                            ...b,
                            latihanSoal: b.latihanSoal.map((q) =>
                              q.id === soal.id ? { ...q, bobotSkor: score } : q
                            ),
                          }));
                        }}
                        className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono tabular-nums"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(soal.id)}
                      title="Hapus soal"
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Butir Pertanyaan
                  </label>
                  <textarea
                    rows={2}
                    value={soal.pertanyaan}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateActiveBab((b) => ({
                        ...b,
                        latihanSoal: b.latihanSoal.map((q) =>
                          q.id === soal.id ? { ...q, pertanyaan: val } : q
                        ),
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kunci Jawaban Ringkas
                    </label>
                    <textarea
                      rows={2}
                      value={soal.kunciJawaban}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActiveBab((b) => ({
                          ...b,
                          latihanSoal: b.latihanSoal.map((q) =>
                            q.id === soal.id ? { ...q, kunciJawaban: val } : q
                          ),
                        }));
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pedoman Penskoran
                    </label>
                    <textarea
                      rows={2}
                      value={soal.pedomanPenskoran}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActiveBab((b) => ({
                          ...b,
                          latihanSoal: b.latihanSoal.map((q) =>
                            q.id === soal.id
                              ? { ...q, pedomanPenskoran: val }
                              : q
                          ),
                        }));
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
