import React, { ReactNode, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const AlarmsContainer = ({
  onExpand,
  onToggleChange,
  children,
  title,
  open = false,
  length,
}: {
  onExpand?: () => void;
  onToggleChange?: (isOpen: boolean) => void;
  children: ReactNode;
  title: string;
  open?: boolean;
  length?: number;
}) => {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleToggle = () => {
    const nextOpen = !isOpen;
    if (nextOpen) {
      onExpand?.();
    }
    setIsOpen(nextOpen);
    onToggleChange?.(nextOpen);
  };

  const sharedStyle = {
    boxShadow: '0 1px 30px 0 rgba(69, 42, 124, 0.1), 0 4px 4px 0 rgba(0, 0, 0, 0.25)',
  } as const;

  const innerContent = (
    <>
      <TouchableOpacity
        onPress={handleToggle}
        activeOpacity={0.7}
        className="p-5 flex-row justify-between items-center w-full"
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-white font-semibold text-[17px]">{title}</Text>
          {length && (
            <View className="rounded-full bg-white w-6 h-6 justify-center items-center">
              <Text className="text-sm font-semibold text-[#A21885]">
                {length}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-white text-[15px] font-regular">
          {isOpen ? 'Hide' : 'Show'}
        </Text>
      </TouchableOpacity>
      {isOpen ? <View className="px-4">{children}</View> : null}
    </>
  );

  if (isOpen) {
    return (
      <View
        className="rounded-2xl border mb-[10px]"
        style={[sharedStyle, { backgroundColor: 'rgba(72, 23, 96, 0.2)', borderColor: 'rgba(255, 255, 255, 0.2)' }]}
      >
        {innerContent}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#540743', '#B51D96']}
      className="rounded-2xl border mb-[10px]"
      style={[sharedStyle, { borderColor: 'white' }]}
    >
      {innerContent}
    </LinearGradient>
  );
};
