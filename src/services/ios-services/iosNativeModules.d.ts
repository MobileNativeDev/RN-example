
declare module 'react-native' {
  interface NativeModulesStatic {
    AudioExtractorModule: {
      extractNotificationSound(
        mediaPath: string,
        outputFileName: string,
      ): Promise<string>;
    };

    SchedulingModule: {
      schedule(alarmJSON: string): Promise<boolean>;
      cancelAlarm(id: string): void;
      cancelAll(): void;
      cancelRecurringAlarm(id: string): void;
    };

    SettingsModule: {
      openAppSettings(): void;
      openNotificationSettings(): void;
    };

    NotificationModule: {
      checkPermissionStatus(): Promise<string>;
      requestPermission(): Promise<string>;
    };

    PreferencesModule: {
      saveAlarm(alarmJSON: string): Promise<boolean>;
      removeAlarm(alarmId: string): Promise<boolean>;
    };
  }
}

export {};
