export type AlarmWakeMethod = {
  id?: string;
  type: 'VOICE' | 'VIDEO' | 'SONG' | 'PUZZLE' | string;
  voiceUrl?: string | null;
  voiceName?: string | null;
  videoUrl?: string | null;
  videoLink?: string | null;
  songUrl?: string | null;
  songName?: string | null;
  puzzleUrl?: {
    imageUrl: string | null;
    soundUrl: string | null;
  } | null;
  localVoicePath?: string | null;
  localVideoPath?: string | null;
  localSongPath?: string | null;
  localPuzzleImagePath?: string | null;
  localPuzzleSoundPath?: string | null;
};

export type Alarm = {
  alarmId?: string;
  id: string;
  date: string;
  days?: string;
  recurring: boolean;
  time: string;
  createdBy: string;
  status: 'Accepted' | 'Pending' | 'Declined' | 'Viewed';
  wakeMethods:
    | 'Puzzle'
    | 'Voice'
    | 'Video'
    | 'Song'
    | Array<string | AlarmWakeMethod>;
  recurringDays?: string[];
  puzzleImageUrl?: { imageUrl: string | null; soundUrl: string | null } | null;
  voiceUrl?: string | null;
  voiceName?: string | null;
  videoUrl?: string | null;
  songUrl?: string | null;
  songName?: string | null;
  scheduledAt?: Date | null;
  friendUserId?: string | null;
  approvalStatus?: 'APPROVED' | 'ACCEPTED' | 'REJECTED' | 'PENDING' | null;
  owner?: string | null;
  ownerId?: string | null;
  createdById?: string | null;
  timezone?: string;
  localNotificationSound?: string | null;
  type?: string | null;
};

export type NotificationType = 'GENERAL' | 'ALARM' | 'SYSTEM' | 'FRIEND';

export type Notification = {
  id: string;
  title: string | null;
  body: string | null;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  data?: Record<string, any> | null;
  actor?: {
    actorId?: string | null;
    id?: string;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
  friendshipId: string | null;
  event?: string | null;
  scheduledAt?: string | null;
  alarmId?: string | null;
  approvalStatus?: 'ACCEPTED' | 'REJECTED' | 'PENDING' | null;
  message?: string | null;
  timezone?: string | null;
};

export type Friend = {
  id: string;
  userId: string;
  friendUserId: string;
  status: 'PENDING' | 'CONFIRMED' | 'ACCEPTED' | 'DECLINED' | string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    phoneNumber: string;
    avatarUrl: string | null;
  };
  friendUser: {
    id: string;
    name: string;
    phoneNumber: string;
    avatarUrl: string | null;
  };
};

export type EmailRegisterPayload = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthDate?: string | null;
  preferredMusicPlayer?: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AlarmType = {
  id: string;
  type: 'Voice' | 'Video' | 'Song' | 'Puzzle';
  voiceUri?: string | number | null;
  voiceName?: string | null;
  videoUri?: string | null;
  videoLink?: string | null;
  songUri?: string | null;
  songName?: string | null;
  puzzleUri?: string | null;
  puzzleSoundUri?: string | null;
};

export type ScheduleParams = {
  alarmId: string;
  scheduledAt: string | number | Date;
  timezone?: string;
  title?: string;
  body?: string;
  wakeMethods?: string[];
  data?: Record<string, any>;
  persist?: boolean;
};
