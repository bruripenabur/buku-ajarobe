import type { Session, User } from '@supabase/supabase-js';
import { SIMPATTI_URLS, supabase } from './supabase';

export const SSO_COOKIE_NAME = 'simpatti_sso_session';
export const SSO_COOKIE_DOMAIN = '.simpatti.site';

export interface SsoTokens {
  access_token: string;
  refresh_token: string;
}

export interface SsoUserProfile {
  fullName: string;
  prodi: string;
  email: string;
}

function parseTokenPayload(raw: string): SsoTokens | null {
  if (!raw) return null;
  const candidates: string[] = [raw];

  try {
    candidates.push(decodeURIComponent(raw));
  } catch {
    // ignore decode failure
  }

  for (const candidate of candidates) {
    // 1. Try JSON directly
    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.access_token && parsed?.refresh_token) {
        return {
          access_token: String(parsed.access_token),
          refresh_token: String(parsed.refresh_token),
        };
      }
    } catch {
      // not direct JSON
    }

    // 2. Try Base64-encoded JSON
    try {
      const decoded = atob(candidate);
      const parsed = JSON.parse(decoded);
      if (parsed?.access_token && parsed?.refresh_token) {
        return {
          access_token: String(parsed.access_token),
          refresh_token: String(parsed.refresh_token),
        };
      }
    } catch {
      // not base64 JSON
    }

    // 3. Try query-string style access_token=...&refresh_token=...
    try {
      const params = new URLSearchParams(candidate);
      const access = params.get('access_token');
      const refresh = params.get('refresh_token');
      if (access && refresh) {
        return { access_token: access, refresh_token: refresh };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function readHashTokens(): SsoTokens | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return null;

  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;

  if (cleanHash.includes('sso_token=')) {
    const params = new URLSearchParams(cleanHash);
    const ssoRaw = params.get('sso_token');
    if (ssoRaw) {
      const parsed = parseTokenPayload(ssoRaw);
      if (parsed) return parsed;
    }
    const idx = cleanHash.indexOf('sso_token=');
    const fallbackRaw = cleanHash.slice(idx + 'sso_token='.length);
    const parsed = parseTokenPayload(fallbackRaw);
    if (parsed) return parsed;
  }

  return parseTokenPayload(cleanHash);
}

function clearHashFromUrl(): void {
  if (typeof window === 'undefined') return;
  if (window.location.hash) {
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', cleanUrl);
  }
}

export function readSsoCookie(): SsoTokens | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${SSO_COOKIE_NAME}=`)) {
      const value = trimmed.slice(SSO_COOKIE_NAME.length + 1);
      return parseTokenPayload(value);
    }
  }
  return null;
}

export function writeSsoCookie(session: Session | null): void {
  if (typeof document === 'undefined') return;
  const isSimpattiDomain =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('simpatti.site');
  const domainAttr = isSimpattiDomain ? `; domain=${SSO_COOKIE_DOMAIN}` : '';
  const secureAttr =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : '';

  if (!session?.access_token || !session?.refresh_token) {
    document.cookie = `${SSO_COOKIE_NAME}=; path=/${domainAttr}; max-age=0; SameSite=Lax${secureAttr}`;
    return;
  }

  const payload = encodeURIComponent(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  );
  // 7 days expiry
  document.cookie = `${SSO_COOKIE_NAME}=${payload}; path=/${domainAttr}; max-age=604800; SameSite=Lax${secureAttr}`;
}

export function extractUserProfile(user: User | null): SsoUserProfile {
  const meta = (user?.user_metadata || {}) as Record<string, unknown>;
  const fullName = String(
    meta.full_name || meta.nama_lengkap || meta.name || user?.email || ''
  ).trim();
  const prodi = String(
    meta.prodi || meta.program_studi || meta.department || ''
  ).trim();
  return {
    fullName,
    prodi,
    email: user?.email || '',
  };
}

/**
 * Resolve SSO session in priority order:
 * 1. Existing supabase.auth.getSession()
 * 2. URL hash #sso_token=... -> setSession + clear hash
 * 3. Cross-subdomain cookie simpatti_sso_session -> setSession
 */
export async function resolveSsoSession(): Promise<Session | null> {
  // 1. Check active Supabase session
  const { data: currentData } = await supabase.auth.getSession();
  if (currentData?.session) {
    writeSsoCookie(currentData.session);
    return currentData.session;
  }

  // 2. Check #sso_token=... hash
  const hashTokens = readHashTokens();
  if (hashTokens) {
    const { data, error } = await supabase.auth.setSession({
      access_token: hashTokens.access_token,
      refresh_token: hashTokens.refresh_token,
    });
    clearHashFromUrl();
    if (!error && data?.session) {
      writeSsoCookie(data.session);
      return data.session;
    }
  }

  // 3. Check cross-subdomain cookie simpatti_sso_session
  const cookieTokens = readSsoCookie();
  if (cookieTokens) {
    const { data, error } = await supabase.auth.setSession({
      access_token: cookieTokens.access_token,
      refresh_token: cookieTokens.refresh_token,
    });
    if (!error && data?.session) {
      return data.session;
    }
  }

  return null;
}

export async function signOutSso(): Promise<void> {
  writeSsoCookie(null);
  await supabase.auth.signOut();
}

export function buildModuleHandoffUrl(
  baseUrl: string,
  rpsId: string | null,
  session: Session | null
): string {
  const url = new URL(baseUrl);
  if (rpsId) {
    url.searchParams.set('rps_id', rpsId);
  }
  if (session?.access_token && session?.refresh_token) {
    const ssoPayload = encodeURIComponent(
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
    );
    url.hash = `sso_token=${ssoPayload}`;
  }
  return url.toString();
}

export function getPortalLoginUrl(): string {
  if (typeof window === 'undefined') return SIMPATTI_URLS.portal;
  const redirect = encodeURIComponent(window.location.href);
  return `${SIMPATTI_URLS.portal}?redirect_to=${redirect}`;
}
