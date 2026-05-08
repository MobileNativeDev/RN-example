import { uploadMediaPuzzle } from '@api/alarms';
import { Image } from 'react-native';
import RNFS from 'react-native-fs';
import RNBlobUtil from 'react-native-blob-util';
import { extractNotificationSound } from '@services/ios-services';
import { Platform } from 'react-native';
import { Alert } from '@utils/alert';

export const parseYouTubeVideoId = (text: string): string | null => {
  if (!text) return null;
  const s = text.trim();
  // common URL patterns
  const match1 = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match1) return match1[1];
  const match2 = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match2) return match2[1];
  const match3 = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match3) return match3[1];
  // if user pasted ID only
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return null;
};

export const inferExt = (u: string, fallback: string) => {
  try {
    const withoutQuery = u.split('?')[0];
    const m = /\.([a-z0-9]+)$/i.exec(withoutQuery);
    return m ? m[1].toLowerCase() : fallback;
  } catch {
    return fallback;
  }
};

export const mimeForImage = (ext: string) => {
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

export const mimeForAudio = (ext: string) => {
  if (ext === 'mp3' || ext === 'mpeg') return 'audio/mpeg';
  if (ext === 'm4a') return 'audio/mp4';
  if (ext === 'aac') return 'audio/aac';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg') return 'audio/ogg';
  return 'audio/mpeg';
};

export const preferredAudioExtForUri = (u: string) => {
  try {
    const l = (u || '').toLowerCase();
    if (l.includes('.m4a')) return 'm4a';
    if (l.includes('.aac')) return 'aac';
    if (l.includes('.wav')) return 'wav';
    if (l.includes('.ogg')) return 'ogg';
    if (l.includes('.mp3') || l.includes('.mpeg')) return 'mp3';
    return 'm4a';
  } catch {
    return 'm4a';
  }
};

export const normalizeUri = (u: string | number | null | undefined) => {
  if (u == null) return '' as any;
  if (typeof u === 'number') {
    // Bundled asset module id -> resolve to actual file URI
    try {
      const resolved = Image.resolveAssetSource(u).uri;
      return resolved || '';
    } catch {
      return '' as any;
    }
  }
  if (typeof u !== 'string') return '' as any;
  const lower = u.toLowerCase();
  if (
    lower.startsWith('file://') ||
    lower.startsWith('content://') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://')
  )
    return u;
  return `file://${u}`;
};

const getExtension = (uri: string) => {
  const clean = uri.split('?')[0];
  const match = clean.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : 'wav';
};
export const copySoundToAppStorage = async (uri: string): Promise<string> => {
  try {
    const alarmsDir = `${RNFS.DocumentDirectoryPath}/alarms`;
    await RNFS.mkdir(alarmsDir);

    const uniq = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ext = getExtension(uri);
    const filename = `alarm_${uniq}.${ext}`;
    const targetPath = `${alarmsDir}/${filename}`;

    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      try {
        const downloadResult = await RNFS.downloadFile({
          fromUrl: uri,
          toFile: targetPath,
        }).promise;

        if (downloadResult.statusCode === 200) {
          console.log(
            '[copySoundToAppStorage] Downloaded successfully to:',
            targetPath,
          );
          return `file://${targetPath}`;
        } else {
          console.warn(
            '[copySoundToAppStorage] Download failed with status:',
            downloadResult.statusCode,
          );
          return uri;
        }
      } catch (downloadErr) {
        console.warn('[copySoundToAppStorage] Download error:', downloadErr);
        return uri;
      }
    }

    if (uri.startsWith('content://')) {
      const base64 = await RNFS.readFile(uri, 'base64');
      await RNFS.writeFile(targetPath, base64, 'base64');
      return `file://${targetPath}`;
    }

    if (uri.startsWith('file://')) {
      await RNFS.copyFile(uri.replace('file://', ''), targetPath);
      return `file://${targetPath}`;
    }

    console.warn('Unsupported URI format', uri);
    return uri;
  } catch (e) {
    console.warn('Failed to copy sound file', e);
    return uri;
  }
};

