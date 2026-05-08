type Listener = (activeId: string | null) => void;

let currentActiveId: string | null = null;
const listeners = new Set<Listener>();

export const setActivePlayer = (id: string | null) => {
  currentActiveId = id;
  for (const l of Array.from(listeners)) {
    try {
      l(currentActiveId);
    } catch (e) {
      // ignore
    }
  }
};

export const getActivePlayer = () => currentActiveId;

export const subscribeActivePlayer = (fn: Listener) => {
  listeners.add(fn);
  // send initial
  fn(currentActiveId);
  return () => {
    listeners.delete(fn);
  };
};

export default {
  setActivePlayer,
  getActivePlayer,
  subscribeActivePlayer,
};
