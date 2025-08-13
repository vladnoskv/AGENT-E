# AGENTX Models

This directory contains implementations of various AI models for different tasks, integrated with the NVIDIA NIM API.

## Setup

1. Create a `.env` file in the project root with your NVIDIA API key:
   ```
   NVIDIA_API_KEY="your-nvidia-api-key-here"
   ```

2. Install required dependencies:
   ```bash
   pip install aiohttp python-dotenv pillow numpy
   ```

## Available Models

### Large Language Models (LLM)
- `dbrx-instruct`: Databricks DBRX Instruct for general purpose chat
- `codegemma-7b`: Google's CodeGemma 7B for code generation
- `gemma-2-7b`: Google's Gemma 2 7B for general purpose chat

### Retrieval Models
- `nv-embed-v1`: General-purpose text embeddings
- `nv-embedcode-7b`: Code-specific embeddings
- `bge-m3`: BAAI's BGE-M3 embedding model

### Visual Models
- `flux-1`: Black Forest Labs' Flux 1.0 for image generation
- `bria-2.3`: BRIA AI's 2.3 for high-quality image generation
- `ai-detector`: Detect AI-generated images

## Usage Examples

### Using LLM Models
```python
from models.llm import DBRXInstruct
import asyncio

async def chat_example():
    model = DBRXInstruct()
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Tell me about AGENTX."}
    ]
    
    response = await model.generate(
        messages=messages,
        max_tokens=500,
        temperature=0.7
    )
    print(response['choices'][0]['message']['content'])

asyncio.run(chat_example())
```

### Using Retrieval Models
```python
from models.retrieval import NVEmbedV1
import asyncio

async def embedding_example():
    model = NVEmbedV1()
    
    # Get embeddings for text
    texts = ["This is a test sentence.", "Another example text."]
    embeddings = await model.get_embeddings(texts)
    
    # Calculate similarity
    similarity = model.cosine_similarity(embeddings[0], embeddings[1])
    print(f"Similarity: {similarity:.4f}")

asyncio.run(embedding_example())
```

### Using Visual Models
```python
from models.visual import Flux1
import asyncio

async def generate_image():
    model = Flux1()
    
    images = await model.generate_image(
        prompt="A beautiful sunset over mountains, digital art",
        width=1024,
        height=1024
    )
    
    # Save the first generated image
    if images:
        images[0].save("generated_image.png")
        print("Image saved as generated_image.png")

asyncio.run(generate_image())
```

## Model Factory

You can also use the model factory to create models by name:

```python
from models.utils.model_factory import get_model
import asyncio

async def factory_example():
    # Create a model instance by name
    model = get_model("dbrx-instruct")
    
    # Use the model
    response = await model.generate(
        messages=[{"role": "user", "content": "Hello!"}]
    )
    print(response)

asyncio.run(factory_example())
```

## Adding New Models

1. Create a new class in the appropriate module (llm, retrieval, or visual)
2. Register the model in the `ModelFactory._model_registry`
3. Update this README with documentation for the new model
