import { Alarm } from '@appTypes/types';
import React, { memo, useCallback } from 'react';
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
import EditIcon from '../../../assets/svg/EditIcon.svg';
import DeleteIcon from '../../../assets/svg/DeleteIcon.svg';
import { AlarmsContainer } from './AlarmsContainer';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '@appTypes/navigationTypes';

const AlarmItem = memo(({
  alarm,
  deletingId,
  onPressEdit,
  onDelete,
}: {
  alarm: Alarm;
  deletingId?: string | null;
  onPressEdit: (alarm: Alarm) => void;
  onDelete: (alarm: Alarm) => void;
}) => (
  <TouchableOpacity
    onPress={() => onPressEdit(alarm)}
    activeOpacity={0.85}
    className="flex-row items-center justify-center border-b border-1/3 pt-2 pb-2"
    style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}
  >
    <View style={{ flex: 1 }}>
      <Text className="text-textGray font-regular text-xs">
        {alarm.createdBy}
      </Text>
      <Text className="text-white font-regular text-2xl">
        {formatTo12Hour(alarm.time)}
      </Text>
    </View>
    <View>
      <Text className="text-textGray font-regular text-xs mb-1 text-right">
        {alarm.days ?? formatToMonthDay(alarm.date)}
      </Text>
      <View className="flex-row gap-2 justify-end">
        <TouchableOpacity
          onPress={() => onPressEdit(alarm)}
          className="border w-[35px] h-[35px] rounded-lg items-center justify-center border-white"
          style={{ boxShadow: '0 1px 30px 0 rgba(69, 42, 124, 0.1)' }}
        >
          <LinearGradient
            colors={['#540743', '#B51D96']}
            className="w-full h-full rounded-lg items-center justify-center"
          >
            <EditIcon />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          className="border w-[35px] h-[35px] rounded-lg items-center justify-center border-white"
          style={{ boxShadow: ' 0 1px 30px 0 rgba(69, 42, 124, 0.1)' }}
          disabled={
            typeof deletingId !== 'undefined' && deletingId === alarm.id
          }
          onPress={() => onDelete(alarm)}
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
));

export const UpcomingAlarms = ({
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

  const onPressEditAlarm = useCallback((alarm: Alarm) => {
    navigation.navigate('AlarmNavigation', {
      screen: 'EditAlarmScreen',
      params: { chosenAlarm: alarm },
    });
  }, [navigation]);

  const renderItem: ListRenderItem<Alarm> = useCallback(
    ({ item }) => (
      <AlarmItem
        alarm={item}
        deletingId={deletingId}
        onPressEdit={onPressEditAlarm}
        onDelete={handleDeleteAlarm}
      />
    ),
    [deletingId, onPressEditAlarm, handleDeleteAlarm],
  );

  return (
    <AlarmsContainer onExpand={onExpand} title="Upcoming Alarms" open={true}>
      <FlatList
        data={alarmList}
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
