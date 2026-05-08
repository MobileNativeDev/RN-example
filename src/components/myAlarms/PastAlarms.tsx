import { Alarm } from '@appTypes/types';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ListRenderItem,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { formatTo12Hour, formatToMonthDay } from '../../utils/time';
import ShareIcon from '../../../assets/svg/Share.svg';
import DeleteIcon from '../../../assets/svg/DeleteIcon.svg';
import { AlarmsContainer } from './AlarmsContainer';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import useProgressiveAlarmList from './useProgressiveAlarmList';

export const PastAlarms = ({
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
  const [isOpen, setIsOpen] = useState(false);
  const data = useProgressiveAlarmList(alarmList, {
    enabled: isOpen,
    initialCount: 12,
    batchSize: 12,
  });

  const handlePressAlarm = useCallback(
    (alarm: Alarm) => {
      navigation.navigate('AlarmNavigation', {
        screen: 'AlarmScreen',
        params: { id: alarm.id },
      });
    },
    [navigation],
  );

  const renderItem: ListRenderItem<Alarm> = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      className="flex-row items-center justify-center border-b border-1/3 pt-2 pb-2"
      style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}
      onPress={() => handlePressAlarm(item)}
    >
      <View style={{ flex: 1 }}>
        <Text className="text-textGray font-regular text-xs">
          {item.createdBy}
        </Text>
        <Text className="text-white font-regular text-2xl">
          {formatTo12Hour(item.time)}
        </Text>
      </View>
      <View>
        <Text className="text-textGray font-regular text-xs mb-1 text-right">
          {item.days ?? formatToMonthDay(item.date)}
        </Text>
        <View className="flex-row gap-2 justify-end">
          <TouchableOpacity
            activeOpacity={0.8}
            className="border w-[35px] h-[35px] rounded-lg items-center justify-center border-white"
            style={{ boxShadow: ' 0 1px 30px 0 rgba(69, 42, 124, 0.1)' }}
            onPress={() => handlePressAlarm(item)}
          >
            <LinearGradient
              colors={['#540743', '#B51D96']}
              className="w-full h-full rounded-lg items-center justify-center"
            >
              <ShareIcon />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={
              typeof deletingId !== 'undefined' && deletingId === item.id
            }
            onPress={() => handleDeleteAlarm(item)}
            className="border w-[35px] h-[35px] rounded-lg items-center justify-center border-white"
            style={{ boxShadow: ' 0 1px 30px 0 rgba(69, 42, 124, 0.1)' }}
          >
            <LinearGradient
              colors={['#540743', '#B51D96']}
              className="w-full h-full rounded-lg items-center justify-center"
            >
              {typeof deletingId !== 'undefined' && deletingId === item.id ? (
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

  return (
    <AlarmsContainer
      onExpand={onExpand}
      onToggleChange={setIsOpen}
      title="Past Alarms"
    >
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        initialNumToRender={12}
        windowSize={5}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={50}
        scrollEnabled={false}
        contentContainerStyle={{ paddingBottom: 10 }}
      />
    </AlarmsContainer>
  );
};
