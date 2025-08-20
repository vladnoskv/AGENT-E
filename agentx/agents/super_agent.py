"""
Super Agent for AGENT-X

This module implements a SuperAgent that can coordinate between multiple specialized agents,
analyze their outputs, and combine results to solve complex tasks.
"""

from typing import Dict, List, Any, Optional, Type, Union, Callable, Awaitable
from dataclasses import dataclass, field
import asyncio
import json
import logging
from enum import Enum

from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown

from ..models.base import BaseModel, ModelResponse
from ..models.registry import ModelRegistry

logger = logging.getLogger(__name__)
console = Console()

class AgentRole(str, Enum):
    """Roles that specialized agents can play in the system."""
    RESEARCHER = "researcher"
    ANALYST = "analyst"
    CODER = "coder"
    PLANNER = "planner"
    CRITIC = "critic"
    EXECUTOR = "executor"
    MULTIMODAL = "multimodal"
    RETRIEVAL = "retrieval"

@dataclass
class AgentResponse:
    """Structured response from an agent."""
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    success: bool = True
    requires_followup: bool = False
    next_steps: List[Dict[str, Any]] = field(default_factory=list)

class BaseAgent:
    """Base class for all agents in the system."""
    
    def __init__(
        self,
        name: str,
        role: AgentRole,
        model: Optional[BaseModel] = None,
        model_name: Optional[str] = None,
        model_registry: Optional[ModelRegistry] = None,
        **kwargs
    ):
        """Initialize the agent.
        
        Args:
            name: Unique name for the agent
            role: The agent's role in the system
            model: Pre-initialized model instance
            model_name: Name of the model to load from registry
            model_registry: Model registry instance
            **kwargs: Additional agent-specific arguments
        """
        self.name = name
        self.role = role
        self.model = model
        self.model_name = model_name
        self.model_registry = model_registry
        self.console = console
        self.verbose = kwargs.get('verbose', False)
        
        if self.model is None and self.model_name and self.model_registry:
            self.model = self.model_registry.create_model(self.model_name)
        
        if self.model is None:
            raise ValueError("Either model or model_name with model_registry must be provided")
    
    async def process(self, input_data: Any, **kwargs) -> AgentResponse:
        """Process input and return a response.
        
        Args:
            input_data: Input data to process
            **kwargs: Additional processing parameters
            
        Returns:
            AgentResponse with the processing results
        """
        raise NotImplementedError("Subclasses must implement process()")
    
    def _log(self, message: str, level: str = "info"):
        """Log a message with the agent's name and role."""
        if not self.verbose:
            return
            
        log_method = getattr(logger, level.lower(), logger.info)
        log_method(f"[{self.role.upper()}:{self.name}] {message}")
        
        if level.lower() == "debug":
            self.console.print(f"[dim][{self.role}:{self.name}] {message}[/dim]")
        elif level.lower() == "info":
            self.console.print(f"[cyan][{self.role}:{self.name}][/cyan] {message}")
        elif level.lower() in ["warn", "warning"]:
            self.console.print(f"[yellow][{self.role}:{self.name}] {message}[/yellow]")
        elif level.lower() == "error":
            self.console.print(f"[red][{self.role}:{self.name}] {message}[/red]")


