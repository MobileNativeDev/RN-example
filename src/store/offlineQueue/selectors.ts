import { RootState } from '../store';

export const selectQueueItems = (s: RootState) => s.offlineQueue.items;
export const selectIsProcessing = (s: RootState) => s.offlineQueue.processing;