export const copyVideoToAppStorage = async (uri: string): Promise<string> => {
  try {
    const videosDir = `${RNFS.DocumentDirectoryPath}/videos`;
    await RNFS.mkdir(videosDir);

    const ext = inferExt(uri, 'mp4');
    const uniq = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const filename = `alarm_${uniq}.${ext}`;
    const targetPath = `${videosDir}/${filename}`;

    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      try {
        const downloadResult = await RNFS.downloadFile({
          fromUrl: uri,
          toFile: targetPath,
        }).promise;

        if (downloadResult.statusCode === 200) {
          console.log(
            '[copyVideoToAppStorage] Downloaded successfully to:',
            targetPath,
          );
          return `file://${targetPath}`;
        } else {
          console.warn(
            '[copyVideoToAppStorage] Download failed with status:',
            downloadResult.statusCode,
          );
          return uri;
        }
      } catch (downloadErr) {
        console.warn('[copyVideoToAppStorage] Download error:', downloadErr);
        return uri;
      }
    }

    if (uri.startsWith('content://')) {
      try {
        const res = await RNBlobUtil.config({ fileCache: true }).fetch(
          'GET',
          uri,
        );
        const tmpPath = res.path();
        await RNFS.copyFile(tmpPath, targetPath);
        try {
          await RNFS.unlink(tmpPath);
        } catch (e) {}
        return `file://${targetPath}`;
      } catch (e) {
        const base64 = await RNFS.readFile(uri, 'base64');
        await RNFS.writeFile(targetPath, base64, 'base64');
        return `file://${targetPath}`;
      }
    }

    if (uri.startsWith('file://')) {
      await RNFS.copyFile(uri.replace('file://', ''), targetPath);
      return `file://${targetPath}`;
    }

    console.warn('Unsupported video URI format', uri);
    return uri;
  } catch (e) {
    console.warn('Failed to copy video file', e);
    return uri;
  }
};

export const copyImageToAppStorage = async (uri: string): Promise<string> => {
  try {
    const imagesDir = `${RNFS.DocumentDirectoryPath}/images`;
    await RNFS.mkdir(imagesDir);

    const ext = inferExt(uri, 'jpg');
    const uniq = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const filename = `alarm_${uniq}.${ext}`;
    const targetPath = `${imagesDir}/${filename}`;

    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      try {
        const downloadResult = await RNFS.downloadFile({
          fromUrl: uri,
          toFile: targetPath,
        }).promise;

        if (downloadResult.statusCode !== 200) {
          console.warn(
            '[copyImageToAppStorage] Download failed with status:',
            downloadResult.statusCode,
          );
          return uri;
        }
      } catch (downloadErr) {
        console.warn('[copyImageToAppStorage] Download error:', downloadErr);
        return uri;
      }
    } else if (uri.startsWith('content://')) {
      try {
        const res = await RNBlobUtil.config({ fileCache: true }).fetch(
          'GET',
          uri,
        );
        const tmpPath = res.path();
        await RNFS.copyFile(tmpPath, targetPath);
        try {
          await RNFS.unlink(tmpPath);
        } catch (e) {}
      } catch (e) {
        const base64 = await RNFS.readFile(uri, 'base64');
        await RNFS.writeFile(targetPath, base64, 'base64');
      }
    } else if (uri.startsWith('file://')) {
      await RNFS.copyFile(uri.replace('file://', ''), targetPath);
    } else {
      console.warn('Unsupported image URI format', uri);
      return uri;
    }

    return `file://${targetPath}`;
  } catch (e) {
    console.warn('Failed to copy image file', e);
    return uri;
  }
};

export const tryA = async (option: any) => {
  const fd = new FormData();
  if (option.puzzleUri?.imageUri) {
    const imgUri = normalizeUri(option.puzzleUri.imageUri);
    const imgExt = inferExt(imgUri, 'jpg');
    const imgMime = mimeForImage(imgExt);
    fd.append('puzzle', {
      uri: imgUri,
      name: `puzzle.${imgExt}`,
      type: imgMime,
    } as any);
  }
  if (option.puzzleUri?.soundUri) {
    const sndUri = normalizeUri(option.puzzleUri.soundUri);
    const sndExt = inferExt(sndUri, 'mp3');
    const sndMime = mimeForAudio(sndExt);
    fd.append('song', {
      uri: sndUri,
      name: `puzzle_sound.${sndExt}`,
      type: sndMime,
    } as any);
  }
  const resp = await uploadMediaPuzzle(fd);
  try {
    console.log('Puzzle upload resp A:', resp);
    console.log(
      'Puzzle wakeMethod A:',
      JSON.stringify(resp?.wakeMethod || resp?.data?.wakeMethod),
    );
  } catch {}
  const wm = resp?.wakeMethod || resp?.data?.wakeMethod;
  const img = wm?.puzzleUrl?.imageUrl || pickUrl(resp);
  const snd = wm?.puzzleUrl?.soundUrl || null;
  return { imageUrl: img, soundUrl: snd };
};

