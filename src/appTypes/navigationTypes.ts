import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alarm, EmailRegisterPayload } from './types';

export type RootStackParamList = {
  AuthNavigation: {
    screen: string;
    params?: {
      emailRegisterPayload?: EmailRegisterPayload;
      token?: string;
      deepLinkNonce?: number;
    };
  };
  MyTabs: { screen: string; params?: { friend: any } };
  AlarmNavigation: {
    screen: string;
    params?: { id?: string; chosenAlarm?: Alarm };
  };
  FriendDetailsScreen: { screen?: string; params?: { friend: any } };
  MyAlarmsStack: { screen: string; params?: { id?: string } };
  MainContentNavigation: { screen: string; params?: any };
  AlarmActivityScreen: { id?: string };
  ShareAlarmScreen: { id?: string; alarmData?: Alarm };
};

export type AuthNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MyTabs'
>;
