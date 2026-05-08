import { NativeModules, Platform } from 'react-native'

type PermissionStatus =
  | 'authorized'
  | 'denied'
  | 'notDetermined'
  | 'provisional'
  | 'ephemeral'
  | 'unknown'

const { NotificationModule } = NativeModules as {
  NotificationModule?: {
    checkPermissionStatus: () => Promise<PermissionStatus>
    requestPermission: () => Promise<PermissionStatus>
    scheduleSoundNotification?: (
      notification: Record<string, any>
    ) => Promise<boolean>
  }
}

async function checkPermissionStatus(): Promise<PermissionStatus | null> {
  if (Platform.OS !== 'ios') return null
  if (!NotificationModule || !NotificationModule.checkPermissionStatus) return null
  try {
    const status = await NotificationModule.checkPermissionStatus()
    return status as PermissionStatus
  } catch (e) {
    return null
  }
}

async function requestPermission(): Promise<PermissionStatus | null> {
  if (Platform.OS !== 'ios') return null
  if (!NotificationModule || !NotificationModule.requestPermission) return null
  try {
    const status = await NotificationModule.requestPermission()
    return status as PermissionStatus
  } catch (e) {
    return null
  }
}

export async function ensureNotificationPermission(): Promise<PermissionStatus | null> {
  const status = await checkPermissionStatus()
  if (status === null) return null
  if (status === 'notDetermined') {
    return await requestPermission()
  }
  return status
}

export default {
  checkPermissionStatus,
  requestPermission,
  ensureNotificationPermission,
}
