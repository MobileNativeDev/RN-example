import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Layout } from '../components/Layout';
import { NotificationsScreen } from '@screens/NotificationsScreen';
import { CreateAlarmScreen } from '@screens/CreateAlarmScreen';
import { ChangeMyUsername } from '@screens/settingsScreens/ChangeMyUsername';
import NotificationSettings from '@screens/settingsScreens/NotificationSettings';
import { LegalNote } from '@screens/settingsScreens/LegalNote';
import { PrivacyPolicy } from '@screens/settingsScreens/PrivacyPolicy';
import { TermsAndConditions } from '@screens/settingsScreens/TermsAndConditions';
import { TalkToUs } from '@screens/settingsScreens/TalkToUs';
import { Help } from '@screens/settingsScreens/Help';
// import { RecordVideoScreen } from '@screens/RecordVideoScreen';
import { AddNewFriendScreen } from '@screens/friends/AddNewFriendScreen';
import { FriendDetailsScreen } from '@screens/friends/FriendDetailsScreen';
import { VoicesScreen } from '@screens/exampleRecommendations/VoicesScreen';
import { PicturesScreen } from '@screens/exampleRecommendations/PicturesScreen';
import { SongsScreen } from '@screens/exampleRecommendations/SongsScreen';
import { VideosScreen } from '@screens/exampleRecommendations/VideosScreen';
import { NotificationAlarmDetailScreen } from '@screens/notificationAlarmDetail/NotificationAlarmDetailScreen';

const Stack = createNativeStackNavigator();

export const MainContentNavigation = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'simple_push',
      }}
    >
      <Stack.Screen
        name="NotificationsScreen"
        // options={{ animation: 'fade' }}
        children={() => (
          <Layout isBack={true} title="Notifications" isNotification={false}>
            <NotificationsScreen />
          </Layout>
        )}
      />
      <Stack.Screen
        name="CreateAlarmScreen"
        children={() => (
          <Layout isBack={true} title="Create Alarm" isNotification={false}>
            <CreateAlarmScreen />
          </Layout>
        )}
      />
      <Stack.Screen
        name="ChangeMyUsername"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} title=" " isNotification={false}>
            <ChangeMyUsername />
          </Layout>
        )}
      />
      <Stack.Screen
        name="NotificationSettings"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout
            isBack={true}
            title="Notification settings"
            isNotification={false}
          >
            <NotificationSettings />
          </Layout>
        )}
      />
      <Stack.Screen
        name="LegalNote"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} title="Legal note" isNotification={false}>
            <LegalNote />
          </Layout>
        )}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} title="Privacy policy" isNotification={false}>
            <PrivacyPolicy />
          </Layout>
        )}
      />
      <Stack.Screen
        name="TermsAndConditions"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout
            isBack={true}
            title="Terms & Conditions"
            isNotification={false}
          >
            <TermsAndConditions />
          </Layout>
        )}
      />
      <Stack.Screen
        name="TalkToUs"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} title="Talk to us" isNotification={false}>
            <TalkToUs />
          </Layout>
        )}
      />
      <Stack.Screen
        name="Help"
        options={{ animation: 'simple_push' }}
        children={() => (
          <Layout isBack={true} title="Help" isNotification={false}>
            <Help />
          </Layout>
        )}
      />
      {/* <Stack.Screen
        name="RecordVideoScreen"
        options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} isNotification={false}>
            <RecordVideoScreen />
          </Layout>
        )}
      /> */}
      <Stack.Screen
        name="AddNewFriendScreen"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} isNotification={false}>
            <AddNewFriendScreen />
          </Layout>
        )}
      />
      <Stack.Screen
        name="FriendDetailsScreen"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} title=" " isNotification={false}>
            <FriendDetailsScreen />
          </Layout>
        )}
      />
      <Stack.Screen
        name="VoicesScreen"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} title="Example Voices" isNotification={false}>
            <VoicesScreen />
          </Layout>
        )}
      />
      <Stack.Screen
        name="PicturesScreen"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} title="Example Pictures" isNotification={false}>
            <PicturesScreen />
          </Layout>
        )}
      />
      <Stack.Screen
        name="SongsScreen"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} title="Example Songs" isNotification={false}>
            <SongsScreen />
          </Layout>
        )}
      />
      <Stack.Screen
        name="VideosScreen"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} title="Example Videos" isNotification={false}>
            <VideosScreen />
          </Layout>
        )}
      />
      <Stack.Screen
        name="NotificationAlarmDetailScreen"
        // options={{ animation: 'none' }}
        children={() => (
          <Layout isBack={true} title="Alarm Details" isNotification={false}>
            <NotificationAlarmDetailScreen />
          </Layout>
        )}
      />
    </Stack.Navigator>
  );
};
