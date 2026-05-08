import { JSX } from 'react';
import {
  Platform,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const LinierButton = ({
  title,
  onPress,
  disabled,
  borderColor,
  textStyles,
  buttonStyles,
  loading,
  loaderColor,
}: {
  title: string | JSX.Element | JSX.Element[];
  onPress: () => void;
  disabled?: boolean;
  borderColor?: boolean;
  textStyles?: string;
  buttonStyles?: string;
  loading?: boolean;
  loaderColor?: string;
}) => {
  return (
    <LinearGradient
      colors={['rgba(233, 47, 128, 1)', 'rgba(241, 103, 155, 1)']}
      style={{
        backgroundColor: 'rgba(233, 47, 128, 1)',
        borderWidth: Platform.OS === 'ios' ? 1 : 2,
        opacity: disabled ? 0.5 : 1,
        borderColor: borderColor ? 'rgba(1, 1, 1, 1)' : 'rgba(1, 1, 1, 1)',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: 'rgba(0,0,0,0.35)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        className={`p-5 flex-row justify-center items-center w-full ${buttonStyles}`}
        onPress={onPress}
        disabled={!!disabled || !!loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={loaderColor ?? '#fff'} />
        ) : typeof title === 'string' || typeof title === 'number' ? (
          <Text
            className={`font-semibold text-[17px] text-white ${textStyles}`}
          >
            {title}
          </Text>
        ) : (
          <View className={textStyles ?? ''}>{title}</View>
        )}
      </TouchableOpacity>
    </LinearGradient>
  );
};
