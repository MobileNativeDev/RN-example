// Small bridge to avoid circular imports between client and auth operations.
// client will register a setter, and auth operations can call setAuthHeader(token)
// to ensure the axios client default header is updated immediately.

export type AuthHeaderSetter = (token: string | null) => void;

let _setter: AuthHeaderSetter = () => {};

export const registerAuthHeaderSetter = (fn: AuthHeaderSetter) => {
  _setter = fn;
};

export const setAuthHeader = (token: string | null) => {
  try {
    _setter(token);
  } catch (e) {
    // swallow
  }
};
