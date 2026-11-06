/**
 * Admin authorization utilities for PokéCount Tracker.
 * Supports Google OAuth email allowlist & secret passkey fallback.
 */

export function getAdminEmails(): string[] {
  const envEmails = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined)?.trim();
  if (!envEmails) return ['wingae911@gmail.com'];
  return envEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.trim().toLowerCase());
}

export function verifyAdminPasskey(passkey: string): boolean {
  const envPasskey = (import.meta.env.VITE_ADMIN_PASSKEY as string | undefined)?.trim();
  if (envPasskey) {
    return passkey.trim() === envPasskey;
  }
  // In dev / test environments, permit the default local test key (F4).
  // In production builds, no hardcoded fallback is accepted (requires VITE_ADMIN_PASSKEY or Google Admin email).
  if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return passkey.trim() === 'poke911admin';
  }
  return false;
}

export function isCurrentSessionAdmin(email?: string | null): boolean {
  if (isAdminEmail(email)) return true;
  try {
    const storedPasskey = sessionStorage.getItem('pokecount_admin_session_auth');
    if (storedPasskey && verifyAdminPasskey(storedPasskey)) return true;
  } catch {
    // sessionStorage may be blocked
  }
  return false;
}


