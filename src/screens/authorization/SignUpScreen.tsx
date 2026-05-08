import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Alert } from '@utils/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { googleSignIn, appleSignIn } from '../../api/auth';
import {
  GoogleSignin,
  isCancelledResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { CustomInput } from '@components/customComponents/CustomInput';
import Check from '../../../assets/svg/Check.svg';
import Hide from '../../../assets/svg/Hide.svg';
import EyeIcon from '@assets/svg/EyeIcon.svg';
import { LinierButton } from '@components/customComponents/LinierButton';
import { Formik } from 'formik';
import { validationSchemaSignUp } from '@utils/validationSchemas';
import LogoIcon from '../../../assets/svg/LogoIcon.svg';
import GoogleIcon from '../../../assets/svg/GoogleIcon.svg';
import AppleIcon from '../../../assets/svg/AppleIcon.svg';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import TikTokBrandIcon from '../../../assets/svg/TikTokBrandIcon';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import { LoaderModal } from '@components/customComponents/LoaderModal';
import { EmailRegisterPayload } from '@appTypes/types';
import { useTikTokAuth } from '@hooks/useTikTokAuth';
import { KeyboardShiftView } from '@components/KeyboardShiftView';
import {
  getAppleSignInErrorMessage,
  isAppleSignInCancelledError,
} from '@utils/appleAuthErrors';
import { configureGoogleSignin } from '@services/auth/googleSession';

export const SignUpScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(true);
  const { onSignInWithTikTok } = useTikTokAuth({ setLoading, setError });
  const onSignInWithSDK = async () => {
    setError(null);
    setLoading(true);
    try {
      configureGoogleSignin();

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const userInfo = await GoogleSignin.signIn();
      if (isCancelledResponse(userInfo)) {
        return;
      }
      console.log(userInfo);

      const idTokenFromSDK = userInfo?.data?.idToken;
      if (!idTokenFromSDK)
        throw new Error('No idToken returned from Google SDK');

      await googleSignIn(idTokenFromSDK);
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      if (e && e.code) {
        setError(e.message || String(e));
      } else {
        setError(e?.message ?? 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSignInWithApple = async () => {
    setError(null);
    setLoading(true);
    try {
      if (Platform.OS !== 'ios') {
        Alert.alert('Apple Sign-In is only available on iOS');
        return;
      }

      const appleResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const identityToken = appleResponse.identityToken;
      if (!identityToken)
        throw new Error('Apple Sign-In failed: no identity token');

      await appleSignIn(identityToken as string);
    } catch (e: any) {
      console.log('Apple sign-in error', e);
      if (isAppleSignInCancelledError(e)) {
        return;
      }
      setError(getAppleSignInErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSignInPress = () => {
    navigation.navigate('AuthNavigation', { screen: 'LoginScreen' });
  };

  const handleSignUpPress = (values: EmailRegisterPayload) => {
    navigation.navigate('AuthNavigation', {
      screen: 'AddMoreInfoScreen',
      params: { emailRegisterPayload: values },
    });
  };

  return (
    <TouchableWithoutFeedback
      onPress={() => Keyboard.dismiss()}
      accessible={false}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View
          className={`relative h-11 w-full flex-row items-center justify-between`}
        >
          <Text className="text-white text-lg font-semibold w-full text-center">
            Sign up
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
          {loading && <LoaderModal isVisible={loading} />}

          <KeyboardShiftView className="flex-1 px-4">
            <View className="flex-1 justify-center ml-auto mr-auto">
              <View className="max-h-9 h-full w-full" />
              <LogoIcon />
              <View className="max-h-9 h-full w-full" />
            </View>
            <View className="flex-1 justify-between mb-8">
              <Formik
                initialValues={{
                  name: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                  acceptConditions: false,
                }}
                validationSchema={validationSchemaSignUp}
                onSubmit={values => {
                  // setEmailVerificationModal(true);

                  handleSignUpPress(values);
                  console.log(values);
                }}
              >
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  setFieldValue,
                  values,
                  errors,
                  touched,
                }) => (
                  <View className="w-full">
                    <CustomInput
                      styles="mb-3"
                      textPlaceholder="Name"
                      placeholder=""
                      icon={
                        touched.name && !errors.name && values.name ? (
                          <Check width={12} height={12} />
                        ) : null
                      }
                      autoCapitalize="words"
                      value={values.name}
                      onChangeText={handleChange('name')}
                      onBlurHandler={() => handleBlur('name')}
                      error={touched.name && !!errors.name}
                      errorMessage={touched.name && errors.name}
                    />
                    <CustomInput
                      styles="mb-3"
                      textPlaceholder="Email or Phone"
                      placeholder=""
                      icon={
                        touched.email && !errors.email && values.email ? (
                          <Check width={12} height={12} />
                        ) : null
                      }
                      autoCapitalize="none"
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlurHandler={() => handleBlur('email')}
                      error={touched.email && !!errors.email}
                      errorMessage={touched.email && errors.email}
                    />
                    <CustomInput
                      styles="mb-3"
                      textPlaceholder="Password"
                      placeholder=""
                      icon={
                        touched.password &&
                        !errors.password &&
                        values.password ? (
                          <Check width={12} height={12} />
                        ) : null
                      }
                      passwordIcon={
                        <TouchableOpacity
                          onPress={() => setPasswordVisible(!passwordVisible)}
                        >
                          {passwordVisible ? <Hide /> : <EyeIcon />}
                        </TouchableOpacity>
                      }
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlurHandler={() => handleBlur('password')}
                      error={touched.password && !!errors.password}
                      errorMessage={touched.password && errors.password}
                      secureTextEntry={!!passwordVisible}
                      disableAutofill
                    />
                    <CustomInput
                      styles="mb-5"
                      textPlaceholder="Confirm password"
                      placeholder=""
                      icon={
                        touched.confirmPassword &&
                        !errors.confirmPassword &&
                        values.confirmPassword ? (
                          <Check width={12} height={12} />
                        ) : null
                      }
                      passwordIcon={
                        <TouchableOpacity
                          onPress={() =>
                            setConfirmPasswordVisible(!confirmPasswordVisible)
                          }
                        >
                          {confirmPasswordVisible ? <Hide /> : <EyeIcon />}
                        </TouchableOpacity>
                      }
                      value={values.confirmPassword}
                      onChangeText={handleChange('confirmPassword')}
                      onBlurHandler={() => handleBlur('confirmPassword')}
                      error={
                        touched.confirmPassword && !!errors.confirmPassword
                      }
                      errorMessage={
                        touched.confirmPassword && errors.confirmPassword
                      }
                      secureTextEntry={!!confirmPasswordVisible}
                      disableAutofill
                    />
                    <View className="mb-5">
                      <TouchableOpacity
                        onPress={() =>
                          setFieldValue(
                            'acceptConditions',
                            !values.acceptConditions,
                          )
                        }
                        activeOpacity={0.7}
                        className="flex-row items-start"
                      >
                        <View
                          className={`w-[30px] h-[30px] rounded-lg mr-3 justify-center items-center ${
                            touched.acceptConditions && errors.acceptConditions
                              ? 'border-redColor border'
                              : 'border border-white'
                          }`}
                        >
                          {values.acceptConditions ? (
                            <Check width={16} height={16} />
                          ) : null}
                        </View>

                        <View className="flex-1 pt-1">
                          <Text className="text-pinkColor font-regular text-[15px] leading-5">
                            I accept{' '}
                            <Text className="text-linksColor underline">
                              Terms of Conditions
                            </Text>{' '}
                            and{' '}
                            <Text className="text-linksColor underline">
                              Privacy Policy
                            </Text>
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {touched.acceptConditions && errors.acceptConditions && (
                        <Text className="text-red-500 text-xs ml-1 mt-1">
                          {errors.acceptConditions as string}
                        </Text>
                      )}
                    </View>

                    <LinierButton
                      title={loading ? 'Loading...' : 'Sign Up'}
                      onPress={() => handleSubmit()}
                      borderColor={true}
                    />
                    {error && (
                      <Text className="text-red-500 text-center mt-2">
                        {error}
                      </Text>
                    )}
                  </View>
                )}
              </Formik>

              <View>
                <View className="flex-row items-center mb-6 ">
                  <View className="border-b border-white10Color flex-1" />
                  <Text className="text-center text-white6Color text-base font-semibold mx-4">
                    or
                  </Text>
                  <View className="border-b border-white10Color flex-1" />
                </View>

                <View className="flex-row justify-between">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onSignInWithSDK}
                    disabled={loading}
                    className="relative flex-1 justify-center py-[14px] items-center rounded-2xl border border-borderColor"
                    style={{ backgroundColor: 'rgba(162, 24, 133, 0.2)' }}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0.08)',
                        'rgba(255,255,255,0.04)',
                        'rgba(255,255,255,0.08)',
                      ]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      locations={[0, 0.5, 1]}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        borderRadius: 12,
                      }}
                      className="h-[64px]"
                    />
                    <GoogleIcon />
                  </TouchableOpacity>
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={onSignInWithApple}
                      disabled={loading}
                      className="relative flex-1 ml-[10px] justify-center py-[14px] items-center rounded-2xl border border-borderColor"
                      style={{ backgroundColor: 'rgba(162, 24, 133, 0.2)' }}
                    >
                      <LinearGradient
                        colors={[
                          'rgba(255,255,255,0.08)',
                          'rgba(255,255,255,0.04)',
                          'rgba(255,255,255,0.08)',
                        ]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        locations={[0, 0.5, 1]}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          borderRadius: 12,
                        }}
                        className="h-[64px]"
                      />
                      <AppleIcon />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onSignInWithTikTok}
                    disabled={loading}
                    className="relative flex-1 ml-[10px] justify-center py-[14px] items-center rounded-2xl border border-borderColor"
                    style={{ backgroundColor: 'rgba(162, 24, 133, 0.2)' }}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0.08)',
                        'rgba(255,255,255,0.04)',
                        'rgba(255,255,255,0.08)',
                      ]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      locations={[0, 0.5, 1]}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        borderRadius: 12,
                      }}
                      className="h-[64px]"
                    />
                    <TikTokBrandIcon width={32} height={32} />
                  </TouchableOpacity>
                </View>
                <View className="flex-row justify-center mt-[26px]">
                  <Text className="text-center text-white  font-regular text-base">
                    Already have an account?{'  '}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleSignInPress}
                  >
                    <Text
                      className="text-base font-regular"
                      style={{ color: 'rgba(255, 74, 218, 1)' }}
                    >
                      Sign in
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardShiftView>
        </ScrollView>
        {/* <EmailVerificationModal
          emailVerificationModal={emailVerificationModal}
          setEmailVerificationModal={setEmailVerificationModal}
        /> */}
      </View>
    </TouchableWithoutFeedback>
  );
};
