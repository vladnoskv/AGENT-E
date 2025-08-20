"""
AGENT-X Web Interface - Backend

FastAPI-based backend for the AGENT-X web interface.
"""

import os
import uvicorn

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Dict, List, Optional
import json
import asyncio
import logging
from pathlib import Path
import sys
from dotenv import load_dotenv

# Add project root to sys.path and load environment
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent.parent  # .../web/backend -> project root
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Load environment variables from .env at project root
load_dotenv(dotenv_path=project_root / ".env", override=False)

# Import AGENT-X components
from agentx.models.registry import ModelRegistry
from agentx.agents.super_agent import SuperAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AGENT-X Web Interface",
    description="Web interface for interacting with AGENT-X AI agents",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
model_registry = None
super_agent = None
active_sessions = {}

# Pydantic models for request/response
class AgentRequest(BaseModel):
    task: str
    agent_name: Optional[str] = None
    context: Optional[Dict] = {}

class WebSocketMessage(BaseModel):
    type: str  # "task", "status", "result", "error"
    data: Dict

# Initialize AGENT-X components
@app.on_event("startup")
async def startup_event():
    global model_registry, super_agent
    try:
        # Log key presence (not the value) to aid debugging
        if os.getenv("NVIDIA_API_KEY"):
            logger.info("NVIDIA_API_KEY detected from environment")
        else:
            logger.warning("NVIDIA_API_KEY not set. Set it in your .env at project root or environment.")

        # Initialize model registry
        model_registry = ModelRegistry()

        # Initialize super agent
        super_agent = SuperAgent(
            model_registry=model_registry,
            verbose=True
        )

        logger.info("AGENT-X components initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize AGENT-X: {str(e)}")
        raise

# API Routes
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "AGENT-X Web Interface is running"}

@app.get("/api/agents")
async def list_agents():
    if not super_agent:
        raise HTTPException(status_code=503, detail="SuperAgent not initialized")

    agents = [
        {"name": name, "role": agent.role.value if hasattr(agent, 'role') else 'unknown'}
        for name, agent in super_agent.agents.items()
    ]
    return {"agents": agents}

@app.post("/api/execute")
async def execute_task(request: AgentRequest):
    if not super_agent:
        raise HTTPException(status_code=503, detail="SuperAgent not initialized")

    try:
        # Execute the task
        result = await super_agent.execute_task(
            task=request.task,
            initial_agent=request.agent_name,
            context=request.context or {}
        )

        return {
            "success": result.get("success", False),
            "content": result.get("content", ""),
            "metadata": result.get("metadata", {})
        }
    except Exception as e:
        logger.error(f"Error executing task: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time interaction
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    session_id = id(websocket)
    active_sessions[session_id] = websocket

    try:
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)

                if message.get("type") == "execute":
                    await handle_execute_message(websocket, message)

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": "Invalid JSON format"}
                })
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}", exc_info=True)
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": str(e)}
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
    finally:
        active_sessions.pop(session_id, None)

async def handle_execute_message(websocket: WebSocket, message: Dict):
    """Handle execute messages from WebSocket."""
    try:
        task = message.get("task")
        agent_name = message.get("agent_name")
        context = message.get("context", {})

        if not task:
            await websocket.send_json({
                "type": "error",
                "data": {"message": "Task is required"}
            })
            return

        # Send status update
        await websocket.send_json({
            "type": "status",
            "data": {"message": f"Executing task with {agent_name or 'default agent'}"}
        })

        # Execute the task
        result = await super_agent.execute_task(
            task=task,
            initial_agent=agent_name,
            context=context
        )

        # Send the result
        await websocket.send_json({
            "type": "result",
            "data": {
                "content": result.get("content", ""),
                "metadata": result.get("metadata", {})
            }
        })

    except Exception as e:
        logger.error(f"Error handling execute message: {str(e)}", exc_info=True)
        await websocket.send_json({
            "type": "error",
            "data": {"message": str(e)}
        })

# Serve static files (frontend)
# Resolve build path relative to project root to be robust regardless of CWD
frontend_build_path = (project_root / "web" / "frontend" / "build").resolve()
static_path = frontend_build_path / "static"

# Only mount static files if the directory exists
if static_path.exists() and static_path.is_dir():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
    logger.info(f"Serving static files from: {static_path}")
else:
    logger.warning(f"Static files directory not found at: {static_path}")

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve the React frontend."""
    # Default to index.html for root path
    if not full_path or full_path == "/":
        full_path = "index.html"
    
    file_path = frontend_build_path / full_path
    
    # If the path exists and is a file, serve it
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    
    # For API routes, return 404
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # For all other routes, try to serve index.html (for React Router)
    # but only if it exists
    index_path = frontend_build_path / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    
    # If we get here, the file doesn't exist and we don't have an index.html
    raise HTTPException(status_code=404, detail="Frontend files not found. Please build the frontend first.")
