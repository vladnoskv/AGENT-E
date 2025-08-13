"""
Tool Registry for AGENTX.

This module provides a registry for tools that can be used by agents.
Tools are functions that agents can call to perform specific tasks.
"""

from typing import Dict, Any, Callable, Optional, List, Type, TypeVar, Generic
from dataclasses import dataclass, field
from enum import Enum
import inspect
import json
import logging
import os
from pathlib import Path
import importlib
import pkgutil

from rich.console import Console
from pydantic import BaseModel, Field, create_model

# Configure logging
logger = logging.getLogger(__name__)

class ToolType(str, Enum):
    """Types of tools available in the system."""
    LLM = "llm"
    RETRIEVAL = "retrieval"
    VISUAL = "visual"
    UTILITY = "utility"
    TRANSFORMATION = "transformation"
    EXTERNAL_API = "external_api"

@dataclass
class ToolParameter:
    """Definition of a tool parameter."""
    name: str
    type: Type
    description: str = ""
    required: bool = True
    default: Any = None

class ToolDefinition(BaseModel):
    """Definition of a tool that can be used by agents."""
    name: str
    description: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    required: List[str] = Field(default_factory=list)
    returns: Dict[str, Any] = Field(default_factory=dict)
    tool_type: ToolType = ToolType.UTILITY
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "web_search",
                "description": "Search the web for information",
                "parameters": {
                    "query": {"type": "string", "description": "Search query"},
                    "num_results": {"type": "integer", "description": "Number of results to return"}
                },
                "required": ["query"],
                "returns": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Search results"
                },
                "tool_type": "external_api"
            }
        }

class Tool:
    """A tool that can be used by agents."""
    
    def __init__(
        self,
        name: str,
        func: Callable,
        description: str = "",
        tool_type: ToolType = ToolType.UTILITY,
        **kwargs
    ):
        """Initialize a tool.
        
        Args:
            name: Unique name of the tool
            func: The function that implements the tool
            description: Description of what the tool does
            tool_type: Type of the tool
            **kwargs: Additional metadata
        """
        self.name = name
        self.func = func
        self.description = description or func.__doc__ or ""
        self.tool_type = tool_type
        self.metadata = kwargs
        
        # Parse function signature for parameters
        self.parameters = self._parse_parameters()
    
    def _parse_parameters(self) -> Dict[str, ToolParameter]:
        """Parse the function signature to get parameter information."""
        sig = inspect.signature(self.func)
        parameters = {}
        
        for name, param in sig.parameters.items():
            if name == 'self':
                continue
                
            # Get type annotation
            param_type = param.annotation
            if param_type == inspect.Parameter.empty:
                param_type = str  # Default to string if no type annotation
            
            # Get default value
            default = param.default if param.default != inspect.Parameter.empty else None
            
            # Get description from docstring if available
            description = ""
            if self.func.__doc__:
                # Simple docstring parsing - could be enhanced with a proper parser
                doc = inspect.getdoc(self.func)
                for line in doc.split('\n'):
                    line = line.strip()
                    if line.startswith(f"{name}:"):
                        description = line.split(':', 1)[1].strip()
            
            parameters[name] = ToolParameter(
                name=name,
                type=param_type,
                description=description,
                required=default is None,
                default=default
            )
        
        return parameters
    
    def to_dict(self) -> dict:
        """Convert the tool to a dictionary."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": {
                    name: {
                        "type": param.type.__name__,
                        "description": param.description,
                        "default": param.default if not param.required else None
                    }
                    for name, param in self.parameters.items()
                },
                "required": [
                    name for name, param in self.parameters.items()
                    if param.required
                ]
            },
            "tool_type": self.tool_type.value,
            **self.metadata
        }
    
    async def __call__(self, **kwargs) -> Any:
        """Execute the tool with the given parameters."""
        # Validate parameters
        self._validate_parameters(kwargs)
        
        # Call the function
        if inspect.iscoroutinefunction(self.func):
            return await self.func(**kwargs)
        else:
            return self.func(**kwargs)
    
    def _validate_parameters(self, params: dict):
        """Validate the input parameters against the tool's signature."""
        # Check for missing required parameters
        missing = [
            name for name, param in self.parameters.items()
            if param.required and name not in params
        ]
        if missing:
            raise ValueError(f"Missing required parameters: {', '.join(missing)}")
        
        # Check parameter types
        for name, value in params.items():
            if name not in self.parameters:
                continue  # Extra parameters are allowed for flexibility
                
            param = self.parameters[name]
            if value is not None and not isinstance(value, param.type):
                try:
                    # Try to convert the type
                    params[name] = param.type(value)
                except (TypeError, ValueError):
                    raise ValueError(
                        f"Parameter '{name}' must be of type {param.type.__name__}, "
                        f"got {type(value).__name__}"
                    )

