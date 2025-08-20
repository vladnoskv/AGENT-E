import { logger } from '../utils/logger.js';
import { processAgentRequest } from '../services/agent-service.js';

// Track connected clients
const clients = new Map();

// Generate a unique client ID
function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Message type handlers
const messageHandlers = {
  // Handle chat messages
  chat: async (data, client) => {
    const { message, conversationId } = data;
    logger.info(`Processing chat message from ${client.id} in conversation ${conversationId || 'new'}`);
    
    try {
      // Process the message through the agent service
      const response = await processAgentRequest({
        type: 'chat',
        message,
        conversationId: conversationId || `conv_${Date.now()}`,
        clientId: client.id,
      });

      return {
        type: 'chat_response',
        data: {
          conversationId: response.conversationId,
          message: response.message,
          metadata: response.metadata,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Error processing chat message:', error);
      return {
        type: 'error',
        data: {
          message: 'Failed to process message',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  },

  // Handle ping/pong for connection keep-alive
  ping: async () => ({
    type: 'pong',
    data: { timestamp: new Date().toISOString() },
  }),
};

/**
 * Handle a new WebSocket connection
 * @param {WebSocket} ws - The WebSocket connection
 * @param {Object} request - The HTTP request
 */
export function handleWebSocketConnection(ws, request) {
  const clientId = generateClientId();
  const clientInfo = { 
    id: clientId,
    ip: request.socket.remoteAddress,
    userAgent: request.headers['user-agent'] || 'unknown',
    connectedAt: new Date().toISOString(),
    ws: ws
  };
  
  // Add to connected clients
  clients.set(clientId, clientInfo);
  logger.info(`Client connected: ${clientId} (${clients.size} total)`);

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      logger.debug('Received message from %s: %o', clientId, message);
      
      if (!message.type) {
        throw new Error('Message type is required');
      }

      const handler = messageHandlers[message.type];
      if (!handler) {
        throw new Error(`No handler for message type: ${message.type}`);
      }
      
      // Handle the message
      const response = await handler(message.data || {}, clientInfo);
      
      // Send response if any
      if (response) {
        ws.send(JSON.stringify(response));
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      
      // Send error response
      ws.send(JSON.stringify({
        type: 'error',
        data: {
          message: 'Failed to process message',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      }));
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(clientId);
    logger.info(`Client disconnected: ${clientId} (${clients.size} remaining)`);
  });

  // Handle errors
  ws.on('error', (error) => {
    logger.error(`WebSocket error for client ${clientId}:`, error);
    clients.delete(clientId);
    ws.terminate();
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection_established',
    data: {
      clientId,
      timestamp: new Date().toISOString(),
      message: 'Connected to AGENT-X server',
    },
  }));
}

/**
 * Broadcast a message to all connected clients
 * @param {Object} message - The message to broadcast
 * @param {string} [excludeClientId] - Optional client ID to exclude from the broadcast
 * @returns {number} Number of clients that received the message
 */
function broadcast(message, excludeClientId) {
  let count = 0;
  clients.forEach((client, clientId) => {
    if (clientId !== excludeClientId && client.ws.readyState === client.ws.OPEN) {
      client.ws.send(JSON.stringify(message));
      count++;
    }
  });
  return count;
}

/**
 * Send a message to a specific client
 * @param {string} clientId - The ID of the client to send the message to
 * @param {Object} message - The message to send
 * @returns {boolean} Whether the message was sent successfully
 */
function sendToClient(clientId, message) {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === client.ws.OPEN) {
    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Failed to send message to client ${clientId}:`, error);
      return false;
    }
  }
  return false;
}

// Export the public API
export const wsHandler = {
  handleWebSocketConnection,
  broadcast,
  getConnectedClients,
  getClientCount,
  sendToClient,
  clients,
};

// For backward compatibility
export default handleWebSocketConnection;
        return false;
      }
    }
  }
  logger.warn(`Client ${clientId} not found`);
  return false;
}

/**
 * Get information about connected clients
 * @returns {Array} List of connected clients
 */
export function getConnectedClients() {
  return Array.from(clients).map(({ id, ip }) => ({ id, ip }));
}
