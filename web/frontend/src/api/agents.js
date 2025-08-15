import api from './index';

/**
 * Agent API Service
 * Handles all agent-related API calls
 */

export const getAgents = async () => {
  try {
    const response = await api.get('/agents');
    return response.data;
  } catch (error) {
    console.error('Error fetching agents:', error);
    throw error;
  }
};

export const getAgent = async (agentId) => {
  try {
    const response = await api.get(`/agents/${agentId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching agent ${agentId}:`, error);
    throw error;
  }
};

export const createAgent = async (agentData) => {
  try {
    const response = await api.post('/agents', agentData);
    return response.data;
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
};

export const updateAgent = async (agentId, updates) => {
  try {
    const response = await api.put(`/agents/${agentId}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating agent ${agentId}:`, error);
    throw error;
  }
};

export const deleteAgent = async (agentId) => {
  try {
    await api.delete(`/agents/${agentId}`);
    return true;
  } catch (error) {
    console.error(`Error deleting agent ${agentId}:`, error);
    throw error;
  }
};

export const executeAgentTask = async (agentId, task, context = {}) => {
  try {
    const response = await api.post(`/agents/${agentId}/execute`, {
      task,
      context,
    });
    return response.data;
  } catch (error) {
    console.error(`Error executing task with agent ${agentId}:`, error);
    throw error;
  }
};

export const listAgentCapabilities = async (agentId) => {
  try {
    const response = await api.get(`/agents/${agentId}/capabilities`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching capabilities for agent ${agentId}:`, error);
    throw error;
  }
};

export const updateAgentCapabilities = async (agentId, capabilities) => {
  try {
    const response = await api.put(`/agents/${agentId}/capabilities`, {
      capabilities,
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating capabilities for agent ${agentId}:`, error);
    throw error;
  }
};
