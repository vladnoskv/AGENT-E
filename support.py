#!/usr/bin/env python3
"""
AGENT-X Support Command

This script provides the npm run support functionality by launching
the AGENT-X web interface with both backend and frontend services.
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def main():
    """Main entry point for the support command."""
    print("🌐 AGENT-X Web Support Interface")
    print("=" * 50)
    
    # Get the project root directory
    project_root = Path(__file__).parent
    web_dir = project_root / "web"
    backend_dir = web_dir / "backend"
    frontend_dir = web_dir / "frontend"
    
    # Check if directories exist
    if not web_dir.exists():
        print("❌ Web directory not found. Please check your installation.")
        return 1
    
    if not backend_dir.exists():
        print("❌ Backend directory not found. Please check your installation.")
        return 1
    
    if not frontend_dir.exists():
        print("❌ Frontend directory not found. Please check your installation.")
        return 1
    
    # Install backend dependencies
    print("📦 Installing backend dependencies...")
    requirements_file = project_root / "requirements.txt"
    if requirements_file.exists():
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)], check=False, shell=True)
    
    # Ensure uvicorn is installed
    print("📦 Installing uvicorn for FastAPI...")
    subprocess.run([sys.executable, "-m", "pip", "install", "uvicorn", "fastapi"], check=False, shell=True)
    
    # Install frontend dependencies
    print("📦 Installing frontend dependencies...")
    subprocess.run(["npm", "install"], cwd=str(frontend_dir), check=False)
    
    # Start the services
    print("🚀 Starting AGENT-X services...")
    
    # Start backend
    backend_cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
    backend_process = subprocess.Popen(backend_cmd, cwd=str(backend_dir), shell=True)
    
    # Wait for backend to start
    print("⏳ Waiting for backend to initialize...")
    time.sleep(3)
    
    # Start frontend
    print("🌐 Starting frontend...")
    frontend_cmd = ["npm", "start"]
    frontend_process = subprocess.Popen(frontend_cmd, cwd=str(frontend_dir), shell=True)
    
    # Open browser
    print("🌐 Opening web interface...")
    time.sleep(2)
    webbrowser.open("http://localhost:3000")
    
    print("\n✅ AGENT-X Web Interface is running!")
    print("\n🌐 Frontend: http://localhost:3000")
    print("🔧 Backend:  http://localhost:8000")
    print("🧪 Health Check: http://localhost:8000/api/health")
    print("\n🛑 Press Ctrl+C to stop all services")
    
    try:
        # Wait for processes
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down AGENT-X Web Interface...")
        backend_process.terminate()
        frontend_process.terminate()
        
        # Wait for graceful shutdown
        time.sleep(2)
        
        # Force kill if still running
        if backend_process.poll() is None:
            backend_process.kill()
        if frontend_process.poll() is None:
            frontend_process.kill()
            
        print("✅ All services stopped.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())