import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  darkMode: true,
  sidebarOpen: true,
  rightPanelOpen: false,
  currentView: 'chat',
  loading: false,
  error: null,
  notifications: [],
  isConnected: false,
  socketId: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleRightPanel: (state) => {
      state.rightPanelOpen = !state.rightPanelOpen;
    },
    setCurrentView: (state, action) => {
      state.currentView = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload,
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    setConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    setSocketId: (state, action) => {
      state.socketId = action.payload;
    },
    addMessage: (state, action) => {
      // Handle incoming WebSocket messages
      const { type, data } = action.payload;
      switch (type) {
        case 'status':
          state.notifications.push({
            id: Date.now(),
            message: data.message,
            severity: 'info',
          });
          break;
        case 'error':
          state.notifications.push({
            id: Date.now(),
            message: data.message,
            severity: 'error',
          });
          break;
        default:
          break;
      }
    },
  },
});

export const {
  toggleDarkMode,
  setDarkMode,
  toggleSidebar,
  toggleRightPanel,
  setCurrentView,
  setLoading,
  setError,
  addNotification,
  removeNotification,
  setConnected,
  setSocketId,
  addMessage,
} = uiSlice.actions;

export default uiSlice.reducer;
