# 🤝 Contributing to AGENT-X

Thank you for your interest in contributing to AGENT-X! This guide will help you get started with contributing to our multi-agent AI system.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (we test with v18, v20, v22)
- **Git** for version control
- **NVIDIA API Key** (for testing)

### Development Setup
```bash
# 1. Fork the repository
git clone https://github.com/vladnoskv/AGENT-X.git
cd AGENT-X

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your NVIDIA_API_KEY

# 4. Run tests to verify setup
npm test

# 5. Start development mode
npm run dev
```

## 🎯 Contribution Types

### 🐛 Bug Reports
- **Use GitHub Issues** with the `bug` label
- **Include reproduction steps**
- **Add error logs and screenshots**
- **Specify environment details**

### ✨ Feature Requests
- **Use GitHub Issues** with the `enhancement` label
- **Describe the use case**
- **Propose implementation approach**
- **Consider backward compatibility**

### 🔧 Code Contributions
- **Bug fixes**: Small, focused changes
- **New features**: Larger, well-tested additions
- **Documentation**: README, examples, guides
- **Tests**: Unit, integration, and e2e tests

## 🏗️ Development Workflow

### Branch Strategy
```bash
# Feature branches
git checkout -b feature/multi-api-support
git checkout -b fix/agent-timeout-issue
git checkout -b docs/improve-readme

# Naming convention
feature/description
fix/issue-description
docs/what-you-updated
test/what-you-tested
```

### Code Quality
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm test

# Run specific test
npm run test:unit
npm run test:integration
```

### Commit Messages
Use conventional commits:
```
feat: add OpenAI API support
fix: resolve agent timeout issue
docs: update installation guide
test: add unit tests for agent.js
refactor: improve error handling
style: fix formatting issues
```

## 🧪 Testing

### Test Structure
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data
```

### Writing Tests
```javascript
// Example unit test
describe('CodeAnalyzer Agent', () => {
  it('should analyze code quality', async () => {
    const result = await codeAnalyzer.analyze('const x = 1;');
    expect(result.quality).toBe('good');
  });
});
```

### Running Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific test
npm test -- --grep "CodeAnalyzer"
```

## 📁 Project Structure

```
agentx/
├── main/                    # CLI entry points
│   ├── AGENT-X.js          # Main CLI application
│   └── multi-agent.js      # Multi-agent orchestration
├── utils/                   # Core utilities
│   ├── agent.js           # Agent base class
│   └── helpers.js         # Helper functions
├── prompts/                 # Agent personalities
│   ├── master-agent.md
│   └── agents/
├── components/              # UI components
│   ├── header.js          # AGENT-X header
│   └── menu.js            # Interactive menu
├── tests/                   # Test suites
├── .github/                 # GitHub workflows
│   └── workflows/
│       └── release.yml
├── docs/                    # Documentation
└── examples/                # Usage examples
```

## 🎨 Code Style

### JavaScript Style Guide
- **ES6+ features**: Use modern JavaScript
- **Async/await**: Prefer over callbacks
- **Error handling**: Use try/catch with proper error messages
- **Naming**: camelCase for variables, PascalCase for classes
- **Comments**: JSDoc for functions, inline for complex logic

### Example Code Style
```javascript
/**
 * Analyzes code quality using the CodeAnalyzer agent
 * @param {string} code - The code to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeCode(code, options = {}) {
  try {
    const analyzer = new CodeAnalyzerAgent();
    const result = await analyzer.analyze(code, options);
    
    return {
      quality: result.quality,
      issues: result.issues,
      suggestions: result.suggestions
    };
  } catch (error) {
    throw new Error(`Code analysis failed: ${error.message}`);
  }
}
```

    ╔═════════════════════════════════════════════════════════════════════╗
    ║                                                                     ║
    ║   █████╗   ██████╗  ███████╗ ███╗   ██╗ ████████╗       ██╗  ██╗    ║
    ║  ██╔══██╗ ██╔═════╗ ██╔════╝ ████╗  ██║ ╚══██╔══╝       ╚██╗██╔╝    ║
    ║  ███████║ ██║ ████║ █████╗   ██╔██╗ ██║    ██║    ███    ╚███╔╝     ║
    ║  ██╔══██║ ██║   ██║ ██╔══╝   ██║╚██╗██║    ██║    ███    ██╔██╗     ║
    ║  ██║  ██║ ╚██████╔╝ ███████╗ ██║ ╚████║    ██║    ╚═╝   ██╔╝ ██╗    ║
    ║  ╚═╝  ╚═╝  ╚═════╝  ╚══════╝ ╚═╝  ╚═══╝    ╚═╝          ╚═╝  ╚═╝    ║
    ║                                                                     ║
    ╚═════════════════════════════════════════════════════════════════════╝


## 🔧 Development Guidelines

### Agent Development
When creating new agents:
1. **Create prompt file** in `prompts/agents/`
2. **Extend base Agent class**
3. **Add tests** in appropriate test directory
4. **Update documentation**
5. **Add to agent registry**

### API Integration
For new API providers:
1. **Create provider class** in `utils/providers/`
2. **Implement required methods**
3. **Add configuration options**
4. **Write comprehensive tests**
5. **Update README**

### UI Components
For new UI features:
1. **Use existing component patterns**
2. **Maintain accessibility**
3. **Add visual tests**
4. **Document usage**

## 📋 Pull Request Process

### Before Submitting
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated
- [ ] Examples added/updated
- [ ] CHANGELOG.md updated (if applicable)

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Breaking change

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

### Review Process
1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** in different environments
4. **Documentation** review
5. **Merge** after approval

## 🐛 Debugging

### Common Issues
```bash
# Agent timeout
export AGENTE_TIMEOUT=60000

# API key issues
echo $NVIDIA_API_KEY

# Debug mode
export AGENTE_DEBUG=true
```

### Debug Tools
```bash
# Verbose logging
npm run dev -- --verbose

# Agent debugging
DEBUG=agent:* npm start

# Performance profiling
npm run profile
```

## 📞 Getting Help

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and ideas
- **Discord**: [AGENT-X Community](https://discord.gg/AGENT-X)
- **Email**: maintainers@AGENT-X.dev

### Before Asking for Help
1. **Check existing issues**
2. **Read documentation**
3. **Try debug suggestions**
4. **Provide environment info**

## 🏆 Recognition

### Contributors
We recognize all contributors:
- **GitHub contributors** listed automatically
- **CHANGELOG.md** mentions
- **README.md** acknowledgments
- **Discord role** for active contributors

### Hall of Fame
Outstanding contributors will be:
- **Added to AUTHORS file**
- **Invited as maintainers**
- **Featured in release notes**

## 📄 License

By contributing to AGENT-X, you agree that your contributions will be licensed under the MIT License.

---

**Happy coding!** 🚀

**Questions?** Open an issue or join our [Discord community](https://discord.gg/AGENT-X)