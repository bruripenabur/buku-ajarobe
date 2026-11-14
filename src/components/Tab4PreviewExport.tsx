import React, { useState } from 'react';
import { BookOpenCheck, FileDown, FileJson, Printer } from 'lucide-react';
import type { PayloadBukuAjar } from '../types/book';
import { exportBookToWordDoc } from '../utils/docExporter';

const UNPATTI_LOGO_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Logo_Universitas_Pattimura_Terbaru.png/330px-Logo_Universitas_Pattimura_Terbaru.png';

interface Tab4PreviewExportProps {
  book: PayloadBukuAjar;
}

export const Tab4PreviewExport: React.FC<Tab4PreviewExportProps> = ({ book }) => {
  const [pageSize, setPageSize] = useState<'B5' | 'A4'>('B5');
  const [logoError, setLogoError] = useState(false);

  const { identitas, cplList, cpmkList, evaluasiSemester, babList, daftarPustaka } = book;

  const handleExportWord = () => {
    exportBookToWordDoc(book, pageSize);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const safeName = (identitas.judulBuku || identitas.namaMk || 'buku-ajar-obe')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const blob = new Blob([JSON.stringify(book, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName || 'buku-ajar-obe'}-backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Pratinjau Manuskrip Lengkap &amp; Ekspor Siap Cetak
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Tata letak standar buku ajar perguruan tinggi (UNESCO B5 / A4) serta cadangan data JSON lokal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span>Ukuran Cetak:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as 'B5' | 'A4')}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
            >
              <option value="B5">UNESCO B5 (176 × 250 mm)</option>
              <option value="A4">Standar A4 (210 × 297 mm)</option>
            </select>
          </label>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileJson className="w-4 h-4 text-[#0b3d91]" />
            <span>Unduh Data JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportWord}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0b3d91] hover:bg-[#092f72] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-[#ffcc00]" />
            <span>Ekspor Manuskrip ke Word (.doc)</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#ffcc00]" />
            <span>Print / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* Manuscript Preview */}
      <div
        className={`print-only-container mx-auto bg-white border border-slate-200 rounded-xl shadow-sm font-serif text-slate-900 ${
          pageSize === 'B5' ? 'max-w-[760px]' : 'max-w-[880px]'
        } p-8 sm:p-14 space-y-12`}
      >
        {/* 1. Cover Sederhana Unpatti */}
        <section className="text-center border-2 border-[#0b3d91] p-10 sm:p-14 space-y-6">
          <div className="w-20 h-20 mx-auto flex items-center justify-center">
            {!logoError ? (
              <img
                src={UNPATTI_LOGO_URL}
                alt="Logo Universitas Pattimura"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <BookOpenCheck className="w-12 h-12 text-[#0b3d91]" />
            )}
          </div>
          <div className="space-y-1">
            <p className="font-sans text-xs font-bold tracking-widest text-[#0b3d91]">
              UNIVERSITAS PATTIMURA
            </p>
            <p className="font-sans text-xs text-slate-600">
              PUSAT KURIKULUM DAN INOVASI PEMBELAJARAN
            </p>
          </div>

          <div className="pt-6 pb-4 space-y-3">
            <p className="font-sans text-xs font-bold text-amber-700 tracking-wider">
              BUKU AJAR AKADEMIK BERBASIS OBE
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0b3d91] leading-snug">
              {identitas.judulBuku || 'Judul Buku Ajar Akademik'}
            </h1>
            <p className="text-base text-slate-700">
              {identitas.subjudul}
            </p>
          </div>

          <div className="w-28 h-0.5 bg-[#ffcc00] mx-auto" />

          <div className="pt-4 space-y-1.5">
            <p className="text-base font-bold text-slate-900">
              {identitas.timPenulis || 'Tim Penulis Dosen Pengampu'}
            </p>
            <p className="text-sm text-slate-600">
              {identitas.programStudi} · {identitas.fakultas}
            </p>
            <p className="font-sans text-xs text-slate-500 pt-2">
              {identitas.kodeMk && `${identitas.kodeMk} · `}Tahun Terbit {identitas.tahunTerbit}
              {identitas.isbn ? ` · ISBN ${identitas.isbn}` : ''}
            </p>
          </div>
        </section>

        {/* 2. Halaman Judul & Sinopsis */}
        <section className="print-page-break pt-6 border-t border-slate-200 space-y-5">
          <h2 className="text-xl font-bold text-[#0b3d91] border-b border-slate-300 pb-2">
            Identitas Buku &amp; Sinopsis
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2 pr-4 font-semibold w-48">Mata Kuliah / Kode</td>
                <td className="py-2">
                  {identitas.namaMk || '-'} ({identitas.kodeMk || '-'})
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 pr-4 font-semibold">Program Studi / Fakultas</td>
                <td className="py-2">
                  {identitas.programStudi || '-'} / {identitas.fakultas || '-'}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 pr-4 font-semibold">Tim Penulis</td>
                <td className="py-2">{identitas.timPenulis || '-'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 pr-4 font-semibold">Tahun Akademik / Terbit</td>
                <td className="py-2">
                  {identitas.tahunAkademik} / {identitas.tahunTerbit}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 pr-4 font-semibold">ISBN</td>
                <td className="py-2">{identitas.isbn || '-'}</td>
              </tr>
            </tbody>
          </table>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#0b3d91]">Sinopsis</h3>
            <p className="text-sm leading-relaxed whitespace-pre-line text-justify">
              {identitas.sinopsis || '(Sinopsis belum diisi)'}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#0b3d91]">Petunjuk Penggunaan Buku</h3>
            <p className="text-sm leading-relaxed whitespace-pre-line text-justify">
              {identitas.petunjukPenggunaan || '(Petunjuk penggunaan buku belum diisi)'}
            </p>
          </div>
        </section>

        {/* 3. Prakata */}
        <section className="print-page-break pt-6 border-t border-slate-200 space-y-4">
          <h2 className="text-xl font-bold text-[#0b3d91] border-b border-slate-300 pb-2">
            Prakata
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-justify">
            {identitas.prakata || '(Prakata belum diisi. Gunakan generator AI pada Tab 1 atau tulis secara manual.)'}
          </p>
        </section>

        {/* 4. Daftar Isi & Peta CPL-CPMK */}
        <section className="print-page-break pt-6 border-t border-slate-200 space-y-5">
          <h2 className="text-xl font-bold text-[#0b3d91] border-b border-slate-300 pb-2">
            Daftar Isi &amp; Peta Capaian Pembelajaran
          </h2>
          <div className="divide-y divide-dotted divide-slate-300 text-sm">
            {babList.map((b) => (
              <div key={b.id} className="py-2 flex items-baseline justify-between gap-4">
                <span>
                  <strong>Bab {b.nomorBab}.</strong> {b.judulBab}
                </span>
                <span className="font-sans text-xs text-slate-500 whitespace-nowrap">
                  {b.pertemuanAsal}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs space-y-1.5 font-sans">
            <p>
              <strong>Evaluasi Tengah Semester ({evaluasiSemester.uts.minggu}):</strong>{' '}
              Cakupan {evaluasiSemester.uts.cakupanBab} — {evaluasiSemester.uts.deskripsi}
            </p>
            <p>
              <strong>Evaluasi Akhir Semester ({evaluasiSemester.uas.minggu}):</strong>{' '}
              Cakupan {evaluasiSemester.uas.cakupanBab} — {evaluasiSemester.uas.deskripsi}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-bold text-[#0b3d91] mb-1.5">Capaian Pembelajaran Lulusan (CPL)</h4>
              <ul className="list-disc pl-4 space-y-1">
                {cplList.map((c, i) => (
                  <li key={`${c.kode}-${i}`}>
                    <strong>{c.kode}:</strong> {c.deskripsi}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#0b3d91] mb-1.5">CPMK Mata Kuliah</h4>
              <ul className="list-disc pl-4 space-y-1">
                {cpmkList.map((m, i) => (
                  <li key={`${m.kode}-${i}`}>
                    <strong>{m.kode}:</strong> {m.deskripsi}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Seluruh Bab */}
        {babList.map((bab) => (
          <article
            key={bab.id}
            className="print-page-break pt-8 border-t-2 border-[#0b3d91] space-y-5"
          >
            <div>
              <p className="font-sans text-xs font-bold tracking-wider text-[#0b3d91]">
                BAB {bab.nomorBab} · {bab.pertemuanAsal.toUpperCase()}
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">{bab.judulBab}</h2>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs font-sans space-y-1.5">
              <p>
                <strong>TIU (CPMK):</strong> {bab.tiuCpmk}
              </p>
              <p>
                <strong>TIK (Sub-CPMK / TKD):</strong> {bab.tikSubCpmk}
              </p>
              <p>
                <strong>Kontribusi CPL:</strong> {bab.kontribusiCpl.join(', ') || '-'}
              </p>
            </div>

            {bab.petaKonsep && (
              <div className="rounded-lg border border-slate-200 p-4 text-sm space-y-1">
                <h3 className="font-sans text-xs font-bold text-[#0b3d91] uppercase tracking-wide">
                  Peta Konsep
                </h3>
                <p className="whitespace-pre-line leading-relaxed">{bab.petaKonsep}</p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#0b3d91]">A. Pendahuluan</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line text-justify">
                {bab.pendahuluan || '(Pendahuluan bab belum diisi)'}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#0b3d91]">B. Uraian Materi</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line text-justify">
                {bab.uraianMateri || '(Uraian materi belum diisi)'}
              </p>
            </div>

            {bab.studiKasus && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900">Studi Kasus Kontekstual</h4>
                <p className="text-sm leading-relaxed whitespace-pre-line text-justify">
                  {bab.studiKasus}
                </p>
              </div>
            )}

            <div className="print-avoid-break rounded-lg border border-amber-300 bg-amber-50/50 p-4 space-y-1.5 text-sm">
              <h4 className="font-sans text-xs font-bold text-[#0b3d91]">
                Integrasi Hasil Riset / PkM Dosen, Kontribusi SDGs &amp; Konteks Kepulauan
              </h4>
              <p>
                <strong>Riset / PkM Dosen:</strong>{' '}
                {bab.integrasiRisetPkmSdgs.topikRisetPkm || '-'}
              </p>
              <p>
                <strong>Kontribusi SDGs:</strong>{' '}
                {bab.integrasiRisetPkmSdgs.kontribusiSdgs || '-'}
              </p>
              <p>
                <strong>Konteks Kepulauan / Kelautan:</strong>{' '}
                {bab.integrasiRisetPkmSdgs.konteksKepulauan || '-'}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#0b3d91]">C. Rangkuman</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line text-justify">
                {bab.rangkuman || '(Rangkuman bab belum diisi)'}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-bold text-[#0b3d91]">
                D. Latihan Soal &amp; Pedoman Penskoran
              </h3>
              {bab.latihanSoal.map((s, idx) => (
                <div
                  key={s.id}
                  className="print-avoid-break rounded-lg border border-slate-200 p-3.5 text-sm space-y-1"
                >
                  <p className="font-sans text-xs font-semibold text-slate-600">
                    Soal {idx + 1} · Level {s.levelKognitif} · Bobot {s.bobotSkor}
                  </p>
                  <p className="font-medium">{s.pertanyaan}</p>
                  <p className="text-xs text-slate-700">
                    <strong>Kunci Jawaban:</strong> {s.kunciJawaban}
                  </p>
                  <p className="text-xs text-slate-700">
                    <strong>Pedoman Penskoran:</strong> {s.pedomanPenskoran}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}

        {/* 6. Daftar Pustaka */}
        <section className="print-page-break pt-6 border-t-2 border-[#0b3d91] space-y-4">
          <h2 className="text-xl font-bold text-[#0b3d91] border-b border-slate-300 pb-2">
            Daftar Pustaka
          </h2>
          {daftarPustaka.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada daftar pustaka.</p>
          ) : (
            <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
              {daftarPustaka.map((r) => (
                <li key={r.id}>
                  <span className="font-sans text-xs text-slate-500 mr-1.5">
                    [{r.kategori} · {r.gayaSitasi}]
                  </span>
                  {r.sitasi}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
};
