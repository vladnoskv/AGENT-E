"""
Agent Orchestrator for AGENTX

This module provides the core orchestration logic for managing AI agents and their interactions.
"""

import os
import json
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
import subprocess

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

# Import model registry and clients
from .models.registry import registry
from .models.llm import DBRXInstruct, CodeGemma7B
from .models.retrieval import NVEmbedV1, NVEmbedCode7B
from .models.visual import Bria23

console = Console()

class AgentOrchestrator:
    """Orchestrates interactions between different AI agents and models."""
    
    def __init__(self, model: str = "dbrx-instruct"):
        """Initialize the orchestrator with a default model."""
        self.offline = False
        self.no_fallback = os.environ.get("AGENTX_NO_FALLBACK", "").lower() in ("1", "true", "yes")
        
        try:
            self.model = registry.create_model(model)
        except Exception as e:
            if self.no_fallback:
                raise RuntimeError(f"Failed to initialize model: {str(e)}")
            self.model = None
            self.offline = True
        
        # Define available agents
        self.agents = {
            "master": {
                "name": "Master Agent",
                "role": "Coordinates tasks between specialized agents",
                "prompt": "You are the master agent. Analyze the task and coordinate with other agents.",
            },
            "code": {
                "name": "Code Agent",
                "role": "Analyzes and modifies code files",
                "prompt": "You are a code analysis agent. Focus on code quality, bugs, and improvements.",
            },
            "doc": {
                "name": "Documentation Agent",
                "role": "Creates and updates documentation",
                "prompt": "You are a documentation agent. Create clear, concise documentation.",
            },
            "test": {
                "name": "Testing Agent",
                "role": "Creates and runs tests",
                "prompt": "You are a testing agent. Create comprehensive tests and validate functionality.",
            },
        }
    
    async def call_model(self, prompt: str, **kwargs) -> str:
        """Call the AI model with the given prompt and return the response."""
        if not self.model:
            return self._fallback_response(prompt)
        
        try:
            messages = [
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": prompt}
            ]
            
            response = await self.model.generate(
                messages=messages,
                max_tokens=kwargs.get("max_tokens", 1000),
                temperature=kwargs.get("temperature", 0.7),
                top_p=kwargs.get("top_p", 0.9)
            )
            
            if isinstance(response, str) and response.strip():
                return response.strip()
                
            if self.no_fallback:
                raise ValueError("Model returned empty response")
                
            return self._fallback_response(prompt)
            
        except Exception as e:
            if self.no_fallback:
                raise
            return self._fallback_response(prompt, e)
    
    async def run_command(self, command: str, args: List[str] = None, **kwargs) -> Dict[str, Any]:
        """Run a shell command and return the results."""
        args = args or []
        cwd = kwargs.get("cwd", os.getcwd())
        timeout = kwargs.get("timeout", 0)
        
        console.print(f"[bold]Running:[/] {command} {' '.join(args)}")
        
        try:
            process = await asyncio.create_subprocess_exec(
                command, *args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=cwd
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout if timeout > 0 else None
                )
            except asyncio.TimeoutError:
                process.kill()
                return {
                    "code": -1,
                    "stdout": "",
                    "stderr": f"Command timed out after {timeout}ms",
                    "timed_out": True
                }
            
            return {
                "code": process.returncode,
                "stdout": stdout.decode().strip(),
                "stderr": stderr.decode().strip(),
                "timed_out": False
            }
            
        except Exception as e:
            return {
                "code": -1,
                "stdout": "",
                "stderr": str(e),
                "error": True
            }
    
    async def analyze_command_output(self, command: str, result: Dict[str, Any]) -> str:
        """Analyze command output and provide insights."""
        prompt = f"""Analyze this command execution:
Command: {command}
Exit code: {result.get('code')}

STDOUT:
{result.get('stdout', '')}

STDERR:
{result.get('stderr', '')}

Provide a brief summary of what happened, any errors, and suggested next steps."""
        
        return await self.call_model(prompt)
    
    async def edit_file(self, file_path: str, instructions: str) -> Dict[str, Any]:
        """Edit a file based on instructions."""
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            prompt = f"""You are a code editor. Here's the original file content:

```
{original_content}
```

Instructions: {instructions}

Provide the complete updated file content."""
            
            updated_content = await self.call_model(prompt)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            
            return {
                "success": True,
                "file_path": file_path,
                "original_length": len(original_content),
                "updated_length": len(updated_content)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "file_path": file_path
            }
    
    def _fallback_response(self, prompt: str, error: Optional[Exception] = None) -> str:
        """Generate a fallback response when the model is unavailable."""
        head = "Note: Using fallback response.\n"
        if error:
            head += f"Error: {str(error)}\n\n"
        return f"{head}Prompt: {prompt[:200]}{'...' if len(prompt) > 200 else ''}"


async def main():
    """Main entry point for the orchestrator CLI."""
    import argparse
    
    parser = argparse.ArgumentParser(description="AGENT-X Orchestrator")
    parser.add_argument("task", nargs="?", help="Task to execute")
    parser.add_argument("--file", help="File to operate on")
    parser.add_argument("--model", default="dbrx-instruct", help="Model to use")
    parser.add_argument("--show-thinking", action="store_true", help="Show agent thinking process")
    
    args = parser.parse_args()
    
    orchestrator = AgentOrchestrator(model=args.model)
    
    if not args.task:
        console.print("[bold]AGENT-X Orchestrator[/]")
        console.print("\nPlease provide a task to execute.")
        return
    
    try:
        if args.file:
            result = await orchestrator.edit_file(args.file, args.task)
            if result["success"]:
                console.print(f"[green]✓[/] File updated: {args.file}")
            else:
                console.print(f"[red]✗[/] Failed to update file: {result.get('error')}")
        else:
            response = await orchestrator.call_model(args.task)
            console.print("\n[bold]Response:[/]")
            console.print(response)
            
    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        return 1
    
    return 0


if __name__ == "__main__":
    asyncio.run(main())
