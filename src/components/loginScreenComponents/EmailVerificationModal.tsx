import { confirmEmail, resendEmailConfirmation } from '@api/auth';
import { CustomBottomModal } from '@components/customComponents/CustomBottomModal';
import { LinierButton } from '@components/customComponents/LinierButton';
import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { OtpInput } from 'react-native-otp-entry';

export const EmailVerificationModal = ({
  emailVerificationModal,
  setEmailVerificationModal,
  email,
  onSuccess,
  onModalHide,
}: {
  emailVerificationModal: boolean;
  setEmailVerificationModal: (boolean: boolean) => void;
  email: string;
  onSuccess?: () => void;
  onModalHide?: () => void;
}) => {
  const codeRef = useRef('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    if (emailVerificationModal) {
      setResendCooldown(30);
      return;
    }

    if (!emailVerificationModal) {
      codeRef.current = '';
      setErrorMessage(null);
      setInfoMessage(null);
      setIsSubmitting(false);
      setIsResending(false);
      setResendCooldown(30);
    }
  }, [emailVerificationModal]);

  useEffect(() => {
    if (!emailVerificationModal || resendCooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [emailVerificationModal, resendCooldown]);

  const handleClose = () => {
    if (isSubmitting) return;
    setEmailVerificationModal(false);
  };

  const handleConfirm = async () => {
    const trimmedCode = codeRef.current.trim();
    if (!trimmedCode) {
      setErrorMessage('Code is required');
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      setErrorMessage('Code must be 6 digits');
      return;
    }

    console.log(`Verifying email ${email} with code: ${trimmedCode}`);
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await confirmEmail({ identifier: email, code: trimmedCode });
      if (onSuccess) {
        onSuccess();
      } else {
        setEmailVerificationModal(false);
      }
    } catch (error: any) {
      setErrorMessage('Incorrect code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (isSubmitting || isResending || resendCooldown > 0 || !email.trim()) {
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await resendEmailConfirmation({ identifier: email.trim() });
      setInfoMessage('We sent a new confirmation code to your email.');
      setResendCooldown(30);
    } catch (error: any) {
      const message =
        error?.fieldErrors?.identifier ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to re-send the confirmation code.';
      setErrorMessage(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <CustomBottomModal
      isVisible={emailVerificationModal}
      onClose={handleClose}
      onModalHide={onModalHide}
      height={92}
    >
      <View className="px-4">
        <Text className="text-center text-lg font-semibold">
          Email verification
        </Text>
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          className="absolute z-10 right-4 top-0 "
        >
          <Text className="text-blueColor text-lg font-regular">Close</Text>
        </TouchableOpacity>
        <Text className="text-[15px] font-semibold mt-6 mb-5">
          We have sent a confirmation code to your email{' '}
        </Text>
        <View className="w-full">
          <OtpInput
            key={
              emailVerificationModal
                ? 'verification-open'
                : 'verification-closed'
            }
            numberOfDigits={6}
            onTextChange={value => {
              codeRef.current = value;
              if (errorMessage) setErrorMessage(null);
            }}
            focusColor="green"
            autoFocus={true}
            type="numeric"
            theme={{
              pinCodeContainerStyle: {
                backgroundColor: 'white',
                width: 54,
                height: 54,
                borderRadius: 8,
                borderWidth: errorMessage ? 2 : 0,
                borderColor: errorMessage ? '#FF4D4F' : 'transparent',
              },
            }}
          />
          {errorMessage && (
            <Text style={{ color: '#FF4D4F', marginTop: 8 }}>
              {errorMessage}
            </Text>
          )}
          {infoMessage && !errorMessage && (
            <Text style={{ color: '#3FAE5C', marginTop: 8 }}>
              {infoMessage}
            </Text>
          )}
          <View className="h-[38px] w-full" />
          <LinierButton
            title="Confirm"
            onPress={handleConfirm}
            borderColor={true}
            loading={isSubmitting}
          />
          {isSubmitting ? (
            <Text style={{ color: '#6B6B6B', marginTop: 10, textAlign: 'center' }}>
              Verifying...
            </Text>
          ) : null}
          <View className="flex-row mt-5 justify-center space-x-2">
            <Text className="">Didn't get the code?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={isSubmitting || isResending || resendCooldown > 0}
            >
              <Text className="text-blueColor">
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                  ? `Re-send in ${resendCooldown}s`
                  : 'Re-send'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </CustomBottomModal>
  );
};
