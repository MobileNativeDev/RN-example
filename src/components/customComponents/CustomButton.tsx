import React from 'react';
import { TouchableOpacity, Text, GestureResponderEvent } from 'react-native';

type ButtonProps = {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: string;
  loading?: boolean;
  disabled?: boolean;
  loadingText?: string;
  color?: string;
  icon?: React.ReactNode;
  textStyle?: string;
};

export const CustomButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  style = '',
  loading = false,
  disabled = false,
  color,
  textStyle,
}) => {
  const isButtonDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.4}
      onPress={onPress}
      disabled={isButtonDisabled}
      className={`justify-center items-center rounded-[10px]  border p-4 ${style}`}
      style={[
        color && !isButtonDisabled ? { backgroundColor: color } : undefined,
        isButtonDisabled && { opacity: 0.4 },
      ]}
    >
      <Text allowFontScaling={false} className={`${textStyle}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};
