import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface CoachStats {
  exercise: string;
  reps: number;
  formScore: number;
  avgFormScore: number;
  exertion: number;
  emotion: string;
  issues: string[];
  durationSec: number;
}

export interface CoachReply {
  message: string;
  source: "gemini" | "groq" | "deterministic";
}

export function useFitnessCoach() {
  const mutation = useMutation({
    mutationFn: async (stats: CoachStats): Promise<CoachReply> => {
      const res = await apiRequest("POST", "/api/fitness/coach", stats);
      return res.json();
    },
  });

  return {
    getCoaching: (stats: CoachStats) => mutation.mutateAsync(stats),
    isThinking: mutation.isPending,
    lastReply: mutation.data,
  };
}
