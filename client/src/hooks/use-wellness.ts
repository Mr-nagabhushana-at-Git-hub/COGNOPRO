import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Journal, StressTrigger } from "@shared/schema";
import type { CrisisResponse, JournalAnalysis } from "@shared/wellness";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface JournalResult {
  journal: Journal;
  triggers: StressTrigger[];
  analysis: JournalAnalysis;
  provider: string;
  fallback: boolean;
}

interface CompanionResult {
  type: "COMPANION";
  reply: string;
  crisisSupportRequired: boolean;
  source: string;
}

export interface WellnessAnalytics {
  burnoutTrend: Array<{ date: string; score: number }>;
  emotionTrend: Array<{ date: string; emotion: string; intensity: number }>;
  triggerFrequency: Array<{ label: string; frequency: number }>;
}

export function useJournals() {
  return useQuery<Journal[]>({ queryKey: ["/api/journals"] });
}

export function useStressTriggers() {
  return useQuery<StressTrigger[]>({ queryKey: ["/api/stress-triggers?days=30"] });
}

export function useCreateJournal() {
  return useMutation<JournalResult | CrisisResponse, Error, string>({
    mutationFn: async (content) => {
      const response = await apiRequest("POST", "/api/journals", { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stress-triggers?days=30"] });
    },
  });
}

export function useCompanion() {
  return useMutation<CompanionResult, Error, string>({
    mutationFn: async (message) => {
      const response = await apiRequest("POST", "/api/companion/chat", { message });
      return response.json();
    },
  });
}

export function useWellnessAnalytics() {
  return useQuery<WellnessAnalytics>({ queryKey: ["/api/wellness/analytics"] });
}

export function useStreamingCompanion() {
  const [reply, setReply] = useState("");
  const [crisis, setCrisis] = useState<CrisisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const send = useCallback(async (message: string, ignoredTriggers: string[] = []) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setReply("");
    setCrisis(null);
    setError(null);
    setIsStreaming(true);
    let pending = "";
    let frame: number | null = null;
    const flush = () => {
      frame = null;
      if (pending) {
        const chunk = pending;
        pending = "";
        setReply((current) => current + chunk);
      }
    };
    const queue = (chunk: string) => {
      pending += chunk;
      if (frame === null) frame = requestAnimationFrame(flush);
    };
    try {
      const response = await fetch("/api/companion/chat/stream", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Device-Id": localStorage.getItem("FOCUSFLOW_DEVICE_ID") || "local-user"
        },
        body: JSON.stringify({ message, ignoredTriggers }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(`Streaming unavailable (${response.status})`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const type = event.match(/^event: (.+)$/m)?.[1];
          const data = event.match(/^data: (.+)$/m)?.[1];
          if (!data) continue;
          const parsed = JSON.parse(data) as { token?: string } | CrisisResponse | { message?: string };
          if (type === "token" && "token" in parsed && parsed.token) queue(parsed.token);
          if (type === "crisis" && "type" in parsed && parsed.type === "CRISIS") setCrisis(parsed);
          if (type === "error" && "message" in parsed) setError(parsed.message ?? "The stream stopped unexpectedly.");
        }
      }
      flush();
    } catch (streamError) {
      if (controller.signal.aborted) return;
      try {
        const response = await apiRequest("POST", "/api/companion/chat", { message });
        const recovery = await response.json() as CompanionResult | CrisisResponse;
        if (recovery.type === "CRISIS") setCrisis(recovery);
        else setReply(recovery.reply);
      } catch (recoveryError) {
        setError(recoveryError instanceof Error ? recoveryError.message : String(streamError));
      }
    } finally {
      if (frame !== null) cancelAnimationFrame(frame);
      flush();
      setIsStreaming(false);
    }
  }, []);

  return { reply, crisis, error, isStreaming, send, cancel: () => controllerRef.current?.abort() };
}
