import { db as maybeDb } from "./db";
import { eq, desc, and, gte, inArray } from "drizzle-orm";
import {
  users, tasks, focusSessions, brainGameScores, fitnessData,
  notifications, journals, stressTriggers, healthSymptoms, diseasePredictions,
  type User, type InsertUser, type Task, type InsertTask,
  type FocusSession, type InsertFocusSession, type BrainGameScore,
  type InsertBrainGameScore, type FitnessData, type InsertFitnessData,
  type Notification, type InsertNotification, type Journal,
  type InsertJournal, type StressTrigger, type InsertStressTrigger,
  type HealthSymptom, type DiseasePrediction, type InsertDiseasePrediction
} from "@shared/schema";
import { type IStorage } from "./storage";

const db = maybeDb!;

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserSettings(id: string, settings: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(settings).where(eq(users.id, id)).returning();
    return user;
  }

  async getTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
  }

  async getTasksByCategory(userId: string, category: string): Promise<Task[]> {
    return await db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.category, category))).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string, userId: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, userId: string, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const [updatedTask] = await db.update(tasks).set({ ...taskUpdate, updatedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();
    return updatedTask;
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();
    return !!deleted;
  }

  async getFocusSessions(userId: string): Promise<FocusSession[]> {
    return await db.select().from(focusSessions).where(eq(focusSessions.userId, userId)).orderBy(desc(focusSessions.createdAt));
  }

  async getActiveFocusSession(userId: string): Promise<FocusSession | undefined> {
    const [session] = await db.select().from(focusSessions).where(and(eq(focusSessions.userId, userId), eq(focusSessions.isActive, true)));
    return session;
  }

  async createFocusSession(session: InsertFocusSession): Promise<FocusSession> {
    const [newSession] = await db.insert(focusSessions).values(session).returning();
    return newSession;
  }

  async updateFocusSession(id: string, userId: string, sessionUpdate: Partial<InsertFocusSession>): Promise<FocusSession | undefined> {
    const [updatedSession] = await db.update(focusSessions).set(sessionUpdate).where(and(eq(focusSessions.id, id), eq(focusSessions.userId, userId))).returning();
    return updatedSession;
  }

  async getBrainGameScores(userId: string, gameType?: string): Promise<BrainGameScore[]> {
    let query = db.select().from(brainGameScores).where(eq(brainGameScores.userId, userId));
    if (gameType) query = db.select().from(brainGameScores).where(and(eq(brainGameScores.userId, userId), eq(brainGameScores.gameType, gameType)));
    return await query.orderBy(desc(brainGameScores.createdAt));
  }

  async createBrainGameScore(score: InsertBrainGameScore): Promise<BrainGameScore> {
    const [newScore] = await db.insert(brainGameScores).values(score).returning();
    return newScore;
  }

  async getTopScores(userId: string, gameType: string, limit: number = 10): Promise<BrainGameScore[]> {
    return await db.select().from(brainGameScores).where(and(eq(brainGameScores.userId, userId), eq(brainGameScores.gameType, gameType))).orderBy(desc(brainGameScores.score)).limit(limit);
  }

  async clearFitnessData(userId: string): Promise<void> {
    await db.delete(fitnessData).where(eq(fitnessData.userId, userId));
  }

  async getFitnessData(userId: string, date?: Date): Promise<FitnessData[]> {
    let query = db.select().from(fitnessData).where(eq(fitnessData.userId, userId));
    if (date) {
      const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(date); endOfDay.setHours(23,59,59,999);
      query = db.select().from(fitnessData).where(and(eq(fitnessData.userId, userId), gte(fitnessData.date, startOfDay)));
    }
    return await query.orderBy(desc(fitnessData.date));
  }

  async createFitnessData(data: InsertFitnessData): Promise<FitnessData> {
    const [newData] = await db.insert(fitnessData).values(data).returning();
    return newData;
  }

  async updateFitnessData(userId: string, date: Date, data: Partial<InsertFitnessData>): Promise<FitnessData | undefined> {
    const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
    const [updated] = await db.update(fitnessData).set(data).where(and(eq(fitnessData.userId, userId), gte(fitnessData.date, startOfDay))).returning();
    return updated;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false))).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const [updated] = await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId))).returning();
    return !!updated;
  }

  async getJournals(userId: string): Promise<Journal[]> {
    return await db.select().from(journals).where(eq(journals.userId, userId)).orderBy(desc(journals.createdAt));
  }

  async createJournal(journal: InsertJournal): Promise<Journal> {
    const [newJournal] = await db.insert(journals).values(journal).returning();
    return newJournal;
  }

  async getStressTriggers(userId: string, since?: Date): Promise<StressTrigger[]> {
    let query = db.select().from(stressTriggers).where(eq(stressTriggers.userId, userId));
    if (since) {
      query = db.select().from(stressTriggers).where(and(eq(stressTriggers.userId, userId), gte(stressTriggers.createdAt, since)));
    }
    return await query.orderBy(desc(stressTriggers.createdAt));
  }

  async createStressTrigger(trigger: InsertStressTrigger): Promise<StressTrigger> {
    const [newTrigger] = await db.insert(stressTriggers).values(trigger).returning();
    return newTrigger;
  }

  async getHealthSymptoms(): Promise<HealthSymptom[]> {
    const results = await db.select().from(healthSymptoms);
    if (results.length === 0) {
      const MemStorageClass = (await import("./storage")).MemStorage;
      const mem = new MemStorageClass();
      return mem.getHealthSymptoms();
    }
    return results;
  }

  async getDiseasePredictions(userId: string): Promise<DiseasePrediction[]> {
    return await db.select().from(diseasePredictions).where(eq(diseasePredictions.userId, userId)).orderBy(desc(diseasePredictions.createdAt));
  }

  async createDiseasePrediction(prediction: InsertDiseasePrediction): Promise<DiseasePrediction> {
    const [newPrediction] = await db.insert(diseasePredictions).values(prediction).returning();
    return newPrediction;
  }

  async clearUserData(userId: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.userId, userId));
    await db.delete(focusSessions).where(eq(focusSessions.userId, userId));
    await db.delete(brainGameScores).where(eq(brainGameScores.userId, userId));
    await db.delete(fitnessData).where(eq(fitnessData.userId, userId));
    await db.delete(notifications).where(eq(notifications.userId, userId));
    await db.delete(journals).where(eq(journals.userId, userId));
    await db.delete(stressTriggers).where(eq(stressTriggers.userId, userId));
    await db.delete(diseasePredictions).where(eq(diseasePredictions.userId, userId));
  }
}
