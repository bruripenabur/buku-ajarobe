import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const SSO_COOKIE_NAME = 'simpatti_sso_session';
export const SSO_COOKIE_DOMAIN = '.simpatti.site';

export interface SsoUserProfile {
  fullName: string;
  prodi: string;
  email: string;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

function parseTokenPayload(raw: string): TokenPair | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const candidates = [trimmed];

  try {
    candidates.push(decodeURIComponent(trimmed));
  } catch {
    // ignore decode errors
  }

  try {
    candidates.push(atob(trimmed));
  } catch {
    // ignore base64 errors
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      if (
        parsed &&
        typeof parsed.access_token === 'string' &&
        typeof parsed.refresh_token === 'string' &&
        parsed.access_token &&
        parsed.refresh_token
      ) {
        return {
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        };
      }
    } catch {
      // try next candidate
    }
  }

  // Fallback for delimiter-separated "access_token|refresh_token"
  if (trimmed.includes('|')) {
    const [access_token, refresh_token] = trimmed.split('|');
    if (access_token && refresh_token) {
      return { access_token, refresh_token };
    }
  }

  return null;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const c of cookies) {
    const eqIndex = c.indexOf('=');
    if (eqIndex === -1) continue;
    const key = c.slice(0, eqIndex).trim();
    if (key === name) {
      return c.slice(eqIndex + 1);
    }
  }
  return null;
}

export function syncSsoCookie(session: Session | null): void {
  if (typeof document === 'undefined' || !session) return;
  const payload = encodeURIComponent(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  );
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const isSimpattiDomain = window.location.hostname.endsWith('simpatti.site');
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';

  if (isSimpattiDomain) {
    document.cookie = `${SSO_COOKIE_NAME}=${payload}; Domain=${SSO_COOKIE_DOMAIN}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
  } else {
    document.cookie = `${SSO_COOKIE_NAME}=${payload}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
  }
}

export function clearSsoCookie(): void {
  if (typeof document === 'undefined') return;
  const isSimpattiDomain = window.location.hostname.endsWith('simpatti.site');
  if (isSimpattiDomain) {
    document.cookie = `${SSO_COOKIE_NAME}=; Domain=${SSO_COOKIE_DOMAIN}; Path=/; Max-Age=0; SameSite=Lax`;
  }
  document.cookie = `${SSO_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function extractSsoUserProfile(user: User | null): SsoUserProfile {
  if (!user) {
    return { fullName: '', prodi: '', email: '' };
  }
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const fullName = String(
    meta.full_name || meta.nama_lengkap || meta.name || user.email || ''
  ).trim();
  const prodi = String(
    meta.prodi || meta.program_studi || meta.department || ''
  ).trim();

  return {
    fullName,
    prodi,
    email: user.email || '',
  };
}

/**
 * Deteksi sesi SSO otomatis sesuai urutan:
 * 1. Sesi aktif bawaan supabase.auth.getSession()
 * 2. Hash URL #sso_token=... (lalu bersihkan hash dari URL)
 * 3. Cookie lintas subdomain simpatti_sso_session pada .simpatti.site
 */
export async function detectSsoSession(): Promise<{
  session: Session | null;
  user: User | null;
  source: 'supabase' | 'hash' | 'cookie' | 'none';
}> {
  // 1. Sesi aktif bawaan Supabase
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      syncSsoCookie(data.session);
      return {
        session: data.session,
        user: data.session.user,
        source: 'supabase',
      };
    }
  } catch {
    // continue to next source
  }

  // 2. Hash URL #sso_token=...
  if (typeof window !== 'undefined' && window.location.hash) {
    const rawHash = window.location.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(rawHash);
    const ssoTokenRaw = hashParams.get('sso_token');

    if (ssoTokenRaw) {
      let tokenPair = parseTokenPayload(ssoTokenRaw);
      if (!tokenPair && hashParams.get('refresh_token')) {
        tokenPair = {
          access_token: ssoTokenRaw,
          refresh_token: hashParams.get('refresh_token') || '',
        };
      }

      // Bersihkan hash dari bilah alamat URL
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`
      );

      if (tokenPair) {
        const { data, error } = await supabase.auth.setSession({
          access_token: tokenPair.access_token,
          refresh_token: tokenPair.refresh_token,
        });
        if (!error && data?.session) {
          syncSsoCookie(data.session);
          return {
            session: data.session,
            user: data.session.user,
            source: 'hash',
          };
        }
      }
    }
  }

  // 3. Cookie lintas subdomain simpatti_sso_session (.simpatti.site)
  const cookieRaw = readCookie(SSO_COOKIE_NAME);
  if (cookieRaw) {
    const tokenPair = parseTokenPayload(cookieRaw);
    if (tokenPair) {
      const { data, error } = await supabase.auth.setSession({
        access_token: tokenPair.access_token,
        refresh_token: tokenPair.refresh_token,
      });
      if (!error && data?.session) {
        return {
          session: data.session,
          user: data.session.user,
          source: 'cookie',
        };
      }
    }
  }

  return { session: null, user: null, source: 'none' };
}

export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{ session: Session | null; user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session) {
    return {
      session: null,
      user: null,
      error: error?.message || 'Gagal login. Periksa kembali email dan kata sandi Anda.',
    };
  }

  syncSsoCookie(data.session);
  return { session: data.session, user: data.session.user, error: null };
}

export async function signOutSso(): Promise<void> {
  clearSsoCookie();
  await supabase.auth.signOut();
}

export function buildModuleHandoffUrl(
  targetSubdomainUrl: string,
  rpsId: string | null,
  session: Session | null
): string {
  const base = targetSubdomainUrl.replace(/\/+$/, '');
  const query = rpsId ? `?rps_id=${encodeURIComponent(rpsId)}` : '';
  if (!session) {
    return `${base}${query}`;
  }
  const ssoPayload = encodeURIComponent(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  );
  return `${base}${query}#sso_token=${ssoPayload}`;
}
