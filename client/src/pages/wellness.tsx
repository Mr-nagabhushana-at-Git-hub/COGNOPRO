import { FormEvent, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, MeshDistortMaterial, Float, Sparkles as DreiSparkles } from "@react-three/drei";
import * as THREE from "three";
import {
  AlertTriangle, BookOpenText, HeartHandshake, Send,
  ShieldCheck, Sparkles, TrendingUp, Brain, Activity
} from "lucide-react";
import {
  useCreateJournal, useJournals, useStreamingCompanion,
  useStressTriggers, useWellnessAnalytics
} from "@/hooks/use-wellness";
import {
  CartesianGrid, YAxis, Area, AreaChart, ResponsiveContainer, XAxis, Tooltip
} from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// --- 3D Zen Core Components ---

function ZenCore() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
      
      // Breathing animation (slow pulsing)
      const scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={2} floatIntensity={3}>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1.5, 0.4, 128, 32]} />
        <MeshDistortMaterial 
          color="#34d399" // emerald-400
          emissive="#059669" // emerald-600
          emissiveIntensity={0.6}
          distort={0.3} 
          speed={1.5} 
          roughness={0.1}
          metalness={0.9}
          wireframe={false}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Outer harmony ring */}
      <mesh scale={2.5}>
        <torusGeometry args={[1.2, 0.02, 16, 100]} />
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.3} />
      </mesh>
      <mesh scale={2.5} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.02, 16, 100]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.2} />
      </mesh>
    </Float>
  );
}

function ZenScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} color="#10b981" />
      <pointLight position={[-10, -10, -5]} intensity={1} color="#3b82f6" />
      
      <ZenCore />
      
      <Stars radius={100} depth={50} count={3000} factor={3} saturation={0} fade speed={0.5} />
      <DreiSparkles count={150} scale={10} size={2} speed={0.2} opacity={0.4} color="#34d399" />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI / 2 + 0.3}
        minPolarAngle={Math.PI / 2 - 0.3}
      />
    </>
  );
}

