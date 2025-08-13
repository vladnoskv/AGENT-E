import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '$API_KEY_REQUIRED_IF_EXECUTING_OUTSIDE_NGC',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})
 
async function main() {
  const completion = await openai.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{"role":"user","content":""}],
    temperature: 1,
    top_p: 1,
    max_tokens: 4096,
    stream: true
  })
   
  for await (const chunk of completion) {
    const reasoning = chunk.choices[0]?.delta?.reasoning_content;
    if (reasoning) process.stdout.write(reasoning);
    process.stdout.write(chunk.choices[0]?.delta?.content || '')
  }
  
}

main();