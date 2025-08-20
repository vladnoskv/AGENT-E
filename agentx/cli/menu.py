"""
Interactive menu system for AGENT-X CLI.

This module provides a rich, interactive command-line interface for users
to interact with the AGENT-X system and its models.
"""

from typing import Dict, List, Optional, Any, Callable, Coroutine, TYPE_CHECKING
import asyncio
from datetime import datetime
from pathlib import Path
import json
import logging
import webbrowser
import subprocess
import sys
import platform
import os
from enum import Enum, auto

from rich.console import Console, Group
from rich.layout import Layout
from rich.panel import Panel
from rich.prompt import Prompt, Confirm, IntPrompt
from rich.table import Table
from rich.text import Text
from rich.box import ROUNDED, HEAVY, DOUBLE
from rich.align import Align, VerticalCenter
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.live import Live

from ..models import (
    ModelType, ModelRegistry, get_model, list_models, ModelInfo
)
from ..models.base import ModelResponse
from .settings import settings, set_setting, get_setting

if TYPE_CHECKING:
    from .settings import SettingsManager

logger = logging.getLogger(__name__)
console = Console()

class WebUIStatus(Enum):
    STOPPED = auto()
    STARTING = auto()
    RUNNING = auto()
    ERROR = auto()

class MenuItem:
    """Represents a single menu item in the interactive menu."""
    
    def __init__(
        self,
        name: str,
        description: str,
        handler: Callable[..., Coroutine[Any, Any, None]],
        requires_model: bool = False,
        model_type: Optional[ModelType] = None
    ):
        """Initialize a menu item.
        
        Args:
            name: Display name of the menu item
            description: Help text describing the menu item
            handler: Async function to execute when this item is selected
            requires_model: Whether this item requires a model to be selected
            model_type: If requires_model is True, the type of model required
        """
        self.name = name
        self.description = description
        self.handler = handler
        self.requires_model = requires_model
        self.model_type = model_type


