import React, { memo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

const getWakeMethodTitle = (method: any) => {
  const type =
    typeof method === 'string'
      ? method.toUpperCase()
      : String(method?.type || '').toUpperCase();

  switch (type) {
    case 'VOICE':
      return 'Voice';
    case 'VIDEO':
      return 'Video';
    case 'SONG':
      return 'Song';
    case 'PUZZLE':
      return 'Puzzle';
    default:
      return 'Wake Method';
  }
};

const LoadingWakeMethodCard = memo(
  ({ title, index }: { title: string; index: number }) => (
    <View
      className="rounded-2xl border mb-[10px]"
      style={{
        backgroundColor: 'rgba(72, 23, 96, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        boxShadow:
          '0 1px 30px 0 rgba(69, 42, 124, 0.1), 0 4px 4px 0 rgba(0, 0, 0, 0.25)',
      }}
    >
      <View className="p-5 flex-row justify-between items-center w-full">
        <View className="flex-row items-center gap-3">
          <Text className="rounded-full bg-white w-[30px] h-[30px] text-center font-bold text-lg">
            {index + 1}
          </Text>
          <Text className="text-white font-semibold text-[17px]">{title}</Text>
        </View>
        <ActivityIndicator size="small" color="#FFFFFF" />
      </View>
      <View className="px-5 pb-5">
        <Text className="text-white/70 text-sm">Loading wake method...</Text>
      </View>
    </View>
  ),
);

export const LoadingWakeMethodsList = memo(
  ({ wakeMethods }: { wakeMethods: any[] }) => (
    <>
      {wakeMethods.map((method, idx) => (
        <LoadingWakeMethodCard
          key={`loading-method-${idx}-${getWakeMethodTitle(method)}`}
          title={getWakeMethodTitle(method)}
          index={idx}
        />
      ))}
    </>
  ),
);
