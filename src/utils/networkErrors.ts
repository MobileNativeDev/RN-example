const REQUEST_TIMEOUT_MESSAGE = 'Connection is slow. Please try again.';

const NETWORK_UNAVAILABLE_MESSAGE =
  'Unable to reach the server. Please check your internet connection and try again.';

const SERVER_ERROR_MESSAGE = 'Server error. Please try again later.';

const HTML_LIKE_RESPONSE_PATTERN =
  /<\/?(html|head|body|title|center|h1|h2|div|span|p)[^>]*>/i;

const getRawErrorMessage = (errorOrMessage: unknown) => {
  if (typeof errorOrMessage === 'string') {
    return errorOrMessage.trim();
  }

  const error = errorOrMessage as any;
  const responseData = error?.response?.data;

  if (
    typeof responseData?.message === 'string' &&
    responseData.message.trim()
  ) {
    return responseData.message.trim();
  }

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData.trim();
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return '';
};

export const getUserFriendlyErrorMessage = (
  errorOrMessage: unknown,
  fallback = 'Something went wrong. Please try again.',
) => {
  const rawMessage = getRawErrorMessage(errorOrMessage);
  const error = errorOrMessage as any;
  const normalizedMessage = rawMessage.toLowerCase();
  const errorCode = String(error?.code ?? '').toUpperCase();
  const status = Number(error?.response?.status ?? error?.status ?? 0);

  if (
    (status >= 500 && status < 600) ||
    normalizedMessage.includes('bad gateway') ||
    normalizedMessage.includes('internal server error') ||
    normalizedMessage.includes('service unavailable') ||
    normalizedMessage.includes('gateway timeout') ||
    HTML_LIKE_RESPONSE_PATTERN.test(rawMessage)
  ) {
    return SERVER_ERROR_MESSAGE;
  }

  if (
    errorCode === 'ECONNABORTED' ||
    normalizedMessage.includes('timeout of') ||
    normalizedMessage.includes('timeout exceeded') ||
    normalizedMessage.includes('timeout')
  ) {
    return REQUEST_TIMEOUT_MESSAGE;
  }

  if (
    normalizedMessage === 'network error' ||
    normalizedMessage.includes('network request failed') ||
    normalizedMessage.includes('could not reach api')
  ) {
    return NETWORK_UNAVAILABLE_MESSAGE;
  }

  return rawMessage || fallback;
};
