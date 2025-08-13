#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class KnowledgeUpdater {
  constructor() {
    this.knowledgeDir = path.join(__dirname, '..', '..', 'knowledge');
    this.promptsDir = path.join(__dirname, '..', '..', 'prompts');
    this.agents = [
      'code-analyzer',
      'documentation-writer', 
      'bug-fixer',
      'architect',
      'security-expert'
    ];
    
    this.lastUpdateFile = path.join(this.knowledgeDir, 'last-update.json');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.knowledgeDir)) {
      fs.mkdirSync(this.knowledgeDir, { recursive: true });
    }
  }

  async searchWeb(query, agentType) {
    console.log(chalk.cyan(`🔍 Searching web for ${agentType}: ${query}`));
    
    // Simulate web search - in production, integrate with search APIs
    const mockResults = {
      'code-analyzer': [
        {
          title: "ESLint 9.0 Released - New Rules and Breaking Changes",
          url: "https://eslint.org/blog/2024/01/eslint-v9.0.0-released/",
          date: "2024-01-15",
          summary: "Major release with new rules and configuration format"
        },
        {
          title: "TypeScript 5.4 Performance Improvements",
          url: "https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/",
          date: "2024-03-05",
          summary: "Significant performance improvements in type checking"
        }
      ],
      'architect': [
        {
          title: "Next.js 14.2 App Router Best Practices",
          url: "https://nextjs.org/docs/app/building-your-application",
          date: "2024-04-20",
          summary: "Latest architectural patterns for Next.js applications"
        },
        {
          title: "Microservices vs Monolith 2024 Analysis",
          url: "https://martinfowler.com/articles/microservices-tradeoffs-2024.html",
          date: "2024-02-10",
          summary: "Updated analysis on microservices architecture decisions"
        }
      ],
      'security-expert': [
        {
          title: "CVE-2024-1234: Critical Node.js Vulnerability",
          url: "https://nodejs.org/en/blog/vulnerability/cve-2024-1234",
          date: "2024-03-15",
          summary: "Critical vulnerability affecting Node.js 18.x and 20.x"
        },
        {
          title: "OWASP Top 10 2024 Update",
          url: "https://owasp.org/www-project-top-ten/2024/",
          date: "2024-01-30",
          summary: "Updated OWASP Top 10 security risks for 2024"
        }
      ]
    };

    return mockResults[agentType] || [];
  }

  async checkForUpdates(agentType, lastKnownDate) {
    const queries = {
      'code-analyzer': 'latest code analysis tools ESLint TypeScript updates',
      'architect': 'latest system architecture patterns Next.js updates',
      'security-expert': 'latest security vulnerabilities CVE updates',
      'bug-fixer': 'latest debugging tools techniques',
      'documentation-writer': 'latest documentation tools standards'
    };

    const query = queries[agentType];
    if (!query) return [];

    const results = await this.searchWeb(query, agentType);
    
    // Filter results newer than last known date
    if (lastKnownDate) {
      return results.filter(result => new Date(result.date) > new Date(lastKnownDate));
    }
    
    return results;
  }

  async updateAgentKnowledge(agentType, updates) {
    const agentFile = path.join(this.knowledgeDir, `${agentType}-updates.json`);
    const existing = fs.existsSync(agentFile) ? 
      JSON.parse(fs.readFileSync(agentFile, 'utf8')) : [];
    
    const updated = [...existing, ...updates];
    fs.writeFileSync(agentFile, JSON.stringify(updated, null, 2));
    
    console.log(chalk.green(`✅ Updated ${agentType} with ${updates.length} new items`));
  }

  async getLastUpdateDate() {
    if (fs.existsSync(this.lastUpdateFile)) {
      return JSON.parse(fs.readFileSync(this.lastUpdateFile, 'utf8')).lastUpdate;
    }
    return null;
  }

  async setLastUpdateDate(date) {
    fs.writeFileSync(this.lastUpdateFile, JSON.stringify({ lastUpdate: date }, null, 2));
  }

  async checkAllAgents() {
    console.log(chalk.blue.bold('🔍 Checking all agents for knowledge updates...'));
    
    const lastUpdate = await this.getLastUpdateDate();
    const updateResults = {};

    for (const agentType of this.agents) {
      const spinner = ora(`Checking ${agentType}...`).start();
      
      try {
        const updates = await this.checkForUpdates(agentType, lastUpdate);
        
        if (updates.length > 0) {
          await this.updateAgentKnowledge(agentType, updates);
          updateResults[agentType] = updates;
          spinner.succeed(`${agentType}: ${updates.length} updates found`);
        } else {
          spinner.info(`${agentType}: No updates needed`);
          updateResults[agentType] = [];
        }
      } catch (error) {
        spinner.fail(`${agentType}: Error checking updates - ${error.message}`);
        updateResults[agentType] = [];
      }
    }

    await this.setLastUpdateDate(new Date().toISOString());
    return updateResults;
  }

  async generateAgentPromptWithUpdates(agentType) {
    const basePromptFile = path.join(this.promptsDir, 'agents', `${agentType}.md`);
    const updatesFile = path.join(this.knowledgeDir, `${agentType}-updates.json`);
    
    if (!fs.existsSync(basePromptFile)) {
      throw new Error(`Base prompt not found for ${agentType}`);
    }

    const basePrompt = fs.readFileSync(basePromptFile, 'utf8');
    let updatedPrompt = basePrompt;

    if (fs.existsSync(updatesFile)) {
      const updates = JSON.parse(fs.readFileSync(updatesFile, 'utf8'));
      
      if (updates.length > 0) {
        const latestUpdates = updates.slice(-5); // Last 5 updates
        
        updatedPrompt += `\n\n## Latest Knowledge Updates (as of ${new Date().toLocaleDateString()})\n\n`;
        latestUpdates.forEach(update => {
          updatedPrompt += `- **${update.title}** (${update.date}): ${update.summary}\n`;
          updatedPrompt += `  Source: ${update.url}\n\n`;
        });
        
        updatedPrompt += `## Knowledge Limitations\n`;
        updatedPrompt += `- All knowledge is current as of ${new Date().toLocaleDateString()}\n`;
        updatedPrompt += `- For technologies released after this date, web search may be required\n`;
        updatedPrompt += `- Always check for the latest documentation and release notes\n`;
      }
    }

    return updatedPrompt;
  }

  async interactiveUpdate() {
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

    console.log(chalk.blue.bold('\n🔄 Knowledge Update System'));
    console.log(chalk.gray('Available options:'));
    console.log('1. Check all agents for updates');
    console.log('2. Update specific agent');
    console.log('3. Generate updated prompts');
    console.log('4. View update history');

    const choice = await askQuestion('\nSelect option (1-4): ');

    try {
      switch (choice.trim()) {
        case '1':
          await this.checkAllAgents();
          break;
        case '2':
          const agent = await askQuestion('Enter agent name: ');
          const updates = await this.checkForUpdates(agent.trim(), await this.getLastUpdateDate());
          if (updates.length > 0) {
            await this.updateAgentKnowledge(agent.trim(), updates);
          }
          break;
        case '3':
          const agentForPrompt = await askQuestion('Enter agent name for updated prompt: ');
          const updatedPrompt = await this.generateAgentPromptWithUpdates(agentForPrompt.trim());
          console.log('\n' + chalk.green('Updated prompt:'));
          console.log(updatedPrompt);
          break;
        case '4':
          await this.viewUpdateHistory();
          break;
        default:
          console.log(chalk.red('Invalid option'));
      }
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    } finally {
      rl.close();
    }
  }

  async viewUpdateHistory() {
    console.log(chalk.blue.bold('\n📊 Update History'));
    
    for (const agentType of this.agents) {
      const updatesFile = path.join(this.knowledgeDir, `${agentType}-updates.json`);
      
      if (fs.existsSync(updatesFile)) {
        const updates = JSON.parse(fs.readFileSync(updatesFile, 'utf8'));
        console.log(chalk.white(`\n${agentType}:`));
        updates.forEach(update => {
          console.log(chalk.gray(`  ${update.date}: ${update.title}`));
        });
      } else {
        console.log(chalk.gray(`${agentType}: No updates recorded`));
      }
    }
  }

  async getAgentWithUpdates(agentType) {
    const prompt = await this.generateAgentPromptWithUpdates(agentType);
    const lastUpdate = await this.getLastUpdateDate();
    
    return {
      prompt,
      lastUpdate,
      agent: agentType,
      requiresWebSearch: ['architect', 'security-expert'].includes(agentType)
    };
  }
}

// CLI Interface
async function main() {
  const updater = new KnowledgeUpdater();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await updater.interactiveUpdate();
    return;
  }

  const command = args[0];
  
  try {
    switch (command) {
      case 'check':
        await updater.checkAllAgents();
        break;
      case 'update':
        const agent = args[1];
        if (!agent) {
          console.error('Usage: node knowledge-updater.js update <agent-name>');
          process.exit(1);
        }
        const updates = await updater.checkForUpdates(agent, await updater.getLastUpdateDate());
        if (updates.length > 0) {
          await updater.updateAgentKnowledge(agent, updates);
        }
        break;
      case 'prompt':
        const agentForPrompt = args[1];
        if (!agentForPrompt) {
          console.error('Usage: node knowledge-updater.js prompt <agent-name>');
          process.exit(1);
        }
        const updatedPrompt = await updater.generateAgentPromptWithUpdates(agentForPrompt);
        console.log(updatedPrompt);
        break;
      case 'history':
        await updater.viewUpdateHistory();
        break;
      default:
        console.log('Commands: check, update <agent>, prompt <agent>, history');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default KnowledgeUpdater;