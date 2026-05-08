import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const GOOGLE_SESSION_INSTALL_MARKER_KEY = 'google_session_install_marker_v1';

let hasConfiguredGoogleSignin = false;
let freshInstallCleanupPromise: Promise<void> | null = null;

export const configureGoogleSignin = () => {
  if (hasConfiguredGoogleSignin) return;

  const cfg: Record<string, any> = { offlineAccess: true };
  const webClientId = process.env['GOOGLE_WEB_CLIENT_ID'];
  const iosClientId = process.env['IOS_CLIENT_ID'];

  if (webClientId) cfg['webClientId'] = webClientId;
  if (iosClientId) cfg['iosClientId'] = iosClientId;

  GoogleSignin.configure(cfg as any);
  hasConfiguredGoogleSignin = true;
};

const hasStoredGoogleSession = () => {
  try {
    return (
      GoogleSignin.hasPreviousSignIn() || Boolean(GoogleSignin.getCurrentUser())
    );
  } catch (error) {
    console.warn('[googleSession] Failed to inspect Google session', error);
    return false;
  }
};

export const clearGoogleSession = async () => {
  configureGoogleSignin();

  const hasExistingGoogleSession = hasStoredGoogleSession();

  if (!hasExistingGoogleSession) {
    return true;
  }

  try {
    await GoogleSignin.revokeAccess();
  } catch (error) {
    console.warn('[googleSession] Failed to revoke Google access', error);
  }

  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.warn('[googleSession] Failed to sign out from Google', error);
  }

  return !hasStoredGoogleSession();
};

export const resetGoogleSessionOnFreshInstall = async () => {
  configureGoogleSignin();

  if (freshInstallCleanupPromise) {
    return freshInstallCleanupPromise;
  }

  freshInstallCleanupPromise = (async () => {
    try {
      const installMarker = await AsyncStorage.getItem(
        GOOGLE_SESSION_INSTALL_MARKER_KEY,
      );

      if (installMarker) {
        return;
      }

      const didClearGoogleSession = await clearGoogleSession();
      if (didClearGoogleSession) {
        await AsyncStorage.setItem(GOOGLE_SESSION_INSTALL_MARKER_KEY, '1');
      }
    } catch (error) {
      console.warn(
        '[googleSession] Failed to reset Google session on fresh install',
        error,
      );
    }
  })();

  return freshInstallCleanupPromise;
};
