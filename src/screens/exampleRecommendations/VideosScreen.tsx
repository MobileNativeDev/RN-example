import { LinierButton } from '@components/customComponents/LinierButton';
import {
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import React, { useState } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { VIDEOS } from '../../generated/videosList';
import { takeNavCallback } from '@utils/navCallbackStore';
import VideoPlayer from 'react-native-video';
import { resolveVideoPath } from '@utils/media';

type Video = {
  id: string;
  name: string;
  uri: any;
  displayName: string;
  thumbnail: any | null;
};

export const VideosScreen: React.FC = () => {
  const navigation = useNavigation() as any;
  const route: any = useRoute();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 32) / 2;

  const onVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    setIsPlaying(false);
  };

  const onVideoPlayPress = (video: Video) => {
    if (selectedVideo?.id === video.id) {
      setIsPlaying(prev => !prev);
      return;
    }

    setSelectedVideo(video);
    setIsPlaying(true);
  };

  const renderVideoItem = ({ item }: { item: Video }) => {
    const isSelected = selectedVideo?.id === item.id;

    let videoUri = item.uri;
    if (typeof videoUri === 'number') {
      try {
        const resolved = Image.resolveAssetSource(videoUri);
        videoUri = resolved?.uri || '';
      } catch {
        videoUri = '';
      }
    }

    return (
      <View style={{ width: itemWidth, margin: 6 }}>
        <View
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: isSelected ? 'white' : 'transparent',
            backgroundColor: '#000',
            aspectRatio: 1,
            position: 'relative',
          }}
        >
          {videoUri && (
            <VideoPlayer
              source={{ uri: videoUri }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
              }}
              resizeMode="cover"
              paused={!(isSelected && isPlaying)}
              onEnd={() => setIsPlaying(false)}
              controls={false}
              repeat={false}
              pointerEvents="none"
            />
          )}

          <TouchableOpacity
            onPress={() => onVideoSelect(item)}
            activeOpacity={1}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
            }}
          />

          <TouchableOpacity
            onPress={() => onVideoPlayPress(item)}
            activeOpacity={0.9}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: -30,
              marginTop: -30,
              width: 60,
              height: 60,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 11,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: 'rgba(181, 29, 150, 0.8)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isSelected && isPlaying ? (
                <View
                  style={{
                    width: 14,
                    height: 14,
                    backgroundColor: 'white',
                    borderRadius: 2,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 16,
                    borderTopWidth: 10,
                    borderBottomWidth: 10,
                    borderLeftColor: 'white',
                    borderTopColor: 'transparent',
                    borderBottomColor: 'transparent',
                    marginLeft: 4,
                  }}
                />
              )}
            </View>
          </TouchableOpacity>

          {isSelected && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#B51D96',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 12,
              }}
            >
              <Text
                style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}
              >
                ✓
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <FlatList
        data={VIDEOS}
        keyExtractor={item => item.id}
        renderItem={renderVideoItem}
        numColumns={2}
        contentContainerStyle={{
          paddingHorizontal: 10,
          paddingTop: 10,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* bottom button */}
      <View
        className="z-1000 border-t border-border2Color"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor: '#4D0B49',
        }}
        pointerEvents="box-none"
      >
        <View>
          <LinierButton
            title="Add Video"
            onPress={async () => {
              if (selectedVideo) {
                try {
                  console.log('selectedVideo', selectedVideo);
                  const path = await resolveVideoPath(
                    selectedVideo.uri,
                    selectedVideo.name,
                  );

                  console.log('Resolved video path:', path);

                  const callbackId = route?.params?.callbackId as
                    | string
                    | undefined;
                  try {
                    const cb = takeNavCallback(callbackId);
                    if (typeof cb === 'function') {
                      const realVideoUri = await resolveVideoPath(
                        selectedVideo.uri,
                        selectedVideo.name,
                      );
                      console.log('realVideoUri:', realVideoUri);

                      cb({
                        uri: realVideoUri,
                        id: selectedVideo.id,
                        name: selectedVideo.name,
                      });
                    }
                  } catch (e) {
                    console.error('Error in callback:', e);
                  }
                } catch (e) {
                  console.error('Error in callback:', e);
                }
                navigation.goBack();
              }
            }}
            disabled={!selectedVideo}
          />
        </View>
      </View>
    </View>
  );
};
