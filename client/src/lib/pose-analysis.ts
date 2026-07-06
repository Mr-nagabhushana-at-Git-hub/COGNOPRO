// Pose analysis: joint-angle math, exercise form logic, rep counting, ground
// estimation and face-blendshape emotion/exertion. Feeds the on-device AI coach.
//
// Angles are computed on MediaPipe *world* landmarks (metric, view-invariant) so
// "bend more / less" cues are camera-angle independent.

export interface LM { x: number; y: number; z: number; visibility?: number }

// MediaPipe Pose (33) landmark indices we use.
export const POSE = {
  NOSE: 0,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT: 31, RIGHT_FOOT: 32,
} as const;

/** Angle (degrees) at vertex b formed by a-b-c. */
export function angleAt(a: LM, b: LM, c: LM): number {
  const bax = a.x - b.x, bay = a.y - b.y, baz = a.z - b.z;
  const bcx = c.x - b.x, bcy = c.y - b.y, bcz = c.z - b.z;
  const dot = bax * bcx + bay * bcy + baz * bcz;
  const magBA = Math.hypot(bax, bay, baz);
  const magBC = Math.hypot(bcx, bcy, bcz);
  if (magBA === 0 || magBC === 0) return 180;
  let cos = dot / (magBA * magBC);
  cos = Math.max(-1, Math.min(1, cos));
  return (Math.acos(cos) * 180) / Math.PI;
}

export interface JointAngles {
  leftKnee: number; rightKnee: number;
  leftHip: number; rightHip: number;
  leftElbow: number; rightElbow: number;
  leftShoulder: number; rightShoulder: number;
  backLean: number; // torso lean from vertical (deg); 0 = upright
}

export function computeAngles(lm: LM[]): JointAngles {
  const g = (i: number) => lm[i];
  const leftKnee = angleAt(g(POSE.LEFT_HIP), g(POSE.LEFT_KNEE), g(POSE.LEFT_ANKLE));
  const rightKnee = angleAt(g(POSE.RIGHT_HIP), g(POSE.RIGHT_KNEE), g(POSE.RIGHT_ANKLE));
  const leftHip = angleAt(g(POSE.LEFT_SHOULDER), g(POSE.LEFT_HIP), g(POSE.LEFT_KNEE));
  const rightHip = angleAt(g(POSE.RIGHT_SHOULDER), g(POSE.RIGHT_HIP), g(POSE.RIGHT_KNEE));
  const leftElbow = angleAt(g(POSE.LEFT_SHOULDER), g(POSE.LEFT_ELBOW), g(POSE.LEFT_WRIST));
  const rightElbow = angleAt(g(POSE.RIGHT_SHOULDER), g(POSE.RIGHT_ELBOW), g(POSE.RIGHT_WRIST));
  const leftShoulder = angleAt(g(POSE.LEFT_ELBOW), g(POSE.LEFT_SHOULDER), g(POSE.LEFT_HIP));
  const rightShoulder = angleAt(g(POSE.RIGHT_ELBOW), g(POSE.RIGHT_SHOULDER), g(POSE.RIGHT_HIP));

  // Torso lean: angle of shoulder-midpoint -> hip-midpoint vector from vertical.
  const shoulderMid = mid(g(POSE.LEFT_SHOULDER), g(POSE.RIGHT_SHOULDER));
  const hipMid = mid(g(POSE.LEFT_HIP), g(POSE.RIGHT_HIP));
  const dx = shoulderMid.x - hipMid.x;
  const dy = shoulderMid.y - hipMid.y;
  const backLean = Math.abs((Math.atan2(dx, -dy) * 180) / Math.PI);

  return { leftKnee, rightKnee, leftHip, rightHip, leftElbow, rightElbow, leftShoulder, rightShoulder, backLean };
}

