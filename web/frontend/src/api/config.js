// web/frontend/src/api/config.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  HEALTH: ${API_BASE_URL}/api/health,
  // Add other API endpoints here
};

export default {
  API_BASE_URL,
  ...API_ENDPOINTS
};
