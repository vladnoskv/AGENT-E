#!/usr/bin/env node

import OpenAI from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { createInterface } from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readTaskMemory } from '../utils/task-memory.js';
import { getCurrentTaskId } from '../utils/current-task.js';
import { readTaskManifest } from '../utils/task-manifest.js';

dotenv.config();

const apiKey = process.env.NVIDIA_API_KEY || process.env.api_key;

if (!apiKey) {
  console.error(chalk.red('❌ Error: NVIDIA_API_KEY or api_key not found in .env file'));
  console.log(chalk.yellow('💡 Add to .env: NVIDIA_API_KEY="your-key-here"'));
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: apiKey.replace(/"/g, '').trim(),
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runIndexer(taskId) {
  return new Promise((resolve) => {
    const args = [join(__dirname, 'index-codebase.js')];
    if (taskId) args.push('--task', taskId);
    const child = spawn('node', args, { stdio: 'inherit', shell: true });
    child.on('close', (code) => resolve(code === 0));
  });
}

async function chatMode({ autostart = false } = {}) {
  console.log(chalk.blue.bold('🤖 NVIDIA GPT-OSS-20B Chat Mode'));
  console.log(chalk.gray('Type "exit" to quit\n'));
  const currentTaskId = getCurrentTaskId();
  if (currentTaskId) {
    const mem = readTaskMemory(currentTaskId, {});
    console.log(chalk.gray(`Using task: ${currentTaskId} (${mem.fileCount ?? 'n/a'} files indexed)`));
  }
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('You: ')
  });

  // Optional autostart: if we have a task manifest, kick off with a planning prompt
  if (autostart && currentTaskId) {
    try {
      const manifest = readTaskManifest(currentTaskId) || {};
      const kickoff = `You are the lead agent for task ${currentTaskId}.\n` +
        `Title: ${manifest.title ?? 'N/A'}\n` +
        `Description: ${manifest.description ?? 'N/A'}\n` +
        `AgentType: ${manifest.agentType ?? 'chat'} | Model: ${manifest.model ?? '20b'}\n` +
        `Index: ${manifest.indexPath ?? 'N/A'} (files: ${(manifest.fileCount ?? 'n/a')})\n` +
        `Goals: ${Array.isArray(manifest.goals) ? manifest.goals.join('; ') : 'N/A'}\n` +
        `Constraints: ${Array.isArray(manifest.constraints) ? manifest.constraints.join('; ') : 'N/A'}\n` +
        `Plan the next concrete steps and begin executing. Ask clarifying questions only if strictly necessary. Prefer using tools (index, grep, open, edit, run-tests) to make progress.`;
      console.log(chalk.gray('\n[Auto] Kickoff based on task manifest...'));
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [{ role: 'system', content: 'You are an autonomous coding assistant focused on actionable steps.' }, { role: 'user', content: kickoff }],
        max_tokens: 1024,
        temperature: 0.5,
        top_p: 0.9,
      });
      const response = completion.choices[0].message.content;
      console.log(chalk.green('AI: ') + response + '\n');
    } catch (e) {
      console.log(chalk.yellow('Autostart failed; continuing to interactive chat.')); 
    }
  }

  rl.prompt();

  rl.on('line', async (input) => {
    const message = input.trim();
    
    if (message.toLowerCase() === 'exit') {
      console.log(chalk.yellow('👋 Goodbye!'));
      rl.close();
      return;
    }

    if (!message) {
      rl.prompt();
      return;
    }

    // Tooling shortcuts
    if (message.startsWith('/index') || /scan my codebase/i.test(message)) {
      const parts = message.split(/\s+/);
      const taskId = parts[1] && !parts[1].startsWith('/') ? parts[1] : undefined;
      const chosenTaskId = taskId || new Date().toISOString().replace(/[:.]/g, '-');
      console.log(chalk.cyan(`\n🗂️  Indexing codebase for task: ${chosenTaskId} ...`));
      const ok = await runIndexer(chosenTaskId);
      if (ok) {
        const mem = readTaskMemory(chosenTaskId, {});
        console.log(chalk.green(`\n✅ Index ready. Files: ${mem.fileCount ?? 'n/a'}. TaskId: ${chosenTaskId}`));
        console.log(chalk.gray('Tip: reference this taskId in your next request.'));
      } else {
        console.log(chalk.red('\n❌ Indexing failed.'));
      }
      rl.prompt();
      return;
    }

    try {
      console.log(chalk.blue('🤖 Thinking...'));
      const sys = [];
      if (currentTaskId) {
        const mem = readTaskMemory(currentTaskId, {});
        const summary = `You are assisting on task ${currentTaskId}. Indexed files: ${mem.fileCount ?? 'n/a'}. Index: ${mem.indexPath ?? 'n/a'}. Prefer actionable, stepwise guidance. If user asks to search or edit code, suggest using /index, and forthcoming /grep, /open, /edit, /run-tests.`;
        sys.push({ role: 'system', content: summary });
      }
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [...sys, { role: 'user', content: message }],
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
      });

      const response = completion.choices[0].message.content;
      console.log(chalk.green('AI: ') + response + '\n');
      
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
    }
    
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.yellow('👋 Chat ended.'));
    process.exit(0);
  });
}

async function singleMessage(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: 'user', content: message }],
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
    });

    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  const autostart = args.includes('--autostart');
  const msgArgs = args.filter(a => !a.startsWith('--'));
  if (msgArgs.length === 0) {
    await chatMode({ autostart });
  } else {
    const message = msgArgs.join(' ');
    await singleMessage(message);
  }
}

main().catch(console.error);