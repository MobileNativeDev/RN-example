import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Layout } from '../components/Layout';
import { MyAlarmsScreen } from '@screens/MyAlarmsScreen';
import { NotificationsScreen } from '@screens/NotificationsScreen';

const Stack = createNativeStackNavigator();

export const MyAlarmsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'simple_push',
      }}
    >
      <Stack.Screen
        name="MyAlarmsMain"
        children={() => (
          <Layout isBack={false}>
            <MyAlarmsScreen />
          </Layout>
        )}
      />

      <Stack.Screen
        name="NotificationsScreen"
        // options={{ animation: 'fade' }}
        children={() => (
          <Layout isBack={true} title="Notifications">
            <NotificationsScreen />
          </Layout>
        )}
      />
    </Stack.Navigator>
  );
};
