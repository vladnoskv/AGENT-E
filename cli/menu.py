"""
Interactive menu system for AGENTX CLI.

This module provides a rich, interactive menu system for navigating the AGENTX tool.
"""

from typing import List, Dict, Any, Optional, Callable, Coroutine
from enum import Enum, auto
import asyncio
import os
import sys
from pathlib import Path
import json
from datetime import datetime

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt, Confirm, IntPrompt
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.markdown import Markdown

from models.registry import list_models, get_model, ModelType

class MenuChoice(Enum):
    """Available menu choices."""
    LIST_MODELS = auto()
    RUN_MODEL = auto()
    TEST_CONNECTION = auto()
    TEST_ALL = auto()
    SETUP_NIM = auto()
    EXPERT_AGENTS = auto()
    AUTONOMOUS_MODE = auto()
    INDEX_WORKSPACE = auto()
    CONFIGURE = auto()
    EXIT = auto()

class MenuItem:
    """Represents a menu item with title and handler."""
    
    def __init__(self, choice: MenuChoice, title: str, handler: Callable):
        self.choice = choice
        self.title = title
        self.handler = handler

class Menu:
    """Interactive menu system for AGENTX."""
    
    def __init__(self):
        self.console = Console()
        self.running = True
        self.menu_items = [
            MenuItem(
                MenuChoice.LIST_MODELS,
                "List Available Models",
                self._list_models
            ),
            MenuItem(
                MenuChoice.RUN_MODEL,
                "Run a Model",
                self._run_model
            ),
            MenuItem(
                MenuChoice.TEST_CONNECTION,
                "Test Model Connection",
                self._test_connection
            ),
            MenuItem(
                MenuChoice.TEST_ALL,
                "Test All LLM Connections",
                self._test_all_connections
            ),
            MenuItem(
                MenuChoice.SETUP_NIM,
                "Setup NVIDIA NIM (API Key)",
                self._configure_nim
            ),
            MenuItem(
                MenuChoice.EXPERT_AGENTS,
                "Expert Agents (Personas)",
                self._expert_agents_menu
            ),
            MenuItem(
                MenuChoice.AUTONOMOUS_MODE,
                "Autonomous Mode (Preview)",
                self._autonomous_mode
            ),
            MenuItem(
                MenuChoice.INDEX_WORKSPACE,
                "Index Workspace and Generate Report",
                self._index_workspace
            ),
            MenuItem(
                MenuChoice.CONFIGURE,
                "Configuration",
                self._show_config
            ),
            MenuItem(
                MenuChoice.EXIT,
                "Exit",
                self._exit_menu
            )
        ]
    
    def _display_banner(self):
        """Display the AGENTX banner."""
        banner = """
                                                        
 █████╗   ██████╗ ███████╗███╗   ██╗████████╗       ██╗   ╔██
██╔══██╗ ██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝       ╚██╗ ╔██╝
███████║ ██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███║     ║███║ 
██╔══██║ ██║   ██║██╔══╝  ██║╚██╗██║   ██║   ╚══╝   ╔██╝ ╚██╗ 
██║  ██║ ╚██████╔╝███████╗██║ ╚████║   ██║         ╔██╝   ╚██╗
╚═╝  ╚═╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝         ╚═╝     ╚═╝
                            v0.2.0
    """

        self.console.print(Panel.fit(
            banner,
            title="AGENTX - Multi-Model AI Orchestration",
            border_style="blue"
        ))
    
    async def _list_models(self):
        """List all available models."""
        models = list_models()
        table = Table(title="\nAvailable Models", show_header=True, header_style="bold magenta")
        table.add_column("ID", style="cyan", no_wrap=True)
        table.add_column("Name", style="green")
        table.add_column("Type", style="yellow")
        table.add_column("Description")
        
        for model in models:
            table.add_row(
                model.name,
                model.model_class.__name__,
                model.model_type.value.upper(),
                model.description
            )
        
        self.console.print(table)
        self.console.print("\n[dim]Use 'Run a Model' to interact with any of these models.[/]")
    
    async def _run_model(self):
        """Run a selected model with user input."""
        models = list_models()
        if not models:
            self.console.print("[red]No models available. Please check your configuration.[/]")
            return
        
        # Display model selection
        self.console.print("\n[bold]Available Models:[/]")
        for idx, model in enumerate(models, 1):
            self.console.print(f"[cyan]{idx}.[/] {model.name} - {model.description}")
        
        try:
            choice = IntPrompt.ask(
                "\nSelect a model (or 0 to cancel)",
                choices=[str(i) for i in range(len(models) + 1)],
                show_choices=False
            )
            
            if choice == 0:
                return
                
            selected_model = models[choice - 1]
            prompt = Prompt.ask("\nEnter your prompt")
            
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
                console=self.console
            ) as progress:
                progress.add_task(description="Generating response...", total=None)
                model = get_model(selected_model.name)
                response = await model.generate(messages=[{"role": "user", "content": prompt}])
                
            self.console.print("\n[green]Response:[/]")
            self.console.print(Panel(
                response['choices'][0]['message']['content'],
                border_style="green"
            ))
            
        except (ValueError, IndexError):
            self.console.print("[red]Invalid selection.[/]")
        except Exception as e:
            self.console.print(f"[red]Error: {str(e)}[/]")
    
    async def _test_connection(self):
        """Test connection to a selected model."""
        models = list_models()
        if not models:
            self.console.print("[red]No models available. Please check your configuration.[/]")
            return
        
        self.console.print("\n[bold]Select a model to test:[/]")
        for idx, model in enumerate(models, 1):
            self.console.print(f"[cyan]{idx}.[/] {model.name} - {model.description}")
        
        try:
            choice = IntPrompt.ask(
                "\nSelect a model (or 0 to cancel)",
                choices=[str(i) for i in range(len(models) + 1)],
                show_choices=False
            )
            
            if choice == 0:
                return
                
            selected_model = models[choice - 1]
            
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
                console=self.console
            ) as progress:
                task = progress.add_task(
                    f"Testing connection to {selected_model.name}...",
                    total=None
                )
                
                try:
                    model = get_model(selected_model.name)
                    # Test with a simple prompt
                    response = await model.generate(
                        messages=[{"role": "user", "content": "Say 'hello'"}],
                        max_tokens=10
                    )
                    progress.update(task, description="[green]✓ Connection successful![/]")
                    self.console.print(f"\n[green]✓ {selected_model.name} is working![/]")
                    
                except Exception as e:
                    progress.update(task, description="[red]✗ Connection failed[/]")
                    self.console.print(f"\n[red]✗ Connection failed: {str(e)}[/]")
        
        except (ValueError, IndexError):
            self.console.print("[red]Invalid selection.[/]")
    
    async def _test_all_connections(self):
        """Test connection to all LLM models without prompts."""
        models = [m for m in list_models() if m.model_type == ModelType.LLM]
        if not models:
            self.console.print("[red]No LLM models available.[/]")
            return
        table = Table(title="\nLLM Connection Test", show_header=True, header_style="bold magenta")
        table.add_column("Model", style="cyan")
        table.add_column("Status", style="green")
        table.add_column("Details")
        for m in models:
            try:
                model = get_model(m.name)
                _ = await model.generate(messages=[{"role": "user", "content": "ping"}], max_tokens=5)
                table.add_row(m.name, "[green]OK[/]", "Responded")
            except Exception as e:
                table.add_row(m.name, "[red]FAIL[/]", str(e))
        self.console.print(table)

    async def _run_model_directly(self, model_name: str, prompt: str):
        """Run a specific model directly with the provided prompt."""
        try:
            model = get_model(model_name)
        except Exception as e:
            self.console.print(f"[red]Unknown model '{model_name}': {e}[/]")
            return
        try:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
                console=self.console
            ) as progress:
                progress.add_task(description=f"Running {model_name}...", total=None)
                resp = await model.generate(messages=[{"role": "user", "content": prompt}])
            content = resp.get('choices', [{}])[0].get('message', {}).get('content', "<no content>")
            self.console.print(Panel(content, title=f"Response from {model_name}", border_style="green"))
        except Exception as e:
            self.console.print(f"[red]Error running model: {e}[/]")

    async def _configure_nim(self):
        """Prompt user for NVIDIA API key and write to .env."""
        self.console.print("\n[bold]Setup NVIDIA NIM[/]")
        api_key = Prompt.ask("Enter NVIDIA_API_KEY (will be stored in .env)")
        base_url = Prompt.ask("Optional NIM_API_BASE_URL (leave blank for default)", default="")
        env_path = (Path(__file__).resolve().parents[1] / ".env")
        # Load existing contents safely
        existing = {}
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if not line.strip() or line.strip().startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                existing[k.strip()] = v.strip()
        existing["NVIDIA_API_KEY"] = api_key
        if base_url.strip():
            existing["NIM_API_BASE_URL"] = base_url.strip()
        # Write back
        lines = [f"{k}={v}" for k, v in existing.items()]
        env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        self.console.print(f"[green]Saved .env at {env_path}[/]")

    async def _expert_agents_menu(self):
        """Select and run an expert agent persona."""
        personas = [
            ("backend_expert", "Expert in Python/Node backend design and debugging", "starcoder2-15b"),
            ("frontend_expert", "Expert in UI/UX and web frontends", "codegemma-7b"),
            ("rag_expert", "Expert in retrieval pipelines and RAG", "dbrx-instruct"),
            ("devops_expert", "Expert in CI/CD and infrastructure", "dbrx-instruct"),
        ]
        self.console.print("\n[bold]Expert Agents[/]")
        for i, (key, desc, model_name) in enumerate(personas, 1):
            self.console.print(f"[cyan]{i}.[/] {key} - {desc} (model: {model_name})")
        try:
            choice = IntPrompt.ask("\nSelect persona (or 0 to cancel)", choices=[str(i) for i in range(0, len(personas)+1)], show_choices=False)
            if choice == 0:
                return
            key, desc, model_name = personas[choice-1]
            task = Prompt.ask("Enter your task/goal for this expert")
            system_prompt = f"You are a {key.replace('_',' ')}. {desc}. Provide actionable steps and code changes when appropriate."
            try:
                model = get_model(model_name)
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": task}
                ]
                with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True, console=self.console) as progress:
                    progress.add_task(description=f"Consulting {key}...", total=None)
                    resp = await model.generate(messages=messages)
                content = resp.get('choices', [{}])[0].get('message', {}).get('content', "<no content>")
                self.console.print(Panel(content, title=f"{key} response", border_style="blue"))
            except Exception as e:
                self.console.print(f"[red]Error invoking persona: {e}[/]")
        except (ValueError, IndexError):
            self.console.print("[red]Invalid selection.[/]")

    async def _autonomous_mode(self):
        """Autonomous multi-step mode (preview). Orchestrates planning and actions."""
        self.console.print("\n[bold yellow]Autonomous Mode (Preview)[/]")
        goal = Prompt.ask("Describe your goal")
        full_auto = Confirm.ask("Allow autonomous execution without prompting for each step?", default=False)
        model_name = "dbrx-instruct"
        try:
            model = get_model(model_name)
        except Exception as e:
            self.console.print(f"[red]Cannot load model {model_name}: {e}[/]")
            return
        messages = [
            {"role": "system", "content": "You plan tasks into numbered steps and produce a short plan before acting."},
            {"role": "user", "content": f"Goal: {goal}. Propose a 3-6 step plan and then output NEXT_ACTION in one sentence."}
        ]
        try:
            resp = await model.generate(messages=messages)
            plan = resp.get('choices', [{}])[0].get('message', {}).get('content', "")
            self.console.print(Panel(plan or "<no plan>", title="Proposed Plan", border_style="yellow"))
        except Exception as e:
            self.console.print(f"[red]Planning failed: {e}[/]")
            return
        if not full_auto:
            proceed = Confirm.ask("Proceed with execution?", default=False)
            if not proceed:
                return
        # Placeholder execution loop
        self.console.print("[dim]Executing plan steps (simulation). Tool integration forthcoming.[/]")

    async def _index_workspace(self):
        """Index the workspace files and generate a JSON report."""
        default_dir = str(Path.cwd())
        dir_path = Prompt.ask("Directory to index", default=default_dir)
        root = Path(dir_path).resolve()
        if not root.exists() or not root.is_dir():
            self.console.print(f"[red]Invalid directory: {root}[/]")
            return
        ignore = {".git", "node_modules", "venv", "__pycache__", ".pytest_cache"}
        files: List[Dict[str, Any]] = []
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=False, console=self.console) as progress:
            task = progress.add_task("Scanning files...", total=None)
            for dirpath, dirnames, filenames in os.walk(root):
                # prune ignored directories
                dirnames[:] = [d for d in dirnames if d not in ignore]
                for fname in filenames:
                    fp = Path(dirpath) / fname
                    try:
                        stat = fp.stat()
                        files.append({
                            "path": str(fp.relative_to(root)),
                            "size": stat.st_size,
                            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                        })
                    except Exception:
                        continue
            progress.update(task, description="Building report...")
        report = {
            "root": str(root),
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "total_files": len(files),
            "files": files,
        }
        reports_dir = root / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        out_file = reports_dir / "index.json"
        out_file.write_text(json.dumps(report, indent=2), encoding="utf-8")
        self.console.print(f"[green]Index written to {out_file}[/]")

    async def _show_config(self):
        """Show current configuration."""
        config = {
            "NVIDIA_API_KEY": "Set" if os.getenv("NVIDIA_API_KEY") else "Not set",
            "NIM_API_BASE_URL": os.getenv("NIM_API_BASE_URL", "Using default"),
            "Total Models Available": len(list_models())
        }
        
        table = Table(title="\nConfiguration", show_header=False, box=None)
        table.add_column("Setting", style="cyan")
        table.add_column("Value", style="green")
        
        for key, value in config.items():
            table.add_row(key, str(value))
        
        self.console.print(table)
        self.console.print("\n[dim]Edit .env file to change configuration.[/]")
    
    async def _exit_menu(self):
        """Exit the menu."""
        self.console.print("\n[blue]Goodbye![/]")
        self.running = False
    
    async def show(self):
        """Display the main menu and handle user input."""
        while self.running:
            self._display_banner()
            
            # Display menu options
            for idx, item in enumerate(self.menu_items, 1):
                self.console.print(f"[cyan]{idx}.[/] {item.title}")
            
            try:
                choice = IntPrompt.ask(
                    "\nSelect an option",
                    choices=[str(i) for i in range(1, len(self.menu_items) + 1)],
                    show_choices=False
                )
                
                if 1 <= choice <= len(self.menu_items):
                    selected_item = self.menu_items[choice - 1]
                    await selected_item.handler()
                    if choice != len(self.menu_items):  # Don't pause after exit
                        self.console.input("\nPress Enter to continue...")
                
            except KeyboardInterrupt:
                self.console.print("\n[red]Operation cancelled.[/]")
            except Exception as e:
                self.console.print(f"\n[red]Error: {str(e)}[/]")
                self.console.print("[dim]Press Enter to continue...[/]")
                input()

async def main():
    """Entry point for the menu system."""
    menu = Menu()
    await menu.show()

if __name__ == "__main__":
    asyncio.run(main())
