"""
Example script demonstrating how to use NVIDIA models with tool calling.

This script shows how to initialize and use the NVIDIA models with tool calling capabilities.
"""

import asyncio
import os
from agentx.models import Qwen2_5Coder32B, Llama3_1Nemotron70B, Llama3_3NemotronSuper49B

async def main():
    # Get API key from environment variable
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        print("Please set the NVIDIA_API_KEY environment variable")
        return

    # Example tools for the model to use
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get the current weather in a given location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "The city and state, e.g., San Francisco, CA"
                        },
                        "unit": {
                            "type": "string",
                            "enum": ["celsius", "fahrenheit"]
                        }
                    },
                    "required": ["location"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "execute_code",
                "description": "Execute Python code and return the result",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "The Python code to execute"
                        }
                    },
                    "required": ["code"]
                }
            }
        }
    ]

    # Initialize the model
    model = Qwen2_5Coder32B(api_key=api_key)

    # Example conversation with tool use
    messages = [
        {"role": "system", "content": "You are a helpful assistant that can use tools. When using tools, respond with just the tool call and nothing else."},
        {"role": "user", "content": "What's the weather like in San Francisco?"}
    ]

    print("Sending request to NVIDIA model...")
    
    # Get the model's response with tool calls
    async with model:
        response = await model.generate_with_tools(
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )

    # Process the response
    print("\nModel response:")
    if response.metadata.get("tool_calls"):
        print("Tool calls detected:")
        for tool_call in response.metadata["tool_calls"]:
            print(f"- {tool_call['function']['name']}: {tool_call['function']['arguments']}")
    else:
        print(response.content)

    # Example with code generation
    print("\nExample with code generation:")
    messages = [
        {"role": "system", "content": "You are a helpful coding assistant. Generate Python code to solve the given problem."},
        {"role": "user", "content": "Write a Python function to calculate the nth Fibonacci number using memoization."}
    ]

    async with model:
        response = await model.generate(
            messages=messages,
            temperature=0.3,
            max_tokens=500
        )

    print("\nGenerated code:")
    print(response.content)

if __name__ == "__main__":
    asyncio.run(main())
