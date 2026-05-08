import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#3C1053', '#550844']}
        style={StyleSheet.absoluteFill}
      />
      <View className="flex-1">{children}</View>
    </View>
  );
};
