import {
  copySoundToAppStorage,
  copyVideoToAppStorage,
  inferExt,
  mimeForAudio,
  normalizeUri,
  pickUrl,
  preferredAudioExtForUri,
  tryA,
  tryB,
  tryC,
  uploadWithBackoff,
  sleep,
  validateVideoSize,
} from '@utils/additionFunctions';
import RNFS from 'react-native-fs';
import { uploadMediaSong, uploadMediaVoice } from '@api/alarms';
import uploadLocal from '@utils/uploadVideo';
import { Alert } from '@utils/alert';
import { getUserFriendlyErrorMessage } from '@utils/networkErrors';
import { getSongDisplayName } from '@utils/songDisplayName';
import { getVoiceDisplayName } from '@utils/voiceDisplayName';

export const uploadFiles = async (wakeUpWith: any[]): Promise<any[]> => {
  const wakeMethodsWithUrls: Array<any> = [];

  for (const option of wakeUpWith) {
    const methodData: any = { id: option.id, type: option.type };

    try {
      if (option.type === 'Puzzle' && option.puzzleUri) {
        let imgUrl: string | null = null;
        let soundUrl: string | null = null;
        let lastUploadErr: any = null;
        const resolvedPuzzleSongName =
          typeof option.songName === 'string' &&
          option.songName.trim().length > 0
            ? option.songName.trim()
            : getSongDisplayName(option.puzzleUri?.soundUri ?? null, null);

        try {
          const result = await tryA(option);
          if (result?.imageUrl) {
            imgUrl = result.imageUrl;
            soundUrl = result.soundUrl;
          } else {
            const result2 = await tryB(option);
            if (result2?.imageUrl) {
              imgUrl = result2.imageUrl;
              soundUrl = result2.soundUrl;
            } else {
              const result3 = await tryC(option);
              if (result3?.imageUrl) {
                imgUrl = result3.imageUrl;
                soundUrl = result3.soundUrl;
              }
            }
          }
        } catch (e: any) {
          lastUploadErr = e;
        }

        if (!imgUrl) {
          const status =
            lastUploadErr?.response?.status ?? lastUploadErr?.status ?? null;
          const message = getUserFriendlyErrorMessage(
            lastUploadErr,
            'Puzzle image upload failed.',
          );
          throw {
            type: 'UPLOAD_FAILED',
            failedOption: {
              id: option.id,
              type: 'Puzzle',
              reason: String(message),
              status,
              message,
            },
          };
        }

        methodData.puzzleUri = imgUrl;
        methodData.puzzleSoundUri = soundUrl;
        methodData.songName = resolvedPuzzleSongName || null;
      } else if (option.type === 'Song' && option.songUri) {
        const fileUri = normalizeUri(option.songUri);
        let url: string | null = null;
        const resolvedSongName =
          typeof option.songName === 'string' &&
          option.songName.trim().length > 0
            ? option.songName.trim()
            : getSongDisplayName(option.songUri, null);
        const lowerUri = fileUri.toLowerCase();
        if (lowerUri.includes('youtube') || lowerUri.includes('youtu.be')) {
          url = fileUri;
        } else {
          const ext = inferExt(fileUri, 'mp3');
          const mime = mimeForAudio(ext);
          try {
            const fdFile = new FormData();
            fdFile.append('file', {
              uri: fileUri,
              name: `song.${ext}`,
              type: mime,
            } as any);
            const resp2 = await uploadWithBackoff(() =>
              uploadMediaSong(fdFile),
            );
            url = pickUrl(resp2) || resp2?.songUrl || null;
          } catch (e: any) {
            // fallthrough
          }
        }

        if (!url) {
          throw {
            type: 'UPLOAD_FAILED',
            failedOption: {
              id: option.id,
              type: 'Song',
              reason: 'song upload failed',
            },
          };
        }
        methodData.songUri = url;
        methodData.songName = resolvedSongName || null;
      } else if (option.type === 'Voice' && option.voiceUri) {
        const fileUri = normalizeUri(option.voiceUri);
        const ext = inferExt(fileUri, preferredAudioExtForUri(fileUri));
        const mime = mimeForAudio(ext);
        const resolvedVoiceName =
          typeof option.voiceName === 'string' &&
          option.voiceName.trim().length > 0
            ? option.voiceName.trim()
            : getVoiceDisplayName(option.voiceUri, null);
        let url: string | null = null;
        let fileStats: any = null;

        try {
          const path =
            typeof fileUri === 'string' && fileUri.startsWith('file://')
              ? fileUri.replace('file://', '')
              : fileUri;
          try {
            const stat = await RNFS.stat(path as string);
            const size =
              typeof stat.size === 'string' ? Number(stat.size) : stat.size;
            fileStats = {
              exists: true,
              path,
              size,
              sizeMB: size / (1024 * 1024),
            };
            console.log('[uploadFiles] voice file stats', fileStats);
          } catch (statErr) {
            fileStats = { exists: false, path, statErr: String(statErr) };
            console.warn('[uploadFiles] failed to stat voice file', fileStats);
          }

          // Enforce server limit: 1MB
          if (
            fileStats &&
            fileStats.exists &&
            typeof fileStats.sizeMB === 'number' &&
            fileStats.sizeMB > 1
          ) {
            console.log('111111');

            throw {
              type: 'UPLOAD_FAILED',
              message: 'File size exceeds 1MB limit',
              failedOption: {
                id: option.id,
                type: 'Voice',
                reason: `File size must not exceed 1MB (was ${fileStats.sizeMB.toFixed(
                  2,
                )}MB)`,
                fileStats,
              },
            };
          }

          const fd = new FormData();
          fd.append('file', {
            uri: fileUri,
            name: `voice.${ext}`,
            type: mime,
          } as any);
          let resp: any = null;
          try {
            resp = await uploadWithBackoff(() => uploadMediaVoice(fd));
          } catch (e: any) {}

          const wm = resp?.wakeMethod || resp?.data?.wakeMethod;
          const direct =
            wm?.voiceUrl || resp?.voiceUrl || resp?.url || resp?.previewUrl;
          url = pickUrl(resp) || direct || null;
          await sleep(200);
        } catch (e: any) {
          if (e && e.type === 'UPLOAD_FAILED') {
            throw {
              type: 'UPLOAD_FAILED',
              message: 'File size exceeds 1MB limit',
              failedOption: {
                id: option.id,
                type: 'Voice',
                reason: `File size must not exceed 1MB (was ${fileStats.sizeMB.toFixed(
                  2,
                )}MB)`,
                fileStats,
              },
            };
          }
        }

        if (!url) {
          throw {
            type: 'UPLOAD_FAILED',
            failedOption: {
              id: option.id,
              type: 'Voice',
              reason: 'Voice upload failed',
            },
          };
        }

        methodData.voiceUri = url;
        methodData.voiceName = resolvedVoiceName || null;
      } else if (option.type === 'Video') {
        if (option.videoUri) {
          const ok = await validateVideoSize(option.videoUri);

          if (!ok) {
            throw {
              type: 'UPLOAD_FAILED',
              failedOption: {
                id: option.id,
                type: 'Video',
                reason: 'Video exceeds 60MB limit',
              },
            };
          }
          let url: string | null = null;
          try {
            url = await uploadLocal(option.videoUri);
          } catch (e: any) {
            const errorMsg = getUserFriendlyErrorMessage(
              e,
              'Video upload failed.',
            );
            throw {
              type: 'UPLOAD_FAILED',
              failedOption: { id: option.id, type: 'Video', reason: errorMsg },
            };
          }
          methodData.videoUri = url;
        } else if (option.videoLink) {
          methodData.videoLink = option.videoLink;
        } else {
          throw {
            type: 'UPLOAD_FAILED',
            failedOption: {
              id: option.id,
              type: 'Video',
              reason: 'no video uri or link provided',
            },
          };
        }
      }

      wakeMethodsWithUrls.push(methodData);
    } catch (uploadErr: any) {
      if (uploadErr && uploadErr.type === 'UPLOAD_FAILED') throw uploadErr;
      const status = uploadErr?.response?.status ?? uploadErr?.status ?? null;
      const friendlyMessage = getUserFriendlyErrorMessage(
        uploadErr,
        `${option.type} upload failed.`,
      );
      throw {
        type: 'UPLOAD_FAILED',
        failedOption: {
          id: option.id,
          type: option.type,
          reason: friendlyMessage,
          status,
          message: friendlyMessage,
        },
      };
    }
  }

  return wakeMethodsWithUrls;
};

