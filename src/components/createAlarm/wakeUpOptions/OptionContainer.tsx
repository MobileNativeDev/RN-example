import React, { ReactNode, useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Alert } from '@utils/alert';
import LinearGradient from 'react-native-linear-gradient';

export const OptionContainer = ({
  children,
  title,
  order = 1,
  open = false,
  icon,
  openable = true,
}: {
  children: ReactNode;
  title: string;
  order?: number;
  open?: boolean;
  icon?: ReactNode;
  openable?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(open);
  }, [open]);

  const changeOpen = () => {
    if (openable) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsOpen(prev => {
        return !prev;
      });
    } else {
      Alert.alert('It will be surprise for you.');
    }
  };

  const sharedStyle = {
    boxShadow:
      '0 1px 30px 0 rgba(69, 42, 124, 0.1), 0 4px 4px 0 rgba(0, 0, 0, 0.25)',
  } as const;

  if (isOpen) {
    return (
      <View
        className="rounded-2xl border mb-[10px]"
        style={[
          sharedStyle,
          {
            backgroundColor: 'rgba(72, 23, 96, 0.2)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
          },
        ]}
      >
        <TouchableOpacity
          onPress={changeOpen}
          activeOpacity={0.7}
          className="p-5 flex-row justify-between items-center w-full"
        >
          <View className="flex-row items-center gap-3">
            <Text className="rounded-full bg-white w-[30px] h-[30px] text-center font-bold text-lg">
              {order + 1}
            </Text>
            {icon}
            <Text className="text-white font-semibold text-[17px]">
              {title}
            </Text>
          </View>
          <Text className="text-white text-[15px] font-regular">Hide</Text>
        </TouchableOpacity>

        <View className="px-5">{children}</View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#540743', '#B51D96']}
      className="rounded-2xl border mb-[10px]"
      style={[sharedStyle, { borderColor: 'white' }]}
    >
      <TouchableOpacity
        onPress={changeOpen}
        activeOpacity={0.7}
        className="p-5 flex-row justify-between items-center w-full"
      >
        <View className="flex-row items-center gap-3">
          <Text className="rounded-full bg-white w-[30px] h-[30px] text-center font-bold text-lg">
            {order + 1}
          </Text>
          {icon}
          <Text className="text-white font-semibold text-[17px]">{title}</Text>
        </View>
        <Text className="text-white text-[15px] font-regular">Show</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};
