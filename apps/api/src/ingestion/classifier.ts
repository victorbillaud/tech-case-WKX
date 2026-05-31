import type { ChatCompletionMessageParam } from "openai/resources";

import { createStructured, renderPrompt } from "../llm/index.js";
import {
  type Classification,
  ClassificationOutput,
  type Classifier,
  type RawFile,
  type SourceKind,
} from "./types.js";

const HEAD_CHARS = 1500;

function toSourceKind(output: ClassificationOutput): SourceKind {
  if (output.kind === "document") {
    return { document: output.docType };
  }

  return output.kind;
}


export class OpenAiClassifier implements Classifier {
  async classify(file: RawFile): Promise<Classification> {
    const head = file.text.slice(0, HEAD_CHARS);

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: renderPrompt("classify/system_prompt.njk") },
      {
        role: "user",
        content: renderPrompt("classify/user_prompt.njk", {
          filename: file.filename,
          mime: file.mime,
          headChars: HEAD_CHARS,
          head,
        }),
      },
    ];

    const output = await createStructured(
      messages,
      ClassificationOutput,
      "file_classification",
    );

    return { kind: toSourceKind(output), rationale: output.rationale };
  }
}
