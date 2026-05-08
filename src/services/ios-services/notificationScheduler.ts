import { NativeModules, Platform } from 'react-native'

type ScheduleResult = boolean

type ScheduledNotification = {
  id: string
  title: string
  body: string
  date: Date
  sound: string
  repeats: boolean
}

const { SchedulingModule, NotificationModule } = NativeModules as {
  SchedulingModule?: {
    schedule?: (notification: Record<string, any>) => Promise<ScheduleResult>
  }
  NotificationModule?: {
    scheduleSoundNotification?: (notification: Record<string, any>) => Promise<ScheduleResult>
  }
}

export async function scheduleSoundNotification(
  notification: ScheduledNotification,
): Promise<ScheduleResult | null> {
  if (Platform.OS !== 'ios') return null

  try {
    console.log('Creating ios notification...', notification)

    if (SchedulingModule && SchedulingModule.schedule) {
      const triggeredAt = notification.date instanceof Date ? notification.date.getTime() : new Date(notification.date).getTime()
      const payload: Record<string, any> = {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        triggeredAt,
        soundPath: notification.sound,
      }

      // If you have weekday information in JS, add `payload.weekdays = [...]` here.

      const result = await SchedulingModule.schedule(payload)
      console.log('result ios scheduling...', result)
      return result as ScheduleResult
    }

    // Fallback to older NotificationModule if present
    if (NotificationModule && NotificationModule.scheduleSoundNotification) {
      const result = await NotificationModule.scheduleSoundNotification(notification)
      console.log('result ios notification...', result)
      return result as ScheduleResult
    }

    return null
  } catch (e) {
    console.log('Ios schedule error', e)
    return null
  }
}

export default {
  scheduleSoundNotification,
}
