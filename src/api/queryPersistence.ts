import AsyncStorage from '../utils/safeAsyncStorage';
import { QueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'RQ_CACHE_v1';

export const persistQueryClient = async (client: QueryClient) => {
  try {
    const data = JSON.stringify(
      client
        .getQueryCache()
        .getAll()
        .map(q => ({
          queryKey: q.queryKey,
          data: q.state.data,
        })),
    );
    await AsyncStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    // ignore
  }
};

export const hydrateQueryClient = async (client: QueryClient) => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Array<{ queryKey: unknown[]; data: any }>;

    // Process in batches to avoid blocking main thread
    for (let i = 0; i < parsed.length; i++) {
      const { queryKey, data } = parsed[i];
      try {
        if (queryKey && data !== undefined) {
          client.setQueryData(queryKey as any, data);
        }
      } catch (e) {
        // ignore per-query failures
      }

      // Yield to main thread every 5 queries
      if (i % 5 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  } catch (e) {
    // ignore
  }
};

export const enqueueOfflineMutation = async (item: any) => {
  const key = 'OFFLINE_MUTATIONS_V1';
  try {
    const raw = await AsyncStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    list.push(item);
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    // ignore
  }
};

export const drainOfflineMutations = async (client: QueryClient) => {
  const key = 'OFFLINE_MUTATIONS_V1';
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;
    const list = JSON.parse(raw) as Array<any>;

    // Process in batches
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      try {
        // Basic shape: { fnName: string, args: any[] }
        // Caller must register handlers for fnName
        const handler = (client as any)[item.fnName];
        if (typeof handler === 'function') {
          await handler(...(item.args || []));
        }
      } catch (e) {
        // if one fails, keep it for later
      }

      // Yield every 3 mutations
      if (i % 3 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // ignore
  }
};
