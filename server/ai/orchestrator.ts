import type { CompanionContext, JournalAnalysis, ProviderResult } from "@shared/wellness";
import { fallbackAnalysis, fallbackCompanion } from "./deterministic-fallback";
import { logEvent, logFailure } from "./logger";
import { AnthropicProvider, CerebrasProvider, GeminiProvider, GroqProvider, HuggingFaceProvider, OllamaProvider, OpenAiProvider, type AiProvider } from "./providers";

export interface UserKeys {
  gemini?: string;
  cerebras?: string;
  groq?: string;
}

export class WellnessOrchestrator {
  private readonly providers: AiProvider[] = [new GeminiProvider(), new CerebrasProvider(), new GroqProvider(), new OllamaProvider(), new AnthropicProvider(), new OpenAiProvider(), new HuggingFaceProvider()];

  async analyze(text: string, keys?: UserKeys): Promise<ProviderResult<JournalAnalysis>> {
    logEvent("ROUTER", "analysis_route_started");
    for (const provider of this.providers) {
      // Provider is configured if it has an env key OR the user provided a custom key
      const hasUserKey =
        (provider.name === "gemini" && keys?.gemini) ||
        (provider.name === "cerebras" && keys?.cerebras) ||
        (provider.name === "groq" && keys?.groq);
      if (!provider.configured && !hasUserKey) {
        logEvent("PROVIDER", "provider_skipped_unconfigured", { provider: provider.name });
        continue;
      }
      
      const apiKey =
        provider.name === "gemini"
          ? keys?.gemini
          : provider.name === "cerebras"
            ? keys?.cerebras
            : provider.name === "groq"
              ? keys?.groq
              : undefined;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const value = await provider.analyze(text, attempt === 2, apiKey);
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

  async companion(context: CompanionContext, keys?: UserKeys): Promise<ProviderResult<string>> {
    logEvent("ROUTER", "companion_route_started", { contextEntries: context.analyses.length });
    for (const provider of this.providers) {
      const hasUserKey =
        (provider.name === "gemini" && keys?.gemini) ||
        (provider.name === "cerebras" && keys?.cerebras) ||
        (provider.name === "groq" && keys?.groq);
      if (!provider.configured && !hasUserKey) continue;
      
      const apiKey =
        provider.name === "gemini"
          ? keys?.gemini
          : provider.name === "cerebras"
            ? keys?.cerebras
            : provider.name === "groq"
              ? keys?.groq
              : undefined;

      try {
        const value = await provider.companion(context, apiKey);
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

  async *streamCompanion(context: CompanionContext, keys?: UserKeys): AsyncGenerator<string> {
    const result = await this.companion(context, keys);
    
    // Smart Multimodal Physiological Intervention Injection
    let finalValue = result.value;
    
    if (!finalValue.includes("[YT:")) {
      const YOUTUBE_LIBRARY = {
        tactical_breathwork: ["tEmt1Znux58", "aNXKjGFUlMs", "42FHK2JNDr8"], // 4-4-4-4 Box Breathing
        solfeggio_528: ["vQCPZzXbN7I", "1MPRbX7ACh8", "O-6f5wQXSu8"], // 528Hz Stress relief
        delta_entrainment: ["1ZYbU82GVz4", "pP9Xv_p-h_0", "0rNhuJgSLN0"], // 1-4Hz Deep Sleep
        somatic_regulation: ["nm1TxQj9IsQ", "ZToicYcHIOU", "v7AYKMP6rOE"], // NSDR / Guided Stillness
        executive_scaffolding: ["jfKfPfyJRdk", "hFL6qRIJZ_Y", "ZnT7Q3uyYPM"], // 75 BPM Lo-Fi / Focus
        dopamine_education: ["QmOF0crdyRU", "p3JLaF_4Tz8", "llxYXFS-jbQ"], // Huberman Dopamine / Boredom
        workout_phonk: ["QCqwA7p8Pks", "lxRwEPvL-mQ", "sEHYHRnbjyo"], // Aggressive Gym Phonk
        home_workout: ["CWrs9OgPWDo", "UPnPkBu50qQ", "NIc00QkQous"], // HIIT & General Fitness
        motivation_hardcore: ["5tSTk1083VY", "tbnzAVRZ9Xc", "ZXsQAXx_ao0"], // Goggins / Attack mentality
        mood_boosters: ["1ZYbU82GVz4", "q-Y0bnx6Nls", "ZbZSe6N_BXs"], // Uplifting vibes
        default: ["M7lc1UVf-VE", "lM02vNMRRB0", "jfKfPfyJRdk"]
      };
      
      // Combine emotion and text for a much smarter contextual match
      const emotion = context.analyses[0]?.emotion?.toLowerCase() || "";
      const text = context.message.toLowerCase();
      const combinedContext = `${emotion} ${text}`;
      
      let videoList = YOUTUBE_LIBRARY.default;
      let preamble = "";

      // Regex matching allows us to catch a wider array of synonyms cleanly
      if (combinedContext.match(/panic|hyperventilat|overwhelm|can't breathe/)) {
        videoList = YOUTUBE_LIBRARY.tactical_breathwork;
        preamble = "\n\nI detect acute overwhelm in your nervous system. Let's initiate a parasympathetic reset with tactical box breathing. Follow the visualizer below:";
      } else if (combinedContext.match(/burnout|exhaust|fatigue|drowning/)) {
        videoList = YOUTUBE_LIBRARY.somatic_regulation;
        preamble = "\n\nYou are exhibiting signs of chronic autonomic dysregulation (burnout). We need to prioritize somatic stillness right now over any cognitive exertion:";
      } else if (combinedContext.match(/insomnia|sleep|nightmare|can't sleep/)) {
        videoList = YOUTUBE_LIBRARY.delta_entrainment;
        preamble = "\n\nCognitive processing is difficult right now. Let's shift entirely to sensory masking and frequency entrainment. Use these Delta waves to help guide your brain into restorative sleep:";
      } else if (combinedContext.match(/anxi|stress|fear|worry/)) {
        videoList = YOUTUBE_LIBRARY.solfeggio_528;
        preamble = "\n\nTo help lower your circulating cortisol levels, I've queued an acoustic intervention using the 528Hz Solfeggio frequency. Let this play softly in the background:";
      } else if (combinedContext.match(/paraly|procrastinat|focus|adhd|can't work/)) {
        videoList = YOUTUBE_LIBRARY.executive_scaffolding;
        preamble = "\n\nTo break this cognitive paralysis, we need to scaffold your executive function. I've set up a structured acoustic environment to anchor your focus:";
      } else if (combinedContext.match(/bore|apathy|mindless|scrolling/)) {
        videoList = YOUTUBE_LIBRARY.dopamine_education;
        preamble = "\n\nBoredom is a vital biological signal, not a defect. Instead of a high-dopamine distraction, I encourage you to understand the neurochemistry of what you are feeling right now:";
      } else if (combinedContext.match(/gym|hype|angry|frustrat/)) {
        videoList = YOUTUBE_LIBRARY.workout_phonk;
        preamble = "\n\nUse that frustration as fuel. Let's up-regulate your sympathetic nervous system and burn off that aggressive energy:";
      } else if (combinedContext.match(/give up|quitting|weak|excuses/)) {
        videoList = YOUTUBE_LIBRARY.motivation_hardcore;
        preamble = "\n\nYour mind is seeking comfort, but growth only happens in friction. You need a cognitive reframe to shatter this behavioral inertia:";
      } else if (combinedContext.match(/workout|fitness|sedentary|lazy/)) {
        videoList = YOUTUBE_LIBRARY.home_workout;
        preamble = "\n\nPhysical stagnation drives cognitive stagnation. Let's force an immediate increase in blood flow and oxygenation to your brain with this routine:";
      } else if (combinedContext.match(/sad|depress|low|down|lost/)) {
        videoList = YOUTUBE_LIBRARY.mood_boosters;
        preamble = "\n\nI hear how heavy things feel right now. Let's introduce a gentle shift in your environment to help lift that weight just a bit:";
      }
      
      const recommendedVideo = videoList[Math.floor(Math.random() * videoList.length)];
      finalValue += `${preamble}\n\n[YT:${recommendedVideo}]`;
    }

    for (const token of finalValue.match(/\S+\s*/g) ?? []) yield token;
  }
}

export const wellnessOrchestrator = new WellnessOrchestrator();
