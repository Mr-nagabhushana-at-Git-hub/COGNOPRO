import { motion } from "framer-motion";
import { Link } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, OrbitControls, Sparkles as DreiSparkles, Stars } from "@react-three/drei";
import { useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import * as THREE from "three";
import {
  Activity,
  ArrowRight,
  Brain,
  CalendarDays,
  Download,
  HeartHandshake,
  MoonStar,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  TimerReset,
  Waves,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MonkModeModal from "@/components/modals/monk-mode-modal";

type Tone = "green" | "blue" | "purple" | "amber";

type Workspace = {
  openTasks: number;
  overdueTasks: number;
  completedTasks: number;
  focusSessions: number;
  journalEntries: number;
  notes: number;
  events: number;
  upcomingEvents: number;
  fitnessDays: number;
  workoutSessions: number;
  healthPredictions: number;
  latestEmotion: string;
  latestIntensity: number;
  avgBurnout: number;
  crisisCount: number;
  latestSteps: number;
  topTasks: Array<{ title: string; category: string; priority: number | null; dueDate: string | null }>;
  nextEvents: Array<{ title: string; startTime: string; priority: string }>;
  pinnedNotes: string[];
};

type AgentWorkspace = {
  title: string;
  tagline: string;
  providerMode: string;
  readinessScore: number;
  workspace: Workspace;
  dailyPulse: { state: string; headline: string; summary: string };
  focusProtocol: Array<{ title: string; detail: string }>;
  monkModePlan: { recommendedDuration: number; blockers: string[]; summary: string };
  insights: Array<{ title: string; value: string; detail: string; tone: Tone }>;
};

const toneClasses: Record<Tone, string> = {
  green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200",
  blue: "border-sky-400/20 bg-sky-400/10 text-sky-700 dark:text-sky-200",
  purple: "border-violet-400/20 bg-violet-400/10 text-violet-700 dark:text-violet-200",
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-700 dark:text-amber-200"
};

function PulseCore() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.12;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.16;
    const scale = 1 + Math.sin(state.clock.elapsedTime * 1.3) * 0.08;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <Float speed={1.5} rotationIntensity={1.2} floatIntensity={2.2}>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1.55, 0.38, 180, 32]} />
        <MeshDistortMaterial
          color="#14b8a6"
          emissive="#0891b2"
          emissiveIntensity={0.45}
          distort={0.24}
          speed={1.8}
          roughness={0.12}
          metalness={0.75}
        />
      </mesh>
      <mesh scale={2.35}>
        <torusGeometry args={[1.18, 0.03, 20, 120]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
    </Float>
  );
}

function PulseScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1.4} color="#14b8a6" />
      <pointLight position={[-8, -8, -5]} intensity={0.8} color="#38bdf8" />
      <PulseCore />
      <Stars radius={100} depth={50} count={2600} factor={3} saturation={0} fade speed={0.35} />
      <DreiSparkles count={140} scale={10} size={2} speed={0.2} opacity={0.35} color="#14b8a6" />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.28} />
    </>
  );
}

