const callbacks = new Map<string, Function>();

export const createNavCallback = (cb: Function) => {
  const id = `cb_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
  callbacks.set(id, cb);
  return id;
};

export const takeNavCallback = (id?: string) => {
  if (!id) return undefined;
  const cb = callbacks.get(id);
  if (cb) callbacks.delete(id);
  return cb as Function | undefined;
};

export const clearNavCallback = (id?: string) => {
  if (!id) return;
  callbacks.delete(id);
};

export default {
  createNavCallback,
  takeNavCallback,
  clearNavCallback,
};
