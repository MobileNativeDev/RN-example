import { Alarm } from '@appTypes/types';
import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { formatTo12Hour } from '../../utils/time';
import Copy from '../../../assets/svg/Copy.svg';
import DeleteIcon from '../../../assets/svg/DeleteIcon.svg';
import { AlarmsContainer } from './AlarmsContainer';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '@appTypes/navigationTypes';

const SentAlarmRow = ({
  alarm,
  deletingId,
  handleCopyAlarm,
  handleDeleteAlarm,
  renderStatus,
}: {
  alarm: Alarm;
  deletingId?: string | null;
  handleCopyAlarm: (alarm: Alarm) => void;
  handleDeleteAlarm: (alarm: Alarm) => void;
  renderStatus: (status: string) => React.ReactNode;
}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => handleCopyAlarm(alarm)}
    className="border-b border-1/3 pt-2 pb-1"
    style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}
  >
    <Text className="text-textGray font-regular text-xs">
      For {alarm.owner}
    </Text>

    <View className="flex-1 flex-row">
      <View style={{ flex: 1 }}>
        <Text className="text-white font-regular text-2xl">
          {formatTo12Hour(alarm.time)}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View>{renderStatus(alarm.status)}</View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleCopyAlarm(alarm)}
          className="border w-[35px] h-[35px] rounded-lg items-center justify-center border-white"
          style={{ boxShadow: ' 0 1px 30px 0 rgba(69, 42, 124, 0.1)' }}
        >
          <LinearGradient
            colors={['#540743', '#B51D96']}
            className="w-full h-full rounded-lg items-center justify-center"
          >
            <Copy />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={typeof deletingId !== 'undefined' && deletingId === alarm.id}
          onPress={() => handleDeleteAlarm(alarm)}
          className="border w-[35px] h-[35px] rounded-lg items-center justify-center border-white"
          style={{ boxShadow: ' 0 1px 30px 0 rgba(69, 42, 124, 0.1)' }}
        >
          <LinearGradient
            colors={['#540743', '#B51D96']}
            className="w-full h-full rounded-lg items-center justify-center"
          >
            {typeof deletingId !== 'undefined' && deletingId === alarm.id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <DeleteIcon />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
);

export const SentAlarms = ({
  alarmList,
  handleDeleteAlarm,
  onExpand,
  deletingId,
}: {
  alarmList: Alarm[];
  handleDeleteAlarm: (alarm: Alarm) => void;
  deletingId?: string | null;
  onExpand?: () => void;
}) => {
  const navigation = useNavigation<AuthNavigationProp>();
  const data = alarmList;

  const handleCopyAlarm = (alarm: Alarm) => {
    navigation.navigate('AlarmNavigation', {
      screen: 'PreviewAlarmScreen',
      params: { chosenAlarm: alarm },
    });
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'Accepted':
        return (
          <View className="border border-acceptStatus rounded-md px-[10px] py-1">
            <Text className="text-acceptStatus font-regular text-sm">
              {status}
            </Text>
          </View>
        );
      case 'Pending':
        return (
          <View className="border border-pendingStatus rounded-md px-[10px] py-1">
            <Text className="text-pendingStatus font-regular text-sm">
              {status}
            </Text>
          </View>
        );
      case 'Declined':
        return (
          <View className="border border-declinedStatus rounded-md px-[10px] py-1">
            <Text className="text-declinedStatus font-regular text-sm">
              {status}
            </Text>
          </View>
        );
      case 'Viewed':
        return (
          <View className="border border-viewedStatus rounded-md px-[10px] py-1">
            <Text className="text-viewedStatus font-regular text-sm">
              {status}
            </Text>
          </View>
        );
      default:
        return (
          <View className="border border-acceptStatus rounded-md px-[10px] py-1">
            <Text className="text-gray-400 font-semibold">{status}</Text>
          </View>
        );
    }
  };

  return (
    <AlarmsContainer onExpand={onExpand} title="Sent Alarms">
      <View style={{ paddingBottom: 10 }}>
        {data.map(alarm => (
          <SentAlarmRow
            key={alarm.id}
            alarm={alarm}
            deletingId={deletingId}
            handleCopyAlarm={handleCopyAlarm}
            handleDeleteAlarm={handleDeleteAlarm}
            renderStatus={renderStatus}
          />
        ))}
      </View>
    </AlarmsContainer>
  );
};
