import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY belum tersedia di lingkungan server. Pastikan kunci API sudah diatur pada Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // 1. Generate Prakata, Sinopsis & Petunjuk Penggunaan Buku
  app.post('/api/ai/generate-frontmatter', async (req, res) => {
    try {
      const { identitas, cplList, cpmkList, babTitles } = req.body;
      const ai = getGeminiClient();

      const prompt = `Susun bagian pembuka Buku Ajar Akademik Perguruan Tinggi berstandar Dikti / Perpusnas RI untuk Universitas Pattimura (Ambon, Maluku).
Identitas Buku:
- Judul: ${identitas?.judulBuku || identitas?.namaMk || 'Buku Ajar OBE'}
- Subjudul: ${identitas?.subjudul || ''}
- Mata Kuliah: ${identitas?.namaMk || ''} (${identitas?.kodeMk || ''})
- Tim Penulis: ${identitas?.timPenulis || 'Tim Dosen Pengampu'}
- Program Studi / Fakultas: ${identitas?.programStudi || ''} / ${identitas?.fakultas || 'Universitas Pattimura'}
- CPL: ${JSON.stringify(cplList || [])}
- CPMK: ${JSON.stringify(cpmkList || [])}
- Daftar Bab: ${JSON.stringify(babTitles || [])}

Buat dalam bahasa Indonesia akademik yang baku, lugas, dan inspiratif:
1. "sinopsis": 2 paragraf ringkas namun padat yang menjelaskan urgensi keilmuan, pendekatan OBE, serta integrasi riset/PkM/SDGs & konteks kepulauan.
2. "prakata": 3-4 paragraf prakata resmi penulis buku ajar di lingkungan Universitas Pattimura (ucapan syukur, tujuan penulisan berbasis RPS OBE, ucapan terima kasih kepada pimpinan/Pusat Kurikulum dan Inovasi Pembelajaran Unpatti, serta harapan masukan).
3. "petunjukPenggunaan": Panduan sistematis bagi dosen dan mahasiswa dalam menggunakan buku ajar (memahami TIU-TIK, Peta Konsep, Studi Kasus Riset/PkM/SDGs, dan Latihan Soal C2-C6).`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'Anda adalah editor dan penulis buku ajar akademik senior berstandar Dikti dan Perpusnas RI di Universitas Pattimura.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sinopsis: { type: Type.STRING },
              prakata: { type: Type.STRING },
              petunjukPenggunaan: { type: Type.STRING },
            },
            required: ['sinopsis', 'prakata', 'petunjukPenggunaan'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      console.error('Error generate-frontmatter:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal menghasilkan prakata & sinopsis.',
      });
    }
  });

  // 2. Generate Naskah Lengkap 1 Bab (mencegah terpotongnya token)
  app.post('/api/ai/generate-chapter', async (req, res) => {
    try {
      const { identitas, bab } = req.body;
      const ai = getGeminiClient();

      const prompt = `Tuliskan naskah lengkap dan mendalam untuk SATU BAB buku ajar akademik perguruan tinggi berstandar Dikti.

Konteks Buku:
- Judul Buku: ${identitas?.judulBuku || identitas?.namaMk || ''}
- Program Studi: ${identitas?.programStudi || ''} (${identitas?.fakultas || 'Universitas Pattimura'})
- Mata Kuliah: ${identitas?.namaMk || ''} (${identitas?.kodeMk || ''})

Detail Bab yang Harus Ditulis:
- Nomor Bab: Bab ${bab?.nomorBab} (${bab?.pertemuanAsal || ''})
- Judul Bab: ${bab?.judulBab}
- TIU (CPMK): ${bab?.tiuCpmk}
- TIK (Sub-CPMK / TKD): ${bab?.tikSubCpmk}
- Kontribusi CPL: ${(bab?.kontribusiCpl || []).join(', ')}
- Catatan RPS awal (jika ada): ${bab?.uraianMateri || '-'}

Ketentuan Isi Naskah:
1. "petaKonsep": Gambaran alur konsep utama bab dalam bentuk poin terstruktur hubungan antar-konsep.
2. "pendahuluan": 2 paragraf pengantar yang memantik relevansi keilmuan dan mengaitkan TIK dengan kebutuhan dunia nyata.
3. "uraianMateri": Penjelasan materi akademik yang komprehensif, terstruktur dengan sub-judul (1.1, 1.2, 1.3, dst.), argumentasi ilmiah yang jelas, contoh konkret, serta kedalaman setara buku teks S1/S2 (minimal 450-700 kata).
4. "studiKasus": 1 studi kasus analitis kontekstual yang menantang mahasiswa menerapkan konsep bab ini.
5. "integrasiRisetPkmSdgs": Objek berisi:
   - "topikRisetPkm": Contoh integrasi hasil riset mutakhir / Pengabdian kepada Masyarakat (PkM) dosen yang relevan dengan topik bab.
   - "kontribusiSdgs": Pemetaan eksplisit kontribusi materi terhadap Tujuan Pembangunan Berkelanjutan (SDGs, sebutkan nomor & target SDG yang relevan).
   - "konteksKepulauan": Kaitan atau aplikasi kontekstual bagi wilayah kepulauan/kelautan/Maluku apabila relevan dengan disiplin ilmu.
6. "rangkuman": 1-2 paragraf inti sari padat untuk mengikat pemahaman mahasiswa.
7. "latihanSoal": 4 butir soal evaluasi berjenjang kognitif Taksonomi Bloom (C2, C3, C4, dan C5 atau C6), masing-masing memiliki "pertanyaan", "levelKognitif" ("C2"|"C3"|"C4"|"C5"|"C6"), "kunciJawaban", "pedomanPenskoran", dan "bobotSkor" (total 100).`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'Anda adalah guru besar dan penulis buku ajar OBE di Universitas Pattimura. Hasilkan naskah ilmiah berbahasa Indonesia baku, terstruktur, bebas plagiarisme, dan siap cetak.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              petaKonsep: { type: Type.STRING },
              pendahuluan: { type: Type.STRING },
              uraianMateri: { type: Type.STRING },
              studiKasus: { type: Type.STRING },
              integrasiRisetPkmSdgs: {
                type: Type.OBJECT,
                properties: {
                  topikRisetPkm: { type: Type.STRING },
                  kontribusiSdgs: { type: Type.STRING },
                  konteksKepulauan: { type: Type.STRING },
                },
                required: ['topikRisetPkm', 'kontribusiSdgs', 'konteksKepulauan'],
              },
              rangkuman: { type: Type.STRING },
              latihanSoal: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pertanyaan: { type: Type.STRING },
                    levelKognitif: { type: Type.STRING },
                    kunciJawaban: { type: Type.STRING },
                    pedomanPenskoran: { type: Type.STRING },
                    bobotSkor: { type: Type.INTEGER },
                  },
                  required: [
                    'pertanyaan',
                    'levelKognitif',
                    'kunciJawaban',
                    'pedomanPenskoran',
                    'bobotSkor',
                  ],
                },
              },
            },
            required: [
              'petaKonsep',
              'pendahuluan',
              'uraianMateri',
              'studiKasus',
              'integrasiRisetPkmSdgs',
              'rangkuman',
              'latihanSoal',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      console.error('Error generate-chapter:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal menghasilkan naskah bab.',
      });
    }
  });

  // 3. Generate Semua Kerangka & Rangkuman Bab (chunked untuk reliabilitas tinggi)
  app.post('/api/ai/generate-all-outlines', async (req, res) => {
    try {
      const { identitas, babList } = req.body as {
        identitas: Record<string, string>;
        babList: Array<{
          id: string;
          nomorBab: number;
          judulBab: string;
          tiuCpmk: string;
          tikSubCpmk: string;
        }>;
      };

      const ai = getGeminiClient();
      const results: Array<{
        id: string;
        nomorBab: number;
        petaKonsep: string;
        pendahuluan: string;
        rangkuman: string;
      }> = [];

      const chunkSize = 5;
      for (let i = 0; i < babList.length; i += chunkSize) {
        const chunk = babList.slice(i, i + chunkSize);
        const prompt = `Susun kerangka Peta Konsep, Pendahuluan singkat (1 paragraf), dan Rangkuman awal (1 paragraf) untuk daftar bab buku ajar berikut:
Mata Kuliah: ${identitas?.namaMk || identitas?.judulBuku || ''} (${identitas?.programStudi || ''})
Daftar Bab:
${JSON.stringify(
  chunk.map((b) => ({
    id: b.id,
    nomorBab: b.nomorBab,
    judulBab: b.judulBab,
    tiuCpmk: b.tiuCpmk,
    tikSubCpmk: b.tikSubCpmk,
  }))
)}`;

        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction:
              'Kembalikan JSON array sesuai persis ID dan nomorBab yang diberikan. Gunakan bahasa Indonesia akademik baku.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  nomorBab: { type: Type.INTEGER },
                  petaKonsep: { type: Type.STRING },
                  pendahuluan: { type: Type.STRING },
                  rangkuman: { type: Type.STRING },
                },
                required: ['id', 'nomorBab', 'petaKonsep', 'pendahuluan', 'rangkuman'],
              },
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '[]').trim());
        if (Array.isArray(parsed)) {
          results.push(...parsed);
        }
      }

      res.json({ outlines: results });
    } catch (err) {
      console.error('Error generate-all-outlines:', err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Gagal menghasilkan kerangka & rangkuman seluruh bab.',
      });
    }
  });

  // 4. Suggest References (5-10 tahun terakhir APA/IEEE)
  app.post('/api/ai/suggest-references', async (req, res) => {
    try {
      const { identitas, topikBab, gayaSitasi } = req.body;
      const ai = getGeminiClient();
      const style = gayaSitasi === 'IEEE' ? 'IEEE' : 'APA edisi ke-7';

      const prompt = `Berikan 5 rekomendasi referensi akademik mutakhir (terbitan 5-10 tahun terakhir, 2017-2026) yang relevan untuk buku ajar mata kuliah "${identitas?.namaMk || identitas?.judulBuku}" pada Program Studi ${identitas?.programStudi || 'Perguruan Tinggi'}.
Topik cakupan bab: ${(topikBab || []).join('; ')}.
Format sitasi: ${style}. Sertakan kategori ("Utama" | "Pendukung" | "Mutakhir") dan tahun terbit.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'Berikan daftar pustaka ilmiah nyata dengan format sitasi akademik yang akurat dan konsisten.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                kategori: { type: Type.STRING },
                sitasi: { type: Type.STRING },
                tahun: { type: Type.STRING },
              },
              required: ['kategori', 'sitasi', 'tahun'],
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '[]').trim());
      res.json({ references: parsed });
    } catch (err) {
      console.error('Error suggest-references:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal menyarankan referensi mutakhir.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIMPEL-OBE 02 server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
