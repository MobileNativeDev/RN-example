import { parseYouTubeVideoId } from '@utils/additionFunctions';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Text, View, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import VideoPlayer from 'react-native-video';
import YoutubePlayer from 'react-native-youtube-iframe';
import { formatTime } from '@utils/time';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

export const VideoActivity = ({
  videoUri,
  canStop = false,
  autoPlay = true,
}: {
  videoUri: string | null;
  canStop?: boolean;
  autoPlay?: boolean;
}) => {
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  // Shared value for progress — updates on UI thread, no JS bridge overhead
  const progress = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  console.log(videoUri);

  useEffect(() => {
    const id = parseYouTubeVideoId(videoUri || '');
    if (id) {
      setYoutubeId(id);
      console.log(youtubeId);
    } else {
      setYoutubeId(null);
    }
    setIsPlaying(true);
  }, [videoUri]);

  useFocusEffect(
    useCallback(() => {
      setIsPlaying(!!autoPlay);
      return () => setIsPlaying(false);
    }, [videoUri, autoPlay]),
  );

  return (
    <View className="w-full h-auto max-h-[370px]">
      {!youtubeId ? (
        <View
          style={{
            width: '100%',
            height: '100%',
            borderWidth: 0,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <VideoPlayer
            source={{ uri: videoUri || '' }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            paused={!isPlaying}
            repeat={true}
            onLoad={data => {
              setDuration(data.duration ?? 0);
            }}
            onProgress={data => {
              const cur = data.currentTime ?? 0;
              setCurrentTime(cur);
              if (data.seekableDuration > 0) {
                progress.value = cur / data.seekableDuration;
              }
            }}
            ignoreSilentSwitch="ignore"
          />
          <Pressable
            onPress={() => canStop && setIsPlaying(prev => !prev)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View className="w-full flex-1 justify-end">
              <LinearGradient
                colors={['rgba(1,1,1,0)', 'rgba(1,1,1,0.35)', 'rgba(1,1,1,1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ width: '100%' }}
                className="rounded-b-lg"
              >
                <View className="px-4 pb-2">
                  <Text className="text-white">Video Wake Up!!!</Text>
                  <View className="w-full mt-2">
                    <View className="h-[3px] bg-white rounded-full justify-center">
                      <Animated.View
                        className="h-[7px] rounded-full"
                        style={[{ backgroundColor: '#CB30E0' }, progressStyle]}
                      />
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-white mt-2">
                        {formatTime(currentTime)}
                      </Text>
                      <Text className="text-white mt-2">
                        -{formatTime(duration)}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Pressable>
        </View>
      ) : (
        <YoutubePlayer
          height={'100%'}
          videoId={youtubeId}
          play={isPlaying}
          initialPlayerParams={{ autoplay: true }}
          webViewProps={{ allowsInlineMediaPlayback: true }}
        />
      )}
    </View>
  );
};
