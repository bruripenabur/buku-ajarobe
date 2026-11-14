import React, { useState } from 'react';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { CplItem, CpmkItem, PayloadBukuAjar } from '../types/book';

interface Tab1IdentityMappingProps {
  book: PayloadBukuAjar;
  onChangeBook: (updater: (prev: PayloadBukuAjar) => PayloadBukuAjar) => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const Tab1IdentityMapping: React.FC<Tab1IdentityMappingProps> = ({
  book,
  onChangeBook,
  onNotify,
}) => {
  const [isGeneratingFrontmatter, setIsGeneratingFrontmatter] = useState(false);
  const [newCplKode, setNewCplKode] = useState('');
  const [newCplDesc, setNewCplDesc] = useState('');
  const [newCpmkKode, setNewCpmkKode] = useState('');
  const [newCpmkDesc, setNewCpmkDesc] = useState('');

  const { identitas, cplList, cpmkList, evaluasiSemester, babList } = book;

  const updateIdentity = (field: keyof typeof identitas, value: string) => {
    onChangeBook((prev) => ({
      ...prev,
      identitas: {
        ...prev.identitas,
        [field]: value,
      },
      lastUpdated: new Date().toISOString(),
    }));
  };

  const handleGenerateFrontmatter = async () => {
    if (!identitas.judulBuku.trim() && !identitas.namaMk.trim()) {
      onNotify('error', 'Isi minimal Judul Buku Ajar atau Nama Mata Kuliah terlebih dahulu.');
      return;
    }

    setIsGeneratingFrontmatter(true);
    try {
      const res = await fetch('/api/ai/generate-frontmatter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identitas,
          cplList,
          cpmkList,
          babTitles: babList.map((b) => `Bab ${b.nomorBab}: ${b.judulBab}`),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghasilkan prakata dan sinopsis.');
      }

      onChangeBook((prev) => ({
        ...prev,
        identitas: {
          ...prev.identitas,
          sinopsis: data.sinopsis || prev.identitas.sinopsis,
          prakata: data.prakata || prev.identitas.prakata,
          petunjukPenggunaan: data.petunjukPenggunaan || prev.identitas.petunjukPenggunaan,
        },
        lastUpdated: new Date().toISOString(),
      }));
      onNotify('success', 'Prakata, Sinopsis, dan Petunjuk Penggunaan Buku berhasil disusun.');
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menghubungi layanan AI.'
      );
    } finally {
      setIsGeneratingFrontmatter(false);
    }
  };

  const handleAddCpl = () => {
    if (!newCplKode.trim() || !newCplDesc.trim()) return;
    const item: CplItem = { kode: newCplKode.trim(), deskripsi: newCplDesc.trim() };
    onChangeBook((prev) => ({
      ...prev,
      cplList: [...prev.cplList, item],
      lastUpdated: new Date().toISOString(),
    }));
    setNewCplKode('');
    setNewCplDesc('');
  };

  const handleRemoveCpl = (idx: number) => {
    onChangeBook((prev) => ({
      ...prev,
      cplList: prev.cplList.filter((_, i) => i !== idx),
      lastUpdated: new Date().toISOString(),
    }));
  };

  const handleAddCpmk = () => {
    if (!newCpmkKode.trim() || !newCpmkDesc.trim()) return;
    const item: CpmkItem = {
      kode: newCpmkKode.trim(),
      deskripsi: newCpmkDesc.trim(),
      cplTerkait: cplList.slice(0, 1).map((c) => c.kode),
    };
    onChangeBook((prev) => ({
      ...prev,
      cpmkList: [...prev.cpmkList, item],
      lastUpdated: new Date().toISOString(),
    }));
    setNewCpmkKode('');
    setNewCpmkDesc('');
  };