// --- Main Page Component ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Wellness() {
  const [entry, setEntry] = useState("");
  const [message, setMessage] = useState("");
  const [crisisSupportRequired, setCrisisSupportRequired] = useState(false);
  const journals = useJournals();
  const triggers = useStressTriggers();
  const createJournal = useCreateJournal();
  const companion = useStreamingCompanion();
  const analytics = useWellnessAnalytics();

  const triggerSummary = useMemo(() => {
    const counts = new Map<string, { count: number; totalIntensity: number }>();
    for (const trigger of triggers.data ?? []) {
      const current = counts.get(trigger.label) ?? { count: 0, totalIntensity: 0 };
      counts.set(trigger.label, { count: current.count + 1, totalIntensity: current.totalIntensity + trigger.intensity });
    }
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, count: value.count, intensity: Math.round(value.totalIntensity / value.count) }))
      .sort((a, b) => b.count - a.count);
  }, [triggers.data]);

  async function submitJournal(event: FormEvent) {
    event.preventDefault();
    if (entry.trim().length < 10) return;
    const result = await createJournal.mutateAsync(entry.trim());
    if ("type" in result) {
      setCrisisSupportRequired(true);
      return;
    }
    setCrisisSupportRequired(Boolean(result.analysis.crisis));
    setEntry("");
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    await companion.send(message.trim());
    setMessage("");
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full overflow-hidden bg-[#020617]">
      
      {/* 3D Canvas Background Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
          <ZenScene />
        </Canvas>
        {/* Subtle dark gradient overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Foreground Content Layer */}
      <div className="absolute inset-0 z-10 overflow-y-auto">
        <motion.div
          className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.header className="max-w-3xl space-y-4 pt-4" variants={itemVariants}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <HeartHandshake className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white drop-shadow-lg">
                  Wellness <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-600">Core</span>
                </h1>
                <Badge variant="secondary" className="mt-2 bg-white/5 border border-white/10 text-emerald-300 backdrop-blur-md">
                  <ShieldCheck className="mr-1 h-3 w-3" /> Private Neural Reflection Protocol
                </Badge>
              </div>
            </div>
            <p className="text-lg leading-relaxed text-white/60 drop-shadow-md">
              Synchronize your emotional state. Notice patterns in your stress matrices, write without constraints, and allow the AI companion to guide your restoration.
            </p>
          </motion.header>

          {/* Crisis Alerts */}
          <AnimatePresence>
            {crisisSupportRequired && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <Alert role="alert" className="bg-red-500/10 border-red-500/50 rounded-2xl backdrop-blur-xl shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  <AlertTitle className="text-red-300 font-bold text-lg">Emergency Support Recommended</AlertTitle>
                  <AlertDescription className="mt-2 leading-relaxed text-red-200">
                    The protocol detects critical stress vectors. Please contact emergency services or reach out to a trusted human anchor immediately.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Layout Grid */}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] pb-12">
            
            {/* Left Column: Reflection & History */}
            <motion.div className="space-y-8" variants={itemVariants}>
              
              {/* Journal Form */}
              <Card className="bg-[hsla(225,20%,5%,0.6)] backdrop-blur-2xl border-white/10 shadow-2xl rounded-3xl overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl text-white">
                    <BookOpenText className="h-6 w-6 text-emerald-400" />
                    Neural Log Input
                  </CardTitle>
                  <CardDescription className="text-white/50">Record variables affecting your cognitive state</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitJournal} className="space-y-4">
                    <Textarea
                      id="journal-entry"
                      value={entry}
                      onChange={(event) => setEntry(event.target.value)}
                      rows={6}
                      maxLength={5000}
                      placeholder="Initiate brain dump... (e.g., Felt cognitive overload after the mock exam, cortisol levels spiking...)"
                      className="bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 resize-none rounded-2xl p-4 text-base leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-xs font-mono text-white/40 px-2">
                      <span>Pattern detection active</span>
                      <span>{entry.length} / 5,000 bytes</span>
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={entry.trim().length < 10 || createJournal.isPending}
                      className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02]"
                    >
                      {createJournal.isPending ? (
                        <span className="flex items-center gap-3">
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing Neural Data...
                        </span>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Analyze Log
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Recent Logs */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white/80 uppercase tracking-widest pl-2">Recent Logs</h3>
                
                {journals.data?.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 backdrop-blur-sm p-10 text-center">
                    <Brain className="h-10 w-10 text-white/20 mx-auto mb-4" />
                    <p className="text-white/40">Neural log database empty. Initiate first entry.</p>
                  </div>
                )}

                <AnimatePresence>
                  {journals.data?.slice(0, 4).map((journal, index) => (
                    <motion.article
                      key={journal.id}
                      className="rounded-3xl border border-white/10 bg-[hsla(225,20%,5%,0.5)] backdrop-blur-xl p-5 hover:border-emerald-500/30 transition-all duration-300 group"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-white/5 pb-4">
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
                          {journal.primaryEmotion}
                        </Badge>
                        <Badge className={journal.burnoutRisk ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-teal-500/20 text-teal-300 border-teal-500/30"}>
                          {journal.burnoutRisk ? "⚠ Burnout Risk" : "✓ Equilibrium"}
                        </Badge>
                        <time className="ml-auto text-xs text-white/40 font-mono uppercase tracking-widest group-hover:text-emerald-400 transition-colors">
                          {journal.createdAt ? format(new Date(journal.createdAt), "dd MMM, HH:mm") : "RECENT"}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{journal.content}</p>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>

            </motion.div>

            {/* Right Column: Telemetry & AI Companion */}
            <motion.aside className="space-y-8" variants={itemVariants}>
              
              {/* Burnout & Emotion Telemetry */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-[hsla(225,20%,5%,0.5)] backdrop-blur-xl border-white/10 rounded-3xl">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-mono uppercase tracking-widest text-red-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Burnout
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 h-32">
                    {analytics.data?.burnoutTrend.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.data.burnoutTrend}>
                          <defs>
                            <linearGradient id="burnoutGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={3} fill="url(#burnoutGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center"><Activity className="w-6 h-6 text-white/10" /></div>}
                  </CardContent>
                </Card>

                <Card className="bg-[hsla(225,20%,5%,0.5)] backdrop-blur-xl border-white/10 rounded-3xl">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-mono uppercase tracking-widest text-teal-400 flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Intensity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 h-32">
                    {analytics.data?.emotionTrend.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.data.emotionTrend}>
                          <defs>
                            <linearGradient id="emotionGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.5} />
                              <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="intensity" stroke="#14b8a6" strokeWidth={3} fill="url(#emotionGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center"><Activity className="w-6 h-6 text-white/10" /></div>}
                  </CardContent>
                </Card>
              </div>

              {/* Stress Vectors */}
              <Card className="bg-[hsla(225,20%,5%,0.6)] backdrop-blur-2xl border-white/10 rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base text-white/80 font-mono uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    Detected Vectors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {triggerSummary.length === 0 && <p className="text-sm text-white/40">No vectors detected in recent logs.</p>}
                  {triggerSummary.map((trigger) => (
                    <div key={trigger.label} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-white">{trigger.label}</span>
                        <span className="text-white/40 font-mono">{trigger.count} hits</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-black/50 overflow-hidden border border-white/5">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(trigger.intensity * 10, 100)}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* AI Companion Terminal */}
              <Card className="bg-[hsla(225,20%,10%,0.8)] backdrop-blur-3xl border-emerald-500/20 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-4">
                  <CardTitle className="text-base font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Neural Guide
                  </CardTitle>
                </div>
                <CardContent className="p-5">
                  <AnimatePresence mode="wait">
                    {companion.reply ? (
                      <motion.div
                        key="reply"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 rounded-2xl bg-black/40 border border-emerald-500/30 p-5 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] text-sm leading-relaxed text-emerald-100"
                      >
                        {companion.reply}
                      </motion.div>
                    ) : (
                      <motion.div key="empty" className="mb-6 p-5 text-center text-emerald-500/30 font-mono text-sm">
                        Waiting for input...
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <form onSubmit={submitMessage} className="space-y-4">
                    <Textarea
                      id="companion-message"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={2}
                      placeholder="Query the guide..."
                      className="bg-black/50 border-emerald-500/20 text-white focus:border-emerald-500 resize-none rounded-xl"
                    />
                    <Button
                      type="submit"
                      disabled={!message.trim() || companion.isStreaming}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {companion.isStreaming ? "Transmitting..." : "Send Query"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

            </motion.aside>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
