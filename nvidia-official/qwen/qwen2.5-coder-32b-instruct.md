## Python

```python
from openai import OpenAI

client = OpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = "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"
)

completion = client.chat.completions.create(
  model="qwen/qwen2.5-coder-32b-instruct",
  messages=[{"role":"user","content":""}],
  temperature=0.2,
  top_p=0.7,
  max_tokens=1024,
  stream=False
)

print(completion.choices[0].message)

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
    model: "qwen/qwen2.5-coder-32b-instruct",
    messages: [{"role":"user","content":""}],
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    stream: false,
  })
   
  console.log(completion.choices[0].message)
}

main();

```

## Shell

curl https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -d '{
    "model": "qwen/qwen2.5-coder-32b-instruct",
    "messages": [{"role":"user","content":""}],
    "temperature": 0.2,   
    "top_p": 0.7,
    "max_tokens": 1024,
    "stream": false                
  }'
