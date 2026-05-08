
import { TIKTOK_CLIENT_KEY, TIKTOK_REDIRECT_URI } from '@env';

let _pendingState: string | null = null;

export function generateTikTokAuthUrl(): { url: string; state: string } {
  const clientKey = TIKTOK_CLIENT_KEY ?? '';
  const redirectUri = TIKTOK_REDIRECT_URI;

  const state = Date.now().toString(36) + Math.random().toString(36).slice(2);
  _pendingState = state;

  const url =
    `https://www.tiktok.com/v2/auth/authorize/` +
    `?client_key=${encodeURIComponent(clientKey)}` +
    `&response_type=code` +
    `&scope=user.info.basic,user.info.profile` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  return { url, state };
}

/** Returns the pending CSRF state and clears it (one-time use). */
export function consumePendingState(): string | null {
  const s = _pendingState;
  _pendingState = null;
  return s;
}
