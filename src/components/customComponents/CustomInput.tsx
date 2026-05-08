import {
  Platform,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ReturnKeyTypeOptions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const INPUT_RADIUS = 16;

export const CustomInput = ({
  styles,
  textPlaceholder,
  placeholder,
  icon,
  passwordIcon,
  onPress,
  autoCapitalize,
  value,
  onChangeText,
  onBlurHandler,
  error,
  errorMessage,
  secureTextEntry,
  textPlaceholderStyles,
  textInputStyles,
  backgroundInput,
  ref,
  isEditable,
  onSubmitEditing,
  returnKeyType,
  blurOnSubmit,
  disableAutofill,
}: {
  styles?: string;
  textPlaceholder?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  passwordIcon?: React.ReactNode;
  onPress?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  value?: string;
  onChangeText?: (text: string) => void;
  onBlurHandler?: () => void;
  error?: boolean;
  errorMessage?: string | undefined | boolean;
  secureTextEntry?: boolean;
  textPlaceholderStyles?: string;
  textInputStyles?: string;
  backgroundInput?: string;
  ref?: React.Ref<TextInput>;
  isEditable?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: ReturnKeyTypeOptions;
  blurOnSubmit?: boolean;
  disableAutofill?: boolean;
}) => {
  const autoComplete: TextInputProps['autoComplete'] = disableAutofill
    ? 'off'
    : undefined;
  const textContentType: TextInputProps['textContentType'] = disableAutofill
    ? Platform.OS === 'ios'
      ? 'oneTimeCode'
      : 'none'
    : undefined;

  return (
    <View className={`w-full ${styles} `}>
      {passwordIcon && (
        <TouchableOpacity
          activeOpacity={onPress ? 0.7 : 1}
          className="absolute right-4 top-[22px] z-30"
          onPress={onPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {passwordIcon}
        </TouchableOpacity>
      )}
      <View className="flex-row  absolute z-10 left-4 top-3 ">
        <Text
          className={`text-white text-xs font-regular ${textPlaceholderStyles} mr-2`}
        >
          {textPlaceholder}
        </Text>
        {icon && icon}
      </View>
      <View
        className={`relative ${
          error && errorMessage && ' border border-redColor rounded-2xl'
        }`}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            borderRadius: INPUT_RADIUS,
          }}
          className="h-full"
        />
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlurHandler}
          className={`w-full rounded-2xl text-[16px] font-regular pt-8 pb-3 pl-4 pr-12 text-white ${textInputStyles}`}
          style={{
            borderRadius: INPUT_RADIUS,
            backgroundColor: backgroundInput || 'rgba(162, 24, 133, 0.2)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 0.5,
          }}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.2)"
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          editable={isEditable}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          autoComplete={autoComplete}
          textContentType={textContentType}
          importantForAutofill={disableAutofill ? 'no' : 'auto'}
          autoCorrect={disableAutofill ? false : undefined}
        />
      </View>
      {error && errorMessage && (
        <Text className="text-red-500 text-xs font-regular ml-2 mt-1">
          {errorMessage}
        </Text>
      )}
    </View>
  );
};
