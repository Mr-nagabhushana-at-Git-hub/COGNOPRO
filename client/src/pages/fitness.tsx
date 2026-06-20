import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dumbbell, Heart, Target, Footprints, Timer, 
  Camera, Activity, Brain, Link2, Smartphone, 
  CheckCircle2, Loader2, Zap
} from "lucide-react";
import LiveWorkout from "@/components/fitness/live-workout";
import type { FitnessData } from "@shared/schema";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } },
};

const itemVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
};

export default function Fitness() {
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);

  // Sync Engine State
  const [syncState, setSyncState] = useState<'disconnected' | 'authenticating' | 'synced'>('disconnected');
  
  const { data: fitnessData } = useQuery<FitnessData[]>({
    queryKey: ["/api/fitness"],
  });

  const rawTodayData = fitnessData?.[0];
  const dailyGoals = { steps: 10000, exerciseMinutes: 45, calories: 500 };

  // Local simulated telemetry state (used once synced)
  const [telemetry, setTelemetry] = useState({
    steps: rawTodayData?.steps ?? 4230,
    exerciseMinutes: rawTodayData?.exerciseMinutes ?? 12,
    caloriesBurned: rawTodayData?.caloriesBurned ?? 340,
  });

  // Simulated live data streaming via Google Fit
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (syncState === 'synced') {
      interval = setInterval(() => {
        setTelemetry(prev => ({
          ...prev,
          // Simulate walking: add 1-8 steps every 3 seconds
          steps: prev.steps + Math.floor(Math.random() * 8) + 1,
          // Simulate caloric burn: add 0-2 calories
          caloriesBurned: prev.caloriesBurned + Math.floor(Math.random() * 3),
        }));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [syncState]);

  const handleConnectGoogleFit = () => {
    setSyncState('authenticating');
    // Simulate OAuth handshake and data fetch delay
    setTimeout(() => {
      setSyncState('synced');
    }, 2500);
  };

  const workoutTypes = [
    {
      id: "hypertrophy",
      title: "SAM3 Hypertrophy",
      description: "AI-guided form correction & muscle activation tracking",
      duration: "45 min",
      intensity: "High",
      icon: Activity,
      color: "from-[hsl(245,82%,63%)] to-[hsl(280,72%,58%)]",
    },
    {
      id: "neuro",
      title: "Neuro-Athletics",
      description: "Dual n-back physical load & reaction drills",
      duration: "20 min", 
      intensity: "Extreme",
      icon: Brain,
      color: "from-[hsl(165,80%,48%)] to-emerald-600",
    },
    {
      id: "recovery",
      title: "Holographic Recovery",
      description: "Proprioception enhancement & joint stress prevention",
      duration: "30 min",
      intensity: "Low",
      icon: Target,
      color: "from-blue-500 to-cyan-500",
    }
  ];

  if (activeWorkout) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)] bg-black/40">
        <LiveWorkout 
          workoutType={activeWorkout} 
          onWorkoutEnd={() => setActiveWorkout(null)} 
        />
      </div>
    );
  }

  return (
    <motion.div 
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-64px)] flex flex-col"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Dashboard Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(245,82%,63%)] to-[hsl(165,80%,48%)] flex items-center justify-center shadow-[0_0_30px_hsla(245,82%,63%,0.3)]">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Command Center</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Neural-Physical Subsystems Online
              </span>
              {syncState === 'synced' && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse">
                  <Zap className="h-3 w-3 mr-1" /> Live Telemetry
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Stats & Workouts */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Telemetry Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-card border-[hsla(245,82%,63%,0.2)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Footprints className="h-5 w-5" />
                    <span className="font-semibold uppercase tracking-wider text-xs">Locomotion</span>
                  </div>
                  <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300">
                    {Math.round((telemetry.steps / dailyGoals.steps) * 100)}%
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-white">{telemetry.steps.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground mb-1">/ {dailyGoals.steps.toLocaleString()} steps</span>
                  </div>
                  <Progress value={(telemetry.steps / dailyGoals.steps) * 100} className="h-1.5 bg-background" indicatorClassName="bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-[hsla(165,80%,48%,0.2)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Timer className="h-5 w-5" />
                    <span className="font-semibold uppercase tracking-wider text-xs">Active Load</span>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    {Math.round((telemetry.exerciseMinutes / dailyGoals.exerciseMinutes) * 100)}%
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-white">{telemetry.exerciseMinutes}</span>
                    <span className="text-sm text-muted-foreground mb-1">/ {dailyGoals.exerciseMinutes} min</span>
                  </div>
                  <Progress value={(telemetry.exerciseMinutes / dailyGoals.exerciseMinutes) * 100} className="h-1.5 bg-background" indicatorClassName="bg-emerald-400 shadow-[0_0_10px_#10b981]" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-[hsla(30,80%,50%,0.2)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-orange-400">
                    <Heart className="h-5 w-5" />
                    <span className="font-semibold uppercase tracking-wider text-xs">Metabolic Burn</span>
                  </div>
                  <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-300">
                    {Math.round((telemetry.caloriesBurned / dailyGoals.calories) * 100)}%
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-white">{telemetry.caloriesBurned.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground mb-1">/ {dailyGoals.calories} kcal</span>
                  </div>
                  <Progress value={(telemetry.caloriesBurned / dailyGoals.calories) * 100} className="h-1.5 bg-background" indicatorClassName="bg-orange-400 shadow-[0_0_10px_#f97316]" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Advanced AI Programs */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-6">
              <Camera className="h-5 w-5 text-[hsl(245,82%,63%)]" />
              <h2 className="text-xl font-bold text-white">Quantum Training Protocols</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {workoutTypes.map((workout) => {
                const Icon = workout.icon;
                return (
                  <Card key={workout.id} className="glass-card group overflow-hidden border-[hsla(225,20%,30%,0.5)] hover:border-[hsl(245,82%,63%)] transition-all duration-300">
                    <div className={`h-2 bg-gradient-to-r ${workout.color}`} />
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${workout.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <Badge variant="secondary" className="bg-[hsla(225,20%,10%,0.5)] border-border/50">
                          {workout.intensity} Intensity
                        </Badge>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{workout.title}</h3>
                        <p className="text-sm text-muted-foreground min-h-[40px]">{workout.description}</p>
                      </div>
                      
                      <div className="pt-4 flex gap-3">
                        <Button 
                          className="flex-1 bg-[hsla(225,20%,10%,0.8)] hover:bg-[hsl(245,82%,63%)] text-white border border-border/50 transition-colors"
                          onClick={() => setActiveWorkout(workout.id)}
                        >
                          Initialize Link
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>

        </div>

        {/* Right Column: External Integrations */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Integrations</h2>
          </div>

          <Card className="glass-card border-[hsla(225,20%,30%,0.5)] bg-[hsla(225,20%,5%,0.6)] relative overflow-hidden">
            {syncState === 'synced' && (
              <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
            )}
            <CardContent className="p-6 space-y-6 relative z-10">
              
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${syncState === 'synced' ? 'border-blue-500 bg-blue-500/10' : 'border-border/50 bg-background/50'}`}>
                  {syncState === 'authenticating' ? (
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  ) : syncState === 'synced' ? (
                    <CheckCircle2 className="h-8 w-8 text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  ) : (
                    <Smartphone className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white">Google Fit</h3>
                  <p className="text-sm text-muted-foreground">Sync steps, heart rate, and activities</p>
                </div>
              </div>

              <div className="pt-2">
                {syncState === 'disconnected' && (
                  <Button 
                    onClick={handleConnectGoogleFit}
                    className="w-full bg-white text-black hover:bg-gray-200 font-bold h-12 rounded-xl transition-all"
                  >
                    Connect Account
                  </Button>
                )}
                
                {syncState === 'authenticating' && (
                  <Button disabled className="w-full bg-blue-500/20 text-blue-400 border border-blue-500/50 h-12 rounded-xl">
                    Authenticating...
                  </Button>
                )}

                {syncState === 'synced' && (
                  <div className="space-y-4">
                    <Button disabled className="w-full bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] h-12 rounded-xl font-bold border-0">
                      Sync Active
                    </Button>
                    <p className="text-xs text-center text-blue-400 font-mono flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      Receiving telemetry
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-[hsla(225,20%,30%,0.2)] opacity-50 grayscale">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-border/50 bg-background/50 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Apple Health</h3>
                  <p className="text-xs text-muted-foreground">Coming Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </motion.div>
      </div>

    </motion.div>
  );
}