function mid(a: LM, b: LM): LM {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

// ─── Ground plane estimate (from feet, using normalized/screen landmarks) ───
export interface Ground { y: number; planted: boolean }
export function estimateGround(lmScreen: LM[]): Ground {
  const heelL = lmScreen[POSE.LEFT_HEEL], heelR = lmScreen[POSE.RIGHT_HEEL];
  const footL = lmScreen[POSE.LEFT_FOOT], footR = lmScreen[POSE.RIGHT_FOOT];
  const pts = [heelL, heelR, footL, footR].filter((p) => p && (p.visibility ?? 1) > 0.5);
  if (!pts.length) return { y: 0.95, planted: false };
  const y = Math.max(...pts.map((p) => p.y));
  const planted = pts.length >= 2;
  return { y, planted };
}

// ─── Exercise library ───
export type CueSeverity = "good" | "warn" | "error";
export interface Cue { text: string; severity: CueSeverity }

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  instructions: string;
  /** Primary joint angle that drives the rep (returns degrees). */
  primaryAngle: (a: JointAngles) => number;
  /** Below this angle = bottom of rep. */
  downAngle: number;
  /** Above this angle = top of rep. */
  upAngle: number;
  /** Ideal deepest angle at the bottom (for depth scoring). */
  idealBottom: number;
  /** Per-frame form checks producing cues + a 0..1 penalty. */
  checks: (a: JointAngles, phase: RepPhase) => { cues: Cue[]; penalty: number };
}

export type RepPhase = "up" | "down";

const kneeMin = (a: JointAngles) => Math.min(a.leftKnee, a.rightKnee);
const elbowMin = (a: JointAngles) => Math.min(a.leftElbow, a.rightElbow);
const elbowAvg = (a: JointAngles) => (a.leftElbow + a.rightElbow) / 2;
const shoulderAvg = (a: JointAngles) => (a.leftShoulder + a.rightShoulder) / 2;

export const EXERCISES: Exercise[] = [
  {
    id: "squat",
    name: "Squat",
    muscle: "Quads · Glutes · Core",
    instructions: "Feet shoulder-width, chest up. Drive hips back and down until thighs are near parallel, then stand tall.",
    primaryAngle: kneeMin,
    downAngle: 100,
    upAngle: 160,
    idealBottom: 80,
    checks: (a, phase) => {
      const cues: Cue[] = [];
      let penalty = 0;
      if (phase === "down") {
        const knee = kneeMin(a);
        if (knee > 110) { cues.push({ text: "Go lower — bend your knees more", severity: "warn" }); penalty += 0.35; }
        else if (knee > 95) { cues.push({ text: "Almost there — sink a little deeper", severity: "warn" }); penalty += 0.15; }
        else cues.push({ text: "Great depth", severity: "good" });
      }
      if (a.backLean > 45) { cues.push({ text: "Keep your chest up — less forward lean", severity: "error" }); penalty += 0.3; }
      else if (a.backLean > 32) { cues.push({ text: "Lift your chest slightly", severity: "warn" }); penalty += 0.12; }
      return { cues, penalty };
    },
  },
  {
    id: "pushup",
    name: "Push-up",
    muscle: "Chest · Triceps · Core",
    instructions: "Hands under shoulders, body in a straight line. Lower until elbows ~90°, then press up.",
    primaryAngle: elbowMin,
    downAngle: 100,
    upAngle: 155,
    idealBottom: 85,
    checks: (a, phase) => {
      const cues: Cue[] = [];
      let penalty = 0;
      if (phase === "down") {
        const e = elbowMin(a);
        if (e > 110) { cues.push({ text: "Lower your chest more", severity: "warn" }); penalty += 0.3; }
        else cues.push({ text: "Good range", severity: "good" });
      }
      const hipSag = Math.abs(180 - (a.leftHip + a.rightHip) / 2);
      if (hipSag > 30) { cues.push({ text: "Keep hips in line — don't sag", severity: "error" }); penalty += 0.3; }
      return { cues, penalty };
    },
  },
  {
    id: "lunge",
    name: "Lunge",
    muscle: "Quads · Glutes",
    instructions: "Step forward, lower until both knees are ~90°. Keep the front knee over the ankle.",
    primaryAngle: kneeMin,
    downAngle: 110,
    upAngle: 160,
    idealBottom: 90,
    checks: (a, phase) => {
      const cues: Cue[] = [];
      let penalty = 0;
      if (phase === "down" && kneeMin(a) > 120) { cues.push({ text: "Drop your back knee lower", severity: "warn" }); penalty += 0.25; }
      if (a.backLean > 30) { cues.push({ text: "Stay upright", severity: "warn" }); penalty += 0.15; }
      return { cues, penalty };
    },
  },
  {
    id: "bicep-curl",
    name: "Bicep Curl",
    muscle: "Biceps",
    instructions: "Elbows tucked at your sides. Curl the weight up, squeeze, then lower under control.",
    primaryAngle: elbowAvg,
    downAngle: 60,   // "down" here = fully curled (small angle)
    upAngle: 150,
    idealBottom: 45,
    checks: (a, phase) => {
      const cues: Cue[] = [];
      let penalty = 0;
      if (phase === "down") {
        if (elbowAvg(a) > 70) { cues.push({ text: "Curl higher — full squeeze", severity: "warn" }); penalty += 0.25; }
        else cues.push({ text: "Full contraction", severity: "good" });
      }
      if (shoulderAvg(a) > 45) { cues.push({ text: "Stop swinging — keep elbows pinned", severity: "warn" }); penalty += 0.2; }
      return { cues, penalty };
    },
  },
  {
    id: "shoulder-press",
    name: "Shoulder Press",
    muscle: "Shoulders · Triceps",
    instructions: "Press from shoulder height until arms are fully extended overhead, then lower to ears.",
    primaryAngle: elbowAvg,
    downAngle: 95,
    upAngle: 160,
    idealBottom: 85,
    checks: (a, phase) => {
      const cues: Cue[] = [];
      let penalty = 0;
      if (phase === "up" && elbowAvg(a) < 150) { cues.push({ text: "Press all the way up — lock out", severity: "warn" }); penalty += 0.2; }
      if (a.backLean > 25) { cues.push({ text: "Brace your core — don't arch back", severity: "warn" }); penalty += 0.2; }
      return { cues, penalty };
    },
  },
  {
    id: "jumping-jack",
    name: "Jumping Jacks",
    muscle: "Full body · Cardio",
    instructions: "Explode arms overhead and feet out, then return. Keep a steady rhythm.",
    primaryAngle: shoulderAvg,
    downAngle: 40,    // arms down
    upAngle: 130,     // arms overhead
    idealBottom: 150,
    checks: (a, phase) => {
      const cues: Cue[] = [];
      if (phase === "up" && shoulderAvg(a) < 120) cues.push({ text: "Reach arms fully overhead", severity: "warn" });
      return { cues, penalty: phase === "up" && shoulderAvg(a) < 120 ? 0.2 : 0 };
    },
  },
];

