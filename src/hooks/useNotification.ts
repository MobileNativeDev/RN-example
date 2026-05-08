import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listNotifications } from '../api/notifications';

type Params = { type?: 'GENERAL' | 'ALARM' | 'SYSTEM'; read?: boolean; from?: string; to?: string; page?: number; limit?: number };

const extractItemsFromPage = (page: any): any[] => {
  if (!page) return [];
  if (Array.isArray(page)) return page;
  if (Array.isArray((page as any).data)) return (page as any).data;
  if (Array.isArray((page as any).items)) return (page as any).items;
  if (Array.isArray((page as any).results)) return (page as any).results;
  if ((page as any).data && Array.isArray((page as any).data.data)) return (page as any).data.data;
  return [];
};

export const useNotifications = (params?: Params) => {
  const limit = params?.limit ?? 50;

  const query = useInfiniteQuery({
    queryKey: ['notifications', params ?? {}],
    // start from provided page or 1
    initialPageParam: params?.page ?? 1,
    queryFn: ({ pageParam = params?.page ?? 1 }: any) =>
      listNotifications({ ...(params ?? {}), page: pageParam, limit }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    getNextPageParam: (lastPage: any, pages: any[]) => {
      const items = extractItemsFromPage(lastPage) ?? [];
      // If returned items are fewer than limit, assume no more pages
      if (!items || items.length < limit) return undefined;
      // next page is pages.length + startingPage
      const start = params?.page ?? 1;
      return start + pages.length;
    },
  });
  const allItems = useMemo(
    () =>
      (query.data?.pages ?? []).flatMap((p: any) => extractItemsFromPage(p)),
    [query.data?.pages],
  );

  return {
    ...query,
    items: allItems,
  } as const;
};

export default useNotifications;
