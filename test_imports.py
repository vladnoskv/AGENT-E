try:
    import agentx
    from agentx.cli.menu import MenuSystem
    print("✅ All imports successful!")
    print(f"AGENT-X version: {agentx.__version__ if hasattr(agentx, '__version__') else 'Not set'}")
except ImportError as e:
    print(f"❌ Import error: {e}")
    import sys
    print(f"Python path: {sys.path}")
