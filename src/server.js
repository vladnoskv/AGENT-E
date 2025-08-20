import fastify from 'fastify';
import { handleWebSocketConnection } from './web/ws-handler.js';
import { logger } from './utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = fastify({ logger: true });

// Enable WebSocket support
app.register(import('@fastify/websocket'));

// Serve static files from public directory
app.register(import('@fastify/static'), {
  root: join(__dirname, 'public'),
  prefix: '/',
});

// WebSocket endpoint
app.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    handleWebSocketConnection(connection.socket, req);
  });
});

// Start the server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    logger.info(`Server is running on http://${host}:${port}`);
  } catch (err) {
    logger.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