class MenuSystem:
    """Interactive menu system for AGENT-X CLI."""
    
    async def run(self) -> None:
        """Run the main menu loop."""
        # Show welcome banner on first run
        if self.show_banner:
            await self.display_banner()
            
        while self.running:
            try:
                # Clear console if enabled
                if self.auto_clear:
                    self.console.clear()
                else:
                    self.console.print("")
                
                # Show header
                header_text = self._get_header_text()
                header_panel = Panel(
                    header_text,
                    border_style="blue",
                    box=HEAVY,
                    padding=(1, 2),
                    width=self.fixed_width
                )
                self.console.print(header_panel)
                
                # Display menu items
                table = Table(box=ROUNDED, show_header=False, show_lines=False)
                table.add_column("#", style="cyan", width=3, no_wrap=True)
                table.add_column("Option", style="green")
                table.add_column("Description", style="white")
                
                for i, item in enumerate(self.menu_items, 1):
                    # Skip items that require a model if none is selected
                    if item.requires_model and not self.current_model:
                        continue
                    # Skip items that require a specific model type if it doesn't match
                    if item.requires_model and item.model_type and self.current_model_info and \
                       self.current_model_info.model_type != item.model_type:
                        continue
                    
                    table.add_row(
                        str(i),
                        item.name,
                        item.description
                    )
                
                self.console.print(table)
                
                # Get user selection
                try:
                    choice = Prompt.ask(
                        "\n[bold]Select an option[/] (number or 'q' to quit)",
                        default=""
                    ).strip().lower()
                    
                    if choice == 'q':
                        self.running = False
                        continue
                    
                    if not choice:
                        continue
                    
                    # Try to parse as number
                    try:
                        choice_idx = int(choice) - 1
                        if not 0 <= choice_idx < len(self.menu_items):
                            raise ValueError("Choice out of range")
                        
                        selected_item = self.menu_items[choice_idx]
                        
                        # Check if the selected item requires a model
                        if selected_item.requires_model and not self.current_model:
                            self.console.print(
                                "[yellow]A model must be selected first. Please select a model from the menu.[/]"
                            )
                            await asyncio.sleep(1)
                            continue
                        
                        # Execute the selected menu item
                        await selected_item.handler()
                        
                    except (ValueError, IndexError):
                        self.console.print("[red]Invalid selection. Please try again.[/]")
                        await asyncio.sleep(1)
                
                except KeyboardInterrupt:
                    # On Ctrl+C, ask if user wants to exit
                    if Confirm.ask("\n[bold red]Exit AGENT-X?[/]"):
                        self.running = False
                    continue
                
            except Exception as e:
                self.console.print(f"[red]An error occurred: {e}[/]")
                logger.error("Error in menu loop", exc_info=True)
                await asyncio.sleep(2)
    
    def __init__(self):
        """Initialize the menu system."""
        self.registry = ModelRegistry()
        self.current_model: Optional[Any] = None
        self.current_model_info: Optional[ModelInfo] = None
        self.history: List[Dict[str, Any]] = None
        self.running = True
        self.web_ui_process = None
        self.web_ui_status = WebUIStatus.STOPPED
        
        # Load settings
        self.settings = settings
        self.auto_clear = self.settings.get('ui.auto_clear_console', False)
        self.show_banner = self.settings.get('ui.show_banner', True)
        
        # Fixed layout dimensions
        self.min_width = 80
        self.max_width = 120
        self.fixed_width = 100  # Preferred fixed width
        self.min_height = 30
        
        # Initialize console with settings
        self.console = Console(soft_wrap=True, highlight=False)
        
        # Initialize history
        self._init_history()
        
        # Initialize menu items
        self.menu_items: List[MenuItem] = [
            MenuItem(
                "Open Web UI",
                "Launch the AGENT-X web interface",
                self._launch_web_ui
            ),
            MenuItem(
                "Settings",
                "Configure application settings",
                self._show_settings_menu
            ),
            MenuItem(
                "Select Model",
                "Choose a model to interact with",
                self._select_model
            ),
            MenuItem(
                "Chat",
                "Have a conversation with the selected model",
                self._chat,
                requires_model=True
            ),
            MenuItem(
                "Generate Code",
                "Generate code with the selected model",
                self._generate_code,
                requires_model=True,
                model_type=ModelType.LLM
            ),
            MenuItem(
                "Generate Image",
                "Generate an image with a text prompt",
                self._generate_image,
                requires_model=True,
                model_type=ModelType.VISUAL
            ),
            MenuItem(
                "Embed Text",
                "Generate embeddings for text",
                self._embed_text,
                requires_model=True,
                model_type=ModelType.RETRIEVAL
            ),
            MenuItem(
                "Model Info",
                "Show information about the selected model",
                self._show_model_info,
                requires_model=True
            ),
            MenuItem(
                "List Models",
                "List all available models",
                self._list_models
            ),
            MenuItem(
                "History",
                "View interaction history",
                self._show_history
            ),
            MenuItem(
                "Clear Screen",
                "Clear the terminal screen",
                self._clear_screen
            ),
            MenuItem(
                "Exit",
                "Exit the AGENT-X CLI",
                self._exit_menu
            )
        ]
    
    async def display_banner(self) -> None:
        """Display the AGENT-X banner."""
        banner = """
 █████╗   ██████╗ ███████╗███╗   ██╗████████╗       ██╗   ╔██
██╔══██╗ ██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝       ╚██╗ ╔██╝
███████║ ██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███║     ║███║ 
██╔══██║ ██║   ██║██╔══╝  ██║╚██╗██║   ██║   ╚══╝   ╔██╝ ╚██╗ 
██║  ██║ ╚██████╔╝███████╗██║ ╚████║   ██║         ╔██╝   ╚██╗
╚═╝  ╚═╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝         ╚═╝     ╚═╝
                            v0.3.0
        """
        
        # Create banner panel
        self.banner_panel = Panel(
            banner,
            title="AGENT-X / NVIDIA NIM Multi-Model CLI",
            border_style="blue",
            box=HEAVY,
            padding=(1, 2),
            width=self.fixed_width
        )
        
        # Display the banner
        self.console.print(self.banner_panel)
        self.console.print()  # Add some space
    
    def _get_console_dimensions(self):
        """Get console dimensions with constraints."""
        try:
            width, height = self.console.size
        except Exception:
            width, height = 100, 30  # Fallback dimensions
            
        # Apply constraints
        width = max(min(width, self.max_width), self.min_width)
        height = max(height, self.min_height)
        
        return width, height
        
    def _create_layout(self, width: int, height: int):
        """Create the layout with fixed width and banner."""
        # Calculate section heights
        header_size = 3
        footer_size = 2  # Reduced for tighter layout
        banner_size = 15  # Increased to 15 lines for full banner visibility
        
        # Calculate available space for menu content
        used_height = header_size + banner_size + footer_size + 2  # +2 for borders
        menu_size = max(8, height - used_height)  # Reduced minimum size
        
        # Create main layout with banner
        layout = Layout()
        layout.split(
            Layout(name="header", size=header_size),
            Layout(name="banner", size=banner_size, minimum_size=banner_size),
            Layout(name="content", size=menu_size, minimum_size=8),
            Layout(name="footer", size=footer_size, minimum_size=footer_size)
        )
        
        return layout
    
    def _center_panel(self, panel: Panel, width: int) -> Panel:
        """Center a panel within the given width."""
        panel_width = min(len(panel.title) + 10, width - 4)
        return Panel(
            panel.renderable,
            title=panel.title,
            border_style=panel.border_style,
            box=panel.box,
            width=panel_width,
            padding=panel.padding,
            expand=False
        )
    
    def _group_models_by_type(self, models):
        """Group models by their type.
        
        Args:
            models: List of ModelInfo objects
            
        Returns:
            dict: Models grouped by type
        """
        models_by_type = {}
        for model in models:
            if model.model_type not in models_by_type:
                models_by_type[model.model_type] = []
            models_by_type[model.model_type].append(model)
        return models_by_type
        
    def _get_header_text(self) -> Text:
        """Generate the header text with model info and version."""
        header_text = Text()
        
        # Add title and version
        header_text.append("AGENT-X / NVIDIA NIM Multi-Model CLI", style="bold blue")
        header_text.append(" v0.3.0", style="dim")
        
        # Add model info
        header_text.append("\n")
        if self.current_model_info:
            model_info = self.current_model_info
            header_text.append("Current Model: ", style="bold green")
            header_text.append(f"{model_info.name}", style="bold")
            
            # Add model description if space allows
            desc_space = self.fixed_width - len(model_info.name) - 20
            if desc_space > 20:  # Minimum space for description
                header_text.append(" | ")
                desc = model_info.description
                if len(desc) > desc_space:
                    desc = desc[:desc_space-3] + "..."
                header_text.append(desc, style="dim")
        else:
            header_text.append("Current Model: ", style="bold yellow")
            header_text.append("Not Set (Select a model)", style="yellow")
            
        return header_text
    
    def _clear_screen_section(self, lines: int = 1) -> None:
        """Clear a specific number of lines in the terminal."""
        if lines > 0:
            # Move up and clear lines
            self.console.print(f"\033[{lines}F\033[0J", end="", highlight=False)
    
    def display_menu(self):
        """Display the interactive menu with banner."""
        try:
            # Clear the console for a fresh start
            self.console.clear()
            
            # Get console dimensions
            console_width, _ = self._get_console_dimensions()
            
            # Create header content
            header_text = self._get_header_text()
            header_panel = Panel(
                header_text,
                border_style="blue",
                box=HEAVY,
                padding=(1, 2),
                width=min(console_width - 4, self.fixed_width)
            )
            
            # Create menu content
            menu_table = Table.grid(padding=(0, 1, 0, 0), pad_edge=True)
            menu_table.add_column("#", style="cyan", width=4, justify="right")
            menu_table.add_column("Command", style="green", width=20)
            menu_table.add_column("Description")
            
            for i, item in enumerate(self.menu_items, 1):
                menu_table.add_row(
                    str(i),
                    item.name,
                    item.description
                )
            
            menu_panel = Panel(
                menu_table,
                title="Menu",
                border_style="blue",
                box=HEAVY,
                padding=(1, 2),
                width=min(console_width - 4, self.fixed_width)
            )
            
            # Create footer content
            footer_text = Text("Enter your choice (number or name, 'q' to quit):", style="dim")
            footer_panel = Panel(
                footer_text,
                border_style="blue",
                box=HEAVY,
                padding=(0, 1),
                width=min(console_width - 4, self.fixed_width)
            )
            
            # Print everything with proper spacing
            self.console.print(Align.center(header_panel))
            self.console.print("\n")
            self.console.print(Align.center(menu_panel))
            self.console.print("\n")
            self.console.print(Align.center(footer_panel))
            self.console.print(" " * 3, end="")  # Add some space for the cursor
            
            # Store the number of lines we've printed (for clearing next time)
            self._last_menu_height = 12 + len(self.menu_items)  # Header + menu items + borders + footer + spacing
            
        except Exception as e:
            # Fallback to simple menu if rich layout fails
            self.console.print("\n[bold]AGENT-X Menu:[/]")
            for i, item in enumerate(self.menu_items, 1):
                self.console.print(f"  {i}. {item.name} - {item.description}")
            self.console.print("\nEnter your choice: ", end="")
        layout["banner"].update(banner_panel)
        

        
        # Create menu items display with fixed width
        menu_table = Table.grid(padding=(0, 1, 0, 0), pad_edge=True)
        menu_table.add_column(justify="right", width=4)  # Number column
        menu_table.add_column(justify="left", width=25)   # Menu item name
        menu_table.add_column(justify="left")             # Description
        
        # Add menu items to the table
        for i, item in enumerate(self.menu_items, 1):
            menu_table.add_row(
                f"[bold cyan]{i}.[/]",
                f"[bold]{item.name}[/]",
                item.description
            )
        
        # Create a fixed-width panel for the menu
        menu_panel = Panel(
            menu_table,
            title="AGENT-X Menu",
            border_style="blue",
            box=HEAVY,
            padding=(1, 2),
            width=self.fixed_width
        )
        
        # Update content with menu
        layout["content"].update(menu_panel)
        
        # Create footer with input field
        footer_layout = Layout()
        footer_layout.split(
            Layout(name="prompt", size=1),
            Layout(name="input", size=1)
        )
        
        # Add prompt text
        prompt_text = Text("Enter your choice (number or name, 'q' to quit):", style="dim")
        footer_layout["prompt"].update(prompt_text)
        
        # Create footer panel
        footer_panel = Panel(
            footer_layout,
            border_style="blue",
            box=HEAVY,
            padding=(0, 1),
            width=self.fixed_width
        )
        layout["footer"].update(footer_panel)
        
        # Display the complete layout
        try:
            # Calculate the height of the menu for proper clearing next time
            menu_height = 0
            menu_height += 3  # header
            menu_height += 2  # banner (already shown on first run)
            menu_height += len(self.menu_items) + 4  # menu items + borders
            menu_height += 3  # footer
            self._last_menu_height = menu_height
            
            # Only show banner on first run
            if not hasattr(self, '_banner_shown'):
                self.console.print(self.banner_panel)
                self.console.print()
                self._banner_shown = True
            
            # Show header
            header_panel = Panel(
                header_text,
                title="AGENT-X",
                border_style="blue",
                box=HEAVY,
                padding=(0, 1),
                width=self.fixed_width
            )
            self.console.print(header_panel)
            
            # Show menu items
            menu_table = Table.grid(padding=(0, 1, 0, 0), pad_edge=True)
            menu_table.add_column(justify="right", width=4)
            menu_table.add_column(justify="left", width=25)
            menu_table.add_column(justify="left")
            
            for i, item in enumerate(self.menu_items, 1):
                menu_table.add_row(
                    f"[bold cyan]{i}.[/]",
                    f"[bold]{item.name}[/]",
                    item.description
                )
            
            menu_panel = Panel(
                menu_table,
                title="AGENT-X Menu",
                border_style="blue",
                box=HEAVY,
                padding=(1, 2),
                width=self.fixed_width
            )
            self.console.print(menu_panel)
            
            # Show footer
            footer_text = Text("Enter your choice (number or name, 'q' to quit):", style="dim")
            footer_panel = Panel(
                footer_text,
                border_style="blue",
                box=HEAVY,
                padding=(0, 1),
                width=self.fixed_width
            )
            self.console.print(footer_panel)
            self.console.print(" " * 3, end="")
            
            return True  # Indicate success
            
        except Exception as e:
            # Fallback to simple print if layout fails
            self.console.print("\n[bold]AGENT-X Menu:[/]")
            for i, item in enumerate(self.menu_items, 1):
                self.console.print(f"  {i}. {item.name} - {item.description}")
            self.console.print("\nEnter your choice: ", end="")
            return False  # Indicate fallback mode

    async def _select_model(self) -> None:
        """Handle model selection with a rich, interactive interface."""
        try:
            # Get all available models
            models = self.registry.list_models()
            
            if not models:
                self.console.print("[red]No models available. Please check your configuration.[/red]")
                self.console.print("[yellow]Hint: Make sure your API keys are properly configured and models are accessible.[/yellow]")
                await asyncio.sleep(1)
                return
            
            # Create a mapping of model names to their implementations
            # Format: { 'display_name': ('implementation_name', 'description') }
            model_map = {
                'llama-3.3-70b-instruct': (
                    'llama-3.3-70b-instruct',
                    'Meta\'s Llama 3.3 70B - General purpose language model'
                ),
                'mixtral-8x7b-instruct': (
                    'mixtral-8x7b-instruct',
                    'Mistral\'s Mixtral 8x7B - High-quality instruction following'
                ),
                'code-llama-70b-instruct': (
                    'code-llama-70b-instruct',
                    'Code Llama 70B - Specialized for code generation'
                ),
                'flux.1-dev': (
                    'flux.1-dev',
                    'Flux 1.0 - High-quality image generation'
                ),
                'sdxl-turbo': (
                    'sdxl-turbo',
                    'Stable Diffusion XL Turbo - Fast high-quality image generation'
                ),
                'playground-v2.5': (
                    'playground-v2.5',
                    'Playground v2.5 - Advanced image generation'
                ),
                'nv-embed-v1': (
                    'nv-embed-v1',
                    'NVIDIA Embeddings V1 - General-purpose text embeddings'
                ),
                'bge-large-en-v1.5': (
                    'bge-large-en-v1.5',
                    'BAAI BGE Large v1.5 - High-quality text embeddings'
                ),
                'nemotron-3-8b-8k-base': (
                    'nemotron-3-8b-8k-base',
                    'NVIDIA Nemotron 3 8B - Specialized for code and reasoning'
                )
            }
            
            # Create a list of available models with their display info
            available_models = []
            for display_name, (impl_name, description) in model_map.items():
                # Find the model in the registry
                model = next((m for m in models if m.name == display_name), None)
                if model:
                    # Create a new ModelInfo with the implementation name and updated description
                    model_info = ModelInfo(
                        name=display_name,
                        description=description,
                        model_class=model.model_class,
                        model_type=model.model_type,
                        is_specialized=model.is_specialized,
                        default_params=model.default_params
                    )
                    available_models.append((model_info, impl_name))
            
            if not available_models:
                self.console.print("[yellow]No compatible models available.[/]")
                await asyncio.sleep(1)
                return
            
            while True:
                self.console.clear()
                self.console.print(Panel.fit(
                    "[bold blue]Available Models[/]",
                    border_style="blue",
                    padding=(1, 2)
                ))
                
                # Display models with numbers
                for i, (model, _) in enumerate(available_models, 1):
                    self.console.print(f"[cyan]{i}.[/] [green]{model.name}[/] - {model.description}")
                self.console.print("\n[dim]Note: Some models may use fallback implementations.[/dim]")
                
                self.console.print()
                choice = Prompt.ask(
                    "Select a model (number or name, 'q' to cancel)",
                    default=""
                ).strip()
                
                if choice.lower() == 'q':
                    return
                
                if not choice:
                    continue
                
                # Try to parse as number
                try:
                    choice_idx = int(choice) - 1
                    if not 0 <= choice_idx < len(available_models):
                        raise ValueError("Choice out of range")
                    selected_model, model_impl = available_models[choice_idx]
                except (ValueError, IndexError):
                    # Try to match by name
                    matching_models = [
                        (m, impl) for m, impl in available_models 
                        if choice.lower() in m.name.lower()
                    ]
                    if not matching_models:
                        self.console.print("[red]Invalid selection. Please try again.[/]")
                        await asyncio.sleep(1)
                        continue
                    selected_model, model_impl = matching_models[0]
                
                # Use the implementation name
                model_name = model_impl
                
                # Initialize the selected model
                with self.console.status(f"[bold blue]Initializing {model_name}..."):
                    try:
                        self.current_model = self.registry.create_model(model_name)
                        self.current_model_info = selected_model
                        
                        # Add to history
                        self.history.append({
                            'timestamp': datetime.now().isoformat(),
                            'action': 'model_selected',
                            'model': model_name,
                            'model_type': selected_model.model_type.name
                        })
                        
                        self.console.print(f"[green]✓ Successfully loaded {model_name}[/]")
                        await asyncio.sleep(1)
                        return
                        
                    except Exception as e:
                        self.console.print(f"[red]Error initializing model: {str(e)}[/]")
                        logger.error(f"Error initializing model {model_name}", exc_info=True)
                        await asyncio.sleep(2)
        
        except Exception as e:
            self.console.print(f"[red]Error in model selection: {str(e)}[/]")
            self.console.print("[yellow]This might be due to network issues or invalid API configuration.[/yellow]")
            logger.error("Error in _select_model", exc_info=True)
            await asyncio.sleep(2)
    
    async def _validate_model_availability(self, model_name: str) -> bool:
        """Validate if a model is actually available before selection."""
        try:
            models = await self.registry.list_models()
            available_models = [m.name for m in models]
            return model_name in available_models
        except Exception:
            return False
    
    async def _chat(self) -> None:
        """Handle chat interaction with the selected model."""
        if not self.current_model or not self.current_model_info:
            console.print("[red]No model selected.[/]")
            return
        
        console.print("\n[bold]Chat Mode[/] (type 'exit' to return to menu)\n")
        
        messages = []
        
        while True:
            try:
                user_input = Prompt.ask("[bold cyan]You[/]")
                
                if user_input.lower() in ('exit', 'quit', 'q'):
                    break
                
                if not user_input.strip():
                    continue
                
                # Add user message to history
                messages.append({"role": "user", "content": user_input})
                
                # Generate response
                with console.status("[bold green]Thinking...[/]"):
                    try:
                        response = await self.current_model.generate(
                            prompt=user_input,
                            messages=messages
                        )
                        
                        # Add assistant response to history
                        messages.append({"role": "assistant", "content": response.content})
                        
                        # Display response
                        console.print(f"\n[bold green]Assistant:[/]\n{response.content}\n")
                        
                        # Save to history
                        self.history.append({
                            "type": "chat",
                            "model": self.current_model_info.name,
                            "prompt": user_input,
                            "response": response.content,
                            "metadata": response.metadata
                        })
                        
                    except Exception as e:
                        console.print(f"[red]Error generating response: {e}[/]")
                        logger.error(f"Error in chat: {e}", exc_info=True)
            
            except KeyboardInterrupt:
                console.print("\n[bold yellow]Type 'exit' to return to the menu.[/]")
            except Exception as e:
                console.print(f"[red]Error: {e}[/]")
                logger.error(f"Error in chat loop: {e}", exc_info=True)
    
    async def _generate_code(self) -> None:
        """Handle code generation with the selected model."""
        if not self.current_model or not self.current_model_info:
            console.print("[red]No model selected.[/]")
            return
        
        console.print("\n[bold]Code Generation[/] (type 'exit' to return to menu)\n")
        
        while True:
            try:
                prompt = Prompt.ask("[bold cyan]Describe the code you want to generate[/]")
                
                if prompt.lower() in ('exit', 'quit', 'q'):
                    break
                
                if not prompt.strip():
                    continue
                
                # Generate code
                with console.status("[bold green]Generating code...[/]"):
                    try:
                        response = await self.current_model.generate(
                            prompt=prompt,
                            temperature=0.2,
                            max_tokens=2048
                        )
                        
                        # Display the generated code
                        console.print("\n[bold green]Generated Code:[/]")
                        console.print(f"[bold]```[/]\n{response.content}\n[bold]```[/]\n")
                        
                        # Save to history
                        self.history.append({
                            "type": "code_generation",
                            "model": self.current_model_info.name,
                            "prompt": prompt,
                            "response": response.content,
                            "metadata": response.metadata
                        })
                        
                        # Ask if user wants to save to file
                        if Confirm.ask("\nSave to file?"):
                            filename = Prompt.ask("Enter filename")
                            if not filename:
                                filename = "generated_code.py"
                            elif not any(filename.endswith(ext) for ext in ['.py', '.js', '.java', '.c', '.cpp', '.h', '.hpp']):
                                filename += ".py"
                            
                            try:
                                with open(filename, 'w', encoding='utf-8') as f:
                                    f.write(response.content)
                                console.print(f"\n[green]Code saved to {filename}[/]")
                            except Exception as e:
                                console.print(f"[red]Error saving file: {e}[/]")
                        
                    except Exception as e:
                        console.print(f"[red]Error generating code: {e}[/]")
                        logger.error(f"Error in code generation: {e}", exc_info=True)
            
            except KeyboardInterrupt:
                console.print("\n[bold yellow]Type 'exit' to return to the menu.[/]")
            except Exception as e:
                console.print(f"[red]Error: {e}[/]")
                logger.error(f"Error in code generation loop: {e}", exc_info=True)
    
    async def _generate_image(self) -> None:
        """Handle image generation with the selected model."""
        if not self.current_model or not self.current_model_info:
            console.print("[red]No model selected.[/]")
            return
        
        console.print("\n[bold]Image Generation[/] (type 'exit' to return to menu)\n")
        
        while True:
            try:
                prompt = Prompt.ask("[bold cyan]Describe the image you want to generate[/]")
                
                if prompt.lower() in ('exit', 'quit', 'q'):
                    break
                
                if not prompt.strip():
                    continue
                
                # Get additional parameters
                negative_prompt = Prompt.ask(
                    "[dim]Negative prompt (things you don't want in the image)[/]",
                    default=""
                )
                
                width = IntPrompt.ask(
                    "Width",
                    default=1024,
                    show_default=True
                )
                
                height = IntPrompt.ask(
                    "Height",
                    default=1024,
                    show_default=True
                )
                
                num_images = IntPrompt.ask(
                    "Number of images to generate",
                    default=1,
                    show_default=True
                )
                
                # Generate image
                with console.status("[bold green]Generating image...[/]"):
                    try:
                        response = await self.current_model.generate_image(
                            prompt=prompt,
                            negative_prompt=negative_prompt,
                            width=width,
                            height=height,
                            num_images=num_images
                        )
                        
                        # Display the generated images
                        for i, img_bytes in enumerate(response.images, 1):
                            console.print(f"\n[bold green]Generated Image {i}/{len(response.images)}:[/]")
                            
                            # For now, just show the image info since we can't display images in the terminal
                            console.print(f"[dim]Image size: {len(img_bytes):,} bytes[/]")
                            
                            # Save to file
                            filename = f"generated_image_{i}.png"
                            try:
                                with open(filename, 'wb') as f:
                                    f.write(img_bytes)
                                console.print(f"[green]Image saved to {filename}[/]")
                            except Exception as e:
                                console.print(f"[red]Error saving image: {e}[/]")
                        
                        # Save to history
                        self.history.append({
                            "type": "image_generation",
                            "model": self.current_model_info.name,
                            "prompt": prompt,
                            "num_images": len(response.images),
                            "metadata": response.metadata
                        })
                        
                    except Exception as e:
                        console.print(f"[red]Error generating image: {e}[/]")
                        logger.error(f"Error in image generation: {e}", exc_info=True)
            
            except KeyboardInterrupt:
                console.print("\n[bold yellow]Type 'exit' to return to the menu.[/]")
            except Exception as e:
                console.print(f"[red]Error: {e}[/]")
                logger.error(f"Error in image generation loop: {e}", exc_info=True)
    
    async def _embed_text(self) -> None:
        """Handle text embedding with the selected model."""
        if not self.current_model or not self.current_model_info:
            console.print("[red]No model selected.[/]")
            return
        
        console.print("\n[bold]Text Embedding[/] (type 'exit' to return to menu)\n")
        
        while True:
            try:
                text = Prompt.ask("[bold cyan]Enter text to embed[/]")
                
                if text.lower() in ('exit', 'quit', 'q'):
                    break
                
                if not text.strip():
                    continue
                
                # Generate embeddings
                with console.status("[bold green]Generating embeddings...[/]"):
                    try:
                        response = await self.current_model.generate_embeddings(
                            texts=[text]
                        )
                        
                        # Display embedding info
                        embeddings = response.content
                        if isinstance(embeddings, list) and embeddings:
                            if isinstance(embeddings[0], (list, tuple)):
                                # Multiple embeddings
                                dims = len(embeddings[0]) if embeddings[0] else 0
                                console.print(f"\n[green]Generated {len(embeddings)} embedding(s) with {dims} dimensions each[/]")
                                
                                # Show a preview of the first few dimensions of the first embedding
                                if dims > 0:
                                    preview = embeddings[0][:5]  # First 5 dimensions
                                    console.print(f"[dim]First 5 dimensions: {preview}...[/]")
                            else:
                                # Single embedding
                                dims = len(embeddings)
                                console.print(f"\n[green]Generated embedding with {dims} dimensions[/]")
                                
                                # Show a preview of the first few dimensions
                                if dims > 0:
                                    preview = embeddings[:5]  # First 5 dimensions
                                    console.print(f"[dim]First 5 dimensions: {preview}...[/]")
                        
                        # Save to history
                        self.history.append({
                            "type": "text_embedding",
                            "model": self.current_model_info.name,
                            "text": text,
                            "embedding_dimensions": dims if 'dims' in locals() else None,
                            "metadata": response.metadata
                        })
                        
                    except Exception as e:
                        console.print(f"[red]Error generating embeddings: {e}[/]")
                        logger.error(f"Error in text embedding: {e}", exc_info=True)
            
            except KeyboardInterrupt:
                console.print("\n[bold yellow]Type 'exit' to return to the menu.[/]")
            except Exception as e:
                console.print(f"[red]Error: {e}[/]")
                logger.error(f"Error in text embedding loop: {e}", exc_info=True)
    
    async def _show_model_info(self) -> None:
        """Display information about the selected model."""
        if not self.current_model_info:
            console.print("[red]No model selected.[/]")
            return
        
        model = self.current_model_info
        
        # Create a table with model info
        table = Table(
            title=f"Model: {model.name}",
            box=ROUNDED,
            show_header=False,
            title_style="bold green"
        )
        
        table.add_column("Property", style="cyan", no_wrap=True)
        table.add_column("Value")
        
        table.add_row("Name", model.name)
        table.add_row("Description", model.description)
        table.add_row("Type", model.model_type.name.replace('_', ' ').title())
        
        if model.is_specialized:
            table.add_row("Specialized", "Yes")
        
        if model.default_params:
            params_str = "\n".join(f"{k}: {v}" for k, v in model.default_params.items())
            table.add_row("Default Parameters", params_str)
        
        console.print(table)
        
        # Wait for user to press a key
        Prompt.ask("\n[dim]Press Enter to continue...[/]")
    
    async def _list_models(self) -> None:
        """List all available models."""
        models = self.registry.list_models()
        
        if not models:
            console.print("[yellow]No models available.[/]")
            return
        
        # Group models by type
        models_by_type = {}
        for model in models:
            model_type = model.model_type.name.replace('_', ' ').title()
            if model_type not in models_by_type:
                models_by_type[model_type] = []
            models_by_type[model_type].append(model)
        
        # Display models by type
        for model_type, type_models in models_by_type.items():
            table = Table(
                title=f"{model_type} Models",
                box=ROUNDED,
                show_header=True,
                header_style="bold magenta"
            )
            
            table.add_column("Name", style="green")
            table.add_column("Description")
            
            for model in type_models:
                table.add_row(
                    model.name,
                    model.description
                )
            
            console.print(table)
            console.print()  # Add space between tables
        
        # Wait for user to press a key
        Prompt.ask("\n[dim]Press Enter to continue...[/]")
    
    async def _show_history(self) -> None:
        """Display interaction history."""
        if not self.history:
            console.print("[yellow]No history available.[/]")
            return
        
        # Display history items
        for i, item in enumerate(reversed(self.history), 1):
            item_type = item.get('type', 'unknown').replace('_', ' ').title()
            model = item.get('model', 'unknown')
            timestamp = item.get('timestamp', 'N/A')
            
            console.print(f"\n[bold cyan]{i}. {item_type}[/] - {model}")
            console.print(f"[dim]{timestamp}[/]")
            
            if 'prompt' in item:
                console.print(f"[bold]Prompt:[/] {item['prompt']}")
            
            if 'response' in item and item_type != 'Image Generation':
                # Truncate long responses for the list view
                response = item['response']
                if len(response) > 100:
                    response = response[:97] + "..."
                console.print(f"[bold]Response:[/] {response}")
            
            if 'num_images' in item:
                console.print(f"[bold]Images Generated:[/] {item['num_images']}")
            
            if 'embedding_dimensions' in item:
                console.print(f"[bold]Embedding Dimensions:[/] {item['embedding_dimensions']}")
            
            console.print("-" * 50)
        
        # Wait for user to press a key
        Prompt.ask("\n[dim]Press Enter to continue...[/]")
    
    async def _clear_screen(self) -> None:
        """Clear the terminal screen and show a fresh view."""
        self.console.clear()
        # Reset first_run to force banner display
        self.first_run = True
        # Redraw the menu
        await self.run()
    
    def _init_history(self) -> None:
        """Initialize the command history."""
        history_file = Path.home() / ".agentx" / "history.json"
        try:
            if history_file.exists():
                with open(history_file, 'r', encoding='utf-8') as f:
                    self.history = json.load(f)
            else:
                self.history = []
        except Exception as e:
            logger.error(f"Error loading history: {e}")
            self.history = []
    
    def _save_history(self) -> None:
        """Save the command history to disk."""
        history_file = Path.home() / ".agentx" / "history.json"
        try:
            history_file.parent.mkdir(parents=True, exist_ok=True)
            with open(history_file, 'w', encoding='utf-8') as f:
                json.dump(self.history[-100:], f, indent=2)  # Keep last 100 items
        except Exception as e:
            logger.error(f"Error saving history: {e}")
    
    async def _launch_web_ui(self) -> None:
        """Launch the AGENT-X web interface using the launcher script."""
        if self.web_ui_status == WebUIStatus.RUNNING:
            if Confirm.ask("Web UI is already running. Open in browser?"):
                self._open_web_ui_in_browser()
            return
            
        self.web_ui_status = WebUIStatus.STARTING
        
        try:
            project_root = Path(__file__).parent.parent.parent
            launcher_script = project_root / "web" / "launch.py"
            
            if not launcher_script.exists():
                self.console.print("\n[red]❌ Web UI launcher script not found.[/]")
                self.console.print(f"Expected at: {launcher_script}")
                self.web_ui_status = WebUIStatus.ERROR
                await asyncio.sleep(2)
                return
                
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                transient=True,
                console=self.console
            ) as progress:
                task = progress.add_task("[cyan]Starting Web UI...", total=100)
                
                try:
                    # Launch the web UI in a new console window
                    if platform.system() == "Windows":
                        import ctypes
                        ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 6)  # Minimize console
                        
                        self.web_ui_process = subprocess.Popen(
                            [sys.executable, str(launcher_script)],
                            creationflags=subprocess.CREATE_NEW_CONSOLE,
                            cwd=str(project_root)
                        )
                    else:
                        # For non-Windows systems
                        self.web_ui_process = subprocess.Popen(
                            [sys.executable, str(launcher_script)],
                            cwd=str(project_root)
                        )
                    
                    # Update progress
                    progress.update(task, advance=50)
                    
                    # Wait a moment for the server to start
                    await asyncio.sleep(3)
                    
                    # Open in browser if configured
                    if get_setting('ui.web_ui.auto_launch_browser', True):
                        self._open_web_ui_in_browser()
                    
                    self.web_ui_status = WebUIStatus.RUNNING
                    progress.update(task, completed=100)
                    
                    self.console.print("\n[green]✅ AGENT-X Web UI is running![/]")
                    self.console.print("\n🌐 [bold]Web Interface:[/] http://localhost:3000")
                    self.console.print("🔧 [bold]API Server:[/]    http://localhost:8000")
                    self.console.print("\n[dim]The Web UI is running in a separate window.[/]")
                    
                except Exception as e:
                    self.web_ui_status = WebUIStatus.ERROR
                    self.console.print(f"\n[red]❌ Failed to start Web UI:[/] {str(e)}")
                    logger.exception("Error launching Web UI")
                    
        except Exception as e:
            self.web_ui_status = WebUIStatus.ERROR
            self.console.print(f"\n[red]❌ Error launching Web UI: {str(e)}[/]")
            logger.exception("Error in Web UI launcher")
        
        await asyncio.sleep(2)  # Show message before returning to menu
    
    def _open_web_ui_in_browser(self) -> None:
        """Open the web UI in the default browser."""
        host = get_setting('ui.web_ui.host', 'localhost')
        port = get_setting('ui.web_ui.port', 3000)
        url = f"http://{host}:{port}"
        
        try:
            webbrowser.open(url)
            self.console.print(f"\n[green]Opened {url} in your default browser[/]")
        except Exception as e:
            self.console.print(f"\n[yellow]Could not open browser. Please visit {url} manually.[/]")
            logger.warning(f"Could not open browser: {e}")
    
    async def _show_settings_menu(self) -> None:
        """Display and handle the settings menu."""
        while True:
            self.console.clear()
            self.console.print(Panel(
                "[bold blue]AGENT-X Settings[/]\n[dim]Configure application preferences[/]",
                border_style="blue",
                box=DOUBLE
            ))
            
            # Get current settings
            auto_clear = get_setting('ui.auto_clear_console', False)
            show_banner = get_setting('ui.show_banner', True)
            auto_launch = get_setting('ui.web_ui.auto_launch_browser', True)
            theme = get_setting('ui.theme', 'dark')
            
            # Display settings
            settings_table = Table.grid(padding=(0, 2))
            settings_table.add_column("Option", style="cyan")
            settings_table.add_column("Value", style="green")
            settings_table.add_column("Description", style="dim")
            
            settings_table.add_row(
                "1. Auto Clear Console",
                "✅ On" if auto_clear else "❌ Off",
                "Clear console before each command"
            )
            settings_table.add_row(
                "2. Show Banner",
                "✅ On" if show_banner else "❌ Off",
                "Show the AGENT-X banner on startup"
            )
            settings_table.add_row(
                "3. Auto-Launch Browser",
                "✅ On" if auto_launch else "❌ Off",
                "Open browser automatically when starting Web UI"
            )
            settings_table.add_row(
                "4. Theme",
                theme.title(),
                "Color theme for the interface"
            )
            settings_table.add_row(
                "5. Reset to Defaults",
                "",
                "Reset all settings to default values"
            )
            settings_table.add_row(
                "0. Back to Main Menu",
                "",
                "Return to the main menu"
            )
            
            self.console.print(settings_table)
            
            choice = Prompt.ask("\nSelect an option (0-5)", choices=["0", "1", "2", "3", "4", "5"])
            
            if choice == "0":
                break
            elif choice == "1":
                new_value = not auto_clear
                set_setting('ui.auto_clear_console', new_value)
                self.auto_clear = new_value
                self.console.print(f"\n[green]Auto Clear Console is now {'✅ On' if new_value else '❌ Off'}[/]")
                await asyncio.sleep(1)
            elif choice == "2":
                new_value = not show_banner
                set_setting('ui.show_banner', new_value)
                self.show_banner = new_value
                self.console.print(f"\n[green]Show Banner is now {'✅ On' if new_value else '❌ Off'}[/]")
                await asyncio.sleep(1)
            elif choice == "3":
                new_value = not auto_launch
                set_setting('ui.web_ui.auto_launch_browser', new_value)
                self.console.print(f"\n[green]Auto-Launch Browser is now {'✅ On' if new_value else '❌ Off'}[/]")
                await asyncio.sleep(1)
            elif choice == "4":
                themes = ["dark", "light", "system"]
                theme_choice = Prompt.ask(
                    "\nSelect theme",
                    choices=[str(i) for i in range(1, 4)],
                    show_choices=True,
                    default=str(themes.index(theme) + 1) if theme in themes else "1",
                    show_default=False
                )
                new_theme = themes[int(theme_choice) - 1]
                set_setting('ui.theme', new_theme)
                self.console.print(f"\n[green]Theme set to {new_theme.title()}[/]")
                await asyncio.sleep(1)
            elif choice == "5":
                if Confirm.ask("\n[bold red]Are you sure you want to reset all settings to defaults?[/]"):
                    # Reset to default settings
                    for key in self.settings.settings.keys():
                        del self.settings.settings[key]
                    self.settings._migrate_settings()
                    self.console.print("\n[green]✅ All settings have been reset to defaults.[/]")
                    await asyncio.sleep(2)
                    # Reload settings
                    self.auto_clear = get_setting('ui.auto_clear_console', False)
                    self.show_banner = get_setting('ui.show_banner', True)

    async def _exit_menu(self) -> None:
        """Handle menu exit."""
        if Confirm.ask("\nAre you sure you want to exit?"):
            # Clean up resources
            if hasattr(self, 'current_model') and self.current_model:
                if hasattr(self.current_model, 'close'):
                    await self.current_model.close()
            
            self.running = False
            console.print("\n[bold green]Thank you for using AGENT-X. Goodbye![/]\n")


async def run_menu() -> None:
    """Run the AGENT-X interactive menu."""
    menu = MenuSystem()
    await menu.run()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    try:
        asyncio.run(run_menu())
    except (KeyboardInterrupt, EOFError):
        console.print("\n[bold green]Goodbye![/]")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        console.print(f"\n[red]An unexpected error occurred: {e}[/]")
        console.print("[yellow]Check the logs for more details.[/]")
