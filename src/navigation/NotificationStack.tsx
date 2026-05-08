import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Layout } from '../components/Layout';
import { NotificationsScreen } from '@screens/NotificationsScreen';

const Stack = createNativeStackNavigator();

export const NotificationStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="NotificationsScreen"
        children={() => (
          <Layout isBack={true} title="Notifications" isNotification={false}>
            <NotificationsScreen />
          </Layout>
        )}
      />
    </Stack.Navigator>
  );
};
