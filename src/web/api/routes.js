import { Router } from 'express';
import { getModel, listModels, getDefaultModel } from '../../models/registry.js';
import { getConversation, getClientConversations } from '../../services/agent-service.js';
import { logger } from '../../utils/logger.js';

export default function createRouter() {
  const router = Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // List available models
  router.get('/models', async (req, res, next) => {
    try {
      const models = listModels();
      res.json({ models });
    } catch (error) {
      next(error);
    }
  });

  // Get model details
  router.get('/models/:modelId', async (req, res, next) => {
    try {
      const { modelId } = req.params;
      const model = await getModel(modelId);
      res.json({ model });
    } catch (error) {
      next(error);
    }
  });

  // Get conversation history
  router.get('/conversations/:conversationId', (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const conversation = getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      res.json({ conversation });
    } catch (error) {
      next(error);
    }
  });

  // List conversations for the current client
  router.get('/conversations', (req, res, next) => {
    try {
      // In a real app, you'd get the client ID from the auth token
      const clientId = req.headers['x-client-id'] || 'anonymous';
      const conversations = getClientConversations(clientId);
      res.json({ conversations });
    } catch (error) {
      next(error);
    }
  });

  // Chat completion endpoint
  router.post('/chat', async (req, res, next) => {
    try {
      const { messages, model: modelId, conversationId } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      const model = modelId ? await getModel(modelId) : await getDefaultModel();
      
      // Add the conversation to the store if it's a new one
      if (conversationId && !getConversation(conversationId)) {
        // In a real app, you'd create a new conversation in the database
        logger.info(`New conversation started: ${conversationId}`);
      }

      // Get the response from the model
      const response = await model.generate({
        messages,
        temperature: 0.7,
        maxTokens: 2000,
      });

      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: modelId || 'default',
        choices: [
          {
            message: {
              role: 'assistant',
              content: response.content,
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: response.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      });
    } catch (error) {
      logger.error('Error in chat completion:', error);
      next(error);
    }
  });

  // Tool execution endpoint
  router.post('/tools/execute', async (req, res, next) => {
    try {
      const { tool, parameters } = req.body;
      
      if (!tool) {
        return res.status(400).json({ error: 'Tool name is required' });
      }
      
      // In a real app, you'd have a tool registry and execute the tool here
      logger.info(`Executing tool: ${tool}`, { parameters });
      
      // Simulate tool execution
      const result = {
        tool,
        result: `Result of ${tool} execution`,
        timestamp: new Date().toISOString(),
      };
      
      res.json(result);
    } catch (error) {
      logger.error('Error executing tool:', error);
      next(error);
    }
  });

  return router;
}
