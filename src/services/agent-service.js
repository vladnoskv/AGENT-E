import { logger } from '../utils/logger.js';
import { getModel } from '../models/registry.js';

// In-memory conversation store
const conversations = new Map();

/**
 * Process an agent request
 * @param {Object} options - Request options
 * @param {string} options.type - Request type ('chat' or 'tool')
 * @param {string} [options.message] - The chat message (for type 'chat')
 * @param {string} [options.conversationId] - Conversation ID (for type 'chat')
 * @param {string} [options.toolName] - Tool name (for type 'tool')
 * @param {Object} [options.parameters] - Tool parameters (for type 'tool')
 * @param {string} options.clientId - Client ID
 * @returns {Promise<Object>} The response from the agent
 */
export async function processAgentRequest({
  type,
  message,
  conversationId,
  toolName,
  parameters,
  clientId,
}) {
  try {
    // Get or create conversation
    if (type === 'chat' && !conversationId) {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      conversations.set(conversationId, {
        id: conversationId,
        clientId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const conversation = conversations.get(conversationId) || {};

    // Process based on request type
    if (type === 'chat') {
      // Add user message to conversation
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      });

      // Get response from the model
      const model = await getModel('default'); // Get the default model
      const response = await model.generate({
        messages: conversation.messages,
        temperature: 0.7,
        maxTokens: 1000,
      });

      // Add assistant response to conversation
      conversation.messages.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
      });

      // Update conversation
      conversation.updatedAt = new Date().toISOString();
      conversations.set(conversationId, conversation);

      return {
        message: response.content,
        conversationId,
        metadata: {
          model: response.model,
          usage: response.usage,
        },
      };
    } 
    
    else if (type === 'tool') {
      // Execute the requested tool
      const tool = await getTool(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      const result = await tool.execute(parameters, {
        clientId,
        conversationId,
      });

      return {
        tool: toolName,
        result,
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error(`Unsupported request type: ${type}`);
  } catch (error) {
    logger.error('Error processing agent request:', error);
    throw error;
  }
}

/**
 * Get a tool by name
 * @param {string} toolName - The name of the tool to get
 * @returns {Promise<Object>} The tool
 */
async function getTool(toolName) {
  // This would typically load the tool from a registry
  // For now, we'll just return a mock implementation
  const tools = {
    // Example tool: File operations
    read_file: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        path: { type: 'string', description: 'Path to the file' },
      },
      execute: async ({ path }) => {
        // In a real implementation, this would read the file
        return { content: `Content of ${path}`, success: true };
      },
    },
    
    // Add more tools as needed
  };

  return tools[toolName] || null;
}

/**
 * Get a conversation by ID
 * @param {string} conversationId - The ID of the conversation to get
 * @returns {Object} The conversation, or null if not found
 */
export function getConversation(conversationId) {
  return conversations.get(conversationId) || null;
}

/**
 * Get all conversations for a client
 * @param {string} clientId - The ID of the client
 * @returns {Array} List of conversations
 */
export function getClientConversations(clientId) {
  return Array.from(conversations.values())
    .filter(conv => conv.clientId === clientId);
}
