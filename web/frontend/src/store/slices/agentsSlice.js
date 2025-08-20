import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  agents: [],
  currentAgent: null,
  loading: false,
  error: null,
};

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    setAgents: (state, action) => {
      state.agents = action.payload;
      state.loading = false;
    },
    setCurrentAgent: (state, action) => {
      state.currentAgent = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setAgents, setCurrentAgent, setLoading, setError } = agentsSlice.actions;

export default agentsSlice.reducer;
