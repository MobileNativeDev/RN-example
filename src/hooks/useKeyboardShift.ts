import { useEffect } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type UseKeyboardShiftOptions = {
  behavior?: 'padding' | 'translate';
  offset?: number;
  fallbackDuration?: number;
};

export const useKeyboardShift = ({
  behavior = 'padding',
  offset = 0,
  fallbackDuration = 250,
}: UseKeyboardShiftOptions = {}) => {
  const keyboardOffset = useSharedValue(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animateTo = (nextValue: number, event?: KeyboardEvent) => {
      const duration = event?.duration ?? fallbackDuration;
      keyboardOffset.value = withTiming(nextValue, { duration });
    };

    const showSubscription = Keyboard.addListener(showEvent, event => {
      const rawHeight = event.endCoordinates?.height ?? 0;
      const nextHeight = Math.max(0, rawHeight - offset);
      animateTo(nextHeight, event);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, event => {
      animateTo(0, event);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [fallbackDuration, keyboardOffset, offset]);

  const animatedStyle = useAnimatedStyle(() => {
    if (behavior === 'translate') {
      return {
        transform: [{ translateY: -keyboardOffset.value }],
      };
    }

    return {
      paddingBottom: keyboardOffset.value,
    };
  });

  return {
    animatedStyle,
    keyboardOffset,
  };
};
