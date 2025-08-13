"""
Core Agent Implementation

This module contains the core agent classes for the AGENTX system.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Any, Optional, Callable, Union, Type, TypeVar
import asyncio
import logging
import json
from pathlib import Path

from rich.console import Console
from pydantic import BaseModel, Field

from .tools import Tool, ToolRegistry, ToolType
from .workflow import Workflow, WorkflowStatus, WorkflowResult

# Configure logging
logger = logging.getLogger(__name__)

class AgentStatus(str, Enum):
    """Status of an agent."""
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"
    COMPLETED = "completed"
    WAITING_FOR_INPUT = "waiting_for_input"

class AgentMemory(BaseModel):
    """Memory for an agent to maintain context across interactions."""
    short_term: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Short-term memory for recent interactions"
    )
    long_term: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Long-term memory for important information"
    )
    
    def add_short_term(self, item: Dict[str, Any]):
        """Add an item to short-term memory."""
        self.short_term.append(item)
        # Keep only the last N items in short-term memory
        if len(self.short_term) > 100:  # TODO: Make this configurable
            self.short_term = self.short_term[-50:]
    
    def add_long_term(self, item: Dict[str, Any]):
        """Add an item to long-term memory."""
        self.long_term.append(item)
    
    def get_context(self, max_items: int = 10) -> List[Dict[str, Any]]:
        """Get context from memory."""
        # Combine and sort memories by timestamp if available
        all_memories = self.long_term + self.short_term
        all_memories.sort(
            key=lambda x: x.get("timestamp", 0),
            reverse=True
        )
        return all_memories[:max_items]

class AgentConfig(BaseModel):
    """Configuration for an agent."""
    name: str = Field(..., description="Unique name for the agent")
    model: str = Field(..., description="Name of the model to use")
    tools: List[str] = Field(
        default_factory=list,
        description="List of tool names the agent can use"
    )
    max_steps: int = Field(
        default=10,
        description="Maximum number of steps the agent can take in a single run"
    )
    temperature: float = Field(
        default=0.7,
        description="Temperature for generation (0.0 to 2.0)",
        ge=0.0,
        le=2.0
    )
    verbose: bool = Field(
        default=False,
        description="Whether to print debug information"
    )
    memory_window: int = Field(
        default=10,
        description="Number of previous interactions to keep in context"
    )
    system_prompt: str = Field(
        default="You are a helpful AI assistant.",
        description="System prompt to guide the agent's behavior"
    )

class Agent:
    """Base agent class implementing the core agent functionality."""
    
    def __init__(self, config: AgentConfig):
        """Initialize the agent with the given configuration."""
        self.config = config
        self.status = AgentStatus.IDLE
        self.tools: Dict[str, Tool] = {}
        self.history: List[Dict[str, Any]] = []
        self.memory = AgentMemory()
        self.console = Console()
        self._tool_registry = ToolRegistry()
        self._current_workflow: Optional[Workflow] = None
    
    def register_tool(self, tool: Tool) -> None:
        """Register a tool with the agent.
        
        Args:
            tool: The tool to register
            
        Raises:
            ValueError: If a tool with the same name is already registered
        """
        self._tool_registry.register(tool)
        self.tools[tool.name] = tool
        logger.info(f"Registered tool: {tool.name}")
    
    def load_tools_from_directory(self, directory: str) -> None:
        """Load tools from a directory containing Python modules.
        
        Args:
            directory: Path to the directory containing tool modules
        """
        self._tool_registry.load_tools_from_directory(directory)
        # Update the agent's tools dictionary
        for tool in self._tool_registry.list_tools():
            if tool["name"] not in self.tools:
                self.tools[tool["name"]] = self._tool_registry.get(tool["name"])
    
    async def execute_tool(self, tool_name: str, **kwargs) -> Any:
        """Execute a tool with the given parameters.
        
        Args:
            tool_name: Name of the tool to execute
            **kwargs: Parameters to pass to the tool
            
        Returns:
            The result of the tool execution
            
        Raises:
            ValueError: If the tool is not found or execution fails
        """
        tool = self._tool_registry.get(tool_name)
        if not tool:
            raise ValueError(f"Tool not found: {tool_name}")
        
        try:
            self.console.print(f"[bold]Executing tool:[/] {tool_name}")
            if self.config.verbose:
                self.console.print(f"[dim]Parameters: {json.dumps(kwargs, indent=2)}[/]")
            
            result = await tool(**kwargs)
            
            if self.config.verbose:
                self.console.print(f"[dim]Result: {json.dumps(result, indent=2)}[/]")
            
            # Add to history
            self.history.append({
                "role": "tool",
                "name": tool_name,
                "content": json.dumps(result),
                "timestamp": asyncio.get_event_loop().time()
            })
            
            # Add to memory
            self.memory.add_short_term({
                "type": "tool_execution",
                "tool": tool_name,
                "parameters": kwargs,
                "result": result,
                "timestamp": asyncio.get_event_loop().time()
            })
            
            return result
            
        except Exception as e:
            error_msg = f"Tool execution failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            self.history.append({
                "role": "system",
                "content": f"Error executing tool {tool_name}: {str(e)}",
                "error": True,
                "timestamp": asyncio.get_event_loop().time()
            })
            raise ValueError(error_msg) from e
    
    async def execute_workflow(self, workflow: Workflow, **kwargs) -> WorkflowResult:
        """Execute a workflow using the agent.
        
        Args:
            workflow: The workflow to execute
            **kwargs: Initial context for the workflow
            
        Returns:
            The result of the workflow execution
        """
        self.status = AgentStatus.RUNNING
        self._current_workflow = workflow
        
        # Add system message to history
        self.history.append({
            "role": "system",
            "content": f"Starting workflow: {workflow.name}",
            "timestamp": asyncio.get_event_loop().time()
        })
        
        try:
            # Execute the workflow
            result = await workflow.run(initial_context=kwargs)
            
            # Update status based on result
            if result.status == WorkflowStatus.COMPLETED:
                self.status = AgentStatus.COMPLETED
                self.history.append({
                    "role": "system",
                    "content": f"Workflow completed: {workflow.name}",
                    "timestamp": asyncio.get_event_loop().time()
                })
            else:
                self.status = AgentStatus.ERROR
                self.history.append({
                    "role": "system",
                    "content": f"Workflow failed: {result.error}",
                    "error": True,
                    "timestamp": asyncio.get_event_loop().time()
                })
            
            return result
            
        except Exception as e:
            self.status = AgentStatus.ERROR
            error_msg = f"Workflow execution failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            self.history.append({
                "role": "system",
                "content": error_msg,
                "error": True,
                "timestamp": asyncio.get_event_loop().time()
            })
            raise
            
        finally:
            self._current_workflow = None
    
    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the agent.
        
        Returns:
            Dictionary containing agent status information
        """
        return {
            "name": self.config.name,
            "status": self.status.value,
            "model": self.config.model,
            "tools": list(self.tools.keys()),
            "history_length": len(self.history),
            "memory": {
                "short_term": len(self.memory.short_term),
                "long_term": len(self.memory.long_term)
            },
            "current_workflow": self._current_workflow.name if self._current_workflow else None
        }
    
    def reset(self) -> None:
        """Reset the agent's state."""
        self.status = AgentStatus.IDLE
        self.history = []
        self.memory = AgentMemory()
        self._current_workflow = None

