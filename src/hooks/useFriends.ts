import { useQuery } from '@tanstack/react-query';
import { listFriends } from '../api/friends';
import type { components } from '../api/types.generated';

export const useFriends = (options?: any) => {
  return useQuery<components['schemas']['FriendResponseDto'][]>({
    queryKey: ['friends'],
    queryFn: listFriends,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...options,
  });
};
