#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

class MultiAgentSystem {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.api_key?.replace(/"/g, '').trim(),
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
    this.agents = {
      master: 'master-agent.md',
      codeAnalyzer: 'agents/code-analyzer.md',
      documentationWriter: 'agents/documentation-writer.md',
      bugFixer: 'agents/bug-fixer.md',
      architect: 'agents/architect.md',
      securityExpert: 'agents/security-expert.md'
    };
    this.promptsPath = path.join(__dirname, 'prompts');
  }

  async loadPrompt(agentName) {
    try {
      const promptFile = path.join(this.promptsPath, this.agents[agentName]);
      if (await fs.pathExists(promptFile)) {
        return await fs.readFile(promptFile, 'utf-8');
      }
      return null;
    } catch (error) {
      console.error(chalk.red(`Error loading prompt for ${agentName}:`, error.message));
      return null;
    }
  }

  async analyzeTask(task) {
    const masterPrompt = await this.loadPrompt('master');
    const currentDir = process.cwd();
    
    const analysisPrompt = `${masterPrompt}

Current task: ${task}
Working directory: ${currentDir}

Analyze this task and determine:
1. Which sub-agents should be involved
2. How to break it into sub-tasks
3. The priority order for agent execution

Provide your analysis in JSON format:
{
  "agents": ["agent1", "agent2", "agent3"],
  "subTasks": [
    {"agent": "agent1", "task": "specific task 1", "priority": 1},
    {"agent": "agent2", "task": "specific task 2", "priority": 2}
  ],
  "synthesisStrategy": "how to combine results"
}`;

    const completion = await this.openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 1000,
      temperature: 0.3,
    });

    try {
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error(chalk.red('Error parsing task analysis:', error.message));
      return {
        agents: ['codeAnalyzer'],
        subTasks: [{ agent: 'codeAnalyzer', task, priority: 1 }],
        synthesisStrategy: 'single_agent_response'
      };
    }
  }

  async executeAgent(agentName, task, context = {}) {
    const agentPrompt = await this.loadPrompt(agentName);
    if (!agentPrompt) {
      throw new Error(`Prompt for agent ${agentName} not found`);
    }

    const fullPrompt = `${agentPrompt}

Current task: ${task}
Working directory: ${process.cwd()}
Context: ${JSON.stringify(context, null, 2)}

Please provide a comprehensive response addressing the task.`;

    const completion = await this.openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: 'user', content: fullPrompt }],
      max_tokens: 2000,
      temperature: 0.5,
    });

    return {
      agent: agentName,
      task,
      response: completion.choices[0].message.content,
      timestamp: new Date().toISOString()
    };
  }

  async synthesizeResponses(responses, originalTask) {
    const synthesisPrompt = `You are the Master Agent synthesizing responses from multiple sub-agents.

Original task: ${originalTask}

Agent responses:
${responses.map(r => `
--- ${r.agent} response ---
${r.response}
`).join('\n')}

Synthesize these responses into a coherent, comprehensive answer. Highlight:
1. Key insights from each agent
2. Any conflicting information and how to resolve it
3. The final recommended approach
4. Next steps

Provide the final synthesized response.`;

    const completion = await this.openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: 'user', content: synthesisPrompt }],
      max_tokens: 2000,
      temperature: 0.3,
    });

    return {
      originalTask,
      agentsInvolved: responses.map(r => r.agent),
      synthesizedResponse: completion.choices[0].message.content,
      timestamp: new Date().toISOString()
    };
  }

  async executeTask(task, options = {}) {
    console.log(chalk.blue.bold('\n🎯 Task:'), task);
    console.log(chalk.gray('━'.repeat(50)));
    
    const spinner = ora('Master Agent analyzing task...').start();
    
    try {
      // Step 1: Analyze task and determine agent assignments
      spinner.text = 'Master Agent planning agent assignments...';
      const taskAnalysis = await this.analyzeTask(task);
      
      spinner.stop();
      console.log(chalk.green('\n📋 Delegation Plan:'));
      taskAnalysis.subTasks.forEach((subTask, index) => {
        console.log(`${index + 1}. ${chalk.cyan(subTask.agent)} → ${subTask.task}`);
      });
      console.log(chalk.gray('━'.repeat(50)));
      
      // Step 2: Execute sub-tasks with appropriate agents
      const agentResponses = [];
      
      for (const subTask of taskAnalysis.subTasks.sort((a, b) => a.priority - b.priority)) {
        const agentSpinner = ora(`Agent ${subTask.agent} processing...`).start();
        const response = await this.executeAgent(subTask.agent, subTask.task);
        agentResponses.push(response);
        agentSpinner.stop();
        
        console.log(chalk.green(`\n✅ ${subTask.agent} completed task`));
        if (options.verbose) {
          console.log(chalk.blue(`Response preview: ${response.response.substring(0, 200)}...`));
        }
      }

      // Step 3: Synthesize all responses
      const synthSpinner = ora('Master Agent synthesizing final response...').start();
      const finalResult = await this.synthesizeResponses(agentResponses, task);
      synthSpinner.stop();
      
      console.log(chalk.green('\n✅ Master Agent synthesis complete'));
      console.log(chalk.gray('━'.repeat(50)));
      
      return finalResult;
      
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Multi-agent execution failed:', error.message));
      throw error;
    }
  }

  async listAgents() {
    console.log(chalk.blue.bold('\n🤖 Available Agents:\n'));
    
    for (const [agentKey, promptFile] of Object.entries(this.agents)) {
      const promptPath = path.join(this.promptsPath, promptFile);
      if (await fs.pathExists(promptPath)) {
        const prompt = await fs.readFile(promptPath, 'utf-8');
        const description = prompt.split('\n')[0].replace('# ', '');
        console.log(`${chalk.green(agentKey.padEnd(20))} ${description}`);
      }
    }
    
    console.log(chalk.yellow('\n📋 Delegation Flow: Master Agent → Sub-Agents → Master Agent → User'));
    console.log(chalk.gray('Each task is analyzed by the Master Agent, then delegated to specialized agents,'));
    console.log(chalk.gray('with results synthesized and reviewed before returning to the user.\n'));
  }

  async runDemo(task) {
    console.log(chalk.blue.bold('\n🚀 Multi-Agent System Demo\n'));
    console.log(`Task: ${task}\n`);

    const result = await this.executeTask(task, { verbose: true });
    
    console.log(chalk.green.bold('\n📋 Final Synthesized Response:\n'));
    console.log(result.synthesizedResponse);
    
    console.log(chalk.gray(`\n📊 Execution Summary:`));
    console.log(`Agents involved: ${result.agentsInvolved.join(', ')}`);
    console.log(`Completed at: ${result.timestamp}`);
  }
}

