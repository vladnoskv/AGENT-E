# 🚀 AGENT-E CLI Usage Guide

Welcome to AGENT-E - the colorful multi-agent AI CLI system! This guide will get you up and running quickly.

## 📋 Quick Start

### 1. Installation & Setup
```bash
# Clone the repository
git clone [your-repo-url]
cd nvidia-gpt-cli

# Install dependencies
npm install

# Configure your API key
echo "api_key=your_nvidia_api_key_here" > .env
```

### 2. Launch the AGENT-E Interface
```bash
# Method 1: Direct launch
node agentx.js

# Method 2: Via npm script
npm run agentx

# Method 3: Global command (after npm link)
agentx
```

### 3. Basic Commands

#### 🎨 AGENT-E Visual Interface
- **Interactive Mode**: `node agentx.js`
- **Help**: `node agentx.js --help`
- **Chat Mode**: Select "🚀 Interactive Chat" from menu
- **Multi-Agent Tasks**: Select "🤖 Multi-Agent Tasks"

#### 🔧 Multi-Agent Commands
```bash
# List all available agents
node multi-agent.js agents

# Run a task with all agents
node multi-agent.js run "Analyze this codebase for security issues"

# Run with verbose output
node multi-agent.js run "Create documentation" --verbose

# Use specific agent
node multi-agent.js agent code-analyzer "Review authentication system"

# Run demo with detailed logs
node multi-agent.js demo "Create a REST API"
```

#### 📁 File Operations
```bash
# List files in current directory
npm start files --list

# Read a file
npm start files --read ./package.json

# Search files
npm start files --search "TODO" --pattern "*.js"
```

### 4. Available Agents

| Agent | Command | Best For |
|-------|---------|----------|
| **Master** | `agent master` | Task coordination |
| **CodeAnalyzer** | `agent code-analyzer` | Code reviews & analysis |
| **DocumentationWriter** | `agent documentation-writer` | Creating docs |
| **BugFixer** | `agent bug-fixer` | Debugging & fixes |
| **Architect** | `agent architect` | System design |
| **SecurityExpert** | `agent security-expert` | Security analysis |

### 5. Interactive Examples

#### Example 1: Code Analysis
```bash
# Launch AGENTX
node agentx.js

# Select: 🤖 Multi-Agent Tasks
# Enter: "Analyze the authentication system for security vulnerabilities"
```

#### Example 2: Documentation Generation
```bash
# Direct command
node multi-agent.js run "Create comprehensive README for this project"
```

#### Example 3: Bug Investigation
```bash
# Interactive chat
node agentx.js
# Select: 🚀 Interactive Chat
# Ask: "Why is my Express server not starting?"
```

### 6. Environment Variables

Create `.env` file:
```bash
# Required
api_key=your_nvidia_api_key_here

# Optional
AGENT_TIMEOUT=60
PROMPTS_DIR=./custom-prompts
DEBUG=false
```

### 7. Troubleshooting

#### No Output?
```bash
# Check Node version
node --version  # Should be 16+

# Check API key
grep api_key .env

# Test basic functionality
node -e "console.log('AGENTX working!')"
```

#### API Issues?
```bash
# Test API connectivity
node -e "import('./tools/ai-assistant.js').then(m => new m.AIAssistant().testConnection())"
```

#### Agent Not Found?
```bash
# Verify agents
ls prompts/agents/
node multi-agent.js agents
```

### 8. Keyboard Shortcuts in AGENTX

- **↑/↓**: Navigate menu options
- **Enter**: Select option
- **ESC**: Go back/exit chat
- **Ctrl+C**: Exit application

### 9. File Structure Overview

```
nvidia-gpt-cli/
├── agentx.js          # 🎨 Colorful AGENTX interface
├── multi-agent.js     # 🤖 Multi-agent orchestration
├── agent.js          # 🧠 Single agent implementation
├── prompts/          # 📝 Agent personalities
├── tools/           # 🔧 Utility functions
├── package.json     # 📦 Dependencies
└── USAGE.md        # 📖 This file!
```

### 10. Next Steps

1. **Try the demo**: `node multi-agent.js demo "Create a simple API"`
2. **Explore agents**: `node multi-agent.js agents`
3. **Create custom prompts**: Edit files in `prompts/agents/`
4. **Contribute**: Add new agents or improve existing ones

---

**Version**: AGENT-E v0.0.1
**Status**: Beta - Ready for testing and feedback