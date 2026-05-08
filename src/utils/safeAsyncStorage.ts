
type StorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear?(): Promise<void>;
};

const createInMemory = (): StorageLike => {
  const store = new Map<string, string>();
  return {
    async getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
    async clear() {
      store.clear();
    },
  };
};

let safeStorage: StorageLike = createInMemory();
let isNative = false;

try {
  const maybe = require('@react-native-async-storage/async-storage');
  if (maybe && typeof maybe.getItem === 'function') {
    safeStorage = maybe as StorageLike;
    isNative = true;
  }
} catch (e) {}

export default safeStorage;
export { isNative };
