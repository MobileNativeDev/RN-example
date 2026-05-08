import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useKeyboardShift } from '@hooks/useKeyboardShift';

export const KeyboardShiftView = ({
  behavior = 'padding',
  children,
  className,
  fallbackDuration,
  offset,
  style,
}: {
  behavior?: 'padding' | 'translate';
  children: React.ReactNode;
  className?: string;
  fallbackDuration?: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const { animatedStyle } = useKeyboardShift({
    behavior,
    offset,
    fallbackDuration,
  });

  return (
    <Animated.View className={className} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};
