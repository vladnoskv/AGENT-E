"""
AGENT-X Command Line Interface.

This module serves as the main entry point for the AGENT-X CLI.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path
from typing import Optional, List

from rich.console import Console
from rich.panel import Panel

from agentx import __version__
from agentx.orchestrator import AgentOrchestrator
from .menu import run_menu

console = Console()


def parse_args(args: Optional[List[str]] = None) -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="AGENT-X - Multi-Model AI Orchestration Tool",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Global arguments
    parser.add_argument(
        "--version",
        action="store_true",
        help="Show version and exit"
    )
    
    # Subcommands
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Run command
    run_parser = subparsers.add_parser("run", help="Run a task with AGENT-X")
    run_parser.add_argument("task", help="Task description or question")
    run_parser.add_argument("--file", help="File to operate on")
    run_parser.add_argument("--model", default="dbrx-instruct", help="Model to use")
    
    # List models command
    list_parser = subparsers.add_parser("list-models", help="List available models")
    
    # Interactive mode (default)
    subparsers.add_parser("interactive", help="Start interactive mode (default)")
    
    # If no arguments, default to interactive mode
    if len(sys.argv) == 1:
        return parser.parse_args(["interactive"])
    
    return parser.parse_args(args)


async def main():
    """Main entry point for the CLI."""
    args = parse_args()
    
    if args.version:
        console.print(f"AGENT-X v{__version__}")
        return
    
    try:
        if args.command == "run":
            orchestrator = AgentOrchestrator(model=args.model)
            if args.file:
                result = await orchestrator.edit_file(args.file, args.task)
                if result.get("success", False):
                    console.print("\n", style="green")
                    console.print(f"File updated: {args.file}", style="green")
                else:
                    console.print("\n", style="red")
                    error_msg = result.get('error', 'Unknown error')
                    console.print(f"Failed to update file: {error_msg}", style="red")
            else:
                response = await orchestrator.call_model(args.task)
                console.print("\n", style="bold")
                console.print("Response:", style="bold")
                console.print(response)
                
        elif args.command == "list-models":
            await list_models()
            
        else:  # interactive mode
            await run_menu()
            
    except KeyboardInterrupt:
        console.print("\nOperation cancelled by user.")
    except Exception as e:
        console.print(f"\n[red]Error:[/] {str(e)}")
        return 1
    
    return 0


def cli():
    """CLI entry point that handles asyncio setup."""
    try:
        return asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\nOperation cancelled by user.")
        return 1
    except Exception as e:
        console.print(f"\n[red]Error:[/] {str(e)}")
        return 1


if __name__ == "__main__":
    sys.exit(cli())