class ToolRegistry:
    """Registry for managing tools that can be used by agents."""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Ensure only one instance of the registry exists (singleton pattern)."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the tool registry."""
        if not self._initialized:
            self._tools: Dict[str, Tool] = {}
            self._initialized = True
    
    def register(self, tool: Tool) -> None:
        """Register a tool with the registry.
        
        Args:
            tool: The tool to register
            
        Raises:
            ValueError: If a tool with the same name is already registered
        """
        if tool.name in self._tools:
            raise ValueError(f"Tool with name '{tool.name}' is already registered")
        self._tools[tool.name] = tool
        logger.info(f"Registered tool: {tool.name}")
    
    def get(self, name: str) -> Optional[Tool]:
        """Get a tool by name.
        
        Args:
            name: Name of the tool to get
            
        Returns:
            The tool if found, None otherwise
        """
        return self._tools.get(name)
    
    def unregister(self, name: str) -> bool:
        """Unregister a tool.
        
        Args:
            name: Name of the tool to unregister
            
        Returns:
            True if the tool was unregistered, False if it didn't exist
        """
        if name in self._tools:
            del self._tools[name]
            logger.info(f"Unregistered tool: {name}")
            return True
        return False
    
    def list_tools(self, tool_type: Optional[ToolType] = None) -> List[Dict[str, Any]]:
        """List all registered tools.
        
        Args:
            tool_type: If provided, only return tools of this type
            
        Returns:
            List of tool information dictionaries
        """
        tools = self._tools.values()
        if tool_type is not None:
            tools = [t for t in tools if t.tool_type == tool_type]
        return [t.to_dict() for t in tools]
    
    def load_tools_from_module(self, module_name: str) -> None:
        """Load tools from a Python module.
        
        Args:
            module_name: Name of the module to load tools from
            
        Raises:
            ImportError: If the module cannot be imported
        """
        try:
            module = importlib.import_module(module_name)
            self._discover_tools_in_module(module)
        except ImportError as e:
            logger.error(f"Failed to import module {module_name}: {e}")
            raise
    
    def load_tools_from_directory(self, directory: str) -> None:
        """Load tools from all Python modules in a directory.
        
        Args:
            directory: Path to the directory containing Python modules
        """
        directory = Path(directory)
        if not directory.is_dir():
            logger.warning(f"Directory not found: {directory}")
            return
        
        # Add the directory to Python path if needed
        if str(directory.parent) not in sys.path:
            sys.path.insert(0, str(directory.parent))
        
        # Import all Python files in the directory
        for finder, name, _ in pkgutil.iter_modules([str(directory)]):
            try:
                module = importlib.import_module(f"{directory.name}.{name}")
                self._discover_tools_in_module(module)
            except ImportError as e:
                logger.error(f"Failed to import module {name}: {e}")
    
    def _discover_tools_in_module(self, module) -> None:
        """Discover and register tools in a module."""
        for name, obj in inspect.getmembers(module):
            if (
                inspect.isfunction(obj) 
                and hasattr(obj, "_is_tool") 
                and obj._is_tool
            ):
                # Register the tool
                tool = Tool(
                    name=obj._tool_name or obj.__name__,
                    func=obj,
                    description=obj._tool_description or "",
                    tool_type=ToolType(obj._tool_type) if hasattr(obj, "_tool_type") else ToolType.UTILITY
                )
                self.register(tool)

def tool(
    name: Optional[str] = None,
    description: Optional[str] = None,
    tool_type: ToolType = ToolType.UTILITY
):
    """Decorator to mark a function as a tool.
    
    Args:
        name: Optional name for the tool (defaults to function name)
        description: Optional description of the tool
        tool_type: Type of the tool
    """
    def decorator(func):
        func._is_tool = True
        func._tool_name = name or func.__name__
        func._tool_description = description or func.__doc__ or ""
        func._tool_type = tool_type
        return func
    return decorator

# Create a default registry instance
registry = ToolRegistry()

# Helper functions for common operations
def register_tool(tool: Tool) -> None:
    """Register a tool with the default registry."""
    registry.register(tool)

def get_tool(name: str) -> Optional[Tool]:
    """Get a tool by name from the default registry."""
    return registry.get(name)

def list_tools(tool_type: Optional[ToolType] = None) -> List[Dict[str, Any]]:
    """List all tools in the default registry."""
    return registry.list_tools(tool_type)