export const tryB = async (option: any) => {
  const fd = new FormData();
  if (option.puzzleUri?.imageUri) {
    const imgUri = normalizeUri(option.puzzleUri.imageUri);
    const imgExt = inferExt(imgUri, 'jpg');
    const imgMime = mimeForImage(imgExt);
    fd.append('image', {
      uri: imgUri,
      name: `puzzle.${imgExt}`,
      type: imgMime,
    } as any);
  }
  if (option.puzzleUri?.soundUri) {
    const sndUri = normalizeUri(option.puzzleUri.soundUri);
    const sndExt = inferExt(sndUri, 'mp3');
    const sndMime = mimeForAudio(sndExt);
    fd.append('sound', {
      uri: sndUri,
      name: `puzzle_sound.${sndExt}`,
      type: sndMime,
    } as any);
  }
  const resp = await uploadMediaPuzzle(fd);
  try {
    console.log('Puzzle upload resp B:', resp);
    console.log(
      'Puzzle wakeMethod B:',
      JSON.stringify(resp?.wakeMethod || resp?.data?.wakeMethod),
    );
  } catch {}
  const wm = resp?.wakeMethod || resp?.data?.wakeMethod;
  const img = wm?.puzzleUrl?.imageUrl || pickUrl(resp);
  const snd = wm?.puzzleUrl?.soundUrl || null;
  return { imageUrl: img, soundUrl: snd };
};

export const tryC = async (option: any) => {
  const fd = new FormData();
  if (option.puzzleUri?.imageUri) {
    const imgUri = normalizeUri(option.puzzleUri.imageUri);
    const imgExt = inferExt(imgUri, 'jpg');
    const imgMime = mimeForImage(imgExt);
    fd.append('file', {
      uri: imgUri,
      name: `puzzle.${imgExt}`,
      type: imgMime,
    } as any);
  }
  const resp = await uploadMediaPuzzle(fd);
  try {
    console.log('Puzzle upload resp C:', resp);
    console.log(
      'Puzzle wakeMethod C:',
      JSON.stringify(resp?.wakeMethod || resp?.data?.wakeMethod),
    );
  } catch {}
  const wm = resp?.wakeMethod || resp?.data?.wakeMethod;
  const img = wm?.puzzleUrl?.imageUrl || pickUrl(resp);
  const snd = wm?.puzzleUrl?.soundUrl || null;
  return { imageUrl: img, soundUrl: snd };
};

export const pickUrl = (resp: any): string | null => {
  if (!resp) return null;
  try {
    const wm = resp?.wakeMethod || resp?.data?.wakeMethod;
    if (wm) {
      const puzzleImg = wm?.puzzleUrl?.imageUrl;
      if (typeof puzzleImg === 'string' && puzzleImg.length > 0) {
        return puzzleImg;
      }
      const preferred =
        wm.imageUrl || wm.videoUrl || wm.voiceUrl || wm.songUrl || wm.url;
      if (typeof preferred === 'string' && preferred.length > 0) {
        return preferred;
      }
    }
    const direct =
      resp?.url ||
      resp?.videoUrl ||
      resp?.voiceUrl ||
      resp?.songUrl ||
      resp?.imageUrl ||
      resp?.puzzleImageUrl;
    if (typeof direct === 'string' && direct.startsWith('http')) return direct;
    const data = resp?.data;
    const nested =
      data?.url ||
      data?.videoUrl ||
      data?.voiceUrl ||
      data?.songUrl ||
      data?.imageUrl ||
      data?.puzzleImageUrl;
    if (typeof nested === 'string' && nested.startsWith('http')) return nested;
    const scan = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      for (const v of Object.values(obj)) {
        if (typeof v === 'string' && /^https?:\/\//.test(v)) return v;
        if (v && typeof v === 'object') {
          const inner = scan(v);
          if (inner) return inner;
        }
      }
      return null;
    };
    return scan(resp);
  } catch {
    return null;
  }
};

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export const uploadWithBackoff = async <T>(
  fn: () => Promise<T>,
  opts?: {
    retries?: number;
    baseDelayMs?: number;
    shouldRetry?: (e: any) => boolean;
  },
): Promise<T> => {
  const retries = opts?.retries ?? 3;
  const baseDelay = opts?.baseDelayMs ?? 400;
  const shouldRetry =
    opts?.shouldRetry ?? ((e: any) => e?.response?.status === 503);
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (!shouldRetry(e) || attempt === retries) break;
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(
        `Transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${
          retries + 1
        })`,
        e?.response?.data || e?.message,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
};

const buildNotificationSoundFileName = (
  sourcePath: string,
  alarmId?: string,
) => {
  if (alarmId) return `sound_${alarmId}`;

  const normalized = String(sourcePath).trim().toLowerCase();
  let hash = 0;

  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }

  return `sound_${Math.abs(hash)}`;
};

