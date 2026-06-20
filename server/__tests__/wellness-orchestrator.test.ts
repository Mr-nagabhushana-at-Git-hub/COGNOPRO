import { describe, expect, it } from "vitest";
import { createCrisisResponse, detectCrisis } from "../ai/crisis-router";
import { fallbackAnalysis, fallbackCompanion } from "../ai/deterministic-fallback";
import { WellnessOrchestrator } from "../ai/orchestrator";

describe("wellness safety and failover", () => {
  it("blocks explicit crisis language before provider routing", () => {
    expect(detectCrisis("I want to kill myself")).toBe(true);
    expect(createCrisisResponse()).toMatchObject({ type: "CRISIS" });
  });

  it("returns a strict deterministic journal analysis", () => {
    expect(fallbackAnalysis("I am overwhelmed by my exam and cannot sleep")).toEqual(expect.objectContaining({
      emotion: "Anxiety",
      crisis: false,
      triggers: expect.arrayContaining(["Exams", "Sleep deprivation"]),
    }));
  });

  it("always answers when local and remote providers are unavailable", async () => {
    const previous = process.env.OLLAMA_BASE_URL;
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:1";
    const result = await new WellnessOrchestrator().companion({ message: "hi", analyses: [] });
    process.env.OLLAMA_BASE_URL = previous;
    expect(result.provider).toBe("deterministic-fallback");
    expect(result.value.length).toBeGreaterThan(20);
  });

  it("uses recent trigger context in deterministic companion guidance", () => {
    const reply = fallbackCompanion({
      message: "What can I do?",
      analyses: [{ emotion: "Anxiety", intensity: 7, burnoutRisk: 0.5, triggers: ["Exams"], crisis: false }],
    });
    expect(reply.toLowerCase()).toContain("exams");
  });
});
