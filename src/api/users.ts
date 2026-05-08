import client from './client';
import ENDPOINTS from './endpoints';
import type { components } from './types.generated';

export const updateProfile = async (payload: Partial<components['schemas']['UserResponseDto']>) => {
    const res = await client.patch(ENDPOINTS.users.profilePatch, payload);
    return res.data as components['schemas']['UserResponseDto'];
};

export const getFriends = async (): Promise<components['schemas']['FriendResponseDto'][]> => {
  const res = await client.get(ENDPOINTS.friends.list);
  return res.data?.data ?? res.data;
};

export const uploadAvatar = async (payload: FormData) => {
  const endpoint = ENDPOINTS.users.avatar;
  try {
    console.log('uploadAvatar -> POST', (client as any).defaults.baseURL + endpoint);
  } catch (e) {}
  const res = await client.post(endpoint, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data ?? res;
};

export const removeAvatar = async () => {
  const endpoint = ENDPOINTS.users.avatarRemove;
  try {
    console.log('removeAvatar -> POST', (client as any).defaults.baseURL + endpoint);
  } catch (e) {}
  const res = await client.post(endpoint);
  return res.data ?? res;
};



export const deleteMe = async () => {
  try {
    const res = await client.delete(ENDPOINTS.users.deleteMe);
    return res.data ?? res;
  } catch (e) {
    console.log('Failed to delete user', e);
    
   }
};

