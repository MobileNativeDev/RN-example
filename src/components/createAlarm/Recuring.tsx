import { Text, View, TouchableOpacity } from 'react-native';
import ToggleSwitch from './ToggleSwitch';
import { useState, useEffect } from 'react';
import LinearGradient from 'react-native-linear-gradient';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export const Recurring = ({
  recurring,
  setRecurring,
  selectedDays,
  onChangeDays,
  disabled,
}: {
  recurring: boolean;
  setRecurring: (value: boolean) => void;
  selectedDays?: string[];
  onChangeDays?: (days: string[]) => void;
  disabled?: boolean;
}) => {
  const [days, setDays] = useState<string[]>(selectedDays ?? []);

  useEffect(() => {
    setDays(selectedDays ?? []);
  }, [selectedDays]);

  useEffect(() => {
    if (onChangeDays) onChangeDays(days);
  }, [days, onChangeDays]);

  const toggleDay = (d: string) => {
    setDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d],
    );
  };

  const handleRecurringChange = (value: boolean) => {
    if (value && days.length === 0) {
      const today = DAYS[new Date().getDay()];
      if (today) {
        setDays([today]);
      }
    }

    setRecurring(value);
  };

  return (
    <View className="pt-6 mt-6 border-t border-border2Color">
      <View className="flex-row items-center justify-between">
        <Text className="text-white font-semibold text-[17px]">Recurring</Text>
        <ToggleSwitch
          value={recurring}
          onChange={handleRecurringChange}
          disabled={disabled}
        />
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        {recurring &&
          DAYS.map((day, index) => {
            const active = days.includes(day);
            return (
              <LinearGradient
                key={index}
                colors={
                  active
                    ? ['#b51d96', '#540743']
                    : ['transparent', 'transparent']
                }
                className={`rounded-full`}
              >
                <TouchableOpacity
                  onPress={() => toggleDay(day)}
                  disabled={disabled}
                  activeOpacity={0.8}
                  className={`px-[8px] py-1 rounded-full ${
                    active ? ' border border-white' : 'border-none'
                  }`}
                >
                  <Text className="text-white font-semibold text-[13px]">
                    {day}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            );
          })}
      </View>
    </View>
  );
};
