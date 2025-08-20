import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import { fileURLToPath } from 'url';
import path from 'path';
import { logger } from '../utils/logger.js';
import { setupRoutes } from './api/routes.js';
import { handleWebSocketConnection } from './ws-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Start the web server
 * @param {Object} options - Server options
 * @param {number} [options.port=3000] - Port to listen on
 * @param {string} [options.host='0.0.0.0'] - Host to bind to
 * @returns {Promise<import('fastify').FastifyInstance>} The Fastify server instance
 */
export async function startServer(options = {}) {
  const { port = 3000, host = '0.0.0.0' } = options;
  
  // Create Fastify instance
  const fastify = Fastify({
    logger: logger,
    disableRequestLogging: process.env.NODE_ENV === 'production',
  });

  try {
    // Register plugins
    await fastify.register(fastifyWebsocket, {
      options: {
        maxPayload: 1048576, // 1MB
        clientTracking: true,
      },
    });
    
    // Serve static files from the public directory
    await fastify.register(fastifyStatic, {
      root: path.join(process.cwd(), 'public'),
      prefix: '/',
      wildcard: false,
      setHeaders: (res, path) => {
        // Set cache control headers for static assets
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.svg')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    });

    // Register API routes
    await fastify.register(setupRoutes, { prefix: '/api' });

    // Handle WebSocket connections
    fastify.register(async (fastify) => {
      fastify.get('/ws', { websocket: true }, (connection, request) => {
        // Handle WebSocket connection
        handleWebSocketConnection(connection.socket, request);
        
        // Handle client disconnection
        connection.socket.on('close', () => {
          logger.debug('Client disconnected');
        });
        
        // Handle errors
        connection.socket.on('error', (error) => {
          logger.error('WebSocket error:', error);
        });
      });
    });

    // Handle 404 for API routes
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({ error: 'Not Found', message: 'API endpoint not found' });
      }
      // For non-API routes, serve index.html for SPA routing
      return reply.sendFile('index.html');
    });

    // Start the server
    await fastify.listen({ port, host });
    logger.info(`Server listening on http://${host}:${port}`);
    
    return fastify;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// If this file is run directly, start the server
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer({
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    isDev: process.env.NODE_ENV === 'development',
  }).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
