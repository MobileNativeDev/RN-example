import { useRef } from 'react';
import { CustomBottomModal } from '@components/customComponents/CustomBottomModal';
import { CustomInput } from '@components/customComponents/CustomInput';
import { LinierButton } from '@components/customComponents/LinierButton';
import { validationSchemaEmailOnly } from '@utils/validationSchemas';
import { Formik } from 'formik';
import { Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import Check from '../../../assets/svg/Check.svg';
import { forgotPassword } from '@api/auth';
import { Alert } from '@utils/alert';

type ForgotPasswordResponse = {
  success?: boolean;
};

export const ForgotPasswordModal = ({
  forgotPasswordModal,
  setForgotPasswordModal,
}: {
  forgotPasswordModal: boolean;
  setForgotPasswordModal: (boolean: boolean) => void;
}) => {
  const pendingAlertRef = useRef<null | (() => void)>(null);

  const closeModalAndShowAlert = (showAlert: () => void) => {
    pendingAlertRef.current = showAlert;
    setForgotPasswordModal(false);
  };

  const openEmailApp = async () => {
    const emailAppUrl =
      Platform.OS === 'ios'
        ? 'message://'
        : 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_EMAIL;end';

    try {
      await Linking.openURL(emailAppUrl);
    } catch (error) {
      console.warn('Failed to open email app', error);

      try {
        await Linking.openURL('mailto:');
      } catch (fallbackError) {
        console.warn('Failed to open email composer', fallbackError);
        Alert.alert(
          'Unable to open email app',
          'No email app was found on this device.',
        );
      }
    }
  };

  const handleSendLink = async (email: string) => {
    try {
      const res = (await forgotPassword({
        identifier: email,
      })) as ForgotPasswordResponse;
      console.log('handleSendLink', res);

      if (res?.success) {
        closeModalAndShowAlert(() => {
          Alert.alert(
            'Recovery link sent',
            'Please follow the link to create a new password',
            [
              {
                text: 'Open Email app',
                onPress: openEmailApp,
              },
              {
                text: 'Return to Sign In',
                style: 'cancel',
              },
            ],
          );
        });
      } else {
        closeModalAndShowAlert(() => {
          Alert.alert(
            'Error',
            'An error occurred while sending the recovery link.',
          );
        });
      }
    } catch (error: any) {
      console.log('Forgot password error', error);
      const errorMessage =
        error?.message || 'An error occurred while sending the recovery link.';

      closeModalAndShowAlert(() => {
        Alert.alert('Error', errorMessage);
      });
    }
  };

  return (
    <CustomBottomModal
      isVisible={forgotPasswordModal}
      onClose={() => {
        setForgotPasswordModal(!forgotPasswordModal);
      }}
      onModalHide={() => {
        pendingAlertRef.current?.();
        pendingAlertRef.current = null;
      }}
      height={92}
    >
      <View className="px-4">
        <Text className="text-center text-lg font-semibold">
          Forgot password
        </Text>
        <TouchableOpacity
          onPress={() => setForgotPasswordModal(!forgotPasswordModal)}
          activeOpacity={0.7}
          className="absolute z-10 right-4 top-0 "
        >
          <Text className="text-blueColor text-lg font-regular">Close</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold mt-6">
          Enter your email or phone for password recovery:
        </Text>
        <Formik
          initialValues={{ email: '' }}
          validationSchema={validationSchemaEmailOnly}
          onSubmit={values => {
            handleSendLink(values.email);
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
                styles="mb-[38px] mt-5"
                textPlaceholder="Email or phone"
                placeholder=""
                icon={
                  touched.email && !errors.email && values.email ? (
                    <Check />
                  ) : null
                }
                autoCapitalize="none"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlurHandler={() => handleBlur('email')}
                error={touched.email && !!errors.email}
                errorMessage={touched.email && errors.email}
                textPlaceholderStyles="text-textPlaceholder"
                textInputStyles="text-black"
                backgroundInput="#fff"
              />

              <LinierButton
                title="Send recovery link"
                onPress={() => handleSubmit()}
              />
            </View>
          )}
        </Formik>
      </View>
    </CustomBottomModal>
  );
};