class SuperAgent:
    """Orchestrates multiple specialized agents to solve complex tasks."""
    
    def __init__(
        self,
        model_registry: ModelRegistry,
        agents: Optional[Dict[str, BaseAgent]] = None,
        max_iterations: int = 5,
        verbose: bool = True,
        **kwargs
    ):
        """Initialize the SuperAgent.
        
        Args:
            model_registry: Model registry for agent model initialization
            agents: Pre-initialized agents (optional)
            max_iterations: Maximum number of iterations for agent interaction
            verbose: Whether to print detailed logs
            **kwargs: Additional configuration
        """
        self.model_registry = model_registry
        self.agents = agents or {}
        self.max_iterations = max_iterations
        self.verbose = verbose
        self.console = console
        self.history: List[Dict[str, Any]] = []
        
        # Initialize default agents if none provided
        if not self.agents:
            self._initialize_default_agents()
    
    def _initialize_default_agents(self):
        """Initialize default agents for common roles."""
        # Example agent initialization - expand based on your needs
        default_agents = {
            "researcher": BaseAgent(
                name="researcher",
                role=AgentRole.RESEARCHER,
                model_name="llama-3.3-70b-instruct",
                model_registry=self.model_registry,
                verbose=self.verbose
            ),
            "analyst": BaseAgent(
                name="analyst",
                role=AgentRole.ANALYST,
                model_name="mixtral-8x7b-instruct",
                model_registry=self.model_registry,
                verbose=self.verbose
            ),
            "coder": BaseAgent(
                name="coder",
                role=AgentRole.CODER,
                model_name="code-gemma-7b",
                model_registry=self.model_registry,
                verbose=self.verbose
            ),
            "critic": BaseAgent(
                name="critic",
                role=AgentRole.CRITIC,
                model_name="mixtral-8x7b-instruct",
                model_registry=self.model_registry,
                verbose=self.verbose
            )
        }
        self.agents.update(default_agents)
    
    def add_agent(self, agent: BaseAgent):
        """Add an agent to the SuperAgent's registry."""
        self.agents[agent.name] = agent
    
    def get_agent(self, name: str) -> Optional[BaseAgent]:
        """Get an agent by name."""
        return self.agents.get(name)
    
    def get_agents_by_role(self, role: Union[AgentRole, str]) -> List[BaseAgent]:
        """Get all agents with a specific role."""
        if isinstance(role, str):
            role = AgentRole(role.lower())
        return [agent for agent in self.agents.values() if agent.role == role]
    
    async def execute_task(
        self,
        task: str,
        initial_agent: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Execute a task by coordinating between multiple agents.
        
        Args:
            task: The task to execute
            initial_agent: Name of the agent to start with (optional)
            context: Additional context for the task
            **kwargs: Additional parameters
            
        Returns:
            Dict containing the final result and execution details
        """
        context = context or {}
        context.setdefault("task", task)
        context.setdefault("history", [])
        
        # Determine the starting agent
        current_agent = None
        if initial_agent and initial_agent in self.agents:
            current_agent = self.agents[initial_agent]
        else:
            # Default to the first agent if none specified
            current_agent = next(iter(self.agents.values()))
        
        if not current_agent:
            raise ValueError("No agents available to execute the task")
        
        self._log(f"Starting task execution with agent: {current_agent.name}")
        
        # Execute the task in a loop with multiple agents if needed
        iteration = 0
        result = None
        
        while iteration < self.max_iterations:
            iteration += 1
            self._log(f"\n--- Iteration {iteration} ---")
            
            try:
                # Process the task with the current agent
                self._log(f"Sending task to {current_agent.name} ({current_agent.role.value}): {task}")
                
                # Add context to the task
                task_with_context = self._format_task_with_context(task, context)
                
                # Process with the current agent
                response = await current_agent.process(task_with_context, context=context)
                
                # Log the response
                self._log(f"Response from {current_agent.name}: {response.content[:500]}{'...' if len(response.content) > 500 else ''}")
                
                # Update context with the response
                context[f"{current_agent.name}_response"] = response.content
                context["last_agent"] = current_agent.name
                context["history"].append({
                    "iteration": iteration,
                    "agent": current_agent.name,
                    "role": current_agent.role.value,
                    "response": response.content,
                    "metadata": response.metadata
                })
                
                # Check if we need to involve another agent
                if response.requires_followup and response.next_steps:
                    next_step = response.next_steps[0]  # Take the first next step
                    next_agent_name = next_step.get("agent")
                    
                    if next_agent_name and next_agent_name in self.agents:
                        current_agent = self.agents[next_agent_name]
                        task = next_step.get("task", task)  # Use new task if provided
                        self._log(f"Passing to next agent: {current_agent.name} ({current_agent.role.value})")
                        continue
                
                # If no follow-up is needed, we're done
                result = {
                    "content": response.content,
                    "metadata": response.metadata,
                    "success": response.success,
                    "iterations": iteration,
                    "context": context
                }
                break
                
            except Exception as e:
                self._log(f"Error in iteration {iteration}: {str(e)}", level="error")
                result = {
                    "content": f"Error: {str(e)}",
                    "metadata": {"error": str(e), "iteration": iteration},
                    "success": False,
                    "iterations": iteration,
                    "context": context
                }
                break
        
        # Final result
        if result is None:
            result = {
                "content": "Task execution did not complete successfully.",
                "metadata": {"iterations": iteration},
                "success": False,
                "iterations": iteration,
                "context": context
            }
        
        self._log(f"\n--- Task Complete (Iterations: {iteration}) ---\n")
        return result
    
    def _format_task_with_context(self, task: str, context: Dict[str, Any]) -> str:
        """Format the task with context information."""
        if not context:
            return task
            
        # Add context as a JSON string if it's not too large
        context_str = json.dumps(context, indent=2, default=str)
        if len(context_str) < 2000:  # Arbitrary limit to avoid too much context
            return f"""{task}
            
            Context:
            ```json
            {context_str}
            ```"""
        return task
    
    def _log(self, message: str, level: str = "info"):
        """Log a message with the SuperAgent prefix."""
        if not self.verbose:
            return
            
        prefix = "[bold magenta][SuperAgent][/bold magenta]"
        
        if level.lower() == "debug":
            logger.debug(message)
            self.console.print(f"{prefix} [dim]{message}[/dim]")
        elif level.lower() == "info":
            logger.info(message)
            self.console.print(f"{prefix} {message}")
        elif level.lower() in ["warn", "warning"]:
            logger.warning(message)
            self.console.print(f"{prefix} [yellow]WARNING: {message}[/yellow]")
        elif level.lower() == "error":
            logger.error(message)
            self.console.print(f"{prefix} [red]ERROR: {message}[/red]")
        else:
            logger.info(message)
            self.console.print(f"{prefix} {message}")


# Example usage
async def example_usage():
    """Example of how to use the SuperAgent."""
    from rich.console import Console
    from rich.panel import Panel
    from rich.markdown import Markdown
    
    console = Console()
    
    # Initialize model registry
    model_registry = ModelRegistry()
    
    # Create super agent
    super_agent = SuperAgent(
        model_registry=model_registry,
        verbose=True
    )
    
    # Example task
    task = """
    Analyze the current trends in AI for 2025 and provide a summary of key areas 
    that are expected to see significant growth or change. Include potential impacts 
    on software development and data science.
    """
    
    console.print(Panel.fit("[bold]Super Agent Example[/bold]\n" + task, 
                         border_style="blue"))
    
    # Execute the task
    result = await super_agent.execute_task(task, initial_agent="researcher")
    
    # Display the result
    console.print("\n[bold green]Final Result:[/bold green]")
    console.print(Markdown(result["content"]))
    console.print(f"\n[dim]Completed in {result['iterations']} iterations.[/dim]")


if __name__ == "__main__":
    import asyncio
    asyncio.run(example_usage())
