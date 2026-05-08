import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AlarmLean = {
  id: string;
  date: string;
  time: string;
  days?: string | string[];
  recurring?: boolean;
  createdBy?: string;
  status?: string;
  wakeMethods?: string[];
};

export type AlarmsState = {
  next: AlarmLean | null;
  upcoming: AlarmLean[];
  past: AlarmLean[];
  sent: AlarmLean[];
  updatedAt?: number;
};

const initialState: AlarmsState = {
  next: null,
  upcoming: [],
  past: [],
  sent: [],
  updatedAt: undefined,
};

const alarmsSlice = createSlice({
  name: 'alarms',
  initialState,
  reducers: {
    setNext(state, action: PayloadAction<AlarmLean | null>) {
      state.next = action.payload;
      state.updatedAt = Date.now();
    },
    setUpcoming(state, action: PayloadAction<AlarmLean[]>) {
      state.upcoming = action.payload;
      state.updatedAt = Date.now();
    },
    setPast(state, action: PayloadAction<AlarmLean[]>) {
      state.past = action.payload;
      state.updatedAt = Date.now();
    },
    setSent(state, action: PayloadAction<AlarmLean[]>) {
      state.sent = action.payload;
      state.updatedAt = Date.now();
    },
    setAll(
      state,
      action: PayloadAction<{
        next: AlarmLean | null;
        upcoming: AlarmLean[];
        past: AlarmLean[];
        sent: AlarmLean[];
      }>,
    ) {
      state.next = action.payload.next;
      state.upcoming = action.payload.upcoming;
      state.past = action.payload.past;
      state.sent = action.payload.sent;
      state.updatedAt = Date.now();
    },
    upsertOne(state, action: PayloadAction<AlarmLean>) {
      const a = action.payload;
      const replace = (arr: AlarmLean[]) => {
        const idx = arr.findIndex(x => x.id === a.id);
        if (idx >= 0) arr[idx] = a;
        else arr.unshift(a);
      };
      replace(state.upcoming);
      state.next = state.next?.id === a.id ? a : state.next;
      state.updatedAt = Date.now();
    },
    removeOne(state, action: PayloadAction<string>) {
      const id = action.payload;
      const f = (arr: AlarmLean[]) => arr.filter(x => x.id !== id);
      state.upcoming = f(state.upcoming);
      state.past = f(state.past);
      state.sent = f(state.sent);
      if (state.next?.id === id) state.next = null;
      state.updatedAt = Date.now();
    },
    clear(state) {
      state.next = null;
      state.upcoming = [];
      state.past = [];
      state.sent = [];
      state.updatedAt = undefined;
    },
  },
});

export const { setNext, setUpcoming, setPast, setSent, setAll, upsertOne, removeOne, clear } = alarmsSlice.actions;
export default alarmsSlice.reducer;
