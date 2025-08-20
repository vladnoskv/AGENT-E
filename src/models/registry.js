import { logger } from '../utils/logger.js';
import { NVIDIAModel } from './nvidia.js';
import { SimpleModel } from './simple-model.js';

// Model registry
const modelRegistry = new Map();

// Default model configuration
const DEFAULT_MODEL_CONFIG = {
  temperature: 0.7,
  maxTokens: 2000,
  topP: 0.9,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
};

// Initialize default models
async function initializeDefaultModels() {
  try {
    // Register NVIDIA models
    registerModel('nvidia/qwen2.5-coder-32b', {
      factory: (config) => new NVIDIAModel({
        modelName: 'qwen/qwen2.5-coder-32b-instruct',
        ...config,
      }),
      config: {
        ...DEFAULT_MODEL_CONFIG,
        description: 'Qwen 2.5 Coder 32B - Optimized for code generation and understanding',
      },
    });

    registerModel('nvidia/llama3.1-nemotron-70b', {
      factory: (config) => new NVIDIAModel({
        modelName: 'meta/llama3.1-nemotron-70b-instruct',
        ...config,
      }),
      config: {
        ...DEFAULT_MODEL_CONFIG,
        description: 'Llama 3.1 Nemotron 70B - General purpose model',
      },
    });

    // Register simple echo model
    registerModel('simple-echo', {
      factory: (config) => new SimpleModel(config),
      config: {
        ...DEFAULT_MODEL_CONFIG,
        description: 'Simple echo model for testing',
      },
    });

    // Set default model
    setDefaultModel('simple-echo');
    
    logger.info('Default models initialized');
  } catch (error) {
    logger.error('Failed to initialize default models:', error);
    throw error;
  }
}

/**
 * Register a new model
 * @param {string} modelId - Unique identifier for the model
 * @param {Object} modelInfo - Model information
 * @param {Function} modelInfo.factory - Factory function to create the model instance
 * @param {Object} modelInfo.config - Default configuration for the model
 */
export function registerModel(modelId, { factory, config }) {
  if (modelRegistry.has(modelId)) {
    logger.warn(`Model ${modelId} is already registered and will be overwritten`);
  }
  
  modelRegistry.set(modelId, {
    factory,
    config: { ...DEFAULT_MODEL_CONFIG, ...config },
  });
  
  logger.debug(`Registered model: ${modelId}`);
}

/**
 * Get a model instance
 * @param {string} modelId - The ID of the model to get
 * @param {Object} [config] - Configuration overrides
 * @returns {Promise<Object>} The model instance
 */
export async function getModel(modelId, config = {}) {
  const modelInfo = modelRegistry.get(modelId);
  
  if (!modelInfo) {
    throw new Error(`Model not found: ${modelId}`);
  }
  
  try {
    const model = await modelInfo.factory({
      ...modelInfo.config,
      ...config,
    });
    
    return model;
  } catch (error) {
    logger.error(`Failed to initialize model ${modelId}:`, error);
    throw new Error(`Failed to initialize model: ${error.message}`);
  }
}

/**
 * List all registered models
 * @returns {Array<Object>} List of model information
 */
export function listModels() {
  return Array.from(modelRegistry.entries()).map(([id, { config }]) => ({
    id,
    ...config,
  }));
}

/**
 * Set the default model
 * @param {string} modelId - The ID of the model to set as default
 */
let defaultModelId = null;

export function setDefaultModel(modelId) {
  if (!modelRegistry.has(modelId)) {
    throw new Error(`Cannot set default model: ${modelId} is not registered`);
  }
  
  defaultModelId = modelId;
  logger.info(`Default model set to: ${modelId}`);
}

/**
 * Get the default model
 * @returns {Promise<Object>} The default model instance
 */
export async function getDefaultModel() {
  if (!defaultModelId) {
    throw new Error('No default model has been set');
  }
  
  return getModel(defaultModelId);
}

// Initialize default models when this module is loaded
initializeDefaultModels().catch(error => {
  logger.error('Failed to initialize default models:', error);
});

export default {
  registerModel,
  getModel,
  listModels,
  setDefaultModel,
  getDefaultModel,
};
