import { getAlarm } from '@api/alarms';
import { Alarm } from '@appTypes/types';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState, useRef } from 'react';
import ShareIcon from '@assets/svg/ShareIcon.svg';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import SoundPlayer from 'react-native-sound-player';
import { renderWakeMethodActivity } from './components/WakeMethodActivityContent';
import { HiddenShareCard } from './components/HiddenShareCard';
import {
  formatDateString,
  formatTimeString,
  formatTo12Hour,
} from '@utils/time';
import BigClock from '@assets/svg/BigClock.svg';
import { LinierButton } from '@components/customComponents/LinierButton';
import { LoaderModal } from '@components/customComponents/LoaderModal';
import { stopPlayer } from '@services/ios-services/nativePlayer';
import { scheduledAtToLocal } from '@utils/notificationFunctions';

export const AlarmScreen = () => {
  const route = useRoute();
  const { id } = (route.params ?? {}) as { id: string };
  const [alarmData, setAlarmData] = useState<Alarm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreparingShareImage, setIsPreparingShareImage] = useState(false);
  const [shareCardVisible, setShareCardVisible] = useState(false);
  const contentRef = useRef<any>(null);
  const shareRef = useRef<any>(null);
  const flatListRef = useRef<FlatList<any> | null>(null);
  const isSharingRef = useRef(false);
  const shareCardReadyResolverRef = useRef<(() => void) | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const CAROUSEL_VIEWPORT_WIDTH = SCREEN_WIDTH - 32;
  const SLIDE_WIDTH = Math.round(CAROUSEL_VIEWPORT_WIDTH - 30);
  const HIDDEN_SHARE_MEDIA_WIDTH = SCREEN_WIDTH - 32;
  const SHARE_MEDIA_HEIGHT = 370;
  const SPACING = 10;
  const SIDE_PADDING = (CAROUSEL_VIEWPORT_WIDTH - SLIDE_WIDTH) / 2;
  const ITEM_FULL_WIDTH = SLIDE_WIDTH + SPACING;
  const wakeMethods = Array.isArray(alarmData?.wakeMethods)
    ? (alarmData.wakeMethods as any[])
    : [];
  const currentMethod = wakeMethods[currentIndex];
  const currentMethodType =
    typeof currentMethod === 'string'
      ? currentMethod.toUpperCase()
      : String(currentMethod?.type || '').toUpperCase();
  const slideItemStyle = {
    width: SLIDE_WIDTH,
    marginHorizontal: SPACING / 2,
    alignItems: 'center' as const,
  };

  useEffect(() => {
    const loadAlarm = async () => {
      try {
        setLoading(true);
        const dto = await getAlarm(id);
        setAlarmData(dto);
      } catch (error) {
        console.log('Error loading alarm', error);
      } finally {
        setLoading(false);
      }
    };

    loadAlarm();
  }, [id]);

  const stopAlarmMediaPlayback = useCallback(async () => {
    try {
      await stopPlayer();
    } catch {}

    try {
      await SoundPlayer.stop();
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void stopAlarmMediaPlayback();
      };
    }, [stopAlarmMediaPlayback]),
  );

  useEffect(() => {
    if (!flatListRef.current || wakeMethods.length === 0) {
      setCurrentIndex(0);
      return;
    }

    try {
      flatListRef.current.scrollToIndex({ index: 0, animated: false });
    } catch {}

    setCurrentIndex(0);
  }, [wakeMethods.length]);

  const waitForShareCardReady = useCallback(
    () =>
      new Promise<void>(resolve => {
        shareCardReadyResolverRef.current = resolve;
      }),
    [],
  );

  const waitForNextPaint = useCallback(
    () =>
      new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
    [],
  );

  const handleShareCardReady = useCallback(() => {
    shareCardReadyResolverRef.current?.();
    shareCardReadyResolverRef.current = null;
  }, []);

  const renderSlide = useCallback(
    ({ item }: { item: any }) => {
      const content = renderWakeMethodActivity(item, alarmData, {
        autoPlay: false,
        completed: true,
        controllable: true,
        canStop: true,
        widthSlide: SLIDE_WIDTH,
        horizontalPadding: 0,
        mediaHeight: SHARE_MEDIA_HEIGHT,
      });

      return (
        <View style={slideItemStyle}>
          {content ?? <View style={{ width: SLIDE_WIDTH }} />}
        </View>
      );
    },
    [alarmData, SLIDE_WIDTH, slideItemStyle],
  );

  const handleMomentum = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x || 0;
    const nextIndex = Math.round(offsetX / ITEM_FULL_WIDTH);
    setCurrentIndex(nextIndex);
  };

  const handleShare = async () => {
    if (isSharingRef.current) return;
    isSharingRef.current = true;
    setIsPreparingShareImage(true);

    try {
      await waitForNextPaint();
      setShareCardVisible(true);
      await waitForShareCardReady();
      const targetRef = shareRef.current ?? contentRef.current;
      if (!targetRef) {
        setIsPreparingShareImage(false);
        await Share.open({ message: 'Join to me', failOnCancel: false });
        return;
      }

      const uri = await captureRef(targetRef, {
        format: 'png',
        quality: 0.8,
      });

      const shareUri =
        typeof uri === 'string' && uri.startsWith('file://')
          ? uri
          : `file://${uri}`;

      setIsPreparingShareImage(false);
      await Share.open({
        url: shareUri,
        message: 'Show the world how you start the morning with Example',
        title: 'Example Alarm',
        failOnCancel: false,
      });
    } catch (error) {
      console.log('Error sharing', error);
    } finally {
      isSharingRef.current = false;
      shareCardReadyResolverRef.current = null;
      setShareCardVisible(false);
      setIsPreparingShareImage(false);
    }
  };
  const scheduled = String(alarmData?.scheduledAt ?? new Date().toISOString());
  const scheduledMatch = scheduled.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
  );
  const scheduledLocal =
    alarmData?.scheduledAt && alarmData?.type === 'FRIEND'
      ? scheduledAtToLocal({
          scheduledAt: String(alarmData.scheduledAt),
          timezone: alarmData?.timezone || null,
        })
      : null;
  const scheduledDateLabel =
    alarmData?.type !== 'FRIEND' && scheduledMatch
      ? `${Number(scheduledMatch[3])} ${new Date(
          Date.UTC(
            Number(scheduledMatch[1]),
            Number(scheduledMatch[2]) - 1,
            Number(scheduledMatch[3]),
          ),
        ).toLocaleString('en', {
          month: 'short',
          timeZone: 'UTC',
        })}, ${scheduledMatch[1]}`
      : scheduledLocal?.localIso
      ? formatDateString(scheduledLocal.localIso)
      : formatDateString(scheduled);
  const scheduledTimeLabel =
    alarmData?.type !== 'FRIEND' && scheduledMatch
      ? formatTo12Hour(`${scheduledMatch[4]}:${scheduledMatch[5]}`)
      : scheduledLocal?.time
      ? formatTo12Hour(scheduledLocal.time)
      : formatTimeString(scheduled);

  return (
    <View className="flex-1 w-full px-4 pb-9">
      <LoaderModal
        isVisible={isPreparingShareImage}
        text="Preparing image..."
      />
      <ScrollView
        collapsable={false}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View
          ref={contentRef}
          collapsable={false}
          className="mt-4"
          style={{
            backgroundColor: 'rgba(72, 23, 96, 0.2)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          {loading ? (
            <View
              style={{
                minHeight: SHARE_MEDIA_HEIGHT,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <FlatList
              ref={r => {
                flatListRef.current = r;
              }}
              data={wakeMethods}
              horizontal
              renderItem={renderSlide}
              keyExtractor={(item, index) =>
                item?.id ? String(item.id) : String(index)
              }
              showsHorizontalScrollIndicator={false}
              snapToInterval={ITEM_FULL_WIDTH}
              decelerationRate="fast"
              onMomentumScrollEnd={handleMomentum}
              snapToAlignment="start"
              contentContainerStyle={{
                flexGrow: wakeMethods.length === 1 ? 1 : 0,
                justifyContent:
                  wakeMethods.length === 1 ? 'center' : 'flex-start',
                paddingHorizontal: Math.max(0, SIDE_PADDING - SPACING / 2),
              }}
              getItemLayout={(_, index) => ({
                length: ITEM_FULL_WIDTH,
                offset: ITEM_FULL_WIDTH * index,
                index,
              })}
              initialNumToRender={1}
              maxToRenderPerBatch={1}
              windowSize={3}
              removeClippedSubviews={Platform.OS === 'android'}
            />
          )}
        </View>
        {wakeMethods.length > 1 && (
          <View className="flex-row justify-center items-center gap-5 mt-4">
            {wakeMethods.map((_, index) => {
              const active = index === currentIndex;
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => {
                    try {
                      flatListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                      });
                    } catch {}
                    setCurrentIndex(index);
                  }}
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
                        color: active ? '#A21885' : 'rgba(162, 24, 133,0.5)',
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
        {alarmData && (
          <View
            className={`m-4 mt-6 p-[10px] border border-border2Color rounded-xl flex-row ${'justify-center'}`}
            style={{ backgroundColor: 'rgba(72, 23, 96, 0.2)' }}
          >
            <View className={'items-center'}>
              <Text className="text-white6Color font-regular text-xs">
                {scheduledDateLabel}
              </Text>
              <View className="flex-row items-center justify-center gap-1">
                <BigClock width={24} height={24} />

                <Text className="text-white text-3xl mt-1 font-regular">
                  {scheduledTimeLabel}
                </Text>
              </View>
            </View>
          </View>
        )}
        <View className="flex-1 justify-end">
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
            disabled={isPreparingShareImage}
          />
        </View>
      </ScrollView>

      {shareCardVisible && (
        <HiddenShareCard
          ref={shareRef}
          alarmData={alarmData}
          currentMethod={currentMethod}
          currentMethodType={currentMethodType}
          currentIndex={currentIndex}
          wakeMethods={wakeMethods}
          screenWidth={SCREEN_WIDTH}
          shareMediaWidth={HIDDEN_SHARE_MEDIA_WIDTH}
          shareMediaHeight={SHARE_MEDIA_HEIGHT}
          scheduledDateLabel={scheduledDateLabel}
          scheduledTimeLabel={scheduledTimeLabel}
          onReady={handleShareCardReady}
        />
      )}
    </View>
  );
};
