import { Text, View, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type SwitchProps = {
  forMe: boolean;
  onChange?: (val: boolean) => void;
  disabled?: boolean;
};

export const Switch = ({ forMe, onChange, disabled }: SwitchProps) => {
  const activate = (val: boolean) => {
    if (val !== forMe) onChange?.(val);
  };

  return (
    <View className="w-full my-[10px] max-h-10">
      <View
        style={{
          borderColor: 'rgba(255,255,255,0.28)',
          borderWidth: 1,
          borderRadius: 12,
        }}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0.04)',
            'rgba(255,255,255,0.08)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            borderRadius: 12,
          }}
        />
        <View className="flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => activate(true)}
            style={{ flex: 1, borderRadius: 12 }}
            disabled={disabled}
          >
            {forMe ? (
              <LinearGradient
                colors={['#540743', '#B51D96']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                  height: '100%',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.95)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  elevation: 8,
                }}
              >
                <Text className="text-white font-semibold text-[13px]">
                  For Myself
                </Text>
              </LinearGradient>
            ) : (
              <View
                style={{
                  height: '100%',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text className="text-white font-semibold text-[13px]">
                  For Myself
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Right segment: For Friend */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => activate(false)}
            style={{ flex: 1, borderRadius: 12 }}
            disabled={disabled}
          >
            {!forMe ? (
              <LinearGradient
                colors={['#540743', '#B51D96']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                  height: '100%',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#fff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Text className="text-white font-semibold text-[13px]">
                  For a Friend
                </Text>
              </LinearGradient>
            ) : (
              <View
                style={{
                  height: '100%',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text className="text-white font-semibold text-[13px]">
                  For a Friend
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
