import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export type ToggleSwitchProps = {
  value: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
};

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const PADDING = 4;
const THUMB_SIZE = TRACK_HEIGHT - PADDING * 2;
const RADIUS = TRACK_HEIGHT / 2;

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  value,
  onChange,
  disabled = false,
  style,
}) => {
  const [toggleValue, setToggleValue] = useState(value);
  const progress = useRef(new Animated.Value(toggleValue ? 1 : 0)).current;

  useEffect(() => {
    setToggleValue(Boolean(value));
  }, [value]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: toggleValue ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [toggleValue, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH - THUMB_SIZE - PADDING * 2],
  });

  const handleToggle = () => {
    if (disabled) return;
    setToggleValue(!toggleValue);

    onChange?.(!toggleValue);
  };

  return (
    <TouchableWithoutFeedback onPress={handleToggle}>
      <View
        style={[
          {
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            borderRadius: RADIUS,
            padding: PADDING,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        {/* Track background */}
        <View
          style={{
            position: 'absolute',
            inset: 0 as unknown as number,
            backgroundColor: 'rgba(162, 24, 133, 0.25)',
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.28)',
          }}
        />
        {/* Gloss overlay */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.20)',
            'rgba(255,255,255,0.06)',
            'rgba(255,255,255,0.20)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: RADIUS,
          }}
        />

        {/* Thumb */}
        <Animated.View
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            transform: [{ translateX }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              zIndex: 1000,
              inset: 0 as unknown as number,
              borderRadius: THUMB_SIZE / 2,
              borderWidth: 1,
              borderColor: '#FFFFFF',
            }}
          />
          <LinearGradient
            colors={
              toggleValue
                ? ['#540743', '#B51D96', '#E052AF']
                : ['#fff', '#fff', '#fff']
            }
            locations={[0, 0.6, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderRadius: THUMB_SIZE / 2 }}
          />
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ToggleSwitch;