export default function UltraAgent() {
  const [isMonkModeOpen, setIsMonkModeOpen] = useState(false);
  const { data } = useQuery<AgentWorkspace>({
    queryKey: ["/api/agentic/workspace"],
    staleTime: 15_000
  });

  const workspace = data?.workspace;

  return (
    <>
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.15),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_72%_88%,rgba(14,165,233,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.16),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_72%_88%,rgba(14,165,233,0.10),transparent_24%)]" />
          <div className="absolute right-[-8%] top-[-5%] h-[420px] w-[420px] opacity-70">
            <Canvas camera={{ position: [0, 0, 7], fov: 42 }}>
              <PulseScene />
            </Canvas>
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"
          >
            <div className="rounded-[28px] border border-border/50 bg-card/70 p-6 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-8">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200">
                  <HeartHandshake className="mr-1 h-3.5 w-3.5" />
                  Personal health
                </Badge>
                <Badge className="border-sky-400/20 bg-sky-400/10 text-sky-700 dark:text-sky-200">
                  <MoonStar className="mr-1 h-3.5 w-3.5" />
                  Monk mode ready
                </Badge>
                <Badge className="border-violet-400/20 bg-violet-400/10 text-violet-700 dark:text-violet-200">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Live workspace
                </Badge>
              </div>

              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                {data?.title ?? "COGNO Personal Pulse"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {data?.tagline ?? "Reading your current health, focus, recovery, and planner state."}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SignalCard
                  icon={Brain}
                  title="Emotional signal"
                  value={workspace?.latestEmotion ?? "none yet"}
                  detail={workspace?.journalEntries ? `${workspace.latestIntensity}/10 latest intensity` : "No reflection logged yet"}
                />
                <SignalCard
                  icon={Activity}
                  title="Movement"
                  value={`${workspace?.latestSteps ?? 0}`}
                  detail={`${workspace?.fitnessDays ?? 0} tracked day${workspace?.fitnessDays === 1 ? "" : "s"}`}
                />
                <SignalCard
                  icon={CalendarDays}
                  title="Planner"
                  value={`${workspace?.upcomingEvents ?? 0}`}
                  detail={workspace?.nextEvents[0]?.title ?? "No upcoming block"}
                />
                <SignalCard
                  icon={Target}
                  title="Readiness"
                  value={`${data?.readinessScore ?? 0}/100`}
                  detail={data?.dailyPulse.headline ?? "Building your daily pulse"}
                />
              </div>
            </div>

            <div className="grid gap-6">
              <CardPanel title="Daily Pulse" icon={Waves}>
                <div className="rounded-3xl border border-border/50 bg-background/55 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Today</p>
                  <h2 className="mt-2 text-2xl font-black text-foreground">{data?.dailyPulse.headline ?? "Loading your current state"}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{data?.dailyPulse.summary ?? "Waiting for workspace metrics."}</p>
                </div>
              </CardPanel>

              <CardPanel title="Monk Mode" icon={ShieldCheck}>
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">{data?.monkModePlan.summary ?? "Preparing a distraction-blocking plan from your current state."}</p>
                  <div className="flex flex-wrap gap-2">
                    {(data?.monkModePlan.blockers ?? []).map((blocker) => (
                      <Badge key={blocker} variant="outline" className="border-border bg-background/50 text-foreground">
                        {blocker}
                      </Badge>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                    Recommended focus block: {data?.monkModePlan.recommendedDuration ?? 25} minutes
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setIsMonkModeOpen(true)} className="bg-primary text-primary-foreground hover:opacity-95">
                      <TimerReset className="mr-2 h-4 w-4" />
                      Start Monk Mode
                    </Button>
                    <Button asChild variant="outline" className="border-border bg-background/55">
                      <a href="/monk-mode-extension.zip" download>
                        <Download className="mr-2 h-4 w-4" />
                        Extension
                      </a>
                    </Button>
                  </div>
                </div>
              </CardPanel>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr]"
          >
            <CardPanel title="Focus Protocol" icon={Zap}>
              <div className="grid gap-4 md:grid-cols-2">
                {(data?.focusProtocol ?? []).map((item, index) => (
                  <div key={item.title} className="rounded-3xl border border-border/50 bg-background/55 p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 0{index + 1}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </CardPanel>

            <CardPanel title="Personal Tracker" icon={Activity}>
              <div className="grid gap-4 md:grid-cols-2">
                {(data?.insights ?? []).map((item) => (
                  <div key={item.title} className={`rounded-3xl border p-5 ${toneClasses[item.tone]}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">{item.title}</span>
                      <span className="font-mono text-xl font-black">{item.value}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 opacity-85">{item.detail}</p>
                  </div>
                ))}
              </div>
            </CardPanel>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 grid gap-6 lg:grid-cols-3"
          >
            <CardPanel title="Recovery Anchors" icon={NotebookPen}>
              <div className="space-y-3">
                {workspace?.pinnedNotes?.length ? (
                  workspace.pinnedNotes.map((note) => (
                    <div key={note} className="rounded-2xl border border-border/50 bg-background/55 p-4 text-sm text-foreground">
                      {note}
                    </div>
                  ))
                ) : (
                  <EmptyHint text="Pinned notes and grounding reminders will show up here." />
                )}
              </div>
            </CardPanel>

            <CardPanel title="Next Commitments" icon={CalendarDays}>
              <div className="space-y-3">
                {workspace?.nextEvents?.length ? (
                  workspace.nextEvents.map((event) => (
                    <div key={`${event.title}-${event.startTime}`} className="rounded-2xl border border-border/50 bg-background/55 p-4">
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{event.priority} priority</p>
                    </div>
                  ))
                ) : (
                  <EmptyHint text="No upcoming planner events are stored yet." />
                )}
              </div>
            </CardPanel>

            <CardPanel title="Quick Routes" icon={Target}>
              <div className="grid gap-3">
                <QuickRoute href="/wellness" icon={HeartHandshake} title="Mental Wellness" description="Reflect, regulate, and review stress patterns." />
                <QuickRoute href="/fitness" icon={Activity} title="Fitness Tracker" description="Track steps, history, and recovery movement." />
                <QuickRoute href="/health-predict" icon={Stethoscope} title="Health Predict" description="Review symptoms and health history." />
                <QuickRoute href="/planner" icon={CalendarDays} title="Planner" description="Reserve clean time for recovery and work." />
              </div>
            </CardPanel>
          </motion.section>
        </div>
      </div>

      <MonkModeModal isOpen={isMonkModeOpen} onClose={() => setIsMonkModeOpen(false)} />
    </>
  );
}

function CardPanel({ title, icon: Icon, children }: { title: string; icon: typeof Activity; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-border/50 bg-card/72 p-6 shadow-[var(--shadow-card)] backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SignalCard({
  icon: Icon,
  title,
  value,
  detail
}: {
  icon: typeof Activity;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-border/50 bg-background/55 p-4 backdrop-blur-md">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <p className="mt-1 text-xl font-black text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-5 text-sm leading-6 text-muted-foreground">
      {text}
    </div>
  );
}

function QuickRoute({
  href,
  icon: Icon,
  title,
  description
}: {
  href: string;
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <div className="group rounded-2xl border border-border/50 bg-background/55 p-4 transition-all hover:border-primary/30 hover:bg-background/75">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-foreground">{title}</p>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
