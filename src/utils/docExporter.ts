import type { PayloadBukuAjar } from '../types/book';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraphsToHtml(text: string): string {
  const cleaned = String(text || '').trim();
  if (!cleaned) return '<p><em>(Belum diisi)</em></p>';
  return cleaned
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((l) => escapeHtml(l))
        .join('<br/>');
      return `<p style="text-align: justify; line-height: 1.65; margin: 0 0 10pt 0;">${lines}</p>`;
    })
    .join('');
}

export function exportBookToWordDoc(book: PayloadBukuAjar, pageSize: 'B5' | 'A4' = 'B5'): void {
  const { identitas, cplList, cpmkList, evaluasiSemester, babList, daftarPustaka } = book;
  const pageDims = pageSize === 'B5' ? '176mm 250mm' : '210mm 297mm';

  const tocHtml = babList
    .map(
      (bab) => `
      <tr>
        <td style="padding: 4pt 6pt; border-bottom: 1px dotted #cbd5e1; font-weight: 600;">Bab ${bab.nomorBab}</td>
        <td style="padding: 4pt 6pt; border-bottom: 1px dotted #cbd5e1;">${escapeHtml(bab.judulBab)}</td>
        <td style="padding: 4pt 6pt; border-bottom: 1px dotted #cbd5e1; text-align: right; color: #475569;">${escapeHtml(bab.pertemuanAsal)}</td>
      </tr>`
    )
    .join('');

  const chaptersHtml = babList
    .map((bab) => {
      const soalHtml = bab.latihanSoal
        .map(
          (s, i) => `
          <div style="margin-bottom: 10pt; padding: 8pt; border: 1px solid #cbd5e1; background: #f8fafc;">
            <p style="margin: 0 0 4pt 0; font-weight: 600;">Soal ${i + 1} [Level Kognitif ${escapeHtml(s.levelKognitif)} · Bobot ${s.bobotSkor}]</p>
            <p style="margin: 0 0 6pt 0;">${escapeHtml(s.pertanyaan)}</p>
            <p style="margin: 0 0 3pt 0; font-size: 9.5pt; color: #334155;"><strong>Kunci Jawaban:</strong> ${escapeHtml(s.kunciJawaban)}</p>
            <p style="margin: 0; font-size: 9.5pt; color: #334155;"><strong>Pedoman Penskoran:</strong> ${escapeHtml(s.pedomanPenskoran)}</p>
          </div>`
        )
        .join('');

      return `
      <div style="page-break-before: always;">
        <p style="font-size: 10pt; font-weight: 700; color: #0b3d91; letter-spacing: 0.08em; margin: 0 0 4pt 0;">
          BAB ${bab.nomorBab} · ${escapeHtml(bab.pertemuanAsal).toUpperCase()}
        </p>
        <h2 style="font-size: 16pt; color: #0f172a; border-bottom: 2px solid #0b3d91; padding-bottom: 6pt; margin: 0 0 12pt 0;">
          ${escapeHtml(bab.judulBab)}
        </h2>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12pt; font-size: 10pt;">
          <tr>
            <td style="width: 28%; padding: 6pt; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: 600;">TIU (CPMK)</td>
            <td style="padding: 6pt; border: 1px solid #cbd5e1;">${escapeHtml(bab.tiuCpmk)}</td>
          </tr>
          <tr>
            <td style="padding: 6pt; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: 600;">TIK (Sub-CPMK / TKD)</td>
            <td style="padding: 6pt; border: 1px solid #cbd5e1;">${escapeHtml(bab.tikSubCpmk)}</td>
          </tr>
          <tr>
            <td style="padding: 6pt; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: 600;">Kontribusi CPL</td>
            <td style="padding: 6pt; border: 1px solid #cbd5e1;">${escapeHtml(bab.kontribusiCpl.join(', '))}</td>
          </tr>
        </table>

        <h3 style="font-size: 12pt; color: #0b3d91; margin: 12pt 0 6pt 0;">A. Peta Konsep &amp; Pendahuluan</h3>
        ${bab.petaKonsep ? `<div style="padding: 8pt; border: 1px solid #cbd5e1; background: #f8fafc; margin-bottom: 8pt;"><strong>Peta Konsep:</strong><br/>${paragraphsToHtml(bab.petaKonsep)}</div>` : ''}
        ${paragraphsToHtml(bab.pendahuluan)}

        <h3 style="font-size: 12pt; color: #0b3d91; margin: 12pt 0 6pt 0;">B. Uraian Materi</h3>
        ${paragraphsToHtml(bab.uraianMateri)}

        ${
          bab.studiKasus
            ? `<h4 style="font-size: 11pt; color: #0f172a; margin: 10pt 0 4pt 0;">Studi Kasus Kontekstual</h4>${paragraphsToHtml(bab.studiKasus)}`
            : ''
        }

        <div style="margin: 12pt 0; padding: 10pt; border: 1px solid #eab308; background: #fefce8;">
          <p style="margin: 0 0 4pt 0; font-weight: 700; color: #0b3d91;">Integrasi Hasil Riset / PkM Dosen, Kontribusi SDGs &amp; Konteks Kepulauan</p>
          <p style="margin: 0 0 4pt 0;"><strong>Riset / PkM Dosen:</strong> ${escapeHtml(bab.integrasiRisetPkmSdgs.topikRisetPkm || '-')}</p>
          <p style="margin: 0 0 4pt 0;"><strong>Kontribusi SDGs:</strong> ${escapeHtml(bab.integrasiRisetPkmSdgs.kontribusiSdgs || '-')}</p>
          <p style="margin: 0;"><strong>Konteks Kepulauan / Kelautan:</strong> ${escapeHtml(bab.integrasiRisetPkmSdgs.konteksKepulauan || '-')}</p>
        </div>

        <h3 style="font-size: 12pt; color: #0b3d91; margin: 12pt 0 6pt 0;">C. Rangkuman</h3>
        ${paragraphsToHtml(bab.rangkuman)}

        <h3 style="font-size: 12pt; color: #0b3d91; margin: 12pt 0 6pt 0;">D. Latihan Soal &amp; Pedoman Penskoran</h3>
        ${soalHtml || '<p>Belum ada latihan soal.</p>'}
      </div>`;
    })
    .join('');

  const refsHtml =
    daftarPustaka.length > 0
      ? `<ol style="padding-left: 18pt; line-height: 1.6;">${daftarPustaka
          .map(
            (r) =>
              `<li style="margin-bottom: 6pt;">[${escapeHtml(r.kategori)} · ${escapeHtml(r.gayaSitasi)}] ${escapeHtml(r.sitasi)}</li>`
          )
          .join('')}</ol>`
      : '<p><em>Belum ada daftar pustaka yang ditambahkan.</em></p>';

  const docHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(identitas.judulBuku || 'Buku Ajar Akademik')}</title>
      <style>
        @page {
          size: ${pageDims};
          margin: 22mm 20mm 22mm 24mm;
        }
        body {
          font-family: "Times New Roman", Georgia, serif;
          font-size: 11pt;
          color: #0f172a;
        }
      </style>
    </head>
    <body>
      <!-- COVER -->
      <div style="text-align: center; padding: 36pt 20pt; border: 3px solid #0b3d91; background: #ffffff;">
        <p style="font-size: 11pt; font-weight: 700; color: #0b3d91; letter-spacing: 0.1em; margin: 0 0 6pt 0;">
          UNIVERSITAS PATTIMURA
        </p>
        <p style="font-size: 10pt; color: #475569; margin: 0 0 32pt 0;">
          PUSAT KURIKULUM DAN INOVASI PEMBELAJARAN
        </p>
        <p style="font-size: 10pt; font-weight: 700; color: #b45309; margin: 0 0 10pt 0;">
          BUKU AJAR AKADEMIK BERBASIS OBE
        </p>
        <h1 style="font-size: 22pt; color: #0b3d91; margin: 0 0 10pt 0;">
          ${escapeHtml(identitas.judulBuku || 'Judul Buku Ajar')}
        </h1>
        <p style="font-size: 12pt; color: #334155; margin: 0 0 36pt 0;">
          ${escapeHtml(identitas.subjudul)}
        </p>
        <div style="border-top: 2px solid #eab308; width: 120pt; margin: 0 auto 24pt auto;"></div>
        <p style="font-size: 12pt; font-weight: 700; margin: 0 0 6pt 0;">
          ${escapeHtml(identitas.timPenulis || 'Tim Penulis Dosen Pengampu')}
        </p>
        <p style="font-size: 10.5pt; color: #475569; margin: 0 0 28pt 0;">
          ${escapeHtml(identitas.programStudi)} · ${escapeHtml(identitas.fakultas)}
        </p>
        <p style="font-size: 10pt; color: #475569; margin: 0;">
          ${escapeHtml(identitas.kodeMk)} · Tahun Terbit ${escapeHtml(identitas.tahunTerbit)}
          ${identitas.isbn ? ` · ISBN: ${escapeHtml(identitas.isbn)}` : ''}
        </p>
      </div>

      <!-- HALAMAN JUDUL & SINOPSIS -->
      <div style="page-break-before: always;">
        <h2 style="font-size: 15pt; color: #0b3d91; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt;">Identitas &amp; Sinopsis Buku</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14pt; font-size: 10pt;">
          <tr><td style="padding: 5pt; border: 1px solid #cbd5e1; width: 32%; font-weight: 600;">Mata Kuliah / Kode</td><td style="padding: 5pt; border: 1px solid #cbd5e1;">${escapeHtml(identitas.namaMk)} (${escapeHtml(identitas.kodeMk)})</td></tr>
          <tr><td style="padding: 5pt; border: 1px solid #cbd5e1; font-weight: 600;">Program Studi / Fakultas</td><td style="padding: 5pt; border: 1px solid #cbd5e1;">${escapeHtml(identitas.programStudi)} / ${escapeHtml(identitas.fakultas)}</td></tr>
          <tr><td style="padding: 5pt; border: 1px solid #cbd5e1; font-weight: 600;">Tim Penulis</td><td style="padding: 5pt; border: 1px solid #cbd5e1;">${escapeHtml(identitas.timPenulis)}</td></tr>
          <tr><td style="padding: 5pt; border: 1px solid #cbd5e1; font-weight: 600;">Tahun Akademik / Terbit</td><td style="padding: 5pt; border: 1px solid #cbd5e1;">${escapeHtml(identitas.tahunAkademik)} / ${escapeHtml(identitas.tahunTerbit)}</td></tr>
          <tr><td style="padding: 5pt; border: 1px solid #cbd5e1; font-weight: 600;">ISBN</td><td style="padding: 5pt; border: 1px solid #cbd5e1;">${escapeHtml(identitas.isbn || '-')}</td></tr>
        </table>
        <h3 style="font-size: 12pt; color: #0b3d91;">Sinopsis</h3>
        ${paragraphsToHtml(identitas.sinopsis)}
        <h3 style="font-size: 12pt; color: #0b3d91; margin-top: 12pt;">Petunjuk Penggunaan Buku</h3>
        ${paragraphsToHtml(identitas.petunjukPenggunaan)}
      </div>

      <!-- PRAKATA -->
      <div style="page-break-before: always;">
        <h2 style="font-size: 15pt; color: #0b3d91; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt;">Prakata</h2>
        ${paragraphsToHtml(identitas.prakata)}
      </div>

      <!-- DAFTAR ISI & PETA CPL-CPMK -->
      <div style="page-break-before: always;">
        <h2 style="font-size: 15pt; color: #0b3d91; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt;">Daftar Isi</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16pt; font-size: 10.5pt;">
          ${tocHtml}
        </table>
        <h3 style="font-size: 12pt; color: #0b3d91; margin-top: 12pt;">Evaluasi Tengah &amp; Akhir Semester (RPS)</h3>
        <p style="margin: 4pt 0;"><strong>UTS (${escapeHtml(evaluasiSemester.uts.minggu)}):</strong> Cakupan ${escapeHtml(evaluasiSemester.uts.cakupanBab)} — ${escapeHtml(evaluasiSemester.uts.deskripsi)}</p>
        <p style="margin: 4pt 0;"><strong>UAS (${escapeHtml(evaluasiSemester.uas.minggu)}):</strong> Cakupan ${escapeHtml(evaluasiSemester.uas.cakupanBab)} — ${escapeHtml(evaluasiSemester.uas.deskripsi)}</p>
        <h3 style="font-size: 12pt; color: #0b3d91; margin-top: 12pt;">Capaian Pembelajaran Lulusan (CPL) &amp; CPMK</h3>
        <ul>
          ${cplList.map((c) => `<li><strong>${escapeHtml(c.kode)}:</strong> ${escapeHtml(c.deskripsi)}</li>`).join('')}
        </ul>
        <ul>
          ${cpmkList.map((m) => `<li><strong>${escapeHtml(m.kode)}</strong> (${escapeHtml(m.cplTerkait.join(', '))}): ${escapeHtml(m.deskripsi)}</li>`).join('')}
        </ul>
      </div>

      ${chaptersHtml}

      <!-- DAFTAR PUSTAKA -->
      <div style="page-break-before: always;">
        <h2 style="font-size: 15pt; color: #0b3d91; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt;">Daftar Pustaka</h2>
        ${refsHtml}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (identitas.judulBuku || 'buku-ajar-obe')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  a.href = url;
  a.download = `${safeName || 'buku-ajar-obe'}-${pageSize.toLowerCase()}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
