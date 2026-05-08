interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

let showPopupFn: ((config: any) => void) | null = null;

export const setAlertHandler = (handler: (config: any) => void) => {
  showPopupFn = handler;
};

export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { cancelable?: boolean; onDismiss?: () => void }
  ) => {
    if (!showPopupFn) {
      return;
    }

    const processedButtons = buttons?.map(btn => ({
      text: btn.text || 'OK',
      onPress: btn.onPress,
      style: btn.style || 'default',
    })) || [{ text: 'OK', style: 'default' as const }];

    showPopupFn({
      title,
      message,
      buttons: processedButtons,
      options
    });
  },
};
