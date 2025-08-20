# 🤖 AGENT-X - Multi-Agent AI System with Web Interface

A powerful Node.js-based framework for building and orchestrating AI agents with a modern web interface and CLI. Supports multiple AI models including NVIDIA's NIM API, with built-in WebSocket support for real-time communication.

## 🚀 Features

- **Modern Web Interface**: Built with Fastify and WebSockets for real-time interaction
- **Modular Architecture**: Easily extensible with new models and tools
- **Multi-Model Support**: Integrated with NVIDIA's AI models and other providers
- **Real-time Communication**: WebSocket support for interactive experiences
- **CLI & Web**: Use via command line or web interface
- **Extensible**: Add custom models, tools, and workflows
- **Logging & Monitoring**: Built-in logging with Pino for observability
- **RESTful API**: Full-featured API for integration with other services

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- NVIDIA API key (for NVIDIA models)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/agentx.git
   cd agentx
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:
   ```env
   # Required
   NVIDIA_API_KEY=your-nvidia-api-key-here
   
   # Optional
   PORT=3000
   HOST=localhost
   LOG_LEVEL=info
   NODE_ENV=development
   ```

### Starting the Web Interface

Start the web server:
```bash
npm run web
```

Then open http://localhost:3000 in your browser.

### Using the CLI

Start an interactive chat session:
```bash
npm run chat
```

Or use specific commands:
```bash
# Start the web interface
agentx web --port 3000

# Start a chat session
agentx chat --model nvidia/qwen2.5-coder-32b

# Execute a single prompt
agentx exec "Your prompt here" --model nvidia/llama3.1-nemotron-70b
```

## 🏗️ Architecture

AGENT-X is built with a modular architecture that separates concerns and makes it easy to extend:

```
src/
├── index.js          # Main CLI entry point
├── web/             # Web server and API
│   ├── server.js     # Fastify server setup
│   ├── api/          # REST API routes
│   └── ws-handler.js # WebSocket message handling
├── models/          # AI model implementations
│   ├── registry.js   # Model registration and management
│   └── nvidia.js     # NVIDIA model integration
├── services/        # Business logic
│   └── agent-service.js # Core agent functionality
└── utils/           # Utilities
    └── logger.js     # Logging configuration
```

### Key Components

1. **Web Server**: Fastify-based server with WebSocket support
2. **API Layer**: RESTful endpoints for model interaction
3. **WebSocket**: Real-time communication for chat and updates
4. **Model Registry**: Centralized model management
5. **Agent Service**: Core logic for processing requests
6. **CLI**: Command-line interface for interaction

## 🔌 Available Models

AGENT-X supports various AI models through a unified interface:

### NVIDIA Models
- `nvidia/qwen2.5-coder-32b`: Qwen 2.5 Coder 32B for code generation
- `nvidia/llama3.1-nemotron-70b`: Llama 3.1 Nemotron 70B for general purpose
- `nvidia/llama3.3-nemotron-super-49b`: Llama 3.3 Nemotron Super 49B (preview)

### Adding Custom Models

You can register custom models by implementing the `BaseModel` interface and registering them in the model registry.

```javascript
// Example model implementation
class MyCustomModel extends BaseModel {
  async generate(prompt, options = {}) {
    // Your implementation here
  }
}

// Register the model
import { registerModel } from './models/registry.js';

registerModel('my-model', {
  factory: (config) => new MyCustomModel(config),
  config: {
    description: 'My custom model',
    parameters: {
      // Model parameters
    }
  }
});
```

## 🌐 Web Interface

The web interface provides a user-friendly way to interact with AGENT-X:

- **Chat Interface**: Real-time chat with AI models
- **Model Selection**: Switch between different models
- **Conversation History**: View and manage past conversations
- **Settings**: Configure model parameters and preferences

## 🛠️ Development

### Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open http://localhost:3000

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NVIDIA_API_KEY` | NVIDIA API key | Required |
| `PORT` | Web server port | 3000 |
| `HOST` | Web server host | localhost |
| `LOG_LEVEL` | Logging level | info |
| `NODE_ENV` | Environment | development |

### Testing

Run the test suite:
```bash
npm test
```

### Building

Create a production build:
```bash
npm run build
```

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

For detailed documentation, please visit our [documentation website](https://agentx-docs.example.com).

## 🙏 Acknowledgments

- [NVIDIA](https://www.nvidia.com/) for their powerful AI models
- [Fastify](https://www.fastify.io/) for the amazing web framework
- The open-source community for their contributions
python cli.py run nv-embed-v1 --file document.txt --output embeddings.json
```

