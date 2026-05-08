import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NotIcon } from '@assets/svg/NotIcon';
import BackIcon from '../../assets/svg/BackIcon.svg';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import useUnreadNotificationsCount from '@hooks/useUnreadNotificationsCount';
import LogoIconSvg from '@assets/svg/LogoIconSvg.svg';
import LinearGradient from 'react-native-linear-gradient';

export const Layout = ({
  children,
  isNotification = true,
  isBack = false,
  title,
}: {
  children: React.ReactNode;
  isNotification?: boolean;
  isBack?: boolean;
  title?: string;
}) => {
  const navigation = useNavigation<AuthNavigationProp>();
  const onBackPress = () => {
    navigation.goBack();
  };
  const onNotificationPress = () => {
    navigation.navigate('MainContentNavigation', {
      screen: 'NotificationsScreen',
    });
  };

  const insets = useSafeAreaInsets();
  const { count: unreadCount } = useUnreadNotificationsCount();

  return (
    <View
      className="flex-1 relative"
      style={{ paddingTop: insets.top }}
    >
      <LinearGradient
        colors={['#3C1053', '#550844']}
        style={StyleSheet.absoluteFill}
      />
      <View className={`h-11 flex-row items-center justify-between px-3`}>
        {isBack ? (
          <TouchableOpacity
            onPress={onBackPress}
            className="flex-row gap-1 items-center w-[60px]"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <BackIcon />
            {/* <Text className="text-white text-lg font-regular">Back</Text> */}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60, height: 1 }} />
        )}
        {title ? (
          <View>
            <Text className="text-white text-lg font-semibold">{title}</Text>
          </View>
        ) : (
          <View
            className="absolute "
            style={{
              left: '50%',
              transform: [{ translateX: -80 }],
            }}
          >
            {/* <Image source={require('@assets/img/Logo.png')} /> */}
            <LogoIconSvg />
          </View>
        )}
        {isNotification ? (
          <TouchableOpacity
            onPress={() => {
              onNotificationPress();
            }}
            className="w-12 items-end"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ position: 'relative' }}
          >
            <NotIcon />
            {/* Unread badge */}
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -2,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#E92F80',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}
              >
                <Text className="text-white text-[10px] font-semibold">
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50, height: 1 }} />
        )}
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
};
