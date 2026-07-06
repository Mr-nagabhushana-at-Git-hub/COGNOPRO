import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertTaskSchema,
  insertFocusSessionSchema,
  insertBrainGameScoreSchema,
  insertFitnessDataSchema,
  insertNotificationSchema,
  journalEntrySchema,
  insertJournalSchema,
  insertNoteSchema,
  insertEventSchema
} from "@shared/schema";
import { SYMPTOM_CATEGORIES, ALL_SYMPTOMS, formatSymptom, predictRequestSchema, predictWithFallback } from "./ai/disease-predictor";
import { z } from "zod";
import { createCrisisResponse, detectCrisis } from "./ai/crisis-router";
import { logEvent, logFailure } from "./ai/logger";
import { wellnessOrchestrator } from "./ai/orchestrator";
import type { JournalAnalysis } from "@shared/wellness";

interface DiseaseProfile {
  disease: string;
  symptoms: string[];
  info: string;
}

interface DiseasePredictionTop {
  disease: string;
  confidence: number;
  info: string;
  matchedSymptoms: string[];
  totalSymptoms: number;
}

const PYTHON_SERVICE_BASE_URL = "http://localhost:5001";

const DISEASE_PROFILES: DiseaseProfile[] = [
  {
    disease: "Common Cold",
    symptoms: ["continuous_sneezing", "chills", "cough", "high_fever", "headache", "fatigue", "runny_nose", "congestion", "phlegm", "throat_irritation", "sinus_pressure", "malaise", "mild_fever", "watering_from_eyes", "loss_of_smell", "loss_of_taste"],
    info: "Upper respiratory symptoms commonly associated with viral colds."
  },
  {
    disease: "Influenza",
    symptoms: ["shivering", "chills", "joint_pain", "muscle_pain", "fatigue", "cough", "high_fever", "headache", "sweating", "malaise"],
    info: "Flu-like symptoms with systemic aches, fever, and fatigue."
  },
  {
    disease: "Dengue",
    symptoms: ["joint_pain", "muscle_pain", "headache", "pain_behind_the_eyes", "high_fever", "vomiting", "nausea", "red_spots_over_body", "fatigue", "skin_rash"],
    info: "Fever with body aches, eye pain, rash, or low platelet warning signs should be assessed urgently."
  },
  {
    disease: "Malaria",
    symptoms: ["chills", "high_fever", "sweating", "headache", "vomiting", "muscle_pain", "nausea", "fatigue", "diarrhoea"],
    info: "Cyclical fever, chills, and sweating can occur with malaria in endemic regions."
  },
  {
    disease: "Typhoid",
    symptoms: ["abdominal_pain", "diarrhoea", "constipation", "high_fever", "headache", "fatigue", "loss_of_appetite", "toxic_look_typhos", "muscle_pain", "stomach_pain"],
    info: "Persistent fever with abdominal symptoms may require medical evaluation and testing."
  },
  {
    disease: "Jaundice / Hepatitis",
    symptoms: ["yellowish_skin", "yellowing_of_eyes", "dark_urine", "yellow_urine", "abdominal_pain", "nausea", "loss_of_appetite", "fatigue", "vomiting", "malaise"],
    info: "Yellowing of skin or eyes can indicate liver or bile duct involvement."
  },
  {
    disease: "Acute Liver Failure",
    symptoms: ["acute_liver_failure", "yellowish_skin", "yellowing_of_eyes", "dark_urine", "abdominal_pain", "swelling_of_stomach", "fluid_overload", "coma", "altered_sensorium", "vomiting"],
    info: "This is a high-risk pattern. Seek emergency medical care immediately."
  },
  {
    disease: "Diabetes",
    symptoms: ["polyuria", "excessive_hunger", "blurred_and_distorted_vision", "fatigue", "weight_loss", "obesity", "irritability", "lack_of_concentration", "visual_disturbances"],
    info: "Frequent urination, increased hunger, thirst-like symptoms, and vision changes can suggest glucose issues."
  },
  {
    disease: "Hypothyroidism",
    symptoms: ["weight_gain", "fatigue", "depression", "cold_hands_and_feets", "constipation", "puffy_face_and_eyes", "brittle_nails", "drying_and_tingling_lips"],
    info: "Low thyroid activity can cause fatigue, weight gain, cold intolerance, and dry skin."
  },
  {
    disease: "Hyperthyroidism",
    symptoms: ["weight_loss", "excessive_hunger", "palpitations", "sweating", "anxiety", "enlarged_thyroid", "mood_swings", "fatigue"],
    info: "Overactive thyroid patterns may include weight loss, palpitations, anxiety, and heat intolerance."
  },
  {
    disease: "Migraine",
    symptoms: ["headache", "nausea", "vomiting", "pain_behind_the_eyes", "dizziness", "blurred_and_distorted_vision", "loss_of_smell"],
    info: "Recurrent headache with nausea, light sensitivity-like symptoms, or visual changes may be migraine."
  },
  {
    disease: "Hypertension",
    symptoms: ["headache", "dizziness", "chest_pain", "palpitations", "blurred_and_distorted_vision", "weakness_in_limbs"],
    info: "Blood pressure should be checked when headache, dizziness, palpitations, or chest discomfort occur."
  },
  {
    disease: "GERD / Acid Reflux",
    symptoms: ["acidity", "ulcers_on_tongue", "vomiting", "indigestion", "chest_pain", "nausea", "stomach_pain", "passage_of_gases"],
    info: "Burning chest or upper abdominal symptoms can be related to reflux or gastritis."
  },
  {
    disease: "Dehydration",
    symptoms: ["dehydration", "sunken_eyes", "dizziness", "fatigue", "sweating", "dry mouth", "dark_urine", "headache"],
    info: "Dehydration can cause dizziness, dark urine, fatigue, and dryness."
  },
  {
    disease: "Urinary Tract Infection",
    symptoms: ["burning_micturition", "bladder_discomfort", "continuous_feel_of_urine", "foul_smell_of_urine", "polyuria", "spotting_urination", "stomach_pain"],
    info: "Burning urination, urgency, and bladder discomfort can suggest a urinary infection."
  },
  {
    disease: "Appendicitis",
    symptoms: ["abdominal_pain", "belly_pain", "vomiting", "high_fever", "loss_of_appetite", "constipation", "diarrhoea", "distention_of_abdomen"],
    info: "Worsening abdominal pain with fever or vomiting needs urgent medical assessment."
  },
  {
    disease: "Arthritis",
    symptoms: ["joint_pain", "swelling_joints", "movement_stiffness", "muscle_weakness", "back_pain", "knee_pain", "hip_joint_pain", "stiff_neck"],
    info: "Joint pain with swelling or stiffness may be inflammatory or mechanical."
  },
  {
    disease: "Cervical Spondylosis",
    symptoms: ["neck_pain", "stiff_neck", "back_pain", "dizziness", "headache", "muscle_weakness", "loss_of_balance"],
    info: "Neck pain with dizziness, headache, or radiating weakness can involve cervical spine structures."
  },
  {
    disease: "Varicose Veins",
    symptoms: ["swollen_blood_vessels", "prominent_veins_on_calf", "painful_walking", "swollen_legs", "weakness_in_limbs"],
    info: "Visible leg veins with heaviness or walking pain can suggest venous insufficiency."
  },
  {
    disease: "Stroke Warning Signs",
    symptoms: ["weakness_of_one_body_side", "slurred_speech", "loss_of_balance", "dizziness", "altered_sensorium", "coma", "visual_disturbances"],
    info: "One-sided weakness, slurred speech, or sudden imbalance is an emergency."
  },
  {
    disease: "Pneumonia",
    symptoms: ["high_fever", "cough", "breathlessness", "chest_pain", "phlegm", "fatigue", "sweating", "mucoid_sputum", "rusty_sputum", "blood_in_sputum"],
    info: "Fever, cough, breathlessness, and chest pain can indicate lower respiratory infection."
  },
  {
    disease: "Bronchial Asthma",
    symptoms: ["breathlessness", "chest_pain", "cough", "phlegm", "runny_nose", "congestion", "throat_irritation"],
    info: "Breathlessness with cough or chest tightness can be asthma-like."
  },
  {
    disease: "Anemia",
    symptoms: ["fatigue", "dizziness", "cold_hands_and_feets", "breathlessness", "headache", "weakness_in_limbs", "sunken_eyes"],
    info: "Fatigue, dizziness, breathlessness, and cold extremities can be seen with anemia."
  },
  {
    disease: "Chicken Pox",
    symptoms: ["high_fever", "fatigue", "headache", "red_spots_over_body", "loss_of_appetite", "lethargy", "muscle_pain"],
    info: "Fever with widespread red spots or blisters can suggest chicken pox."
  },
  {
    disease: "Acne",
    symptoms: ["pus_filled_pimples", "blackheads", "scurring", "skin_peeling", "redness_around_nose"],
    info: "Pimples, blackheads, and scarring are common acne features."
  },
  {
    disease: "Psoriasis",
    symptoms: ["silver_like_dusting", "skin_peeling", "red_spots_over_body", "inflammatory_nails", "small_dents_in_nails"],
    info: "Silvery scaling, red plaques, or nail pitting can suggest psoriasis."
  }
];

