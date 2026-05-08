import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import React, { memo } from 'react';
import MyAlarmsClockIcon from '../../assets/svg/MyAlarmsClockIcon.svg';
import FriendsIcon from '../../assets/svg/FriendsIcon.svg';
import SettingsIcon from '../../assets/svg/SettingsIcon.svg';
import LinearGradient from 'react-native-linear-gradient';
import { MyAlarmsStack } from './MyAlarmsStack';
import { FriendsStack } from './FriendsStack';
import { NotificationStack } from './NotificationStack';
import { SettingsScreen } from '@screens/SettingsScreen';
import { Layout } from '@components/Layout';

const Tab = createBottomTabNavigator();

function GlassTabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.10)',
          'rgba(255,255,255,0.06)',
          'rgba(255,255,255,0.10)',
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24 }}
      />
    </View>
  );
}
function TabBubble({
  focused,
  children,
  label,
}: {
  focused: boolean;
  children: React.ReactNode;
  label: string;
}) {
  const content = (
    <>
      {children}
      <Text
        allowFontScaling={false}
        className="font-semibold text-[10px] text-white mt-1"
      >
        {label}
      </Text>
    </>
  );

  if (!focused) {
    return (
      <View
        style={{
          width: 110,
          height: 63,
          borderRadius: 9999,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.12)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        width: 110,
        height: 63,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 12,
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 24,
          borderTopLeftRadius: 9999,
          borderTopRightRadius: 9999,
        }}
      />
      {content}
    </LinearGradient>
  );
}

const SettingsTab = memo(() => (
  <Layout>
    <SettingsScreen />
  </Layout>
));

const TAB_BAR_STYLE = {
  height: 100,
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.18)',
  borderTopLeftRadius: 50,
  borderTopRightRadius: 50,
  paddingTop: 30,
  paddingBottom: 12,
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.2,
  shadowRadius: 22,
  elevation: 0,
} as const;

const tabBarBackground = () => <GlassTabBarBackground />;

const myAlarmsTabBarIcon = ({ focused }: { focused: boolean }) => (
  <TabBubble focused={focused} label="My Alarms">
    <MyAlarmsClockIcon />
  </TabBubble>
);

const friendsTabBarIcon = ({ focused }: { focused: boolean }) => (
  <TabBubble focused={focused} label="Friends">
    <FriendsIcon />
  </TabBubble>
);

const settingsTabBarIcon = ({ focused }: { focused: boolean }) => (
  <TabBubble focused={focused} label="Settings">
    <SettingsIcon />
  </TabBubble>
);

const hiddenTabBarIcon = () => null;

const TAB_SCREEN_OPTIONS = {
  tabBarBackground,
  tabBarStyle: TAB_BAR_STYLE,
  tabBarShowLabel: false,
  headerShown: false,
} as const;

const MyTabs = () => {
  return (
    <Tab.Navigator screenOptions={TAB_SCREEN_OPTIONS}>
      <Tab.Screen
        name="My Alarms"
        component={MyAlarmsStack}
        options={{ tabBarIcon: myAlarmsTabBarIcon }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsStack}
        options={{ tabBarIcon: friendsTabBarIcon }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsTab}
        options={{ tabBarIcon: settingsTabBarIcon }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationStack}
        options={{ tabBarIcon: hiddenTabBarIcon, tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
};
export default MyTabs;
