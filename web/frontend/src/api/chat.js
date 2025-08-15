import api from './index';

/**
 * Chat API Service
 * Handles all chat-related API calls
 */

export const sendMessage = async (message, context = {}) => {
  try {
    const response = await api.post('/chat', {
      message,
      context,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getChatHistory = async (conversationId = null) => {
  try {
    const url = conversationId 
      ? `/chat/history/${conversationId}`
      : '/chat/history';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};

export const deleteConversation = async (conversationId) => {
  try {
    await api.delete(`/chat/history/${conversationId}`);
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};

export const getConversationList = async () => {
  try {
    const response = await api.get('/chat/conversations');
    return response.data.conversations || [];
  } catch (error) {
    console.error('Error fetching conversation list:', error);
    throw error;
  }
};

export const renameConversation = async (conversationId, newTitle) => {
  try {
    const response = await api.put(`/chat/conversations/${conversationId}`, {
      title: newTitle,
    });
    return response.data;
  } catch (error) {
    console.error('Error renaming conversation:', error);
    throw error;
  }
};

export const streamMessage = async (message, context = {}, onChunk) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let fullResponse = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        // Process the chunk and call the onChunk callback
        if (onChunk && typeof onChunk === 'function') {
          try {
            // Handle potential partial JSON in the chunk
            const lines = fullResponse.split('\n');
            for (const line of lines) {
              if (line.trim()) {
                const data = JSON.parse(line);
                onChunk(data);
              }
            }
            fullResponse = '';
          } catch (e) {
            // If we can't parse the JSON yet, wait for more chunks
            continue;
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in streaming message:', error);
    throw error;
  }
};
