import { ActivityIndicator, Text, View } from 'react-native';

type Props = {
  mode?: 'loading' | 'error';
};

const PlaceholderCard = ({ title }: { title: string }) => (
  <View
    className="w-full rounded-2xl border px-5 py-5 mb-[10px]"
    style={{
      backgroundColor: 'rgba(72, 23, 96, 0.2)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
    }}
  >
    <View className="flex-row items-center justify-between mb-5">
      <Text className="text-white font-semibold text-[17px]">{title}</Text>
    </View>
    <View className="w-full h-14 rounded-2xl bg-white/10 mb-3" />
  </View>
);

export const MyAlarmsInitialState = ({ mode = 'loading' }: Props) => {
  const isError = mode === 'error';

  return (
    <View className="flex-1 w-full px-4 pt-4 pb-10">
      <View
        className="rounded-2xl border px-6 py-6 mb-4 items-center"
        style={{
          backgroundColor: 'rgba(72, 23, 96, 0.24)',
          borderColor: 'rgba(255, 255, 255, 0.25)',
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text className="text-white text-lg font-semibold mt-4">
          {isError ? 'Unable to load alarms' : 'Loading your alarms'}
        </Text>
        <Text className="text-white/70 text-center text-sm mt-2">
          {isError
            ? 'Pull to refresh or try again in a moment.'
            : 'Restoring your upcoming, past, and sent alarms.'}
        </Text>
      </View>

      <PlaceholderCard title="Upcoming Alarms" />
      <PlaceholderCard title="Past Alarms" />
      <PlaceholderCard title="Sent Alarms" />
    </View>
  );
};
