## Python

```python
from openai import OpenAI

client = OpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = "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"
)

completion = client.chat.completions.create(
  model="nvidia/llama-3.3-nemotron-super-49b-v1.5",
  messages=[{"role":"system","content":"/think"}],
  temperature=0.6,
  top_p=0.95,
  max_tokens=65536,
  frequency_penalty=0,
  presence_penalty=0,
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
    model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    messages: [{"role":"system","content":"/think"}],
    temperature: 0.6,
    top_p: 0.95,
    max_tokens: 65536,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: true,
  })
   
  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '')
  }
  
}

main();

```

## Shell
```shell
curl https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -d '{
    "model": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    "messages": [{"role":"system","content":"/think"}],
    "temperature": 0.6,   
    "top_p": 0.95,
    "max_tokens": 65536,
    "frequency_penalty": 0,
    "presence_penalty": 0,
    "stream": true                
  }'

```