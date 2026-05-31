import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources";
import type { z } from "zod";

import { env } from "../env.js";
import { openai } from "./openai.js";

export async function createStructured<T extends z.ZodTypeAny>(
  messages: ChatCompletionMessageParam[],
  schema: T,
  name: string,
): Promise<z.infer<T>> {
  try {
    const completion = await openai.chat.completions.parse({
      model: env.OPENAI_MODEL,
      messages,
      response_format: zodResponseFormat(schema, name),
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) {
      throw new Error(`No parsed output for ${name}`);
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI structured output failed", { name, messages });
    throw error;
  }
}
