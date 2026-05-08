import SoundPlayer from 'react-native-sound-player';
import { getSongDurationSec } from './songDisplayName';

const AUDIO_LOAD_TIMEOUT_MS = 1500;

const normalizeAudioUri = (source: string) => {
  if (
    source.startsWith('file://') ||
    source.startsWith('content://') ||
    source.startsWith('http://') ||
    source.startsWith('https://')
  ) {
    return source;
  }

  return `file://${source}`;
};

const isValidDuration = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const readCurrentSoundDuration = async (): Promise<number | null> => {
  try {
    const info = await SoundPlayer.getInfo();
    return isValidDuration(info?.duration) ? info.duration : null;
  } catch {
    return null;
  }
};

export const resolveAudioDuration = async (
  source: string | number | null | undefined,
  fallbackName?: string | null,
): Promise<number | null> => {
  const knownDuration = getSongDurationSec(source, fallbackName);
  if (isValidDuration(knownDuration)) {
    return knownDuration;
  }

  if (!source) {
    return null;
  }

  return new Promise(resolve => {
    let settled = false;
    let timeoutRef: ReturnType<typeof setTimeout> | null = null;

    const cleanup = (
      subscriptions: Array<{ remove?: () => void } | null | undefined>,
    ) => {
      subscriptions.forEach(subscription => {
        try {
          subscription?.remove?.();
        } catch {}
      });

      if (timeoutRef) {
        clearTimeout(timeoutRef);
        timeoutRef = null;
      }
    };

    const finish = (
      value: number | null,
      subscriptions: Array<{ remove?: () => void } | null | undefined>,
    ) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup(subscriptions);
      resolve(value);
    };

    const subscriptions: Array<{ remove?: () => void } | null> = [];

    const refreshDuration = async () => {
      const duration = await readCurrentSoundDuration();
      finish(duration, subscriptions);
    };

    subscriptions.push(
      SoundPlayer.addEventListener('FinishedLoading', () => {
        void refreshDuration();
      }),
    );
    subscriptions.push(
      SoundPlayer.addEventListener('OnSetupError', () => {
        finish(null, subscriptions);
      }),
    );

    timeoutRef = setTimeout(() => {
      void refreshDuration();
    }, AUDIO_LOAD_TIMEOUT_MS);

    try {
      if (typeof source === 'number') {
        SoundPlayer.loadAsset(source);
      } else {
        SoundPlayer.loadUrl(normalizeAudioUri(source));
      }
    } catch {
      finish(null, subscriptions);
    }
  });
};
