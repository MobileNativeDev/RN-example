import { configureStore, Middleware } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authReducer from './auth/slice';
import offlineQueueReducer from './offlineQueue/slice';
import alarmsReducer from './alarms/slice';
import { persistStore, persistReducer } from 'redux-persist';
// import storage from '../utils/safeAsyncStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const rootReducer = combineReducers({
  auth: authReducer,
  offlineQueue: offlineQueueReducer,
  alarms: alarmsReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  // Persist only small, critical slices. Do NOT persist large alarms lists to avoid UI stalls.
  whitelist: ['auth', 'offlineQueue'],
};

const persistedReducer = persistReducer(persistConfig as any, rootReducer);

const offlineMiddleware: Middleware = _storeAPI => next => action => {
  const result = next(action);
  return result;
};

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false }).concat(offlineMiddleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default { store, persistor };
