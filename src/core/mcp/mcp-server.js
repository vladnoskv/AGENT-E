#!/usr/bin/env node

import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

class MCPServer {
  constructor(port = 3001) {
    this.port = port;
    this.server = null;
  }

  start() {
    this.server = createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
      }

      if (req.method === 'POST' && req.url === '/api/files') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const { action, path, content } = JSON.parse(body);
            const result = this.handleFileOperation(action, path, content);
            res.writeHead(200);
            res.end(JSON.stringify(result));
          } catch (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    this.server.listen(this.port, () => {
      console.log(`MCP Server running on http://localhost:${this.port}`);
    });
  }

  handleFileOperation(action, filePath, content) {
    const fullPath = resolve(filePath);

    switch (action) {
      case 'read':
        if (!existsSync(fullPath)) {
          throw new Error(`File not found: ${fullPath}`);
        }
        return {
          content: readFileSync(fullPath, 'utf8'),
          size: statSync(fullPath).size,
          modified: statSync(fullPath).mtime
        };

      case 'write':
        writeFileSync(fullPath, content);
        return { success: true, message: 'File written successfully' };

      case 'list':
        const items = readdirSync(fullPath).map(item => {
          const itemPath = join(fullPath, item);
          const stats = statSync(itemPath);
          return {
            name: item,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime
          };
        });
        return { items };

      case 'exists':
        return { exists: existsSync(fullPath) };

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('MCP Server stopped');
    }
  }
}

// Start server if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MCPServer();
  server.start();

  process.on('SIGINT', () => {
    server.stop();
    process.exit(0);
  });
}

export { MCPServer };