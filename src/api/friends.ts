import client from './client';
import ENDPOINTS from './endpoints';
import type { components } from './types.generated';
import logger from '@utils/logger';


export const listFriends = async (): Promise<components['schemas']['FriendResponseDto'][]> => {
  const res = await client.get(ENDPOINTS.friends.list);
  return res.data?.data ?? res.data;
};

export const createFriend = async (payload: FormData): Promise<components['schemas']['FriendResponseDto']> => {
  const res = await client.post(ENDPOINTS.friends.create, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  logger.debug('createFriend response:', res.status, JSON.stringify(res.data));
  
  return res.data?.data ?? res.data;
};

export const importContacts = async (payload: components['schemas']['ImportContactsDto']): Promise<components['schemas']['FriendResponseDto'][]> => {
  const res = await client.post(ENDPOINTS.friends.import, payload);  
  return res.data?.data ?? res.data;
};

export const acceptFriend = async (id: string): Promise<components['schemas']['FriendResponseDto']> => {
  try {
    logger.debug('acceptFriend call:', id);
    const res = await client.post(ENDPOINTS.friends.accept(id));
    logger.debug('acceptFriend response:', res.status, JSON.stringify(res.data));
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    logger.warn('acceptFriend error:', status, err?.message, JSON.stringify(data));
    throw err;
  }
};

export const declineFriend = async (id: string): Promise<components['schemas']['FriendResponseDto']> => {
  try {
    logger.debug('declineFriend call:', id);
    const res = await client.post(ENDPOINTS.friends.reject(id));
    logger.debug('declineFriend response:', res.status, JSON.stringify(res.data));
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    logger.warn('declineFriend error:', status, err?.message, JSON.stringify(data));
    throw err;
  }
};

export const blockFriend = async (id: string): Promise<components['schemas']['FriendResponseDto']> => {
  try {
    logger.debug('blockFriend call:', id);
    const res = await client.post(ENDPOINTS.friends.block(id));
    logger.debug('blockFriend response:', res.status, JSON.stringify(res.data));
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    logger.warn('blockFriend error:', status, err?.message, JSON.stringify(data));
    throw err;
  }
};

export const unblockFriend = async (id: string): Promise<components['schemas']['FriendResponseDto']> => {
  try {
    logger.debug('unblockFriend call:', id);
    const res = await client.post(ENDPOINTS.friends.unblock(id));
    logger.debug('unblockFriend response:', res.status, JSON.stringify(res.data));
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    logger.warn('unblockFriend error:', status, err?.message, JSON.stringify(data));
    throw err;
  }
};


export const deleteFriend = async (id: string): Promise<components['schemas']['FriendResponseDto']> => {
  try {
    logger.debug('delete call:', id);
    const res = await client.delete(ENDPOINTS.friends.delete(id));
    logger.debug('delete:', res.status, JSON.stringify(res.data));
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    logger.warn('delete error:', status, err?.message, JSON.stringify(data));
    throw err;
  }
};

export const resendFriend = async (id: string): Promise<components['schemas']['FriendResponseDto']> => {
  try {
    logger.debug('resendFriend call:', id);
    const res = await client.post(ENDPOINTS.friends.resend(id));
    logger.debug('resendFriend response:', res.status, JSON.stringify(res.data));
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    logger.warn('resendFriend error:', status, err?.message, JSON.stringify(data));
    throw err;
  }
};

export const pairFriend = async (userId: string, friendUserId: string): Promise<components['schemas']['FriendResponseDto']> => {
  try {
    const res = await client.post(ENDPOINTS.friends.pair, { userId, friendUserId });
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    logger.warn('pairFriend error:', status, err?.message, JSON.stringify(data));
    throw err;
  }
};
