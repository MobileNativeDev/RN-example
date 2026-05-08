import client from './client';
import ENDPOINTS from './endpoints';
import type { components } from './types.generated';

export const registerDevice = async (payload: components['schemas']['RegisterDeviceDto']): Promise<components['schemas']['RegisterDeviceResponse']> => {
  const res = await client.post(ENDPOINTS.devices.register, payload);
  return res.data?.data ?? res.data;
};
