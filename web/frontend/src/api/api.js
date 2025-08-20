// web/frontend/src/api/api.js
const API_BASE_URL = 'http://localhost:8000';

export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking backend health:', error);
    throw error;
  }
};
