#!/usr/bin/env python3
"""A simplified version of the AGENT-X menu for debugging."""
import asyncio
import logging
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
console = Console()

class SimpleMenu:
    def __init__(self):
        self.current_model = None
        self.current_model_info = None
        self.history = []
        self.available_models = [
            {
                'name': 'dbrx-instruct',
                'display_name': 'DBRX Instruct',
                'description': 'Databricks DBRX Instruct for general purpose chat',
                'type': 'LLM'
            },
            {
                'name': 'flux-1',
                'display_name': 'Flux 1.0',
                'description': 'High-quality image generation',
                'type': 'VISUAL'
            },
            {
                'name': 'nv-embed-v1',
                'display_name': 'NVIDIA Embed V1',
                'description': 'General-purpose text embeddings',
                'type': 'RETRIEVAL'
            }
        ]
    
    async def show_menu(self):
        """Show the main menu."""
        while True:
            self.console.clear()
            self.console.print(Panel.fit(
                "[bold blue]AGENT-X Simple Menu[/]\n"
                "[dim]A simplified interface for testing[/]",
                border_style="blue",
                padding=(1, 2)
            ))
            
            # Show current model status
            if self.current_model:
                self.console.print(f"[green]✓ Current Model:[/] {self.current_model_info['display_name']}")
                self.console.print(f"[dim]Type:[/] {self.current_model_info['type']}")
                self.console.print(f"[dim]Description:[/] {self.current_model_info['description']}\n")
            else:
                self.console.print("[yellow]No model selected[/]\n")
            
            # Show menu options
            options = [
                ("1", "Select Model"),
                ("2", "List Available Models")
            ]
            
            if self.current_model:
                options.extend([
                    ("3", f"Chat with {self.current_model_info['display_name']}"),
                    ("4", "Model Settings")
                ])
            
            options.extend([
                ("w", "Open Web UI"),
                ("q", "Quit")
            ])
            
            # Display menu
            for key, label in options:
                self.console.print(f"[cyan]{key}.[/] {label}")
            
            # Get user choice
            choice = Prompt.ask("\nSelect an option").lower().strip()
            
            # Handle choice
            if choice == '1':
                await self._select_model()
            elif choice == '2':
                await self._list_models()
            elif choice == '3' and self.current_model:
                await self._chat()
            elif choice == '4' and self.current_model:
                await self._model_settings()
            elif choice == 'w':
                await self._open_web_ui()
            elif choice == 'q':
                self.console.print("\n[blue]Goodbye![/]")
                return
            else:
                self.console.print("[red]Invalid choice. Please try again.[/]")
                await asyncio.sleep(1)
    
    async def _select_model(self):
        """Handle model selection."""
        while True:
            self.console.clear()
            self.console.print(Panel.fit(
                "[bold blue]Select a Model[/]",
                border_style="blue",
                padding=(1, 2)
            ))
            
            # Display available models
            for i, model in enumerate(self.available_models, 1):
                self.console.print(f"[cyan]{i}.[/] [green]{model['display_name']}[/] - {model['description']}")
            
            self.console.print("\n[dim]Note: Some models may require API keys or additional setup.[/]")
            
            choice = Prompt.ask(
                "\nSelect a model (number or name, 'q' to cancel)",
                default=""
            ).strip().lower()
            
            if choice == 'q':
                return
            
            if not choice:
                continue
            
            # Try to parse as number
            try:
                choice_idx = int(choice) - 1
                if not 0 <= choice_idx < len(self.available_models):
                    raise ValueError("Choice out of range")
                selected_model = self.available_models[choice_idx]
            except (ValueError, IndexError):
                # Try to match by name
                matching_models = [
                    m for m in self.available_models 
                    if choice in m['name'].lower() or choice in m['display_name'].lower()
                ]
                if not matching_models:
                    self.console.print("[red]Invalid selection. Please try again.[/]")
                    await asyncio.sleep(1)
                    continue
                selected_model = matching_models[0]
            
            # Set the selected model
            self.current_model = selected_model['name']
            self.current_model_info = selected_model
            
            self.console.print(f"\n[green]✓ Selected model: {selected_model['display_name']}[/]")
            await asyncio.sleep(1)
            return
    
    async def _list_models(self):
        """List all available models."""
        self.console.clear()
        self.console.print(Panel.fit(
            "[bold blue]Available Models[/]",
            border_style="blue",
            padding=(1, 2)
        ))
        
        for model in self.available_models:
            self.console.print(f"[bold green]{model['display_name']}[/] ({model['type']})")
            self.console.print(f"  {model['description']}")
            self.console.print(f"  [dim]ID: {model['name']}\n")
        
        self.console.print("\n[dim]Press Enter to continue...[/]")
        input()
    
    async def _chat(self):
        """Simple chat interface."""
        self.console.clear()
        self.console.print(Panel.fit(
            f"[bold blue]Chat with {self.current_model_info['display_name']}[/]\n"
            "[dim]Type 'exit' to return to the main menu.[/]",
            border_style="blue",
            padding=(1, 2)
        ))
        
        # In a real implementation, this would connect to the actual model
        self.console.print("\n[dim]Chat functionality would be implemented here.[/]")
        self.console.print("[dim]This is a placeholder for the chat interface.\n")
        
        while True:
            user_input = Prompt.ask("You")
            if user_input.lower() == 'exit':
                break
                
            # Simulate a response
            self.console.print(f"\n[green]{self.current_model_info['display_name']}:[/] "
                             f"This is a simulated response from {self.current_model_info['display_name']}. "
                             "In a real implementation, this would be the model's response.")
        
        self.console.print("\n[dim]Returning to main menu...[/]")
        await asyncio.sleep(1)
    
    async def _model_settings(self):
        """Show model settings."""
        self.console.clear()
        self.console.print(Panel.fit(
            f"[bold blue]Settings for {self.current_model_info['display_name']}[/]",
            border_style="blue",
            padding=(1, 2)
        ))
        
        self.console.print("\n[dim]Model settings would be configured here.[/]")
        self.console.print("[dim]This is a placeholder for the settings interface.\n")
        
        self.console.print("\n[dim]Press Enter to continue...[/]")
        input()


async def main():
    """Run the simple menu."""
    menu = SimpleMenu()
    await menu.show_menu()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        if logger.level <= logging.DEBUG:
            import traceback
            traceback.print_exc()
