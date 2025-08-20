Copy Code to Make an API Request

## Python

```python
from openai import OpenAI

client = OpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = "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"
)

completion = client.chat.completions.create(
  model="nvidia/llama-3.1-nemotron-70b-instruct",
  messages=[{"role":"user","content":""}],
  temperature=0.5,
  top_p=1,
  max_tokens=1024,
  stream=True
)

for chunk in completion:
  if chunk.choices[0].delta.content is not None:
    print(chunk.choices[0].delta.content, end="")
```

## Node.js
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: "nvidia/llama-3.1-nemotron-70b-instruct",
    messages: [{"role":"user","content":""}],
    temperature: 0.5,
    top_p: 1,
    max_tokens: 1024,
    stream: true,
  })
   
  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '')
  }
  
}

main();

```
## Shell

curl https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -d '{
    "model": "nvidia/llama-3.1-nemotron-70b-instruct",
    "messages": [{"role":"user","content":""}],
    "temperature": 0.5,   
    "top_p": 1,
    "max_tokens": 1024,
    "stream": true                
  }'
