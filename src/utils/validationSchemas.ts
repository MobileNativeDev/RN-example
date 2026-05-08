import * as Yup from 'yup';

const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MIN_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;

// Accept either a valid email or a phone number (7-15 digits, allowing formatting characters)
const isEmailOrPhone = (value?: string | null) => {
  if (!value) return false;
  const str = String(value || '');
  const isEmail = Yup.string().email().isValidSync(str);
  if (isEmail) return true;
  const digits = ((str as any).match(/\d/g) || []).join('');
  return digits.length >= 7 && digits.length <= 15;
};

export const validationSchemaEmail = Yup.object().shape({
  email: Yup.string()
    .test('emailOrPhone', 'Enter a valid email or phone number', v =>
      isEmailOrPhone(v),
    )
    .required('Email is required'),
  password: Yup.string()
    .min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_MESSAGE)
    .required('Password is required'),
});
export const validationSchemaEmailOnly = Yup.object().shape({
  email: Yup.string()
    .test('emailOrPhone', 'Enter a valid email or phone number', v =>
      isEmailOrPhone(v),
    )
    .required('Email is required'),
});
export const validationSchemaSignUp = Yup.object().shape({
  name: Yup.string().required('Please enter name'),
  email: Yup.string()
    .test('emailOrPhone', 'Please enter email or phone number', v =>
      isEmailOrPhone(v),
    )
    .required('Please enter email or phone number'),
  password: Yup.string()
    .min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_MESSAGE)
    .required('Please enter password'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please enter password'),
  acceptConditions: Yup.boolean()
    .oneOf([true], 'You must accept Terms and Privacy Policy')
    .required('You must accept Terms and Privacy Policy'),
});
export const validationSchemaPassword = Yup.object().shape({
  password: Yup.string()
    .min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_MESSAGE)
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

export const validationSchemaDentist = Yup.object().shape({
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  status: Yup.string().required('Title is required'),
  email: Yup.string()
    .test('emailOrPhone', 'Enter a valid email or phone number', v =>
      isEmailOrPhone(v),
    )
    .required('Email is required'),
  phone_number: Yup.string()
    .matches(
      /^\d{3}-\d{3}-\d{4}$/,
      'Phone number must be in format XXX-XXX-XXXX',
    )
    .required('Phone number is required'),
});
export const validationSchemaDentistEmail = Yup.object().shape({
  email: Yup.string()
    .test('emailOrPhone', 'Enter a valid email or phone number', v =>
      isEmailOrPhone(v),
    )
    .required('Email is required'),
});
export const validationSchemaPatient = Yup.object().shape({
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  email: Yup.string()
    .test('emailOrPhone', 'Enter a valid email or phone number', v =>
      isEmailOrPhone(v),
    )
    .required('Email is required'),
  phone_number: Yup.string().matches(
    /^\d{3}-\d{3}-\d{4}$/,
    'Phone number must be in format XXX-XXX-XXXX',
  ),
});
export const validationSchemaContactIng = Yup.object().shape({
  email: Yup.string()
    .test('emailOrPhone', 'Enter a valid email or phone number', v =>
      isEmailOrPhone(v),
    )
    .required('Email is required'),
  phone: Yup.string()
    .matches(
      /^\d{3}-\d{3}-\d{4}$/,
      'Phone number must be in format XXX-XXX-XXXX',
    )
    .required('Phone number is required'),
  location: Yup.string().required('Location is required'),
});
export const validationSchemaPrimaryContact = Yup.object().shape({
  email: Yup.string()
    .test('emailOrPhone', 'Enter a valid email or phone number', v =>
      isEmailOrPhone(v),
    )
    .required('Email is required'),
  phone: Yup.string().required('Phone number is required'),
});
