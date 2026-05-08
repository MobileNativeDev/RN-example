import { View, TouchableOpacity } from 'react-native';
import { Alert } from '@utils/alert';
import { Puzzle } from '@components/createAlarm/wakeUpOptions/Puzzle';
import { Voice } from '@components/createAlarm/wakeUpOptions/Voice';
import { Video } from '@components/createAlarm/wakeUpOptions/Video';
import { Song } from '@components/createAlarm/wakeUpOptions/Song';
import { Alarm } from '@appTypes/types';
import {
  getWakeMethodOverrideKey,
  WakeMethodMediaOverride,
} from '../utils/wakeMethodOverrides';

interface WakeMethodsListProps {
  wakeMethods: any[];
  alarmData: Alarm | null;
  isOwner: boolean;
  canShowMedia: boolean;
  openable: boolean;
  // Media states
  imageUri: string | null;
  puzzleSoundUri: string | number | null;
  puzzleSongName?: string | null;
  voiceUri: string | number | null;
  voiceName?: string | null;
  voiceOverrides?: Record<string, WakeMethodMediaOverride>;
  songUri: string | number | null;
  songName?: string | null;
  songOverrides?: Record<string, WakeMethodMediaOverride>;
  videoUri: string | null;
  videoLink: string | null;
  // Deletion states
  puzzleDeleted: boolean;
  voiceDeleted: boolean;
  videoDeleted: boolean;
  songDeleted: boolean;
  // Setters
  setImageUri: (uri: string | null) => void;
  setPuzzleSoundUri: (uri: string | number | null) => void;
  setPuzzleSongName?: (name: string | null) => void;
  setVoiceUri: (uri: string | number | null) => void;
  setVoiceName?: (name: string | null) => void;
  setVoiceOverride?: (
    methodKey: string,
    patch: WakeMethodMediaOverride,
  ) => void;
  setSongUri: (uri: string | number | null) => void;
  setSongName?: (name: string | null) => void;
  setSongOverride?: (methodKey: string, patch: WakeMethodMediaOverride) => void;
  setVideoUri: (uri: string | null) => void;
  setVideoLink: (link: string | null) => void;
  setPuzzleDeleted: (deleted: boolean) => void;
  setVoiceDeleted: (deleted: boolean) => void;
  setVideoDeleted: (deleted: boolean) => void;
  setSongDeleted: (deleted: boolean) => void;
}

