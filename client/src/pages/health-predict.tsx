import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Float, Sparkles as DreiSparkles } from "@react-three/drei";
import * as THREE from "three";
import { 
  Activity, Stethoscope, Search, Plus, 
  X, AlertTriangle, CheckCircle2, ArrowRight,
  ArrowLeft, Weight, Ruler
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

// --- 3D DNA Helix Components ---

function DnaStrand() {
  const groupRef = useRef<THREE.Group>(null);
  const particleCount = 40;
  const height = 10;
  const radius = 1.5;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
    }
  });

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < particleCount; i++) {
      const y = (i / particleCount) * height - height / 2;
      const angle1 = i * 0.5;
      const angle2 = angle1 + Math.PI;
      
      temp.push(
        <group key={i} position={[0, y, 0]}>
          {/* Base Pair Connecting Line */}
          <mesh rotation={[Math.PI / 2, 0, angle1]}>
            <cylinderGeometry args={[0.02, 0.02, radius * 2]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
          </mesh>
          
          {/* Strand 1 Node */}
          <mesh position={[Math.cos(angle1) * radius, 0, Math.sin(angle1) * radius]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.8} />
          </mesh>
          
          {/* Strand 2 Node */}
          <mesh position={[Math.cos(angle2) * radius, 0, Math.sin(angle2) * radius]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#a78bfa" emissive="#8b5cf6" emissiveIntensity={0.8} />
          </mesh>
        </group>
      );
    }
    return temp;
  }, []);

  return <group ref={groupRef}>{particles}</group>;
}

function DnaScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} color="#3b82f6" />
      <pointLight position={[-10, -10, -5]} intensity={1} color="#8b5cf6" />
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <DnaStrand />
      </Float>
      
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <DreiSparkles count={150} scale={10} size={2} speed={0.4} opacity={0.3} color="#60a5fa" />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate
        autoRotateSpeed={1}
        maxPolarAngle={Math.PI / 2 + 0.1}
        minPolarAngle={Math.PI / 2 - 0.1}
      />
    </>
  );
}

// --- Main Page Component ---

const pageVariants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, scale: 1.05, filter: "blur(10px)", transition: { duration: 0.4 } },
};