export const getNotificationSound = async (path: string, alarmId?: string) => {
  try {
    if (Platform.OS !== 'ios') return path;

    if (!path || path === 'default') return path;

    const lower = String(path).toLowerCase();
    // if already m4a in Library/Sounds/, return just the filename
    if (lower.includes('/library/sounds/') && lower.endsWith('.m4a')) {
      const url = lower.startsWith('file://') ? lower : `file://${lower}`;
      try {
        const urlObj = new URL(url);
        return urlObj.pathname?.split('/').pop() || path;
      } catch {
        return path.split('/').pop() || path;
      }
    }

    const rawPath = String(path);
    const normalized =
      rawPath.startsWith('file://') ||
      rawPath.startsWith('content://') ||
      rawPath.startsWith('http://') ||
      rawPath.startsWith('https://')
        ? rawPath
        : `file://${rawPath}`;

    const outputFileName = buildNotificationSoundFileName(path, alarmId);

    try {
      const audioPath = await extractNotificationSound(
        normalized,
        outputFileName,
      );
      // Return only filename for iOS notifications
      return audioPath.split('/').pop() || audioPath;
    } catch (err) {
      console.warn(
        'Failed to extract notification sound, falling back to original path',
        err,
      );
      return path;
    }
  } catch (e) {
    console.warn('getNotificationSound error', e);
    return path;
  }
};

export async function validateVideoSize(uri: string): Promise<boolean> {
  const MAX_VIDEO_MB = 60;
  console.log('[validateVideoSize] checking video:', uri);

  try {
    // Normalize path for stat functions (strip file:// if present)
    const pathForStat =
      typeof uri === 'string' && uri.startsWith('file://')
        ? uri.replace('file://', '')
        : uri;

    try {
      const stat = await RNFS.stat(pathForStat);
      const size =
        typeof stat.size === 'string' ? Number(stat.size) : stat.size;
      const sizeMB = size / (1024 * 1024);
      console.log('[validateVideoSize] RNFS stat success:', { size, sizeMB });

      if (sizeMB > MAX_VIDEO_MB) {
        Alert.alert(
          'Video too large',
          `Maximum allowed size is ${MAX_VIDEO_MB}MB.\nYour file is ${sizeMB.toFixed(
            1,
          )}MB.`,
        );
        return false;
      }
      return true;
    } catch (firstErr) {
      console.warn(
        '[validateVideoSize] RNFS.stat failed, trying RNBlobUtil',
        firstErr,
      );

      try {
        const st = await RNBlobUtil.fs.stat(pathForStat as string);
        const size =
          typeof st.size === 'string' ? Number(st.size) : (st.size as number);
        const sizeMB = size / (1024 * 1024);
        console.log('[validateVideoSize] RNBlobUtil stat success:', {
          size,
          sizeMB,
        });

        if (sizeMB > MAX_VIDEO_MB) {
          Alert.alert(
            'Video too large',
            `Maximum allowed size is ${MAX_VIDEO_MB}MB.\nYour file is ${sizeMB.toFixed(
              1,
            )}MB.`,
          );
          return false;
        }
        return true;
      } catch (secondErr) {
        console.warn(
          '[validateVideoSize] RNBlobUtil.stat failed, trying to copy file to app storage',
          secondErr,
        );

        try {
          const copied = await copyVideoToAppStorage(uri);
          const copiedPathForStat =
            typeof copied === 'string' && copied.startsWith('file://')
              ? copied.replace('file://', '')
              : copied;
          const stat2 = await RNFS.stat(copiedPathForStat);
          const size =
            typeof stat2.size === 'string' ? Number(stat2.size) : stat2.size;
          const sizeMB = size / (1024 * 1024);
          console.log('[validateVideoSize] copied file stat success:', {
            size,
            sizeMB,
            copied,
          });

          if (sizeMB > MAX_VIDEO_MB) {
            Alert.alert(
              'Video too large',
              `Maximum allowed size is ${MAX_VIDEO_MB}MB.\nYour file is ${sizeMB.toFixed(
                1,
              )}MB.`,
            );
            try {
              await RNFS.unlink(copiedPathForStat);
            } catch (e) {}
            return false;
          }
          try {
            await RNFS.unlink(copiedPathForStat);
          } catch (e) {}
          return true;
        } catch (thirdErr) {
          console.warn('[validateVideoSize] copy+stat failed', thirdErr);
          Alert.alert(
            'Video validation error',
            'Unable to determine file size. Please try a different video.',
          );
          return false;
        }
      }
    }
  } catch (e) {
    console.warn('[validateVideoSize] unexpected error', e);
    Alert.alert('Error', 'An error occurred while checking video size.');
    return false;
  }
}
