import { appleAuth } from '@invertase/react-native-apple-authentication';

const DEFAULT_APPLE_SIGN_IN_ERROR =
  'Apple Sign-In could not be completed. Please try again.';

export const getAppleSignInErrorMessage = (error: any) => {
  const code = String(error?.code ?? '');
  const rawMessage = String(error?.message ?? '');
  const message = rawMessage.toLowerCase();
  const backendMessage = error?.response?.data?.message;

  if (
    code === appleAuth.Error.CANCELED ||
    rawMessage.includes('AuthorizationError error 1001')
  ) {
    return 'Apple Sign-In was canceled.';
  }

  if (
    code === appleAuth.Error.INVALID_RESPONSE ||
    rawMessage.includes('AuthorizationError error 1002')
  ) {
    return 'Apple Sign-In returned invalid data. Please try again.';
  }

  if (
    code === appleAuth.Error.NOT_HANDLED ||
    rawMessage.includes('AuthorizationError error 1003')
  ) {
    return 'Apple Sign-In could not be completed right now. Please try again.';
  }

  if (
    code === appleAuth.Error.FAILED ||
    rawMessage.includes('AuthorizationError error 1004')
  ) {
    return 'Apple Sign-In failed. Please try again.';
  }

  if (message.includes('no identity token')) {
    return 'Apple Sign-In could not be completed. Please try again.';
  }

  if (message.includes('not supported')) {
    return 'Apple Sign-In is not available on this device.';
  }

  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }

  return DEFAULT_APPLE_SIGN_IN_ERROR;
};

export const isAppleSignInCancelledError = (error: any) => {
  const code = String(error?.code ?? '');
  const rawMessage = String(error?.message ?? '');

  return (
    code === appleAuth.Error.CANCELED ||
    rawMessage.includes('AuthorizationError error 1001')
  );
};