export const buildWakeMethodsPayload = (wakeMethodsWithUrls: any[]) =>
  wakeMethodsWithUrls
    .filter(m => {
      if (m.type === 'Voice') return !!m.voiceUri;
      if (m.type === 'Video') return !!m.videoUri || !!m.videoLink;
      if (m.type === 'Song') return !!m.songUri;
      if (m.type === 'Puzzle') return !!m.puzzleUri;
      return false;
    })
    .map(m => {
      const option: any = {
        type: m.type.toUpperCase(),
        voiceUrl: null,
        voiceName: null,
        videoUrl: null,
        songUrl: null,
        songName: null,
        puzzleUrl: null,
      };
      if (m.type === 'Voice' && m.voiceUri) {
        option.voiceUrl = m.voiceUri;
        option.voiceName = m.voiceName || null;
      } else if (m.type === 'Video')
        option.videoUrl = m.videoUri || m.videoLink || null;
      else if (m.type === 'Song' && m.songUri) {
        option.songUrl = m.songUri;
        option.songName = m.songName || null;
      } else if (m.type === 'Puzzle' && m.puzzleUri) {
        option.songName = m.songName || null;
        option.puzzleUrl = {
          imageUrl: m.puzzleUri,
          soundUrl: m.puzzleSoundUri || null,
        };
      }
      return option;
    });

