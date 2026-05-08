import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AuthUser = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  [key: string]: any;
};

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  status: 'idle' | 'refreshing' | 'signed_out';
};

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  status: 'idle',
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens(state, action: PayloadAction<{ accessToken?: string | null; refreshToken?: string | null }>) {
      if (action.payload.accessToken !== undefined) state.accessToken = action.payload.accessToken ?? null;
      if (action.payload.refreshToken !== undefined) state.refreshToken = action.payload.refreshToken ?? null;
    },
    clearTokens(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.status = 'signed_out';
    },
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload ?? null;
    },
    setStatus(state, action: PayloadAction<AuthState['status']>) {
      state.status = action.payload;
    },
  },
});

export const { setTokens, clearTokens, setUser, setStatus } = slice.actions;
export default slice.reducer;
