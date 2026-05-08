import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

type PendingNav = { name: string; params?: any };

const pendingNavigations: PendingNav[] = [];
let lastNavigatedKey: string | null = null;

// safe navigate: if ref ready -> navigate, else queue for later
export function navigate(name: string, params?: any) {
  try {
    const key = name + JSON.stringify(params ?? {});
    // dedupe exact repeated navigation
    if (key === lastNavigatedKey) return;

    if (navigationRef.isReady()) {
      lastNavigatedKey = key;
      navigationRef.navigate(name as any, params);
    } else {
      // keep queue bounded to avoid unbounded memory growth
      if (pendingNavigations.length < 20)
        pendingNavigations.push({ name, params });
    }
  } catch (e) {
    // swallow errors to avoid crashes from navigation timing
    // eslint-disable-next-line no-console
    console.warn('RootNavigation.navigate error', e);
  }
}

// flush pending navigations when navigationRef becomes ready
export function flushPending() {
  try {
    if (!navigationRef.isReady()) return;
    while (pendingNavigations.length) {
      const { name, params } = pendingNavigations.shift()!;
      const key = name + JSON.stringify(params ?? {});
      if (key === lastNavigatedKey) continue;
      try {
        navigationRef.navigate(name as any, params);
        lastNavigatedKey = key;
      } catch (err) {
        // ignore single failures and continue
        // eslint-disable-next-line no-console
        console.warn('RootNavigation.flushPending navigate failed', err);
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('RootNavigation.flushPending error', e);
  }
}
