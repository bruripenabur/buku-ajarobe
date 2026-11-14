import { createClient } from '@supabase/supabase-js';
import type { PayloadBukuAjar, RpsRecord, RpsSummary } from '../types/book';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://eysccwxpgdcoqfvaalye.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_z-P7ucdZVBwh8dH4kcU7Pg_mH6vL9P8';

export const PORTAL_OBE_URL = 'https://obe.simpatti.site';

export const ECOSYSTEM_SUBDOMAINS = {
  portal: 'https://obe.simpatti.site',
  kurikulum: 'https://kurikulum.simpatti.site',
  rps: 'https://rps.simpatti.site',
  bukuajar: 'https://bukuajar.simpatti.site',
  rubrik: 'https://rubrik.simpatti.site',
  portofolio: 'https://portofolio.simpatti.site',
  cpl: 'https://cpl.simpatti.site',
  cqi: 'https://cqi.simpatti.site',
} as const;

export const MODUL_3_SIRUBRIK_URL =
  import.meta.env.VITE_SIRUBRIK_URL || ECOSYSTEM_SUBDOMAINS.rubrik;

export function isSupabaseKeyConfigured(): boolean {
  return (
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_ANON_KEY.includes('[MASUKKAN_') &&
    SUPABASE_ANON_KEY.length > 20
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  if (!isSupabaseKeyConfigured()) {
    return { connected: false, error: 'Publishable key Supabase belum dikonfigurasi.' };
  }
  try {
    const { error } = await supabase.from('obe_rps').select('id').limit(1);
    if (error) {
      return { connected: false, error: error.message };
    }
    return { connected: true };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Gagal terhubung ke Supabase.',
    };
  }
}

export async function fetchRpsList(): Promise<{ data: RpsSummary[]; error: string | null }> {
  if (!isSupabaseKeyConfigured()) {
    return {
      data: [],
      error:
        'Publishable key Supabase belum diisi pada src/lib/supabase.ts atau VITE_SUPABASE_ANON_KEY. Gunakan Mode Input Manual atau lengkapi kunci Supabase untuk menarik data RPS.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('obe_rps')
      .select('id, kode_mk, nama_mk, prodi, tahun_akademik, dosen_pengampu, status_siklus')
      .order('nama_mk', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data ?? []) as RpsSummary[], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal terhubung ke Supabase.',
    };
  }
}

export async function fetchRpsAndExistingBook(rpsId: string): Promise<{
  rps: RpsRecord | null;
  existingBook: { id?: string; judul_buku: string; payload_buku: PayloadBukuAjar } | null;
  error: string | null;
}> {
  if (!isSupabaseKeyConfigured()) {
    return {
      rps: null,
      existingBook: null,
      error: 'Publishable key Supabase belum dikonfigurasi.',
    };
  }

  try {
    const [rpsRes, bookRes] = await Promise.all([
      supabase.from('obe_rps').select('*').eq('id', rpsId).maybeSingle(),
      supabase.from('obe_buku_ajar').select('*').eq('rps_id', rpsId).maybeSingle(),
    ]);

    if (rpsRes.error) {
      return { rps: null, existingBook: null, error: rpsRes.error.message };
    }

    return {
      rps: (rpsRes.data as RpsRecord | null) ?? null,
      existingBook: bookRes.data
        ? {
            id: bookRes.data.id,
            judul_buku: bookRes.data.judul_buku,
            payload_buku: bookRes.data.payload_buku as PayloadBukuAjar,
          }
        : null,
      error: bookRes.error && bookRes.error.code !== 'PGRST116' ? bookRes.error.message : null,
    };
  } catch (err) {
    return {
      rps: null,
      existingBook: null,
      error: err instanceof Error ? err.message : 'Gagal memuat detail RPS & draf buku ajar.',
    };
  }
}

export async function saveBookToEcosystem(params: {
  rpsId: string | null;
  judulBuku: string;
  payloadBuku: PayloadBukuAjar;
}): Promise<{ savedId?: string; error: string | null }> {
  if (!isSupabaseKeyConfigured()) {
    return {
      error:
        'Kunci Supabase belum dikonfigurasi. Lengkapi SUPABASE_ANON_KEY di src/lib/supabase.ts atau VITE_SUPABASE_ANON_KEY untuk menyimpan ke database ekosistem.',
    };
  }

  try {
    if (params.rpsId) {
      const { data: upsertData, error: upsertError } = await supabase
        .from('obe_buku_ajar')
        .upsert(
          {
            rps_id: params.rpsId,
            judul_buku: params.judulBuku,
            payload_buku: params.payloadBuku,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'rps_id' }
        )
        .select('id')
        .maybeSingle();

      if (upsertError) {
        return { error: upsertError.message };
      }

      const { error: statusError } = await supabase
        .from('obe_rps')
        .update({ status_siklus: '2_buku_selesai' })
        .eq('id', params.rpsId);

      if (statusError) {
        return {
          savedId: upsertData?.id,
          error: `Buku tersimpan, namun gagal memperbarui status_siklus RPS: ${statusError.message}`,
        };
      }

      return { savedId: upsertData?.id, error: null };
    }

    const { data: insertData, error: insertError } = await supabase
      .from('obe_buku_ajar')
      .insert({
        rps_id: null,
        judul_buku: params.judulBuku,
        payload_buku: params.payloadBuku,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (insertError) {
      return { error: insertError.message };
    }

    return { savedId: insertData?.id, error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan ke Supabase.',
    };
  }
}