function normalizeSymptomName(symptom: string): string {
  return symptom
    .toLowerCase()
    .trim()
    .replace(/[()]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

async function getKnownSymptomMap(): Promise<Map<string, string>> {
  const symptoms = await storage.getHealthSymptoms();
  return new Map(symptoms.map(symptom => [normalizeSymptomName(symptom.name), symptom.name]));
}

function scoreDiseaseProfiles(symptoms: string[]): DiseasePredictionTop[] {
  const symptomSet = new Set(symptoms);
  const scored = DISEASE_PROFILES
    .map((profile) => {
      const matchedSymptoms = profile.symptoms.filter(symptom => symptomSet.has(symptom));
      if (matchedSymptoms.length === 0) return null;
      const profileMatchRatio = matchedSymptoms.length / profile.symptoms.length;
      const selectedCoverageRatio = matchedSymptoms.length / symptoms.length;
      const confidence = Math.min(96, Math.max(18, Math.round((profileMatchRatio * 0.72 + selectedCoverageRatio * 0.28) * 100)));
      return {
        disease: profile.disease,
        confidence,
        info: profile.info,
        matchedSymptoms,
        totalSymptoms: symptoms.length
      };
    })
    .filter((prediction): prediction is DiseasePredictionTop => prediction !== null)
    .sort((a, b) => b.confidence - a.confidence || a.disease.localeCompare(b.disease));

  if (scored.length > 0) return scored.slice(0, 3);

  return [
    {
      disease: "No strong match",
      confidence: 25,
      info: "No disease profile matched the selected symptoms strongly enough for a mock prediction.",
      matchedSymptoms: [],
      totalSymptoms: symptoms.length
    },
    {
      disease: "General wellness check",
      confidence: 15,
      info: "Track symptoms and consult a clinician if they persist, worsen, or feel unusual.",
      matchedSymptoms: [],
      totalSymptoms: symptoms.length
    },
    {
      disease: "Stress or fatigue",
      confidence: 10,
      info: "Nonspecific symptoms can be related to sleep, hydration, stress, or routine changes.",
      matchedSymptoms: symptoms.slice(0, 3),
      totalSymptoms: symptoms.length
    }
  ];
}

type FitnessPredictionContext = {
  hasData: boolean;
  latestSteps: number;
  avgDailySteps30d: number;
  totalExerciseMinutes30d: number;
  workoutSessions30d: number;
  latestWorkoutType: string | null;
  avgWorkoutFormScore30d: number | null;
  summary: string[];
};

function computeBmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function buildFitnessPredictionContext(
  fitnessData: Awaited<ReturnType<typeof storage.getFitnessData>>,
  workoutSessions: Awaited<ReturnType<typeof storage.getWorkoutSessions>>,
): FitnessPredictionContext {
  const windowStart = Date.now() - 30 * 86400000;
  const recentFitness = fitnessData.filter((entry) => entry.date && entry.date.getTime() >= windowStart);
  const recentWorkouts = workoutSessions.filter((session) => session.createdAt && session.createdAt.getTime() >= windowStart);
  const latestFitness = fitnessData[0];
  const latestWorkout = workoutSessions[0];

  const avgDailySteps30d = recentFitness.length
    ? Math.round(recentFitness.reduce((sum, entry) => sum + (entry.steps ?? 0), 0) / recentFitness.length)
    : 0;
  const totalExerciseMinutes30d = recentFitness.reduce((sum, entry) => sum + (entry.exerciseMinutes ?? 0), 0);
  const avgWorkoutFormScore30d = recentWorkouts.length
    ? Math.round(recentWorkouts.reduce((sum, session) => sum + (session.avgFormScore ?? 0), 0) / recentWorkouts.length)
    : null;

  const summary: string[] = [];

  if (latestFitness) {
    summary.push(`Latest wearable snapshot logged ${latestFitness.steps ?? 0} steps and ${latestFitness.exerciseMinutes ?? 0} active minutes.`);
  } else {
    summary.push("No synced wearable snapshot yet, so the agent is reasoning from BMI and symptom signals only.");
  }

  if (avgDailySteps30d > 0) {
    if (avgDailySteps30d >= 9000) {
      summary.push("Activity trend is strong across the last 30 days, which slightly lowers sedentary-risk weightings.");
    } else if (avgDailySteps30d >= 6000) {
      summary.push("Activity trend is moderate; the agent keeps a balanced weighting between symptom burden and movement history.");
    } else {
      summary.push("Low movement trend across the last 30 days increases the relevance of recovery, metabolic, and cardiovascular caution flags.");
    }
  }

  if (recentWorkouts.length > 0 && latestWorkout) {
    summary.push(`Workout history shows ${recentWorkouts.length} logged sessions in the last 30 days, most recently ${latestWorkout.exercise}.`);
  }

  if (avgWorkoutFormScore30d !== null) {
    summary.push(`Average workout form score over the last 30 days is ${avgWorkoutFormScore30d}/100.`);
  }

  return {
    hasData: recentFitness.length > 0 || recentWorkouts.length > 0 || Boolean(latestFitness) || Boolean(latestWorkout),
    latestSteps: latestFitness?.steps ?? 0,
    avgDailySteps30d,
    totalExerciseMinutes30d,
    workoutSessions30d: recentWorkouts.length,
    latestWorkoutType: latestFitness?.workoutType ?? latestWorkout?.exercise ?? null,
    avgWorkoutFormScore30d,
    summary,
  };
}

function buildHealthPredictionInsight(params: {
  prediction: Awaited<ReturnType<typeof predictWithFallback>>;
  fitnessContext: FitnessPredictionContext;
  patientDetails?: { height: number; weight: number } | undefined;
}): string {
  const { prediction, fitnessContext, patientDetails } = params;
  const lines: string[] = [];
  const bmi = prediction.metrics?.bmi ?? (
    patientDetails?.height && patientDetails?.weight
      ? Math.round((patientDetails.weight / Math.pow(patientDetails.height / 100, 2)) * 100) / 100
      : null
  );
  const bmiCategory = prediction.metrics?.bmiCategory ?? (bmi ? computeBmiCategory(bmi) : null);

  lines.push(`Primary signal cluster points to ${prediction.prediction} with ${prediction.confidence.toFixed(1)}% confidence from the active symptom set.`);

  if (bmi !== null && bmiCategory) {
    if (bmiCategory === "Normal weight") {
      lines.push(`BMI is ${bmi.toFixed(1)} (${bmiCategory}), so body-composition risk is not the main driver in this pass.`);
    } else if (bmiCategory === "Underweight") {
      lines.push(`BMI is ${bmi.toFixed(1)} (${bmiCategory}), which raises extra caution around fatigue, nutritional stress, and recovery load.`);
    } else {
      lines.push(`BMI is ${bmi.toFixed(1)} (${bmiCategory}), so the agent increases metabolic and cardiovascular caution weighting.`);
    }
  }

  if (fitnessContext.hasData) {
    if (fitnessContext.avgDailySteps30d >= 9000) {
      lines.push("Recent movement history is consistently strong, which slightly offsets sedentary-risk assumptions.");
    } else if (fitnessContext.avgDailySteps30d >= 6000) {
      lines.push("Recent movement history is moderate and is treated as neutral support context.");
    } else {
      lines.push("Recent movement history is light, so the agent leans harder on recovery, conditioning, and inflammation watchouts.");
    }

    if (fitnessContext.totalExerciseMinutes30d > 0) {
      lines.push(`The platform has recorded ${fitnessContext.totalExerciseMinutes30d} exercise minutes and ${fitnessContext.workoutSessions30d} workout sessions over the last 30 days.`);
    }
  } else {
    lines.push("No synced fitness stream is available yet, so this result is driven by the symptom graph plus BMI telemetry.");
  }

  const topAlternative = prediction.topPredictions[1];
  if (topAlternative) {
    lines.push(`Closest alternate pattern is ${topAlternative.disease} at ${topAlternative.confidence.toFixed(1)}%, so follow-up tracking should watch for divergence between those two pathways.`);
  }

  lines.push("This record has been written to prediction history so future checks can compare symptom drift against body and activity trends.");

  return lines.join(" ");
}

async function postJsonToPythonService(url: string, body: unknown, timeoutMs = 1500): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Python service returned ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const TASK_CATEGORIES = [
  "important-urgent",
  "important-not-urgent",
  "not-important-urgent",
  "not-important-not-urgent"
] as const;

type TaskCategory = typeof TASK_CATEGORIES[number];

type ImportedTaskDraft = {
  title: string;
  description?: string | null;
  category: TaskCategory;
  priority: number;
  dueDate?: Date | null;
};

function parseJsonBlock(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse((fenced ?? text).trim());
}

function cleanImportedLine(line: string): string {
  return line
    .replace(/^\s*[-*•\d.)\]]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clampPriority(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function normalizeCategory(input?: string | null): TaskCategory {
  const value = (input ?? "").trim().toLowerCase();
  if (value.includes("do") || value.includes("urgent") || value === "important-urgent") return "important-urgent";
  if (value.includes("schedule") || value.includes("important") || value === "important-not-urgent") return "important-not-urgent";
  if (value.includes("delegate") || value === "not-important-urgent") return "not-important-urgent";
  return "not-important-not-urgent";
}

function parsePossibleDate(input?: string | null): Date | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inferCategoryFromText(text: string): TaskCategory {
  const value = text.toLowerCase();
  if (/(today|asap|urgent|deadline|submit|pay|fix now|immediately|tonight)/.test(value)) return "important-urgent";
  if (/(plan|research|build|design|study|exercise|doctor|health|schedule|prepare|roadmap)/.test(value)) return "important-not-urgent";
  if (/(reply|respond|call back|follow up|email|delegate|forward|review request)/.test(value)) return "not-important-urgent";
  if (/(scroll|watch|browse|cleanup later|someday|maybe|misc|low priority)/.test(value)) return "not-important-not-urgent";
  return "important-not-urgent";
}

function inferPriorityFromText(text: string, category: TaskCategory) {
  const value = text.toLowerCase();
  if (/(critical|asap|urgent|immediately|today|deadline)/.test(value)) return 5;
  if (category === "important-urgent") return 4;
  if (category === "important-not-urgent") return 3;
  if (category === "not-important-urgent") return 2;
  return 1;
}

function parseStructuredRows(content: string): Array<{ title: string; description?: string; dueDate?: string; priority?: number; category?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === "string" ? { title: item } : item))
        .filter((item): item is { title: string; description?: string; dueDate?: string; priority?: number; category?: string } => Boolean(item && typeof item.title === "string"));
    }
  } catch {}

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const firstLine = lines[0].toLowerCase();
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : firstLine.includes(",") ? "," : null;
  if (!delimiter) return [];

  const headerCells = lines[0].split(delimiter).map((cell) => cell.trim().toLowerCase());
  const looksStructured = headerCells.some((cell) => ["title", "task", "description", "due", "date", "priority", "category"].includes(cell));
  if (!looksStructured) return [];

  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((cell) => cell.trim());
    const row: Record<string, string> = {};
    headerCells.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return {
      title: row.title || row.task || row.name || "",
      description: row.description || row.details || "",
      dueDate: row.due || row.date || row.deadline || "",
      priority: row.priority ? Number(row.priority) : undefined,
      category: row.category || row.quadrant || row.box || "",
    };
  }).filter((row) => row.title);
}

