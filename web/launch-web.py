#!/usr/bin/env python3
"""
AGENT-X Web Support Launcher

This script launches both the backend and frontend for the AGENT-X web interface.
"""

import subprocess
import sys
import os
import time
import signal
from pathlib import Path

def launch_backend():
    """Launch the FastAPI backend."""
    backend_dir = Path(__file__).parent / "backend"
    
    # Install backend dependencies if needed
    requirements_file = backend_dir.parent.parent / "requirements.txt"
    if requirements_file.exists():
        print("📦 Installing backend dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)], 
                      cwd=backend_dir.parent.parent, check=False)
    
    # Ensure uvicorn is installed
    print("📦 Installing uvicorn for FastAPI...")
    subprocess.run([sys.executable, "-m", "pip", "install", "uvicorn"], check=False)
    
    # Launch backend
    print("🚀 Starting AGENT-X backend...")
    backend_process = subprocess.Popen([
        sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"
    ], cwd=str(backend_dir))
    
    return backend_process

def launch_frontend():
    """Launch the React frontend."""
    frontend_dir = Path(__file__).parent / "frontend"
    
    # Install frontend dependencies if needed
    print("📦 Installing frontend dependencies...")
    subprocess.run(["npm", "install"], cwd=str(frontend_dir), check=False)
    
    # Launch frontend
    print("🚀 Starting AGENT-X frontend...")
    frontend_process = subprocess.Popen([
        "npm", "start"
    ], cwd=str(frontend_dir))
    
    return frontend_process

def main():
    """Main entry point for the web support launcher."""
    print("🌐 AGENT-X Web Support Interface")
    print("=" * 50)
    
    try:
        # Launch backend
        backend_process = launch_backend()
        
        # Give backend time to start
        print("⏳ Waiting for backend to initialize...")
        time.sleep(3)
        
        # Launch frontend
        frontend_process = launch_frontend()
        
        print("\n✅ AGENT-X Web Interface is starting!")
        print("\n🌐 Frontend: http://localhost:3000")
        print("🔧 Backend:  http://localhost:8000")
        print("\n🛑 Press Ctrl+C to stop all services")
        
        # Wait for processes
        try:
            backend_process.wait()
            frontend_process.wait()
        except KeyboardInterrupt:
            print("\n\n🛑 Shutting down AGENT-X Web Interface...")
            backend_process.terminate()
            frontend_process.terminate()
            
            # Wait a bit for graceful shutdown
            time.sleep(2)
            
            # Force kill if still running
            if backend_process.poll() is None:
                backend_process.kill()
            if frontend_process.poll() is None:
                frontend_process.kill()
                
            print("✅ All services stopped.")
            
    except Exception as e:
        print(f"❌ Error launching web interface: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()