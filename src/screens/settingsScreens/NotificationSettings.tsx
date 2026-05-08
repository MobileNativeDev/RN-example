import React from 'react';
import { Text, View, Switch, ScrollView } from 'react-native';
import useNotificationSettings, {
  NOTIFICATION_SETTING_KEYS,
} from '../../hooks/useNotificationSettings';
import { LoaderModal } from '@components/customComponents/LoaderModal';

const Row = ({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) => {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text
          className="font-regular"
          style={{ color: 'white', fontSize: 16, lineHeight: 22 }}
        >
          {label}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: '#20c97a', false: '#777' }}
        thumbColor={value ? '#fff' : '#fff'}
        style={{ transform: [{ scale: 1.2 }] }}
      />
    </View>
  );
};

const Separator = () => (
  <View
    style={{
      height: 1,
      backgroundColor: 'white',
      marginVertical: 4,
    }}
  />
);

export const NotificationSettings = () => {
  const { settings, isLoading, isMutating, setAll, toggleKey } =
    useNotificationSettings();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <LoaderModal isVisible={!!isLoading || !!isMutating} />
      <View>
        <Row
          label="Turn on all notifications"
          value={
            !!settings && NOTIFICATION_SETTING_KEYS.every(k => !!settings[k])
          }
          onValueChange={val => setAll(val)}
        />
        <Separator />

        {/* <Row
          label="Get notified when your friend receives the request for alarm"
          value={!!settings?.notifyFriendRequestReceived}
          onValueChange={val => toggleKey('notifyFriendRequestReceived', val)}
        />
        <Separator /> */}

        <Row
          label="Get notified when your friend confirmed your request for alarm"
          value={!!settings?.notifyFriendRequestConfirmed}
          onValueChange={val => toggleKey('notifyFriendRequestConfirmed', val)}
        />
        <Separator />

        <Row
          label="Get notified when your friend rejected your request for alarm"
          value={!!settings?.notifyFriendRequestRejected}
          onValueChange={val => toggleKey('notifyFriendRequestRejected', val)}
        />
        <Separator />

        <Row
          label="Get notified when your friend got your alarm"
          value={!!settings?.notifyFriendGotAlarm}
          onValueChange={val => toggleKey('notifyFriendGotAlarm', val)}
        />
        <Separator />

        <Row
          label="Get notified when your friend joined the app via your request"
          value={!!settings?.notifyFriendJoined}
          onValueChange={val => toggleKey('notifyFriendJoined', val)}
        />
        <Separator />

        {/* <Row
          label="Get notified when a friend suggests a change / sends connection request"
          value={!!settings?.notifyFriendSuggestedChange}
          onValueChange={val => toggleKey('notifyFriendSuggestedChange', val)}
        /> */}
      </View>
      {/* <Separator /> */}
    </ScrollView>
  );
};

export default NotificationSettings;
