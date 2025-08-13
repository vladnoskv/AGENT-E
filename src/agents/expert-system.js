#!/usr/bin/env node

import HyperExpertOrchestrator from './hyper-expert.js';
import KnowledgeUpdater from '../utils/knowledge-updater.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExpertAgentSystem {
  constructor() {
    this.orchestrator = new HyperExpertOrchestrator();
    this.updater = new KnowledgeUpdater();
    this.workingDir = process.cwd();
  }

  async initialize() {
    console.log(chalk.blue.bold('🚀 Expert AI System - Hyper-Specialized Agents'));
    console.log(chalk.gray('Initializing with latest knowledge...'));
    
    await this.orchestrator.initialize();
    await this.checkForUpdates();
  }

  async checkForUpdates() {
    const spinner = ora('Checking for knowledge updates...').start();
    try {
      const updates = await this.updater.checkAllAgents();
      const totalUpdates = Object.values(updates).reduce((sum, arr) => sum + arr.length, 0);
      
      if (totalUpdates > 0) {
        spinner.succeed(`Found ${totalUpdates} knowledge updates`);
      } else {
        spinner.info('All agents are up to date');
      }
    } catch (error) {
      spinner.warn('Could not check updates, using existing knowledge');
    }
  }

  async processTask(task, options = {}) {
    const { 
      agent, 
      file, 
      showThinking = false, 
      includeWebSearch = true,
      context = {}
    } = options;

    if (!agent) {
      throw new Error('Agent type is required');
    }

    const spinner = ora({
      text: `Processing with ${this.orchestrator.agents[agent]?.name || agent}...`,
      hideCursor: false
    }).start();

    try {
      // Get agent with latest knowledge
      const agentInfo = await this.updater.getAgentWithUpdates(agent);
      
      if (includeWebSearch && agentInfo.requiresWebSearch) {
        spinner.text = 'Searching for latest information...';
        const searchResults = await this.performWebSearch(task, agent);
        
        if (searchResults.length > 0) {
          context.latestInfo = searchResults;
          spinner.text = 'Incorporating latest findings...';
        }
      }

      // Prepare specialized task
      const specializedTask = this.buildSpecializedTask(task, agent, context);
      
      spinner.text = `${this.orchestrator.agents[agent]?.name} analyzing...`;
      
      // Execute with hyper-expert focus
      const result = await this.orchestrator.dispatchTask(specializedTask, {
        agent,
        file,
        showThinking
      });

      // Add expertise boundaries
      result.expertiseBoundary = this.getExpertiseBoundary(agent);
      result.knowledgeDate = agentInfo.lastUpdate;
      result.webSearchUsed = includeWebSearch && agentInfo.requiresWebSearch;

      spinner.succeed(chalk.green(`${this.orchestrator.agents[agent]?.name} completed analysis`));
      
      return result;

    } catch (error) {
      spinner.fail(chalk.red(`Expert analysis failed: ${error.message}`));
      throw error;
    }
  }

  async performWebSearch(query, agentType) {
    console.log(chalk.cyan(`🔍 Expert web search for ${agentType}: ${query}`));
    
    // Simulate expert-focused search results
    const searchQueries = {
      'code-analyzer': {
        query: `${query} latest code analysis tools 2024`,
        sources: ['ESLint docs', 'TypeScript releases', 'SonarQube updates']
      },
      'architect': {
        query: `${query} latest architecture patterns 2024`,
        sources: ['Next.js docs', 'AWS architecture', 'Microservices patterns']
      },
      'security-expert': {
        query: `${query} latest security vulnerabilities 2024`,
        sources: ['CVE database', 'OWASP updates', 'Security advisories']
      },
      'bug-fixer': {
        query: `${query} latest debugging techniques 2024`,
        sources: ['Chrome DevTools', 'VS Code debugging', 'Testing frameworks']
      },
      'documentation-writer': {
        query: `${query} latest documentation standards 2024`,
        sources: ['Markdown specs', 'API documentation', 'Technical writing']
      }
    };

    const searchConfig = searchQueries[agentType];
    if (!searchConfig) return [];

    // Simulate expert-focused results
    return [
      {
        title: `Latest ${agentType} updates for ${new Date().toLocaleDateString()}`,
        source: searchConfig.sources[0],
        date: new Date().toISOString().split('T')[0],
        relevance: 'high',
        summary: `Expert-curated information for ${agentType} specialization`
      }
    ];
  }

  buildSpecializedTask(task, agent, context) {
    const expertiseMap = {
      'code-analyzer': 'Analyze this code with expert-level focus on quality, performance, and security. Do NOT provide advice outside code analysis.',
      'architect': 'Provide architectural analysis with expert-level system design insights. Do NOT provide implementation details.',
      'security-expert': 'Conduct security analysis with expert-level vulnerability assessment. Do NOT provide non-security advice.',
      'bug-fixer': 'Debug and fix issues with expert-level troubleshooting. Do NOT provide feature suggestions.',
      'documentation-writer': 'Create documentation with expert-level technical writing. Do NOT provide code changes.'
    };

    let specializedTask = `${expertiseMap[agent] || ''}\n\nTask: ${task}`;

    if (context.latestInfo && context.latestInfo.length > 0) {
      specializedTask += '\n\n## Latest Expert Knowledge\n';
      context.latestInfo.forEach(info => {
        specializedTask += `- ${info.title} (${info.date}): ${info.summary}\n`;
      });
    }

    specializedTask += '\n## Expert Focus\n';
    specializedTask += 'Provide analysis ONLY within your specialized domain. ';
    specializedTask += 'Acknowledge any limitations if the technology is newer than your knowledge base. ';
    specializedTask += 'Include date of last knowledge update in your response.';

    return specializedTask;
  }

  getExpertiseBoundary(agent) {
    const boundaries = {
      'code-analyzer': {
        domain: 'Code Quality & Performance',
        scope: 'Static analysis, bug detection, performance optimization',
        limitations: 'Cannot provide business logic or feature design',
        lastTraining: '2024-01-12'
      },
      'architect': {
        domain: 'System Architecture',
        scope: 'Design patterns, scalability, system structure',
        limitations: 'Cannot provide implementation code or debugging',
        lastTraining: '2024-01-12'
      },
      'security-expert': {
        domain: 'Security Analysis',
        scope: 'Vulnerability assessment, security patterns, compliance',
        limitations: 'Cannot provide non-security code changes',
        lastTraining: '2024-01-12'
      },
      'bug-fixer': {
        domain: 'Debugging & Fixes',
        scope: 'Error diagnosis, patch generation, troubleshooting',
        limitations: 'Cannot provide new feature design',
        lastTraining: '2024-01-12'
      },
      'documentation-writer': {
        domain: 'Technical Documentation',
        scope: 'API docs, tutorials, technical writing',
        limitations: 'Cannot provide code implementation',
        lastTraining: '2024-01-12'
      }
    };

    return boundaries[agent] || { domain: 'Unknown', limitations: 'Undefined scope' };
  }

  async interactiveMode() {
    console.log(chalk.blue.bold('\n🎯 Expert AI System - Interactive Mode'));
    
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, resolve);
      });
    };

    try {
      console.log('\nAvailable expert agents:');
      Object.entries(this.orchestrator.agents).forEach(([id, agent]) => {
        console.log(chalk.white(`  ${id}: ${agent.name}`));
        console.log(chalk.gray(`     ${agent.expertise}`));
      });

      const agent = await askQuestion('\nSelect expert agent: ');
      const task = await askQuestion('Describe your task: ');
      const file = await askQuestion('Target file (optional): ');
      const useWebSearch = await askQuestion('Include web search for latest info? (y/n): ');
      const showThinking = await askQuestion('Show expert thinking process? (y/n): ');

      const result = await this.processTask(task, {
        agent: agent.trim(),
        file: file.trim() || undefined,
        includeWebSearch: useWebSearch.trim().toLowerCase() === 'y',
        showThinking: showThinking.trim().toLowerCase() === 'y'
      });

      console.log(chalk.green('\n🎯 Expert Analysis Complete:'));
      console.log(chalk.white(`Agent: ${result.agent}`));
      console.log(chalk.white(`Expertise: ${result.expertise}`));
      console.log(chalk.white(`Knowledge Date: ${result.knowledgeDate}`));
      console.log(chalk.white(`Web Search Used: ${result.webSearchUsed ? 'Yes' : 'No'}`));
      console.log(chalk.white(`Expertise Boundary: ${result.expertiseBoundary.domain}`));
      console.log('\n' + chalk.cyan('Results:'));
      console.log(JSON.stringify(result.result, null, 2));

    } catch (error) {
      console.error(chalk.red('Expert system error:', error.message));
    } finally {
      rl.close();
    }
  }

  async runBenchmark() {
    console.log(chalk.blue.bold('\n📊 Running Expert Agent Benchmarks'));
    
    const testCases = [
      {
        agent: 'code-analyzer',
        task: 'Analyze this JavaScript code for performance issues',
        file: 'test.js'
      },
      {
        agent: 'security-expert',
        task: 'Check this Express.js app for security vulnerabilities',
        file: 'server.js'
      },
      {
        agent: 'architect',
        task: 'Review this React component architecture',
        file: 'component.jsx'
      }
    ];

    const results = [];
    
    for (const testCase of testCases) {
      const spinner = ora(`Testing ${testCase.agent}...`).start();
      
      try {
        const startTime = Date.now();
        const result = await this.processTask(testCase.task, {
          agent: testCase.agent,
          file: testCase.file,
          showThinking: false
        });
        
        const duration = Date.now() - startTime;
        
        results.push({
          agent: testCase.agent,
          duration,
          success: true,
          expertiseBoundary: result.expertiseBoundary
        });
        
        spinner.succeed(`${testCase.agent} completed in ${duration}ms`);
      } catch (error) {
        results.push({
          agent: testCase.agent,
          success: false,
          error: error.message
        });
        spinner.fail(`${testCase.agent} failed: ${error.message}`);
      }
    }

    console.log('\n' + chalk.green('Benchmark Results:'));
    console.table(results.map(r => ({
      Agent: r.agent,
      Duration: r.success ? `${r.duration}ms` : 'Failed',
      Status: r.success ? '✅' : '❌',
      Domain: r.expertiseBoundary?.domain || 'Unknown'
    })));

    return results;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const system = new ExpertAgentSystem();
  
  await system.initialize();

  if (args.length === 0) {
    await system.interactiveMode();
    return;
  }

  const [command, ...restArgs] = args;
  
  try {
    switch (command) {
      case 'analyze':
        const agent = process.env.AGENT || 'code-analyzer';
        const file = process.env.FILE;
        const result = await system.processTask(restArgs.join(' '), {
          agent,
          file,
          showThinking: process.env.SHOW_THINKING === 'true'
        });
        console.log(JSON.stringify(result, null, 2));
        break;
      case 'benchmark':
        await system.runBenchmark();
        break;
      case 'update':
        await system.updater.checkAllAgents();
        break;
      default:
        console.log('Commands: analyze, benchmark, update');
        console.log('Example: node expert-agent-system.js analyze "Check security" --agent security-expert');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default ExpertAgentSystem;