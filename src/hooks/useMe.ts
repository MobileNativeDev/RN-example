import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import type { components } from '../api/types.generated';

const fetchMe = async (): Promise<components['schemas']['UserResponseDto']> => {
  const res = await client.get('/users/me');
  return (res.data?.data ?? res.data) as components['schemas']['UserResponseDto'];
};

export const useMe = (options?: any) => {
  return useQuery<components['schemas']['UserResponseDto']>({ queryKey: ['me'], queryFn: fetchMe, ...options });
};
