import { useEffect } from 'react';

import {
  configureGoogleSignin,
  resetGoogleSessionOnFreshInstall,
} from '@services/auth/googleSession';

export const useGoogleSignin = () => {
  useEffect(() => {
    const bootstrapGoogleSignin = async () => {
      try {
        configureGoogleSignin();
        await resetGoogleSessionOnFreshInstall();
      } catch (e) {
        console.warn('GoogleSignin configuration failed', e);
      }
    };

    void bootstrapGoogleSignin();
  }, []);
};
