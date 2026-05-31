import { OpenAI } from "openai";
import type {
  ChatCompletionMessageParam,
  ChatModel,
  ReasoningEffort,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from "openai/resources";

import { env } from "../env.js";

type ResponseFormat = ResponseFormatText | ResponseFormatJSONSchema;

export interface ChatInferenceOptions {
  response_format?: ResponseFormat;
  reasoning_effort?: ReasoningEffort;
}

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function createChatInference(
  messages: ChatCompletionMessageParam[],
  model: ChatModel = env.OPENAI_MODEL as ChatModel,
  options: ChatInferenceOptions = {},
): Promise<string> {
  const { response_format, reasoning_effort } = options;

  try {
    const result = await openai.chat.completions.create({
      model,
      messages,
      response_format,
      reasoning_effort,
    });

    const content = result.choices[0]?.message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    return content;
  } catch (error) {
    console.error("OpenAI inference failed", { model, messages });
    throw error;
  }
}
