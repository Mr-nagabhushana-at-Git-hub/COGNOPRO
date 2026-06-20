import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Camera, Activity, Target, Brain, ArrowLeft, Maximize, Zap, Crosshair } from "lucide-react";

interface LiveWorkoutProps {
  workoutType: string;
  onWorkoutEnd: () => void;
}

export default function LiveWorkout({ workoutType, onWorkoutEnd }: LiveWorkoutProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [metrics, setMetrics] = useState({ hr: 85, form: 92, muscle: 65, fatigue: 12 });

  useEffect(() => {
    // Simulate real-time telemetry updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        hr: Math.min(180, Math.max(70, prev.hr + (Math.random() * 4 - 2))),
        form: Math.min(100, Math.max(60, prev.form + (Math.random() * 6 - 3))),
        muscle: Math.min(100, Math.max(40, prev.muscle + (Math.random() * 5 - 2))),
        fatigue: Math.min(100, prev.fatigue + 0.5)
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (e) {
      console.warn("Camera access denied or not available, using simulation mode.");
      setCameraActive(true); // Fallback to simulated view
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
    }
    onWorkoutEnd();
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={stopCamera} className="text-muted-foreground hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> Abort Sequence
        </Button>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">SAM3 Pose Engine Active</Badge>
          <Badge className="bg-[hsl(245,82%,63%,0.2)] text-[hsl(245,82%,75%)] border-[hsl(245,82%,63%,0.5)]">Recording Telemetry</Badge>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Holographic HUD */}
        <Card className="lg:col-span-3 glass-card relative overflow-hidden border-[hsla(165,80%,48%,0.3)] shadow-[0_0_40px_hsla(165,80%,48%,0.1)]">
          {/* Scanning Line Animation */}
          <motion.div 
            className="absolute left-0 right-0 h-1 bg-[hsl(165,80%,48%)] opacity-50 z-20 shadow-[0_0_20px_hsl(165,80%,48%)]"
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          <div className="absolute inset-0 bg-[hsla(225,20%,5%,0.8)] z-10 flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover opacity-30 ${cameraActive ? 'block' : 'hidden'}`}
            />
            {!cameraActive && (
              <div className="text-center">
                <Camera className="h-16 w-16 text-[hsl(165,80%,48%)] mx-auto mb-4 opacity-50" />
                <Button onClick={enableCamera} className="bg-[hsl(165,80%,48%)] hover:bg-[hsl(165,80%,38%)] text-white shadow-[0_0_20px_hsla(165,80%,48%,0.4)]">
                  Initialize Optics
                </Button>
              </div>
            )}
            
            {/* Holographic Overlays */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="font-mono text-[hsl(165,80%,48%)] text-sm flex items-center gap-2">
                      <Crosshair className="h-4 w-4" /> TRGT: ANTERIOR DELTOID
                    </div>
                    <div className="font-mono text-emerald-400 text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" /> ENGAGEMENT: OPTIMAL
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-white drop-shadow-md">02:45</div>
                    <div className="text-[hsl(245,82%,75%)] font-mono text-sm uppercase tracking-widest">Time Under Tension</div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="w-64 h-64 border border-[hsla(165,80%,48%,0.3)] rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-2 border-2 border-dashed border-[hsla(165,80%,48%,0.2)] rounded-full animate-[spin_10s_linear_infinite]" />
                    <div className="absolute inset-8 border border-[hsla(245,82%,63%,0.3)] rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                    <Target className="h-12 w-12 text-[hsl(165,80%,48%)] opacity-50" />
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="bg-black/50 backdrop-blur-md border border-[hsla(165,80%,48%,0.3)] p-4 rounded-xl">
                    <p className="text-[hsl(165,80%,48%)] font-mono text-xs mb-1">REAL-TIME FORM ALIGNMENT</p>
                    <Progress value={metrics.form} className="h-2 w-48 bg-background/50" indicatorClassName="bg-[hsl(165,80%,48%)]" />
                  </div>
                  <Maximize className="h-6 w-6 text-white/50" />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Telemetry Sidebar */}
        <div className="space-y-6 flex flex-col">
          <Card className="glass-card border-[hsla(245,82%,63%,0.2)] flex-1">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-bold text-white uppercase tracking-widest text-sm mb-4 border-b border-white/10 pb-2">Biometrics</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4 text-red-400" /> Heart Rate</span>
                  <span className="font-mono text-white">{Math.round(metrics.hr)} BPM</span>
                </div>
                <Progress value={(metrics.hr / 200) * 100} className="h-1.5" indicatorClassName="bg-red-400" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Muscle Act.</span>
                  <span className="font-mono text-white">{Math.round(metrics.muscle)}%</span>
                </div>
                <Progress value={metrics.muscle} className="h-1.5" indicatorClassName="bg-amber-400" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Brain className="h-4 w-4 text-[hsl(245,82%,63%)]" /> CNS Fatigue</span>
                  <span className="font-mono text-white">{Math.round(metrics.fatigue)}%</span>
                </div>
                <Progress value={metrics.fatigue} className="h-1.5" indicatorClassName="bg-[hsl(245,82%,63%)]" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-[hsla(280,72%,58%,0.2)] bg-[hsla(280,72%,58%,0.05)]">
            <CardContent className="p-6">
              <h3 className="font-bold text-white uppercase tracking-widest text-sm mb-2">System Advisories</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-emerald-400">
                  <span className="mt-0.5">•</span>
                  <span>Symmetry analysis shows perfect left-right load distribution.</span>
                </li>
                <li className="flex items-start gap-2 text-amber-400">
                  <span className="mt-0.5">•</span>
                  <span>Micro-tremors detected. Prepare for eccentric failure.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
