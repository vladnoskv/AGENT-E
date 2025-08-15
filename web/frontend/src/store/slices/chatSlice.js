import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, agentId }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/chat/send', { message, agentId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const loadChatHistory = createAsyncThunk(
  'chat/loadHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/chat/history');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  messages: [],
  activeAgent: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  isTyping: false,
  isConnected: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push({
        id: Date.now(),
        sender: action.payload.sender || 'user',
        content: action.payload.content,
        timestamp: new Date().toISOString(),
        type: action.payload.type || 'text',
        ...action.payload.metadata,
      });
    },
    setTyping: (state, action) => {
      state.isTyping = action.payload;
    },
    setConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    setActiveAgent: (state, action) => {
      state.activeAgent = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
    },
    updateMessage: (state, action) => {
      const { id, ...updates } = action.payload;
      const messageIndex = state.messages.findIndex(msg => msg.id === id);
      if (messageIndex !== -1) {
        state.messages[messageIndex] = {
          ...state.messages[messageIndex],
          ...updates,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.messages.push({
          id: action.payload.id,
          sender: 'assistant',
          content: action.payload.response,
          timestamp: new Date().toISOString(),
          type: 'text',
        });
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to send message';
      })
      .addCase(loadChatHistory.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadChatHistory.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.messages = action.payload.messages || [];
      })
      .addCase(loadChatHistory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to load chat history';
      });
  },
});

export const {
  addMessage,
  setTyping,
  setConnected,
  setActiveAgent,
  clearChat,
  updateMessage,
} = chatSlice.actions;

export default chatSlice.reducer;

// Selectors
export const selectAllMessages = (state) => state.chat.messages;
export const selectChatStatus = (state) => state.chat.status;
export const selectIsTyping = (state) => state.chat.isTyping;
export const selectIsConnected = (state) => state.chat.isConnected;
export const selectActiveAgent = (state) => state.chat.activeAgent;
