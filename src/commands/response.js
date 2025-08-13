#!/usr/bin/env node

import dotenv from 'dotenv';
import chalk from 'chalk';
import { createInterface } from 'readline';
import NvidiaClient from '../core/api/nvidia.js';

dotenv.config();

async function responseMode() {
  console.log(chalk.blue.bold('🤖 NVIDIA GPT-OSS-20B Response Mode'));
  console.log(chalk.gray('Type "exit" to quit\n'));
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('You: ')
  });

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

    try {
      console.log(chalk.blue('🤖 Processing...'));
      const client = new NvidiaClient();
      const output = await client.respond(message, {
        temperature: 0.7,
        top_p: 0.9,
        max_output_tokens: 1024,
      });
      console.log(chalk.green('AI: ') + output + '\n');
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
    }
    
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.yellow('👋 Response session ended.'));
    process.exit(0);
  });
}

async function singleResponse(message) {
  try {
    const client = new NvidiaClient();
    const output = await client.respond(message, {
      temperature: 0.7,
      top_p: 0.9,
      max_output_tokens: 1024,
    });
    console.log(output);
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await responseMode();
  } else {
    const message = args.join(' ');
    await singleResponse(message);
  }
}

main().catch(console.error);