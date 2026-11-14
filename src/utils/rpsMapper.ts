import type {
  BabBukuAjar,
  CplItem,
  CpmkItem,
  PayloadBukuAjar,
  ReferensiItem,
  RpsRecord,
  SoalEvaluasi,
} from '../types/book';

function makeId(prefix: string, index: number): string {
  return `${prefix}-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          return String(obj.kode || obj.code || obj.id || obj.label || '').trim();
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof val === 'string' && val.trim()) {
    return val
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function createDefaultQuestion(babNumber: number, tik: string): SoalEvaluasi {
  return {
    id: makeId('soal', babNumber),
    pertanyaan: `Jelaskan konsep utama pada Bab ${babNumber} dan analisislah penerapannya untuk mencapai kompetensi: ${tik || 'kemampuan analisis mahasiswa'}.`,
    levelKognitif: babNumber <= 4 ? 'C2' : babNumber <= 10 ? 'C4' : 'C5',
    kunciJawaban: 'Mahasiswa mampu menguraikan definisi konseptual, mekanisme kerja, serta memberikan argumentasi analitis berbasis studi kasus.',
    pedomanPenskoran: 'Ketepatan konsep (40%), kedalaman analisis kasus (40%), sistematika & rujukan ilmiah (20%).',
    bobotSkor: 25,
  };
}

export function createChapterSkeleton(params: {
  nomorBab: number;
  pertemuanAsal: string;
  judulBab: string;
  tiuCpmk?: string;
  tikSubCpmk?: string;
  kontribusiCpl?: string[];
  uraianSeed?: string;
}): BabBukuAjar {
  const tik =
    params.tikSubCpmk?.trim() ||
    `Mahasiswa mampu menguasai dan menerapkan pokok bahasan ${params.judulBab} secara sistematis.`;

  return {
    id: makeId('bab', params.nomorBab),
    nomorBab: params.nomorBab,
    pertemuanAsal: params.pertemuanAsal,
    judulBab: params.judulBab,
    tiuCpmk:
      params.tiuCpmk?.trim() ||
      'Mampu menganalisis konsep teoretis dan aplikatif berbasis capaian pembelajaran mata kuliah (CPMK).',
    tikSubCpmk: tik,
    kontribusiCpl:
      params.kontribusiCpl && params.kontribusiCpl.length > 0
        ? params.kontribusiCpl
        : ['CPL-01', 'CPL-02'],
    petaKonsep: '',
    pendahuluan: '',
    uraianMateri: params.uraianSeed || '',
    studiKasus: '',
    integrasiRisetPkmSdgs: {
      topikRisetPkm: '',
      kontribusiSdgs: '',
      konteksKepulauan: '',
    },
    rangkuman: '',
    latihanSoal: [createDefaultQuestion(params.nomorBab, tik)],
  };
}

export function mapRpsToBookPayload(rps: RpsRecord): PayloadBukuAjar {
  const p = (rps.payload_rps || {}) as Record<string, any>;
  const currentYear = String(new Date().getFullYear());

  // Extract CPL list
  const rawCpls = p.cpl || p.cpl_list || p.capaian_pembelajaran_lulusan || p.daftar_cpl || [];
  const cplList: CplItem[] = Array.isArray(rawCpls)
    ? rawCpls.map((item: any, idx: number) => {
        if (typeof item === 'string') {
          return { kode: `CPL-${String(idx + 1).padStart(2, '0')}`, deskripsi: item };
        }
        return {
          kode: String(item.kode || item.code || item.id || `CPL-${String(idx + 1).padStart(2, '0')}`),
          deskripsi: String(item.deskripsi || item.uraian || item.description || item.nama || ''),
        };
      })
    : [];

  // Extract CPMK list
  const rawCpmks = p.cpmk || p.cpmk_list || p.capaian_pembelajaran_mk || p.daftar_cpmk || [];
  const cpmkList: CpmkItem[] = Array.isArray(rawCpmks)
    ? rawCpmks.map((item: any, idx: number) => {
        if (typeof item === 'string') {
          return {
            kode: `CPMK-${String(idx + 1).padStart(2, '0')}`,
            deskripsi: item,
            cplTerkait: cplList.slice(0, 1).map((c) => c.kode),
          };
        }
        return {
          kode: String(item.kode || item.code || item.id || `CPMK-${String(idx + 1).padStart(2, '0')}`),
          deskripsi: String(item.deskripsi || item.uraian || item.description || ''),
          cplTerkait: normalizeStringArray(item.cpl || item.cpl_terkait || item.cplTerkait),
        };
      })
    : [];

  // Extract 16-week meetings / bahan kajian
  const rawMeetings =
    p.pertemuan ||
    p.rencana_pembelajaran ||
    p.minggu ||
    p.jadwal_pertemuan ||
    p.bahan_kajian ||
    p.matriks_rps ||
    [];

  let utsInfo = {
    minggu: 'Pertemuan 8',
    cakupanBab: 'Bab 1 – Bab 7',
    deskripsi:
      'Evaluasi Tengah Semester (UTS) mengukur penguasaan konsep dasar dan analisis sub-CPMK paruh pertama perkuliahan.',
  };
  let uasInfo = {
    minggu: 'Pertemuan 16',
    cakupanBab: 'Bab 8 – Bab 14',
    deskripsi:
      'Evaluasi Akhir Semester (UAS) mengukur kemampuan sintesis, evaluasi, dan pemecahan masalah berbasis proyek/studi kasus.',
  };

  const babList: BabBukuAjar[] = [];

  if (Array.isArray(rawMeetings) && rawMeetings.length > 0) {
    let chapterCounter = 1;

    rawMeetings.forEach((m: any, idx: number) => {
      const weekNum = Number(m.minggu || m.pertemuan || m.pertemuan_ke || idx + 1);
      const rawTitle = String(
        m.bahan_kajian ||
          m.materi ||
          m.topik ||
          m.pokok_bahasan ||
          m.judul ||
          `Pokok Bahasan Pertemuan ${weekNum}`
      ).trim();

      const combinedText = `${rawTitle} ${String(m.bentuk_pembelajaran || m.metode || m.jenis || '')}`.toLowerCase();

      const isUts =
        combinedText.includes('uts') ||
        combinedText.includes('evaluasi tengah') ||
        combinedText.includes('ujian tengah') ||
        (weekNum === 8 && rawMeetings.length >= 15 && combinedText.includes('evaluasi'));

      const isUas =
        combinedText.includes('uas') ||
        combinedText.includes('evaluasi akhir') ||
        combinedText.includes('ujian akhir') ||
        (weekNum === 16 && rawMeetings.length >= 15 && combinedText.includes('evaluasi'));

      if (isUts) {
        utsInfo = {
          minggu: `Pertemuan ${weekNum}`,
          cakupanBab: `Bab 1 – Bab ${Math.max(1, chapterCounter - 1)}`,
          deskripsi: String(
            m.sub_cpmk || m.indikator || m.deskripsi || utsInfo.deskripsi
          ),
        };
        return;
      }

      if (isUas) {
        uasInfo = {
          minggu: `Pertemuan ${weekNum}`,
          cakupanBab: `Bab ${Math.min(chapterCounter, 8)} – Bab ${Math.max(1, chapterCounter - 1)}`,
          deskripsi: String(
            m.sub_cpmk || m.indikator || m.deskripsi || uasInfo.deskripsi
          ),
        };
        return;
      }

      const subCpmk = String(
        m.sub_cpmk || m.kemampuan_akhir || m.indikator || m.tik || ''
      ).trim();

      const linkedCpmkCode = String(m.cpmk || m.kode_cpmk || '').trim();
      const matchedCpmk = cpmkList.find(
        (c) => c.kode.toLowerCase() === linkedCpmkCode.toLowerCase()
      );
      const tiuText = matchedCpmk
        ? `${matchedCpmk.kode}: ${matchedCpmk.deskripsi}`
        : String(m.tiu || m.cpmk_deskripsi || cpmkList[0]?.deskripsi || '');

      const cplFromMeeting = normalizeStringArray(m.cpl || m.cpl_terkait);
      const finalCpls =
        cplFromMeeting.length > 0
          ? cplFromMeeting
          : matchedCpmk && matchedCpmk.cplTerkait.length > 0
          ? matchedCpmk.cplTerkait
          : cplList.slice(0, 2).map((c) => c.kode);

      const uraianSeed = [
        m.indikator ? `Indikator Capaian: ${String(m.indikator)}` : '',
        m.metode_pembelajaran ? `Strategi Pembelajaran RPS: ${String(m.metode_pembelajaran)}` : '',
        m.pengalaman_belajar ? `Pengalaman Belajar: ${String(m.pengalaman_belajar)}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      babList.push(
        createChapterSkeleton({
          nomorBab: chapterCounter,
          pertemuanAsal: `Pertemuan ${weekNum}`,
          judulBab: rawTitle,
          tiuCpmk: tiuText,
          tikSubCpmk: subCpmk,
          kontribusiCpl: finalCpls,
          uraianSeed,
        })
      );

      chapterCounter += 1;
    });
  }

  // Fallback if RPS didn't provide meetings array
  if (babList.length === 0) {
    for (let i = 1; i <= 14; i++) {
      const cpmk = cpmkList[(i - 1) % Math.max(1, cpmkList.length)];
      babList.push(
        createChapterSkeleton({
          nomorBab: i,
          pertemuanAsal: `Pertemuan ${i >= 8 ? i + 1 : i}`,
          judulBab: `Pokok Bahasan ${i}: ${rps.nama_mk}`,
          tiuCpmk: cpmk ? `${cpmk.kode}: ${cpmk.deskripsi}` : undefined,
          kontribusiCpl: cpmk?.cplTerkait,
        })
      );
    }
  } else {
    // Re-sync UAS chapter range with final babList length
    const midIdx = Math.min(7, babList.length);
    if (!utsInfo.cakupanBab || utsInfo.cakupanBab === 'Bab 1 – Bab 0') {
      utsInfo.cakupanBab = `Bab 1 – Bab ${midIdx}`;
    }
    uasInfo.cakupanBab = `Bab ${Math.min(midIdx + 1, babList.length)} – Bab ${babList.length}`;
  }

  // Extract Pustaka / References
  const rawRefs = p.pustaka || p.referensi || p.daftar_pustaka || [];
  const daftarPustaka: ReferensiItem[] = [];
  if (Array.isArray(rawRefs)) {
    rawRefs.forEach((ref: any, idx: number) => {
      if (typeof ref === 'string' && ref.trim()) {
        const yearMatch = ref.match(/\b(19|20)\d{2}\b/);
        daftarPustaka.push({
          id: makeId('ref', idx),
          kategori: idx < 3 ? 'Utama' : 'Pendukung',
          gayaSitasi: 'APA',
          sitasi: ref.trim(),
          tahun: yearMatch ? yearMatch[0] : currentYear,
        });
      } else if (ref && typeof ref === 'object') {
        const text = String(ref.sitasi || ref.judul || ref.referensi || ref.citation || '').trim();
        if (text) {
          const yearMatch = text.match(/\b(19|20)\d{2}\b/);
          daftarPustaka.push({
            id: makeId('ref', idx),
            kategori:
              ref.kategori === 'Pendukung' || ref.jenis === 'Pendukung'
                ? 'Pendukung'
                : 'Utama',
            gayaSitasi: ref.gaya === 'IEEE' ? 'IEEE' : 'APA',
            sitasi: text,
            tahun: String(ref.tahun || (yearMatch ? yearMatch[0] : currentYear)),
          });
        }
      }
    });
  } else if (rawRefs && typeof rawRefs === 'object') {
    const utama = Array.isArray(rawRefs.utama) ? rawRefs.utama : [];
    const pendukung = Array.isArray(rawRefs.pendukung) ? rawRefs.pendukung : [];
    utama.forEach((u: any, idx: number) => {
      const text = String(u).trim();
      if (text) {
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        daftarPustaka.push({
          id: makeId('ref-u', idx),
          kategori: 'Utama',
          gayaSitasi: 'APA',
          sitasi: text,
          tahun: yearMatch ? yearMatch[0] : currentYear,
        });
      }
    });
    pendukung.forEach((pd: any, idx: number) => {
      const text = String(pd).trim();
      if (text) {
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        daftarPustaka.push({
          id: makeId('ref-p', idx),
          kategori: 'Pendukung',
          gayaSitasi: 'APA',
          sitasi: text,
          tahun: yearMatch ? yearMatch[0] : currentYear,
        });
      }
    });
  }

  return {
    identitas: {
      judulBuku: `Buku Ajar ${rps.nama_mk}`,
      subjudul: `Pendekatan Outcome-Based Education (OBE) Terintegrasi Riset, PkM, dan SDGs`,
      kodeMk: rps.kode_mk || '',
      namaMk: rps.nama_mk || '',
      timPenulis: rps.dosen_pengampu || '',
      programStudi: rps.prodi || '',
      fakultas: String(p.fakultas || p.identitas?.fakultas || 'Universitas Pattimura'),
      tahunTerbit: currentYear,
      tahunAkademik: rps.tahun_akademik || `${currentYear}/${Number(currentYear) + 1}`,
      isbn: '',
      sinopsis: String(p.deskripsi_mk || p.deskripsi || p.sinopsis || ''),
      prakata: '',
      petunjukPenggunaan: '',
      targetPembaca: `Mahasiswa Program Studi ${rps.prodi || 'Sarjana'} — Universitas Pattimura`,
    },
    cplList:
      cplList.length > 0
        ? cplList
        : [
            {
              kode: 'CPL-01',
              deskripsi: 'Menguasai konsep teoretis bidang keilmuan secara mendalam dan kontekstual.',
            },
            {
              kode: 'CPL-02',
              deskripsi: 'Mampu menerapkan pemikiran logis, kritis, sistematis, dan inovatif dalam konteks kepulauan & SDGs.',
            },
          ],
    cpmkList:
      cpmkList.length > 0
        ? cpmkList
        : [
            {
              kode: 'CPMK-01',
              deskripsi: `Mampu menjelaskan dan menganalisis prinsip dasar ${rps.nama_mk}.`,
              cplTerkait: ['CPL-01'],
            },
            {
              kode: 'CPMK-02',
              deskripsi: `Mampu merancang solusi berbasis studi kasus dan riset terkini pada ${rps.nama_mk}.`,
              cplTerkait: ['CPL-02'],
            },
          ],
    evaluasiSemester: {
      uts: utsInfo,
      uas: uasInfo,
    },
    babList,
    daftarPustaka,
    lastUpdated: new Date().toISOString(),
  };
}