export const WakeMethodsList = ({
  wakeMethods,
  alarmData,
  isOwner,
  canShowMedia,
  openable,
  imageUri,
  puzzleSoundUri,
  puzzleSongName,
  voiceUri,
  voiceName,
  voiceOverrides,
  songUri,
  songName,
  songOverrides,
  videoUri,
  videoLink,
  puzzleDeleted,
  voiceDeleted,
  videoDeleted,
  songDeleted,
  setImageUri,
  setPuzzleSoundUri,
  setPuzzleSongName,
  setVoiceUri,
  setVoiceName,
  setVoiceOverride,
  setSongUri,
  setSongName,
  setSongOverride,
  setVideoUri,
  setVideoLink,
  setPuzzleDeleted,
  setVoiceDeleted,
  setVideoDeleted,
  setSongDeleted,
}: WakeMethodsListProps) => {
  const voiceMethodCount = wakeMethods.filter((method: any) => {
    const type =
      typeof method === 'string' ? method.toUpperCase() : method?.type;
    return type === 'VOICE';
  }).length;
  const hasSingleVoiceMethod = voiceMethodCount === 1;
  const songMethodCount = wakeMethods.filter((method: any) => {
    const type =
      typeof method === 'string' ? method.toUpperCase() : method?.type;
    return type === 'SONG';
  }).length;
  const hasSingleSongMethod = songMethodCount === 1;

  const renderers = {
    PUZZLE: (method: any, idx: number) => (
      <Puzzle
        puzzleUri={
          puzzleDeleted
            ? { imageUri: null, soundUri: null }
            : {
                imageUri:
                  imageUri ||
                  method?.puzzleUrl?.imageUrl ||
                  alarmData?.puzzleImageUrl?.imageUrl ||
                  null,
                soundUri:
                  puzzleSoundUri ||
                  method?.puzzleUrl?.soundUrl ||
                  alarmData?.puzzleImageUrl?.soundUrl ||
                  null,
              }
        }
        songName={puzzleSongName || method?.songName || null}
        order={idx}
        setPuzzleUri={
          isOwner
            ? uri => {
                if (uri) {
                  setImageUri(uri.imageUri);
                  setPuzzleSoundUri(uri.soundUri);
                  setPuzzleDeleted(false);
                } else {
                  setImageUri(null);
                  setPuzzleSoundUri(null);
                  setPuzzleSongName?.(null);
                  setPuzzleDeleted(true);
                }
              }
            : undefined
        }
        setSongName={isOwner ? setPuzzleSongName : undefined}
        openable={!!openable}
      />
    ),
    VOICE: (method: any, idx: number) => {
      const methodKey = getWakeMethodOverrideKey(method, idx);
      const override = voiceOverrides?.[methodKey];
      const hasVoiceUriOverride = Boolean(
        override && Object.prototype.hasOwnProperty.call(override, 'uri'),
      );
      const hasVoiceNameOverride = Boolean(
        override && Object.prototype.hasOwnProperty.call(override, 'name'),
      );
      const baseVoiceUri = hasSingleVoiceMethod
        ? voiceUri ||
          method?.localVoicePath ||
          method?.voiceUrl ||
          (alarmData as any)?.voiceUrl ||
          null
        : method?.localVoicePath || method?.voiceUrl || null;
      const baseVoiceName = hasSingleVoiceMethod
        ? voiceName ||
          method?.voiceName ||
          (alarmData as any)?.voiceName ||
          null
        : method?.voiceName || null;

      return (
        <Voice
          voiceUri={
            override?.deleted || (hasSingleVoiceMethod && voiceDeleted)
              ? null
              : hasVoiceUriOverride
              ? override?.uri ?? null
              : baseVoiceUri
          }
          voiceName={
            override?.deleted || (hasSingleVoiceMethod && voiceDeleted)
              ? null
              : hasVoiceNameOverride
              ? override?.name ?? null
              : baseVoiceName
          }
          setVoiceUri={
            isOwner
              ? uri => {
                  if (hasSingleVoiceMethod) {
                    setVoiceUri(uri);
                    setVoiceDeleted(uri === null);
                    if (uri === null) setVoiceName?.(null);
                    return;
                  }

                  setVoiceOverride?.(methodKey, {
                    uri,
                    deleted: uri === null,
                    ...(uri === null ? { name: null } : {}),
                  });
                }
              : undefined
          }
          setVoiceName={
            isOwner
              ? name => {
                  if (hasSingleVoiceMethod) {
                    setVoiceName?.(name);
                    return;
                  }

                  setVoiceOverride?.(methodKey, {
                    name,
                    deleted: false,
                  });
                }
              : undefined
          }
          order={idx}
          openable={!!openable}
        />
      );
    },
    VIDEO: (method: any, idx: number) => (
      <Video
        videoUri={videoDeleted ? null : videoUri || method?.videoUrl}
        setVideoUri={
          isOwner
            ? uri => {
                setVideoUri(uri);
                setVideoDeleted(uri === null);
              }
            : undefined
        }
        videoLink={videoLink}
        setVideoLink={isOwner ? setVideoLink : undefined}
        order={idx}
        openable={!!openable}
      />
    ),
    SONG: (method: any, idx: number) =>
      (() => {
        const methodKey = getWakeMethodOverrideKey(method, idx);
        const override = songOverrides?.[methodKey];
        const hasSongUriOverride = Boolean(
          override && Object.prototype.hasOwnProperty.call(override, 'uri'),
        );
        const hasSongNameOverride = Boolean(
          override && Object.prototype.hasOwnProperty.call(override, 'name'),
        );
        const baseSongUri = hasSingleSongMethod
          ? songUri ||
            method?.localSongPath ||
            method?.songUrl ||
            (alarmData as any)?.songUrl ||
            null
          : method?.localSongPath || method?.songUrl || null;
        const baseSongName = hasSingleSongMethod
          ? songName || method?.songName || (alarmData as any)?.songName || null
          : method?.songName || null;

        return (
          <Song
            songUri={
              override?.deleted || (hasSingleSongMethod && songDeleted)
                ? null
                : hasSongUriOverride
                ? override?.uri ?? null
                : baseSongUri
            }
            songName={
              override?.deleted || (hasSingleSongMethod && songDeleted)
                ? null
                : hasSongNameOverride
                ? override?.name ?? null
                : baseSongName
            }
            setSongUri={
              isOwner
                ? uri => {
                    if (hasSingleSongMethod) {
                      setSongUri(uri);
                      setSongDeleted(uri === null);
                      if (uri === null) setSongName?.(null);
                      return;
                    }

                    setSongOverride?.(methodKey, {
                      uri,
                      deleted: uri === null,
                      ...(uri === null ? { name: null } : {}),
                    });
                  }
                : undefined
            }
            setSongName={
              isOwner
                ? name => {
                    if (hasSingleSongMethod) {
                      setSongName?.(name);
                      return;
                    }

                    setSongOverride?.(methodKey, {
                      name,
                      deleted: false,
                    });
                  }
                : undefined
            }
            order={idx}
            openable={!!openable}
          />
        );
      })(),
  } as const;

  return (
    <>
      {wakeMethods.map((method: any, idx: number) => {
        const type =
          typeof method === 'string' ? method.toUpperCase() : method.type;
        const render = renderers[type as keyof typeof renderers];
        if (!render) return null;
        const showBlockedOverlay = !canShowMedia;

        return (
          <View
            key={`${method.id || type}-${idx}`}
            style={{ position: 'relative' }}
          >
            {render(method, idx)}
            {showBlockedOverlay ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert(
                    'Surprise!',
                    "This wake method is a surprise — you'll see it when the alarm plays.",
                  );
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
              />
            ) : null}
            {idx !== wakeMethods.length - 1 ? (
              <View className="border-t border-borderColor mb-4" />
            ) : null}
          </View>
        );
      })}
    </>
  );
};
