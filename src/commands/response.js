#!/usr/bin/env node

import OpenAI from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { createInterface } from 'readline';

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
      
      const response = await openai.responses.create({
        model: "openai/gpt-oss-20b",
        input: [message],
        max_output_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
      });

      console.log(chalk.green('AI: ') + response.output_text + '\n');
      
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
    const response = await openai.responses.create({
      model: "openai/gpt-oss-20b",
      input: [message],
      max_output_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
    });

    console.log(response.output_text);
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