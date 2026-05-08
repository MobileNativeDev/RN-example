import { Alarm } from '@appTypes/types';
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '@utils/alert';
import { LinierButton } from '@components/customComponents/LinierButton';
import { PuzzleActivity } from '@components/wakeUpActivityOptions/PuzzleActivity';
import { SongActivity } from '@components/wakeUpActivityOptions/SongActivity';
import { VideoActivity } from '@components/wakeUpActivityOptions/VideoActivity';
import { VideoSharePreview } from '@components/wakeUpActivityOptions/VideoSharePreview';
import { VoiceActivity } from '@components/wakeUpActivityOptions/VoiceActivity';
import { formatDateString, formatTimeString } from '@utils/time';
import BigClock from '@assets/svg/BigClock.svg';
import UserIcon from '@assets/svg/UserIcon.svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import RNFS from 'react-native-fs';
import { BackHandler } from 'react-native';
import Immersive from 'react-native-immersive';
import SendMessageIcon from '@assets/svg/SendMessageIcon.svg';
import ShareIcon from '@assets/svg/ShareIcon.svg';
import CloseIcon from '@assets/svg/CloseIcon.svg';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import { CustomBottomModalWithGradient } from '@components/customComponents/CustomBottomModalWithGradient';
import { CustomInput } from '@components/customComponents/CustomInput';
import Share from 'react-native-share';
import { captureRef } from 'react-native-view-shot';
import { LoaderModal } from '@components/customComponents/LoaderModal';
import { markAlarmGot } from '@api/alarms';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogoSplash from '@assets/svg/LogoSplash.svg';
import LogoText from '@assets/svg/LogoText.svg';
import LinearGradient from 'react-native-linear-gradient';
import logger from '@utils/logger';
import SoundPlayer from 'react-native-sound-player';
import { stopPlayer } from '@services/ios-services/nativePlayer';
import { getSongDisplayName } from '@utils/songDisplayName';
import { getVoiceDisplayName } from '@utils/voiceDisplayName';

