"""
Test script for the AGENT-X CLI menu system.
"""
import asyncio
from agentx.cli.menu import run_menu

async def test_menu():
    """Test the AGENT-X menu system."""
    print("Starting AGENT-X menu test...")
    await run_menu()
    print("Menu test completed.")

if __name__ == "__main__":
    asyncio.run(test_menu())
