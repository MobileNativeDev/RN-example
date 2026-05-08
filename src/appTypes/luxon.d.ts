// Minimal declaration for luxon to satisfy TypeScript when @types/luxon isn't installed.
// You can replace this with proper types or install a type package if available.
declare module 'luxon' {
  export const DateTime: any;
  export const Settings: any;
  export const Interval: any;
  const _default: any;
  export default _default;
}
