import { View, Text } from 'react-native';
import { Alarm } from '@appTypes/types';

interface AlarmInfoHeaderProps {
  alarm: Alarm | null;
}

export const AlarmInfoHeader = ({ alarm }: AlarmInfoHeaderProps) => {
  if (!alarm) return null;

  return (
    <View className="bg-[#AE1B90] p-[10px] rounded-2xl mb-[10px]">
      <Text className="text-white font-regular text-xs">
        {alarm.time} {alarm.date}
      </Text>
      <Text className="text-white font-regular text-xs">
        Created by {alarm.createdBy}
      </Text>
    </View>
  );
};
