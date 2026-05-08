import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Alert } from '@utils/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LogoIcon from '../../../assets/svg/LogoIcon.svg';
import {
  CommonActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Chevron from '../../../assets/svg/Chevron.svg';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import { EmailVerificationModal } from '@components/loginScreenComponents/EmailVerificationModal';
import PopupButtonIcon from '../../../assets/svg/PopupButtonIcon.svg';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { LinierButton } from '@components/customComponents/LinierButton';
import { CustomButton } from '@components/customComponents/CustomButton';
import SpotifyBrandIcon from '../../../assets/svg/SpotifyBrandIcon';
import AppleMusicBrandIcon from '../../../assets/svg/AppleMusicBrandIcon';
import YouTubeMusicBrandIcon from '../../../assets/svg/YouTubeMusicBrandIcon';
import { EmailRegisterPayload } from '@appTypes/types';
import { register } from '@api/auth';
import { formatDateDDMMYYYY } from '@utils/time';
import { useDispatch } from 'react-redux';
import { loginUser } from '@store/auth/operations';
import { LoaderModal } from '@components/customComponents/LoaderModal';

export const AddMoreInfoScreen = () => {
  const iconSize = 22;
  const navigation = useNavigation<AuthNavigationProp>();
  const dispatch = useDispatch();
  const route = useRoute();
  const emailRegisterPayload = (
    route.params as { emailRegisterPayload?: EmailRegisterPayload }
  )?.emailRegisterPayload;

  const insets = useSafeAreaInsets();
  const [emailVerificationModal, setEmailVerificationModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [tempDateOfBirth, setTempDateOfBirth] = useState<Date>(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  const openDatePicker = () => {
    setTempDateOfBirth(dateOfBirth ? new Date(dateOfBirth) : new Date());
    setDatePickerVisible(true);
  };

  const onCancelIOS = () => setDatePickerVisible(false);
  const onChangeAndroid = (event: DateTimePickerEvent, date?: Date) => {
    setDatePickerVisible(false);
    if (event.type === 'set' && date) {
      setDateOfBirth(date);
      setError(null);
    }
  };

  const onConfirmIOS = () => {
    setDateOfBirth(tempDateOfBirth);
    setError(null);
    setDatePickerVisible(false);
  };

  const onBackPress = () => {
    navigation.goBack();
  };

  const redirectToLogin = () => {
    try {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'AuthNavigation',
              params: { screen: 'LoginScreen' },
            },
          ],
        }),
      );
    } catch (e) {
      navigation.navigate('AuthNavigation', { screen: 'LoginScreen' });
    }
  };

  const handleVerificationSuccess = () => {
    setEmailVerificationModal(false);
    setTimeout(() => {
      void handleLoginAfterVerification();
    }, 250);
  };

  const handleLoginAfterVerification = async () => {
    if (!emailRegisterPayload?.email || !emailRegisterPayload?.password) {
      redirectToLogin();
      return;
    }

    setIsLoggingIn(true);
    try {
      await dispatch(
        loginUser({
          email: emailRegisterPayload.email,
          password: emailRegisterPayload.password,
        }) as any,
      );
    } catch (e) {
      Alert.alert(
        'Login failed',
        'Your account has been verified. Please log in to continue.',
        [
          {
            text: 'Go to login',
            onPress: redirectToLogin,
          },
        ],
        { cancelable: false },
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const media = [
    {
      name: 'Spotify',
      icon: <SpotifyBrandIcon width={iconSize} height={iconSize} />,
      title: 'SPOTIFY',
    },
    {
      name: 'Apple music',
      icon: <AppleMusicBrandIcon width={iconSize} height={iconSize} />,
      title: 'APPLE_MUSIC',
    },
    {
      name: 'Youtube music',
      icon: <YouTubeMusicBrandIcon width={iconSize} height={iconSize} />,
      title: 'YOUTUBE_MUSIC',
    },
  ];

  const handleCreateAccountPress = async () => {
    if (emailRegisterPayload) {
      const payload: EmailRegisterPayload = {
        name: emailRegisterPayload?.name,
        email: emailRegisterPayload?.email,
        password: emailRegisterPayload?.password,
        confirmPassword: emailRegisterPayload?.confirmPassword,
        birthDate: dateOfBirth ? dateOfBirth.toISOString() : undefined,
        preferredMusicPlayer: selectedMedia || undefined,
      };

      const data: any = await register(payload);
      if (data.needsVerification) setEmailVerificationModal(true);
    }
  };

  return (
    <TouchableWithoutFeedback
      onPress={() => Keyboard.dismiss()}
      accessible={false}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {isLoggingIn && (
          <LoaderModal isVisible={isLoggingIn} text="Logging in..." />
        )}
        <View
          className={`relative h-11 w-full flex-row items-center justify-between`}
        >
          <TouchableOpacity
            onPress={onBackPress}
            className="absolute z-10 left-2 flex-row gap-2 items-center"
          >
            <Chevron />

            <Text className="text-white text-lg font-regular">Back</Text>
          </TouchableOpacity>

          <Text className="text-white text-lg font-semibold w-full text-center">
            Sign up
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
          <View className="flex-1 px-4">
            <View className="ml-auto mr-auto mb-3">
              <LogoIcon />
            </View>
            <View className="flex-1 justify-between mb-8">
              <View className={`w-full`}>
                <TouchableOpacity
                  activeOpacity={1}
                  className="absolute right-4 top-[12px] z-30"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <PopupButtonIcon />
                </TouchableOpacity>

                <View className="flex-row  absolute z-10 left-4 top-3 ">
                  <Text className={`text-white text-xs font-regular mr-2`}>
                    Your birthday
                  </Text>
                </View>
                <View className={`relative`}>
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0.06)',
                      'rgba(255,255,255,0.04)',
                    ]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      borderRadius: 12,
                    }}
                    className="h-full"
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={openDatePicker}
                    className={`w-full rounded-2xl pt-8 pb-3 pl-4 pr-9 ${
                      error ? 'border border-redColor' : ''
                    }`}
                  >
                    <Text
                      className={`text-[16px] font-regular ${
                        dateOfBirth ? 'text-white' : 'text-[#ccc]'
                      }`}
                    >
                      {dateOfBirth
                        ? formatDateDDMMYYYY(dateOfBirth)
                        : 'DD/MM/YYYY'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {error && <Text className="text-red-500 mt-2">{error}</Text>}
                <Text className="text-white font-regular text-[18px] mt-6">
                  Preferred music player
                </Text>
                <View>
                  {media.map((item, index) => {
                    const isSelected = selectedMedia === item.title;
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSelectedMedia(item.title)}
                        activeOpacity={0.8}
                        className="flex-row items-center justify-start mt-5"
                      >
                        <View
                          className="w-[21] h-[21] rounded-full mr-[10px] items-center justify-center"
                          style={{
                            borderWidth: 2,
                            borderColor: 'rgba(255,255,255,0.45)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected ? (
                            <View
                              style={{
                                width: 11,
                                height: 11,
                                borderRadius: 14,
                                backgroundColor: '#00C853',
                              }}
                            />
                          ) : null}
                        </View>

                        <View
                          style={{
                            width: iconSize,
                            height: iconSize,
                            marginRight: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {item.icon}
                        </View>
                        <Text className="text-white font-regular text-base">
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View>
                <LinierButton
                  title={'Get started'}
                  onPress={() => {
                    if (!dateOfBirth) {
                      setError('Please choose your birthday');
                      return;
                    }
                    handleCreateAccountPress();
                  }}
                  textStyles="text-white font-semibold text-lg"
                  borderColor={true}
                />
                <CustomButton
                  title={'Skip'}
                  style="border-white mt-[10px]"
                  textStyle="text-white font-semibold text-lg"
                  onPress={() => {
                    handleCreateAccountPress();
                  }}
                />
              </View>
            </View>
            {Platform.OS === 'android' && isDatePickerVisible && (
              <DateTimePicker
                value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
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
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: '86%',
                      borderRadius: 16,
                      backgroundColor: 'white',
                      padding: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.28)',
                    }}
                  >
                    <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                      <DateTimePicker
                        value={tempDateOfBirth}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        locale="en-US"
                        onChange={(_, d) => {
                          if (d) setTempDateOfBirth(d);
                        }}
                        style={{ backgroundColor: 'white' }}
                        textColor={'black'}
                      />
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 12,
                      }}
                    >
                      <TouchableOpacity
                        onPress={onCancelIOS}
                        activeOpacity={0.8}
                      >
                        <Text className="text-black text-base">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={onConfirmIOS}
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
        </ScrollView>
        <EmailVerificationModal
          emailVerificationModal={emailVerificationModal}
          setEmailVerificationModal={setEmailVerificationModal}
          email={emailRegisterPayload?.email || ''}
          onSuccess={handleVerificationSuccess}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};
