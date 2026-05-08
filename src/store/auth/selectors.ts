import { RootState } from '../store';
import type { AuthUser } from './slice';

export const selectAccessToken = (s: RootState) => s.auth.accessToken;
export const selectRefreshToken = (s: RootState) => s.auth.refreshToken;
export const selectIsSignedOut = (s: RootState) => s.auth.status === 'signed_out';

export const selectAuthUser = (s: RootState): AuthUser | null => s.auth.user ?? null;
export const selectUserId = (s: RootState): string | null => s.auth.user?.id ?? null;
export const selectUserAvatar = (s: RootState): string | null => s.auth.user?.avatarUrl ?? null;
