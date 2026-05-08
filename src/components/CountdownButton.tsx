import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { LinierButton } from '@components/customComponents/LinierButton';
import EmojiIcon from '@assets/svg/EmojiIcon.svg';

interface CountdownButtonProps {
  initialSeconds: number;
  completed: boolean;
  onPress: () => void;
  loading?: boolean;
}

export const CountdownButton = ({
  initialSeconds,
  completed,
  onPress,
  loading,
}: CountdownButtonProps) => {
  const [countdown, setCountdown] = useState<number>(initialSeconds);

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
  }, []);

  return (
    <LinierButton
      title={
        loading ? (
          <ActivityIndicator size={'small'} color="#fff" />
        ) : countdown > 0 && !completed ? (
          `${countdown} sec`
        ) : (
          <View className="flex-row items-center">
            <EmojiIcon />
            <Text className="text-white font-semibold text-[17px] ml-[10px]">
              I'm awake!
            </Text>
          </View>
        )
      }
      onPress={onPress}
      borderColor
      buttonStyles="w-full"
      disabled={countdown > 0 && !completed}
    />
  );
};