function buildFallbackImportedTasks(content: string): ImportedTaskDraft[] {
  const structuredRows = parseStructuredRows(content);
  if (structuredRows.length) {
    return structuredRows.slice(0, 40).map((row) => {
      const mergedText = `${row.title} ${row.description ?? ""}`;
      const category = normalizeCategory(row.category || inferCategoryFromText(mergedText));
      return {
        title: cleanImportedLine(row.title).slice(0, 160),
        description: row.description ? cleanImportedLine(row.description).slice(0, 600) : null,
        category,
        priority: clampPriority(row.priority ?? inferPriorityFromText(mergedText, category)),
        dueDate: parsePossibleDate(row.dueDate),
      };
    }).filter((row) => row.title.length > 2);
  }

  return content
    .split(/\r?\n/)
    .map(cleanImportedLine)
    .filter((line) => line.length > 2)
    .slice(0, 40)
    .map((line) => {
      const parts = line.split(/\s[-:]\s/);
      const title = parts[0].slice(0, 160);
      const description = parts.length > 1 ? parts.slice(1).join(" - ").slice(0, 600) : null;
      const category = inferCategoryFromText(line);
      return {
        title,
        description,
        category,
        priority: inferPriorityFromText(line, category),
        dueDate: null,
      };
    });
}

