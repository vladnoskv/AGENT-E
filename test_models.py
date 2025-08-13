"""
Test script for AGENTX models.

This script verifies that all models can be instantiated and perform basic operations.
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import Dict, Any, List

# Add project root to path
sys.path.append(str(Path(__file__).parent.absolute()))

from models.registry import registry, ModelType

# Test configurations for different model types
TEST_CONFIGS = {
    ModelType.LLM: {
        "prompt": "Explain quantum computing in simple terms",
        "params": {"max_tokens": 100, "temperature": 0.7}
    },
    ModelType.RETRIEVAL: {
        "text": "This is a test document about artificial intelligence.",
        "query": "What is AI?",
        "params": {}
    },
    ModelType.VISUAL: {
        "prompt": "A serene mountain landscape with a lake",
        "output": "test_output.png",
        "params": {"width": 512, "height": 512}
    }
}

async def test_model(model_name: str, model_info: Dict[str, Any]) -> bool:
    """Test a single model."""
    print(f"\n{'='*80}")
    print(f"Testing model: {model_name}")
    print(f"Type: {model_info.model_type.value}")
    print(f"Description: {model_info.description}")
    
    try:
        # Get model instance
        model = registry.create_model(model_name)
        print("✅ Model instantiated successfully")
        
        # Get test config based on model type
        config = TEST_CONFIGS.get(model_info.model_type, {})
        
        # Test based on model type
        if model_info.model_type == ModelType.LLM:
            # Test text generation
            messages = [{"role": "user", "content": config["prompt"]}]
            response = await model.generate(
                messages=messages,
                **config["params"]
            )
            result = response['choices'][0]['message']['content']
            print(f"✅ Generated text ({len(result)} characters)")
            print(f"Preview: {result[:100]}...")
            
        elif model_info.model_type == ModelType.RETRIEVAL:
            # Test embeddings
            docs = await model.get_embeddings([config["text"]], **config["params"])
            if docs and docs[0].embedding:
                print(f"✅ Generated embeddings ({len(docs[0].embedding)} dimensions)")
                
                # Test semantic search if the model supports it
                if hasattr(model, 'semantic_search'):
                    results = await model.semantic_search(
                        query=config["query"],
                        documents=docs
                    )
                    if results:
                        print(f"✅ Semantic search successful (top result: {results[0].score:.3f})")
            
        elif model_info.model_type == ModelType.VISUAL:
            # Test image generation
            if hasattr(model, 'generate_image'):
                images = await model.generate_image(
                    prompt=config["prompt"],
                    **config["params"]
                )
                if images:
                    output_path = Path(config["output"])
                    images[0].save(output_path)
                    print(f"✅ Generated image saved to {output_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing {model_name}: {str(e)}")
        if "DEBUG" in os.environ:
            import traceback
            traceback.print_exc()
        return False

async def test_all_models():
    """Test all registered models."""
    print("Starting model tests...")
    print(f"NVIDIA_API_KEY: {'Set' if os.getenv('NVIDIA_API_KEY') else 'Not set'}")
    
    # Get all models
    models = registry.list_models()
    print(f"Found {len(models)} models to test")
    # Test each model
    results = {}
    for model_info in models:
        success = await test_model(model_info.name, model_info)
        results[model_info.name] = success
    
    # Print summary
    print("\n" + "="*80)
    print("Test Summary:")
    print("-" * 40)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    
    for model_name, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {model_name}")
    
    print("-" * 40)
    print(f"Total: {total}, Passed: {passed}, Failed: {total - passed}")
    print("=" * 80)
    
    if passed < total:
        sys.exit(1)  # Exit with error code if any tests failed

if __name__ == "__main__":
    # Create output directory if it doesn't exist
    Path("test_output").mkdir(exist_ok=True)
    
    # Run tests
    asyncio.run(test_all_models())
