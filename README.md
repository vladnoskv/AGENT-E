# 🤖 AGENT-E - Agent Everything - Enhanced NVIDIA GPT-OSS-20B CLI

A sophisticated multi-agent CLI system that orchestrates specialized agents for complex tasks, built on NVIDIA's GPT-OSS-20B API.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- NVIDIA API key

### Installation
```bash
npm install
```

### Setup API Key
```bash
cp .env.example .env
# Edit .env and add your NVIDIA_API_KEY
```

## 📋 Available Commands

### Interactive Menu System
```bash
node menu.js        # Main menu with all options
node agent-e.js     # Alias for menu
```

### Direct Commands
```bash
# Basic modes
node chat.js "Hello, how are you?"          # Direct chat
node response.js "Explain quantum computing" # Direct response

# Advanced orchestration
node agent-orchestrator.js "Add error handling to server.js" --file server.js
node test-agent-system.js                    # Run validation tests

# MCP Server
node mcp-server.js                          # Start file system server
```

## 🎯 System Components

### 1. **Agent Orchestrator** (`agent-orchestrator.js`)
- **Master Agent**: Task analysis and synthesis
- **Code Agent**: File analysis and editing
- **Documentation Agent**: Documentation generation
- **Testing Agent**: Test creation and validation

**Features:**
- ✅ Hidden thinking processes (spinners instead of verbose output)
- ✅ File system integration via MCP
- ✅ Multi-agent task coordination
- ✅ Automatic validation and testing

### 2. **Chat & Response Modes**
- **chat.js**: Interactive conversation mode
- **response.js**: Direct API response mode

### 3. **MCP Server** (`mcp-server.js`)
- File system access for agents
- RESTful API endpoints
- Cross-origin support

### 4. **Test Suite** (`test-agent-system.js`)
- Validates agent functionality
- File editing tests
- Orchestration validation

## 🔧 Usage Examples

### File Editing with Agents
```bash
# Edit a specific file
node agent-orchestrator.js "Add error handling to server.js" --file server.js

# Show thinking process
node agent-orchestrator.js "Create unit tests for utils.js" --show-thinking

# General analysis
node agent-orchestrator.js "Review my codebase for security issues"
```

### Interactive Testing
```bash
# Run full system validation
node test-agent-system.js

# Test specific components
node agent-orchestrator.js --help
```

### MCP Integration
```bash
# Start MCP server
node mcp-server.js

# Use with agents (automatic)
# Agents will use MCP for file operations
```

## 🎛️ Menu System

The interactive menu provides:
1. **Chat Mode** - Direct NVIDIA API chat
2. **Response Mode** - Direct API responses
3. **Agent Orchestrator** - Multi-agent task processing
4. **Test System** - Validate functionality
5. **Exit** - Clean shutdown

## 📊 Agent Architecture

```
User Request → Master Agent → Task Analysis
                     ↓
            Sub-Agents Dispatch
                     ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   Code Agent   Documentation   Testing Agent
        ↓             ↓             ↓
        └─────────────┼─────────────┘
                     ↓
            Response Synthesis
                     ↓
              Final Output
```

## 🔍 MCP Endpoints

The MCP server runs on `http://localhost:3001`:

- `GET /health` - Server status
- `POST /api/files` - File operations

**Supported operations:**
- `read` - Read file content
- `write` - Write/overwrite files
- `list` - List directory contents
- `exists` - Check file existence

## 🧪 Testing

### Run Validation Tests
```bash
# Full system test
node test-agent-system.js

# Manual testing
node agent-orchestrator.js "Create a test file" --show-thinking
```

### Test Coverage
- ✅ Agent dispatch functionality
- ✅ File editing capabilities
- ✅ Multi-agent orchestration
- ✅ Error handling
- ✅ API integration

## 🔐 Environment Variables

Create `.env` file:
```bash
# Required
NVIDIA_API_KEY="your-nvidia-key-here"

# Optional
MCP_PORT=3001
AGENTE_SHOW_THINKING=false
```

## 📦 Dependencies

**Core:**
- `openai` - NVIDIA API integration
- `dotenv` - Environment management
- `chalk` - Terminal colors
- `ora` - Loading spinners

**File System:**
- Built-in Node.js `fs` module
- Custom MCP server for enhanced access

## 🚀 Getting Started

1. **Install & Setup:**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your NVIDIA key
   ```

2. **Test the system:**
   ```bash
   node test-agent-system.js
   ```

3. **Start using:**
   ```bash
   node menu.js
   # or
   node agent-orchestrator.js "Create a simple calculator"
   ```

## 🔍 Troubleshooting

### Common Issues

**API Key Missing:**
```
Error: NVIDIA_API_KEY or api_key not found in .env
```
- Solution: Add your key to `.env`

**File Permission Errors:**
- Ensure Node.js has write access to your project directory
- Check file paths are correct

**Network Issues:**
- Verify NVIDIA API key is valid
- Check internet connectivity

### Debug Mode
```bash
# Show agent thinking process
node agent-orchestrator.js "your task" --show-thinking
```

## 📈 Performance Tips

- Use `--show-thinking` only for debugging
- Leverage file-based tasks for better context
- Run validation tests before production use
- Use MCP server for file operations instead of direct FS calls

---

**Built with ❤️ using NVIDIA GPT-OSS-20B**