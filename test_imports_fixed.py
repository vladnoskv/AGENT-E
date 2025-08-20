import sys
import os

# Add the project root to Python path
project_root = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, project_root)

try:
    import agentx
    print("✅ Successfully imported agentx package")
    print(f"Version: {getattr(agentx, '__version__', 'Not found')}")
    
    # Test importing from submodules
    try:
        from agentx.cli.menu import MenuSystem
        print("✅ Successfully imported MenuSystem from agentx.cli.menu")
    except ImportError as e:
        print(f"❌ Failed to import MenuSystem: {e}")
        print("Current sys.path:", sys.path)
        
except ImportError as e:
    print(f"❌ Failed to import agentx: {e}")
    print("Current sys.path:", sys_path=sys.path)
