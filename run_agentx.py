#!/usr/bin/env python3
"""AGENT-X Main Entry Point"""
import asyncio
import logging
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
console = Console()

class AgentX:
    def __init__(self):
        self.models = {
            "llm": {
                "name": "dbrx-instruct",
                "description": "Databricks DBRX Instruct - General purpose language model"
            },
            "vision": {
                "name": "flux-1",
                "description": "Flux 1.0 - High-quality image generation"
            },
            "retrieval": {
                "name": "nv-embed-v1",
                "description": "NVIDIA Embeddings V1 - Text embeddings"
            }
        }
        self.current_model = None
    
    async def run(self):
        """Run the main menu loop."""
        while True:
            console.clear()
            console.print(Panel.fit(
                "[bold blue]AGENT-X[/]\n[dim]AI Assistant Framework[/]",
                border_style="blue"
            ))
            
            # Show status
            if self.current_model:
                console.print(f"[green]✓[/] Model: {self.current_model['name']}")
                console.print(f"[dim]Type: {self.current_model.get('type', 'N/A')}")
                console.print(f"[dim]Description: {self.current_model['description']}\n")
            
            # Show menu
            options = [
                ("1", "Select Model"),
                ("2", "List Models"),
                ("3", "Chat" if self.current_model else "Chat (select model first)"),
                ("q", "Quit")
            ]
            
            for key, label in options:
                console.print(f"[cyan]{key}.[/] {label}")
            
            choice = Prompt.ask("\nSelect an option").lower().strip()
            
            if choice == "1":
                await self.select_model()
            elif choice == "2":
                self.list_models()
            elif choice == "3" and self.current_model:
                await self.chat()
            elif choice == "q":
                console.print("\n[blue]Goodbye![/]")
                break
            else:
                console.print("\n[red]Invalid choice. Please try again.[/]")
                await asyncio.sleep(1)
    
    async def select_model(self):
        """Select a model to use."""
        while True:
            console.clear()
            console.print(Panel.fit("[bold blue]Select a Model[/]"))
            
            # Display available models
            model_list = list(self.models.items())
            for i, (model_type, model) in enumerate(model_list, 1):
                console.print(f"[cyan]{i}.[/] [bold]{model['name']}[/] ({model_type})")
                console.print(f"   {model['description']}\n")
            
            choice = Prompt.ask("\nSelect a model (number or name, 'q' to cancel)").strip().lower()
            
            if choice == 'q':
                return
            
            try:
                # Try to select by number
                idx = int(choice) - 1
                if 0 <= idx < len(model_list):
                    model_type, model = model_list[idx]
                    self.current_model = model
                    self.current_model['type'] = model_type
                    console.print(f"\n[green]✓ Selected {model['name']}[/]")
                    await asyncio.sleep(1)
                    return
            except (ValueError, IndexError):
                # Try to match by name or type
                for model_type, model in model_list:
                    if choice in model['name'].lower() or choice in model_type.lower():
                        self.current_model = model
                        self.current_model['type'] = model_type
                        console.print(f"\n[green]✓ Selected {model['name']}[/]")
                        await asyncio.sleep(1)
                        return
            
            console.print("\n[red]Invalid selection. Please try again.[/]")
            await asyncio.sleep(1)
    
    def list_models(self):
        """List all available models."""
        console.clear()
        console.print(Panel.fit("[bold blue]Available Models[/]"))
        
        for model_type, model in self.models.items():
            console.print(f"[bold green]{model['name']}[/]")
            console.print(f"Type: {model_type}")
            console.print(f"Description: {model['description']}\n")
        
        console.print("\n[dim]Press Enter to continue...[/]")
        input()
    
    async def chat(self):
        """Simple chat interface."""
        console.clear()
        console.print(Panel.fit(
            f"[bold blue]Chat with {self.current_model['name']}[/]\n"
            "[dim]Type 'exit' to return to the main menu.[/]",
            border_style="blue"
        ))
        
        console.print("\n[dim]Chat interface - This is a placeholder.\n")
        
        while True:
            user_input = Prompt.ask("You")
            if user_input.lower() == 'exit':
                break
                
            console.print(f"\n[green]{self.current_model['name']}:[/] "
                         f"This is a simulated response from {self.current_model['name']}.")
        
        console.print("\n[dim]Returning to main menu...[/]")
        await asyncio.sleep(1)

async def main():
    """Run the AGENT-X application."""
    agent = AgentX()
    await agent.run()

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