export function createEmptyManualBook(): PayloadBukuAjar {
  const currentYear = String(new Date().getFullYear());
  const babList: BabBukuAjar[] = [];

  for (let i = 1; i <= 14; i++) {
    const meetingNum = i >= 8 ? i + 1 : i;
    babList.push(
      createChapterSkeleton({
        nomorBab: i,
        pertemuanAsal: `Pertemuan ${meetingNum}`,
        judulBab: `Bab ${i}: Topik Pembelajaran ${i}`,
        tiuCpmk: i <= 7 ? 'CPMK-01: Penguasaan konsep fondasional dan prinsip analisis.' : 'CPMK-02: Penerapan studi kasus, riset terapan, dan evaluasi kritis.',
        tikSubCpmk: `Sub-CPMK ${i}: Mahasiswa mampu menguraikan dan mengaplikasikan materi pertemuan ${meetingNum}.`,
        kontribusiCpl: i <= 7 ? ['CPL-01'] : ['CPL-01', 'CPL-02'],
      })
    );
  }

  return {
    identitas: {
      judulBuku: '',
      subjudul: 'Buku Ajar Akademik Berbasis Outcome-Based Education (OBE)',
      kodeMk: '',
      namaMk: '',
      timPenulis: '',
      programStudi: '',
      fakultas: 'Universitas Pattimura',
      tahunTerbit: currentYear,
      tahunAkademik: `${currentYear}/${Number(currentYear) + 1}`,
      isbn: '',
      sinopsis: '',
      prakata: '',
      petunjukPenggunaan: '',
      targetPembaca: 'Mahasiswa Program Sarjana Universitas Pattimura',
    },
    cplList: [
      {
        kode: 'CPL-01',
        deskripsi: 'Menguasai konsep teoretis dan prinsip keilmuan secara sistematis.',
      },
      {
        kode: 'CPL-02',
        deskripsi: 'Mampu mengaplikasikan keilmuan dalam riset, pengabdian masyarakat, dan pembangunan berkelanjutan (SDGs).',
      },
    ],
    cpmkList: [
      {
        kode: 'CPMK-01',
        deskripsi: 'Memahami konsep dasar dan kerangka teoretis mata kuliah.',
        cplTerkait: ['CPL-01'],
      },
      {
        kode: 'CPMK-02',
        deskripsi: 'Menganalisis studi kasus kontekstual dan merumuskan solusi inovatif.',
        cplTerkait: ['CPL-02'],
      },
    ],
    evaluasiSemester: {
      uts: {
        minggu: 'Pertemuan 8',
        cakupanBab: 'Bab 1 – Bab 7',
        deskripsi: 'Evaluasi Tengah Semester (UTS) mencakup penguasaan teori dan aplikasi dasar Bab 1 s.d. Bab 7.',
      },
      uas: {
        minggu: 'Pertemuan 16',
        cakupanBab: 'Bab 8 – Bab 14',
        deskripsi: 'Evaluasi Akhir Semester (UAS) mencakup sintesis analitis dan pemecahan masalah Bab 8 s.d. Bab 14.',
      },
    },
    babList,
    daftarPustaka: [],
    lastUpdated: new Date().toISOString(),
  };
}
