# 🎯 AGENT-E Expert System - Hyper-Specialized AI Agents

## Overview

A revolutionary AI system featuring **hyper-expert agents** that specialize in single domains, maintain up-to-date knowledge, and provide focused, contamination-free analysis using the existing `prompts/` directory structure.

## 🚀 Key Features

### ✅ Hyper-Expert Focus
- **Single-domain expertise** - Each agent focuses on one specific area
- **Contamination-free** - No cross-domain advice or confusion
- **Expert-level depth** - Deep specialization in chosen domain

### ✅ Knowledge Freshness
- **Date tracking** - Shows last knowledge update for each agent
- **Web search integration** - Fetches latest information when needed
- **Gap identification** - Alerts when technology is newer than knowledge base

### ✅ Prompt-Based Architecture
- Uses existing `prompts/` directory structure
- `prompts/agents/` contains specialized agent prompts
- Dynamic prompt updates with latest knowledge

## 🎯 Expert Agents

| Agent | Domain | Expertise | Web Search |
|-------|--------|-----------|------------|
| **code-analyzer** | Code Quality | Static analysis, performance, security | ✅ |
| **documentation-writer** | Technical Writing | API docs, tutorials, guides | ❌ |
| **bug-fixer** | Debugging | Error diagnosis, troubleshooting | ❌ |
| **architect** | System Design | Architecture patterns, scalability | ✅ |
| **security-expert** | Security | Vulnerability assessment, compliance | ✅ |

## 📁 File Structure

```
AGENTX/
├── prompts/
│   ├── master-agent.md          # Master orchestrator prompt
│   └── agents/
│       ├── code-analyzer.md     # Code analysis expertise
│       ├── documentation-writer.md # Documentation expertise
│       ├── bug-fixer.md         # Debugging expertise
│       ├── architect.md         # Architecture expertise
│       └── security-expert.md   # Security expertise
├── knowledge/                   # Generated knowledge updates
├── expert-agent-system.js       # Main expert system
├── hyper-expert-orchestrator.js # Agent orchestration
├── knowledge-updater.js         # Knowledge management
└── test-expert-system.js        # Validation tests
```

## 🚀 Quick Start

### 1. Initialize System
```bash
# Update expert knowledge
npm run update-knowledge

# Or manually:
node knowledge-updater.js check
```

### 2. Use Expert Agents
```bash
# Interactive mode
node expert-agent-system.js

# Direct usage
node expert-agent-system.js analyze "Check security" --agent security-expert
```

### 3. Via Menu System
```bash
npm start
# Select option 5: Expert Agents
```

## 🎛️ Menu Integration

Updated menu includes expert agents as option 5 and knowledge updates as option 6.

## 🔍 Advanced Features

- **Date-aware responses** with knowledge cutoff dates
- **Expertise boundaries** preventing contamination
- **Knowledge gap identification** for newer technologies
- **Web search integration** for critical agents
- **Prompt-based specialization** using existing prompts/

## 🧪 Testing

```bash
npm run test-expert    # Validate expert system
node expert-agent-system.js benchmark  # Performance tests
```

---

**Built with ❤️ using NVIDIA GPT-OSS-20B and hyper-expert specialization**