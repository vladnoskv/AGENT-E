#!/usr/bin/env python3
"""
AGENT-X CLI Entry Point
"""
import asyncio
import sys
from agentx.cli.menu import run_menu

def main():
    try:
        asyncio.run(run_menu())
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
