class WebSocketClient {
  constructor(url = 'ws://localhost:3000/ws') {
    this.url = url;
    this.socket = null;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000; // 3 seconds
    this.connected = false;
    this.messageQueue = [];
  }

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = (event) => {
          console.log('WebSocket connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.flushMessageQueue();
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected');
          this.connected = false;
          this.handleReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, this.reconnectInterval);
  }

  sendMessage(type, data) {
    const message = { type, data };
    
    if (!this.connected) {
      console.log('WebSocket not connected, queuing message:', message);
      this.messageQueue.push(message);
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
      this.messageQueue.push(message);
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message.type, message.data);
    }
  }

  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type).add(handler);
  }

  off(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
    }
  }

  handleMessage(message) {
    if (!message || !message.type) {
      console.warn('Received invalid message format:', message);
      return;
    }

    if (this.messageHandlers.has(message.type)) {
      this.messageHandlers.get(message.type).forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          console.error(`Error in ${message.type} handler:`, error);
        }
      });
    } else {
      console.warn(`No handlers registered for message type: ${message.type}`);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }
}

// Create a singleton instance
const webSocketClient = new WebSocketClient();

export default webSocketClient;
