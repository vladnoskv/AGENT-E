# Build stage
FROM node:20-slim AS builder

# Install Python and build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY requirements.txt ./

# Install Node.js dependencies and build tools
RUN npm ci

# Install Babel and JSX transform
RUN npm install --save-dev @babel/core @babel/preset-react

# Create and activate a virtual environment for Python
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies in the virtual environment
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Build the application if needed
# RUN npm run build

# Production stage
FROM node:20-slim

# Install Python runtime
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /opt/venv /opt/venv

# Set up Python virtual environment
ENV PATH="/opt/venv/bin:$PATH"

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONPATH=/app

# Create a non-root user and set permissions
# Create app directory first to avoid permission issues
RUN mkdir -p /app && chown -R agentx:agentx /app
USER agentx
WORKDIR /app

# Copy files with the correct ownership in one layer
COPY --chown=agentx:agentx --from=builder /app/node_modules ./node_modules
COPY --chown=agentx:agentx --from=builder /opt/venv /opt/venv
COPY --chown=agentx:agentx --from=builder /app/agent /app/agent
COPY --chown=agentx:agentx --from=builder /app/src /app/src
COPY --chown=agentx:agentx --from=builder /app/bin /app/bin
COPY --chown=agentx:agentx --from=builder /app/package.json /app/
    # babel.config.json will be created if it doesn't exist

# Add node_modules/.bin to PATH
ENV PATH="/app/node_modules/.bin:${PATH}"

# Create a babel config file if it doesn't exist
RUN if [ ! -f /app/babel.config.json ]; then \
    echo '{ "presets": ["@babel/preset-react"] }' > /app/babel.config.json; \
    fi

# Set working directory
WORKDIR /app

# Set the entry point with babel-node for JSX support
ENTRYPOINT ["babel-node", "--presets", "@babel/preset-react", "./bin/agentx.js"]
CMD ["menu"]
