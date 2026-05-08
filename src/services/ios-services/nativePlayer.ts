import { NativeModules, Platform } from 'react-native';

type MediaPlayerModule = {
  play: (mediaPath: string) => Promise<any> | void;
  stop: () => Promise<any> | void;
};

const { MediaPlayerModule } = NativeModules as { MediaPlayerModule?: MediaPlayerModule };

export async function startPlayer(mediaPath: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!MediaPlayerModule || typeof MediaPlayerModule.play !== 'function') {
    console.warn('MediaPlayer native module is not available on iOS.');
    return;
  }
  try {
    await MediaPlayerModule.play(mediaPath);
  } catch (error) {
    console.warn('MediaPlayer.play failed', error);
    throw error;
  }
}

export async function stopPlayer(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!MediaPlayerModule || typeof MediaPlayerModule.stop !== 'function') {
    console.warn('MediaPlayer native module is not available on iOS.');
    return;
  }
  try {
    await MediaPlayerModule.stop();
  } catch (error) {
    console.warn('MediaPlayer.stop failed', error);
    throw error;
  }
}

