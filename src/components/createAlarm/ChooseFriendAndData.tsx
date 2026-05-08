import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import { useState } from 'react';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { formatToMonthDay, parseTimeToDate } from '@utils/time';
import TablerCalendar from '../../../assets/svg/TablerCalendar.svg';
import SearchIcon from '../../../assets/svg/SearchIcon.svg';
import ClockIconSm from '../../../assets/svg/ClockIconSm.svg';
import { useFriends } from '@hooks/useFriends';
import { useSelector } from 'react-redux';
import { selectUserId } from '@store/auth/selectors';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '@appTypes/navigationTypes';

const GLASS_FIELD_COLORS: string[] = [
  'rgba(255,255,255,0.08)',
  'rgba(255,255,255,0.04)',
  'rgba(255,255,255,0.08)',
];

const FriendRow = ({
  id,
  name,
  onPress,
}: {
  id: string;
  name: string;
  onPress: (id: string) => void;
}) => (
  <TouchableOpacity
    className="py-2 px-4 border-b border-border2Color"
    onPress={() => onPress(id)}
  >
    <Text className="text-white font-regular text-base">{name}</Text>
  </TouchableOpacity>
);

export const ChooseFriendAndData = ({
  isForMe,
  listFriendsIsOpen,
  setListFriendsIsOpen,
  chosenFriend,
  setChosenFriend,
  chosenDate,
  setChosenDate,
  chosenTime,
  setChosenTime,
  disabled,
  disableDate,
}: {
  isForMe: boolean;
  listFriendsIsOpen?: boolean;
  setListFriendsIsOpen?: (value: boolean) => void;
  chosenFriend?: string | undefined;
  setChosenFriend?: (value: string | undefined) => void;
  chosenDate: string | undefined;
  setChosenDate: (value: string) => void;
  chosenTime: string | undefined;
  setChosenTime: (value: string) => void;
  disabled?: boolean;
  disableDate?: boolean;
}) => {
  const navigation = useNavigation<AuthNavigationProp>();

  const { data: friendsRaw = [], isLoading } = useFriends();
  const myUserId = useSelector(selectUserId);
  const friendsList = friendsRaw as any[];

  const friendsData: Array<{ id: string; name: string }> = friendsList
    .filter(
      f => f.status === 'ACCEPTED' || (f.status === 'BLOCKED' && !f.blockedMe),
    )
    .map(friend =>
      myUserId === friend?.friendUserId ? friend?.user : friend?.friendUser,
    );

  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);

  const showDatePicker = () => {
    if (disableDate) return;
    setTempDate(chosenDate ? new Date(chosenDate) : new Date());
    setIsDatePickerVisible(true);
  };

  const onChangeAndroid = (event: DateTimePickerEvent, date?: Date) => {
    setIsDatePickerVisible(false);
    if (event.type === 'set' && date) {
      setChosenDate(date.toISOString());
    }
  };

  const onConfirmIOS = () => {
    setChosenDate(tempDate.toISOString());
    setIsDatePickerVisible(false);
  };
  const onCancelIOS = () => setIsDatePickerVisible(false);

  const showTimePicker = () => {
    const parsed = parseTimeToDate(chosenTime);
    setTempTime(parsed ?? new Date());
    setIsTimePickerVisible(true);
  };

  const onChangeTimeAndroid = (event: DateTimePickerEvent, date?: Date) => {
    setIsTimePickerVisible(false);
    if (event.type === 'set' && date) {
      setChosenTime(date.toISOString());
    }
  };

  const onConfirmTimeIOS = () => {
    try {
      const t = tempTime instanceof Date ? tempTime : new Date(tempTime);
      const timeMs = t.getTime();
      // JS Date must be within ±8.64e15 ms from epoch. Guard against out-of-bounds or invalid dates.
      if (!isFinite(timeMs) || Math.abs(timeMs) > 8.64e15) {
        console.warn(
          'ChooseFriendAndData: tempTime out of bounds, falling back to now',
          tempTime,
        );
        setChosenTime(new Date().toISOString());
      } else {
        setChosenTime(t.toISOString());
      }
    } catch (err) {
      console.warn(
        'ChooseFriendAndData: error converting tempTime to ISO',
        err,
        tempTime,
      );
      setChosenTime(new Date().toISOString());
    }
    setIsTimePickerVisible(false);
  };
  const onCancelTimeIOS = () => setIsTimePickerVisible(false);

  const addNewFriends = () => {
    navigation.navigate('MainContentNavigation', {
      screen: 'AddNewFriendScreen',
    });
  };

  const selectedFriendName =
    friendsData.find(friend => friend.id === chosenFriend)?.name ||
    'Choose a friend';

  const timeLabel = (() => {
    if (!chosenTime) return 'Time';
    const d = parseTimeToDate(chosenTime) ?? new Date(chosenTime);
    if (d && !isNaN(d.getTime())) {
      const hours24 = d.getHours();
      const hours12 = hours24 % 12 || 12;
      const period = hours24 >= 12 ? 'PM' : 'AM';
      return `${hours12}.${String(d.getMinutes()).padStart(2, '0')} ${period}`;
    }
    return String(chosenTime).replace(/^0(?=\d[.:])/, '');
  })();

  const handleFriendSelect = (id: string) => {
    setChosenFriend?.(id);
    setListFriendsIsOpen?.(false);
  };

  return (
    <View className={`${isForMe && 'flex-col'}`} style={styles.fieldGroup}>
      {!isForMe && (
        <View className="relative">
          <TouchableOpacity
            activeOpacity={0.85}
            className="relative py-3 rounded-xl px-[10px] pr-2 flex-row justify-between items-center"
            style={styles.glassField}
            onPress={() => setListFriendsIsOpen?.(!listFriendsIsOpen)}
          >
            <LinearGradient
              colors={GLASS_FIELD_COLORS}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              locations={[0, 0.5, 1]}
              style={styles.glassOverlay}
            />
            <Text className="text-white font-regular text-[15px]">
              {selectedFriendName}
            </Text>
            <View
            // className={`transform ${listFriendsIsOpen ? 'rotate-180' : ''}`}
            >
              <SearchIcon />
            </View>
          </TouchableOpacity>
          {listFriendsIsOpen && (
            <View className="absolute top-12 left-0 right-0 bg-friendBackground border border-border2Color rounded-lg shadow-lg z-10 h-[160px]">
              {friendsData.length === 0 && !isLoading ? (
                <View className="flex-1 justify-center items-center px-4">
                  <Text className="text-white font-regular text-center">
                    You have no friends yet. Add friends to assign alarms to
                    them.
                  </Text>
                  <TouchableOpacity
                    className="mt-3 border border-border2Color p-3 rounded-lg"
                    onPress={addNewFriends}
                  >
                    <Text className="text-white font-semibold">
                      Add a friend
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={friendsData}
                  renderItem={({ item }) => (
                    <FriendRow
                      id={item.id}
                      name={item.name}
                      onPress={handleFriendSelect}
                    />
                  )}
                  keyExtractor={item => item.name}
                />
              )}
            </View>
          )}
        </View>
      )}
      <View className={`flex-row`} style={styles.fieldRow}>
        {!disableDate && (
          <TouchableOpacity
            activeOpacity={0.85}
            className="relative flex-1 py-3 rounded-xl px-[10px] pr-3 flex-row justify-between items-center"
            style={styles.glassField}
            onPress={showDatePicker}
            disabled={disabled || disableDate}
          >
            <LinearGradient
              colors={GLASS_FIELD_COLORS}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              locations={[0, 0.5, 1]}
              style={styles.glassOverlay}
            />
            <Text className="text-white font-regular text-[15px]">
              {chosenDate ? formatToMonthDay(chosenDate, true) : 'Date'}
            </Text>
            <TablerCalendar />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          className="relative flex-1 py-3 rounded-xl px-[10px] pr-3 flex-row justify-between items-center"
          style={styles.glassField}
          onPress={showTimePicker}
          disabled={disabled}
        >
          <LinearGradient
            colors={GLASS_FIELD_COLORS}
            locations={[0, 0.5, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.glassOverlay}
          />
          <Text className="text-white font-regular text-[15px]">
            {timeLabel}
          </Text>
          <ClockIconSm />
        </TouchableOpacity>
      </View>
      {Platform.OS === 'android' && isDatePickerVisible && (
        <DateTimePicker
          value={chosenDate ? new Date(chosenDate) : new Date()}
          mode="date"
          display="calendar"
          onChange={onChangeAndroid}
        />
      )}
      {Platform.OS === 'ios' && (
        <Modal
          visible={isDatePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={onCancelIOS}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  textColor={'black'}
                  locale="en-US"
                  onChange={(_, d) => {
                    if (d) setTempDate(d);
                  }}
                  style={styles.whiteBackground}
                />
              </View>
              <View style={styles.modalActionRow}>
                <TouchableOpacity onPress={onCancelIOS} activeOpacity={0.8}>
                  <Text className="text-black text-base">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onConfirmIOS} activeOpacity={0.8}>
                  <Text className="text-black text-base">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && isTimePickerVisible && (
        <DateTimePicker
          value={
            (parseTimeToDate(chosenTime) as Date | null) ??
            (chosenTime ? new Date(chosenTime) : new Date())
          }
          mode="time"
          display="clock"
          onChange={onChangeTimeAndroid}
          is24Hour={false}
        />
      )}
      {Platform.OS === 'ios' && (
        <Modal
          visible={isTimePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={onCancelTimeIOS}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display={'spinner'}
                  textColor={'black'}
                  onChange={(_, d) => {
                    if (d) setTempTime(d);
                  }}
                  style={styles.whiteBackground}
                  is24Hour={false}
                  locale="en-US"
                />
              </View>
              <View style={styles.modalActionRow}>
                <TouchableOpacity onPress={onCancelTimeIOS} activeOpacity={0.8}>
                  <Text className="text-black text-base">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirmTimeIOS}
                  activeOpacity={0.8}
                >
                  <Text className="text-black text-base">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldGroup: {
    rowGap: 10,
  },
  fieldRow: {
    columnGap: 10,
  },
  glassField: {
    backgroundColor: 'rgba(162, 24, 133, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '86%',
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  pickerWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  whiteBackground: {
    backgroundColor: 'white',
  },
});
