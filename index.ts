import { streamText } from "ai";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const result = streamText({
    model: "openai/gpt-4o-mini",
    prompt: "Say hello in one short sentence.",
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  process.stdout.write("\n");

  const usage = await result.usage;
  console.log("Token usage:", usage);
}

main();
