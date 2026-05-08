import BigVideoIcon from '@assets/svg/BigVideoIcon.svg';
import { normalizeUri, parseYouTubeVideoId } from '@utils/additionFunctions';
import { useEffect, useMemo, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { createThumbnail } from 'react-native-create-thumbnail';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
  videoUri: string | null;
  width: number;
  height: number;
  title?: string;
};

export const VideoSharePreview = ({
  videoUri,
  width,
  height,
  title = 'Video Wake Up!!!',
}: Props) => {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const youtubeId = useMemo(
    () => parseYouTubeVideoId(videoUri || ''),
    [videoUri],
  );
  const cacheName = useMemo(() => {
    if (!videoUri) return undefined;

    return videoUri
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .slice(-80);
  }, [videoUri]);

  useEffect(() => {
    let cancelled = false;

    if (!videoUri) {
      setThumbnailUri(null);
      return;
    }

    if (youtubeId) {
      setThumbnailUri(`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`);
      return;
    }

    setThumbnailUri(null);

    void createThumbnail({
      url: normalizeUri(videoUri),
      timeStamp: 1000,
      format: 'png',
      cacheName,
      maxWidth: 1280,
      maxHeight: 720,
      onlySyncedFrames: true,
    })
      .then(result => {
        if (cancelled) return;

        const nextUri = result.path.startsWith('file://')
          ? result.path
          : `file://${result.path}`;

        setThumbnailUri(nextUri);
      })
      .catch(() => {
        if (cancelled) return;
        setThumbnailUri(null);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheName, videoUri, youtubeId]);

  return (
    <View
      style={{
        width,
        height,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#6B1258',
      }}
    >
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          resizeMode="cover"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      ) : (
        <LinearGradient
          colors={['rgba(84, 7, 67, 1)', 'rgba(181, 29, 150, 1)']}
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <BigVideoIcon />
        </LinearGradient>
      )}

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
    </View>
  );
};
