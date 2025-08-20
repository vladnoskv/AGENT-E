#!/usr/bin/env python3
"""
AGENT-X Web UI Launcher

This script handles the setup and launching of the AGENT-X web interface.
"""

import os
import sys
import subprocess
import platform
import time
from pathlib import Path

def run_command(cmd, cwd=None, shell=False):
    """Run a command and print its output in real-time."""
    print(f"\n$ {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    process = subprocess.Popen(
        cmd,
        cwd=cwd,
        shell=shell,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
    )
    
    # Print output in real-time
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        if output:
            print(output.strip())
    
    return process.poll()

def check_node_installed():
    """Check if Node.js and npm are installed."""
    try:
        subprocess.run(
            ["node", "--version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        subprocess.run(
            ["npm", "--version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False

def install_dependencies(frontend_dir):
    """Install frontend dependencies."""
    print("\n🔧 Installing frontend dependencies...")
    return run_command("npm install", cwd=frontend_dir, shell=True)

def start_development_servers(project_root, frontend_dir):
    """Start both frontend and backend development servers."""
    import webbrowser
    import threading
    
    # Start backend server in a separate thread
    def start_backend():
        print("\n🚀 Starting backend server...")
        run_command(
            [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd=str(project_root / "web")
        )
    
    backend_thread = threading.Thread(target=start_backend)
    backend_thread.daemon = True
    backend_thread.start()
    
    # Wait for backend to start
    time.sleep(3)
    
    # Start frontend
    print("\n🚀 Starting frontend development server...")
    webbrowser.open("http://localhost:3000")
    run_command("npm start", cwd=frontend_dir, shell=True)

def main():
    """Main entry point for the web UI launcher."""
    print("\n🌐 AGENT-X Web UI Launcher")
    print("=" * 50)
    
    # Get project directories
    project_root = Path(__file__).parent
    web_dir = project_root / "web"
    frontend_dir = web_dir / "frontend"
    
    # Check if Node.js is installed
    if not check_node_installed():
        print("\n❌ Node.js and npm are required to run the web UI.")
        print("Please install Node.js from: https://nodejs.org/")
        print("Then restart the application and try again.")
        return 1
    
    # Check if web directory exists
    if not web_dir.exists():
        print(f"\n❌ Web directory not found at: {web_dir}")
        return 1
    
    # Install dependencies if needed
    if not (frontend_dir / "node_modules").exists():
        if install_dependencies(frontend_dir) != 0:
            print("\n❌ Failed to install dependencies.")
            return 1
    
    # Start the development servers
    try:
        start_development_servers(project_root, frontend_dir)
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
