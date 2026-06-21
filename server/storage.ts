import {
  type User,
  type InsertUser,
  type Task,
  type InsertTask,
  type FocusSession,
  type InsertFocusSession,
  type BrainGameScore,
  type InsertBrainGameScore,
  type FitnessData,
  type InsertFitnessData,
  type Notification,
  type InsertNotification,
  type Journal,
  type InsertJournal,
  type StressTrigger,
  type InsertStressTrigger,
  type HealthSymptom,
  type InsertHealthSymptom,
  type DiseasePrediction,
  type InsertDiseasePrediction
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSettings(id: string, settings: Partial<User>): Promise<User | undefined>;

  // Task methods
  getTasks(userId: string): Promise<Task[]>;
  getTasksByCategory(userId: string, category: string): Promise<Task[]>;
  getTask(id: string, userId: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, userId: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string, userId: string): Promise<boolean>;

  // Focus session methods
  getFocusSessions(userId: string): Promise<FocusSession[]>;
  getActiveFocusSession(userId: string): Promise<FocusSession | undefined>;
  createFocusSession(session: InsertFocusSession): Promise<FocusSession>;
  updateFocusSession(id: string, userId: string, session: Partial<InsertFocusSession>): Promise<FocusSession | undefined>;

  // Brain game methods
  getBrainGameScores(userId: string, gameType?: string): Promise<BrainGameScore[]>;
  createBrainGameScore(score: InsertBrainGameScore): Promise<BrainGameScore>;
  getTopScores(userId: string, gameType: string, limit?: number): Promise<BrainGameScore[]>;

  // Fitness methods
  clearFitnessData(userId: string): Promise<void>;
  getFitnessData(userId: string, date?: Date): Promise<FitnessData[]>;
  createFitnessData(data: InsertFitnessData): Promise<FitnessData>;
  updateFitnessData(userId: string, date: Date, data: Partial<InsertFitnessData>): Promise<FitnessData | undefined>;

  // Notification methods
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<boolean>;

  getJournals(userId: string): Promise<Journal[]>;
  createJournal(journal: InsertJournal): Promise<Journal>;
  getStressTriggers(userId: string, since?: Date): Promise<StressTrigger[]>;
  createStressTrigger(trigger: InsertStressTrigger): Promise<StressTrigger>;

  getHealthSymptoms(): Promise<HealthSymptom[]>;
  getDiseasePredictions(userId: string): Promise<DiseasePrediction[]>;
  createDiseasePrediction(prediction: InsertDiseasePrediction): Promise<DiseasePrediction>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private tasks: Map<string, Task> = new Map();
  private focusSessions: Map<string, FocusSession> = new Map();
  private brainGameScores: Map<string, BrainGameScore> = new Map();
  private fitnessData: Map<string, FitnessData> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private journals: Map<string, Journal> = new Map();
  private stressTriggers: Map<string, StressTrigger> = new Map();
  private healthSymptoms: HealthSymptom[] = [];
  private diseasePredictions: Map<string, DiseasePrediction> = new Map();

  constructor() {
    this.healthSymptoms = [
      { id: "s1", name: "itching", description: "Skin itching sensation", category: "skin", createdAt: new Date() },
      { id: "s2", name: "skin_rash", description: "Visible skin rash", category: "skin", createdAt: new Date() },
      { id: "s3", name: "nodal_skin_eruptions", description: "Nodal skin eruptions", category: "skin", createdAt: new Date() },
      { id: "s4", name: "continuous_sneezing", description: "Continuous sneezing", category: "respiratory", createdAt: new Date() },
      { id: "s5", name: "shivering", description: "Shivering or chills", category: "general", createdAt: new Date() },
      { id: "s6", name: "chills", description: "Feeling of coldness", category: "general", createdAt: new Date() },
      { id: "s7", name: "joint_pain", description: "Pain in joints", category: "musculoskeletal", createdAt: new Date() },
      { id: "s8", name: "stomach_pain", description: "Abdominal or stomach pain", category: "digestive", createdAt: new Date() },
      { id: "s9", name: "acidity", description: "Acid reflux or heartburn", category: "digestive", createdAt: new Date() },
      { id: "s10", name: "ulcers_on_tongue", description: "Sores or ulcers on tongue", category: "oral", createdAt: new Date() },
      { id: "s11", name: "muscle_wasting", description: "Loss of muscle mass", category: "musculoskeletal", createdAt: new Date() },
      { id: "s12", name: "vomiting", description: "Nausea and vomiting", category: "digestive", createdAt: new Date() },
      { id: "s13", name: "burning_micturition", description: "Burning sensation during urination", category: "urinary", createdAt: new Date() },
      { id: "s14", name: "spotting_urination", description: "Spotting or irregular urination", category: "urinary", createdAt: new Date() },
      { id: "s15", name: "fatigue", description: "Extreme tiredness or weakness", category: "general", createdAt: new Date() },
      { id: "s16", name: "weight_gain", description: "Unintentional weight gain", category: "metabolic", createdAt: new Date() },
      { id: "s17", name: "anxiety", description: "Anxiety or nervousness", category: "mental", createdAt: new Date() },
      { id: "s18", name: "cold_hands_and_feets", description: "Cold hands and feet", category: "general", createdAt: new Date() },
      { id: "s19", name: "mood_swings", description: "Mood swings or emotional changes", category: "mental", createdAt: new Date() },
      { id: "s20", name: "weight_loss", description: "Unintentional weight loss", category: "metabolic", createdAt: new Date() },
      { id: "s21", name: "restlessness", description: "Restlessness or inability to relax", category: "mental", createdAt: new Date() },
      { id: "s22", name: "lethargy", description: "Lethargy or sluggishness", category: "general", createdAt: new Date() },
      { id: "s23", name: "patches_in_throat", description: "White patches in throat", category: "respiratory", createdAt: new Date() },
      { id: "s24", name: "irregular_sugar_level", description: "Irregular blood sugar levels", category: "metabolic", createdAt: new Date() },
      { id: "s25", name: "cough", description: "Persistent cough", category: "respiratory", createdAt: new Date() },
      { id: "s26", name: "high_fever", description: "High fever temperature", category: "general", createdAt: new Date() },
      { id: "s27", name: "sunken_eyes", description: "Sunken or hollow eyes", category: "general", createdAt: new Date() },
      { id: "s28", name: "breathlessness", description: "Difficulty breathing", category: "respiratory", createdAt: new Date() },
      { id: "s29", name: "sweating", description: "Excessive sweating", category: "general", createdAt: new Date() },
      { id: "s30", name: "dehydration", description: "Dehydration symptoms", category: "general", createdAt: new Date() },
      { id: "s31", name: "indigestion", description: "Digestive discomfort or indigestion", category: "digestive", createdAt: new Date() },
      { id: "s32", name: "headache", description: "Headache or head pain", category: "neurological", createdAt: new Date() },
      { id: "s33", name: "yellowish_skin", description: "Yellowing of the skin", category: "general", createdAt: new Date() },
      { id: "s34", name: "dark_urine", description: "Dark colored urine", category: "urinary", createdAt: new Date() },
      { id: "s35", name: "nausea", description: "Feeling of nausea", category: "digestive", createdAt: new Date() },
      { id: "s36", name: "loss_of_appetite", description: "Reduced appetite", category: "digestive", createdAt: new Date() },
      { id: "s37", name: "pain_behind_the_eyes", description: "Pain behind the eyes", category: "neurological", createdAt: new Date() },
      { id: "s38", name: "back_pain", description: "Lower back or upper back pain", category: "musculoskeletal", createdAt: new Date() },
      { id: "s39", name: "constipation", description: "Difficulty passing stool", category: "digestive", createdAt: new Date() },
      { id: "s40", name: "abdominal_pain", description: "Pain in the abdomen", category: "digestive", createdAt: new Date() },
      { id: "s41", name: "diarrhoea", description: "Frequent loose stools", category: "digestive", createdAt: new Date() },
      { id: "s42", name: "mild_fever", description: "Low to moderate fever", category: "general", createdAt: new Date() },
      { id: "s43", name: "yellow_urine", description: "Yellow colored urine", category: "urinary", createdAt: new Date() },
      { id: "s44", name: "yellowing_of_eyes", description: "Yellowing of the eyes", category: "general", createdAt: new Date() },
      { id: "s45", name: "acute_liver_failure", description: "Acute liver failure symptoms", category: "hepatic", createdAt: new Date() },
      { id: "s46", name: "fluid_overload", description: "Fluid retention or overload", category: "metabolic", createdAt: new Date() },
      { id: "s47", name: "swelling_of_stomach", description: "Stomach swelling or distention", category: "digestive", createdAt: new Date() },
      { id: "s48", name: "swelled_lymph_nodes", description: "Swollen lymph nodes", category: "immune", createdAt: new Date() },
      { id: "s49", name: "malaise", description: "General feeling of being unwell", category: "general", createdAt: new Date() },
      { id: "s50", name: "blurred_and_distorted_vision", description: "Blurred or distorted vision", category: "neurological", createdAt: new Date() },
      { id: "s51", name: "phlegm", description: "Excess phlegm or mucus", category: "respiratory", createdAt: new Date() },
      { id: "s52", name: "throat_irritation", description: "Throat irritation", category: "respiratory", createdAt: new Date() },
      { id: "s53", name: "redness_of_eyes", description: "Red or bloodshot eyes", category: "ocular", createdAt: new Date() },
      { id: "s54", name: "sinus_pressure", description: "Pressure or congestion in sinuses", category: "respiratory", createdAt: new Date() },
      { id: "s55", name: "runny_nose", description: "Runny or stuffy nose", category: "respiratory", createdAt: new Date() },
      { id: "s56", name: "congestion", description: "Nasal congestion", category: "respiratory", createdAt: new Date() },
      { id: "s57", name: "chest_pain", description: "Pain or discomfort in chest", category: "cardiovascular", createdAt: new Date() },
      { id: "s58", name: "weakness_in_limbs", description: "Weakness in arms or legs", category: "neurological", createdAt: new Date() },
      { id: "s59", name: "fast_heart_rate", description: "Rapid heartbeat", category: "cardiovascular", createdAt: new Date() },
      { id: "s60", name: "pain_during_bowel_movements", description: "Pain during bowel movements", category: "digestive", createdAt: new Date() },
      { id: "s61", name: "pain_in_anal_region", description: "Pain in the anal region", category: "digestive", createdAt: new Date() },
      { id: "s62", name: "bloody_stool", description: "Blood in stool", category: "digestive", createdAt: new Date() },
      { id: "s63", name: "irritation_in_anus", description: "Anal irritation or itching", category: "digestive", createdAt: new Date() },
      { id: "s64", name: "neck_pain", description: "Neck stiffness or pain", category: "musculoskeletal", createdAt: new Date() },
      { id: "s65", name: "dizziness", description: "Dizziness or lightheadedness", category: "neurological", createdAt: new Date() },
      { id: "s66", name: "cramps", description: "Muscle cramps", category: "musculoskeletal", createdAt: new Date() },
      { id: "s67", name: "bruising", description: "Easy bruising", category: "hematological", createdAt: new Date() },
      { id: "s68", name: "obesity", description: "Obesity or overweight", category: "metabolic", createdAt: new Date() },
      { id: "s69", name: "swollen_legs", description: "Swollen or puffy legs", category: "cardiovascular", createdAt: new Date() },
      { id: "s70", name: "swollen_blood_vessels", description: "Swollen blood vessels", category: "cardiovascular", createdAt: new Date() },
      { id: "s71", name: "puffy_face_and_eyes", description: "Puffy face and eyes", category: "general", createdAt: new Date() },
      { id: "s72", name: "enlarged_thyroid", description: "Enlarged thyroid gland", category: "endocrine", createdAt: new Date() },
      { id: "s73", name: "brittle_nails", description: "Brittle or weak nails", category: "dermatological", createdAt: new Date() },
      { id: "s74", name: "swollen_extremeties", description: "Swollen arms or legs", category: "general", createdAt: new Date() },
      { id: "s75", name: "excessive_hunger", description: "Increased hunger or appetite", category: "metabolic", createdAt: new Date() },
      { id: "s76", name: "extra_marital_contacts", description: "Extra marital sexual history", category: "sexual", createdAt: new Date() },
      { id: "s77", name: "drying_and_tingling_lips", description: "Dry and tingling lips", category: "neurological", createdAt: new Date() },
      { id: "s78", name: "slurred_speech", description: "Slurred or slow speech", category: "neurological", createdAt: new Date() },
      { id: "s79", name: "knee_pain", description: "Pain in the knees", category: "musculoskeletal", createdAt: new Date() },
      { id: "s80", name: "hip_joint_pain", description: "Pain in hip joints", category: "musculoskeletal", createdAt: new Date() },
      { id: "s81", name: "muscle_weakness", description: "General muscle weakness", category: "musculoskeletal", createdAt: new Date() },
      { id: "s82", name: "stiff_neck", description: "Stiffness in the neck", category: "musculoskeletal", createdAt: new Date() },
      { id: "s83", name: "swelling_joints", description: "Swollen or inflamed joints", category: "musculoskeletal", createdAt: new Date() },
      { id: "s84", name: "movement_stiffness", description: "Stiffness in movement", category: "musculoskeletal", createdAt: new Date() },
      { id: "s85", name: "spinning_movements", description: "Vertigo or spinning sensations", category: "neurological", createdAt: new Date() },
      { id: "s86", name: "loss_of_balance", description: "Loss of balance or coordination", category: "neurological", createdAt: new Date() },
      { id: "s87", name: "unsteadiness", description: "Unsteadiness or imbalance", category: "neurological", createdAt: new Date() },
      { id: "s88", name: "weakness_of_one_body_side", description: "Weakness on one side of body", category: "neurological", createdAt: new Date() },
      { id: "s89", name: "loss_of_smell", description: "Loss of sense of smell", category: "neurological", createdAt: new Date() },
      { id: "s90", name: "bladder_discomfort", description: "Discomfort or pain in bladder", category: "urinary", createdAt: new Date() },
      { id: "s91", name: "foul_smell_of_urine", description: "Bad smelling urine", category: "urinary", createdAt: new Date() },
      { id: "s92", name: "continuous_feel_of_urine", description: "Continuous urge to urinate", category: "urinary", createdAt: new Date() },
      { id: "s93", name: "passage_of_gases", description: "Excessive gas or bloating", category: "digestive", createdAt: new Date() },
      { id: "s94", name: "internal_itching", description: "Internal itching sensations", category: "dermatological", createdAt: new Date() },
      { id: "s95", name: "toxic_look_typhos", description: "Toxic appearance in typhoid", category: "infectious", createdAt: new Date() },
      { id: "s96", name: "depression", description: "Depression or low mood", category: "mental", createdAt: new Date() },
      { id: "s97", name: "irritability", description: "Irritability or anger", category: "mental", createdAt: new Date() },
      { id: "s98", name: "muscle_pain", description: "Muscle pain or body aches", category: "musculoskeletal", createdAt: new Date() },
      { id: "s99", name: "altered_sensorium", description: "Altered mental state", category: "neurological", createdAt: new Date() },
      { id: "s100", name: "red_spots_over_body", description: "Red spots on skin", category: "dermatological", createdAt: new Date() },
      { id: "s101", name: "belly_pain", description: "Pain in the belly area", category: "digestive", createdAt: new Date() },
      { id: "s102", name: "abnormal_menstruation", description: "Irregular menstrual periods", category: "reproductive", createdAt: new Date() },
      { id: "s103", name: "dischromic_patches", description: "Discolored patches on skin", category: "dermatological", createdAt: new Date() },
      { id: "s104", name: "watering_from_eyes", description: "Watering from eyes", category: "ocular", createdAt: new Date() },
      { id: "s105", name: "increased_appetite", description: "Increased appetite", category: "metabolic", createdAt: new Date() },
      { id: "s106", name: "polyuria", description: "Excessive urination", category: "urinary", createdAt: new Date() },
      { id: "s107", name: "family_history", description: "Family history of disease", category: "general", createdAt: new Date() },
      { id: "s108", name: "mucoid_sputum", description: "Mucus in sputum", category: "respiratory", createdAt: new Date() },
      { id: "s109", name: "rusty_sputum", description: "Rust-colored sputum", category: "respiratory", createdAt: new Date() },
      { id: "s110", name: "lack_of_concentration", description: "Inability to concentrate", category: "neurological", createdAt: new Date() },
      { id: "s111", name: "visual_disturbances", description: "Disturbances or problems with vision", category: "ocular", createdAt: new Date() },
      { id: "s112", name: "receiving_blood_transfusion", description: "History of blood transfusion", category: "infectious", createdAt: new Date() },
      { id: "s113", name: "receiving_unsterile_injections", description: "History of unsterile injections", category: "infectious", createdAt: new Date() },
      { id: "s114", name: "coma", description: "Loss of consciousness", category: "neurological", createdAt: new Date() },
      { id: "s115", name: "stomach_bleeding", description: "Bleeding in the stomach", category: "digestive", createdAt: new Date() },
      { id: "s116", name: "distention_of_abdomen", description: "Abdominal distension or bloating", category: "digestive", createdAt: new Date() },
      { id: "s117", name: "history_of_alcohol_consumption", description: "Regular alcohol use history", category: "general", createdAt: new Date() },
      { id: "s118", name: "fluid_overload", description: "Excess fluid accumulation", category: "metabolic", createdAt: new Date() },
      { id: "s119", name: "blood_in_sputum", description: "Blood in sputum or phlegm", category: "respiratory", createdAt: new Date() },
      { id: "s120", name: "prominent_veins_on_calf", description: "Varicose veins on calf", category: "cardiovascular", createdAt: new Date() },
      { id: "s121", name: "palpitations", description: "Irregular heartbeats", category: "cardiovascular", createdAt: new Date() },
      { id: "s122", name: "painful_walking", description: "Pain while walking", category: "musculoskeletal", createdAt: new Date() },
      { id: "s123", name: "pus_filled_pimples", description: "Pus-filled pimples or acne", category: "dermatological", createdAt: new Date() },
      { id: "s124", name: "blackheads", description: "Blackheads on skin", category: "dermatological", createdAt: new Date() },
      { id: "s125", name: "scurring", description: "Scarring of skin", category: "dermatological", createdAt: new Date() },
      { id: "s126", name: "skin_peeling", description: "Peeling skin or flaking", category: "dermatological", createdAt: new Date() },
      { id: "s127", name: "silver_like_dusting", description: "Silver scaling on skin", category: "dermatological", createdAt: new Date() },
      { id: "s128", name: "small_dents_in_nails", description: "Small dents or pits in nails", category: "dermatological", createdAt: new Date() },
      { id: "s129", name: "inflammatory_nails", description: "Inflammatory nail changes", category: "dermatological", createdAt: new Date() },
      { id: "s130", name: "blister", description: "Blistering or blisters on skin", category: "dermatological", createdAt: new Date() },
      { id: "s131", name: "redness_around_nose", description: "Redness around the nose", category: "dermatological", createdAt: new Date() },
      { id: "s132", name: "loss_of_taste", description: "Loss of sense of taste", category: "neurological", createdAt: new Date() },
      { id: "s133", name: "depression", description: "Mood depression", category: "mental", createdAt: new Date() },
    ];

    const demoUser: User = {
      id: "demo-user",
      username: "alex.johnson",
      email: "alex@example.com",
      password: "password123",
      createdAt: new Date()
    };
    this.users.set(demoUser.id, demoUser);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserSettings(id: string, settings: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...settings };
    this.users.set(id, updated);
    return updated;
  }

  // Task methods
  async getTasks(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getTasksByCategory(userId: string, category: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.userId === userId && task.category === category);
  }

  async getTask(id: string, userId: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    return task?.userId === userId ? task : undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      description: insertTask.description ?? null,
      completed: insertTask.completed ?? false,
      priority: insertTask.priority ?? 1,
      dueDate: insertTask.dueDate ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, userId: string, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task || task.userId !== userId) return undefined;

    const updatedTask = { ...task, ...updateData, updatedAt: new Date() };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task || task.userId !== userId) return false;
    return this.tasks.delete(id);
  }

  // Focus session methods
  async getFocusSessions(userId: string): Promise<FocusSession[]> {
    return Array.from(this.focusSessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getActiveFocusSession(userId: string): Promise<FocusSession | undefined> {
    return Array.from(this.focusSessions.values())
      .find(session => session.userId === userId && session.isActive);
  }

  async createFocusSession(insertSession: InsertFocusSession): Promise<FocusSession> {
    const id = randomUUID();
    const session: FocusSession = {
      ...insertSession,
      id,
      taskId: insertSession.taskId ?? null,
      completedDuration: insertSession.completedDuration ?? 0,
      isActive: insertSession.isActive ?? false,
      completed: insertSession.completed ?? false,
      startTime: insertSession.startTime ?? null,
      endTime: insertSession.endTime ?? null,
      createdAt: new Date()
    };
    this.focusSessions.set(id, session);
    return session;
  }

  async updateFocusSession(id: string, userId: string, updateData: Partial<InsertFocusSession>): Promise<FocusSession | undefined> {
    const session = this.focusSessions.get(id);
    if (!session || session.userId !== userId) return undefined;

    const updatedSession = { ...session, ...updateData };
    this.focusSessions.set(id, updatedSession);
    return updatedSession;
  }

  // Brain game methods
  async getBrainGameScores(userId: string, gameType?: string): Promise<BrainGameScore[]> {
    return Array.from(this.brainGameScores.values())
      .filter(score => score.userId === userId && (!gameType || score.gameType === gameType))
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createBrainGameScore(insertScore: InsertBrainGameScore): Promise<BrainGameScore> {
    const id = randomUUID();
    const score: BrainGameScore = {
      ...insertScore,
      id,
      level: insertScore.level ?? 1,
      duration: insertScore.duration ?? null,
      createdAt: new Date()
    };
    this.brainGameScores.set(id, score);
    return score;
  }

  async getTopScores(userId: string, gameType: string, limit = 10): Promise<BrainGameScore[]> {
    return Array.from(this.brainGameScores.values())
      .filter(score => score.userId === userId && score.gameType === gameType)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Fitness methods
  async clearFitnessData(userId: string): Promise<void> {
    for (const [id, data] of this.fitnessData.entries()) {
      if (data.userId === userId) {
        this.fitnessData.delete(id);
      }
    }
  }

  async getFitnessData(userId: string, date?: Date): Promise<FitnessData[]> {
    const data = Array.from(this.fitnessData.values())
      .filter(fitness => fitness.userId === userId);
    
    if (date) {
      const targetDate = date.toDateString();
      return data.filter(fitness => fitness.date!.toDateString() === targetDate);
    }
    
    return data.sort((a, b) => b.date!.getTime() - a.date!.getTime());
  }

  async createFitnessData(insertData: InsertFitnessData): Promise<FitnessData> {
    const id = randomUUID();
    const data: FitnessData = {
      ...insertData,
      id,
      date: insertData.date || new Date(),
      steps: insertData.steps ?? 0,
      exerciseMinutes: insertData.exerciseMinutes ?? 0,
      workoutType: insertData.workoutType ?? null,
      caloriesBurned: insertData.caloriesBurned ?? 0,
    };
    this.fitnessData.set(id, data);
    return data;
  }

  async updateFitnessData(userId: string, date: Date, updateData: Partial<InsertFitnessData>): Promise<FitnessData | undefined> {
    const targetDate = date.toDateString();
    const existing = Array.from(this.fitnessData.values())
      .find(fitness => fitness.userId === userId && fitness.date!.toDateString() === targetDate);

    if (!existing) return undefined;

    const updated = { ...existing, ...updateData };
    this.fitnessData.set(existing.id, updated);
    return updated;
  }

  // Notification methods
  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.read);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...insertNotification,
      id,
      read: insertNotification.read ?? false,
      createdAt: new Date()
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification || notification.userId !== userId) return false;
    
    notification.read = true;
    this.notifications.set(id, notification);
    return true;
  }

  async getJournals(userId: string): Promise<Journal[]> {
    return Array.from(this.journals.values())
      .filter((journal) => journal.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createJournal(insertJournal: InsertJournal): Promise<Journal> {
    const journal: Journal = {
      ...insertJournal,
      id: randomUUID(),
      burnoutRisk: insertJournal.burnoutRisk ?? false,
      burnoutScore: insertJournal.burnoutScore ?? 0,
      crisisFlag: insertJournal.crisisFlag ?? false,
      analysisSource: insertJournal.analysisSource ?? "local-safety-engine",
      createdAt: new Date(),
    };
    this.journals.set(journal.id, journal);
    return journal;
  }

  async getStressTriggers(userId: string, since?: Date): Promise<StressTrigger[]> {
    return Array.from(this.stressTriggers.values())
      .filter((trigger) => trigger.userId === userId && (!since || trigger.createdAt! >= since))
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createStressTrigger(insertTrigger: InsertStressTrigger): Promise<StressTrigger> {
    const trigger: StressTrigger = { ...insertTrigger, id: randomUUID(), createdAt: new Date() };
    this.stressTriggers.set(trigger.id, trigger);
    return trigger;
  }

  async getHealthSymptoms(): Promise<HealthSymptom[]> {
    return [...this.healthSymptoms].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getDiseasePredictions(userId: string): Promise<DiseasePrediction[]> {
    return Array.from(this.diseasePredictions.values())
      .filter(prediction => prediction.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createDiseasePrediction(insertPrediction: InsertDiseasePrediction): Promise<DiseasePrediction> {
    const prediction: DiseasePrediction = {
      ...insertPrediction,
      id: randomUUID(),
      symptoms: [...insertPrediction.symptoms],
      createdAt: new Date()
    };
    this.diseasePredictions.set(prediction.id, prediction);
    return prediction;
  }
}

export const storage = new MemStorage();
