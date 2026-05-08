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
import { validationSchemaEmail } from '@utils/validationSchemas';
import LogoIcon from '../../../assets/svg/LogoIcon.svg';
import GoogleIcon from '../../../assets/svg/GoogleIcon.svg';
import AppleIcon from '../../../assets/svg/AppleIcon.svg';
import { ForgotPasswordModal } from '@components/loginScreenComponents/ForgotPasswordModal';
import LinearGradient from 'react-native-linear-gradient';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import { useNavigation } from '@react-navigation/native';
import TikTokBrandIcon from '../../../assets/svg/TikTokBrandIcon';
import { LoaderModal } from '@components/LoaderModal';
import { useDispatch } from 'react-redux';
import { loginUser } from '@store/auth/operations';
import { useTikTokAuth } from '@hooks/useTikTokAuth';
import { KeyboardShiftView } from '@components/KeyboardShiftView';
import {
  getAppleSignInErrorMessage,
  isAppleSignInCancelledError,
} from '@utils/appleAuthErrors';
import { configureGoogleSignin } from '@services/auth/googleSession';

const LoginScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const dispatch = useDispatch();

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);

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

  const handleSignUpPress = () => {
    navigation.navigate('AuthNavigation', { screen: 'SignUpScreen' });
  };

  const { onSignInWithTikTok } = useTikTokAuth({ setLoading, setError });

  const onLogin = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setError(null);
    setLoading(true);
    try {
      const result = await dispatch(loginUser({ email, password }) as any);
      if (result?.needsVerification) {
        Alert.alert(
          'Verification Required',
          'Please verify your email before logging in.',
        );
      }
    } catch (err: any) {
      console.log('login caught error', err?.response ?? err);
      // Prefer structured field errors returned from API
      const fieldErrors = err?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        // Show first field error to the user
        const first = Object.values(fieldErrors)[0];
        setError(String(first ?? 'Login failed'));
      } else {
        const serverMessage = err?.response?.data?.message;
        const message = serverMessage || err?.message || 'Login failed';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback
      onPress={() => Keyboard.dismiss()}
      accessible={false}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading && <LoaderModal isVisible={loading} />}
        <KeyboardShiftView
          className="flex-1 px-4"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-1 justify-center ml-auto mr-auto">
            <View className="max-h-[112px] h-full w-full" />
            <LogoIcon />
            <View className="max-h-[130px] h-full w-full" />
          </View>
          <View className="justify-between mb-8">
            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={validationSchemaEmail}
              onSubmit={values => {
                onLogin(values);
                console.log(values);
              }}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
              }) => (
                <View className="w-full">
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
                    styles="mb-[38px]"
                    textPlaceholder="Password"
                    placeholder=""
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
                  />
                  <LinierButton
                    title="Log in"
                    onPress={() => handleSubmit()}
                    loading={loading}
                    disabled={loading}
                  />
                  {error && (
                    <Text className="text-red-500 text-center mt-2">
                      {error}
                    </Text>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setForgotPasswordModal(!forgotPasswordModal)}
                  >
                    <Text
                      className="text-center my-4 text-base font-regular"
                      style={{ color: 'rgba(255, 74, 218, 1)' }}
                    >
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
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
                  Don’t have an account?{'  '}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSignUpPress}
                >
                  <Text
                    className="text-base font-regular"
                    style={{ color: 'rgba(255, 74, 218, 1)' }}
                  >
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardShiftView>
        <ForgotPasswordModal
          forgotPasswordModal={forgotPasswordModal}
          setForgotPasswordModal={setForgotPasswordModal}
        />
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

export default LoginScreen;
