import { journalAnalysisSchema, type CompanionContext, type JournalAnalysis } from "@shared/wellness";

export interface AiProvider {
  readonly name: string;
  readonly configured: boolean;
  analyze(text: string, repair?: boolean, apiKey?: string): Promise<JournalAnalysis>;
  companion(context: CompanionContext, apiKey?: string): Promise<string>;
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
  const metricsInfo = context.overallMetrics ? `\nUser's current holistic state:\n${context.overallMetrics}\n` : "";
  const ytLibrary = `
- [YT:jfKfPfyJRdk] (Lofi focus beats / studying)
- [YT:M7lc1UVf-VE] (5-Minute Calming Meditation)
- [YT:dQw4w9WgXcQ] (Short Motivational Speech)
  `;
  return `Recent journal analyses: ${summaries || "none"}.${metricsInfo} User message: ${context.message}. Give a short, empathetic, non-diagnostic coping response with one concrete next step. Never claim to be emergency support. Consider their holistic state (tasks, fitness, focus) if relevant to their stress or well-being, but maintain an emotionally supportive tone. If you believe a specific calming, motivational, or focus-oriented YouTube video would help them right now, output the exact string [YT:video_id] but YOU MUST STRICTLY CHOOSE ONE from this exact list: ${ytLibrary}. DO NOT invent or guess YouTube IDs.`;
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

  async analyze(text: string, repair = false, _apiKey?: string): Promise<JournalAnalysis> {
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

  async companion(context: CompanionContext, _apiKey?: string): Promise<string> {
    return this.chat(contextPrompt(context));
  }
}

abstract class RemoteProvider implements AiProvider {
  abstract readonly name: string;
  abstract readonly configured: boolean;
  protected abstract complete(prompt: string, apiKey?: string): Promise<string>;

  async analyze(text: string, repair = false, apiKey?: string): Promise<JournalAnalysis> {
    const prompt = `${analysisInstruction}${repair ? " Previous output was invalid; obey the schema exactly." : ""}\nJournal:\n${text}`;
    return parseAnalysis(await this.complete(prompt, apiKey));
  }

  async companion(context: CompanionContext, apiKey?: string): Promise<string> {
    return this.complete(contextPrompt(context), apiKey);
  }
}

export class AnthropicProvider extends RemoteProvider {
  readonly name = "anthropic";
  readonly configured = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL);
  async complete(prompt: string, _apiKey?: string): Promise<string> {
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
  async complete(prompt: string, _apiKey?: string): Promise<string> {
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
  async complete(prompt: string, _apiKey?: string): Promise<string> {
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

export class GeminiProvider extends RemoteProvider {
  readonly name = "gemini";
  readonly configured = Boolean(process.env.GEMINI_API_KEY);
  
  async complete(prompt: string, apiKeyOverride?: string): Promise<string> {
    const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY!;
    // Using gemini-1.5-pro-latest since the prompt needs high reasoning capabilities
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;
    
    const body = await requestJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: 700,
        }
      }),
    }, 15000) as any;
    
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no text content");
    return text;
  }
}

export class GroqProvider extends RemoteProvider {
  readonly name = "groq";
  readonly configured = Boolean(process.env.GROQ_API_KEY);
  
  async complete(prompt: string, apiKeyOverride?: string): Promise<string> {
    const apiKey = apiKeyOverride || process.env.GROQ_API_KEY!;
    const body = await requestJson("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Fast default
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700,
      }),
    }, 15000) as { choices?: Array<{ message?: { content?: string } }> };
    
    const text = body.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq returned no text content");
    return text;
  }
}
