import { useQuery } from '@tanstack/react-query';
import { listNotifications } from '../api/notifications';

// const extractItems = (res: any): any[] => {
//   if (!res) return [];
//   if (Array.isArray(res)) return res;
//   if (Array.isArray(res.data)) return res.data;
//   if (Array.isArray(res.items)) return res.items;
//   if (Array.isArray(res.results)) return res.results;
//   if (res.data && Array.isArray(res.data.data)) return res.data.data;
//   return [];
// };

const extractTotal = (res: any): number | null => {
  if (!res) return null;
  if (typeof res.total === 'number') return res.total;
  if (res.meta && typeof res.meta.total === 'number') return res.meta.total;
  if (res.pagination && typeof res.pagination.total === 'number') return res.pagination.total;
  return null;
};

// const countUnreadFromResponse = (res: any): number => {
//   const items = extractItems(res);
//   if (!items || items.length === 0) return 0;
//   let cnt = 0;
//   for (const it of items) {
//       const isRead = (it.isRead);
      
//     if (isRead === false) cnt++;
//   }
//   return cnt;
// };

export const useUnreadNotificationsCount = (options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: async () => {
      const res = await listNotifications({read: false});

      const total = extractTotal(res);
      
      if (typeof total === 'number') return total;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    enabled: options?.enabled !== false,
  });

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  } as const;
};

export default useUnreadNotificationsCount;
