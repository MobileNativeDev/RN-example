declare module 'react-native-immersive' {
  interface ImmersiveStatic {
    on(): void;
    off(): void;
    // Optional helpers that some implementations expose
    addEventListener?: (event: string, listener: (...args: any[]) => void) => void;
    removeEventListener?: (event: string, listener: (...args: any[]) => void) => void;
    getSystemUiVisibility?: () => any;
  }

  const Immersive: ImmersiveStatic;
  export default Immersive;
}
