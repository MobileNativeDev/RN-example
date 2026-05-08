export const INVITE_WEB_BASE: string =
  process.env['INVITE_WEB_BASE'] || process.env['WEB_BASE_URL'] || '';

export const APPSONAIR_INVITE_BASE = 'https://example.appsonair.link';

/**
 * Builds a deep link via AppsonAir that contains the sender's user ID.
 * On iOS/Android the link opens the app; on desktop it falls back to the website.
 */
export function buildInviteLink(userId: string): string {
  return `${APPSONAIR_INVITE_BASE}?ref=${encodeURIComponent(userId)}`;
}

export function buildWebInvite(userId: string) {
  if (!INVITE_WEB_BASE) return null;
  const base = INVITE_WEB_BASE.replace(/\/$/, '');
  return `${base}/user/${encodeURIComponent(userId)}`;
}
