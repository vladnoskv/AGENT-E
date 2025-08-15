import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks
export const fetchAgents = createAsyncThunk(
  'agents/fetchAgents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/agents');
      return response.data.agents || [];
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createAgent = createAsyncThunk(
  'agents/createAgent',
  async (agentData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/agents', agentData);
      return response.data.agent;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateAgent = createAsyncThunk(
  'agents/updateAgent',
  async ({ id, ...updates }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/agents/${id}`, updates);
      return response.data.agent;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteAgent = createAsyncThunk(
  'agents/deleteAgent',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/agents/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  agents: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  selectedAgent: null,
};

const agentSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    selectAgent: (state, action) => {
      state.selectedAgent = action.payload;
    },
    clearSelectedAgent: (state) => {
      state.selectedAgent = null;
    },
    resetAgentState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Agents
      .addCase(fetchAgents.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAgents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.agents = action.payload;
      })
      .addCase(fetchAgents.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Create Agent
      .addCase(createAgent.fulfilled, (state, action) => {
        state.agents.push(action.payload);
        state.selectedAgent = action.payload;
      })
      
      // Update Agent
      .addCase(updateAgent.fulfilled, (state, action) => {
        const index = state.agents.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.agents[index] = action.payload;
        }
        if (state.selectedAgent?.id === action.payload.id) {
          state.selectedAgent = action.payload;
        }
      })
      
      // Delete Agent
      .addCase(deleteAgent.fulfilled, (state, action) => {
        state.agents = state.agents.filter(agent => agent.id !== action.payload);
        if (state.selectedAgent?.id === action.payload) {
          state.selectedAgent = null;
        }
      });
  },
});

export const {
  selectAgent,
  clearSelectedAgent,
  resetAgentState,
} = agentSlice.actions;

export default agentSlice.reducer;

// Selectors
export const selectAllAgents = (state) => state.agents.agents;
export const selectAgentById = (state, agentId) => 
  state.agents.agents.find(agent => agent.id === agentId);
export const selectAgentsStatus = (state) => state.agents.status;
export const selectSelectedAgent = (state) => state.agents.selectedAgent;
export const selectAgentsError = (state) => state.agents.error;
