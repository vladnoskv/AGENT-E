"""
Coder Agent for AGENT-X

A specialized agent for handling coding-related tasks, including code generation,
analysis, debugging, and refactoring.
"""

import re
import ast
import inspect
from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass, field
import logging
import json

from rich.syntax import Syntax
from rich.console import Console

from .super_agent import BaseAgent, AgentResponse, AgentRole
from ..models.base import ModelResponse
from ..models.registry import ModelRegistry

logger = logging.getLogger(__name__)
console = Console()

@dataclass
class CodeSnippet:
    """Represents a code snippet with metadata."""
    code: str
    language: str = "python"
    filename: Optional[str] = None
    description: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the code snippet to a dictionary."""
        return {
            "code": self.code,
            "language": self.language,
            "filename": self.filename,
            "description": self.description,
            "dependencies": self.dependencies
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CodeSnippet':
        """Create a CodeSnippet from a dictionary."""
        return cls(
            code=data.get("code", ""),
            language=data.get("language", "python"),
            filename=data.get("filename"),
            description=data.get("description"),
            dependencies=data.get("dependencies", [])
        )

class CoderAgent(BaseAgent):
    """Specialized agent for coding tasks."""
    
    def __init__(
        self,
        name: str = "coder",
        model_name: str = "code-llama-70b-instruct",
        model_registry: Optional[ModelRegistry] = None,
        model: Optional[Any] = None,
        verbose: bool = True,
        **kwargs
    ):
        """Initialize the CoderAgent.
        
        Args:
            name: Name of the agent
            model_name: Name of the model to use
            model_registry: Model registry instance
            model: Pre-initialized model instance
            verbose: Whether to print detailed logs
            **kwargs: Additional arguments
        """
        super().__init__(
            name=name,
            role=AgentRole.CODER,
            model_name=model_name,
            model_registry=model_registry,
            model=model,
            verbose=verbose,
            **kwargs
        )
        self.code_blocks: List[CodeSnippet] = []
    
    async def process(self, input_data: Any, **kwargs) -> AgentResponse:
        """Process a coding-related task.
        
        Args:
            input_data: The input task or code to process
            **kwargs: Additional parameters
            
        Returns:
            AgentResponse with the processing results
        """
        context = kwargs.get("context", {})
        task = str(input_data).strip()
        
        self._log(f"Processing coding task: {task[:100]}..." if len(task) > 100 else task)
        
        try:
            # Check if the task is a code-related request
            if any(keyword in task.lower() for keyword in ["write", "create", "generate", "implement", "function", "class"]):
                return await self._generate_code(task, context)
            
            elif any(keyword in task.lower() for keyword in ["debug", "fix", "error", "issue"]):
                return await self._debug_code(task, context)
            
            elif any(keyword in task.lower() for keyword in ["refactor", "improve", "optimize"]):
                return await self._refactor_code(task, context)
            
            elif any(keyword in task.lower() for keyword in ["explain", "analyze", "understand"]):
                return await self._analyze_code(task, context)
            
            else:
                # Default to code generation
                return await self._generate_code(task, context)
                
        except Exception as e:
            error_msg = f"Error processing coding task: {str(e)}"
            self._log(error_msg, level="error")
            return AgentResponse(
                content=error_msg,
                success=False,
                requires_followup=False,
                metadata={"error": str(e)}
            )
    
    async def _generate_code(self, task: str, context: Dict[str, Any]) -> AgentResponse:
        """Generate code based on the task description."""
        self._log(f"Generating code for: {task}")
        
        # Prepare the prompt
        prompt = f"""You are an expert software engineer. Generate high-quality, production-ready code based on the following task:
        
        Task: {task}
        
        Requirements:
        1. Write clean, efficient, and well-documented code
        2. Include type hints where appropriate
        3. Add docstrings for all functions and classes
        4. Include error handling
        5. Add comments for complex logic
        6. Include example usage if applicable
        
        Output the complete code in a single code block with the appropriate language specifier.
        """
        
        # Generate the code
        response = await self.model.generate(prompt, max_tokens=2048, temperature=0.3)
        code_blocks = self._extract_code_blocks(response.content)
        
        if not code_blocks:
            return AgentResponse(
                content="No code was generated. Please provide more specific requirements.",
                success=False,
                requires_followup=True,
                next_steps=[{"agent": "analyst", "task": "The coder couldn't generate code. Please provide more specific requirements or clarify the task."}]
            )
        
        # Create code snippets
        snippets = []
        for i, (code, lang) in enumerate(code_blocks, 1):
            snippet = CodeSnippet(
                code=code,
                language=lang or "python",
                filename=f"generated_code_{i}.py",
                description=f"Generated code for: {task}"
            )
            snippets.append(snippet)
            self.code_blocks.append(snippet)
        
        # Format the response
        response_content = "## Generated Code\n\n"
        for i, snippet in enumerate(snippets, 1):
            response_content += f"### Code Snippet {i}\n"
            response_content += f"```{snippet.language}\n{snippet.code}\n```\n\n"
        return AgentResponse(
            content=response_content,
            metadata={
                "code_snippets": [s.to_dict() for s in snippets],
                "task": task,
                "generated_files": [s.filename for s in snippets if s.filename]
            },
            requires_followup=True,
            next_steps=[
                {"agent": "critic", "task": f"Review this generated code for task: {task}"},
                {"agent": "tester", "task": f"Create tests for this code: {task}"}
            ]
        )
    
    async def _debug_code(self, task: str, context: Dict[str, Any]) -> AgentResponse:
        """Debug provided code based on the error or issue description."""
        self._log(f"Debugging code for: {task}")
        
        # Extract code and error from the task if not provided in context
        code = context.get("code") or self._extract_code(task)
        error = context.get("error") or self._extract_error(task)
        
        if not code:
            return AgentResponse(
                content="No code provided to debug. Please include the code that needs debugging.",
                success=False,
                requires_followup=True
            )
        
        # Prepare the prompt
        prompt = f"""You are an expert debugger. Analyze the following code and error message, then provide a fix:
        
        Code:
        ```python
        {code}
        ```
        
        Error/Issue:
        ```
        {error or 'No specific error message provided'}
        ```
        
        Please:
        1. Identify the root cause of the issue
        2. Provide a fixed version of the code
        3. Explain what was wrong and how you fixed it
        4. Suggest ways to prevent similar issues in the future
        """
        
        # Generate the fix
        response = await self.model.generate(prompt, max_tokens=2048, temperature=0.2)
        
        return AgentResponse(
            content=response.content,
            metadata={
                "original_code": code,
                "error": error,
                "task": task
            },
            requires_followup=True,
            next_steps=[
                {"agent": "tester", "task": "Test the fixed code to ensure the issue is resolved"}
            ]
        )
    
    async def _refactor_code(self, task: str, context: Dict[str, Any]) -> AgentResponse:
        """Refactor existing code to improve quality, performance, or readability."""
        self._log(f"Refactoring code for: {task}")
        
        # Extract code from the task if not provided in context
        code = context.get("code") or self._extract_code(task)
        
        if not code:
            return AgentResponse(
                content="No code provided to refactor. Please include the code that needs refactoring.",
                success=False,
                requires_followup=True
            )
        
        # Prepare the prompt
        prompt = f"""You are an expert at refactoring code. Refactor the following code to improve its quality, performance, and readability:
        
        Original Code:
        ```python
        {code}
        ```
        
        Task/Requirements:
        {task}
        
        Please:
        1. Keep the same functionality
        2. Improve code structure and organization
        3. Optimize performance if possible
        4. Add/update docstrings and comments
        5. Ensure consistent style
        6. Add type hints
        7. Include error handling if missing
        
        Output the refactored code in a single code block with the appropriate language specifier.
        """
        
        # Generate the refactored code
        response = await self.model.generate(prompt, max_tokens=2048, temperature=0.3)
        refactored_blocks = self._extract_code_blocks(response.content)
        
        if not refactored_blocks:
            return AgentResponse(
                content="No refactored code was generated. The code might already be optimal or the task needs clarification.",
                success=False,
                requires_followup=True
            )
        
        # Format the response
        response_content = "## Refactored Code\n\n"
        response_content += f"### Original Task\n{task}\n\n"
        
        for i, (refactored_code, lang) in enumerate(refactored_blocks, 1):
            response_content += f"### Refactored Code Snippet {i}\n"
            response_content += f"```{lang or 'python'}\n{refactored_code}\n```\n\n"
        return AgentResponse(
            content=response_content,
            metadata={
                "original_code": code,
                "refactored_code": refactored_blocks[0][0],  # First code block
                "language": refactored_blocks[0][1] or "python",
                "task": task
            },
            requires_followup=True,
            next_steps=[
                {"agent": "tester", "task": "Test the refactored code to ensure it maintains the same functionality"},
                {"agent": "critic", "task": "Review the refactored code for potential issues or improvements"}
            ]
        )
    
    async def _analyze_code(self, task: str, context: Dict[str, Any]) -> AgentResponse:
        """Analyze and explain the provided code."""
        self._log(f"Analyzing code for: {task}")
        
        # Extract code from the task if not provided in context
        code = context.get("code") or self._extract_code(task)
        
        if not code:
            return AgentResponse(
                content="No code provided to analyze. Please include the code you want to analyze.",
                success=False,
                requires_followup=True
            )
        
        # Prepare the prompt
        prompt = f"""You are an expert code analyst. Analyze the following code and provide a detailed explanation:
        
        Code to analyze:
        ```python
        {code}
        ```
        
        Specific analysis requested:
        {task}
        
        Please provide:
        1. A high-level overview of what the code does
        2. Analysis of the code structure and organization
        3. Explanation of key algorithms or logic
        4. Potential issues or edge cases
        5. Suggestions for improvement (if any)
        """
        
        # Generate the analysis
        response = await self.model.generate(prompt, max_tokens=2048, temperature=0.1)
        
        return AgentResponse(
            content=response.content,
            metadata={
                "code_snippet": code,
                "task": task,
                "analysis_length": len(response.content)
            }
        )
    
    def _extract_code_blocks(self, text: str) -> List[Tuple[str, Optional[str]]]:
        """Extract code blocks from markdown-formatted text."""
        pattern = r"```(?:\w*\n)?(.*?)```"
        code_blocks = []
        
        for match in re.finditer(pattern, text, re.DOTALL):
            code = match.group(1).strip()
            # Extract language if specified
            if '\n' in code:
                first_line, rest = code.split('\n', 1)
                if first_line.strip() and not first_line.strip().startswith('```'):
                    lang = first_line.strip()
                    code = rest
                else:
                    lang = None
            else:
                lang = None
            
            if code.strip():
                code_blocks.append((code, lang))
        
        return code_blocks
    
    def _extract_code(self, text: str) -> Optional[str]:
        """Extract code from text, looking for code blocks or indented code."""
        # First try to extract from markdown code blocks
        code_blocks = self._extract_code_blocks(text)
        if code_blocks:
            return code_blocks[0][0]  # Return first code block
        
        # If no markdown code blocks, look for indented code
        lines = text.split('\n')
        code_lines = [line for line in lines if line.startswith(('    ', '\t'))]
        
        if code_lines:
            return '\n'.join(code_lines)
        
        return None
    
    def _extract_error(self, text: str) -> Optional[str]:
        """Extract error messages from text."""
        error_patterns = [
            r"Error:?(.*?)(?:\n\s*\n|"|$)",
            r"Exception:?(.*?)(?:\n\s*\n|"|$)",
            r"Traceback.*?\n(.*?)(?:\n\s*\n|"|$)",
        ]
        
        for pattern in error_patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(0).strip()
        
        return None


# Example usage
async def example_usage():
    """Example of how to use the CoderAgent."""
    from rich.console import Console
    from rich.panel import Panel
    from rich.markdown import Markdown
    
    console = Console()
    
    # Initialize model registry
    model_registry = ModelRegistry()
    
    # Create coder agent
    coder = CoderAgent(
        name="python_coder",
        model_name="code-llama-70b-instruct",
        model_registry=model_registry,
        verbose=True
    )
    
    # Example task
    task = """
    Write a Python function that calculates the nth Fibonacci number 
    using an efficient algorithm (O(n) time and O(1) space).
    Include type hints and a docstring.
    """
    
    console.print(Panel.fit("[bold]Coder Agent Example[/bold]\n" + task, 
                         border_style="blue"))
    
    # Process the task
    response = await coder.process(task)
    
    # Display the result
    console.print("\n[bold green]Generated Code:[/bold green]")
    console.print(Markdown(response.content))
    
    if response.metadata.get("code_snippets"):
        console.print("\n[bold]Code Snippets:[/bold]")
        for i, snippet in enumerate(response.metadata["code_snippets"], 1):
            console.print(f"\nSnippet {i}:")
            console.print(Syntax(snippet["code"], snippet.get("language", "python")))


if __name__ == "__main__":
    import asyncio
    asyncio.run(example_usage())
