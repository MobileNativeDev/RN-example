import { requestStoragePermission } from './permissions';
import { Image, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import logger from './logger';

const toFileUri = (input: string): string => {
  if (input.startsWith('file://')) return input;
  if (input.startsWith('/')) return `file://${input}`;
  return input;
};

const remoteTempDownloads = new Map<string, Promise<string | null>>();

const buildTempMediaPath = (url: string, prefix: string) => {
  const ext = url.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1] ?? 'mp3';
  const key = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })()
    .replace(/[^a-z0-9]/gi, '_')
    .slice(-40);

  return `${RNFS.TemporaryDirectoryPath}/${prefix}_${key}.${ext}`;
};

const resolveBundledMediaPath = async ({
  input,
  filename,
  assetFolder,
  fallbackFilename,
  requestAccess,
}: {
  input: string | number;
  filename?: string;
  assetFolder: string;
  fallbackFilename: string;
  requestAccess?: () => Promise<unknown>;
}): Promise<string> => {
  if (requestAccess) {
    await requestAccess();
  }

  if (typeof input === 'string') {
    return toFileUri(input);
  }

  const resolved = Image.resolveAssetSource(input);

  if (!resolved?.uri) {
    throw new Error('Cannot resolve asset ID');
  }

  const assetFilename =
    filename || resolved.uri.split('/').pop()?.split('?')[0] || fallbackFilename;
  const destPath = `${RNFS.CachesDirectoryPath}/${assetFilename}`;

  if (await RNFS.exists(destPath)) {
    return `file://${destPath}`;
  }

  if (Platform.OS === 'android') {
    await RNFS.copyFileAssets(`${assetFolder}/${assetFilename}`, destPath);
    return `file://${destPath}`;
  }

  if (resolved.uri.startsWith('http')) {
    const downloadResult = await RNFS.downloadFile({
      fromUrl: resolved.uri,
      toFile: destPath,
    }).promise;

    if (downloadResult.statusCode !== 200) {
      throw new Error(`Download failed with status ${downloadResult.statusCode}`);
    }

    return `file://${destPath}`;
  }

  await RNFS.copyFile(resolved.uri.replace('file://', ''), destPath);
  return `file://${destPath}`;
};

export const resolveSongPath = (
  input: string | number,
  filename?: string,
): Promise<string> =>
  resolveBundledMediaPath({
    input,
    filename,
    assetFolder: 'songs',
    fallbackFilename: 'audio.mp3',
  });

export const resolveVoicePath = (
  input: string | number,
  filename?: string,
): Promise<string> =>
  resolveBundledMediaPath({
    input,
    filename,
    assetFolder: 'voices',
    fallbackFilename: 'audio.mp3',
  });

export const resolveVideoPath = (
  input: string | number,
  filename?: string,
): Promise<string> =>
  resolveBundledMediaPath({
    input,
    filename,
    assetFolder: 'videos',
    fallbackFilename: 'video.mp4',
    requestAccess: requestStoragePermission,
  });

export const downloadRemoteMediaToTemp = async (
  url: string,
  prefix = 'media',
): Promise<string | null> => {
  const cacheKey = `${prefix}:${url}`;
  const cached = remoteTempDownloads.get(cacheKey);
  if (cached) {
    return cached;
  }

  const task = (async () => {
    try {
      const tmpPath = buildTempMediaPath(url, prefix);

      if (await RNFS.exists(tmpPath)) {
        return `file://${tmpPath}`;
      }

      const result = await RNFS.downloadFile({
        fromUrl: url,
        toFile: tmpPath,
      }).promise;

      if (result.statusCode === 200) {
        return `file://${tmpPath}`;
      }

      return null;
    } catch (error) {
      logger.warn('[media] remote temp download failed', error);
      remoteTempDownloads.delete(cacheKey);
      return null;
    }
  })();

  remoteTempDownloads.set(cacheKey, task);
  return task;
};
