import { LinierButton } from '@components/customComponents/LinierButton';
import React, { useState } from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Alert } from '@utils/alert';
import { useNavigation, useRoute } from '@react-navigation/native';
import { takeNavCallback } from '../../utils/navCallbackStore';
import RNFS from 'react-native-fs';

const IMAGES = [
  require('@assets/puzzles/frame1.png'),
  require('@assets/puzzles/frame2.png'),
  require('@assets/puzzles/frame3.png'),
  require('@assets/puzzles/frame4.png'),
  require('@assets/puzzles/frame5.png'),
  require('@assets/puzzles/frame6.png'),
  require('@assets/puzzles/frame7.png'),
];

export const resolveImagePath = async (input: number): Promise<string> => {
  const resolved = Image.resolveAssetSource(input);

  if (!resolved?.uri) {
    throw new Error('Cannot resolve image asset');
  }

  let filename =
    resolved.uri.split('/').pop()?.split('?')[0] || `image_${Date.now()}.png`;

  const destPath = `${RNFS.CachesDirectoryPath}/${filename}`;

  if (await RNFS.exists(destPath)) {
    return `file://${destPath}`;
  }

  let assetPath = '';

  if (Platform.OS === 'android') {
    if (resolved.uri.startsWith('assets_')) {
      assetPath = resolved.uri.replace(/^assets_/, '').replace(/_/g, '/');

      if (!assetPath.match(/\.(png|jpg|jpeg|webp)$/i)) {
        assetPath += '.png';
      }
    } else {
      assetPath = `puzzles/${filename}`;
    }

    console.log('Correct asset path:', assetPath);
    await RNFS.copyFileAssets(assetPath, destPath);
  } else {
    // iOS: behave like resolveSongPath
    const fromUri = resolved.uri;
    console.log('iOS image resolved.uri:', fromUri);

    if (fromUri.startsWith('http')) {
      // Dev server asset
      console.log('Downloading image from dev server:', fromUri);
      try {
        const downloadResult = await RNFS.downloadFile({
          fromUrl: fromUri,
          toFile: destPath,
        }).promise;
        console.log('Image download result:', downloadResult);
        if (downloadResult.statusCode && downloadResult.statusCode !== 200) {
          throw new Error(
            'Image download failed with status ' + downloadResult.statusCode,
          );
        }
      } catch (e) {
        console.error('Error downloading image asset:', e);
        Alert.alert(
          'Error',
          'Failed to download image asset. Please try again.',
        );
        throw e;
      }
    } else {
      // Bundled file:// asset
      await RNFS.copyFile(fromUri.replace('file://', ''), destPath);
    }
  }

  return `file://${destPath}`;
};

export const PicturesScreen = () => {
  const navigation = useNavigation();
  const route: any = useRoute();
  const [selected, setSelected] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const numColumns = 2;
  const itemSize = Math.floor((width - 40) / numColumns);

  const onAdd = async () => {
    if (selected == null) return;
    const callbackId = route?.params?.callbackId as string | undefined;
    const cb = takeNavCallback(callbackId);
    if (typeof cb === 'function') {
      try {
        let resolvedUri = IMAGES[selected];
        if (typeof IMAGES[selected] === 'number') {
          // const assetSource = Image.resolveAssetSource(IMAGES[selected]);
          // console.log('Asset source:', assetSource);
          resolvedUri = await resolveImagePath(IMAGES[selected]);
          console.log('Resolved URI:', resolvedUri);
        }

        cb({ uri: resolvedUri });
      } catch (e) {
        console.error('Error adding picture:', e);
      }
    }
    navigation.goBack();
  };

  return (
    <View className="flex-1 px-[15px] pt-4">
      <FlatList
        data={IMAGES}
        numColumns={numColumns}
        keyExtractor={(_, idx) => String(idx)}
        contentContainerStyle={{ paddingBottom: 120, gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item, index }) => {
          const isSelected = selected === index;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelected(index)}
              style={{
                width: itemSize,
                height: 122,
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: isSelected ? 2 : 0,
                borderColor: isSelected ? 'white' : 'rgba(255,255,255,0.1)',
              }}
            >
              <Image
                source={item}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        }}
      />

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
        <LinierButton
          title="Add Picture"
          onPress={onAdd}
          disabled={selected == null}
        />
      </View>
    </View>
  );
};
