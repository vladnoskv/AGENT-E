import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '$API_KEY_REQUIRED_IF_EXECUTING_OUTSIDE_NGC',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function main() {
  const response = await openai.responses.create({
    model: "openai/gpt-oss-120b",
    input: [""],
    max_output_tokens: 4096,
    top_p: 1,
    temperature: 1,
    stream: true
  });

  
  let reasoningDone = false;
  for await (const chunk of response) {
    if (chunk.type === "response.reasoning_text.delta") {
      process.stdout.write(chunk.delta);
    } else if (chunk.type === "response.output_text.delta") {
      if (!reasoningDone) {
        process.stdout.write("\n");
        reasoningDone = true;
      }
      process.stdout.write(chunk.delta);
    }
  }
  
}

main();