export const ShareAlarmScreen = () => {
  const route = useRoute();
  const queryClient = useQueryClient();
  const contentRef = useRef<any>(null);

  const navigation = useNavigation<AuthNavigationProp>();
  const { id, alarmData } = (route.params ?? {}) as {
    id: string;
    alarmData?: Alarm;
  };
  const [countdown, setCountdown] = useState<number>(15);
  const [completed] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState<'send' | 'null'>('null');
  const [closingLoader, setClosingLoader] = useState(false);
  const [sharingLoader, setSharingLoader] = useState(false);
  const isSharingRef = useRef(false);

  const stopShareMediaPlayback = useCallback(async () => {
    try {
      await stopPlayer();
    } catch {}

    try {
      await SoundPlayer.stop();
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      void stopShareMediaPlayback();

      if (Platform.OS === 'android') {
        try {
          Immersive.on();
        } catch {}
      }

      return () => {
        sub.remove();
        void stopShareMediaPlayback();

        if (Platform.OS === 'android') {
          try {
            Immersive.off();
          } catch {}
        }
      };
    }, [stopShareMediaPlayback]),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [id]);

  const scheduled = String(alarmData?.scheduledAt ?? new Date().toISOString());

  const wakeUps: any[] = Array.isArray(alarmData?.wakeMethods)
    ? (alarmData!.wakeMethods as any[])
    : ([] as any[]);

  const currentMethod: any = wakeUps[currentIndex];
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SLIDE_WIDTH = Math.round(SCREEN_WIDTH - 62);
  const HIDDEN_SHARE_MEDIA_WIDTH = SCREEN_WIDTH - 32;
  const SHARE_MEDIA_HEIGHT = 370;
  const SIDE_PADDING = (SCREEN_WIDTH - SLIDE_WIDTH) / 2;
  const SPACING = 10;
  const ITEM_FULL_WIDTH = SLIDE_WIDTH + SPACING;
  const slideItemStyle = {
    width: SLIDE_WIDTH,
    marginHorizontal: SPACING / 2,
    alignItems: 'center' as const,
  };
  const shareMediaFrameStyle = {
    width: SLIDE_WIDTH,
    height: SHARE_MEDIA_HEIGHT,
    overflow: 'hidden' as const,
    borderRadius: 12,
  };
  const hiddenShareMediaFrameStyle = {
    width: HIDDEN_SHARE_MEDIA_WIDTH,
    height: SHARE_MEDIA_HEIGHT,
    overflow: 'hidden' as const,
    borderRadius: 12,
  };
  const hiddenShareMediaStyle = {
    paddingHorizontal: 16,
    alignItems: 'center' as const,
  };

  const flatListRef = useRef<FlatList<any> | null>(null);
  const methods = wakeUps || [];

  const getVoiceTitle = useCallback(
    (item: any) =>
      getVoiceDisplayName(
        item?.localVoicePath || item?.voiceUrl || alarmData?.voiceUrl || null,
        item?.voiceName || alarmData?.voiceName || null,
      ) || 'Voice_record',
    [alarmData?.voiceName, alarmData?.voiceUrl],
  );

  const getSongTitle = useCallback(
    (item: any) =>
      getSongDisplayName(
        item?.localSongPath || item?.songUrl || alarmData?.songUrl || null,
        item?.songName || alarmData?.songName || null,
      ) || 'Song',
    [alarmData?.songName, alarmData?.songUrl],
  );

  const renderIosMediaTitle = useCallback((title: string) => {
    if (Platform.OS !== 'ios') return null;

    return (
      <LinearGradient
        colors={['rgba(1,1,1,0)', 'rgba(1,1,1,0.35)', 'rgba(1,1,1,1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 8,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
        }}
      >
        <Text className="text-white" numberOfLines={1}>
          {title}
        </Text>
      </LinearGradient>
    );
  }, []);

  const renderSlide = ({ item }: { item: any }) => {
    const type = typeof item === 'string' ? item.toUpperCase() : item.type;
    switch (type) {
      case 'PUZZLE':
        return (
          <View style={slideItemStyle}>
            <PuzzleActivity
              puzzleUri={{
                imageUri:
                  item?.localPuzzleImagePath ||
                  item?.puzzleUrl?.imageUrl ||
                  alarmData?.puzzleImageUrl ||
                  null,
                soundUri:
                  item?.localPuzzleSoundPath ||
                  item?.puzzleUrl?.soundUrl ||
                  null,
              }}
              autoPlay={false}
              completed={true}
              widthSlide={SLIDE_WIDTH}
              horizontalPadding={0}
              mediaHeight={SHARE_MEDIA_HEIGHT}
            />
          </View>
        );
      case 'VOICE':
        return (
          <View style={slideItemStyle}>
            <View style={shareMediaFrameStyle}>
              <VoiceActivity
                voiceUri={
                  item?.localVoicePath ||
                  item?.voiceUrl ||
                  alarmData?.voiceUrl ||
                  null
                }
                voiceName={item?.voiceName || alarmData?.voiceName || null}
                autoPlay={false}
                controllable={Platform.OS === 'android'}
              />
              {renderIosMediaTitle(getVoiceTitle(item))}
            </View>
          </View>
        );
      case 'VIDEO':
        return (
          <View style={slideItemStyle}>
            <VideoActivity
              videoUri={
                item?.localVideoPath ||
                item?.videoUrl ||
                alarmData?.videoUrl ||
                null
              }
              canStop={true}
              autoPlay={false}
            />
          </View>
        );
      case 'SONG':
        return (
          <View style={slideItemStyle}>
            <View style={shareMediaFrameStyle}>
              <SongActivity
                songUri={
                  item?.localSongPath ||
                  item?.songUrl ||
                  alarmData?.songUrl ||
                  null
                }
                songName={item?.songName || alarmData?.songName || null}
                autoPlay={false}
                controllable={Platform.OS === 'android'}
              />
              {renderIosMediaTitle(getSongTitle(item))}
            </View>
          </View>
        );
      default:
        return <View style={{ width: SLIDE_WIDTH }} />;
    }
  };

  const handleMomentum = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x || 0;
    const idx = Math.round(offsetX / ITEM_FULL_WIDTH);
    setCurrentIndex(idx);
  };

  const centerInitial = () => {
    if (!flatListRef.current || methods.length === 0) return;
    const targetId = currentMethod?.id;
    let idx = 0;
    if (targetId != null) {
      const found = methods.findIndex(m => m?.id === targetId);
      idx = found >= 0 ? found : 0;
    }
    try {
      flatListRef.current?.scrollToIndex({ index: idx, animated: false });
    } catch (err) {}
    setCurrentIndex(idx);
  };

  useEffect(() => {
    centerInitial();
  }, [methods.length]);

  const handleModal = () => {
    setIsMessageModalVisible(!isMessageModalVisible);
  };

  const handleShare = async () => {
    if (isSharingRef.current) return;
    isSharingRef.current = true;
    setSharingLoader(true);

    try {
      if (!contentRef.current) {
        await Share.open({ message: 'Join to me', failOnCancel: false });
        return;
      }

      const uri = await captureRef(contentRef.current, {
        format: 'png',
        quality: 0.8,
      });

      const shareUri =
        typeof uri === 'string' && uri.startsWith('file://')
          ? uri
          : `file://${uri}`;

      await Share.open({
        url: shareUri,
        message: 'Show the world how you start the morning with Example',
        title: 'Example Alarm',
        failOnCancel: false,
      });
    } catch (error) {
      logger.warn('[ShareAlarmScreen] share failed', error);
    } finally {
      isSharingRef.current = false;
      setSharingLoader(false);
    }
  };

  const submitAlarmGot = async (payload: { message?: string } = {}) => {
    const alarmId = alarmData?.alarmId ?? id;

    if (!alarmId) {
      logger.warn('[ShareAlarmScreen] Missing alarm id for markAlarmGot');
      return null;
    }

    return markAlarmGot(alarmId, payload);
  };

  const handleClose = async () => {
    if (messageStatus === 'null') {
      try {
        const resp = await submitAlarmGot();
        logger.debug('marked got on close:', resp);
      } catch (e) {
        logger.warn('[ShareAlarmScreen] markAlarmGot on close failed', e);
      }
    }

    if (!alarmData?.recurring) {
      try {
        setClosingLoader(true);
        const cacheKey = `alarm_cache_${id}`;

        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const alarm = JSON.parse(cached);
            const filesToDelete: string[] = [];

            if (alarm.localNotificationSound) {
              filesToDelete.push(
                alarm.localNotificationSound.replace('file://', ''),
              );
              if (Array.isArray(alarm.wakeMethods)) {
                alarm.wakeMethods.forEach((method: any) => {
                  if (method.localVideoPath) {
                    filesToDelete.push(
                      method.localVideoPath.replace('file://', ''),
                    );
                  }
                  if (method.localVoicePath) {
                    filesToDelete.push(
                      method.localVoicePath.replace('file://', ''),
                    );
                  }
                  if (method.localSongPath) {
                    filesToDelete.push(
                      method.localSongPath.replace('file://', ''),
                    );
                  }
                  if (method.localPuzzleImagePath) {
                    filesToDelete.push(
                      method.localPuzzleImagePath.replace('file://', ''),
                    );
                  }
                  if (method.localPuzzleSoundPath) {
                    filesToDelete.push(
                      method.localPuzzleSoundPath.replace('file://', ''),
                    );
                  }
                  if (method.localSongPath) {
                    filesToDelete.push(
                      method.localSongPath.replace('file://', ''),
                    );
                  }
                });
              }
            }

            await Promise.all(
              filesToDelete.map(async path => {
                try {
                  const exists = await RNFS.exists(path);
                  if (exists) {
                    await RNFS.unlink(path);
                    logger.debug(
                      '[AlarmActivityScreen] Deleted media file:',
                      path,
                    );
                  }
                } catch (err) {
                  logger.warn(
                    '[AlarmActivityScreen] Failed to delete file:',
                    path,
                    err,
                  );
                }
              }),
            );
          }
        } catch (err) {
          logger.warn(
            '[AlarmActivityScreen] Failed to delete media files',
            err,
          );
        }

        await AsyncStorage.removeItem(cacheKey);
        logger.debug('[AlarmActivityScreen] Deleted alarm cache:', cacheKey);
      } catch (e) {
        logger.warn('[AlarmActivityScreen] Failed to delete alarm cache', e);
      } finally {
        setClosingLoader(false);
      }
    }
    queryClient.invalidateQueries({
      queryKey: ['alarms', 'upcoming'],
    });
    queryClient.invalidateQueries({ queryKey: ['alarms', 'next'] });
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MyTabs',
            params: {
              screen: 'My Alarms',
              params: {
                screen: 'MyAlarmsMain',
              },
            },
          },
        ],
      }),
    );
  };

  const handleSendMessage = async () => {
    if (!message || message.trim().length === 0) {
      Alert.alert('Error', 'Message cannot be empty');
      return;
    }

    try {
      const resp = await submitAlarmGot({
        message: message,
      });
      logger.debug('marked got:', resp);
    } catch (e) {
      Alert.alert('Error', 'Failed to send message!');
      logger.error('markAlarmGot failed', e);
      return;
    }
    setMessage('');
    setMessageStatus('send');
    handleModal();
  };
  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <View className="flex-1 w-full pb-9">
        <LinearGradient
          colors={['#3C1053', '#550844']}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <LoaderModal
          isVisible={closingLoader || sharingLoader}
          text={sharingLoader ? 'Preparing share...' : undefined}
        />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View className="items-center relative">
            <View className="items-center mb-[10px]">
              <LogoSplash style={{ position: 'absolute' }} />
              <LogoText />
            </View>
            {/* <Image source={require('@assets/img/LogoShareIcon.png')} /> */}
            <TouchableOpacity
              className="absolute right-4 top-3"
              onPress={() => {
                handleClose();
              }}
            >
              <CloseIcon />
            </TouchableOpacity>
          </View>
          {!alarmData ? (
            <View
              className={`mb-4 m-4 p-[10px] h-[370px] border border-border2Color rounded-xl flex-row ${'justify-center'}`}
              style={{ backgroundColor: 'rgba(72, 23, 96, 0.2)' }}
            >
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <View className="">
              <FlatList
                ref={r => {
                  flatListRef.current = r;
                }}
                data={methods}
                horizontal
                renderItem={renderSlide}
                keyExtractor={(item, index) =>
                  item?.id ? String(item.id) : String(index)
                }
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_FULL_WIDTH}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentum}
                contentContainerStyle={{
                  paddingHorizontal: Math.max(0, SIDE_PADDING - SPACING / 2),
                }}
                getItemLayout={(_, index) => ({
                  length: ITEM_FULL_WIDTH,
                  offset: ITEM_FULL_WIDTH * index,
                  index,
                })}
              />
            </View>
          )}

          {Array.isArray(alarmData?.wakeMethods) &&
            alarmData?.wakeMethods.length > 1 && (
              <View className="flex-row justify-center items-center gap-5 mt-auto mb-auto">
                {(Array.isArray(alarmData?.wakeMethods)
                  ? alarmData?.wakeMethods
                  : []
                ).map((_, index) => {
                  const active = index === currentIndex;
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        try {
                          flatListRef.current?.scrollToIndex({
                            index,
                            animated: true,
                          });
                        } catch (err) {
                          // ignore
                        }
                        setCurrentIndex(index);
                      }}
                      activeOpacity={0.8}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        borderWidth: active ? 1 : 0,
                        borderColor: active ? '#ffffff' : 'transparent',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: active
                            ? '#ffffff'
                            : 'rgba(255,255,255,0.3)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          className="font-semibold text-[17px]"
                          style={{
                            color: active
                              ? '#A21885'
                              : 'rgba(162, 24, 133,0.5)',
                          }}
                        >
                          {index + 1}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

          {!alarmData ? (
            <View
              className={`m-4 p-[10px] h-[73px] border border-border2Color rounded-xl flex-row ${'justify-center'}`}
              style={{ backgroundColor: 'rgba(72, 23, 96, 0.2)' }}
            >
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <View
              className={`m-4 mt-6 p-[10px] border border-border2Color rounded-xl flex-row ${
                alarmData?.friendUserId ? '' : 'justify-center'
              }`}
              style={{ backgroundColor: 'rgba(72, 23, 96, 0.2)' }}
            >
              {alarmData?.friendUserId && (
                <View className="w-[54px] h-[54px] mr-[10px] rounded-full bg-white/10 items-center justify-center">
                  <UserIcon />
                </View>
              )}
              <View
                className={`${alarmData?.friendUserId ? '' : 'items-center'}`}
              >
                <Text className="text-white6Color font-regular text-xs">
                  {formatDateString(scheduled)}
                </Text>
                <View className="flex-row items-center justify-center gap-1">
                  <BigClock width={24} height={24} />

                  <Text className="text-white text-3xl mt-1 font-regular">
                    {formatTimeString(scheduled)}
                  </Text>
                </View>
              </View>
            </View>
          )}
          <View className="flex-1 justify-end px-4">
            <>
              <LinierButton
                title={
                  <View className="flex-row items-center">
                    <SendMessageIcon />
                    <Text className="text-white font-semibold text-[17px] ml-[10px]">
                      {messageStatus === 'null' ? 'Send Message' : 'Sended'}
                    </Text>
                  </View>
                }
                onPress={() => {
                  if (messageStatus === 'null') {
                    handleModal();
                  }
                }}
                borderColor
                buttonStyles="flex-1 w-full min-h-10"
                disabled={countdown > 0 && !completed}
              />
              <View className="flex-row items-center justify-center my-4">
                <View className="border-t border-border2Color flex-1" />
              </View>
            </>

            <LinierButton
              title={
                <View className="flex-row items-center">
                  <ShareIcon />
                  <Text className="text-white font-semibold text-[17px] ml-[10px]">
                    Share with your friends
                  </Text>
                </View>
              }
              onPress={() => {
                handleShare();
              }}
              borderColor
              buttonStyles="w-full min-h-10"
              disabled={sharingLoader || (countdown > 0 && !completed)}
            />
          </View>
        </ScrollView>
        <CustomBottomModalWithGradient
          isVisible={isMessageModalVisible}
          onClose={() => {
            handleModal();
          }}
          height={70}
        >
          <View className="flex-1 w-full px-4 pt-4">
            <View className="items-center mb-5">
              <View className="items-center mb-[10px]">
                <LogoSplash style={{ position: 'absolute' }} />
                <LogoText />
              </View>
              <Text className="text-white font-regular text-lg text-center">
                Tell your friend you got their {'\n'} alarm!
              </Text>
            </View>
            <CustomInput
              styles="mb-4"
              textPlaceholder="Message"
              placeholder=""
              autoCapitalize="none"
              value={message}
              onChangeText={setMessage}
            />
            <LinierButton
              title={'Send'}
              onPress={handleSendMessage}
              borderColor
              buttonStyles="w-full"
              disabled={countdown > 0 && !completed}
            />
          </View>
        </CustomBottomModalWithGradient>

        {/* ── Hidden share card ── captured by captureRef in handleShare ── */}
        <View
          ref={contentRef}
          collapsable={false}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -10000,
            left: 0,
            width: SCREEN_WIDTH,
            backgroundColor: '#4D0B49',
          }}
        >
          <View
            style={{ alignItems: 'center', paddingTop: 42, marginBottom: 8 }}
          >
            <LogoSplash style={{ position: 'absolute', top: 42 }} />
            <LogoText />
          </View>

          {alarmData &&
            currentMethod &&
            (() => {
              const item = currentMethod;
              const type =
                typeof item === 'string' ? item.toUpperCase() : item.type;
              switch (type) {
                case 'PUZZLE':
                  return (
                    <View style={hiddenShareMediaStyle}>
                      <PuzzleActivity
                        puzzleUri={{
                          imageUri:
                            item?.localPuzzleImagePath ||
                            item?.puzzleUrl?.imageUrl ||
                            (alarmData as any)?.puzzleImageUrl ||
                            null,
                          soundUri:
                            item?.localPuzzleSoundPath ||
                            item?.puzzleUrl?.soundUrl ||
                            null,
                        }}
                        autoPlay={false}
                        completed={true}
                        widthSlide={HIDDEN_SHARE_MEDIA_WIDTH}
                        horizontalPadding={0}
                        mediaHeight={SHARE_MEDIA_HEIGHT}
                      />
                    </View>
                  );
                case 'VOICE':
                  return (
                    <View style={hiddenShareMediaStyle}>
                      <View style={hiddenShareMediaFrameStyle}>
                        <VoiceActivity
                          voiceUri={
                            item?.localVoicePath ||
                            item?.voiceUrl ||
                            (alarmData as any)?.voiceUrl ||
                            null
                          }
                          voiceName={
                            item?.voiceName ||
                            (alarmData as any)?.voiceName ||
                            null
                          }
                          autoPlay={false}
                          controllable={Platform.OS === 'android'}
                        />
                        {renderIosMediaTitle(getVoiceTitle(item))}
                      </View>
                    </View>
                  );
                case 'VIDEO':
                  return (
                    <View style={hiddenShareMediaStyle}>
                      {Platform.OS === 'android' ? (
                        <VideoSharePreview
                          videoUri={
                            item?.localVideoPath ||
                            item?.videoUrl ||
                            (alarmData as any)?.videoUrl ||
                            null
                          }
                          width={HIDDEN_SHARE_MEDIA_WIDTH}
                          height={SHARE_MEDIA_HEIGHT}
                        />
                      ) : (
                        <VideoActivity
                          videoUri={
                            item?.localVideoPath ||
                            item?.videoUrl ||
                            (alarmData as any)?.videoUrl ||
                            null
                          }
                          canStop={false}
                          autoPlay={false}
                        />
                      )}
                    </View>
                  );
                case 'SONG':
                  return (
                    <View style={hiddenShareMediaStyle}>
                      <View style={hiddenShareMediaFrameStyle}>
                        <SongActivity
                          songUri={
                            item?.localSongPath ||
                            item?.songUrl ||
                            (alarmData as any)?.songUrl ||
                            null
                          }
                          songName={
                            item?.songName ||
                            (alarmData as any)?.songName ||
                            null
                          }
                          autoPlay={false}
                          controllable={Platform.OS === 'android'}
                        />
                        {renderIosMediaTitle(getSongTitle(item))}
                      </View>
                    </View>
                  );
                default:
                  return null;
              }
            })()}

          {methods.length > 1 && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 10,
                marginTop: 12,
              }}
            >
              {methods.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    borderWidth: index === currentIndex ? 1 : 0,
                    borderColor:
                      index === currentIndex ? '#ffffff' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor:
                        index === currentIndex
                          ? '#ffffff'
                          : 'rgba(255,255,255,0.3)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color:
                          index === currentIndex
                            ? '#A21885'
                            : 'rgba(162,24,133,0.5)',
                        fontWeight: '600',
                        fontSize: 17,
                      }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {alarmData && (
            <View
              style={{
                margin: 16,
                marginTop: 18,
                marginBottom: 62,
                padding: 10,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: 12,
                flexDirection: 'row',
                backgroundColor: 'rgba(72,23,96,0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  {formatDateString(scheduled)}
                </Text>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <BigClock width={24} height={24} />
                  <Text style={{ color: 'white', fontSize: 28 }}>
                    {formatTimeString(scheduled)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};
