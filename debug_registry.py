#!/usr/bin/env python3
"""Debug script to check model registry initialization."""
import sys
import logging
from rich.console import Console

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
console = Console()

def check_model_registry():
    """Check the model registry and print available models."""
    try:
        console.print("\n[bold blue]Checking model registry...[/]")
        
        # Import registry
        from agentx.models.registry import registry, ModelType
        
        # List all models
        console.print("\n[bold]All registered models:[/]")
        models = registry.list_models()
        if not models:
            console.print("[yellow]No models found in registry![/]")
            return False
            
        for i, model in enumerate(models, 1):
            console.print(f"  {i}. {model.name} ({model.model_type.name}) - {model.description}")
        
        # Check model types
        console.print("\n[bold]Models by type:[/]")
        for model_type in ModelType:
            models = registry.list_models(model_type=model_type)
            console.print(f"\n[bold]{model_type.name}:[/]")
            for model in models:
                console.print(f"  - {model.name}: {model.description}")
        
        return True
        
    except Exception as e:
        console.print(f"[red]Error checking model registry: {str(e)}[/]")
        logger.exception("Exception in check_model_registry")
        return False

if __name__ == "__main__":
    console.print("[bold]AGENT-X Model Registry Debug[/]")
    console.print("=" * 50)
    
    success = check_model_registry()
    
    console.print("\n[bold]Debug completed![/]")
    sys.exit(0 if success else 1)
