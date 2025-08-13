"""
AGENTX Agent System

This module provides the core agent system implementation using NVIDIA's NeMo Agent Toolkit.
It includes the main agent class, tool registry, and workflow management.
"""

# Re-export key components for easier imports
from .agent import Agent, AgentConfig, AgentStatus, AgentManager
from .workflow import Workflow, RAGWorkflow, WorkflowStatus, WorkflowStep, WorkflowResult
from .tools import (
    Tool, ToolRegistry, ToolParameter, ToolDefinition, ToolType,
    registry, tool, register_tool, get_tool, list_tools
)

__all__ = [
    # Agent components
    'Agent', 'AgentConfig', 'AgentStatus', 'AgentManager',
    
    # Workflow components
    'Workflow', 'RAGWorkflow', 'WorkflowStatus', 'WorkflowStep', 'WorkflowResult',
    
    # Tool components
    'Tool', 'ToolRegistry', 'ToolParameter', 'ToolDefinition', 'ToolType',
    'registry', 'tool', 'register_tool', 'get_tool', 'list_tools'
]
