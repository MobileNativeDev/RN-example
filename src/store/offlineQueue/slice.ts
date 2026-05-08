import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type QueueItem = {
  id: string;
  fnName: string;
  args?: any[];
  attempts?: number;
};

export type OfflineQueueState = {
  items: QueueItem[];
  processing: boolean;
};

const initialState: OfflineQueueState = {
  items: [],
  processing: false,
};

const slice = createSlice({
  name: 'offlineQueue',
  initialState,
  reducers: {
    enqueue(state, action: PayloadAction<QueueItem>) {
      state.items.push(action.payload);
    },
    dequeue(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    markProcessing(state, action: PayloadAction<boolean>) {
      state.processing = action.payload;
    },
    clearQueue(state) {
      state.items = [];
    },
    incrementAttempts(state, action: PayloadAction<string>) {
      const it = state.items.find(i => i.id === action.payload);
      if (it) it.attempts = (it.attempts || 0) + 1;
    },
  },
});

export const { enqueue, dequeue, markProcessing, clearQueue, incrementAttempts } = slice.actions;
export default slice.reducer;