export function getExercise(id: string): Exercise {
  return EXERCISES.find((e) => e.id === id) ?? EXERCISES[0];
}

// ─── Rep + form session (finite-state machine) ───
export interface FrameFeedback {
  reps: number;
  phase: RepPhase;
  depthPct: number;   // 0..100 how deep into the current rep
  formScore: number;  // 0..100 smoothed
  cues: Cue[];
  repJustCompleted: boolean;
}

export class ExerciseSession {
  private exercise: Exercise;
  private phase: RepPhase = "up";
  private reps = 0;
  private formEma = 100;
  private repFormMin = 100; // worst form during current rep
  repFormScores: number[] = [];

  constructor(exercise: Exercise) {
    this.exercise = exercise;
  }

  setExercise(ex: Exercise) {
    this.exercise = ex;
    this.phase = "up";
    this.reps = 0;
    this.formEma = 100;
    this.repFormMin = 100;
    this.repFormScores = [];
  }

  get repCount() { return this.reps; }

  update(angles: JointAngles): FrameFeedback {
    const ex = this.exercise;
    const val = ex.primaryAngle(angles);
    // Support both "down = small angle" (curl) and "down = large" via thresholds.
    const downIsSmall = ex.downAngle < ex.upAngle;

    const inDownZone = downIsSmall ? val <= ex.downAngle : val >= ex.downAngle;
    const inUpZone = downIsSmall ? val >= ex.upAngle : val <= ex.upAngle;

    let repJustCompleted = false;
    if (this.phase === "up" && inDownZone) {
      this.phase = "down";
      this.repFormMin = 100;
    } else if (this.phase === "down" && inUpZone) {
      this.phase = "up";
      this.reps += 1;
      repJustCompleted = true;
      this.repFormScores.push(Math.round(this.repFormMin));
    }

    const { cues, penalty } = ex.checks(angles, this.phase);
    const frameForm = Math.max(0, 100 - penalty * 100);
    // EMA smoothing so the score doesn't flicker.
    this.formEma = this.formEma * 0.85 + frameForm * 0.15;
    this.repFormMin = Math.min(this.repFormMin, this.formEma);

    // Depth: map val between up and ideal-bottom to 0..100.
    const span = Math.abs(ex.upAngle - ex.idealBottom) || 1;
    let depthPct = downIsSmall
      ? ((ex.upAngle - val) / span) * 100
      : ((val - ex.upAngle) / span) * 100;
    depthPct = Math.max(0, Math.min(100, depthPct));

    return {
      reps: this.reps,
      phase: this.phase,
      depthPct: Math.round(depthPct),
      formScore: Math.round(this.formEma),
      cues,
      repJustCompleted,
    };
  }

