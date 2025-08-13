#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findProjectRoot(startDir) {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) return dir;
    dir = path.dirname(dir);
  }
  return startDir;
}

const projectRoot = findProjectRoot(__dirname);
const promptsRoot = path.join(projectRoot, 'prompts');

class HyperExpertOrchestrator {
  constructor() {
    this.agents = {
      'code-analyzer': {
        name: 'Code Analyzer',
        expertise: 'Code quality, bug detection, performance analysis',
        promptFile: 'agents/code-analyzer.md',
        lastUpdated: null,
        requiresWebSearch: false,
      },
      'documentation-writer': {
        name: 'Documentation Writer',
        expertise: 'Technical documentation, API docs, tutorials',
        promptFile: 'agents/documentation-writer.md',
        lastUpdated: null,
        requiresWebSearch: false,
      },
      'bug-fixer': {
        name: 'Bug Fixer',
        expertise: 'Debugging, error resolution, troubleshooting',
        promptFile: 'agents/bug-fixer.md',
        lastUpdated: null,
        requiresWebSearch: false,
      },
      architect: {
        name: 'System Architect',
        expertise: 'System design, architecture decisions, best practices',
        promptFile: 'agents/architect.md',
        lastUpdated: null,
        requiresWebSearch: true,
      },
      'security-expert': {
        name: 'Security Expert',
        expertise: 'Security analysis, vulnerability assessment, secure coding',
        promptFile: 'agents/security-expert.md',
        lastUpdated: null,
        requiresWebSearch: true,
      },
    };

    this.knowledgeBase = {};
    this.webSearchEnabled = false;
  }

  async initialize() {
    console.log(chalk.blue.bold('🎯 Hyper-Expert AI System'));
    console.log(chalk.gray('Initializing specialized agents...'));

    await this.loadAgentPrompts();
    await this.checkKnowledgeUpdates();

    console.log(chalk.green('✅ All agents initialized'));
  }

  async loadAgentPrompts() {
    for (const [agentId, agent] of Object.entries(this.agents)) {
      const promptPath = path.join(promptsRoot, agent.promptFile);

      if (fs.existsSync(promptPath)) {
        const stats = fs.statSync(promptPath);
        agent.lastUpdated = stats.mtime;

        const promptContent = fs.readFileSync(promptPath, 'utf8');
        this.knowledgeBase[agentId] = {
          prompt: promptContent,
          lastUpdated: agent.lastUpdated,
          expertise: agent.expertise,
        };

        console.log(
          chalk.gray(`  📋 ${agent.name} - Last updated: ${agent.lastUpdated.toLocaleDateString()}`)
        );
      }
    }
  }

  async checkKnowledgeUpdates() {
    console.log(chalk.blue('\n🔍 Checking for knowledge updates...'));

    for (const [agentId, agent] of Object.entries(this.agents)) {
      if (agent.requiresWebSearch) {
        console.log(
          chalk.yellow(`  ⚠️  ${agent.name} may require web search for latest updates`)
        );
      }
    }
  }

  async webSearch(query) {
    console.log(chalk.cyan(`🔎 Searching web for: ${query}`));
    return {
      results: [`Latest information on ${query} as of ${new Date().toLocaleDateString()}`],
      date: new Date(),
    };
  }

  async dispatchTask(task, options = {}) {
    const { agent, file, showThinking = false } = options;

    if (!this.agents[agent]) {
      throw new Error(`Unknown agent: ${agent}`);
    }

    const spinner = ora({
      text: `Assigning task to ${this.agents[agent].name}...`,
      hideCursor: false,
    }).start();

    try {
      if (this.agents[agent].requiresWebSearch) {
        const searchQuery = this.generateSearchQuery(task, agent);
        const searchResults = await this.webSearch(searchQuery);
        if (!showThinking) {
          spinner.text = `Updating ${this.agents[agent].name} knowledge...`;
        }
      }

      const agentPrompt = this.buildAgentPrompt(agent, task, file);

      if (showThinking) {
        spinner.stop();
        console.log(chalk.dim('\n🧠 Agent thinking process:'));
        console.log(chalk.dim(`Task: ${task}`));
        console.log(chalk.dim(`Agent: ${this.agents[agent].name}`));
        console.log(chalk.dim(`Expertise: ${this.agents[agent].expertise}`));
        console.log(
          chalk.dim(`Last updated: ${this.agents[agent].lastUpdated?.toLocaleDateString()}`)
        );
        console.log('');
      }

      spinner.text = `${this.agents[agent].name} is analyzing...`;
      const result = await this.executeAgentTask(agent, agentPrompt, file);

      spinner.succeed(chalk.green(`${this.agents[agent].name} completed task`));

      return {
        agent: this.agents[agent].name,
        expertise: this.agents[agent].expertise,
        lastUpdated: this.agents[agent].lastUpdated,
        result: result,
        searchUsed: this.agents[agent].requiresWebSearch,
      };
    } catch (error) {
      spinner.fail(chalk.red(`${this.agents[agent].name} failed: ${error.message}`));
      throw error;
    }
  }

