#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import { setCurrentTaskId } from '../utils/current-task.js';
import { writeTaskMemory } from '../utils/task-memory.js';
import { writeTaskManifest } from '../utils/task-manifest.js';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runIndexer(taskId) {
  return new Promise((resolve) => {
    const args = [join(__dirname, 'index-codebase.js'), '--task', taskId];
    const child = spawn('node', args, { stdio: 'inherit', shell: true });
    child.on('close', (code) => resolve(code === 0));
  });
}

async function main() {
  console.log(chalk.cyan('\nSetup a new agent task'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'taskId',
      message: 'Task ID (leave blank to auto-generate):',
      filter: (v) => v.trim(),
    },
    {
      type: 'input',
      name: 'title',
      message: 'Task title/goal:',
      validate: (v) => !!v.trim() || 'Please enter a title',
    },
    // Offer editor only if EDITOR/VISUAL is configured
    ...(process.env.EDITOR || process.env.VISUAL ? [{
      type: 'confirm',
      name: 'useEditor',
      message: 'Open your editor to write a longer description?',
      default: true
    }] : [{
      type: 'confirm',
      name: 'useEditor',
      message: 'Open an external editor for description? (No = inline input)',
      default: false
    }]),
    {
      type: 'editor',
      name: 'descriptionEditor',
      message: 'Describe the task (your editor will open):',
      default: 'Describe the objective, constraints, and success criteria.',
      when: (a) => !!a.useEditor
    },
    {
      type: 'input',
      name: 'descriptionInline',
      message: 'Describe the task (inline):',
      default: 'Describe the objective, constraints, and success criteria.',
      when: (a) => !a.useEditor,
      filter: (v) => v.trim()
    },
    {
      type: 'list',
      name: 'agentType',
      message: 'Choose agent type:',
      choices: [
        { name: 'Multi-Agent Orchestrator', value: 'orchestrator' },
        { name: 'Hyper Expert', value: 'expert' },
        { name: 'Simple Chat', value: 'chat' },
      ]
    },
    {
      type: 'list',
      name: 'model',
      message: 'Model size:',
      choices: [
        { name: 'GPT-OSS-20B (fast, cheaper)', value: '20b' },
        { name: 'GPT-OSS-120B (stronger, costlier)', value: '120b' }
      ],
      default: '20b'
    },
    {
      type: 'confirm',
      name: 'indexNow',
      message: 'Index the codebase now?',
      default: true
    },
    {
      type: 'confirm',
      name: 'startNow',
      message: 'Start the selected agent now?',
      default: true
    }
  ]);

  const taskId = answers.taskId || new Date().toISOString().replace(/[:.]/g, '-');
  const description = answers.useEditor ? (answers.descriptionEditor || '') : (answers.descriptionInline || '');
  const meta = {
    taskId,
    title: answers.title,
    description,
    agentType: answers.agentType,
    model: answers.model,
    createdAt: new Date().toISOString()
  };

  // Persist as current task, manifest, and memory store
  setCurrentTaskId(taskId);
  writeTaskManifest(taskId, meta);
  writeTaskMemory(taskId, meta);

  console.log(chalk.green(`\n✅ Task created: ${taskId}`));

  if (answers.indexNow) {
    console.log(chalk.cyan('\n📦 Indexing codebase for this task...'));
    const ok = await runIndexer(taskId);
    if (!ok) {
      console.log(chalk.red('Indexing failed. You can run it later from the menu.'));
    }
  }

  if (answers.startNow) {
    // Start the selected agent type. We prefer launching Chat for reliability if agent type is chat.
    const map = {
      chat: join(__dirname, 'chat.js'),
      orchestrator: join(__dirname, '../core/orchestrators/agent-orchestrator.js'),
      expert: join(__dirname, '../agents/expert/hyper-expert-orchestrator.js')
    };
    const target = map[answers.agentType] || map.chat;
    console.log(chalk.cyan(`\n🚀 Starting ${answers.agentType}...`));
    const args = target.endsWith('chat.js') ? [target, '--autostart'] : [target];
    spawn('node', args, { stdio: 'inherit', shell: true });
  } else {
    console.log(chalk.gray('\nTip: Use Chat Mode next. The current task is persisted and used as context.'));
  }
}

main().catch((err) => {
  console.error(chalk.red('Setup failed:'), err);
  process.exit(1);
});