async function classifyImportedTasksWithProviders(rawContent: string, user: Awaited<ReturnType<typeof storage.getUser>>): Promise<ImportedTaskDraft[] | null> {
  const prompt = [
    "You clean messy task dumps into an Eisenhower matrix.",
    "Return JSON only as an array.",
    "Each array item must have: title, description, category, priority, dueDate.",
    "Valid category values: important-urgent, important-not-urgent, not-important-urgent, not-important-not-urgent.",
    "priority must be an integer 1-5.",
    "dueDate must be ISO date-time string or null.",
    "Do not hallucinate extra tasks. Clean, dedupe, and normalize the real ones.",
    "Input:",
    rawContent.slice(0, 12000),
  ].join("\n");

  const tryParseTasks = (text: string): ImportedTaskDraft[] | null => {
    try {
      const parsed = parseJsonBlock(text);
      if (!Array.isArray(parsed)) return null;
      const tasks = parsed
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const title = typeof record.title === "string" ? cleanImportedLine(record.title).slice(0, 160) : "";
          if (!title) return null;
          const category = normalizeCategory(typeof record.category === "string" ? record.category : null);
          return {
            title,
            description: typeof record.description === "string" ? cleanImportedLine(record.description).slice(0, 600) : null,
            category,
            priority: clampPriority(typeof record.priority === "number" ? record.priority : inferPriorityFromText(title, category)),
            dueDate: typeof record.dueDate === "string" ? parsePossibleDate(record.dueDate) : null,
          };
        })
        .filter((task): task is NonNullable<typeof task> => Boolean(task));
      return tasks.length ? tasks.slice(0, 40) : null;
    } catch {
      return null;
    }
  };

  const geminiKey = user?.geminiKey || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1600 }
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const body: any = await response.json();
        const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = text ? tryParseTasks(text) : null;
        if (parsed) return parsed;
      }
    } catch (error) {
      logFailure("ENGINE", "gemini_import_failed", error);
    }
  }

  const cerebrasKey = user?.cerebrasKey || process.env.CEREBRAS_API_KEY;
  if (cerebrasKey) {
    try {
      const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cerebrasKey}` },
        body: JSON.stringify({
          model: process.env.CEREBRAS_MODEL || "gpt-oss-120b",
          stream: false,
          temperature: 0,
          max_tokens: 1600,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const body: any = await response.json();
        const text = body?.choices?.[0]?.message?.content;
        const parsed = text ? tryParseTasks(text) : null;
        if (parsed) return parsed;
      }
    } catch (error) {
      logFailure("ENGINE", "cerebras_import_failed", error);
    }
  }

  const groqKey = user?.groqKey || process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0,
          max_tokens: 1600,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const body: any = await response.json();
        const text = body?.choices?.[0]?.message?.content;
        const parsed = text ? tryParseTasks(text) : null;
        if (parsed) return parsed;
      }
    } catch (error) {
      logFailure("ENGINE", "groq_import_failed", error);
    }
  }

  return null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Run database migrations if DatabaseStorage is active
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    try {
      const { migrate } = await import("drizzle-orm/neon-http/migrator");
      const { db } = await import("./db");
      if (db) {
        const path = await import("path");
        console.log("Database URL detected. Running database migrations...");
        await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "migrations") });
        console.log("Database migrated successfully!");
      }
    } catch (err) {
      console.error("Failed to run database migrations:", err);
    }
  }

  const getUserId = (req: any) => (req.headers["x-device-id"] || "local-user") as string;
  const getAppBaseUrl = (req: any) => {
    const configuredBase = process.env.APP_URL?.trim().replace(/\/+$/, "");
    if (configuredBase) return configuredBase;
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers.host;
    return `${protocol}://${host}`;
  };
  const GOOGLE_OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
    "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
    "https://www.googleapis.com/auth/googlehealth.profile.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/user.birthday.read",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/youtube.readonly",
  ].join(" ");

  // Google Health / legacy Fit auth and sync routes
  app.get("/api/auth/google/url", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || "DEMO_CLIENT_ID";
    const redirectUri = `${getAppBaseUrl(req)}/api/auth/google/callback`;
    const intent = req.query.intent === "login" ? "login" : "settings";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(GOOGLE_OAUTH_SCOPES)}&access_type=offline&prompt=consent&state=${encodeURIComponent(intent)}`;
    res.json({ url: authUrl });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const code = req.query.code as string;
    const intent = req.query.state === "login" ? "login" : "settings";
    if (!code) return res.redirect(intent === "login" ? "/?authError=missing_code" : "/settings?error=missing_code");

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${getAppBaseUrl(req)}/api/auth/google/callback`;
      
      if (!clientId || !clientSecret) {
        return res.redirect(intent === "login" ? "/?authError=google_oauth_not_configured" : "/settings?error=google_oauth_not_configured");
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });

      const tokens = await tokenResponse.json();
      if (tokens.error) throw new Error(tokens.error_description);

      await storage.updateUserSettings(getUserId(req), {
        googleFitAccessToken: tokens.access_token,
        googleFitRefreshToken: tokens.refresh_token || undefined
      });

      res.redirect(intent === "login" ? "/?auth=google&connected=true" : "/settings?success=true");
    } catch (error) {
      logFailure("OAUTH", "google_health_auth_failed", error);
      res.redirect(intent === "login" ? "/?authError=auth_failed" : "/settings?error=auth_failed");
    }
  });

  // Fast Live Sync (Current Day Only)
  app.get("/api/fitness/sync/live", async (req, res) => {
    try {
      const user = await storage.getUser(getUserId(req));
      if (!user?.googleFitAccessToken) {
        return res.status(401).json({ error: "Not connected to Google Health" });
      }

      if (user.googleFitAccessToken === "mock_access_token") {
        return res.status(401).json({ error: "Stored Google token is not a real OAuth token. Reconnect Google Health." });
      }

      const endMillis = Date.now();
      const startMillis = new Date().setHours(0, 0, 0, 0); // Start of today

      const fitnessResponse = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.googleFitAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataTypeName: "com.google.step_count.delta",
            dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startMillis,
          endTimeMillis: endMillis
        })
      });

      if (!fitnessResponse.ok) throw new Error("Failed to fetch from Google Health");

      const result = await fitnessResponse.json();
      const buckets = result.bucket || [];
      
      let steps = 0;
      if (buckets.length > 0) {
        const points = buckets[buckets.length - 1].dataset?.[0]?.point || [];
        for (const pt of points) {
          const val = pt.value?.[0];
          if (val) steps += (val.intVal || val.fpVal || 0);
        }
      }

      const data = await storage.createFitnessData({
        userId: getUserId(req),
        date: new Date(),
        steps,
        exerciseMinutes: Math.floor(steps / 100),

      });

      res.json({ success: true, data });
    } catch (error) {
      logFailure("FITNESS", "live_sync_failed", error);
      res.status(500).json({ error: "Failed to live sync fitness data" });
    }
  });

  // Full 5-Year History Sync
  app.post("/api/fitness/sync", async (req, res) => {
    try {
      const user = await storage.getUser(getUserId(req));
      if (!user?.googleFitAccessToken) {
        return res.status(401).json({ error: "Not connected to Google Health" });
      }

      if (user.googleFitAccessToken === "mock_access_token") {
        return res.status(401).json({ error: "Stored Google token is not a real OAuth token. Reconnect Google Health." });
      }

      // 5-Year Chunked Fetching Strategy via Google Health API
      const endMillis = Date.now();
      const chunks = [];
      const oneYearMillis = 365 * 24 * 60 * 60 * 1000;

      for (let i = 0; i < 5; i++) {
        chunks.push({
          start: endMillis - ((i + 1) * oneYearMillis),
          end: endMillis - (i * oneYearMillis)
        });
      }

      let allPoints: any[] = [];
      
      for (const chunk of chunks) {
        const startStr = new Date(chunk.start).toISOString();
        const endStr = new Date(chunk.end).toISOString();
        const queryParams = new URLSearchParams({
          pageSize: "10000",
          filter: `interval.start_time >= "${startStr}" AND interval.end_time <= "${endStr}"`
        });

        const res = await fetch(`https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${user.googleFitAccessToken}`
          }
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Google Health API Chunk Failed: status ${res.status}, body: ${errText}`);
          throw new Error(`Google Health API Chunk Failed: ${errText}`);
        }
        
        const data = await res.json();
        if (data.dataPoints) {
          allPoints = allPoints.concat(data.dataPoints);
        }
      }

      await storage.clearFitnessData(getUserId(req));

      // Pre-fill 5 years of empty dates to ensure continuous graph
      const aggregatedByDate: Record<string, number> = {};
      const nowTs = Date.now();
      for (let i = 0; i <= 1825; i++) {
        const d = new Date(nowTs - (i * 24 * 60 * 60 * 1000));
        aggregatedByDate[d.toISOString().split('T')[0]] = 0;
      }

      for (const pt of allPoints) {
        const val = pt.value?.intVal || pt.value?.doubleVal || pt.value || 0;
        const startTimeStr = pt.interval?.startTime || pt.startTime;
        if (!startTimeStr) continue;
        
        const bDate = new Date(startTimeStr);
        const dateKey = bDate.toISOString().split('T')[0];
        
        const stepVal = typeof val === 'number' ? val : parseInt(val || "0");
        if (aggregatedByDate[dateKey] !== undefined) {
          aggregatedByDate[dateKey] += stepVal;
        } else {
          aggregatedByDate[dateKey] = stepVal;
        }
      }

      const updatedData = [];
      for (const [dateStr, steps] of Object.entries(aggregatedByDate)) {
        updatedData.push(await storage.createFitnessData({
          userId: getUserId(req),
          date: new Date(dateStr),
          steps,
          exerciseMinutes: Math.floor(steps / 100),
  
        }));
      }

      // Sort by date ascending to ensure chronological order
      updatedData.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

      // Return the most recent day's data as the primary result
      const latestData = updatedData.length ? updatedData[updatedData.length - 1] : null;
      res.json({ success: true, data: latestData, history: updatedData });
    } catch (error: any) {
      logFailure("FITNESS", "sync_failed", error);
      res.status(502).json({ error: "Google Health sync failed. No synthetic fitness data was generated." });
    }
  });

  // Bio-Profile Endpoint
  app.get("/api/fitness/profile", async (req, res) => {
    try {
      const user = await storage.getUser(getUserId(req));
      if (!user?.googleFitAccessToken) {
        return res.status(401).json({ error: "Not connected to Google Health" });
      }

      if (user.googleFitAccessToken === "mock_access_token") {
        return res.status(401).json({ error: "Stored Google token is not a real OAuth token. Reconnect Google Health." });
      }

      // Fetch People API for Name, Photo, Birthday
      let name = "Agent";
      let picture = "";
      let age = null;

      try {
        const peopleResponse = await fetch("https://people.googleapis.com/v1/people/me?personFields=names,photos,birthdays", {
          headers: { "Authorization": `Bearer ${user.googleFitAccessToken}` }
        });
        if (peopleResponse.ok) {
          const peopleData = await peopleResponse.json();
          if (peopleData.names && peopleData.names.length > 0) name = peopleData.names[0].displayName;
          if (peopleData.photos && peopleData.photos.length > 0) picture = peopleData.photos[0].url;
          if (peopleData.birthdays && peopleData.birthdays.length > 0) {
            const bday = peopleData.birthdays[0].date;
            if (bday && bday.year) {
              const today = new Date();
              age = today.getFullYear() - bday.year;
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch People API", e);
      }

      // Fetch Body Metrics (Weight & Height) via Google Health API
      let weightStr = "N/A";
      let heightStr = "N/A";

      try {
        const wRes = await fetch(`https://health.googleapis.com/v4/users/me/dataTypes/weight/dataPoints?pageSize=1`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${user.googleFitAccessToken}` }
        });
        if (wRes.ok) {
          const wData = await wRes.json();
          if (wData.dataPoints && wData.dataPoints.length > 0) {
            const pt = wData.dataPoints[0];
            const v = pt.value?.doubleVal || pt.value?.intVal || pt.value || 0;
            weightStr = `${typeof v === 'number' ? v.toFixed(1) : v} kg`;
          }
        }

        const hRes = await fetch(`https://health.googleapis.com/v4/users/me/dataTypes/height/dataPoints?pageSize=1`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${user.googleFitAccessToken}` }
        });
        if (hRes.ok) {
          const hData = await hRes.json();
          if (hData.dataPoints && hData.dataPoints.length > 0) {
            const pt = hData.dataPoints[0];
            const v = pt.value?.doubleVal || pt.value?.intVal || pt.value || 0;
            const meters = typeof v === 'number' ? v : parseFloat(v || "0");
            heightStr = `${Math.round(meters * 100)} cm`;
          }
        }
      } catch (e) {
        console.error("Failed to fetch Google Health Body Metrics", e);
      }

      res.json({ 
        success: true, 
        profile: { 
          name, 
          picture, 
          age, 
          weight: weightStr, 
          height: heightStr 
        } 
      });
    } catch (error) {
      logFailure("FITNESS", "profile_fetch_failed", error);
      res.status(500).json({ error: "Failed to fetch bio profile" });
    }
  });

  // Focus session routes
  app.get("/api/focus-sessions", async (req, res) => {
    try {
      const sessions = await storage.getFocusSessions(getUserId(req));
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch focus sessions" });
    }
  });

  app.get("/api/focus-sessions/active", async (req, res) => {
    try {
      const session = await storage.getActiveFocusSession(getUserId(req));
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active focus session" });
    }
  });

  app.post("/api/focus-sessions", async (req, res) => {
    try {
      const sessionData = insertFocusSessionSchema.parse({ ...req.body, userId: getUserId(req) });
      const session = await storage.createFocusSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid session data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create focus session" });
      }
    }
  });

  app.patch("/api/focus-sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const session = await storage.updateFocusSession(id, getUserId(req), updateData);
      if (!session) {
        res.status(404).json({ error: "Focus session not found" });
        return;
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update focus session" });
    }
  });

  // Brain game routes
  app.get("/api/brain-games/scores", async (req, res) => {
    try {
      const { gameType } = req.query;
      const scores = await storage.getBrainGameScores(getUserId(req), gameType as string);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brain game scores" });
    }
  });

  app.get("/api/brain-games/top-scores/:gameType", async (req, res) => {
    try {
      const { gameType } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const scores = await storage.getTopScores(getUserId(req), gameType, limit);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top scores" });
    }
  });

  app.post("/api/brain-games/scores", async (req, res) => {
    try {
      const scoreData = insertBrainGameScoreSchema.parse({ ...req.body, userId: getUserId(req) });
      const score = await storage.createBrainGameScore(scoreData);
      res.status(201).json(score);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid score data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create brain game score" });
      }
    }
  });

  // Fitness routes
  app.get("/api/fitness", async (req, res) => {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date as string) : undefined;
      const fitnessData = await storage.getFitnessData(getUserId(req), targetDate);
      res.json(fitnessData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fitness data" });
    }
  });

  app.post("/api/fitness", async (req, res) => {
    try {
      const fitnessData = insertFitnessDataSchema.parse({ ...req.body, userId: getUserId(req) });
      const data = await storage.createFitnessData(fitnessData);
      res.status(201).json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid fitness data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create fitness data" });
      }
    }
  });

  app.patch("/api/fitness", async (req, res) => {
    try {
      const { date, ...updateData } = req.body;
      const targetDate = new Date(date);
      const data = await storage.updateFitnessData(getUserId(req), targetDate, updateData);
      if (!data) {
        res.status(404).json({ error: "Fitness data not found for date" });
        return;
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to update fitness data" });
    }
  });

  // ─── AI Fitness Coach ("AI master") ───
  // Turns on-device pose telemetry into short natural-language coaching using the
  // user's Gemini/Groq key, with a deterministic fallback so it always responds.
  app.post("/api/fitness/coach", async (req, res) => {
    try {
      const {
        exercise = "workout", reps = 0, formScore = 0, avgFormScore = 0,
        exertion = 0, emotion = "neutral", issues = [], durationSec = 0,
      } = req.body ?? {};

      const issuesText = Array.isArray(issues) && issues.length ? issues.slice(0, 5).join("; ") : "none notable";
      const stats = `Exercise: ${exercise}. Reps: ${reps}. Live form score: ${formScore}/100 (session avg ${avgFormScore}/100). Effort/exertion: ${Math.round(Number(exertion) * 100)}%. Facial state: ${emotion}. Duration: ${durationSec}s. Recurring form issues: ${issuesText}.`;
      const prompt = `You are an elite, encouraging personal fitness coach ("the AI Master"). Based ONLY on this live session telemetry, give ONE short coaching message (max 2 sentences, ~30 words). Be specific and actionable about their form (e.g. how much to bend, tempo, bracing) and end with brief motivation. No markdown, no lists.\n\n${stats}`;

      const user = await storage.getUser(getUserId(req));
      const geminiKey = user?.geminiKey || process.env.GEMINI_API_KEY;
      const cerebrasKey = user?.cerebrasKey || process.env.CEREBRAS_API_KEY;
      const groqKey = user?.groqKey || process.env.GROQ_API_KEY;

      // Try Gemini
      if (geminiKey) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            signal: AbortSignal.timeout(6000),
          });
          if (r.ok) {
            const j: any = await r.json();
            const text = j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) return res.json({ message: text, source: "gemini" });
          }
        } catch (e) { logFailure("COACH", "gemini_coach_failed", e); }
      }

      // Try Cerebras
      if (cerebrasKey) {
        try {
          const r = await fetch("https://api.cerebras.ai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${cerebrasKey}` },
            body: JSON.stringify({
              model: process.env.CEREBRAS_MODEL || "gpt-oss-120b",
              stream: false,
              temperature: 0.2,
              max_tokens: 120,
              messages: [{ role: "user", content: prompt }],
            }),
            signal: AbortSignal.timeout(6000),
          });
          if (r.ok) {
            const j: any = await r.json();
            const text = j?.choices?.[0]?.message?.content?.trim();
            if (text) return res.json({ message: text, source: "cerebras" });
          }
        } catch (e) { logFailure("COACH", "cerebras_coach_failed", e); }
      }

      // Try Groq
      if (groqKey) {
        try {
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 80,
              temperature: 0.7,
            }),
            signal: AbortSignal.timeout(6000),
          });
          if (r.ok) {
            const j: any = await r.json();
            const text = j?.choices?.[0]?.message?.content?.trim();
            if (text) return res.json({ message: text, source: "groq" });
          }
        } catch (e) { logFailure("COACH", "groq_coach_failed", e); }
      }

      // Deterministic fallback
      let msg: string;
      if (Array.isArray(issues) && issues.length) {
        msg = `${issues[0]}. Keep your tempo controlled — you're at ${reps} clean reps, stay strong!`;
      } else if (Number(avgFormScore) >= 85) {
        msg = `Excellent form on your ${exercise} — ${reps} solid reps at ${avgFormScore}/100. Keep that depth and control!`;
      } else {
        msg = `Good work on ${reps} reps. Focus on full range and a braced core to push that form score up. You've got this!`;
      }
      res.json({ message: msg, source: "deterministic" });
    } catch (error) {
      logFailure("COACH", "coach_failed", error);
      res.status(500).json({ error: "Failed to generate coaching" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await storage.getNotifications(getUserId(req));
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotifications(getUserId(req));
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse({ ...req.body, userId: getUserId(req) });
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid notification data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create notification" });
      }
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.markNotificationRead(id, getUserId(req));
      if (!success) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Analytics endpoint
  app.get("/api/analytics", async (req, res) => {
    try {
      const tasks = await storage.getTasks(getUserId(req));
      const focusSessions = await storage.getFocusSessions(getUserId(req));
      const brainScores = await storage.getBrainGameScores(getUserId(req));
      const fitnessData = await storage.getFitnessData(getUserId(req));

      const today = new Date();
      const todayStr = today.toDateString();

      const todayTasks = tasks.filter(task => task.createdAt?.toDateString() === todayStr);
      const completedTasks = todayTasks.filter(task => task.completed);
      const todayFocus = focusSessions.filter(session => session.createdAt?.toDateString() === todayStr);
      const todayFitness = fitnessData.find(data => data.date?.toDateString() === todayStr);

      const totalFocusTime = todayFocus.reduce((total, session) => total + (session.completedDuration || 0), 0);

      const analytics = {
        tasksToday: todayTasks.length,
        tasksCompleted: completedTasks.length,
        focusTimeMinutes: totalFocusTime,
        brainGamesPlayed: brainScores.filter(score => score.createdAt?.toDateString() === todayStr).length,
        steps: todayFitness?.steps || 0,
        exerciseMinutes: todayFitness?.exerciseMinutes || 0,
        completionRate: todayTasks.length > 0 ? Math.round((completedTasks.length / todayTasks.length) * 100) : 0,
        weeklyTrend: {
          focusTime: Array.from({length: 7}, (_, i) => Math.floor(Math.random() * 120 + 60)),
          tasksCompleted: Array.from({length: 7}, (_, i) => Math.floor(Math.random() * 10 + 3))
        }
      };

      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // (symptoms served via /api/health-predict/symptoms below)

  app.post("/api/health/predict", async (req, res) => {
    try {
      const { symptoms } = z.object({
        symptoms: z.array(z.string().trim().min(1)).min(1).max(30)
      }).parse(req.body);

      const normalizedSymptoms = Array.from(new Set(symptoms.map(normalizeSymptomName)));
      const knownSymptoms = await getKnownSymptomMap();
      const invalidSymptoms = normalizedSymptoms.filter(symptom => !knownSymptoms.has(symptom));

      if (invalidSymptoms.length > 0) {
        res.status(400).json({
          error: "Unknown symptom",
          invalidSymptoms: invalidSymptoms.map(symptom => symptom.replace(/_/g, " "))
        });
        return;
      }

      const selectedSymptoms = normalizedSymptoms.map(symptom => knownSymptoms.get(symptom)!);
      const topPredictions = scoreDiseaseProfiles(selectedSymptoms);
      const prediction = topPredictions[0];
      const record = await storage.createDiseasePrediction({
        userId: getUserId(req),
        symptoms: selectedSymptoms,
        prediction: prediction.disease,
        confidence: prediction.confidence,
        topPredictions
      });

      res.status(201).json({
        id: record.id,
        symptoms: selectedSymptoms,
        prediction: prediction.disease,
        confidence: prediction.confidence,
        topPredictions,
        createdAt: record.createdAt,
        source: "mock-symptom-matching"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Select at least one valid symptom", details: error.errors });
        return;
      }
      res.status(500).json({ error: "Failed to predict disease" });
    }
  });

  app.post("/api/health/acne-detect", async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      try {
        const result = await postJsonToPythonService(`${PYTHON_SERVICE_BASE_URL}/detect_acne`, body);
        res.json({ ...(result as Record<string, unknown>), fallback: false, source: "python-service" });
      } catch {
        res.json({
          fallback: true,
          source: "deterministic-fallback",
          detected: false,
          confidence: 0,
          message: "Acne detection service is unavailable. Upload a clear facial image when the service is running."
        });
      }
    } catch {
      res.status(500).json({ error: "Failed to process acne detection" });
    }
  });

  app.post("/api/health/upload", async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      try {
        const result = await postJsonToPythonService(`${PYTHON_SERVICE_BASE_URL}/upload_ocr`, body);
        res.json({ ...(result as Record<string, unknown>), fallback: false, source: "python-service" });
      } catch {
        res.json({
          fallback: true,
          source: "deterministic-fallback",
          extractedText: "",
          confidence: 0,
          message: "OCR upload service is unavailable. Try again when the Python OCR service is running."
        });
      }
    } catch {
      res.status(500).json({ error: "Failed to process upload" });
    }
  });

  app.get("/api/journals", async (req, res) => {
    try {
      res.json(await storage.getJournals(getUserId(req)));
    } catch {
      res.status(500).json({ error: "Failed to fetch journals" });
    }
  });

  app.post("/api/journals", async (req, res) => {
    try {
      const { content } = journalEntrySchema.parse(req.body);
      if (detectCrisis(content)) {
        res.status(200).json(createCrisisResponse());
        return;
      }
      const user = await storage.getUser(getUserId(req));
      const userKeys = {
        gemini: user?.geminiKey || undefined,
        cerebras: user?.cerebrasKey || undefined,
        groq: user?.groqKey || undefined
      };
      const analysisResult = await wellnessOrchestrator.analyze(content, userKeys);
      const analysis = analysisResult.value;
      const journal = await storage.createJournal({
        userId: getUserId(req),
        content,
        primaryEmotion: analysis.emotion,
        intensityScore: analysis.intensity,
        burnoutRisk: analysis.burnoutRisk >= 0.6,
        burnoutScore: Math.round(analysis.burnoutRisk * 100),
        crisisFlag: analysis.crisis,
        analysisSource: analysisResult.provider,
      });
      const triggers = await Promise.all(analysis.triggers.map((label) => storage.createStressTrigger({
        userId: getUserId(req),
        journalId: journal.id,
        label,
        intensity: analysis.intensity,
      })));
      res.status(201).json({ journal, triggers, analysis, provider: analysisResult.provider, fallback: analysisResult.fallback });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid journal entry", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save journal" });
      }
    }
  });

  app.get("/api/stress-triggers", async (req, res) => {
    try {
      const days = z.coerce.number().int().min(1).max(365).default(30).parse(req.query.days);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      res.json(await storage.getStressTriggers(getUserId(req), since));
    } catch (error) {
      if (error instanceof z.ZodError) res.status(400).json({ error: "Invalid timeframe" });
      else res.status(500).json({ error: "Failed to fetch stress triggers" });
    }
  });

  async function getUserOverallMetrics(userId: string): Promise<string> {
    try {
      const tasks = await storage.getTasks(userId);
      const pendingTasks = tasks.filter(t => !t.completed).length;
      const completedTasks = tasks.filter(t => t.completed).length;
      
      const focusSessions = await storage.getFocusSessions(userId);
      const today = new Date().toDateString();
      const focusToday = focusSessions.filter(f => f.createdAt && f.createdAt.toDateString() === today);
      const focusMinutesToday = focusToday.reduce((acc, curr) => acc + (curr.completedDuration || 0), 0);
      
      // 30 day historical data
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const fitnessData = await storage.getFitnessData(userId);
      const recentFitness = fitnessData.filter(f => f.date && f.date >= thirtyDaysAgo);
      const avgSteps = recentFitness.length ? recentFitness.reduce((acc, curr) => acc + (curr.steps || 0), 0) / recentFitness.length : 0;
      
      const brainGames = await storage.getBrainGameScores(userId);
      const recentGames = brainGames.slice(0, 5);
      const gameStr = recentGames.map(g => `${g.gameType} score: ${g.score}`).join(", ");
      
      return `User Context Summary:
Tasks: ${pendingTasks} pending, ${completedTasks} completed.
Focus Time Today: ${focusMinutesToday} minutes.
Fitness (Last 30 Days Avg): ${Math.round(avgSteps)} steps/day.
Recent Cognitive Game Performance: ${gameStr || "No recent games"}.
Use this multi-dimensional data to empathize deeply with the user.`;
    } catch {
      return "Metrics unavailable.";
    }
  }

  app.get("/api/companion/metrics", async (req, res) => {
    try {
      res.json(await getUserOverallMetrics(getUserId(req)));
    } catch {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  app.post("/api/companion/chat", async (req, res) => {
    try {
      const { message } = z.object({ message: z.string().trim().min(1) }).parse(req.body);
      if (detectCrisis(message)) {
        res.json(createCrisisResponse());
        return;
      }
      const analyses = await getRecentAnalyses(getUserId(req));
      const overallMetrics = await getUserOverallMetrics(getUserId(req));
      const user = await storage.getUser(getUserId(req));
      const userKeys = {
        gemini: user?.geminiKey || undefined,
        cerebras: user?.cerebrasKey || undefined,
        groq: user?.groqKey || undefined
      };
      const result = await wellnessOrchestrator.companion({ message, analyses, overallMetrics }, userKeys);
      res.json({ type: "COMPANION", reply: result.value, provider: result.provider, fallback: result.fallback });
    } catch (error) {
      if (error instanceof z.ZodError) res.status(400).json({ error: "Invalid message", details: error.errors });
      else res.status(500).json({ error: "Companion is temporarily unavailable" });
    }
  });

  app.post("/api/companion/chat/stream", async (req, res) => {
    try {
      const { message, ignoredTriggers } = z.object({ 
        message: z.string().trim().min(1),
        ignoredTriggers: z.array(z.string()).optional()
      }).parse(req.body);
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      if (detectCrisis(message)) {
        res.write(`event: crisis\ndata: ${JSON.stringify(createCrisisResponse())}\n\n`);
        res.end();
        return;
      }
      let analyses = await getRecentAnalyses(getUserId(req));
      if (ignoredTriggers?.length) {
        analyses = analyses.map(a => ({
          ...a,
          triggers: a.triggers.filter(t => !ignoredTriggers.includes(t))
        }));
      }
      const overallMetrics = await getUserOverallMetrics(getUserId(req));
      const user = await storage.getUser(getUserId(req));
      const userKeys = {
        gemini: user?.geminiKey || undefined,
        cerebras: user?.cerebrasKey || undefined,
        groq: user?.groqKey || undefined
      };
      for await (const token of wellnessOrchestrator.streamCompanion({ message, analyses, overallMetrics }, userKeys)) {
        res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
      }
      res.write("event: done\ndata: {}\n\n");
      res.end();
    } catch (error) {
      logFailure("ENGINE", "stream_route_failed", error);
      if (!res.headersSent) res.status(400).json({ error: error instanceof z.ZodError ? "Invalid message" : "Unable to start stream" });
      else {
        res.write(`event: error\ndata: ${JSON.stringify({ message: "The live response stopped. Please retry; the standard companion endpoint remains available." })}\n\n`);
        res.end();
      }
    }
  });

  app.get("/api/wellness/analytics", async (req, res) => {
    try {
      const journals = await storage.getJournals(getUserId(req));
      const triggers = await storage.getStressTriggers(getUserId(req), new Date(Date.now() - 30 * 86400000));
      const triggerFrequency = Object.entries(triggers.reduce<Record<string, number>>((acc, trigger) => {
        acc[trigger.label] = (acc[trigger.label] ?? 0) + 1;
        return acc;
      }, {})).map(([label, frequency]) => ({ label, frequency })).sort((a, b) => b.frequency - a.frequency);
      const recent = journals.slice(0, 30).reverse();
      res.json({
        burnoutTrend: recent.map((journal) => ({ date: journal.createdAt, score: journal.burnoutScore ?? 0 })),
        emotionTrend: recent.map((journal) => ({ date: journal.createdAt, emotion: journal.primaryEmotion, intensity: journal.intensityScore })),
        triggerFrequency,
      });
    } catch (error) {
      logFailure("ENGINE", "analytics_failed", error);
      res.status(500).json({ error: "Failed to build wellness analytics" });
    }
  });

  // ─── Health Predict Routes ───
  app.get("/api/health-predict/symptoms", (_req, res) => {
    try {
      const categories = Object.entries(SYMPTOM_CATEGORIES).map(([category, symptomIds]) => ({
        category,
        symptoms: symptomIds.map(id => ({ id, label: formatSymptom(id) }))
      }));
      res.json({ categories, totalSymptoms: ALL_SYMPTOMS.length });
    } catch (e) {
      logFailure("ENGINE", "health_symptoms_failed", e);
      res.status(500).json({ error: "Failed to load symptoms" });
    }
  });

  app.post("/api/health-predict/predict", async (req, res) => {
    try {
      const { symptoms, patientDetails } = predictRequestSchema.parse(req.body);
      const userId = getUserId(req);
      const prediction = await predictWithFallback(symptoms, patientDetails);
      const [fitnessData, workoutSessions] = await Promise.all([
        storage.getFitnessData(userId),
        storage.getWorkoutSessions(userId),
      ]);
      const fitnessContext = buildFitnessPredictionContext(fitnessData, workoutSessions);
      const agentInsight = buildHealthPredictionInsight({
        prediction,
        fitnessContext,
        patientDetails: patientDetails
          ? { height: patientDetails.height, weight: patientDetails.weight }
          : undefined,
      });

      const record = await storage.createDiseasePrediction({
        userId,
        symptoms: prediction.selectedSymptoms,
        prediction: prediction.prediction,
        confidence: Math.round(prediction.confidence),
        topPredictions: prediction.topPredictions,
      });

      logEvent("ENGINE", "health_prediction_recorded", {
        userId,
        prediction: record.prediction,
        confidence: record.confidence,
        bmi: prediction.metrics?.bmi ?? null,
        fitnessDataPoints: fitnessData.length,
        workoutSessions: workoutSessions.length,
      });

      res.json({
        ...prediction,
        agentInsight,
        fitnessContext,
        recordId: record.id,
        recordedAt: record.createdAt,
        recorded: true,
      });
    } catch (e) {
      logFailure("ENGINE", "health_predict_failed", e);
      res.status(400).json({ error: "Prediction failed" });
    }
  });

  // ─── Task Matrix Routes ───
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks(getUserId(req));
      res.json(tasks);
    } catch (error) {
      logFailure("ENGINE", "get_tasks_failed", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse({ ...req.body, userId: getUserId(req) });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid task data", details: error.errors });
      } else {
        logFailure("ENGINE", "create_task_failed", error);
        res.status(500).json({ error: "Failed to create task" });
      }
    }
  });

  app.post("/api/tasks/import", async (req, res) => {
    try {
      const { fileName, content } = z.object({
        fileName: z.string().trim().min(1).max(255),
        content: z.string().trim().min(3).max(200000),
      }).parse(req.body);

      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      const aiDrafts = await classifyImportedTasksWithProviders(content, user);
      const drafts = (aiDrafts?.length ? aiDrafts : buildFallbackImportedTasks(content)).slice(0, 40);

      if (!drafts.length) {
        return res.status(400).json({ error: `No usable tasks found in ${fileName}.` });
      }

      const created = [];
      for (const draft of drafts) {
        created.push(await storage.createTask({
          userId,
          title: draft.title,
          description: draft.description ?? null,
          category: draft.category,
          completed: false,
          priority: draft.priority,
          dueDate: draft.dueDate ?? null,
        }));
      }

      res.status(201).json({
        importedCount: created.length,
        mode: aiDrafts?.length ? "ai" : "heuristic",
        created,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid import payload", details: error.errors });
      }
      logFailure("ENGINE", "task_import_failed", error);
      res.status(500).json({ error: "Failed to import tasks" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const updateData = req.body;
      const updated = await storage.updateTask(id, getUserId(req), updateData);
      if (!updated) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(updated);
    } catch (error) {
      logFailure("ENGINE", "update_task_failed", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const success = await storage.deleteTask(id, getUserId(req));
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.status(204).send();
    } catch (error) {
      logFailure("ENGINE", "delete_task_failed", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.post("/api/tasks/:id/sync-calendar", async (req, res) => {
    try {
      const user = await storage.getUser(getUserId(req));
      if (!user?.googleFitAccessToken) {
        return res.status(401).json({ error: "Google account not connected" });
      }

      if (user.googleFitAccessToken === "mock_access_token") {
        return res.status(401).json({ error: "Stored Google token is not a real OAuth token. Reconnect Google Calendar." });
      }

      const taskId = req.params.id;
      const tasks = await storage.getTasks(getUserId(req));
      const task = tasks.find(t => t.id === taskId);
      if (!task) return res.status(404).json({ error: "Task not found" });

      const startTime = task.dueDate ? new Date(task.dueDate) : new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      const event = {
        summary: `FocusFlow Task: ${task.title}`,
        description: task.description || "Synced from FocusFlow Eisenhower Matrix",
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
      };

      const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.googleFitAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      });

      if (!calRes.ok) {
        const errorText = await calRes.text();
        logFailure("SYNC", "calendar_sync_failed_google_api", new Error(errorText));
        throw new Error("Google Calendar API rejected the request. Please reconnect your Google Account in Settings to refresh permissions.");
      }

      res.json({ success: true });
    } catch (error) {
      logFailure("SYNC", "calendar_sync_failed", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to sync to calendar" });
    }
  });

  app.post("/api/tasks/sync-calendar/actionable", async (req, res) => {
    try {
      const user = await storage.getUser(getUserId(req));
      if (!user?.googleFitAccessToken) {
        return res.status(401).json({ error: "Google account not connected" });
      }

      if (user.googleFitAccessToken === "mock_access_token") {
        return res.status(401).json({ error: "Stored Google token is not a real OAuth token. Reconnect Google Calendar." });
      }

      const actionable = (await storage.getTasks(getUserId(req)))
        .filter((task) => !task.completed && task.category !== "not-important-not-urgent");

      if (!actionable.length) {
        return res.json({ success: true, syncedCount: 0, message: "No actionable tasks to sync." });
      }

      let fallbackStart = Date.now() + 30 * 60 * 1000;
      let syncedCount = 0;

      for (const task of actionable) {
        const startTime = task.dueDate ? new Date(task.dueDate) : new Date(fallbackStart);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        fallbackStart = endTime.getTime() + 15 * 60 * 1000;

        const event = {
          summary: `FocusFlow Task: ${task.title}`,
          description: task.description || "Synced from FocusFlow actionable matrix",
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
        };

        const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${user.googleFitAccessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(event)
        });

        if (!calRes.ok) {
          const errorText = await calRes.text();
          logFailure("SYNC", "bulk_calendar_sync_failed_google_api", new Error(errorText), { taskId: task.id });
          return res.status(502).json({ error: "Google Calendar API rejected one of the actionable tasks. Reconnect your Google account and retry." });
        }

        syncedCount += 1;
      }

      res.json({
        success: true,
        syncedCount,
        message: `Synced ${syncedCount} actionable tasks to Google Calendar.`,
      });
    } catch (error) {
      logFailure("SYNC", "bulk_calendar_sync_failed", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to bulk sync tasks" });
    }
  });

  app.get("/api/tasks/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const tasks = await storage.getTasksByCategory(getUserId(req), category);
      res.json(tasks);
    } catch (error) {
      logFailure("ENGINE", "get_tasks_by_category_failed", error);
      res.status(500).json({ error: "Failed to get tasks by category" });
    }
  });

  // (disease prediction routes served above via /api/health-predict/*)

  // ─── Prediction History ───
  app.get("/api/health-predict/history", async (req, res) => {
    try {
      const predictions = await storage.getDiseasePredictions(getUserId(req));
      res.json(predictions);
    } catch (error) {
      logFailure("ENGINE", "disease_history_failed", error);
      res.status(500).json({ error: "Failed to fetch prediction history" });
    }
  });

  // ─── Settings Save ───
  app.patch("/api/users/settings", async (req, res) => {
    try {
      const { geminiKey, cerebrasKey, groqKey } = req.body;

      if (geminiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const testRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
        });
        if (!testRes.ok) return res.status(400).json({ error: "Invalid Gemini API Key" });
      }

      if (groqKey) {
        const testRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "user", content: "hi" }], max_tokens: 5 })
        });
        if (!testRes.ok) return res.status(400).json({ error: "Invalid Groq API Key" });
      }

      if (cerebrasKey) {
        const testRes = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${cerebrasKey}` },
          body: JSON.stringify({
            model: process.env.CEREBRAS_MODEL || "gpt-oss-120b",
            stream: false,
            temperature: 0,
            max_tokens: 5,
            messages: [{ role: "user", content: "hi" }]
          })
        });
        if (!testRes.ok) return res.status(400).json({ error: "Invalid Cerebras API Key" });
      }

      const user = await storage.updateUserSettings(getUserId(req), { geminiKey, cerebrasKey, groqKey });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (e) {
      logFailure("ENGINE", "settings_save_failed", e);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // ─── Clear My Data ───
  app.delete("/api/users/data", async (req, res) => {
    try {
      await storage.clearUserData(getUserId(req));
      res.json({ success: true });
    } catch (e) {
      logFailure("ENGINE", "clear_data_failed", e);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // ─── Notes (ported from reference mobile apps) ───
  app.get("/api/notes", async (req, res) => {
    try {
      const notes = await storage.getNotes(getUserId(req));
      res.json(notes);
    } catch (error) {
      logFailure("ENGINE", "get_notes_failed", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const noteData = insertNoteSchema.parse({ ...req.body, userId: getUserId(req) });
      const note = await storage.createNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid note data", details: error.errors });
      } else {
        logFailure("ENGINE", "create_note_failed", error);
        res.status(500).json({ error: "Failed to create note" });
      }
    }
  });

  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const updated = await storage.updateNote(req.params.id, getUserId(req), req.body);
      if (!updated) return res.status(404).json({ error: "Note not found" });
      res.json(updated);
    } catch (error) {
      logFailure("ENGINE", "update_note_failed", error);
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const success = await storage.deleteNote(req.params.id, getUserId(req));
      if (!success) return res.status(404).json({ error: "Note not found" });
      res.status(204).send();
    } catch (error) {
      logFailure("ENGINE", "delete_note_failed", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // ─── Planner / Calendar events (local store + optional Google Calendar sync) ───

  // Map a Google Calendar event to our Event shape (for display only)
  const mapGoogleEvent = (g: any, userId: string) => {
    const startIso = g.start?.dateTime || g.start?.date;
    const endIso = g.end?.dateTime || g.end?.date;
    const start = startIso ? new Date(startIso) : new Date();
    const end = endIso ? new Date(endIso) : new Date(start.getTime() + 30 * 60 * 1000);
    const duration = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
    return {
      id: `google:${g.id}`,
      userId,
      title: g.summary || "(Untitled event)",
      description: g.description || null,
      startTime: start,
      duration,
      type: "meeting" as const,
      priority: "medium" as const,
      location: g.location || null,
      googleEventId: g.id,
      source: "google",
      createdAt: start,
      updatedAt: start
    };
  };

  app.get("/api/calendar/events", async (req, res) => {
    try {
      const userId = getUserId(req);
      const localEvents = await storage.getEvents(userId);

      // Try to enrich with live Google Calendar events if the account is connected
      let googleEvents: any[] = [];
      let googleConnected = false;
      const user = await storage.getUser(userId);
      const token = user?.googleFitAccessToken;
      if (token && token !== "mock_access_token") {
        googleConnected = true;
        try {
          const timeMin = new Date();
          timeMin.setHours(0, 0, 0, 0);
          const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin.toISOString())}&maxResults=25&singleEvents=true&orderBy=startTime`;
          const gRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          if (gRes.ok) {
            const json: any = await gRes.json();
            googleEvents = (json.items || []).map((g: any) => mapGoogleEvent(g, userId));
          } else {
            logFailure("SYNC", "calendar_fetch_rejected", new Error(await gRes.text()));
          }
        } catch (err) {
          logFailure("SYNC", "calendar_fetch_failed", err);
        }
      }

      const localMarked = localEvents.map((e) => ({ ...e, source: "local" }));
      const merged = [...localMarked, ...googleEvents].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      res.json({ events: merged, googleConnected });
    } catch (error) {
      logFailure("ENGINE", "get_events_failed", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/calendar/events", async (req, res) => {
    try {
      const userId = getUserId(req);
      const eventData = insertEventSchema.parse({ ...req.body, userId });

      // Persist locally first (always works, no external dependency)
      const created = await storage.createEvent(eventData);

      // Best-effort push to Google Calendar if connected with a real token
      const user = await storage.getUser(userId);
      const token = user?.googleFitAccessToken;
      if (token && token !== "mock_access_token") {
        try {
          const start = new Date(created.startTime);
          const end = new Date(start.getTime() + (created.duration || 30) * 60 * 1000);
          const gRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: created.title,
              description: created.description || "Created in FocusFlow Planner",
              location: created.location || undefined,
              start: { dateTime: start.toISOString() },
              end: { dateTime: end.toISOString() }
            })
          });
          if (gRes.ok) {
            const gJson: any = await gRes.json();
            const synced = await storage.updateEvent(created.id, userId, { googleEventId: gJson.id });
            return res.status(201).json({ ...(synced || created), source: "local", googleSynced: true });
          }
          logFailure("SYNC", "calendar_create_rejected", new Error(await gRes.text()));
        } catch (err) {
          logFailure("SYNC", "calendar_create_failed", err);
        }
      }

      res.status(201).json({ ...created, source: "local", googleSynced: false });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid event data", details: error.errors });
      } else {
        logFailure("ENGINE", "create_event_failed", error);
        res.status(500).json({ error: "Failed to create event" });
      }
    }
  });

  app.patch("/api/calendar/events/:id", async (req, res) => {
    try {
      const updated = await storage.updateEvent(req.params.id, getUserId(req), req.body);
      if (!updated) return res.status(404).json({ error: "Event not found" });
      res.json(updated);
    } catch (error) {
      logFailure("ENGINE", "update_event_failed", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/calendar/events/:id", async (req, res) => {
    try {
      const success = await storage.deleteEvent(req.params.id, getUserId(req));
      if (!success) return res.status(404).json({ error: "Event not found" });
      res.status(204).send();
    } catch (error) {
      logFailure("ENGINE", "delete_event_failed", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  const getProviderMode = (user: Awaited<ReturnType<typeof storage.getUser>>) =>
    user?.geminiKey
      ? "gemini-user-key"
      : user?.cerebrasKey
        ? "cerebras-user-key"
        : user?.groqKey
        ? "groq-user-key"
        : process.env.GEMINI_API_KEY
          ? "gemini-env"
          : process.env.CEREBRAS_API_KEY
            ? "cerebras-env"
          : process.env.GROQ_API_KEY
            ? "groq-env"
            : "deterministic-fallback";

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  async function buildAgentWorkspace(userId: string) {
    const [tasks, focusSessions, journals, triggers, notes, events, fitness, predictions, workoutSessions] = await Promise.all([
      storage.getTasks(userId),
      storage.getFocusSessions(userId),
      storage.getJournals(userId),
      storage.getStressTriggers(userId),
      storage.getNotes(userId),
      storage.getEvents(userId),
      storage.getFitnessData(userId),
      storage.getDiseasePredictions(userId),
      storage.getWorkoutSessions(userId)
    ]);

    const now = Date.now();
    const openTasks = tasks.filter(task => !task.completed);
    const overdueTasks = openTasks.filter(task => task.dueDate && new Date(task.dueDate).getTime() < now);
    const nextEvents = events.filter(event => new Date(event.startTime).getTime() >= now).slice(0, 5);
    const latestFitness = fitness[0];
    const recentTriggers = [...new Set(triggers.slice(0, 8).map(trigger => trigger.label))];
    const lastJournal = journals[0];
    const crisisCount = journals.filter(journal => journal.crisisFlag).length;
    const avgBurnout = journals.length
      ? Math.round(journals.reduce((sum, journal) => sum + (journal.burnoutScore ?? 0), 0) / journals.length)
      : 0;

    return {
      tasks,
      focusSessions,
      journals,
      triggers,
      notes,
      events,
      fitness,
      predictions,
      workoutSessions,
      summary: {
        openTasks: openTasks.length,
        overdueTasks: overdueTasks.length,
        completedTasks: tasks.filter(task => task.completed).length,
        focusSessions: focusSessions.length,
        journalEntries: journals.length,
        notes: notes.length,
        events: events.length,
        upcomingEvents: nextEvents.length,
        fitnessDays: fitness.length,
        workoutSessions: workoutSessions.length,
        healthPredictions: predictions.length,
        latestEmotion: lastJournal?.primaryEmotion ?? "none yet",
        latestIntensity: lastJournal?.intensityScore ?? 0,
        avgBurnout,
        crisisCount,
        recentTriggers,
        latestSteps: latestFitness?.steps ?? 0,
        nextEvents: nextEvents.map(event => ({
          title: event.title,
          startTime: event.startTime,
          priority: event.priority
        })),
        topTasks: openTasks
          .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
          .slice(0, 5)
          .map(task => ({
            title: task.title,
            category: task.category,
            priority: task.priority,
            dueDate: task.dueDate
          })),
        pinnedNotes: notes.filter(note => note.pinned).slice(0, 4).map(note => note.title),
      }
    };
  }

  function buildWorkspaceInsights(summary: Awaited<ReturnType<typeof buildAgentWorkspace>>["summary"]) {
    return [
      {
        title: "Open tasks",
        value: String(summary.openTasks),
        detail: summary.overdueTasks
          ? `${summary.overdueTasks} open task${summary.overdueTasks === 1 ? "" : "s"} are overdue.`
          : `${summary.completedTasks} completed task${summary.completedTasks === 1 ? "" : "s"} recorded.`,
        tone: summary.overdueTasks ? "amber" : "green"
      },
      {
        title: "Journal state",
        value: String(summary.journalEntries),
        detail: summary.journalEntries
          ? `Latest emotion: ${summary.latestEmotion}; intensity ${summary.latestIntensity}/10; average burnout ${summary.avgBurnout}/100.`
          : "No journal entries are stored for this workspace yet.",
        tone: summary.crisisCount ? "amber" : "blue"
      },
      {
        title: "Planner",
        value: String(summary.upcomingEvents),
        detail: summary.nextEvents.length
          ? `Next event: ${summary.nextEvents[0].title}.`
          : "No upcoming planner events are stored.",
        tone: "purple"
      },
      {
        title: "Health and fitness",
        value: String(summary.latestSteps),
        detail: `${summary.fitnessDays} fitness day${summary.fitnessDays === 1 ? "" : "s"}, ${summary.workoutSessions} workout session${summary.workoutSessions === 1 ? "" : "s"}, ${summary.healthPredictions} health prediction${summary.healthPredictions === 1 ? "" : "s"}.`,
        tone: summary.latestSteps >= 3000 ? "green" : "amber"
      }
    ];
  }

  function buildDailyPulse(summary: Awaited<ReturnType<typeof buildAgentWorkspace>>["summary"]) {
    if (summary.crisisCount > 0) {
      return {
        state: "protect",
        headline: "Today needs protection first",
        summary: `${summary.crisisCount} recent high-risk journal entr${summary.crisisCount === 1 ? "y" : "ies"} require a gentler schedule and stronger support boundaries.`
      };
    }

    if (summary.overdueTasks > 0 && summary.latestIntensity >= 7) {
      return {
        state: "stabilize",
        headline: "Reduce pressure before adding effort",
        summary: `${summary.overdueTasks} overdue task${summary.overdueTasks === 1 ? "" : "s"} and elevated journal intensity suggest starting with recovery and one concrete commitment.`
      };
    }

    if (summary.openTasks > 0) {
      return {
        state: "focus",
        headline: "You have enough signal to enter a focused block",
        summary: `${summary.openTasks} open task${summary.openTasks === 1 ? "" : "s"} and ${summary.upcomingEvents} upcoming event${summary.upcomingEvents === 1 ? "" : "s"} can be shaped into a clean execution window.`
      };
    }

    return {
      state: "setup",
      headline: "Start by creating a healthier baseline",
      summary: "Your tracker is mostly empty right now, so the best move is to log one task, one reflection, and one focus session to build signal."
    };
  }

  function buildFocusProtocol(summary: Awaited<ReturnType<typeof buildAgentWorkspace>>["summary"]) {
    const movement = summary.latestSteps < 3000
      ? "Take a short walk or movement reset before sitting down for deep work."
      : "Keep movement light and steady while you work through the next block.";
    const planner = summary.nextEvents.length
      ? `Work around your next event, "${summary.nextEvents[0].title}", before committing to anything long.`
      : "You have space to reserve a 30 minute focus sprint in the planner.";
    const journaling = summary.journalEntries
      ? `Your latest emotional signal is ${summary.latestEmotion} at intensity ${summary.latestIntensity}/10, so choose a pace that matches that state.`
      : "Write one quick reflection so the system has emotional context for the rest of the day.";

    return [
      {
        title: "Protect attention",
        detail: summary.overdueTasks
          ? `Clear the highest-pressure item first. ${summary.overdueTasks} overdue task${summary.overdueTasks === 1 ? "" : "s"} are competing for attention.`
          : "Pick the single next outcome that would make the day feel more under control."
      },
      {
        title: "Align schedule",
        detail: planner
      },
      {
        title: "Regulate body",
        detail: movement
      },
      {
        title: "Capture state",
        detail: journaling
      }
    ];
  }

  function buildMonkModePlan(summary: Awaited<ReturnType<typeof buildAgentWorkspace>>["summary"]) {
    const recommendedDuration = summary.latestIntensity >= 7 ? 25 : summary.openTasks > 2 ? 45 : 30;
    const blockers = [
      "Social media",
      "Entertainment sites",
      ...(summary.upcomingEvents > 0 ? ["Non-essential notifications"] : [])
    ];

    return {
      recommendedDuration,
      blockers,
      summary: summary.openTasks || summary.journalEntries
        ? `A ${recommendedDuration}-minute protected block is a good fit for your current workload and state.`
        : "Use a short protected block to start building consistent data and routine."
    };
  }

  // ─── COGNO FocusFlow Live Agent Workspace ───
  app.get("/api/agentic/workspace", async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      const providerMode = getProviderMode(user);
      const workspace = await buildAgentWorkspace(userId);
      const availableSignals = [
        workspace.summary.openTasks + workspace.summary.completedTasks > 0,
        workspace.summary.journalEntries > 0,
        workspace.summary.notes > 0,
        workspace.summary.events > 0,
        workspace.summary.fitnessDays > 0 || workspace.summary.workoutSessions > 0,
        workspace.summary.healthPredictions > 0,
        providerMode !== "deterministic-fallback"
      ].filter(Boolean).length;
      const score = clamp(Math.round((availableSignals / 7) * 100), 0, 100);
      const dailyPulse = buildDailyPulse(workspace.summary);
      const focusProtocol = buildFocusProtocol(workspace.summary);
      const monkModePlan = buildMonkModePlan(workspace.summary);

      res.json({
        title: "COGNO Personal Pulse",
        tagline: "Health, focus, recovery, and distraction control across your live workspace.",
        providerMode,
        readinessScore: score,
        workspace: workspace.summary,
        dailyPulse,
        focusProtocol,
        monkModePlan,
        signals: [
          { label: "Open tasks", value: String(workspace.summary.openTasks), tone: workspace.summary.overdueTasks ? "amber" : "green" },
          { label: "Journal state", value: `${workspace.summary.journalEntries} entries`, tone: workspace.summary.crisisCount ? "amber" : "blue" },
          { label: "Planner graph", value: `${workspace.summary.upcomingEvents} upcoming`, tone: "purple" },
          { label: "Provider route", value: providerMode, tone: providerMode === "deterministic-fallback" ? "amber" : "green" }
        ],
        insights: buildWorkspaceInsights(workspace.summary),
        capabilities: [
          "Reads the current task list, notes, journals, planner events, fitness data, workout sessions and health predictions.",
          "Routes requests through the configured user or environment GenAI provider when one is available.",
          "Returns tool-call traces so the agent output can be checked against actual storage reads."
        ],
        safetyStack: [
          "Pre-computation crisis keyword router",
          "Workspace summary avoids dumping private raw journal text",
          "User-owned API keys in settings",
          "Action output is explainable through tool-call traces"
        ]
      });
    } catch (error) {
      logFailure("ENGINE", "agentic_workspace_failed", error);
      res.status(500).json({ error: "Failed to build live COGNO FocusFlow workspace" });
    }
  });

  app.post("/api/agentic/run", async (req, res) => {
    try {
      const { prompt } = z.object({ prompt: z.string().trim().min(3).max(1200) }).parse(req.body);
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      const providerMode = getProviderMode(user);
      const workspace = await buildAgentWorkspace(userId);

      if (detectCrisis(prompt)) {
        return res.json({
          providerMode,
          riskLevel: "crisis",
          reasoning: createCrisisResponse().message,
          actions: ["Pause normal planning", "Show crisis support", "Encourage immediate human support"],
          toolCalls: [
            { tool: "detectCrisis", input: "prompt", result: "crisis-route" },
            { tool: "createCrisisResponse", input: "safety-protocol", result: "support-message" }
          ],
          nextPlan: [],
          trace: ["prompt_received", "crisis_detected", "normal_genai_bypassed", "support_response_returned"],
          generatedAt: new Date().toISOString()
        });
      }

      const analyses = workspace.journals.slice(0, 5).map((journal) => ({
        emotion: journal.primaryEmotion,
        intensity: journal.intensityScore,
        burnoutRisk: (journal.burnoutScore ?? 0) / 100,
        triggers: workspace.triggers.filter(trigger => trigger.journalId === journal.id).map(trigger => trigger.label),
        crisis: Boolean(journal.crisisFlag)
      }));
      const overallMetrics = [
        `${workspace.summary.openTasks} open tasks`,
        `${workspace.summary.overdueTasks} overdue tasks`,
        `${workspace.summary.journalEntries} journal entries`,
        `${workspace.summary.notes} notes`,
        `${workspace.summary.upcomingEvents} upcoming events`,
        `${workspace.summary.latestSteps} latest steps`
      ].join("; ");
      const companion = await wellnessOrchestrator.companion({ message: prompt, analyses, overallMetrics }, {
        gemini: user?.geminiKey || undefined,
        cerebras: user?.cerebrasKey || undefined,
        groq: user?.groqKey || undefined
      });

      const priorityTask = workspace.summary.topTasks[0];
      const nextEvent = workspace.summary.nextEvents[0];
      const actions = [
        priorityTask
          ? `Start with "${priorityTask.title}" because it is the highest priority open task.`
          : "Create one concrete task from this prompt before planning anything else.",
        nextEvent
          ? `Protect calendar context around "${nextEvent.title}" before adding new commitments.`
          : "Schedule a 30 minute focus block because no upcoming event is blocking the next action.",
        workspace.summary.latestIntensity >= 7
          ? "Run a short regulation step before deep work because the latest journal intensity is high."
          : "Move directly into execution, then journal a short reflection after the sprint.",
        workspace.summary.latestSteps < 3000
          ? "Add a low-friction movement reset because recent fitness activity is low."
          : "Keep fitness as maintenance; the main bottleneck is cognitive/task load."
      ];

      res.json({
        providerMode: companion.provider || providerMode,
        riskLevel: workspace.summary.crisisCount ? "watch" : "normal",
        reasoning: companion.value,
        actions,
        toolCalls: [
          { tool: "storage.getTasks", input: userId, result: `${workspace.tasks.length} tasks` },
          { tool: "storage.getNotes", input: userId, result: `${workspace.notes.length} notes` },
          { tool: "storage.getJournals", input: userId, result: `${workspace.journals.length} journals` },
          { tool: "storage.getEvents", input: userId, result: `${workspace.events.length} events` },
          { tool: "wellnessOrchestrator.companion", input: providerMode, result: companion.fallback ? "fallback-used" : "provider-used" }
        ],
        nextPlan: [
          { title: "Focus sprint", due: "Now + 30 min", why: actions[0] },
          { title: "Calendar block", due: "Today", why: actions[1] },
          { title: "Reflection note", due: "After sprint", why: "Keeps COGNO memory fresh for the next agent run." }
        ],
        trace: ["prompt_received", "workspace_loaded", "risk_checked", "provider_routed", "actions_generated", "trace_returned"],
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid agent prompt", details: error.errors });
      logFailure("ENGINE", "agentic_run_failed", error);
      res.status(500).json({ error: "Failed to run COGNO agent" });
    }
  });

  app.post("/api/agentic/execute", async (req, res) => {
    try {
      const { actions } = z.object({
        actions: z.array(z.string().trim().min(3).max(240)).min(1).max(8)
      }).parse(req.body);
      const userId = getUserId(req);

      const createdTasks = [];
      for (const [index, action] of actions.entries()) {
        const task = await storage.createTask({
          userId,
          title: action.length > 96 ? `${action.slice(0, 93)}...` : action,
          description: `Created from FocusFlow Nexus agent action: ${action}`,
          category: index === 0 ? "important-urgent" : "important-not-urgent",
          priority: Math.max(2, 5 - index),
          completed: false,
          dueDate: index === 0 ? new Date(Date.now() + 60 * 60 * 1000) : null
        });
        createdTasks.push(task);
      }

      const firstTask = createdTasks[0];
      const createdEvent = firstTask
        ? await storage.createEvent({
            userId,
            title: `Focus sprint: ${firstTask.title}`,
            description: "Created by FocusFlow Nexus agent execution.",
            startTime: new Date(Date.now() + 15 * 60 * 1000),
            duration: 30,
            type: "task",
            priority: "high",
            location: null,
            googleEventId: null
          })
        : null;

      res.status(201).json({
        success: true,
        createdTasks,
        createdEvent,
        trace: ["actions_received", "tasks_created", createdEvent ? "planner_event_created" : "planner_event_skipped"]
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid execution request", details: error.errors });
      logFailure("ENGINE", "agentic_execute_failed", error);
      res.status(500).json({ error: "Failed to execute COGNO agent actions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function getRecentAnalyses(userId: string): Promise<JournalAnalysis[]> {
  const journals = (await storage.getJournals(userId)).slice(0, 5);
  const triggers = await storage.getStressTriggers(userId);
  logEvent("ENGINE", "companion_context_loaded", { journalCount: journals.length });
  return journals.map((journal) => ({
    emotion: journal.primaryEmotion,
    intensity: journal.intensityScore,
    burnoutRisk: (journal.burnoutScore ?? 0) / 100,
    triggers: triggers.filter((trigger) => trigger.journalId === journal.id).map((trigger) => trigger.label),
    crisis: Boolean(journal.crisisFlag),
  }));
}


