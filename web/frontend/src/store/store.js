import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Slices
import uiReducer from './slices/uiSlice';
import chatReducer from './slices/chatSlice';
import agentReducer from './slices/agentSlice';
import modelReducer from './slices/modelSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['ui', 'chat', 'agents'], // Only persist these slices
};

const rootReducer = combineReducers({
  ui: uiReducer,
  chat: chatReducer,
  agents: agentReducer,
  models: modelReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Persist the store
const persistor = persistStore(store);

export { store, persistor };
