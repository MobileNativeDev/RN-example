import { Text, View } from 'react-native';
import BigClock from '../../../assets/svg/BigClock.svg';
import DownArrow from '../../../assets/svg/DownArrow.svg';

export const EmptyAlarms = () => {
  return (
    <View
      className="flex-1 border rounded-2xl justify-center items-center gap-y-[75px] bg-transparent mx-4 mt-4 px-9 pb-10"
      style={{
        backgroundColor: 'rgba(72, 23, 96, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
      }}
    >
      <BigClock />

      <View className=" justify-center items-center gap-y-6">
        <Text className="text-center text-white text-lg">
          Create your first Alarm
        </Text>
        <DownArrow />
      </View>
    </View>
  );
};
