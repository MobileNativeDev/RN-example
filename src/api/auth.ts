import client from './client';
import ENDPOINTS from './endpoints';
import { BASE_API_URL } from './config';
import type { components } from './types.generated';
import storePkg from '../store/store';
import { saveTokens } from '../store/auth/operations';
import { fetchMeAndSave } from '../store/auth/operations';
import { rescheduleAllAlarms } from '@services/alarm/rescheduleAllAlarms';
import { registerDeviceToken } from '@services/registerDeviceToken';
import { EmailRegisterPayload } from '@appTypes/types';
import { navigate } from '@navigation/RootNavigation';
import { Alert } from '@utils/alert';

const promptCompleteProfileIfNameMissing = (payload: any) => {
  const backendName =
    typeof payload?.user?.name === 'string'
      ? payload.user.name
      : typeof payload?.name === 'string'
        ? payload.name
        : '';

  if (backendName.trim()) {
    return;
  }

  setTimeout(() => {
    Alert.alert(
      'Complete your profile',
      'Please fill in your profile details in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go to settings',
          onPress: () =>
            navigate('MainContentNavigation', {
              screen: 'ChangeMyUsername',
              params: { profilePromptNonce: Date.now() },
            }),
        },
      ],
    );
  }, 400);
};


export const login = async (payload: { email: string; password: string; }): Promise<unknown> => {
   try {
      const body: any = {
        identifier: payload.email,
        password: payload.password,
      };

      const res = await client.post(ENDPOINTS.auth.loginEmail, body);
      return res.data?.data ?? res.data;
  } catch (err: any) {
      console.log('login error', err);
      const resp = err?.response?.data;

      if (!err?.response) {
        console.warn('Login network error. baseURL=', BASE_API_URL ?? '(not configured)');
        throw new Error('Network Error: could not reach API');
      }

      if (Array.isArray(resp?.errors) && resp.errors.length > 0) {
        const fieldErrors: Record<string, string> = {};
        resp.errors.forEach((e: any) => {
          const field = e.field || 'form';
          const constraints = e.constraints || {};
          const first = Object.values(constraints)[0];
          fieldErrors[field] = typeof first === 'string' ? first : String(first ?? 'Invalid value');
        });
        const error: any = new Error(resp?.message ?? 'Validation failed');
        error.fieldErrors = fieldErrors;
        throw error;
      }

      throw err;
   }
};

export const register = async (
  payload: EmailRegisterPayload,
): Promise<unknown> => {
  try {
    const body: any = {
      identifier: payload.email,
      password: payload.password,
      confirmPassword: payload.confirmPassword,
      name: payload.name,
    };

    if (payload.birthDate) body.birthDate = payload.birthDate; 
    if (payload.preferredMusicPlayer) body.preferredMusicPlayer = payload.preferredMusicPlayer;

    const res = await client.post(ENDPOINTS.auth.registerEmail, body);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    console.log('register error', err);
    const resp = err?.response?.data;

    if (!err?.response) {
      const base = BASE_API_URL ?? '(not configured)';
      console.warn('Register network error. baseURL=', base);
      Alert.alert(
        'Network Error',
        `Unable to reach API at ${base}. Ensure the backend is running and your device/emulator can reach it.`,
      );
      throw new Error(`Network Error: could not reach ${base}`);
    }

    if (Array.isArray(resp?.errors) && resp.errors.length > 0) {
      console.log('register validation errors', resp.errors);
    } else {
      console.log('register error', err.response?.status, resp);
    }

    Alert.alert('Registration failed', 'Unable to register. Please check the form and try again.');
    throw err;
  }
};

export const me = async (): Promise<components['schemas']['UserResponseDto']> => {
  const res = await client.get(ENDPOINTS.users.me);
  return res.data?.data ?? res.data;
};

export const logout = async () => {
  await client.post(ENDPOINTS.auth.logout);
};

export const googleSignIn = async (
  idToken: string,
): Promise<components['schemas']['GoogleSigninResponseDto'] | unknown> => {
  const res = await client.post(ENDPOINTS.auth.googleSignin, { idToken });
  const payload = res.data?.data ?? res.data;
  console.log("payload",payload);
  

  const accessToken = payload?.accessToken ?? payload?.token ?? payload?.access_token ?? null;
  const refreshToken = payload?.refreshToken ?? payload?.refresh_token ?? null;

  if (accessToken || refreshToken) {
    try {
      storePkg.store.dispatch(saveTokens(accessToken ?? null, refreshToken ?? null) as any);
      storePkg.store.dispatch(fetchMeAndSave() as any);
      registerDeviceToken();

      // Reschedule all alarms after successful Google sign-in
      setTimeout(() => {
        rescheduleAllAlarms().catch(err =>
          console.warn('Failed to reschedule alarms after Google sign-in:', err),
        );
      }, 1000);
    } catch (e) {
      
    }
  }

  return payload;
};

export const appleSignIn = async (
  identityToken: string,
): Promise<components['schemas']['GoogleSigninResponseDto'] | unknown> => {
  const res = await client.post(ENDPOINTS.auth.appleSignin, { identityToken });
  const payload = res.data?.data ?? res.data;

  const accessToken = payload?.accessToken ?? payload?.token ?? payload?.access_token ?? null;
  const refreshToken = payload?.refreshToken ?? payload?.refresh_token ?? null;

  if (accessToken || refreshToken) {
    try {
      storePkg.store.dispatch(saveTokens(accessToken ?? null, refreshToken ?? null) as any);
      storePkg.store.dispatch(fetchMeAndSave() as any);
      registerDeviceToken();
      promptCompleteProfileIfNameMissing(payload);

      // Reschedule all alarms after successful Apple sign-in
      setTimeout(() => {
        rescheduleAllAlarms().catch(err =>
          console.warn('Failed to reschedule alarms after Apple sign-in:', err),
        );
      }, 1000);
    } catch (e) {
    }
  }

  return payload;
};

