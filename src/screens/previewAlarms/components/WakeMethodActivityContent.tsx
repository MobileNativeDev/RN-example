import { Alarm } from '@appTypes/types';
import { PuzzleActivity } from '@components/wakeUpActivityOptions/PuzzleActivity';
import { SongActivity } from '@components/wakeUpActivityOptions/SongActivity';
import { VideoActivity } from '@components/wakeUpActivityOptions/VideoActivity';
import { VoiceActivity } from '@components/wakeUpActivityOptions/VoiceActivity';
import BigClock from '@assets/svg/BigClock.svg';
import { formatDateString, formatTimeString } from '@utils/time';
import { Image, Text, View } from 'react-native';

type WakeMethod = any;

type PuzzleUri = {
  imageUri: string | null;
  soundUri: string | number | null;
} | null;

export type WakeMethodActivityOptions = {
  autoPlay?: boolean;
  completed?: boolean;
  controllable?: boolean;
  canStop?: boolean;
  widthSlide?: number;
  horizontalPadding?: number;
  mediaHeight?: number;
  puzzleUri?: PuzzleUri;
  onPuzzleComplete?: () => void;
};

const getMethodType = (method: WakeMethod): string =>
  typeof method === 'string'
    ? method.toUpperCase()
    : String(method?.type || '');

const getAlarmPuzzleImage = (alarmData: Alarm | null) =>
  (alarmData as any)?.puzzleImageUrl?.imageUrl ||
  (alarmData as any)?.puzzleImageUrl ||
  null;

const getAlarmPuzzleSound = (alarmData: Alarm | null) =>
  (alarmData as any)?.puzzleImageUrl?.soundUrl || null;

const buildDefaultPuzzleUri = (
  method: WakeMethod,
  alarmData: Alarm | null,
): PuzzleUri => ({
  imageUri:
    method?.localPuzzleImagePath ||
    method?.puzzleUrl?.imageUrl ||
    getAlarmPuzzleImage(alarmData),
  soundUri:
    method?.localPuzzleSoundPath ||
    method?.puzzleUrl?.soundUrl ||
    getAlarmPuzzleSound(alarmData),
});

export const renderWakeMethodActivity = (
  method: WakeMethod,
  alarmData: Alarm | null,
  options: WakeMethodActivityOptions = {},
) => {
  const type = getMethodType(method);

  switch (type) {
    case 'PUZZLE':
      return (
        <PuzzleActivity
          puzzleUri={
            options.puzzleUri ?? buildDefaultPuzzleUri(method, alarmData)
          }
          onComplete={options.onPuzzleComplete}
          autoPlay={options.autoPlay}
          completed={options.completed}
          widthSlide={options.widthSlide}
          horizontalPadding={options.horizontalPadding}
          mediaHeight={options.mediaHeight}
        />
      );
    case 'VOICE':
      return (
        <VoiceActivity
          voiceUri={
            method?.localVoicePath ||
            method?.voiceUrl ||
            (alarmData as any)?.voiceUrl ||
            null
          }
          voiceName={method?.voiceName || (alarmData as any)?.voiceName || null}
          autoPlay={options.autoPlay}
          controllable={options.controllable}
        />
      );
    case 'VIDEO':
      return (
        <VideoActivity
          videoUri={
            method?.localVideoPath ||
            method?.videoUrl ||
            (alarmData as any)?.videoUrl ||
            null
          }
          autoPlay={options.autoPlay}
          canStop={options.canStop}
        />
      );
    case 'SONG':
      return (
        <SongActivity
          songUri={
            method?.localSongPath ||
            method?.songUrl ||
            (alarmData as any)?.songUrl ||
            null
          }
          songName={method?.songName || (alarmData as any)?.songName || null}
          autoPlay={options.autoPlay}
          controllable={options.controllable}
        />
      );
    default:
      return null;
  }
};

type WakeMethodActivityListProps = {
  wakeMethods: WakeMethod[];
  alarmData: Alarm | null;
  getOptions?: (
    method: WakeMethod,
    idx: number,
    type: string,
  ) => WakeMethodActivityOptions;
};

export const WakeMethodActivityList = ({
  wakeMethods,
  alarmData,
  getOptions,
}: WakeMethodActivityListProps) => (
  <>
    {wakeMethods.map((method, idx) => {
      const type = getMethodType(method);
      const content = renderWakeMethodActivity(
        method,
        alarmData,
        getOptions?.(method, idx, type),
      );

      if (!content) return null;

      const isLast = idx === wakeMethods.length - 1;
      return (
        <View key={`${method?.id || type}-${idx}`}>
          {content}
          {!isLast && <View className="my-4 border-t border-borderColor" />}
        </View>
      );
    })}
  </>
);

export const WakeMethodSharePreview = ({
  alarmData,
  screenWidth,
  mediaHeight,
}: {
  alarmData: Alarm | null;
  screenWidth: number;
  mediaHeight?: number;
}) => {
  const wakeUps = Array.isArray(alarmData?.wakeMethods)
    ? (alarmData.wakeMethods as WakeMethod[])
    : [];
  const method = wakeUps.length > 0 ? wakeUps[0] : null;

  if (!method) {
    if (alarmData?.puzzleImageUrl) {
      return (
        <Image
          source={{ uri: String(alarmData.puzzleImageUrl) }}
          style={{ width: screenWidth - 32, height: 200, borderRadius: 12 }}
          resizeMode="cover"
        />
      );
    }

    return (
      <View
        style={{
          marginTop: 16,
          marginBottom: 20,
          padding: 10,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
          borderRadius: 12,
          backgroundColor: 'rgba(72,23,96,0.2)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
          {formatDateString(
            String(alarmData?.scheduledAt ?? new Date().toISOString()),
          )}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <BigClock width={24} height={24} />
          <Text style={{ color: 'white', fontSize: 28 }}>
            {formatTimeString(
              String(alarmData?.scheduledAt ?? new Date().toISOString()),
            )}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      {renderWakeMethodActivity(method, alarmData, {
        autoPlay: false,
        completed: true,
        controllable: false,
        canStop: false,
        widthSlide: screenWidth - 32,
        horizontalPadding: 0,
        mediaHeight,
      })}
    </View>
  );
};
