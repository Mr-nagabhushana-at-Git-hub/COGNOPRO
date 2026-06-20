import { journalAnalysisSchema, type CompanionContext, type JournalAnalysis } from "@shared/wellness";

export interface AiProvider {
  readonly name: string;
  readonly configured: boolean;
  analyze(text: string, repair?: boolean): Promise<JournalAnalysis>;
  companion(context: CompanionContext): Promise<string>;
}

const analysisInstruction = `Analyze the journal for supportive wellness telemetry. Return JSON only with exactly: emotion (string), intensity (integer 1-10), burnoutRisk (number 0-1), triggers (string array), crisis (boolean). Do not diagnose.`;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse((fenced ?? text).trim());
}

function parseAnalysis(text: string): JournalAnalysis {
  return journalAnalysisSchema.parse(extractJson(text));
}

function contextPrompt(context: CompanionContext): string {
  const summaries = context.analyses.map((item) => `${item.emotion}; intensity ${item.intensity}; triggers ${item.triggers.join(", ")}`).join(" | ");
  return `Recent journal analyses: ${summaries || "none"}. User message: ${context.message}. Give a short, empathetic, non-diagnostic coping response with one concrete next step. Never claim to be emergency support.`;
}

async function requestJson(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 240)}`);
  return JSON.parse(body);
}

export class OllamaProvider implements AiProvider {
  readonly name = "ollama";
  readonly configured = true;
  private readonly baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  private readonly model = process.env.OLLAMA_MODEL ?? "llama3.2";

  private async chat(prompt: string, format?: object): Promise<string> {
    const body = await requestJson(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, stream: false, format, messages: [{ role: "user", content: prompt }] }),
    }, Number(process.env.LOCAL_AI_TIMEOUT_MS ?? 1500)) as { message?: { content?: string } };
    if (!body.message?.content) throw new Error("Ollama returned no message content");
    return body.message.content;
  }

  async analyze(text: string, repair = false): Promise<JournalAnalysis> {
    const prompt = `${analysisInstruction}${repair ? " Previous output was invalid; obey the schema exactly." : ""}\nJournal:\n${text}`;
    return parseAnalysis(await this.chat(prompt, {
      type: "object",
      properties: {
        emotion: { type: "string" },
        intensity: { type: "integer", minimum: 1, maximum: 10 },
        burnoutRisk: { type: "number", minimum: 0, maximum: 1 },
        triggers: { type: "array", items: { type: "string" } },
        crisis: { type: "boolean" },
      },
      required: ["emotion", "intensity", "burnoutRisk", "triggers", "crisis"],
    }));
  }

  companion(context: CompanionContext): Promise<string> { return this.chat(contextPrompt(context)); }
}

abstract class RemoteProvider implements AiProvider {
  abstract readonly name: string;
  abstract readonly configured: boolean;
  abstract complete(prompt: string): Promise<string>;
  async analyze(text: string, repair = false): Promise<JournalAnalysis> {
    return parseAnalysis(await this.complete(`${analysisInstruction}${repair ? " Previous output was invalid; return corrected JSON only." : ""}\nJournal:\n${text}`));
  }
  companion(context: CompanionContext): Promise<string> { return this.complete(contextPrompt(context)); }
}

export class AnthropicProvider extends RemoteProvider {
  readonly name = "anthropic";
  readonly configured = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL);
  async complete(prompt: string): Promise<string> {
    const body = await requestJson("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL, max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
    }, 12000) as { content?: Array<{ type: string; text?: string }> };
    const text = body.content?.find((item) => item.type === "text")?.text;
    if (!text) throw new Error("Anthropic returned no text content");
    return text;
  }
}

export class OpenAiProvider extends RemoteProvider {
  readonly name = "openai";
  readonly configured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
  async complete(prompt: string): Promise<string> {
    const body = await requestJson("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL, input: prompt, max_output_tokens: 700 }),
    }, 12000) as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = body.output_text ?? body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("OpenAI returned no output text");
    return text;
  }
}

export class HuggingFaceProvider extends RemoteProvider {
  readonly name = "huggingface";
  readonly configured = Boolean(process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_MODEL);
  async complete(prompt: string): Promise<string> {
    const model = encodeURIComponent(process.env.HUGGINGFACE_MODEL!);
    const body = await requestJson(`https://router.huggingface.co/hf-inference/models/${model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 700, return_full_text: false } }),
    }, 15000) as Array<{ generated_text?: string }>;
    const text = body[0]?.generated_text;
    if (!text) throw new Error("Hugging Face returned no generated text");
    return text;
  }
}
