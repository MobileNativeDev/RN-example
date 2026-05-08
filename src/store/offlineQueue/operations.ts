import { AppDispatch } from '../store';
import { enqueue, dequeue, incrementAttempts } from './slice';

export const addToQueue = (item: any) => async (dispatch: AppDispatch) => {
  dispatch(enqueue(item));
};

export const removeFromQueue = (id: string) => async (dispatch: AppDispatch) => {
  dispatch(dequeue(id));
};

export const bumpAttempt = (id: string) => async (dispatch: AppDispatch) => {
  dispatch(incrementAttempts(id));
};
