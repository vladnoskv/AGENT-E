"""
AGENTX Command Line Interface

This module serves as the main entry point for the AGENTX CLI.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.panel import Panel

from . import __version__
from .menu import Menu
try:
    from dotenv import load_dotenv
except Exception:
    # dotenv is optional; CLI will still work if env is set externally
    load_dotenv = None

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="AGENTX - Multi-Model AI Orchestration Tool",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument(
        "--version",
        action="store_true",
        help="Show version and exit"
    )
    
    parser.add_argument(
        "--list-models",
        action="store_true",
        help="List all available models and exit"
    )
    
    parser.add_argument(
        "--test-all",
        action="store_true",
        help="Test connection to all models and exit"
    )
    
    parser.add_argument(
        "--model",
        type=str,
        help="Run a specific model directly (use with --prompt)"
    )
    
    parser.add_argument(
        "--prompt",
        type=str,
        help="Prompt to send to the model (use with --model)"
    )
    
    parser.add_argument(
        "--config",
        action="store_true",
        help="Show current configuration and exit"
    )
    parser.add_argument(
        "--setup-nim",
        action="store_true",
        help="Interactive setup for NVIDIA NIM (.env writing)"
    )
    parser.add_argument(
        "--index",
        action="store_true",
        help="Run workspace indexer and generate report"
    )
    parser.add_argument(
        "--persona",
        type=str,
        help="Launch expert agents menu (value ignored for now)"
    )
    parser.add_argument(
        "--auto",
        action="store_true",
        help="Start autonomous mode (preview)"
    )
    
    return parser.parse_args()

async def main():
    """Main entry point for the AGENTX CLI."""
    console = Console()
    args = parse_args()
    # Load environment variables from .env if available
    if load_dotenv is not None:
        try:
            load_dotenv()
        except Exception:
            pass
    
    # Show version and exit if requested
    if args.version:
        console.print(f"AGENTX v{__version__}")
        return
    
    # Initialize the menu system
    menu = Menu()
    
    # Handle command line arguments
    if args.list_models:
        await menu._list_models()
    elif args.test_all:
        await menu._test_all_connections()
    elif args.config:
        await menu._show_config()
    elif args.setup_nim:
        await menu._configure_nim()
    elif args.index:
        await menu._index_workspace()
    elif args.persona is not None:
        await menu._expert_agents_menu()
    elif args.auto:
        await menu._autonomous_mode()
    elif args.model and args.prompt:
        await menu._run_model_directly(args.model, args.prompt)
    else:
        # Show interactive menu if no specific command is provided
        await menu.show()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
