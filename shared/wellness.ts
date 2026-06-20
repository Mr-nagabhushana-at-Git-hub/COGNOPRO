import { z } from "zod";

export const journalAnalysisSchema = z.object({
  emotion: z.string().trim().min(1).max(80),
  intensity: z.number().int().min(1).max(10),
  burnoutRisk: z.number().min(0).max(1),
  triggers: z.array(z.string().trim().min(1).max(80)).max(12),
  crisis: z.boolean(),
}).strict();

export type JournalAnalysis = z.infer<typeof journalAnalysisSchema>;

export const crisisResponseSchema = z.object({
  type: z.literal("CRISIS"),
  message: z.string(),
  helplines: z.array(z.object({ name: z.string(), instruction: z.string() })),
});

export type CrisisResponse = z.infer<typeof crisisResponseSchema>;

export interface CompanionContext {
  message: string;
  analyses: JournalAnalysis[];
}

export interface ProviderResult<T> {
  value: T;
  provider: string;
  fallback: boolean;
}
