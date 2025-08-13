#!/usr/bin/env node
import OpenAI from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

async function verifyNvidiaSetup() {
  console.log(chalk.blue.bold('🔍 NVIDIA GPT-OSS-20B API Setup Verification\n'));

  // Check environment
  const apiKey = process.env.api_key || process.env.NVIDIA_API_KEY;
  
  if (!apiKey) {
    console.log(chalk.red('❌ API Key Missing'));
    console.log(chalk.yellow('Please set your API key in .env file:'));
    console.log(chalk.cyan('echo "api_key=your_nvidia_api_key_here" > .env'));
    process.exit(1);
  }

  console.log(chalk.green('✅ API Key Found'));
  console.log(chalk.gray(`Base URL: https://integrate.api.nvidia.com/v1`));
  console.log(chalk.gray(`Model: openai/gpt-oss-20b\n`));

  try {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    console.log(chalk.blue('🚀 Testing API connection...'));
    
    const response = await openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: "Hello! Please respond with: 'NVIDIA GPT-OSS-20B is working correctly!'" }],
      max_tokens: 50,
      temperature: 0.1
    });

    const result = response.choices[0]?.message?.content?.trim();
    
    if (result && result.toLowerCase().includes('working')) {
      console.log(chalk.green('✅ API Test Successful!'));
      console.log(chalk.gray('Response:'), result);
      console.log(chalk.green('\n🎉 Your NVIDIA GPT-OSS-20B setup is ready!'));
      console.log(chalk.blue('You can now use:'));
      console.log(chalk.cyan('  node api-chat-nvidia-oss20b.md'));
      console.log(chalk.cyan('  node api-response-nvidia-oss20b.md'));
      console.log(chalk.cyan('  npm start'));
    } else {
      console.log(chalk.yellow('⚠️  Unexpected response from API'));
      console.log(chalk.gray('Response:'), result);
    }

  } catch (error) {
    if (error.message.includes('401')) {
      console.log(chalk.red('❌ Authentication Failed'));
      console.log(chalk.yellow('Please check your API key is correct'));
    } else if (error.message.includes('404')) {
      console.log(chalk.red('❌ Model Not Found'));
      console.log(chalk.yellow('The model "openai/gpt-oss-20b" may not be available'));
    } else {
      console.log(chalk.red('❌ API Error:'), error.message);
    }
  }
}

verifyNvidiaSetup();