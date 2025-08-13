"""
AGENTX Agent Demo

This script demonstrates how to use the AGENTX agent system with the NeMo Agent Toolkit.
"""

import asyncio
import os
from pathlib import Path
from rich.console import Console

# Add the project root to the Python path
import sys
sys.path.append(str(Path(__file__).parent.parent))

from agent import (
    Agent, AgentConfig, AgentStatus, AgentManager,
    Workflow, WorkflowStep, WorkflowStatus,
    Tool, ToolType, tool, registry
)

# Configure console output
console = Console()

# Example tools
def create_web_search_tool():
    @tool(
        name="web_search",
        description="Search the web for information",
        tool_type=ToolType.EXTERNAL_API
    )
    async def web_search(query: str, num_results: int = 3) -> list[dict]:
        """Search the web for information.
        
        Args:
            query: The search query
            num_results: Number of results to return (default: 3)
            
        Returns:
            List of search results
        """
        # Simulate web search
        await asyncio.sleep(1)  # Simulate network delay
        return [
            {
                "title": f"Result {i+1} for '{query}'",
                "snippet": f"This is a sample search result for '{query}'. "
                          f"This is result {i+1} of {num_results}.",
                "url": f"https://example.com/search?q={query.replace(' ', '+')}&result={i+1}"
            }
            for i in range(num_results)
        ]
    return web_search

def create_summary_tool():
    @tool(
        name="generate_summary",
        description="Generate a summary of the given text",
        tool_type=ToolType.LLM
    )
    async def generate_summary(text: str, max_length: int = 200) -> str:
        """Generate a summary of the given text.
        
        Args:
            text: The text to summarize
            max_length: Maximum length of the summary in characters
            
        Returns:
            Generated summary
        """
        # Simulate LLM summarization
        await asyncio.sleep(0.5)
        if len(text) <= max_length:
            return text
        
        # Simple truncation for demo purposes
        return text[:max_length].rsplit(' ', 1)[0] + "..."
    return generate_summary

async def main():
    """Run the agent demo."""
    console.rule("AGENTX Demo")
    
    # Initialize agent manager
    manager = AgentManager()
    
    # Create an agent configuration
    config = AgentConfig(
        name="research_assistant",
        model="nvidia/nemotron-4-340b-instruct",
        tools=["web_search", "generate_summary"],
        max_steps=10,
        temperature=0.7,
        verbose=True,
        system_prompt="""You are a helpful research assistant. Your goal is to help users 
        find information and generate summaries. Be concise and accurate in your responses."""
    )
    
    # Create the agent
    agent = manager.create_agent(config)
    
    # Create and register tools
    web_search_tool = create_web_search_tool()
    summary_tool = create_summary_tool()
    
    # Register tools with the agent
    agent.register_tool(Tool(
        name="web_search",
        func=web_search_tool,
        description="Search the web for information",
        tool_type=ToolType.EXTERNAL_API
    ))
    
    agent.register_tool(Tool(
        name="generate_summary",
        func=summary_tool,
        description="Generate a summary of the given text",
        tool_type=ToolType.LLM
    ))
    
    # Define a simple workflow
    workflow = Workflow("research_summary", [
        WorkflowStep(
            name="search",
            description="Search for information",
            action="web_search",
            parameters={"query": "NVIDIA NeMo Agent Toolkit", "num_results": 3}
        ),
        WorkflowStep(
            name="summarize_results",
            description="Summarize the search results",
            action="generate_summary",
            parameters={"text": "{{ search }}", "max_length": 300},
            depends_on=["search"]
        )
    ])
    
    # Execute the workflow
    console.print("[bold]Starting workflow...[/]")
    result = await agent.execute_workflow(workflow)
    
    # Display results
    console.print("\n[bold green]Workflow completed![/]")
    console.print(f"Status: {result.status.value}")
    
    if result.status == WorkflowStatus.COMPLETED:
        console.print("\n[bold]Summary:[/]")
        console.print(result.output.get("summarize_results", "No summary generated"))
    else:
        console.print(f"\n[red]Error: {result.error}[/]")
    
    # Show agent status
    console.print("\n[bold]Agent Status:[/]")
    console.print(agent.get_status())

if __name__ == "__main__":
    asyncio.run(main())
