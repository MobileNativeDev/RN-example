import { forwardRef, useEffect } from 'react';
import { Text, View, Platform } from 'react-native';
import LogoSplash from '@assets/svg/LogoSplash.svg';
import LogoText from '@assets/svg/LogoText.svg';
import BigClock from '@assets/svg/BigClock.svg';
import { Alarm } from '@appTypes/types';
import { VideoSharePreview } from '@components/wakeUpActivityOptions/VideoSharePreview';
import { renderWakeMethodActivity } from './WakeMethodActivityContent';

type HiddenShareCardProps = {
  alarmData: Alarm | null;
  currentMethod: any;
  currentMethodType: string;
  currentIndex: number;
  wakeMethods: any[];
  screenWidth: number;
  shareMediaWidth: number;
  shareMediaHeight: number;
  scheduledDateLabel: string;
  scheduledTimeLabel: string;
  onReady?: () => void;
};

export const HiddenShareCard = forwardRef<View, HiddenShareCardProps>(
  (
    {
      alarmData,
      currentMethod,
      currentMethodType,
      currentIndex,
      wakeMethods,
      screenWidth,
      shareMediaWidth,
      shareMediaHeight,
      scheduledDateLabel,
      scheduledTimeLabel,
      onReady,
    },
    ref,
  ) => {
    useEffect(() => {
      let firstFrame = 0;
      let secondFrame = 0;

      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          onReady?.();
        });
      });

      return () => {
        if (firstFrame) {
          cancelAnimationFrame(firstFrame);
        }
        if (secondFrame) {
          cancelAnimationFrame(secondFrame);
        }
      };
    }, [onReady]);

    return (
      <View
        ref={ref}
        collapsable={false}
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -1000,
          left: 0,
          width: screenWidth,
          backgroundColor: '#4D0B49',
          paddingBottom: 40,
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: 42, marginBottom: 8 }}>
          <LogoSplash style={{ position: 'absolute', top: 42 }} />
          <LogoText />
        </View>

        {alarmData && currentMethod ? (
          <View style={{ paddingHorizontal: 16, alignItems: 'center' }}>
            {Platform.OS === 'android' && currentMethodType === 'VIDEO' ? (
              <VideoSharePreview
                videoUri={
                  currentMethod?.localVideoPath ||
                  currentMethod?.videoUrl ||
                  (alarmData as any)?.videoUrl ||
                  null
                }
                width={shareMediaWidth}
                height={shareMediaHeight}
              />
            ) : (
              renderWakeMethodActivity(currentMethod, alarmData, {
                autoPlay: false,
                completed: true,
                controllable: false,
                canStop: false,
                widthSlide: shareMediaWidth,
                horizontalPadding: 0,
                mediaHeight: shareMediaHeight,
              })
            )}
          </View>
        ) : null}

        {wakeMethods.length > 1 && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
              marginTop: 12,
            }}
          >
            {wakeMethods.map((_, index) => (
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
                          : 'rgba(162, 24, 133,0.5)',
                      fontSize: 17,
                      fontWeight: '600',
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
                {scheduledDateLabel}
              </Text>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <BigClock width={24} height={24} />
                <Text style={{ color: 'white', fontSize: 28 }}>
                  {scheduledTimeLabel}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  },
);

HiddenShareCard.displayName = 'HiddenShareCard';
