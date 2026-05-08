import { Text, TouchableOpacity, View } from 'react-native';
import VoiceIcon from '../../../assets/svg/VoiceIcon.svg';
import VideoIcon from '../../../assets/svg/VideoIcon.svg';
import SongIcon from '../../../assets/svg/SongIcon.svg';
import PuzzleIcon from '../../../assets/svg/PuzzleIcon.svg';
import { BottomModalWithGradient } from '@components/myAlarms/BottomModalWithGradient';

export const ChooseWakeUpWith = ({
  setWakeUpWith,
  isVisible,
  onClose,
  height,
}: {
  wakeMethods: string[];
  setWakeUpWith: (type: 'Voice' | 'Video' | 'Song' | 'Puzzle') => void;
  isVisible: boolean;
  onClose: () => void;
  height: number;
}) => {
  return (
    <BottomModalWithGradient
      isVisible={isVisible}
      onClose={onClose}
      height={height}
    >
      <View className="gap-[10px] mt-1">
        {/* <LinearGradient
          colors={
            wakeMethods.includes('Voice')
              ? ['#540743', '#B51D96']
              : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.1)']
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="rounded-xl"
        > */}
        <TouchableOpacity
          activeOpacity={0.8}
          className={`border border-lightGray rounded-xl items-center justify-center flex-row p-5`}
          onPress={() => {
            setWakeUpWith('Voice');
            onClose();
          }}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <VoiceIcon width={32} height={32} />
          <Text className="text-white font-semibold text-[17px] ml-[10px]">
            Voice
          </Text>
        </TouchableOpacity>
        {/* </LinearGradient> */}

        {/* <LinearGradient
          colors={
            wakeMethods.includes('Video')
              ? ['#540743', '#B51D96']
              : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.1)']
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="rounded-xl"
        > */}
        <TouchableOpacity
          activeOpacity={0.8}
          className={`border border-lightGray rounded-xl items-center justify-center flex-row p-5`}
          onPress={() => {
            setWakeUpWith('Video');
            onClose();
          }}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <VideoIcon width={32} height={32} />
          <Text className="text-white font-semibold text-[17px]  ml-[10px]">
            Video
          </Text>
        </TouchableOpacity>
        {/* </LinearGradient> */}
        {/* <LinearGradient
          colors={
            wakeMethods.includes('Song')
              ? ['#540743', '#B51D96']
              : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.1)']
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="rounded-xl"
        > */}
        <TouchableOpacity
          activeOpacity={0.8}
          className={`border border-lightGray rounded-xl items-center justify-center flex-row p-5`}
          onPress={() => {
            setWakeUpWith('Song');
            onClose();
          }}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <SongIcon width={32} height={32} />
          <Text className="text-white font-semibold text-[17px]  ml-[10px]">
            Song
          </Text>
        </TouchableOpacity>
        {/* </LinearGradient> */}
        {/* <LinearGradient
          colors={
            wakeMethods.includes('Puzzle')
              ? ['#540743', '#B51D96']
              : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.1)']
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="rounded-xl"
        > */}
        <TouchableOpacity
          activeOpacity={0.8}
          className={`border border-lightGray rounded-xl items-center justify-center flex-row p-5`}
          onPress={() => {
            setWakeUpWith('Puzzle');
            onClose();
          }}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <PuzzleIcon width={32} height={32} />
          <Text className="text-white font-semibold text-[17px]  ml-[10px]">
            Puzzle
          </Text>
        </TouchableOpacity>
        {/* </LinearGradient> */}
      </View>
    </BottomModalWithGradient>
  );
};
