"""Debug script for the AGENT-X menu system."""
import asyncio
import sys

def debug_hook(type, value, tb):
    if hasattr(sys, 'ps1') or not sys.stderr.isatty():
        # We are in interactive mode or we don't have a tty, so call the default hook
        sys.__excepthook__(type, value, tb)
    else:
        import traceback
        # Write the traceback to stderr
        traceback.print_exception(type, value, tb, file=sys.stderr)
        # Then exit with error code 1
        sys.exit(1)

# Set the exception hook
sys.excepthook = debug_hook

print("Starting AGENT-X menu with debug output...")

# Add current directory to path if needed
import os
import sys
sys.path.insert(0, os.path.abspath('.'))

# Now import and run the menu
print("Importing menu...")
try:
    from agentx.cli.menu import run_menu
    print("Running menu...")
    asyncio.run(run_menu())
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    raise