const containerVariants = {
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

interface SymptomCategory {
  category: string;
  symptoms: { id: string; label: string }[];
}

interface PredictionResponse {
  prediction: string;
  confidence: number;
  topPredictions: {
    disease: string;
    confidence: number;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
  }[];
  source: string;
}

export default function HealthPredict() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { data: symptomData, isLoading: isLoadingSymptoms } = useQuery<{ categories: SymptomCategory[], totalSymptoms: number }>({
    queryKey: ["/api/health-predict/symptoms"],
  });

  const predictMutation = useMutation<PredictionResponse, Error, string[]>({
    mutationFn: async (symptoms) => {
      const res = await fetch("/api/health-predict/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Prediction failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setStep(3);
    }
  });

  const toggleSymptom = (id: string) => {
    const newSet = new Set(selectedSymptoms);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSymptoms(newSet);
  };

  const handlePredict = () => {
    if (selectedSymptoms.size > 0) {
      predictMutation.mutate(Array.from(selectedSymptoms));
    }
  };

  const filteredSymptoms = useMemo(() => {
    if (!symptomData) return [];
    if (!searchQuery) return symptomData.categories.filter(c => c.symptoms.length > 0);
    const query = searchQuery.toLowerCase();
    return symptomData.categories.map(c => ({
      ...c,
      symptoms: c.symptoms.filter(s => s.label.toLowerCase().includes(query))
    })).filter(c => c.symptoms.length > 0);
  }, [symptomData, searchQuery]);

  const bmiValue = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      return w / Math.pow(h / 100, 2);
    }
    return null;
  }, [height, weight]);

  const bmiCategory = useMemo(() => {
    if (!bmiValue) return null;
    if (bmiValue < 18.5) return { label: 'Underweight', color: 'text-yellow-400', bar: 'bg-yellow-400' };
    if (bmiValue < 25) return { label: 'Normal weight', color: 'text-emerald-400', bar: 'bg-emerald-400' };
    if (bmiValue < 30) return { label: 'Overweight', color: 'text-orange-400', bar: 'bg-orange-400' };
    return { label: 'Obese', color: 'text-red-500', bar: 'bg-red-500' };
  }, [bmiValue]);

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full overflow-hidden bg-[#020617]">
      
      {/* 3D Canvas Background Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
          <DnaScene />
        </Canvas>
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617] pointer-events-none opacity-80" />
      </div>

      {/* Foreground Content Layer */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
        <div className="mx-auto max-w-5xl w-full flex-1 flex flex-col p-4 sm:p-6 lg:p-8 pointer-events-auto">
          
          {/* Wizard Header */}
          <motion.header className="space-y-4 flex-shrink-0 mb-8" variants={itemVariants} initial="initial" animate="animate">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                  <Stethoscope className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-lg">
                    Health Predict <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Pro</span>
                  </h1>
                  <Badge variant="secondary" className="mt-1 bg-white/5 border border-white/10 text-blue-300 backdrop-blur-md">
                    Diagnostic Matrix Online
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                      step === s 
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-110" 
                        : step > s 
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
                          : "bg-black/40 text-white/30 border border-white/10"
                    }`}>
                      {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                    </div>
                    {s < 3 && <div className={`w-8 h-1 mx-2 rounded-full transition-colors duration-500 ${step > s ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white/10"}`} />}
                  </div>
                ))}
              </div>
            </div>
          </motion.header>

          {/* Wizard Steps */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col items-center justify-center">
                <Card className="bg-[hsla(225,20%,5%,0.6)] backdrop-blur-2xl border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)] rounded-3xl w-full max-w-2xl overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
                  <CardHeader className="text-center pb-8 pt-10 relative z-10">
                    <CardTitle className="text-3xl text-white font-bold">Physical Telemetry</CardTitle>
                    <CardDescription className="text-white/50 text-base mt-2">Enter your metrics to calibrate the diagnostic matrix.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 px-10 pb-10 relative z-10">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                          <Ruler className="h-4 w-4" /> Height (cm)
                        </label>
                        <Input 
                          type="number" 
                          placeholder="175" 
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          className="h-16 text-2xl font-mono text-white bg-black/40 border-white/10 focus-visible:ring-blue-500/50 rounded-2xl text-center placeholder:text-white/20"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                          <Weight className="h-4 w-4" /> Weight (kg)
                        </label>
                        <Input 
                          type="number" 
                          placeholder="70" 
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="h-16 text-2xl font-mono text-white bg-black/40 border-white/10 focus-visible:ring-purple-500/50 rounded-2xl text-center placeholder:text-white/20"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {bmiValue && bmiCategory && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-black/40 p-6 rounded-2xl border border-white/10 space-y-4"
                        >
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Calculated BMI</p>
                              <div className="flex items-baseline gap-4">
                                <h3 className="text-5xl font-black text-white drop-shadow-md">{bmiValue.toFixed(1)}</h3>
                                <span className={`text-sm font-bold uppercase tracking-widest ${bmiCategory.color} bg-white/5 px-3 py-1 rounded-full border border-white/5`}>
                                  {bmiCategory.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Progress 
                            value={Math.min((bmiValue / 40) * 100, 100)} 
                            className="h-3 bg-black/60 rounded-full overflow-hidden" 
                            indicatorClassName={bmiCategory.bar}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pt-4">
                      <Button 
                        onClick={() => setStep(2)} 
                        disabled={!height || !weight}
                        className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all hover:scale-[1.02]"
                      >
                        Initialize Symptom Scanner <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col h-full max-h-full py-4">
                <Card className="bg-[hsla(225,20%,5%,0.6)] backdrop-blur-2xl rounded-3xl flex-1 flex flex-col border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.15)] overflow-hidden">
                  <CardHeader className="pb-6 border-b border-white/5 bg-black/20">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-full hover:bg-white/10 text-white/70">
                        <ArrowLeft className="h-6 w-6" />
                      </Button>
                      <div className="flex-1">
                        <CardTitle className="text-2xl text-white">Symptom Database</CardTitle>
                        <CardDescription className="text-white/50 text-base">Select all anomalies currently detected</CardDescription>
                      </div>
                    </div>
                    <div className="pt-6 relative">
                      <Search className="absolute left-5 top-[2.4rem] h-6 w-6 text-white/40" />
                      <Input
                        type="text"
                        placeholder="Search the neural network (e.g. Headache, Fatigue...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-14 h-16 text-lg text-white bg-black/40 border-white/10 focus-visible:ring-purple-500/50 rounded-2xl placeholder:text-white/30"
                      />
                    </div>
                    
                    <AnimatePresence>
                      {selectedSymptoms.size > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 flex flex-wrap gap-2">
                          {Array.from(selectedSymptoms).map((id) => {
                            let label = id;
                            if (symptomData) {
                              for (const cat of symptomData.categories) {
                                const sym = cat.symptoms.find(s => s.id === id);
                                if (sym) { label = sym.label; break; }
                              }
                            }
                            return (
                              <Badge key={id} className="bg-purple-500/20 text-purple-200 border border-purple-500/50 px-4 py-2 text-sm rounded-full cursor-pointer hover:bg-purple-500/30 transition-colors backdrop-blur-md" onClick={() => toggleSymptom(id)}>
                                {label} <X className="h-4 w-4 ml-2 opacity-70" />
                              </Badge>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardHeader>
                  
                  <CardContent className="flex-1 overflow-hidden p-0 relative">
                    <div className="h-full overflow-y-auto p-8 space-y-10 custom-scrollbar pb-32">
                      {isLoadingSymptoms ? (
                        <div className="flex justify-center items-center h-full">
                          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin glow-primary" />
                        </div>
                      ) : filteredSymptoms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 opacity-50">
                          <Search className="h-16 w-16 text-white/30" />
                          <p className="text-xl text-white/50">No vectors matching "{searchQuery}"</p>
                        </div>
                      ) : (
                        <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-10">
                          {filteredSymptoms.map((category) => (
                            <motion.div key={category.category} variants={itemVariants} className="space-y-4">
                              <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 border-b border-white/5 pb-2">
                                {category.category}
                              </h3>
                              <div className="flex flex-wrap gap-3">
                                {category.symptoms.map((symptom) => {
                                  const isSelected = selectedSymptoms.has(symptom.id);
                                  return (
                                    <motion.button
                                      key={symptom.id}
                                      onClick={() => toggleSymptom(symptom.id)}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all border ${
                                        isSelected 
                                          ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
                                          : "bg-black/40 border-white/10 text-white/60 hover:border-blue-500/50 hover:text-white"
                                      }`}
                                    >
                                      {isSelected ? <CheckCircle2 className="h-4 w-4 text-purple-400" /> : <Plus className="h-4 w-4 opacity-50" />}
                                      {symptom.label}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-end">
                      <Button
                        onClick={handlePredict}
                        disabled={selectedSymptoms.size === 0 || predictMutation.isPending}
                        className="h-16 px-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xl rounded-2xl shadow-[0_10px_40px_rgba(139,92,246,0.5)] transition-all hover:scale-[1.02]"
                      >
                        {predictMutation.isPending ? (
                          <span className="flex items-center gap-3">
                            <span className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing Matrix...
                          </span>
                        ) : (
                          <span className="flex items-center gap-3">
                            Execute Diagnosis <ArrowRight className="h-6 w-6" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 3 && predictMutation.isSuccess && predictMutation.data && (
              <motion.div key="step3" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col items-center justify-center py-8 relative z-20">
                <Card className="bg-[hsla(225,20%,5%,0.7)] backdrop-blur-3xl rounded-3xl w-full max-w-3xl border border-blue-500/30 shadow-[0_0_80px_rgba(59,130,246,0.2)] overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  <CardHeader className="pb-6 border-b border-white/10 relative z-10 flex flex-row items-center gap-4 bg-black/20">
                    <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="rounded-full hover:bg-white/10 shrink-0 text-white">
                      <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="flex-1 flex items-center justify-between">
                      <CardTitle className="text-2xl text-white flex items-center gap-3">
                        <Activity className="h-8 w-8 text-blue-400" />
                        Diagnosis Report
                      </CardTitle>
                      <Badge variant="outline" className="border-blue-500/50 text-blue-300 bg-blue-500/10 px-5 py-2 text-base rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)] font-mono">
                        {predictMutation.data.confidence.toFixed(1)}% Match
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-8 space-y-8 relative z-10 px-10 pb-10">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="space-y-2 text-center py-10 bg-gradient-to-b from-blue-500/10 to-transparent rounded-3xl border border-blue-500/20"
                    >
                      <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">Primary Anomaly Detected</p>
                      <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        {predictMutation.data.prediction}
                      </h2>
                    </motion.div>

                    <div className="space-y-6">
                      <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest flex items-center gap-3 border-b border-white/10 pb-3">
                        <Activity className="h-5 w-5" /> Probability Matrix
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {predictMutation.data.topPredictions.map((pred, i) => (
                          <motion.div 
                            key={pred.disease}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + (i * 0.1) }}
                            className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 transition-all group"
                          >
                            <div className="flex justify-between items-center mb-4">
                              <span className="font-bold text-white text-xl group-hover:text-blue-400 transition-colors">{pred.disease}</span>
                              <Badge variant="outline" className="font-mono text-base bg-white/5 border-white/10 text-white/80 px-4 py-1">
                                {pred.confidence.toFixed(1)}%
                              </Badge>
                            </div>
                            <Progress 
                              value={pred.confidence} 
                              className="h-3 bg-black/80 rounded-full overflow-hidden" 
                              indicatorClassName={
                                pred.severity === 'critical' ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_#ef4444]' :
                                pred.severity === 'high' ? 'bg-gradient-to-r from-orange-600 to-orange-400 shadow-[0_0_15px_#f97316]' :
                                pred.severity === 'medium' ? 'bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_15px_#eab308]' :
                                'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_#10b981]'
                              }
                            />
                            {pred.description && (
                              <p className="text-sm text-white/50 mt-4 leading-relaxed border-t border-white/5 pt-4">
                                {pred.description}
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <Alert className="bg-orange-500/10 border border-orange-500/30 rounded-2xl backdrop-blur-md">
                      <AlertTriangle className="h-6 w-6 text-orange-400" />
                      <AlertTitle className="text-orange-300 font-bold text-lg">System Disclaimer</AlertTitle>
                      <AlertDescription className="text-orange-200/70 mt-2 leading-relaxed text-sm">
                        This AI diagnostic matrix operates on ensemble machine learning models intended for insight generation only. It does not replace clinical pathology. Consult a human physician for verified medical intervention.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