## 📚 Model Types

### 1. Large Language Models (LLM)
- `dbrx-instruct`: General purpose instruction following
- `codegemma-7b`: Specialized for code generation and understanding
- `gemma-2-7b`: High-quality general purpose model

### 2. Retrieval Models
- `nv-embed-v1`: General-purpose text embeddings
- `nemo-retriever`: Hybrid search with NeMo Retriever
- `nemo-reranker`: Advanced result reranking
- `nv-embedqa-1b`: Specialized for question answering

### 3. Visual Models
- `flux-1`: High-quality image generation
- `bria-2.3`: Advanced image generation with fine control
- `ai-detector`: Detect AI-generated images

## 🔧 Advanced Usage

### Using Model Parameters
Most models accept additional parameters. For example, to control temperature and max tokens:
```bash
python cli.py run dbrx-instruct --prompt "Write a short story" --params '{"temperature": 0.7, "max_tokens": 500}'
```

### Batch Processing
Process multiple inputs from a file:
```bash
# Create an input file
cat > prompts.txt << EOL
A serene mountain landscape
A busy city street at night
An underwater coral reef
EOL

# Process each line as a separate prompt
while IFS= read -r line; do
    python cli.py run flux-1 --prompt "$line" --output "output_${RANDOM}.png"
done < prompts.txt
```

## 🧩 Extending the System

### Adding a New Model
1. Create a new model class in the appropriate module (llm, retrieval, or visual)
2. Register it in the `ModelRegistry` class in `models/registry.py`
3. The model will automatically be available through the CLI

### Custom Model Parameters
Each model can define its own parameters in the registry:
```python
self.register_model(
    name="my-model",
    description="My custom model",
    model_class=MyCustomModel,
    model_type=ModelType.LLM,
    default_params={
        "temperature": 0.7,
        "max_tokens": 1000
    }
)
```

## 🌍 Internationalization (i18n) Support

The application includes built-in support for internationalization using the i18ntk library. This allows for easy translation of all user-facing text into multiple languages.

### Available Languages

Currently supported languages:
- English (en) - Default
- Russian (ru) - Русский

### Using Translations in Code

1. **Initialize the i18n system** in your application's entry point:

```javascript
import i18n from './src/utils/i18n';

// Initialize with default language
await i18n.init({
  language: 'en', // Default language
  fallbackLanguage: 'en', // Fallback if translation is missing
  preload: true // Preload all languages
});
```

2. **Translate text** in your components:

```javascript
import { t, tPlural } from './src/utils/i18n';

// Simple translation
const greeting = t('common.greeting', { name: 'User' });
// Output: "Hello, User!" (en) or "Привет, User!" (ru)

// Pluralization
const messageCount = 5;
const messages = tPlural('common.messages', messageCount, { count: messageCount });
// Output: "5 messages" (en) or "5 сообщений" (ru)
```

3. **Change language** at runtime:

```javascript
import { changeLanguage, getAvailableLanguages } from './src/utils/i18n';

// Get available languages
const languages = getAvailableLanguages(); // ['en', 'ru']

// Change language
await changeLanguage('ru');
```

### Adding New Languages

1. Create a new directory in the `translations` folder with the language code (e.g., `es` for Spanish)
2. Add JSON files with the same names as in the `en` directory
3. Add your translations following the same structure as the English files

Example for Spanish (`es/common.json`):
```json
{
  "greeting": "¡Hola, {name}!",
  "welcome": "Bienvenido a nuestra aplicación",
  "messages": {
    "one": "Tienes 1 mensaje",
    "other": "Tienes {count} mensajes"
  }
}
```

### Translation File Structure

The translations are organized by language code and namespace. Each namespace corresponds to a feature or section of the application.

```
translations/
├── en/                 # English translations
│   ├── common.json     # Common strings used across the app
│   ├── chat.json       # Chat interface translations
│   └── ...
└── ru/                # Russian translations
    ├── common.json
    ├── chat.json
    └── ...
```

### Best Practices

1. **Use namespacing**: Group related translations under specific namespaces (e.g., 'common', 'chat', 'settings')
2. **Keep keys consistent**: Use the same keys across all language files
3. **Use parameters**: For dynamic content, use parameters (e.g., `Hello, {name}!`)
4. **Handle plurals**: Use the `tPlural` function for count-based pluralization
5. **Fallback**: Always provide a default value for missing translations

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
node AGENT-X.js     # Alias for menu
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