  avgFormScore(): number {
    if (!this.repFormScores.length) return Math.round(this.formEma);
    return Math.round(this.repFormScores.reduce((a, b) => a + b, 0) / this.repFormScores.length);
  }
}

// ─── Face blendshape → emotion / exertion / strain ───
export interface FaceState {
  emotion: string;
  exertion: number;  // 0..1  (facial strain proxy for effort / "sweat"/heat)
  strain: number;    // 0..1  brow + squint tension
  mouthOpen: number; // 0..1  breathing-hard proxy
  focus: number;     // 0..1
}

type Blend = { categoryName?: string; displayName?: string; score: number };

function bs(map: Record<string, number>, ...names: string[]): number {
  let s = 0, n = 0;
  for (const name of names) { if (name in map) { s += map[name]; n++; } }
  return n ? s / n : 0;
}

export function analyzeFace(blendshapes: Blend[] | undefined | null): FaceState {
  if (!blendshapes?.length) {
    return { emotion: "neutral", exertion: 0, strain: 0, mouthOpen: 0, focus: 0.5 };
  }
  const map: Record<string, number> = {};
  for (const b of blendshapes) {
    const key = b.categoryName || b.displayName || "";
    if (key) map[key] = b.score;
  }

  const browDown = bs(map, "browDownLeft", "browDownRight");
  const eyeSquint = bs(map, "eyeSquintLeft", "eyeSquintRight");
  const mouthPress = bs(map, "mouthPressLeft", "mouthPressRight");
  const jawOpen = map["jawOpen"] ?? 0;
  const smile = bs(map, "mouthSmileLeft", "mouthSmileRight");
  const browUp = bs(map, "browInnerUp", "browOuterUpLeft", "browOuterUpRight");
  const cheekPuff = map["cheekPuff"] ?? 0;

  const strain = clamp01(browDown * 0.6 + eyeSquint * 0.5 + mouthPress * 0.4);
  // Effort / exertion proxy: strain + open-mouth breathing + cheek puff.
  const exertion = clamp01(strain * 0.6 + jawOpen * 0.35 + cheekPuff * 0.4);
  const focus = clamp01(eyeSquint * 0.5 + browDown * 0.3 + (1 - jawOpen) * 0.2);

  let emotion = "neutral";
  if (smile > 0.35) emotion = "happy";
  else if (browDown > 0.35 && eyeSquint > 0.2) emotion = "straining";
  else if (jawOpen > 0.4 && browUp > 0.2) emotion = "fatigued";
  else if (browUp > 0.4) emotion = "surprised";
  else if (mouthPress > 0.4) emotion = "focused";

  return { emotion, exertion, strain, mouthOpen: jawOpen, focus };
}

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }

/** Rough heart-rate proxy from exertion + rep cadence (BPM). No sensor = estimate. */
export function estimateBpm(baseBpm: number, exertion: number, repsPerMin: number): number {
  const target = 70 + exertion * 70 + Math.min(repsPerMin, 40) * 1.1;
  return Math.round(baseBpm * 0.9 + target * 0.1);
}
