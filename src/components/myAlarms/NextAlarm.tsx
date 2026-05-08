import { Text, View } from 'react-native';
import { CircularProgress } from './CircularProgress';
import { Alarm } from '@appTypes/types';
import { formatTo12Hour } from '../../utils/time';
import BigClock from '../../../assets/svg/BigClock.svg';

export const NextAlarm = ({ nextAlarm }: { nextAlarm?: Alarm | null }) => {
  // if (nextAlarm?.date === '' || !nextAlarm) {
  //   const now = new Date();
  //   const now24 = `${String(now.getHours()).padStart(2, '0')}:${String(
  //     now.getMinutes(),
  //   ).padStart(2, '0')}`;
  //   const timeLabelNow = formatTo12Hour(now24);
  //   const dateLabelNow = `${now.toLocaleString('en-US', {
  //     month: 'short',
  //   })}, ${now.getDate()}`;

  //   return (
  //     <View className="my-[30px]">
  //       <Text className="text-white text-xl font-semibold mb-3 text-center">
  //         Next Alarm
  //       </Text>
  //       <CircularProgress
  //         nextAlarm={now}
  //         timeLabel={timeLabelNow}
  //         dateLabel={dateLabelNow}
  //         progressLabel="----"
  //       />
  //     </View>
  //   );
  // }

  const dt = new Date(`${nextAlarm?.date}T${nextAlarm?.time}`);
  const timeLabel = formatTo12Hour(nextAlarm?.time);
  const dateLabel = `${dt.toLocaleString('en-US', {
    month: 'short',
  })}, ${dt.getDate()}`;

  const more24Hours = dt.getTime() - new Date().getTime() > 24 * 60 * 60 * 1000;

  return (
    <View className="my-[30px]">
      {more24Hours || nextAlarm?.date === '' || !nextAlarm ? null : (
        <Text className="text-white text-xl font-semibold mb-3 text-center">
          Next Alarm
        </Text>
      )}
      {more24Hours || nextAlarm?.date === '' || !nextAlarm ? (
        <View className="items-center mt-14">
          <BigClock />
          <Text className="text-white text-base font-regular text-center max-w-[250px] mx-auto mt-14">
            You don’t have any upcoming alarms in the next 24 hours
          </Text>
        </View>
      ) : (
        <CircularProgress
          nextAlarm={dt}
          timeLabel={timeLabel}
          dateLabel={dateLabel}
          progressLabel=""
        />
      )}
    </View>
  );
};
