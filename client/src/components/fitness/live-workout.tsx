import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Activity, Target, ArrowLeft, Repeat, Flame, Smile,
  Sparkles, Loader2, Dumbbell, Bot, Gauge, Volume2, VolumeX,
} from "lucide-react";
import ExerciseAvatar from "@/components/fitness/exercise-avatar";
import { useHolisticTracking, type TrackingFrame } from "@/hooks/use-holistic-tracking";
import { useFitnessCoach } from "@/hooks/use-fitness-coach";
import { speaker } from "@/lib/speech";
import {
  EXERCISES, getExercise, ExerciseSession, estimateBpm, type Cue,
} from "@/lib/pose-analysis";
import { cn } from "@/lib/utils";

interface LiveWorkoutProps {
  workoutType: string;
  onWorkoutEnd: () => void;
}

// Optionally drop a rigged humanoid .glb URL here (Mixamo / Ready Player Me) for a
// photoreal trainer. Left empty → the built-in offline 3D athlete is used.
const AVATAR_URL = "";

function mapWorkoutToExercise(workoutType: string): string {
  const t = (workoutType || "").toLowerCase();
  if (t.includes("push")) return "pushup";
  if (t.includes("curl") || t.includes("arm") || t.includes("hyper")) return "bicep-curl";
  if (t.includes("press") || t.includes("shoulder")) return "shoulder-press";
  if (t.includes("lunge")) return "lunge";
  if (t.includes("cardio") || t.includes("jump")) return "jumping-jack";
  return "squat";
}

interface UiMetrics {
  reps: number;
  formScore: number;
  depthPct: number;
  phase: "up" | "down";
  exertion: number;
  emotion: string;
  bpm: number;
  fps: number;
  cues: Cue[];
}

const emptyMetrics: UiMetrics = {
  reps: 0, formScore: 100, depthPct: 0, phase: "up",
  exertion: 0, emotion: "neutral", bpm: 80, fps: 0, cues: [],
};

