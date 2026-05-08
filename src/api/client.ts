import axios, { type AxiosInstance } from 'axios';
import { BASE_API_URL } from './config';
import storePkg from '../store/store';
import { refreshToken as refreshTokenThunk } from '../store/auth/operations';
import { registerAuthHeaderSetter } from './clientBridge';

const DEFAULT_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 60000;

const createApiClient = (timeout: number) =>
  axios.create({
    baseURL: BASE_API_URL,
    timeout,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

const setDefaultAuthorizationHeader = (
  apiClient: AxiosInstance,
  token: string | null,
) => {
  try {
    if ((apiClient.defaults as any).headers) {
      (apiClient.defaults as any).headers.common =
        (apiClient.defaults as any).headers.common || {};

      if (token) {
        (apiClient.defaults as any).headers.common.Authorization = `Bearer ${token}`;
      } else {
        delete (apiClient.defaults as any).headers.common.Authorization;
      }
    }
  } catch (e) {}
};

const client = createApiClient(DEFAULT_TIMEOUT_MS);
export const uploadClient = createApiClient(UPLOAD_TIMEOUT_MS);

const attachClientInterceptors = (apiClient: AxiosInstance) => {
  apiClient.interceptors.request.use(config => {
    try {
      const token = storePkg.store.getState().auth.accessToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore
    }
    return config;
  });

  apiClient.interceptors.response.use(
    r => r,
    async err => {
      const originalRequest = err.config;
      if (!originalRequest) return Promise.reject(err);

      // Only handle 401 and not retrying already
      if (err.response?.status === 401 && !originalRequest._retry) {
          // mark as retrying to avoid multiple refresh attempts
          originalRequest._retry = true;

          // If this is an auth-related endpoint (login/register/refresh), don't attempt refresh flow
          try {
            const url = originalRequest.url || originalRequest.baseURL || '';
            if (typeof url === 'string' && /\/auth\//i.test(url)) {
              // clear tokens and reject so caller can handle auth flow
              try {
                storePkg.store.dispatch({ type: 'auth/clearTokens' });
              } catch (e) {}
              return Promise.reject(err);
            }
          } catch (e) {}

          try {
            if (isRefreshing) {
              return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject, config: originalRequest });
              });
            }

            isRefreshing = true;
            try {
              // Dispatch Redux thunk to refresh token
              const token = await storePkg.store.dispatch(refreshTokenThunk() as any);
              processQueue(null, token ?? null);
              isRefreshing = false;
              if (token && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return apiClient(originalRequest);
            } catch (refreshErr) {
              processQueue(refreshErr, null);
              isRefreshing = false;
              // clear tokens in store
              try {
                storePkg.store.dispatch({ type: 'auth/clearTokens' });
              } catch (e) {}
              return Promise.reject(refreshErr);
            }
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            isRefreshing = false;
            return Promise.reject(refreshErr);
          }
      }

      return Promise.reject(err);
    },
  );
};

attachClientInterceptors(client);
attachClientInterceptors(uploadClient);

registerAuthHeaderSetter(token => {
  setDefaultAuthorizationHeader(client, token);
  setDefaultAuthorizationHeader(uploadClient, token);
});

// Simple refresh token handling with request queueing.
// REFRESH_ENDPOINT handled by auth thunk

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (err: unknown) => void;
  config: any;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(p => {
    if (error) {
      p.reject(error);
    } else {
      if (p.config && token && p.config.headers) p.config.headers.Authorization = `Bearer ${token}`;
      p.resolve(p.config);
    }
  });
  failedQueue = [];
};

export default client;
