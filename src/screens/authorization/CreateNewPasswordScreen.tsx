import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import { Alert } from '@utils/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomInput } from '@components/customComponents/CustomInput';
import Hide from '../../../assets/svg/Hide.svg';
import EyeIcon from '@assets/svg/EyeIcon.svg';
import { LinierButton } from '@components/customComponents/LinierButton';
import { Formik } from 'formik';
import { validationSchemaPassword } from '@utils/validationSchemas';
import LogoIcon from '../../../assets/svg/LogoIcon.svg';
import { AuthNavigationProp } from '@appTypes/navigationTypes';
import { useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardShiftView } from '@components/KeyboardShiftView';
import { resetPassword } from '@api/auth';

const CreateNewPasswordScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = route.params?.token ?? null;

  const handleSignInPress = () => {
    navigation.navigate('AuthNavigation', { screen: 'LoginScreen' });
  };

  const handleChangePassword = async ({
    password,
    confirmPassword,
  }: {
    password: string;
    confirmPassword: string;
  }) => {
    if (!token) {
      setError('Open the password reset link from your email to continue.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await resetPassword({
        token,
        password,
        confirmPassword,
      });

      Alert.alert('Success', 'Your password changed.', [
        {
          text: 'Ok',
          style: 'cancel',
          onPress: () => {
            navigation.navigate('AuthNavigation', {
              screen: 'LoginScreen',
            });
          },
        },
      ]);
    } catch (err: any) {
      const fieldErrors = err?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        const first = Object.values(fieldErrors)[0];
        setError(String(first ?? 'Failed to reset password'));
      } else {
        setError(
          err?.response?.data?.message ??
            err?.message ??
            'Failed to reset password',
        );
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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <KeyboardShiftView
          className="flex-1 px-4"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-1 justify-center ml-auto mr-auto">
            <View className="max-h-[112px] h-full w-full" />
            <LogoIcon />
            <View className="max-h-[130px] h-full w-full" />
          </View>
          <View className="mb-8">
            <Text className="text-center font-semibold text-lg mb-8 text-white ">
              Create new password
            </Text>
            <Formik
              initialValues={{ password: '', confirmPassword: '' }}
              validationSchema={validationSchemaPassword}
              onSubmit={values => {
                handleChangePassword(values);
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
                    disableAutofill
                  />
                  <CustomInput
                    styles="mb-[38px]"
                    textPlaceholder="Confirm password"
                    placeholder=""
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
                    error={touched.confirmPassword && !!errors.confirmPassword}
                    errorMessage={
                      touched.confirmPassword && errors.confirmPassword
                    }
                    secureTextEntry={!!confirmPasswordVisible}
                    disableAutofill
                  />
                  <LinierButton
                    title={'Change password'}
                    loading={loading}
                    disabled={loading}
                    onPress={() => handleSubmit()}
                  />
                  {error && (
                    <Text className="text-red-500 text-center mt-3">
                      {error}
                    </Text>
                  )}
                </View>
              )}
            </Formik>
            <View className="flex-row justify-center mt-[26px]">
              <Text className="text-center text-white  font-regular text-base">
                Remember your password?{'  '}
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={handleSignInPress}>
                <Text
                  className="text-base font-regular"
                  style={{ color: 'rgba(255, 74, 218, 1)' }}
                >
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardShiftView>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

export default CreateNewPasswordScreen;
