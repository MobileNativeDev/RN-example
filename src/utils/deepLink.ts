export type ParsedDeepLink =
  | { type: 'invite'; referrerId: string }
  | { type: 'reset-password'; token: string }
  | { type: 'unknown' };

const APPSONAIR_HOST = 'example.appsonair.link';
const EXAMPLE_HOST = 'example.app';
const EXAMPLE_WWW_HOST = 'www.example.app';
const APP_SCHEME = 'example:';

let _pendingReferrerId: string | null = null;

/**
 * Stores referrer ID from a deep link so it can be consumed after navigation is ready.
 */
export function setPendingReferrerId(id: string) {
  _pendingReferrerId = id;
}

/**
 * Consumes and returns the pending referrer ID (clears it after reading).
 */
export function consumePendingReferrerId(): string | null {
  const id = _pendingReferrerId;
  _pendingReferrerId = null;
  return id;
}

/**
 * Parses an incoming deep link URL and extracts structured data.
 * Handles:
 *   - https://example.appsonair.link?ref=USER_ID  (AppsonAir Universal/App Link)
 *   - https://example.appsonair.link/reset-password?token=... (password reset)
 *   - https://example.app/reset-password?token=...            (optional custom domain)
 *   - https://www.example.app/reset-password?token=...        (optional custom domain)
 *   - example://invite?ref=USER_ID                (custom URI scheme)
 *   - example://reset-password?token=...          (custom URI scheme)
 *   - example://user/USER_ID                      (legacy custom scheme)
 */
export function parseDeepLink(url: string): ParsedDeepLink {
  try {
    const parsed = new URL(url);
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');

    // AppsonAir HTTPS deep link
    if (
      parsed.hostname === APPSONAIR_HOST ||
      parsed.hostname === EXAMPLE_HOST ||
      parsed.hostname === EXAMPLE_WWW_HOST
    ) {
      const token = parsed.searchParams.get('token');
      if (normalizedPath === '/reset-password' && token) {
        return { type: 'reset-password', token };
      }

      const ref = parsed.searchParams.get('ref');
      if (ref) return { type: 'invite', referrerId: ref };
    }

    // Custom URI scheme
    if (parsed.protocol === APP_SCHEME) {
      const token = parsed.searchParams.get('token');
      if (
        (parsed.hostname === 'reset-password' || normalizedPath === '/reset-password') &&
        token
      ) {
        return { type: 'reset-password', token };
      }

      const ref = parsed.searchParams.get('ref');
      if (ref) return { type: 'invite', referrerId: ref };

      // Legacy: example://user/USER_ID
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'user' && pathParts[1]) {
        return { type: 'invite', referrerId: decodeURIComponent(pathParts[1]) };
      }
    }
  } catch {}

  return { type: 'unknown' };
}
