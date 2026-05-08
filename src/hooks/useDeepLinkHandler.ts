import { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';
import { parseDeepLink } from '@utils/deepLink';
import { pairFriend } from '@api/friends';
import { store } from '@store/store';
import { selectUserId } from '@store/auth/selectors';

export function useDeepLinkHandler(
  navigate: (name: string, params?: any) => void,
) {
  const handleResetPasswordLink = useCallback(
    (token: string) => {
      navigate('AuthNavigation', {
        screen: 'CreateNewPasswordScreen',
        params: {
          token,
          deepLinkNonce: Date.now(),
        },
      });
    },
    [navigate],
  );

  const handleInviteLink = useCallback(
    async (referrerId: string) => {
      const myUserId = selectUserId(store.getState());
      if (myUserId) {
        try {
          await pairFriend(myUserId, referrerId);
        } catch (e) {
          console.warn('pairFriend error', e);
        }
      }
      navigate('MyTabs', { screen: 'FriendsStack' });
    },
    [navigate],
  );

  // Warm-start: app is already running when the link is tapped
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = parseDeepLink(url);
      if (parsed.type === 'invite') {
        handleInviteLink(parsed.referrerId);
      } else if (parsed.type === 'reset-password') {
        handleResetPasswordLink(parsed.token);
      }
    });
    return () => subscription.remove();
  }, [handleInviteLink, handleResetPasswordLink]);

  /**
   * Cold-start: call this inside NavigationContainer's onReady to handle
   * the URL that launched the app from a closed state.
   */
  const handleInitialDeepLink = useCallback(
    async (navigationRef: any) => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (!initialUrl) return;
        const parsed = parseDeepLink(initialUrl);
        if (parsed.type === 'invite') {
          const myUserId = selectUserId(store.getState());
          if (myUserId) {
            try {
              await pairFriend(myUserId, parsed.referrerId);
            } catch (e) {
              console.warn('pairFriend error', e);
            }
          }
          navigationRef?.navigate('MyTabs', { screen: 'FriendsStack' });
        } else if (parsed.type === 'reset-password') {
          navigationRef?.navigate('AuthNavigation', {
            screen: 'CreateNewPasswordScreen',
            params: {
              token: parsed.token,
              deepLinkNonce: Date.now(),
            },
          });
        }
      } catch (e) {
        console.warn('Initial deep link handling error', e);
      }
    },
    [],
  );

  return { handleInitialDeepLink };
}
