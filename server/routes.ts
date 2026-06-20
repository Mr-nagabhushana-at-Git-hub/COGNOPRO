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
  insertDiseasePredictionSchema
} from "@shared/schema";
import type { DiseasePrediction } from "@shared/schema";
import { z } from "zod";
import { createCrisisResponse, detectCrisis } from "./ai/crisis-router";
import { logEvent, logFailure } from "./ai/logger";
import { wellnessOrchestrator } from "./ai/orchestrator";
import type { JournalAnalysis } from "@shared/wellness";
import { ALL_SYMPTOMS, SYMPTOM_CATEGORIES, formatSymptom, predictWithFallback, predictRequestSchema } from "./ai/disease-predictor";

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

export async function registerRoutes(app: Express): Promise<Server> {
  const DEMO_USER_ID = "demo-user";

  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks(DEMO_USER_ID);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const tasks = await storage.getTasksByCategory(DEMO_USER_ID, category);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks by category" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse({ ...req.body, userId: DEMO_USER_ID });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid task data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create task" });
      }
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const task = await storage.updateTask(id, DEMO_USER_ID, updateData);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTask(id, DEMO_USER_ID);
      if (!success) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Focus session routes
  app.get("/api/focus-sessions", async (req, res) => {
    try {
      const sessions = await storage.getFocusSessions(DEMO_USER_ID);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch focus sessions" });
    }
  });

  app.get("/api/focus-sessions/active", async (req, res) => {
    try {
      const session = await storage.getActiveFocusSession(DEMO_USER_ID);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active focus session" });
    }
  });

  app.post("/api/focus-sessions", async (req, res) => {
    try {
      const sessionData = insertFocusSessionSchema.parse({ ...req.body, userId: DEMO_USER_ID });
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
      const session = await storage.updateFocusSession(id, DEMO_USER_ID, updateData);
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
      const scores = await storage.getBrainGameScores(DEMO_USER_ID, gameType as string);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brain game scores" });
    }
  });

  app.get("/api/brain-games/top-scores/:gameType", async (req, res) => {
    try {
      const { gameType } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const scores = await storage.getTopScores(DEMO_USER_ID, gameType, limit);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top scores" });
    }
  });

  app.post("/api/brain-games/scores", async (req, res) => {
    try {
      const scoreData = insertBrainGameScoreSchema.parse({ ...req.body, userId: DEMO_USER_ID });
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
      const fitnessData = await storage.getFitnessData(DEMO_USER_ID, targetDate);
      res.json(fitnessData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fitness data" });
    }
  });

  app.post("/api/fitness", async (req, res) => {
    try {
      const fitnessData = insertFitnessDataSchema.parse({ ...req.body, userId: DEMO_USER_ID });
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
      const data = await storage.updateFitnessData(DEMO_USER_ID, targetDate, updateData);
      if (!data) {
        res.status(404).json({ error: "Fitness data not found for date" });
        return;
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to update fitness data" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await storage.getNotifications(DEMO_USER_ID);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotifications(DEMO_USER_ID);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse({ ...req.body, userId: DEMO_USER_ID });
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
      const success = await storage.markNotificationRead(id, DEMO_USER_ID);
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
      const tasks = await storage.getTasks(DEMO_USER_ID);
      const focusSessions = await storage.getFocusSessions(DEMO_USER_ID);
      const brainScores = await storage.getBrainGameScores(DEMO_USER_ID);
      const fitnessData = await storage.getFitnessData(DEMO_USER_ID);

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

  app.get("/api/health/symptoms", async (_req, res) => {
    try {
      const symptoms = await storage.getHealthSymptoms();
      res.json(symptoms.map(symptom => ({
        name: symptom.name,
        description: symptom.description,
        category: symptom.category ?? "general"
      })));
    } catch {
      res.status(500).json({ error: "Failed to fetch symptoms" });
    }
  });

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
        userId: DEMO_USER_ID,
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

  app.get("/api/journals", async (_req, res) => {
    try {
      res.json(await storage.getJournals(DEMO_USER_ID));
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
      const analysisResult = await wellnessOrchestrator.analyze(content);
      const analysis = analysisResult.value;
      const journal = await storage.createJournal({
        userId: DEMO_USER_ID,
        content,
        primaryEmotion: analysis.emotion,
        intensityScore: analysis.intensity,
        burnoutRisk: analysis.burnoutRisk >= 0.6,
        burnoutScore: Math.round(analysis.burnoutRisk * 100),
        crisisFlag: analysis.crisis,
        analysisSource: analysisResult.provider,
      });
      const triggers = await Promise.all(analysis.triggers.map((label) => storage.createStressTrigger({
        userId: DEMO_USER_ID,
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
      res.json(await storage.getStressTriggers(DEMO_USER_ID, since));
    } catch (error) {
      if (error instanceof z.ZodError) res.status(400).json({ error: "Invalid timeframe" });
      else res.status(500).json({ error: "Failed to fetch stress triggers" });
    }
  });

  app.post("/api/companion/chat", async (req, res) => {
    try {
      const { message } = z.object({ message: z.string().trim().min(1).max(2000) }).parse(req.body);
      if (detectCrisis(message)) {
        res.json(createCrisisResponse());
        return;
      }
      const analyses = await getRecentAnalyses(DEMO_USER_ID);
      const result = await wellnessOrchestrator.companion({ message, analyses });
      res.json({ type: "COMPANION", reply: result.value, provider: result.provider, fallback: result.fallback });
    } catch (error) {
      if (error instanceof z.ZodError) res.status(400).json({ error: "Invalid message", details: error.errors });
      else res.status(500).json({ error: "Companion is temporarily unavailable" });
    }
  });

  app.post("/api/companion/chat/stream", async (req, res) => {
    try {
      const { message } = z.object({ message: z.string().trim().min(1).max(2000) }).parse(req.body);
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
      const analyses = await getRecentAnalyses(DEMO_USER_ID);
      for await (const token of wellnessOrchestrator.streamCompanion({ message, analyses })) {
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

  app.get("/api/wellness/analytics", async (_req, res) => {
    try {
      const journals = await storage.getJournals(DEMO_USER_ID);
      const triggers = await storage.getStressTriggers(DEMO_USER_ID, new Date(Date.now() - 30 * 86400000));
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

  // ─── Disease Prediction Routes ───

  // Get all symptoms grouped by category
  app.get("/api/health-predict/symptoms", (_req, res) => {
    const categorized = Object.entries(SYMPTOM_CATEGORIES).map(([category, symptoms]) => ({
      category,
      symptoms: symptoms.map((s) => ({ id: s, label: formatSymptom(s) })),
    }));
    res.json({ categories: categorized, totalSymptoms: ALL_SYMPTOMS.length });
  });

  // Run prediction
  app.post("/api/health-predict/predict", async (req, res) => {
    try {
      const body = predictRequestSchema.parse(req.body);
      logEvent("ENGINE", "disease_predict_request", { symptomCount: body.symptoms.length });

      const result = await predictWithFallback(body.symptoms, body.patientDetails);

      // Store prediction in DB
      try {
        await storage.createDiseasePrediction({
          userId: DEMO_USER_ID,
          symptoms: body.symptoms,
          prediction: result.prediction,
          confidence: Math.round(result.confidence),
          topPredictions: result.topPredictions,
        });
      } catch (dbErr) {
        logFailure("ENGINE", "disease_prediction_save_failed", dbErr);
      }

      logEvent("ENGINE", "disease_predict_result", { prediction: result.prediction, confidence: result.confidence, source: result.source });
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request", details: error.errors });
      } else {
        logFailure("ENGINE", "disease_predict_failed", error);
        res.status(500).json({ error: "Prediction failed" });
      }
    }
  });

  // Get prediction history
  app.get("/api/health-predict/history", async (_req, res) => {
    try {
      const predictions = await storage.getDiseasePredictions(DEMO_USER_ID);
      res.json(predictions);
    } catch (error) {
      logFailure("ENGINE", "disease_history_failed", error);
      res.status(500).json({ error: "Failed to fetch prediction history" });
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
