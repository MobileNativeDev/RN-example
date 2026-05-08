import client from './client';
import ENDPOINTS from './endpoints';
import type { components } from './types.generated';
import logger from '@utils/logger';

export const listNotifications = async (params?: { type?: 'GENERAL' | 'ALARM' | 'SYSTEM'; read?: boolean; from?: string; to?: string; page?: number; limit?: number; }) => {
  const res = await client.get(ENDPOINTS.notifications.list, { params });

  return res.data?.data ?? res.data;
};

export const getNotificationSettings = async (): Promise<components['schemas']['NotificationsSettingsDto']> => {
  const res = await client.get(ENDPOINTS.notifications.settings);
  
  return res.data?.data ?? res.data;
};

export const updateNotificationSettings = async (payload: components['schemas']['NotificationsSettingsDto']) => {
  const res = await client.patch(ENDPOINTS.notifications.settings, payload);
  return res.data?.data ?? res.data;
};

export const markAllNotificationsRead = async () => {
  try {
    const res = await client.patch(ENDPOINTS.notifications.readAll, { read: true });
    return res.data?.data ?? res.data;
  } catch (err: any) {
    logger.warn('[notifications] markAllNotificationsRead failed', err);
  }
};

export const markNotificationRead = async (id: string) => {
  try {
    const res = await client.patch(ENDPOINTS.notifications.read(id), { read: true });  
    return res.data?.data ?? res.data;
  } catch (err: any) {
    const url = err?.config?.url ?? err?.request?.responseURL ?? ` /notifications/${id}/read`;
    const method = (err?.config?.method ?? 'UNKNOWN').toString().toUpperCase();
    const status = err?.response?.status ?? 'no-status';
    const data = err?.response?.data ?? err?.message;
    logger.error(`API ${method} ${url} failed: ${status}`, data);

    throw err;
  }
};
