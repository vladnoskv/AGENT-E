import { logger } from '../utils/logger.js';
import { processAgentRequest } from '../services/agent-service.js';

// Message type handlers
const messageHandlers = {
  // Handle chat messages
  chat: async (data, client) => {
    const { message, conversationId } = data;
    logger.info(`Processing chat message from ${client.id} in conversation ${conversationId}`);
    
    // Process the message through the agent service
    const response = await processAgentRequest({
      type: 'chat',
      message,
      conversationId,
      clientId: client.id,
    });

    return {
      type: 'chat_response',
      data: {
        conversationId,
        message: response.message,
        metadata: response.metadata,
        timestamp: new Date().toISOString(),
      },
    };
  },

  // Handle tool execution requests
  execute_tool: async (data, client) => {
    const { toolName, parameters, requestId } = data;
    logger.info(`Processing tool execution: ${toolName} for client ${client.id}`);
    
    try {
      const result = await processAgentRequest({
        type: 'tool',
        toolName,
        parameters,
        clientId: client.id,
      });

      return {
        type: 'tool_response',
        data: {
          requestId,
          success: true,
          result,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error(`Tool execution failed: ${error.message}`, error);
      return {
        type: 'tool_response',
        data: {
          requestId,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  },

  // Handle system commands
  system: async (data, client) => {
    const { command } = data;
    logger.info(`Processing system command: ${command} from ${client.id}`);
    
    switch (command) {
      case 'ping':
        return {
          type: 'pong',
          data: { timestamp: new Date().toISOString() },
        };
      
      case 'get_status':
        return {
          type: 'status',
          data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            clientId: client.id,
          },
        };
      
      default:
        throw new Error(`Unknown system command: ${command}`);
    }
  },
};

/**
 * Handle an incoming WebSocket message
 * @param {Object} message - The message to handle
 * @param {Object} client - Client information
 * @returns {Promise<Object>} The response to send back, if any
 */
export async function handleMessage(message, client) {
  const { type, data } = message;
  
  if (!type) {
    throw new Error('Message type is required');
  }

  const handler = messageHandlers[type];
  if (!handler) {
    throw new Error(`No handler for message type: ${type}`);
  }

  try {
    return await handler(data, client);
  } catch (error) {
    logger.error(`Error handling message type ${type}:`, error);
    return {
      type: 'error',
      data: {
        message: `Failed to process message: ${error.message}`,
        type: error.name,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
