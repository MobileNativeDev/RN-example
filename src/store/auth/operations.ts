import { LoginPayload } from './../../appTypes/types';
import { AppDispatch, RootState } from '../store';
import { setTokens, clearTokens, setUser } from './slice';
import { setAuthHeader } from '../../api/clientBridge';
import axios from 'axios';
import client from '../../api/client';
import { BASE_API_URL, REFRESH_ENDPOINT } from '../../api/config';
import { login } from '@api/auth';
import { rescheduleAllAlarms } from '@services/alarm/rescheduleAllAlarms';
import { registerDeviceToken } from '@services/registerDeviceToken';

// Example thunk to set tokens (can include AsyncStorage side-effects)
export const saveTokens =
  (accessToken?: string | null, refreshToken?: string | null) =>
  async (dispatch: AppDispatch) => {
    dispatch(setTokens({ accessToken, refreshToken }));
    try {
      setAuthHeader(accessToken ?? null);
    } catch (e) {}
  };

export const signOut = () => async (dispatch: AppDispatch) => {
  dispatch(clearTokens());
};

// Refresh token thunk: reads refreshToken from state, calls backend, updates tokens in store.
export const refreshToken =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const refresh = getState().auth.refreshToken;
    if (!refresh) {
      throw new Error('no_refresh_token');
    }

    const base = BASE_API_URL ?? '';
    const endpoint = REFRESH_ENDPOINT ?? '/auth/refresh';
    if (!base) {
      // Config missing — fail fast so caller can handle
      throw new Error('BASE_API_URL not configured');
    }
    const url = `${base}${endpoint}`;
    const res = await axios.post(url, { refreshToken: refresh });
    const newAccessToken = res.data?.accessToken ?? res.data?.token ?? null;
    const newRefreshToken = res.data?.refreshToken ?? null;

    if (!newAccessToken) {
      // treat as failure
      dispatch(clearTokens());
      throw new Error('refresh_failed');
    }

    dispatch(
      setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken }),
    );
    return newAccessToken;
  };

export const fetchMeAndSave = () => async (dispatch: AppDispatch) => {
  try {
    const res = await client.get('/users/me');
    const payload = res.data?.data ?? res.data;
    const user = {
      id: payload?.id ?? payload?.userId ?? null,
      name: payload?.name ?? null,
      email: payload?.email ?? null,
      avatarUrl: payload?.avatarUrl ?? payload?.avatar ?? null,
      ...payload,
    };
    dispatch(setUser(user));
  } catch (e) {
    // ignore errors for now
  }
};

export const loginUser = (payload: LoginPayload) => async (dispatch: any) => {
  try {
    console.log('Logging in with payload:', payload);

    const data: any = await login(payload);
    // backend may return token fields in different names
    const accessToken =
      data?.accessToken ?? data?.token ?? data?.access_token ?? null;
    const refreshToken = data?.refreshToken ?? data?.refresh_token ?? null;

    if (accessToken || refreshToken) {
      // persist tokens in Redux (and via registerAuthHeaderSetter axios header will be updated)
      await dispatch(saveTokens(accessToken ?? null, refreshToken ?? null));
      // optional: fetch profile and save into store
      dispatch(fetchMeAndSave() as any);

      // Register FCM device token for push notifications
      registerDeviceToken();

      // Reschedule all alarms after successful login
      setTimeout(() => {
        rescheduleAllAlarms().catch(err =>
          console.warn('Failed to reschedule alarms after login:', err),
        );
      }, 1000);
    }

    // return payload to caller for further handling (e.g., needsVerification)
    return data;
  } catch (err) {
    // bubble up error so component can show message
    throw err;
  }
};
