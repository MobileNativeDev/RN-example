import client, { uploadClient } from './client';
import ENDPOINTS from './endpoints';
import type { components } from './types.generated';
import RNBlobUtil from 'react-native-blob-util';
import storePkg from '../store/store';
import { BASE_API_URL } from './config';

export const getNextAlarm = async (): Promise<
  | components['schemas']['SelfAlarmResponseDto']
  | components['schemas']['FriendAlarmResponseDto']
  | null
> => {
  const res = await client.get(ENDPOINTS.alarms.next);
  return res.data?.data ?? res.data;
};

export const getUpcomingAlarms = async (): Promise<
  components['schemas']['FriendAlarmResponseDto'][]
> => {
  const res = await client.get(ENDPOINTS.alarms.upcoming);
  return res.data?.data ?? res.data;
};

export const getPastAlarms = async (): Promise<
  components['schemas']['FriendAlarmResponseDto'][]
> => {
  const res = await client.get(ENDPOINTS.alarms.past);
  return res.data?.data ?? res.data;
};

export const getSentAlarms = async (): Promise<
  components['schemas']['FriendAlarmResponseDto'][]
> => {
  const res = await client.get(ENDPOINTS.alarms.sent);
  return res.data?.data ?? res.data;
};

export const createSelfAlarm = async (
  payload: components['schemas']['CreateSelfAlarmDto'],
) => {
  const res = await client.post(ENDPOINTS.alarms.self, payload);
  return res.data?.data ?? res.data;
};

export const confirmFriendAlarm = async (id: string) => {
  try {
    const res = await client.post(ENDPOINTS.alarms.confirm(id));
    console.log('confirm alarm:', res.data);

    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.log(
      'acceptFriend error:',
      status,
      err?.message,
      JSON.stringify(data),
    );
    throw err;
  }
};

export const rejectFriendAlarm = async (id: string) => {
  try {
    const res = await client.post(ENDPOINTS.alarms.reject(id));
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.log(
      'acceptFriend error:',
      status,
      err?.message,
      JSON.stringify(data),
    );
    throw err;
  }
};

export const markAlarmGot = async (
  id: string,
  payload: components['schemas']['AlarmGotDto'],
) => {
  const res = await client.post(ENDPOINTS.alarms.got(id), payload);
  return res.data;
};

export const dismissAlarm = async (id: string) => {
  const res = await client.post(ENDPOINTS.alarms.dismiss(id));
  return res.data;
};

export const snoozeAlarm = async (
  id: string,
  payload: components['schemas']['AlarmSnoozeDto'],
) => {
  const res = await client.post(ENDPOINTS.alarms.snooze(id), payload);
  return res.data;
};

export const uploadMediaVideo = async (formData: FormData) => {
  const res = await uploadClient.post(ENDPOINTS.alarms.media.video, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.data ?? res.data;
};

export const uploadMediaVideoLocal = async (videoUri: string) => {
  let token: string | null = null;
  try {
    token = storePkg.store.getState().auth?.accessToken ?? null;
  } catch {}

  const headers: any = {
    'Content-Type': 'multipart/form-data',
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let path = videoUri;

  if (path.startsWith('http://localhost')) {
    throw new Error('Metro asset cannot be uploaded. Use real file path.');
  }

  if (path.startsWith('file://')) {
    path = path.replace('file://', '');
  }

  const exists = await RNBlobUtil.fs.exists(path);
  if (!exists) {
    throw new Error(`File not found: ${path}`);
  }

  const res = await RNBlobUtil.fetch(
    'POST',
    `${BASE_API_URL}${ENDPOINTS.alarms.media.video}`,
    headers,
    [
      {
        name: 'file',
        filename: path.split('/').pop() || 'video.mp4',
        type: 'video/mp4',
        data: RNBlobUtil.wrap(path),
      },
    ],
  );

  const json = res.json ? await res.json() : JSON.parse(res.data);

  if (!json?.videoUrl && !json?.url) {
    console.log('UPLOAD RESPONSE:', json);
    throw new Error('Upload failed: no video URL returned');
  }

  return json?.videoUrl || json?.url;
};

export const uploadMediaVoice = async (formData: FormData) => {
  const res = await uploadClient.post(ENDPOINTS.alarms.media.voice, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.data ?? res.data;
};

export const uploadMediaSong = async (formData: FormData) => {
  const res = await uploadClient.post(ENDPOINTS.alarms.media.song, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.data ?? res.data;
};

export const uploadMediaPuzzle = async (formData: FormData) => {
  const res = await uploadClient.post(ENDPOINTS.alarms.media.puzzle, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.data ?? res.data;
};

export const setFriendAlarm = async (
  payload: components['schemas']['CreateFriendAlarmDto'],
) => {
  try {
    const res = await client.post(ENDPOINTS.alarms.friendsSet, payload);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.log(
      'setFriendAlarm error:',
      status,
      err?.message,
      JSON.stringify(data),
    );
    throw err;
  }
};

export const cloneAlarm = async (
  id: string,
  payload?: components['schemas']['CloneAlarmDto'],
) => {
  const res = await client.post(ENDPOINTS.alarms.clone(id), payload);
  return res.data?.data ?? res.data;
};

export const getAlarm = async (id: string) => {
  const res = await client.get(ENDPOINTS.alarms.get(id));
  return res.data?.data ?? res.data;
};

export const deleteAlarm = async (
  id: string,
  payload?: { message?: string },
) => {
  const res = await client.delete(ENDPOINTS.alarms.delete(id), {
    data: payload,
  });
  return res.data?.data ?? res.data;
};

export const updateSelfAlarm = async (
  id: string,
  payload: components['schemas']['UpdateAlarmDto'],
) => {
  try {
    const res = await client.patch(ENDPOINTS.alarms.patchSelf(id), payload);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.log(
      'updateSelfAlarm error:',
      status,
      err?.message,
      JSON.stringify(data),
    );
    throw err;
  }
};

export const updateSelfAlarmRecurrence = async (
  id: string,
  recurring: boolean,
) => {
  const res = await client.patch(ENDPOINTS.alarms.patchSelf(id), { recurring });
  console.log('123', res.data?.data ?? res.data);

  return res.data?.data ?? res.data;
};

type UpdateFriendAlarmPayload =
  components['schemas']['UpdateFriendAlarmDto'] & {
    recurringDays?: string[];
  };

export const updateFriendAlarm = async (
  id: string,
  payload: UpdateFriendAlarmPayload,
) => {
  console.log('payload', payload);

  const res = await client.patch(ENDPOINTS.alarms.patchFriend(id), payload);
  console.log('data', res.data);

  return res.data?.data ?? res.data;
};

export const triggeredAlarm = async (id: string) => {
  try {
    const res = await client.post(ENDPOINTS.alarms.triggered(id));
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.log(
      'triggeredAlarm error:',
      status,
      err?.message,
      JSON.stringify(data),
    );
    throw err;
  }
};
