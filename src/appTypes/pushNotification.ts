
export enum PushNotificationType {
  FRIEND_INVITE_CONFIRMED = 'FRIEND_INVITE_CONFIRMED', // friend invite confirmed
  FRIEND_REQUEST_RECEIVED  = 'FRIEND_REQUEST_RECEIVED',  // received a friend request
  FRIEND_REQUEST_CONFIRMED = 'FRIEND_REQUEST_CONFIRMED', // friend request approved
  FRIEND_REQUEST_REJECTED  = 'FRIEND_REQUEST_REJECTED',  // friend request rejected
  FRIEND_GOT_ALARM         = 'FRIEND_GOT_ALARM',        // friend got alarm notification
  FRIEND_ALARM_REQUEST     = 'FRIEND_ALARM_REQUEST',    // friend sent you an alarm request
  FRIEND_ALARM_ACCEPTED    = 'FRIEND_ALARM_ACCEPTED',   // friend alarm was accepted
  FRIEND_ALARM_REJECTED    = 'FRIEND_ALARM_REJECTED',   // friend alarm was rejected
}

export interface PushNotificationData {
  type?: PushNotificationType | string;
  alarmId?: string;
  friendId?: string;
  userId?: string;
  params?: string;
}