export const tiktokSignIn = async (code: string): Promise<void> => {
  console.log('code tiktokSignIn',code);
  try {
  const res = await client.post(ENDPOINTS.auth.tiktokSignin, { code });
  const payload = res.data?.data ?? res.data;
  const access_token = payload?.access_token ?? payload?.accessToken ?? payload?.token ?? null;
  console.log("res",res);

  try {
    storePkg.store.dispatch(saveTokens(access_token, null) as any);
    storePkg.store.dispatch(fetchMeAndSave() as any);
    registerDeviceToken();

    // Reschedule all alarms after successful TikTok sign-in
    setTimeout(() => {
      rescheduleAllAlarms().catch(err =>
        console.warn('Failed to reschedule alarms after TikTok sign-in:', err),
      );
    }, 1000);
  } catch (e) {
    console.log('Error during TikTok sign-in token handling:', e);
  }
   } catch (err: any) {
    console.log('tiktokSignIn error', err);
    // Log HTTP response details if available to help debugging 401s
    try {
      if (err.response) {
        console.error('tiktokSignIn response status:', err.response.status);
        console.error('tiktokSignIn response data:', JSON.stringify(err.response.data));
      }
    } catch (logErr) {
      console.error('Error while logging tiktokSignIn error details', logErr);
    }
    // Inform user briefly
    Alert.alert('TikTok sign-in failed', err?.response?.data?.message ?? err?.message ?? 'Unauthorized');
  }
};

export const confirmEmail = async (
  payload: { identifier: string; code: string; },
): Promise<unknown> => {
  let lastErr: any = null;
    try {
  const res = await client.post(ENDPOINTS.auth.emailConfirm, payload);
      return res.data?.data ?? res.data;
    } catch (err: any) {
      lastErr = err;
    }

  const resp = lastErr?.response?.data;
  if (Array.isArray(resp?.errors) && resp.errors.length > 0) {
    const fieldErrors: Record<string, string> = {};
    resp.errors.forEach((e: any) => {
      const field = e.field || 'form';
      const constraints = e.constraints || {};
      const first = Object.values(constraints)[0];
      fieldErrors[field] = typeof first === 'string' ? first : String(first ?? 'Invalid value');
    });
    const error: any = new Error(resp?.message ?? 'Confirmation failed');
    error.fieldErrors = fieldErrors;
    throw error;
  }

  throw lastErr;
};

export const resendEmailConfirmation = async (
  payload: { identifier: string },
): Promise<unknown> => {
  try {
    const res = await client.post(ENDPOINTS.auth.emailResend, payload);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const resp = err?.response?.data;

    if (Array.isArray(resp?.errors) && resp.errors.length > 0) {
      const fieldErrors: Record<string, string> = {};
      resp.errors.forEach((e: any) => {
        const field = e.field || 'form';
        const constraints = e.constraints || {};
        const first = Object.values(constraints)[0];
        fieldErrors[field] =
          typeof first === 'string'
            ? first
            : String(first ?? 'Invalid value');
      });
      const error: any = new Error(resp?.message ?? 'Resend failed');
      error.fieldErrors = fieldErrors;
      throw error;
    }

    throw err;
  }
};

export const forgotPassword = async (
  payload: { identifier: string; },
): Promise<unknown> => {
  try {
    const body: any = {
      identifier: payload.identifier,
    };

    const res = await client.post(ENDPOINTS.auth.passwordForgot, body);
    console.log("res",res.data);
    
    return res.data;
  } catch (err: any) {
    console.log('forgotPassword error', err);
    const resp = err?.response?.data;

    if (!err?.response) {
      console.warn('ForgotPassword network error. baseURL=', BASE_API_URL ?? '(not configured)');
      throw new Error('Network Error: could not reach API');
    }

    if (Array.isArray(resp?.errors) && resp.errors.length > 0) {
      const fieldErrors: Record<string, string> = {};
      resp.errors.forEach((e: any) => {
        const field = e.field || 'form';
        const constraints = e.constraints || {};
        const first = Object.values(constraints)[0];
        fieldErrors[field] = typeof first === 'string' ? first : String(first ?? 'Invalid value');
      });
      const error: any = new Error(resp?.message ?? 'Validation failed');
      error.fieldErrors = fieldErrors;
      throw error;
    }

    throw err;
  }
};

export const resetPassword = async (
  payload: {
    token?: string;
    password: string;
    confirmPassword?: string;
  },
): Promise<unknown> => {
  try {
    const body: any = {
      password: payload.password,
    };

    if (payload.token) body.token = payload.token;
    if (payload.confirmPassword) body.confirmPassword = payload.confirmPassword;


    const res = await client.post(ENDPOINTS.auth.passwordReset, body);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    console.log('resetPassword error', err);
    const resp = err?.response?.data;

    if (!err?.response) {
      console.warn('ResetPassword network error. baseURL=', BASE_API_URL ?? '(not configured)');
      throw new Error('Network Error: could not reach API');
    }

    if (Array.isArray(resp?.errors) && resp.errors.length > 0) {
      const fieldErrors: Record<string, string> = {};
      resp.errors.forEach((e: any) => {
        const field = e.field || 'form';
        const constraints = e.constraints || {};
        const first = Object.values(constraints)[0];
        fieldErrors[field] = typeof first === 'string' ? first : String(first ?? 'Invalid value');
      });
      const error: any = new Error(resp?.message ?? 'Validation failed');
      error.fieldErrors = fieldErrors;
      throw error;
    }

    throw err;
  }
};
