import { useEffect, useState } from 'react';
import { Alarm } from '@appTypes/types';
import { getAlarm } from '@api/alarms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTime } from 'luxon';

export const useAlarmData = (
  chosenAlarm: Alarm | null,
  setChosenDate: (date: string) => void,
  setRecurring: (recurring: boolean) => void,
  setImageUri: (uri: string | null) => void,
  setPuzzleSoundUri: (uri: string | number | null) => void,
  setPuzzleSongName: (name: string | null) => void,
  setVideoUri: (uri: string | null) => void,
  setVideoLink: (link: string | null) => void,
  setVoiceUri: (uri: string | number | null) => void,
  setVoiceName: (name: string | null) => void,
  setSongUri: (uri: string | number | null) => void,
  setSongName: (name: string | null) => void,
  setRecurringDays: (days: string[]) => void,
) => {
  const [alarmData, setAlarmData] = useState<Alarm | null>(null);

  useEffect(() => {
    if (!chosenAlarm) return;

    const load = async () => {
      let dto: Alarm | null = null;
      try {
        try {
          const cacheKey = `alarm_cache_${chosenAlarm.id}`;
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            console.log('parsed', parsed);

            dto = parsed;
            setAlarmData(parsed as Alarm);
          } else {
            dto = await getAlarm(chosenAlarm.id);
            setAlarmData(dto);
          }
        } catch (cacheErr) {
          console.warn(
            '[AlarmActivityScreen] Cache read failed, falling back to backend',
            cacheErr,
          );
        }

        if (dto) {
          const detailedWakeMethods = Array.isArray(dto.wakeMethods)
            ? dto.wakeMethods
            : [];
          const voiceMethods = detailedWakeMethods.filter(
            (method: any) => method?.type === 'VOICE',
          );
          const songMethods = detailedWakeMethods.filter(
            (method: any) => method?.type === 'SONG',
          );
          const hasSingleVoiceMethod = voiceMethods.length === 1;
          const canUseTopLevelVoiceFallback =
            hasSingleVoiceMethod || voiceMethods.length === 0;
          const hasSingleSongMethod = songMethods.length === 1;
          const canUseTopLevelSongFallback =
            hasSingleSongMethod || songMethods.length === 0;

          if ((dto as any)?.type === 'FRIEND') {
            const tz = DateTime.local().zoneName;
            const dt = DateTime.fromISO(String(dto.scheduledAt)).setZone(tz);
            setChosenDate(dt.toISODate());
          } else {
            setChosenDate(
              dto.scheduledAt
                ? new Date(dto.scheduledAt).toISOString().slice(0, 10)
                : chosenAlarm.date || '',
            );
          }

          setRecurring(dto.recurring || chosenAlarm.recurring || false);
          setPuzzleSongName(null);
          if ((dto as any).puzzleImageUrl?.imageUrl)
            setImageUri((dto as any).puzzleImageUrl.imageUrl);
          if ((dto as any).puzzleImageUrl?.soundUrl)
            setPuzzleSoundUri((dto as any).puzzleImageUrl.soundUrl);
          if (dto.videoUrl) setVideoUri(dto.videoUrl);
          if ((dto as any).videoLink) setVideoLink((dto as any).videoLink);
          if (canUseTopLevelVoiceFallback && (dto as any).voiceUrl) {
            setVoiceUri((dto as any).voiceUrl);
          } else {
            setVoiceUri(null);
          }
          if (canUseTopLevelVoiceFallback && (dto as any).voiceName) {
            setVoiceName((dto as any).voiceName);
          } else {
            setVoiceName(null);
          }
          if (canUseTopLevelSongFallback && (dto as any).songUrl) {
            setSongUri((dto as any).songUrl);
          } else {
            setSongUri(null);
          }
          if (canUseTopLevelSongFallback && (dto as any).songName) {
            setSongName((dto as any).songName);
          } else {
            setSongName(null);
          }

          if (detailedWakeMethods.length > 0) {
            detailedWakeMethods.forEach((method: any) => {
              if (method.type === 'PUZZLE') {
                setImageUri(
                  method.localPuzzleImagePath ||
                    method.puzzleUrl?.imageUrl ||
                    null,
                );
                setPuzzleSoundUri(
                  method.localPuzzleSoundPath ||
                    method.puzzleUrl?.soundUrl ||
                    null,
                );
                setPuzzleSongName(method.songName || null);
              } else if (method.type === 'VIDEO') {
                setVideoUri(method.localVideoPath || method.videoUrl || null);
              } else if (method.type === 'VOICE') {
                if (hasSingleVoiceMethod) {
                  setVoiceUri(
                    method.localVoicePath ||
                      method.voiceUrl ||
                      (dto as any).voiceUrl ||
                      null,
                  );
                  setVoiceName(
                    method.voiceName || (dto as any).voiceName || null,
                  );
                }
              } else if (method.type === 'SONG') {
                if (hasSingleSongMethod) {
                  setSongUri(
                    method.localSongPath ||
                      method.songUrl ||
                      (dto as any).songUrl ||
                      null,
                  );
                  setSongName(method.songName || (dto as any).songName || null);
                }
              }
            });
          }

          try {
            const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

            if (
              Array.isArray((dto as any).recurringDays) &&
              (dto as any).recurringDays.length > 0
            ) {
              const daysArr = (dto as any).recurringDays.map((d: any) =>
                String(d).toUpperCase(),
              );
              setRecurringDays(daysArr as any);
            } else if (
              Array.isArray((dto as any).days) &&
              (dto as any).days.length > 0
            ) {
              const daysArr = (dto as any).days.map((d: any) =>
                typeof d === 'number'
                  ? DAY_NAMES[d] ?? String(d)
                  : String(d).toUpperCase(),
              );
              setRecurringDays(daysArr as any);
            } else if ((dto as any).days) {
              setRecurringDays([String((dto as any).days).toUpperCase()]);
            }
          } catch {}
        } else {
          setChosenDate(chosenAlarm.date || '');
          setRecurring(chosenAlarm.recurring || false);
        }
      } catch (err) {
        console.warn('Failed to load alarm details', err);
        setChosenDate(chosenAlarm.date || '');
        setRecurring(chosenAlarm.recurring || false);
      }
    };

    load();
  }, [chosenAlarm]);

  return alarmData;
};