class AgentManager:
    """Manages multiple agents and their lifecycle."""
    
    def __init__(self):
        """Initialize the agent manager."""
        self.agents: Dict[str, Agent] = {}
        self.console = Console()
    
    def create_agent(self, config: AgentConfig) -> Agent:
        """Create a new agent with the given configuration.
        
        Args:
            config: Configuration for the agent
            
        Returns:
            The created agent
            
        Raises:
            ValueError: If an agent with the same name already exists
        """
        if config.name in self.agents:
            raise ValueError(f"Agent with name '{config.name}' already exists")
        
        agent = Agent(config)
        self.agents[config.name] = agent
        logger.info(f"Created agent: {config.name}")
        return agent
    
    def get_agent(self, name: str) -> Optional[Agent]:
        """Get an agent by name.
        
        Args:
            name: Name of the agent to get
            
        Returns:
            The agent if found, None otherwise
        """
        return self.agents.get(name)
    
    def list_agents(self) -> List[Dict[str, Any]]:
        """List all agents and their status.
        
        Returns:
            List of agent status dictionaries
        """
        return [
            {
                "name": name,
                "status": agent.status.value,
                "model": agent.config.model,
                "tools": list(agent.tools.keys())
            }
            for name, agent in self.agents.items()
        ]
    
    async def stop_agent(self, name: str, force: bool = False) -> bool:
        """Stop a running agent.
        
        Args:
            name: Name of the agent to stop
            force: Whether to force stop the agent
            
        Returns:
            True if the agent was stopped, False otherwise
        """
        agent = self.get_agent(name)
        if not agent:
            return False
        
        if agent.status == AgentStatus.RUNNING:
            if force:
                agent.status = AgentStatus.IDLE
                logger.warning(f"Force stopped agent: {name}")
            else:
                # Try graceful shutdown
                agent.status = AgentStatus.PAUSED
                # TODO: Implement proper cleanup
                logger.info(f"Stopped agent: {name}")
        
        return True