  generateSearchQuery(task, agent) {
    const expertiseMap = {
      architect: 'latest system design patterns best practices',
      'security-expert': 'latest security vulnerabilities CVE updates',
      'code-analyzer': 'latest code analysis tools performance optimization',
    };

    return `${task} ${expertiseMap[agent] || ''} ${new Date().getFullYear()}`;
  }

  buildAgentPrompt(agent, task, file) {
    const agentData = this.knowledgeBase[agent];
    const basePrompt = agentData?.prompt || '';

    return `
${basePrompt}

## Current Task
${task}

${file ? `## Target File: ${file}` : ''}

## Important Guidelines
- Focus ONLY on your specific expertise: ${agentData?.expertise || ''}
- Do NOT provide advice outside your specialization
- Always include the date of your last knowledge update: ${agentData?.lastUpdated?.toLocaleDateString?.() || 'N/A'}
- If the task involves technologies newer than your knowledge date, acknowledge this limitation
- Provide specific, actionable recommendations within your domain
`;
  }

  async executeAgentTask(agentId, prompt, file) {
    const agent = this.agents[agentId];

    let fileContent = '';
    if (file && fs.existsSync(file)) {
      fileContent = fs.readFileSync(file, 'utf8');
    }

    return {
      analysis: `Analysis by ${agent.name} (${agent.expertise})`,
      recommendations: [
        `Based on expertise in ${agent.expertise}`,
        `Last knowledge update: ${agent.lastUpdated?.toLocaleDateString?.()}`,
        file ? `Analyzed file: ${file}` : 'No file provided',
      ],
      limitations: agent.requiresWebSearch
        ? 'May need latest web information for complete accuracy'
        : 'Analysis based on static knowledge',
    };
  }

  async interactiveMode() {
    console.log(chalk.blue.bold('\n🎯 Hyper-Expert AI - Interactive Mode'));
    console.log(chalk.gray('Available agents:'));

    Object.entries(this.agents).forEach(([id, agent]) => {
      console.log(chalk.white(`  ${id}: ${agent.name} - ${agent.expertise}`));
      console.log(chalk.gray(`     Last updated: ${agent.lastUpdated?.toLocaleDateString?.()}`));
      if (agent.requiresWebSearch) {
        console.log(chalk.yellow(`     ⚠️  May require web search`));
      }
    });

    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise((r) => rl.question(q, r));

    try {
      const agent = await ask('\nSelect agent (code-analyzer, documentation-writer, bug-fixer, architect, security-expert): ');
      const task = await ask('Enter your task: ');
      const file = await ask('Target file (optional, press enter to skip): ');
      const showThinking = await ask('Show thinking process? (y/n): ');

      const result = await this.dispatchTask(task, {
        agent: agent.trim(),
        file: file.trim() || undefined,
        showThinking: showThinking.trim().toLowerCase() === 'y',
      });

      console.log(chalk.green('\n✅ Result:'));
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    } finally {
      rl.close();
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const orchestrator = new HyperExpertOrchestrator();

  await orchestrator.initialize();

  if (args.length === 0) {
    await orchestrator.interactiveMode();
    return;
  }

  const task = args.join(' ');
  const agent = process.env.AGENT || 'code-analyzer';
  const file = process.env.FILE;
  const showThinking = process.env.SHOW_THINKING === 'true';

  try {
    const result = await orchestrator.dispatchTask(task, { agent, file, showThinking });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default HyperExpertOrchestrator;
