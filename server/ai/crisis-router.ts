import type { CrisisResponse } from "@shared/wellness";
import { logEvent } from "./logger";

const explicitPatterns = [
  /\bkill myself\b/i,
  /\bend (?:it|my life)\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bself[- ]?harm\b/i,
  /\bdon't want to (?:live|be alive)\b/i,
  /\bdo not want to (?:live|be alive)\b/i,
  /\bno reason to live\b/i,
];

const severeDistressPatterns = [
  /\b(?:goodbye|final message|won't be here)\b/i,
  /\b(?:have a plan|planned how|ready to die)\b/i,
];

export function detectCrisis(text: string): boolean {
  const matched = [...explicitPatterns, ...severeDistressPatterns].some((pattern) => pattern.test(text));
  if (matched) logEvent("CRISIS", "input_blocked_before_provider");
  return matched;
}

export function createCrisisResponse(): CrisisResponse {
  return {
    type: "CRISIS",
    message: "You are not alone. Your immediate safety matters more than this conversation. Move near another person and ask for urgent human help now.",
    helplines: [
      { name: "Local emergency services", instruction: "Call your local emergency number now if you may act on these thoughts." },
      { name: "Trusted person", instruction: "Tell someone nearby clearly: I may not be safe alone and need you to stay with me." },
      { name: "Local crisis line", instruction: "Use a verified crisis-line directory for your country or ask emergency services to connect you." },
    ],
  };
}
