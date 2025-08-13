"""
AGENTX Command Line Interface

This module provides a command-line interface for interacting with various AI models.
"""

import os
import asyncio
import argparse
import json
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# Import the model registry
from models.registry import registry, ModelType, get_model, list_models
from models.agent import MasterAgent

# Load environment variables
load_dotenv()

class AGENTXCLI:
    """Command-line interface for AGENTX."""
    
    def __init__(self):
        """Initialize the CLI with argument parsing."""
        self.parser = argparse.ArgumentParser(
            description="AGENTX - Multi-Model AI Orchestration CLI",
            formatter_class=argparse.RawDescriptionHelpFormatter
        )
        self.setup_parser()
    
    def setup_parser(self):
        """Set up the argument parser with subcommands."""
        # Top-level commands
        subparsers = self.parser.add_subparsers(dest='command', help='Command to execute')
        
        # List models command
        list_parser = subparsers.add_parser('list', help='List available models')
        list_parser.add_argument(
            '--type', 
            choices=[t.value for t in ModelType],
            help='Filter models by type'
        )
        list_parser.add_argument(
            '--specialized',
            action='store_true',
            help='Show only specialized models'
        )
        
        # Run model command
        run_parser = subparsers.add_parser('run', help='Run a model')
        run_parser.add_argument(
            'model',
            help='Name of the model to run'
        )
        run_parser.add_argument(
            '--prompt',
            help='Input prompt or text'
        )
        run_parser.add_argument(
            '--file',
            type=Path,
            help='File containing input (overrides --prompt if both are provided)'
        )
        run_parser.add_argument(
            '--output',
            type=Path,
            help='Output file (default: print to stdout)'
        )
        run_parser.add_argument(
            '--params',
            type=json.loads,
            default={},
            help='Additional parameters as a JSON string'
        )

        # Agent command (master orchestrator)
        agent_parser = subparsers.add_parser('agent', help='Run the master agent to solve a task')
        agent_parser.add_argument(
            '--task',
            required=True,
            help='Task description for the agent to solve'
        )
        agent_parser.add_argument(
            '--model',
            help='Optional model override (e.g., dbrx-instruct, nv-embed-v1, flux-1)'
        )
        agent_parser.add_argument(
            '--params',
            type=json.loads,
            default={},
            help='Additional parameters as a JSON string for the routed model'
        )
        agent_parser.add_argument(
            '--output',
            type=Path,
            help='Optional file to write the final result to'
        )
        agent_parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show routing and intermediate details'
        )
    
    async def list_models(self, args):
        """Handle the list models command."""
        models = list_models(
            model_type=ModelType(args.type) if args.type else None,
            specialized_only=args.specialized
        )
        
        if not models:
            print("No models found matching the criteria.")
            return
        
        print(f"\n{'Name':<20} {'Type':<15} {'Description'}")
        print("-" * 60)
        for model in models:
            print(f"{model.name:<20} {model.model_type.value:<15} {model.description}")
        print()
    
    async def run_model(self, args):
        """Handle the run model command."""
        # Get input text
        if args.file:
            if not args.file.exists():
                print(f"Error: File not found: {args.file}")
                return
            with open(args.file, 'r', encoding='utf-8') as f:
                input_text = f.read()
        elif args.prompt:
            input_text = args.prompt
        else:
            print("Error: Either --prompt or --file must be provided")
            return
        
        # Get the model
        try:
            model = get_model(args.model, api_key=os.getenv("NVIDIA_API_KEY"), **args.params)
        except ValueError as e:
            print(f"Error: {e}")
            return
        
        # Run the appropriate method based on model type
        try:
            if hasattr(model, 'generate'):
                # For LLM models
                messages = [{"role": "user", "content": input_text}]
                result = await model.generate(messages=messages, **args.params)
                output = result['choices'][0]['message']['content']
            elif hasattr(model, 'get_embeddings'):
                # For retrieval models
                docs = await model.get_embeddings([input_text], **args.params)
                output = json.dumps({
                    "embedding": docs[0].embedding[:10] + ["..."],  # Show first 10 dimensions
                    "length": len(docs[0].embedding) if docs[0].embedding else 0
                }, indent=2)
            elif hasattr(model, 'generate_image'):
                # For visual models
                print(f"Generating image with prompt: {input_text}")
                images = await model.generate_image(prompt=input_text, **args.params)
                if images and args.output:
                    images[0].save(args.output)
                    output = f"Image saved to {args.output}"
                else:
                    output = f"Generated {len(images)} images"
            else:
                output = f"Model {args.model} does not have a supported generation method"
            
            # Output the result
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(str(output))
                print(f"Output written to {args.output}")
            else:
                print("\n=== Output ===\n")
                print(output)
                print("\n==============\n")
                
        except Exception as e:
            print(f"Error running model: {str(e)}")
            if os.getenv("DEBUG"):
                import traceback
                traceback.print_exc()
    
    async def run(self):
        """Run the CLI."""
        args = self.parser.parse_args()
        
        if not args.command:
            self.parser.print_help()
            return
        
        try:
            if args.command == 'list':
                await self.list_models(args)
            elif args.command == 'run':
                if not args.model:
                    print("Error: Model name is required")
                    return
                await self.run_model(args)
            elif args.command == 'agent':
                agent = MasterAgent(api_key=os.getenv("NVIDIA_API_KEY"))
                result = await agent.run(
                    task=args.task,
                    model_override=args.model,
                    params=args.params,
                    verbose=args.verbose,
                )
                final = result.get('final', '')
                if args.output:
                    args.output.write_text(final, encoding='utf-8')
                    print(f"Final result written to {args.output}")
                else:
                    print("\n=== Final Result ===\n")
                    print(final)
                    print("\n====================\n")
            else:
                print(f"Unknown command: {args.command}")
                self.parser.print_help()
        except KeyboardInterrupt:
            print("\nOperation cancelled by user")
        except Exception as e:
            print(f"Error: {str(e)}")
            if os.getenv("DEBUG"):
                import traceback
                traceback.print_exc()

def main():
    """Main entry point for the CLI."""
    cli = AGENTXCLI()
    asyncio.run(cli.run())

if __name__ == "__main__":
    main()
