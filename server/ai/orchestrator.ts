import type { CompanionContext, JournalAnalysis, ProviderResult } from "@shared/wellness";
import { fallbackAnalysis, fallbackCompanion } from "./deterministic-fallback";
import { logEvent, logFailure } from "./logger";
import { AnthropicProvider, HuggingFaceProvider, OllamaProvider, OpenAiProvider, type AiProvider } from "./providers";

export class WellnessOrchestrator {
  private readonly providers: AiProvider[] = [new OllamaProvider(), new AnthropicProvider(), new OpenAiProvider(), new HuggingFaceProvider()];

  async analyze(text: string): Promise<ProviderResult<JournalAnalysis>> {
    logEvent("ROUTER", "analysis_route_started");
    for (const provider of this.providers) {
      if (!provider.configured) {
        logEvent("PROVIDER", "provider_skipped_unconfigured", { provider: provider.name });
        continue;
      }
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const value = await provider.analyze(text, attempt === 2);
          logEvent("PROVIDER", "analysis_succeeded", { provider: provider.name, attempt });
          return { value, provider: provider.name, fallback: false };
        } catch (error) {
          logFailure("PROVIDER", "analysis_failed", error, { provider: provider.name, attempt });
        }
      }
      logEvent("FAILOVER", "switching_provider", { failedProvider: provider.name });
    }
    logEvent("FAILOVER", "deterministic_analysis_triggered", { reason: "all_providers_failed_or_unconfigured" });
    return { value: fallbackAnalysis(text), provider: "deterministic-fallback", fallback: true };
  }

  async companion(context: CompanionContext): Promise<ProviderResult<string>> {
    logEvent("ROUTER", "companion_route_started", { contextEntries: context.analyses.length });
    for (const provider of this.providers) {
      if (!provider.configured) continue;
      try {
        const value = await provider.companion(context);
        if (!value.trim()) throw new Error("Provider returned an empty response");
        logEvent("PROVIDER", "companion_succeeded", { provider: provider.name });
        return { value, provider: provider.name, fallback: false };
      } catch (error) {
        logFailure("PROVIDER", "companion_failed", error, { provider: provider.name });
        logEvent("FAILOVER", "switching_provider", { failedProvider: provider.name });
      }
    }
    logEvent("FAILOVER", "deterministic_companion_triggered", { reason: "all_providers_failed_or_unconfigured" });
    return { value: fallbackCompanion(context), provider: "deterministic-fallback", fallback: true };
  }

  async *streamCompanion(context: CompanionContext): AsyncGenerator<string> {
    const result = await this.companion(context);
    for (const token of result.value.match(/\S+\s*/g) ?? []) yield token;
  }
}

export const wellnessOrchestrator = new WellnessOrchestrator();