export default function LiveWorkout({ workoutType, onWorkoutEnd }: LiveWorkoutProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState(() => mapWorkoutToExercise(workoutType));
  const [ui, setUi] = useState<UiMetrics>(emptyMetrics);
  const [voiceOn, setVoiceOn] = useState(false);
  const [coachMsg, setCoachMsg] = useState("Step into frame — I'll read your joints and angles in real time.");

  const sessionRef = useRef(new ExerciseSession(getExercise(exerciseId)));
  const bpmRef = useRef(80);
  const startRef = useRef(Date.now());
  const lastUiRef = useRef(0);
  const issueCountRef = useRef<Record<string, number>>({});
  const latestRef = useRef<UiMetrics>(emptyMetrics);

  const { getCoaching, isThinking } = useFitnessCoach();

  // Switch exercise
  useEffect(() => {
    sessionRef.current.setExercise(getExercise(exerciseId));
    issueCountRef.current = {};
    startRef.current = Date.now();
  }, [exerciseId]);

  // Webcam stream
  useEffect(() => {
    if (!cameraActive) return;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        setCamError(e?.message || "Camera access denied.");
        setCameraActive(false);
      }
    })();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [cameraActive]);

  const onFrame = useCallback((frame: TrackingFrame) => {
    const session = sessionRef.current;
    let snapshot = latestRef.current;

    if (frame.angles) {
      const fb = session.update(frame.angles);
      const repsPerMin = fb.reps / Math.max(1, (Date.now() - startRef.current) / 60000);
      bpmRef.current = estimateBpm(bpmRef.current, frame.face.exertion, repsPerMin);

      // aggregate recurring issues
      for (const c of fb.cues) {
        if (c.severity !== "good") issueCountRef.current[c.text] = (issueCountRef.current[c.text] || 0) + 1;
      }

      // Free browser voice coaching (self-gates when disabled)
      if (fb.repJustCompleted && fb.reps > 0 && fb.reps % 5 === 0) {
        speaker.speak(`${fb.reps} reps. Keep going!`, "high");
      } else {
        const spoken = fb.cues.find((c) => c.severity === "error") || fb.cues.find((c) => c.severity === "warn");
        if (spoken) speaker.speak(spoken.text, "normal");
      }

      snapshot = {
        reps: fb.reps,
        formScore: fb.formScore,
        depthPct: fb.depthPct,
        phase: fb.phase,
        exertion: frame.face.exertion,
        emotion: frame.face.emotion,
        bpm: Math.round(bpmRef.current),
        fps: frame.fps,
        cues: fb.cues,
      };
      latestRef.current = snapshot;
    } else {
      latestRef.current = { ...snapshot, fps: frame.fps };
    }

    // throttle UI updates to ~8/sec
    const now = performance.now();
    if (now - lastUiRef.current > 120) {
      lastUiRef.current = now;
      setUi(latestRef.current);
    }
  }, []);

  const { ready, loading, error } = useHolisticTracking({
    videoRef, canvasRef, enabled: cameraActive,
    options: { trackHands: true, trackFace: true, auxEveryNFrames: 2 },
    onFrame,
  });

  // Ask the AI master periodically once reps are flowing
  const askCoach = useCallback(async () => {
    const m = latestRef.current;
    const topIssues = Object.entries(issueCountRef.current).sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 3);
    try {
      const reply = await getCoaching({
        exercise: getExercise(exerciseId).name,
        reps: m.reps,
        formScore: m.formScore,
        avgFormScore: sessionRef.current.avgFormScore(),
        exertion: m.exertion,
        emotion: m.emotion,
        issues: topIssues,
        durationSec: Math.round((Date.now() - startRef.current) / 1000),
      });
      setCoachMsg(reply.message);
      speaker.speak(reply.message, "high");
    } catch { /* keep previous */ }
  }, [getCoaching, exerciseId]);

  // Stop any speech when the session unmounts
  useEffect(() => () => speaker.cancel(), []);

  useEffect(() => {
    if (!cameraActive) return;
    const id = setInterval(() => { if (latestRef.current.reps > 0) askCoach(); }, 18000);
    return () => clearInterval(id);
  }, [cameraActive, askCoach]);

  const exercise = getExercise(exerciseId);
  const liveCue = ui.cues.find((c) => c.severity === "error") || ui.cues.find((c) => c.severity === "warn") || ui.cues.find((c) => c.severity === "good");

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#020617] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 bg-black/40 backdrop-blur-md border-b border-white/5 absolute top-0 w-full z-50">
        <Button variant="ghost" onClick={onWorkoutEnd} className="text-white hover:bg-white/10 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" /> End Session
        </Button>
        <div className="flex items-center gap-3">
          {ui.fps > 0 && <Badge className="bg-white/5 text-white/60 border-0 font-mono text-xs">{ui.fps} FPS</Badge>}
          {speaker.isSupported && (
            <Button
              variant="ghost" size="sm"
              onClick={() => setVoiceOn(speaker.toggle())}
              className={cn("rounded-xl", voiceOn ? "text-emerald-400 hover:bg-emerald-500/10" : "text-white/50 hover:bg-white/10")}
              data-testid="button-voice-toggle"
              title={voiceOn ? "Voice coach on" : "Voice coach off"}
            >
              {voiceOn ? <Volume2 className="h-4 w-4 mr-1" /> : <VolumeX className="h-4 w-4 mr-1" />}
              {voiceOn ? "Voice On" : "Voice"}
            </Button>
          )}
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5 font-mono tracking-widest">
            {ready ? "TRACKING ONLINE" : loading ? "LOADING AI…" : "STANDBY"}
            <span className={cn("w-2 h-2 rounded-full ml-2", ready ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
          </Badge>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 pt-[64px]">
        {/* LEFT: Camera + holistic overlay */}
        <div className="relative bg-[#050505] border-r border-white/5 flex flex-col overflow-hidden">
          {!cameraActive ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Camera className="h-20 w-20 text-emerald-500/50 mb-6" />
              <p className="text-white/60 max-w-md mb-8">
                Full-body holistic tracking — 33 body joints, both hands (finger joints), 468-point face mesh,
                real joint angles, ankles & ground. Runs on-device in your browser.
              </p>
              {camError && <p className="text-rose-400 text-sm mb-4">{camError}</p>}
              <Button onClick={() => setCameraActive(true)} className="h-14 px-10 text-lg bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] font-bold tracking-wide">
                START CAMERA
              </Button>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col overflow-hidden bg-black">
              <div className="relative w-full flex-1 flex items-center justify-center">
                <div className="relative w-full h-full aspect-video">
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] opacity-70" />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] z-10" />
                  {(loading || !ready) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                      <div className="flex items-center gap-3 text-emerald-300"><Loader2 className="h-6 w-6 animate-spin" /> Loading tracking models…</div>
                    </div>
                  )}
                  {error && <div className="absolute bottom-4 left-4 right-4 bg-rose-500/20 text-rose-200 text-sm p-3 rounded-lg z-30">{error}</div>}
                </div>
              </div>

              {/* Live cue banner */}
              <AnimatePresence>
                {liveCue && (
                  <motion.div
                    key={liveCue.text}
                    initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
                    className={cn(
                      "absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full font-semibold text-sm backdrop-blur-md border",
                      liveCue.severity === "error" && "bg-rose-500/20 border-rose-400/40 text-rose-100",
                      liveCue.severity === "warn" && "bg-amber-500/20 border-amber-400/40 text-amber-100",
                      liveCue.severity === "good" && "bg-emerald-500/20 border-emerald-400/40 text-emerald-100",
                    )}
                  >
                    {liveCue.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Metrics dock */}
              <div className="absolute bottom-5 left-5 right-5 grid grid-cols-4 gap-3 z-30">
                <MetricCard icon={Repeat} label="REPS" value={`${ui.reps}`} color="emerald" />
                <MetricCard icon={Target} label="FORM" value={`${ui.formScore}%`} color="blue" progress={ui.formScore} />
                <MetricCard icon={Flame} label="EXERTION" value={`${Math.round(ui.exertion * 100)}%`} color="orange" progress={ui.exertion * 100} />
                <MetricCard icon={Activity} label="HR (est)" value={`${ui.bpm}`} color="rose" progress={(ui.bpm / 200) * 100} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Avatar trainer + coach */}
        <div className="relative bg-[#0a0f1e] overflow-hidden flex flex-col">
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:40px_40px]" />

          {/* Exercise selector */}
          <div className="relative z-10 p-4 flex flex-wrap gap-2 border-b border-white/5">
            {EXERCISES.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setExerciseId(ex.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                  ex.id === exerciseId ? "bg-blue-500/20 border-blue-400/40 text-blue-100" : "bg-white/5 border-white/10 text-white/50 hover:text-white",
                )}
                data-testid={`exercise-${ex.id}`}
              >
                {ex.name}
              </button>
            ))}
          </div>

          {/* Avatar */}
          <div className="relative flex-1 min-h-0">
            <div className="absolute top-4 left-6 z-10">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Dumbbell className="h-6 w-6 text-blue-400" /> {exercise.name}
              </h2>
              <p className="text-blue-400/80 text-xs font-mono uppercase tracking-widest mt-1">{exercise.muscle}</p>
            </div>
            <ExerciseAvatar exerciseId={exerciseId} avatarUrl={AVATAR_URL || undefined} speed={3} className="w-full h-full" />
            {/* depth gauge */}
            <div className="absolute right-5 top-1/2 -translate-y-1/2 h-40 w-2 bg-white/10 rounded-full overflow-hidden z-10">
              <motion.div className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-blue-400" animate={{ height: `${ui.depthPct}%` }} />
            </div>
          </div>

          {/* Coach panel */}
          <div className="relative z-10 p-5 border-t border-white/5 bg-black/30 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">AI Master</span>
                  <Badge className="bg-white/5 text-white/50 border-0 text-[10px] flex items-center gap-1">
                    <Smile className="h-3 w-3" /> {ui.emotion}
                  </Badge>
                  {isThinking && <Loader2 className="h-3 w-3 animate-spin text-blue-400" />}
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{coachMsg}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={askCoach} disabled={isThinking || !cameraActive} className="text-blue-300 hover:bg-blue-500/10 shrink-0">
                <Sparkles className="h-4 w-4 mr-1" /> Coach me
              </Button>
            </div>
            <p className="text-[11px] text-white/30 mt-3 flex items-center gap-2">
              <Gauge className="h-3 w-3" /> {exercise.instructions}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({ icon: Icon, label, value, color, progress }: {
  icon: any; label: string; value: string; color: "emerald" | "blue" | "orange" | "rose"; progress?: number;
}) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-400 border-emerald-500/20",
    blue: "text-blue-400 border-blue-500/20",
    orange: "text-orange-400 border-orange-500/20",
    rose: "text-rose-400 border-rose-500/20",
  };
  const bars: Record<string, string> = {
    emerald: "bg-emerald-500", blue: "bg-blue-500", orange: "bg-orange-500", rose: "bg-rose-500",
  };
  return (
    <Card className={cn("bg-black/60 backdrop-blur-2xl border rounded-2xl", colors[color])}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className={cn("font-mono text-[10px] tracking-wider flex items-center gap-1", colors[color])}>
            <Icon className="w-3 h-3" /> {label}
          </span>
          <span className="text-white font-black text-lg leading-none">{value}</span>
        </div>
        {progress !== undefined && (
          <Progress value={Math.max(0, Math.min(100, progress))} className="h-1.5 bg-white/5" indicatorClassName={bars[color]} />
        )}
      </CardContent>
    </Card>
  );
}