const shouldIgnoreAlarmForDuplicateCheck = (alarm: any) => {
  const approvalStatus = String(alarm?.approvalStatus || '').toUpperCase();
  const status = String(alarm?.status || '').toUpperCase();

  return approvalStatus === 'PENDING' || status === 'PENDING';
};

export function isDuplicateAlarm(date: string, time: string, upcoming: any[]) {
  return upcoming.some(a => {
    if (!a?.scheduledAt || shouldIgnoreAlarmForDuplicateCheck(a)) return false;

    const d = new Date(a.scheduledAt);

    const existingDate = d.toISOString().slice(0, 10);
    const existingTime = d.toISOString().slice(11, 16);

    return existingDate === date && existingTime === time;
  });
}

export const notificationSoundSetup = async (first: any) => {
  let notificationSound: string = 'default';
  let notificationVideo: string | null = null;

  if (first.type === 'Voice' && first.voiceUri) {
    notificationSound = await copySoundToAppStorage(
      normalizeUri(first.voiceUri),
    );
  } else if (first.type === 'Song' && first.songUri) {
    notificationSound = await copySoundToAppStorage(
      normalizeUri(first.songUri),
    );
  } else if (first.type === 'Puzzle' && first.puzzleUri?.soundUri) {
    notificationSound = await copySoundToAppStorage(
      normalizeUri(first.puzzleUri.soundUri),
    );
  } else if (first.type === 'Video' && first.videoUri) {
    notificationVideo = await copyVideoToAppStorage(
      normalizeUri(first.videoUri),
    );
  }
  return { notificationSound, notificationVideo };
};
export const VALID_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const getRecurringDaysPayload = (
  recurring: boolean,
  recurringDays: Array<string | number> | null | undefined,
) => {
  if (recurring && (!recurringDays || recurringDays.length === 0)) {
    Alert.alert(
      'Missing recurring days',
      'Please select at least one day for a recurring alarm.',
    );
    return;
  }

  return recurring && recurringDays
    ? recurringDays
        .map(d => String(d).toUpperCase())
        .filter(d => VALID_DAYS.includes(d))
    : [];
};
export const FOOTER_HEIGHT = 86;

export const parseServerScheduled = (v: any): number | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    if (/^\d+$/.test(v)) return parseInt(v, 10);
    const parsed = Date.parse(v);
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
};