  const handleRemoveCpmk = (idx: number) => {
    onChangeBook((prev) => ({
      ...prev,
      cpmkList: prev.cpmkList.filter((_, i) => i !== idx),
      lastUpdated: new Date().toISOString(),
    }));
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Book Identity & AI Frontmatter */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 mb-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Identitas Buku Ajar &amp; Bagian Pembuka
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Lengkapi metadata bibliografis standar Perpusnas/Dikti, lalu susun Prakata, Sinopsis, dan Petunjuk Penggunaan Buku.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateFrontmatter}
            disabled={isGeneratingFrontmatter}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0b3d91] hover:bg-[#092f72] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isGeneratingFrontmatter ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#ffcc00]" />
                <span>Menyusun Naskah Pembuka...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#ffcc00]" />
                <span>Generate Prakata, Sinopsis &amp; Petunjuk Penggunaan Buku</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Judul Buku Ajar
            </label>
            <input
              type="text"
              value={identitas.judulBuku}
              onChange={(e) => updateIdentity('judulBuku', e.target.value)}
              placeholder="Contoh: Ekologi Laut Tropis & Pengelolaan Wilayah Pesisir Kepulauan"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kode &amp; Nama Mata Kuliah
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={identitas.kodeMk}
                onChange={(e) => updateIdentity('kodeMk', e.target.value)}
                placeholder="Kode MK"
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
              <input
                type="text"
                value={identitas.namaMk}
                onChange={(e) => updateIdentity('namaMk', e.target.value)}
                placeholder="Nama Mata Kuliah"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subjudul Buku
            </label>
            <input
              type="text"
              value={identitas.subjudul}
              onChange={(e) => updateIdentity('subjudul', e.target.value)}
              placeholder="Pendekatan Outcome-Based Education (OBE) Terintegrasi Riset, PkM, dan SDGs"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tim Penulis (Dosen Pengampu)
            </label>
            <input
              type="text"
              value={identitas.timPenulis}
              onChange={(e) => updateIdentity('timPenulis', e.target.value)}
              placeholder="Nama Lengkap & Gelar Dosen"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Program Studi
            </label>
            <input
              type="text"
              value={identitas.programStudi}
              onChange={(e) => updateIdentity('programStudi', e.target.value)}
              placeholder="Contoh: Manajemen Sumberdaya Perairan"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Fakultas / Institusi
            </label>
            <input
              type="text"
              value={identitas.fakultas}
              onChange={(e) => updateIdentity('fakultas', e.target.value)}
              placeholder="Contoh: Fakultas Perikanan dan Ilmu Kelautan - Universitas Pattimura"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tahun Terbit
              </label>
              <input
                type="text"
                value={identitas.tahunTerbit}
                onChange={(e) => updateIdentity('tahunTerbit', e.target.value)}
                placeholder="2026"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ISBN (Opsional)
              </label>
              <input
                type="text"
                value={identitas.isbn}
                onChange={(e) => updateIdentity('isbn', e.target.value)}
                placeholder="978-602-..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Sinopsis Buku (Ringkasan &amp; Cakupan Keilmuan)
            </label>
            <textarea
              rows={3}
              value={identitas.sinopsis}
              onChange={(e) => updateIdentity('sinopsis', e.target.value)}
              placeholder="Tuliskan sinopsis buku ajar atau gunakan tombol Generate AI di kanan atas..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
            />
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Prakata Penulis (Standar Dikti / Perpusnas)
              </label>
              <textarea
                rows={6}
                value={identitas.prakata}
                onChange={(e) => updateIdentity('prakata', e.target.value)}
                placeholder="Prakata resmi tim penulis Universitas Pattimura..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Petunjuk Penggunaan Buku (Dosen &amp; Mahasiswa)
              </label>
              <textarea
                rows={6}
                value={identitas.petunjukPenggunaan}
                onChange={(e) => updateIdentity('petunjukPenggunaan', e.target.value)}
                placeholder="Panduan alur belajar menggunakan TIU-TIK, Peta Konsep, Integrasi Riset/PkM/SDGs, dan Latihan Soal..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-[#0b3d91]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: CPL & CPMK Reference */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Capaian Pembelajaran Lulusan (CPL)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Daftar CPL yang dibebankan pada mata kuliah dari RPS Modul 1.
          </p>
          <div className="divide-y divide-slate-100 mb-4">
            {cplList.map((cpl, idx) => (
              <div key={`${cpl.kode}-${idx}`} className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-semibold text-[#0b3d91]">{cpl.kode}</span>
                  <p className="text-sm text-slate-700 mt-0.5">{cpl.deskripsi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCpl(idx)}
                  title="Hapus CPL"
                  className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <input
              type="text"
              value={newCplKode}
              onChange={(e) => setNewCplKode(e.target.value)}
              placeholder="CPL-03"
              className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
            />
            <input
              type="text"
              value={newCplDesc}
              onChange={(e) => setNewCplDesc(e.target.value)}
              placeholder="Deskripsi CPL baru..."
              className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={handleAddCpl}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Capaian Pembelajaran Mata Kuliah (CPMK / TIU)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Turunan CPL ke dalam kompetensi umum mata kuliah.
          </p>
          <div className="divide-y divide-slate-100 mb-4">
            {cpmkList.map((cpmk, idx) => (
              <div key={`${cpmk.kode}-${idx}`} className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#0b3d91]">{cpmk.kode}</span>
                    {cpmk.cplTerkait.length > 0 && (
                      <span className="text-xs text-slate-500">
                        · {cpmk.cplTerkait.join(', ')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5">{cpmk.deskripsi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCpmk(idx)}
                  title="Hapus CPMK"
                  className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <input
              type="text"
              value={newCpmkKode}
              onChange={(e) => setNewCpmkKode(e.target.value)}
              placeholder="CPMK-03"
              className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
            />
            <input
              type="text"
              value={newCpmkDesc}
              onChange={(e) => setNewCpmkDesc(e.target.value)}
              placeholder="Deskripsi CPMK baru..."
              className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={handleAddCpmk}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Automatic Mapping Table (Bab -> Sub-CPMK -> CPL + UTS/UAS checkpoints) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Peta Keterkaitan Bab Buku Ajar, Sub-CPMK &amp; Kontribusi CPL
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              16 Pertemuan RPS diturunkan menjadi {babList.length} Bab substansial serta 2 titik evaluasi tengah dan akhir semester.
            </p>
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            Total Bab: <strong className="text-[#0b3d91]">{babList.length} Bab</strong> · Evaluasi: UTS &amp; UAS
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                <th className="py-2.5 px-3 w-24">Bab</th>
                <th className="py-2.5 px-3 w-32">Sumber RPS</th>
                <th className="py-2.5 px-3">Judul Bab / Bahan Kajian</th>
                <th className="py-2.5 px-3">Sub-CPMK (TIK) yang Dibebankan</th>
                <th className="py-2.5 px-3 w-40">Kontribusi CPL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {babList.map((bab, idx) => (
                <React.Fragment key={bab.id}>
                  <tr className="hover:bg-slate-50/70 align-top">
                    <td className="py-3 px-3 font-mono font-semibold text-[#0b3d91] tabular-nums">
                      Bab {bab.nomorBab}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                      {bab.pertemuanAsal}
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={bab.judulBab}
                        onChange={(e) => {
                          const val = e.target.value;
                          onChangeBook((prev) => ({
                            ...prev,
                            babList: prev.babList.map((item) =>
                              item.id === bab.id ? { ...item, judulBab: val } : item
                            ),
                          }));
                        }}
                        className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-[#0b3d91] focus:bg-white rounded px-2 py-1 text-sm font-medium text-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-slate-700 text-xs sm:text-sm leading-relaxed">
                      {bab.tikSubCpmk}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-700">
                      {bab.kontribusiCpl.join(', ') || '-'}
                    </td>
                  </tr>

                  {/* Show UTS checkpoint after Bab 7 (or halfway) */}
                  {idx === Math.min(6, Math.floor(babList.length / 2) - 1) && (
                    <tr className="bg-amber-50/60 border-y border-amber-200/80">
                      <td className="py-2.5 px-3 font-mono text-xs font-bold text-amber-800">
                        UTS
                      </td>
                      <td className="py-2.5 px-3 text-xs font-medium text-amber-800">
                        {evaluasiSemester.uts.minggu}
                      </td>
                      <td colSpan={3} className="py-2.5 px-3 text-xs text-amber-950">
                        <strong>Evaluasi Tengah Semester ({evaluasiSemester.uts.cakupanBab}):</strong>{' '}
                        {evaluasiSemester.uts.deskripsi}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {/* Show UAS checkpoint at end */}
              <tr className="bg-blue-50/60 border-t border-blue-200">
                <td className="py-2.5 px-3 font-mono text-xs font-bold text-[#0b3d91]">
                  UAS
                </td>
                <td className="py-2.5 px-3 text-xs font-medium text-[#0b3d91]">
                  {evaluasiSemester.uas.minggu}
                </td>
                <td colSpan={3} className="py-2.5 px-3 text-xs text-slate-800">
                  <strong>Evaluasi Akhir Semester ({evaluasiSemester.uas.cakupanBab}):</strong>{' '}
                  {evaluasiSemester.uas.deskripsi}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
