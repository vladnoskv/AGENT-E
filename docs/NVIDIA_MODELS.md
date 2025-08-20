# NVIDIA Model Integration

This document provides information on how to use the NVIDIA AI models integrated into AGENT-X.

## Available Models

1. **Qwen 2.5 Coder 32B** (`Qwen2_5Coder32B`)
   - Specialized for code generation and understanding
   - Optimized for programming tasks and technical documentation

2. **Llama 3.1 Nemotron 70B** (`Llama3_1Nemotron70B`)
   - General-purpose language model
   - Good balance of performance and capability

3. **Llama 3.3 Nemotron Super 49B** (`Llama3_3NemotronSuper49B`)
   - Advanced model with enhanced capabilities
   - Best for complex reasoning and advanced tasks

## Prerequisites

1. NVIDIA API Key
   - Sign up at [NVIDIA API Portal](https://api.nvidia.com/)
   - Get your API key from the dashboard
   - Set it as an environment variable:
     ```bash
     export NVIDIA_API_KEY='your-api-key-here'
     ```
   - Or in Python:
     ```python
     import os
     os.environ["NVIDIA_API_KEY"] = "your-api-key-here"
     ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Basic Usage

### Importing Models

```python
from agentx.models import Qwen2_5Coder32B, Llama3_1Nemotron70B, Llama3_3NemotronSuper49B
```

### Basic Text Generation

```python
import asyncio
from agentx.models import Qwen2_5Coder32B

async def main():
    model = Qwen2_5Coder32B()
    
    async with model:
        response = await model.generate(
            messages=[
                {"role": "user", "content": "Explain how to use Python's asyncio"}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        print(response.content)

if __name__ == "__main__":
    asyncio.run(main())
```

### Using Tools

```python
import asyncio
from agentx.models import Qwen2_5Coder32B

async def main():
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get the current weather in a given location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string"},
                        "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
                    },
                    "required": ["location"]
                }
            }
        }
    ]
    
    model = Qwen2_5Coder32B()
    
    async with model:
        response = await model.generate_with_tools(
            messages=[
                {"role": "user", "content": "What's the weather like in San Francisco?"}
            ],
            tools=tools,
            tool_choice="auto"
        )
        
        if response.metadata.get("tool_calls"):
            for tool_call in response.metadata["tool_calls"]:
                print(f"Tool call: {tool_call['function']['name']}")
                print(f"Arguments: {tool_call['function']['arguments']}")
        else:
            print(response.content)

if __name__ == "__main__":
    asyncio.run(main())
```

## Advanced Features

### Streaming Responses

```python
async def stream_example():
    model = Qwen2_5Coder32B()
    
    async with model:
        stream = await model.generate(
            messages=[{"role": "user", "content": "Tell me a story"}],
            stream=True
        )
        
        async for chunk in stream:
            print(chunk.content, end="", flush=True)
```

### Custom Parameters

You can customize various parameters when generating text:

- `temperature`: Controls randomness (0.0 to 1.0)
- `top_p`: Controls diversity via nucleus sampling
- `max_tokens`: Maximum number of tokens to generate
- `presence_penalty`: Penalize new tokens based on their existence in the text so far
- `frequency_penalty`: Penalize new tokens based on their frequency in the text so far

```python
response = await model.generate(
    messages=[{"role": "user", "content": "Write a poem"}],
    temperature=0.8,
    top_p=0.9,
    max_tokens=300,
    presence_penalty=0.2,
    frequency_penalty=0.1
)
```

## Error Handling

```python
from openai import APIError, APITimeoutError

try:
    response = await model.generate(messages=[...])
except APIError as e:
    print(f"API Error: {e}")
except APITimeoutError as e:
    print(f"Request timed out: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
```

## Best Practices

1. **Rate Limiting**: Be mindful of rate limits when making multiple requests.
2. **Error Handling**: Always implement proper error handling for production use.
3. **Session Management**: Use the context manager (`async with model:`) to ensure proper cleanup.
4. **Tool Validation**: Always validate tool inputs before execution.
5. **Token Limits**: Be aware of the model's token limits for both input and output.

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Ensure the `NVIDIA_API_KEY` environment variable is set
   - Check for typos in the API key

2. **Connection Issues**
   - Verify your internet connection
   - Check if the NVIDIA API is experiencing downtime

3. **Model Not Found**
   - Ensure you're using the correct model name
   - Check if the model is available in your region

For additional help, refer to the [NVIDIA API Documentation](https://docs.nvidia.com/ai/).
