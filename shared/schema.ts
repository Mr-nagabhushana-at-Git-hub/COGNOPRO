import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  geminiKey: text("gemini_key"),
  cerebrasKey: text("cerebras_key"),
  groqKey: text("groq_key"),
  googleFitAccessToken: text("google_fit_access_token"),
  googleFitRefreshToken: text("google_fit_refresh_token"),
  createdAt: timestamp("created_at").defaultNow()
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'important-urgent', 'important-not-urgent', 'not-important-urgent', 'not-important-not-urgent'
  completed: boolean("completed").default(false),
  priority: integer("priority").default(1), // 1-5 priority scale
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const focusSessions = pgTable("focus_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  taskId: varchar("task_id").references(() => tasks.id),
  type: text("type").notNull(), // 'pomodoro', 'deep-work', 'custom'
  duration: integer("duration").notNull(), // in minutes
  completedDuration: integer("completed_duration").default(0),
  isActive: boolean("is_active").default(false),
  completed: boolean("completed").default(false),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow()
});

export const brainGameScores = pgTable("brain_game_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  gameType: text("game_type").notNull(), // 'memory', 'logic', 'pattern'
  score: integer("score").notNull(),
  level: integer("level").default(1),
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow()
});

export const fitnessData = pgTable("fitness_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: timestamp("date").defaultNow(),
  steps: integer("steps").default(0),
  exerciseMinutes: integer("exercise_minutes").default(0),
  workoutType: text("workout_type"), // 'cardio', 'strength', 'yoga', etc.
  caloriesBurned: integer("calories_burned").default(0)
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'task', 'focus', 'break', 'achievement'
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const journals = pgTable("journals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  primaryEmotion: text("primary_emotion").notNull(),
  intensityScore: integer("intensity_score").notNull(),
  burnoutRisk: boolean("burnout_risk").default(false),
  burnoutScore: integer("burnout_score").default(0),
  crisisFlag: boolean("crisis_flag").default(false),
  analysisSource: text("analysis_source").default("local-safety-engine"),
  createdAt: timestamp("created_at").defaultNow()
});

export const stressTriggers = pgTable("stress_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  journalId: varchar("journal_id").references(() => journals.id).notNull(),
  label: text("label").notNull(),
  intensity: integer("intensity").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Quick notes (ported from the reference mobile apps' Notes feature)
export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull().default("Untitled"),
  content: text("content").notNull().default(""),
  color: text("color").default("default"), // visual tag: default, indigo, emerald, amber, rose, purple
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Planner / calendar events (persisted locally, optionally synced to Google Calendar)
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  duration: integer("duration").notNull().default(30), // minutes
  type: text("type").notNull().default("task"), // meeting, task, brain-training, fitness, break
  priority: text("priority").notNull().default("medium"), // high, medium, low
  location: text("location"),
  googleEventId: text("google_event_id"), // set when synced to Google Calendar
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Camera-guided workout sessions (reps / form / exertion telemetry per session)
export const workoutSessions = pgTable("workout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  exercise: text("exercise").notNull(),
  reps: integer("reps").notNull().default(0),
  avgFormScore: integer("avg_form_score").notNull().default(0),
  peakExertion: integer("peak_exertion").notNull().default(0), // 0-100
  durationSec: integer("duration_sec").notNull().default(0),
  caloriesBurned: integer("calories_burned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow()
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

export const updateUserSettingsSchema = z.object({
  geminiKey: z.string().optional(),
  cerebrasKey: z.string().optional(),
  groqKey: z.string().optional(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  dueDate: z.coerce.date().nullable().optional()
});

export const insertFocusSessionSchema = createInsertSchema(focusSessions).omit({
  id: true,
  createdAt: true
});

export const insertBrainGameScoreSchema = createInsertSchema(brainGameScores).omit({
  id: true,
  createdAt: true
});

export const insertFitnessDataSchema = createInsertSchema(fitnessData).omit({
  id: true
}).extend({
  date: z.coerce.date().optional()
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});

export const insertJournalSchema = createInsertSchema(journals).omit({
  id: true,
  createdAt: true
});

export const insertStressTriggerSchema = createInsertSchema(stressTriggers).omit({
  id: true,
  createdAt: true
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  startTime: z.coerce.date()
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
  createdAt: true
});

export const journalEntrySchema = z.object({
  content: z.string().trim().min(10, "Write at least 10 characters so the entry can be understood.")
});

export const healthSymptoms = pgTable("health_symptoms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").default("general"),
  createdAt: timestamp("created_at").defaultNow()
});

export const diseasePredictions = pgTable("disease_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  symptoms: text("symptoms").array().notNull(),
  prediction: text("prediction").notNull(),
  confidence: integer("confidence").notNull(),
  topPredictions: json("top_predictions").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Insert schemas
export const insertHealthSymptomSchema = createInsertSchema(healthSymptoms).omit({ id: true, createdAt: true });
export const insertDiseasePredictionSchema = createInsertSchema(diseasePredictions).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type FocusSession = typeof focusSessions.$inferSelect;
export type InsertFocusSession = z.infer<typeof insertFocusSessionSchema>;
export type BrainGameScore = typeof brainGameScores.$inferSelect;
export type InsertBrainGameScore = z.infer<typeof insertBrainGameScoreSchema>;
export type FitnessData = typeof fitnessData.$inferSelect;
export type InsertFitnessData = z.infer<typeof insertFitnessDataSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Journal = typeof journals.$inferSelect;
export type InsertJournal = z.infer<typeof insertJournalSchema>;
export type StressTrigger = typeof stressTriggers.$inferSelect;
export type InsertStressTrigger = z.infer<typeof insertStressTriggerSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type HealthSymptom = typeof healthSymptoms.$inferSelect;
export type InsertHealthSymptom = z.infer<typeof insertHealthSymptomSchema>;
export type DiseasePrediction = typeof diseasePredictions.$inferSelect;
export type InsertDiseasePrediction = z.infer<typeof insertDiseasePredictionSchema>;
