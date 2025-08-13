import OpenAI from 'openai';
import dotenv from 'dotenv';
import ToolRunner from './tool-runner.js';

// Load environment variables
dotenv.config();

class AIAssistant {
  constructor() {
    this.openai = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
    });
    this.model = 'openai/gpt-oss-20b';
    this.toolRunner = new ToolRunner();
    this.tools = [
      {
        type: 'function',
        function: {
          name: 'scan_directory',
          description: 'Scan a directory and return file structure',
          parameters: {
            type: 'object',
            properties: {
              dirPath: { type: 'string', description: 'Directory path to scan' },
              pattern: { type: 'string', description: 'File pattern to match' },
              maxDepth: { type: 'number', description: 'Maximum directory depth' }
            },
            required: ['dirPath']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read content from a file',
          parameters: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'File path to read' },
              lineStart: { type: 'number', description: 'Starting line number' },
              lineEnd: { type: 'number', description: 'Ending line number' }
            },
            required: ['filePath']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'write_file',
          description: 'Write content to a file',
          parameters: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'File path to write' },
              content: { type: 'string', description: 'Content to write' },
              createBackup: { type: 'boolean', description: 'Create backup before writing' }
            },
            required: ['filePath', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'edit_file',
          description: 'Edit specific lines in a file',
          parameters: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'File path to edit' },
              lineStart: { type: 'number', description: 'Starting line number' },
              lineEnd: { type: 'number', description: 'Ending line number' },
              newContent: { type: 'string', description: 'New content to replace' }
            },
            required: ['filePath', 'lineStart', 'lineEnd', 'newContent']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_files',
          description: 'Search files for text or patterns',
          parameters: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'File pattern to search' },
              searchText: { type: 'string', description: 'Text to search for' },
              path: { type: 'string', description: 'Directory to search in' },
              fileType: { type: 'string', description: 'File extension filter' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'run_command',
          description: 'Execute a shell command',
          parameters: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Command to execute' },
              workingDir: { type: 'string', description: 'Working directory' },
              timeout: { type: 'number', description: 'Timeout in milliseconds' }
            },
            required: ['command']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_directory',
          description: 'Create a new directory',
          parameters: {
            type: 'object',
            properties: {
              dirPath: { type: 'string', description: 'Directory path to create' }
            },
            required: ['dirPath']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'delete_file',
          description: 'Delete a file or directory',
          parameters: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'File or directory to delete' },
              recursive: { type: 'boolean', description: 'Delete recursively' }
            },
            required: ['filePath']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_file_info',
          description: 'Get detailed file information',
          parameters: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'File path to inspect' }
            },
            required: ['filePath']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'find_and_replace',
          description: 'Find and replace text in files',
          parameters: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'File path to modify' },
              pattern: { type: 'string', description: 'Pattern to find' },
              replacement: { type: 'string', description: 'Text to replace with' },
              useRegex: { type: 'boolean', description: 'Use regex for pattern' }
            },
            required: ['filePath', 'pattern', 'replacement']
          }
        }
      }
    ];
  }

  async processMessage(message, history = []) {
    const messages = [
      {
        role: 'system',
        content: `You are an AI assistant with access to file system and terminal tools. You can help users by:
1. Scanning and analyzing their codebase
2. Reading and understanding file contents
3. Making targeted edits and improvements
4. Running commands and scripts
5. Creating new files and directories
6. Searching for specific patterns or text

Always provide clear explanations of what you're doing and why. Be careful with destructive operations and ask for confirmation when appropriate.`
      },
      ...history,
      { role: 'user', content: message }
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        tools: this.tools,
        tool_choice: 'auto',
        max_tokens: 4000,
        temperature: 0.1
      });

      const toolCalls = response.choices[0]?.message?.tool_calls;
      
      if (toolCalls && toolCalls.length > 0) {
        const toolResults = [];
        
        for (const toolCall of toolCalls) {
          const { name, arguments: args } = toolCall.function;
          const parsedArgs = JSON.parse(args);
          
          let result;
          try {
            switch (name) {
              case 'scan_directory':
                result = await this.toolRunner.scanDirectory(
                  parsedArgs.dirPath,
                  parsedArgs.pattern,
                  parsedArgs.maxDepth
                );
                break;
              case 'read_file':
                result = await this.toolRunner.readFile(
                  parsedArgs.filePath,
                  parsedArgs.lineStart,
                  parsedArgs.lineEnd
                );
                break;
              case 'write_file':
                result = await this.toolRunner.writeFile(
                  parsedArgs.filePath,
                  parsedArgs.content,
                  parsedArgs.createBackup
                );
                break;
              case 'edit_file':
                result = await this.toolRunner.editFile(
                  parsedArgs.filePath,
                  parsedArgs.lineStart,
                  parsedArgs.lineEnd,
                  parsedArgs.newContent
                );
                break;
              case 'search_files':
                result = await this.toolRunner.searchFiles(parsedArgs);
                break;
              case 'run_command':
                result = await this.toolRunner.runCommand(
                  parsedArgs.command,
                  parsedArgs.workingDir,
                  parsedArgs.timeout
                );
                break;
              case 'create_directory':
                result = await this.toolRunner.createDirectory(parsedArgs.dirPath);
                break;
              case 'delete_file':
                result = await this.toolRunner.deleteFile(
                  parsedArgs.filePath,
                  parsedArgs.recursive
                );
                break;
              case 'get_file_info':
                result = await this.toolRunner.getFileInfo(parsedArgs.filePath);
                break;
              case 'find_and_replace':
                result = await this.toolRunner.findAndReplace(
                  parsedArgs.filePath,
                  parsedArgs.pattern,
                  parsedArgs.replacement,
                  parsedArgs.useRegex
                );
                break;
              default:
                result = { error: `Unknown tool: ${name}` };
            }
            
            toolResults.push({
              tool_call_id: toolCall.id,
              result
            });
          } catch (error) {
            toolResults.push({
              tool_call_id: toolCall.id,
              result: { error: error.message }
            });
          }
        }

        // Get final response with tool results
        const finalResponse = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            ...messages,
            response.choices[0].message,
            {
              role: 'tool',
              content: JSON.stringify(toolResults)
            }
          ],
          max_tokens: 4000,
          temperature: 0.1
        });

        return {
          response: finalResponse.choices[0].message.content,
          toolResults,
          toolCalls: toolCalls.map(tc => ({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments)
          }))
        };
      }

      return {
        response: response.choices[0].message.content,
        toolResults: [],
        toolCalls: []
      };

    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: `Error: ${error.message}`,
        toolResults: [],
        toolCalls: []
      };
    }
  }

  async interactiveMode() {
    console.log('🤖 AI Assistant with Tool Support - Interactive Mode');
    console.log('Type your questions or commands. Type "exit" to quit.\n');

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const history = [];

    const ask = () => {
      rl.question('> ', async (input) => {
        if (input.toLowerCase() === 'exit') {
          console.log('Goodbye!');
          rl.close();
          return;
        }

        if (input.trim()) {
          console.log('🔄 Processing...');
          const result = await this.processMessage(input, history);
          
          console.log('\n' + result.response);
          
          if (result.toolCalls.length > 0) {
            console.log('\n📋 Tools used:');
            result.toolCalls.forEach(tool => {
              console.log(`  - ${tool.name}: ${JSON.stringify(tool.arguments)}`);
            });
          }

          history.push({ role: 'user', content: input });
          history.push({ role: 'assistant', content: result.response });
        }

        ask();
      });
    };

    ask();
  }
}

// CLI usage
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const assistant = new AIAssistant();
  
  if (process.argv.length > 2) {
    // Command line mode
    const message = process.argv.slice(2).join(' ');
    const result = await assistant.processMessage(message);
    console.log(result.response);
  } else {
    // Interactive mode
    await assistant.interactiveMode();
  }
}

export default AIAssistant;