// CLI Integration
class MultiAgentCLI {
  constructor() {
    this.system = new MultiAgentSystem();
    this.program = new Command();
    this.setupCommands();
  }

  setupCommands() {
    this.program
      .name('multi-agent')
      .description('Multi-agent AI system for complex tasks')
      .version('1.0.0');

    this.program
      .command('run <task>')
      .description('Execute a task with multiple agents')
      .option('-v, --verbose', 'Show individual agent responses')
      .action(async (task, options) => {
        try {
          const result = await this.system.executeTask(task, options);
          console.log(chalk.green.bold('\n🎯 Final Result:\n'));
          console.log(result.synthesizedResponse);
        } catch (error) {
          console.error(chalk.red('Error:', error.message));
        }
      });

    this.program
      .command('agents')
      .description('List all available agents')
      .action(async () => {
        await this.system.listAgents();
      });

    this.program
      .command('demo <task>')
      .description('Run a demo with detailed agent interactions')
      .action(async (task) => {
        await this.system.runDemo(task);
      });

    this.program
      .command('agent <agentName> <task>')
      .description('Run a single agent directly')
      .action(async (agentName, task) => {
        try {
          const result = await this.system.executeAgent(agentName, task);
          console.log(chalk.blue.bold(`\n🤖 ${agentName} Response:\n`));
          console.log(result.response);
        } catch (error) {
          console.error(chalk.red('Error:', error.message));
        }
      });
  }

  async run() {
    if (!process.env.api_key) {
      console.log(chalk.red('Error: API key not found in .env file'));
      process.exit(1);
    }

    await this.program.parseAsync(process.argv);
    
    if (process.argv.length === 2) {
      console.log(chalk.blue.bold('\n🤖 Multi-Agent AI System\n'));
      this.program.help();
    }
  }
}

// Export for use in other modules
export { MultiAgentSystem, MultiAgentCLI };

// Default export for agentx.js compatibility
export default async function runMultiAgent(mode = 'demo') {
  if (!process.env.api_key) {
    console.error(chalk.red('Error: API key not found in .env file'));
    console.log(chalk.yellow('💡 Make sure your .env file contains: api_key="your-key-here"'));
    process.exit(1);
  }

  const system = new MultiAgentSystem();
  
  if (mode === 'demo') {
    await system.runDemo('Demonstrate multi-agent collaboration capabilities');
  } else {
    console.log(chalk.blue('🤖 Multi-Agent System Ready'));
    await system.listAgents();
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new MultiAgentCLI();
  cli.run().catch(console.error);
}