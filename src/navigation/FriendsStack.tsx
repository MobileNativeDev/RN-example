import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Layout } from '../components/Layout';
import { FriendsScreen } from '@screens/friends/FriendsScreen';

const Stack = createNativeStackNavigator();

export const FriendsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="FriendsScreen"
        children={() => (
          <Layout isBack={false}>
            <FriendsScreen />
          </Layout>
        )}
      />
    </Stack.Navigator>
  );
};
