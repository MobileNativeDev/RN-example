import { useCallback, useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';
import { tiktokSignIn } from '../api/auth';
import { consumePendingState, generateTikTokAuthUrl } from '@utils/tiktokOAuth';

type UseTikTokAuthParams = {
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
};

const TIKTOK_REDIRECT_HOST = 'example.appsonair.link';

export const useTikTokAuth = ({ setLoading, setError }: UseTikTokAuthParams) => {
  const tiktokPendingRef = useRef(false);

  const handleTikTokCallbackUrl = useCallback(async (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== TIKTOK_REDIRECT_HOST) {
        return false;
      }

      tiktokPendingRef.current = false;

      const code = parsed.searchParams.get('code');
      const returnedState = parsed.searchParams.get('state');
      const expectedState = consumePendingState();

      if (!code) {
        setError('TikTok sign-in failed: no code returned');
        setLoading(false);
        return true;
      }

      if (expectedState && returnedState !== expectedState) {
        setError('TikTok sign-in failed: state mismatch');
        setLoading(false);
        return true;
      }

      setLoading(true);
      await tiktokSignIn(code);
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'TikTok sign-in failed');
      return true;
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading]);

  const onSignInWithTikTok = async () => {
    setError(null);
    try {
      const { url } = generateTikTokAuthUrl();
      await Linking.openURL(url);
      setLoading(true);
      tiktokPendingRef.current = true;
    } catch (e: any) {
      setError(e?.message ?? 'Cannot open TikTok authorization');
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && tiktokPendingRef.current) {
        setTimeout(async () => {
          try {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
              const handled = await handleTikTokCallbackUrl(initialUrl);
              if (handled) {
                return;
              }
            }
          } catch {}

          if (tiktokPendingRef.current) {
            tiktokPendingRef.current = false;
            setLoading(false);
          }
        }, 500);
      }
    });

    return () => sub.remove();
  }, [handleTikTokCallbackUrl, setLoading]);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      await handleTikTokCallbackUrl(event.url);
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub.remove();
  }, [handleTikTokCallbackUrl]);

  return { onSignInWithTikTok };
};
