import type { CompanionContext, JournalAnalysis } from "@shared/wellness";

const triggerRules: Array<[string, RegExp]> = [
  ["Exams", /\b(exam|test|mock|score|result|rank)\b/i],
  ["Sleep deprivation", /\b(sleep|insomnia|awake|tired|exhausted)\b/i],
  ["Workload", /\b(deadline|assignment|workload|too much|backlog)\b/i],
  ["Time management", /\b(no time|late|procrastinat|schedule)\b/i],
  ["Social pressure", /\b(parent|peer|compare|expectation|competition)\b/i],
  ["Isolation", /\b(alone|lonely|isolat)\b/i],
];

export function fallbackAnalysis(text: string): JournalAnalysis {
  const anxiety = text.match(/\b(anxious|anxiety|panic|worried|overwhelmed|stress(?:ed)?)\b/gi)?.length ?? 0;
  const lowMood = text.match(/\b(sad|hopeless|empty|low|crying|worthless)\b/gi)?.length ?? 0;
  const fatigue = text.match(/\b(tired|exhausted|burnout|drained|can't focus|cannot focus)\b/gi)?.length ?? 0;
  const positive = text.match(/\b(calm|happy|hopeful|proud|better|motivated)\b/gi)?.length ?? 0;
  const triggers = triggerRules.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  let emotion = "Reflective";
  if (lowMood > Math.max(anxiety, fatigue)) emotion = "Low mood";
  else if (fatigue > anxiety) emotion = "Fatigue";
  else if (anxiety > 0) emotion = "Anxiety";
  else if (positive > 0) emotion = "Positive";
  return {
    emotion,
    intensity: Math.min(10, Math.max(1, 2 + (anxiety + lowMood + fatigue) * 2 - positive)),
    burnoutRisk: Math.min(1, Number(((fatigue * 0.25) + (anxiety * 0.12)).toFixed(2))),
    triggers: triggers.length > 0 ? triggers : ["General wellbeing"],
    crisis: false,
  };
}

export function fallbackCompanion(context: CompanionContext): string {
  const frequencies = new Map<string, number>();
  context.analyses.flatMap((item) => item.triggers).forEach((trigger) => frequencies.set(trigger, (frequencies.get(trigger) ?? 0) + 1));
  const common = Array.from(frequencies.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([trigger]) => trigger.toLowerCase());
  const contextLine = common.length > 0 ? `Your recent reflections often mention ${common.join(" and ")}. ` : "";
  return `${contextLine}For the next ten minutes, reduce the problem to one safe, concrete action: drink some water, take five slow breaths, and write down the smallest task that would make today slightly easier. This is supportive guidance, not medical care.`;
}
