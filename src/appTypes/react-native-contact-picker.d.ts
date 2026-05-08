declare module 'react-native-contact-picker' {
  export type ContactPhone = { id?: string; number: string; label?: string };
  export type Contact = {
    id?: string;
    name?: string;
    phoneNumbers?: ContactPhone[];
    phoneNumber?: string;
    [key: string]: any;
  };
  export function openContactPicker(): Promise<Contact | null>;
  const _default: { openContactPicker: typeof openContactPicker };
  export default _default;
}
