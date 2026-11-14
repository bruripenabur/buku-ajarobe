export type CognitiveLevel = 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

export interface RpsSummary {
  id: string;
  kode_mk: string;
  nama_mk: string;
  prodi: string;
  tahun_akademik: string;
  dosen_pengampu: string;
  status_siklus?: string;
}

export interface RpsRecord extends RpsSummary {
  payload_rps?: Record<string, any>;
}

export interface CplItem {
  kode: string;
  deskripsi: string;
}

export interface CpmkItem {
  kode: string;
  deskripsi: string;
  cplTerkait: string[];
}

export interface SoalEvaluasi {
  id: string;
  pertanyaan: string;
  levelKognitif: CognitiveLevel;
  kunciJawaban: string;
  pedomanPenskoran: string;
  bobotSkor: number;
}

export interface IntegrasiRisetPkmSdgs {
  topikRisetPkm: string;
  kontribusiSdgs: string;
  konteksKepulauan: string;
}

export interface BabBukuAjar {
  id: string;
  nomorBab: number;
  pertemuanAsal: string;
  judulBab: string;
  tiuCpmk: string;
  tikSubCpmk: string;
  kontribusiCpl: string[];
  petaKonsep: string;
  pendahuluan: string;
  uraianMateri: string;
  studiKasus: string;
  integrasiRisetPkmSdgs: IntegrasiRisetPkmSdgs;
  rangkuman: string;
  latihanSoal: SoalEvaluasi[];
}

export interface ReferensiItem {
  id: string;
  kategori: 'Utama' | 'Pendukung' | 'Mutakhir';
  gayaSitasi: 'APA' | 'IEEE';
  sitasi: string;
  tahun: string;
}

export interface IdentitasBuku {
  judulBuku: string;
  subjudul: string;
  kodeMk: string;
  namaMk: string;
  timPenulis: string;
  programStudi: string;
  fakultas: string;
  tahunTerbit: string;
  tahunAkademik: string;
  isbn: string;
  sinopsis: string;
  prakata: string;
  petunjukPenggunaan: string;
  targetPembaca: string;
}

export interface EvaluasiSemester {
  uts: {
    minggu: string;
    cakupanBab: string;
    deskripsi: string;
  };
  uas: {
    minggu: string;
    cakupanBab: string;
    deskripsi: string;
  };
}

export interface PayloadBukuAjar {
  identitas: IdentitasBuku;
  cplList: CplItem[];
  cpmkList: CpmkItem[];
  evaluasiSemester: EvaluasiSemester;
  babList: BabBukuAjar[];
  daftarPustaka: ReferensiItem[];
  lastUpdated: string;
}
