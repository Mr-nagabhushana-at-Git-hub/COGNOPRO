import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dumbbell, Heart, Target, Footprints, Timer, 
  Camera, Activity, Brain, Link2, Smartphone, 
  CheckCircle2, Loader2, Zap, History, User, Ruler, Weight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LiveWorkout from "@/components/fitness/live-workout";
import type { FitnessData } from "@shared/schema";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } },
};

const itemVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
};

// Tooltip formatter for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-white font-bold">{new Date(label).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
        <p className="text-blue-400 font-mono flex items-center gap-2 mt-1">
          <Footprints className="h-3 w-3" /> {payload[0].value.toLocaleString()} steps
        </p>
      </div>
    );
  }
  return null;
};

export default function Fitness() {
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<'disconnected' | 'authenticating' | 'synced'>('disconnected');
  const [historyData, setHistoryData] = useState<FitnessData[]>([]);
  const { toast } = useToast();

  const dailyGoals = { steps: 10000, exerciseMinutes: 45, calories: 500 };

  // Bio-Profile Engine
  const { data: profileData } = useQuery({
    queryKey: ["/api/fitness/profile"],
    enabled: syncState === 'synced',
  });

  // Live Update Engine (Current Day) - Auto polls every 30 seconds once synced
  const { data: liveData } = useQuery({
    queryKey: ["/api/fitness/sync/live"],
    enabled: syncState === 'synced',
    refetchInterval: 30000, // Live updates every 30s
  });

  const currentSteps = liveData?.data?.steps || (historyData.length > 0 ? historyData[historyData.length - 1].steps : 0);
  const currentMinutes = liveData?.data?.activeMinutes || (historyData.length > 0 ? historyData[historyData.length - 1].exerciseMinutes : 0);
  const currentCalories = liveData?.data?.caloriesBurned || (historyData.length > 0 ? historyData[historyData.length - 1].caloriesBurned : 0);
  const profile = profileData?.profile;

  const handleFullSync = async () => {
    setSyncState('authenticating');
    try {
      const res = await fetch("/api/fitness/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync");
      
      setHistoryData(data.history || []);
      setSyncState('synced');
      toast({ title: "5-Year Sync Complete", description: "Historical metrics loaded and Live Polling activated." });
    } catch (e: any) {
      setSyncState('disconnected');
      toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
    }
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
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse uppercase tracking-wider">
                  <Zap className="h-3 w-3 mr-1 inline" /> Live Sync Active
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Stats & Integrations */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Bio-Metrics Profile Card (Only visible when synced) */}
          {syncState === 'synced' && profile && (
            <motion.div variants={itemVariants}>
              <Card className="glass-card border-[hsla(245,82%,63%,0.3)] bg-gradient-to-r from-black/40 to-[hsla(245,82%,63%,0.05)] overflow-hidden">
                <CardContent className="p-6 flex flex-col md:flex-row items-center gap-8">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20 border-2 border-[hsl(245,82%,63%)] shadow-[0_0_20px_hsla(245,82%,63%,0.3)]">
                      <AvatarImage src={profile.picture} />
                      <AvatarFallback className="bg-black/50"><User className="h-8 w-8" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">{profile.name}</h2>
                      <p className="text-blue-400 text-sm font-mono flex items-center gap-2">
                        {profile.age ? `${profile.age} Y/O` : "AGE UNKNOWN"}
                        <span className="w-1 h-1 rounded-full bg-blue-500/50" /> 
                        VERIFIED METRICS
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full grid grid-cols-2 gap-4 md:border-l border-white/10 md:pl-8">
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Weight className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mass</p>
                        <p className="text-xl font-bold text-white">{profile.weight}</p>
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[hsl(245,82%,63%)]/10 flex items-center justify-center text-[hsl(245,82%,63%)]">
                        <Ruler className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Height</p>
                        <p className="text-xl font-bold text-white">{profile.height}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Live Telemetry Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Steps Radial Card */}
            <Card className="glass-card border-[hsla(245,82%,63%,0.2)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Footprints className="w-24 h-24" />
              </div>
              <CardContent className="p-6 relative z-10 flex items-center gap-6">
                <div className="w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                      innerRadius="80%" 
                      outerRadius="100%" 
                      data={[{ value: Math.min(100, (currentSteps / dailyGoals.steps) * 100), fill: '#3b82f6' }]} 
                      startAngle={90} 
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-blue-400 mb-1">
                    <Footprints className="h-4 w-4" />
                    <span className="font-semibold uppercase tracking-wider text-xs">Locomotion</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-white">{currentSteps.toLocaleString()}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">/ {dailyGoals.steps.toLocaleString()} goal</span>
                </div>
              </CardContent>
            </Card>

            {/* Active Minutes Card */}
            <Card className="glass-card border-[hsla(165,80%,48%,0.2)]">
              <CardContent className="p-6 relative z-10 flex items-center gap-6">
                <div className="w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                      innerRadius="80%" 
                      outerRadius="100%" 
                      data={[{ value: Math.min(100, (currentMinutes / dailyGoals.exerciseMinutes) * 100), fill: '#10b981' }]} 
                      startAngle={90} 
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <Timer className="h-4 w-4" />
                    <span className="font-semibold uppercase tracking-wider text-xs">Active Load</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-white">{currentMinutes}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">/ {dailyGoals.exerciseMinutes} min</span>
                </div>
              </CardContent>
            </Card>

            {/* Calories Card */}
            <Card className="glass-card border-[hsla(30,80%,50%,0.2)]">
              <CardContent className="p-6 relative z-10 flex items-center gap-6">
                <div className="w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                      innerRadius="80%" 
                      outerRadius="100%" 
                      data={[{ value: Math.min(100, (currentCalories / dailyGoals.calories) * 100), fill: '#f97316' }]} 
                      startAngle={90} 
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-orange-400 mb-1">
                    <Heart className="h-4 w-4" />
                    <span className="font-semibold uppercase tracking-wider text-xs">Metabolic</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-white">{currentCalories}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">/ {dailyGoals.calories} kcal</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 5-Year Infographic AreaChart */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">5-Year Locomotion Matrix</h2>
                </div>
                {syncState !== 'synced' && (
                  <Badge className="bg-white/10 text-muted-foreground border-white/20">Waiting for Sync</Badge>
                )}
                {syncState === 'synced' && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Historical Data Loaded</Badge>
                )}
              </div>
              <CardContent className="p-0 h-[350px]">
                {historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#ffffff30" 
                        tickFormatter={(val) => new Date(val).getFullYear().toString()} 
                        minTickGap={50}
                      />
                      <YAxis stroke="#ffffff30" width={60} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="steps" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorSteps)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                    <History className="w-16 h-16 mb-4" />
                    <p>Initialize Google Fit Sync to build 5-Year History</p>
                  </div>
                )}
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
                          {workout.intensity}
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
                    onClick={handleFullSync}
                    className="w-full bg-white text-black hover:bg-gray-200 font-bold h-12 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                    Sync 5-Year History
                  </Button>
                )}
                
                {syncState === 'authenticating' && (
                  <Button disabled className="w-full bg-blue-500/20 text-blue-400 border border-blue-500/50 h-12 rounded-xl font-mono text-sm uppercase tracking-widest">
                    Fetching History...
                  </Button>
                )}

                {syncState === 'synced' && (
                  <div className="space-y-4">
                    <Button disabled className="w-full bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] h-12 rounded-xl font-bold border-0">
                      Sync Active
                    </Button>
                    <p className="text-xs text-center text-blue-400 font-mono flex flex-col items-center justify-center gap-1">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        Live update every 30s
                      </span>
                      <span className="text-muted-foreground opacity-50">{historyData.length.toLocaleString()} Days Synced</span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
