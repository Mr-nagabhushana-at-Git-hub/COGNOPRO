import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, Target, Flame, Sparkles, CheckCircle2, 
  Circle, AlertCircle, Clock, Trash2 
} from "lucide-react";
import type { Task } from "@shared/schema";
import { useTasks } from "@/hooks/use-tasks";
import TaskModal from "@/components/modals/task-modal";

const quadrants = [
  {
    id: "important-not-urgent",
    label: "SCHEDULE",
    desc: "Important, Not Urgent",
    color: "hsl(210,100%,60%)",
    bgClass: "bg-[hsla(210,100%,60%,0.05)]",
    borderClass: "border-blue-500/20",
    glowClass: "group-hover:shadow-[0_0_30px_hsla(210,100%,60%,0.15)]",
    col: 1, row: 1
  },
  {
    id: "important-urgent",
    label: "DO NOW",
    desc: "Important & Urgent",
    color: "hsl(350,100%,60%)",
    bgClass: "bg-[hsla(350,100%,60%,0.05)]",
    borderClass: "border-rose-500/20",
    glowClass: "group-hover:shadow-[0_0_30px_hsla(350,100%,60%,0.15)]",
    col: 2, row: 1
  },
  {
    id: "not-important-not-urgent",
    label: "ELIMINATE",
    desc: "Not Important, Not Urgent",
    color: "hsl(220,10%,50%)",
    bgClass: "bg-[hsla(220,10%,50%,0.05)]",
    borderClass: "border-slate-500/20",
    glowClass: "group-hover:shadow-[0_0_30px_hsla(220,10%,50%,0.15)]",
    col: 1, row: 2
  },
  {
    id: "not-important-urgent",
    label: "DELEGATE",
    desc: "Not Important, Urgent",
    color: "hsl(30,100%,60%)",
    bgClass: "bg-[hsla(30,100%,60%,0.05)]",
    borderClass: "border-orange-500/20",
    glowClass: "group-hover:shadow-[0_0_30px_hsla(30,100%,60%,0.15)]",
    col: 2, row: 2
  }
];

export default function TasksGraph() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [quickTask, setQuickTask] = useState("");
  const { tasks, isLoading, toggleTask, deleteTask, createTask, getTaskStats } = useTasks();
  
  const stats = getTaskStats();

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTask.trim()) return;
    
    await createTask({
      title: quickTask,
      category: "not-important-not-urgent", // Default landing zone
      priority: 1,
      duration: 30,
    });
    setQuickTask("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="w-16 h-16 border-4 border-[hsl(245,82%,63%)] border-t-transparent rounded-full animate-spin glow-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-64px)] flex flex-col gap-6">
      
      {/* Top Header & Goals Module */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <Card className="glass-card lg:col-span-2 border-[hsla(245,82%,63%,0.2)]">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(245,82%,63%)] to-[hsl(280,72%,58%)] flex items-center justify-center shadow-[0_0_30px_hsla(245,82%,63%,0.3)] shrink-0">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-black text-white tracking-tight">Eisenhower Matrix</h1>
              <p className="text-muted-foreground mt-1 text-sm">Strategic Task Allocation Graph</p>
            </div>
            <div className="w-full sm:w-auto flex-1 max-w-sm">
              <form onSubmit={handleQuickAdd} className="relative">
                <Input
                  placeholder="Quick add task... (Enter)"
                  value={quickTask}
                  onChange={(e) => setQuickTask(e.target.value)}
                  className="pr-12 h-12 bg-[hsla(225,20%,5%,0.5)] border-[hsla(245,82%,63%,0.3)] focus-visible:ring-[hsl(245,82%,63%)] rounded-xl"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-1 top-1 h-10 w-10 text-[hsl(245,82%,63%)] hover:bg-[hsla(245,82%,63%,0.1)]"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </form>
            </div>
            <Button onClick={() => setIsTaskModalOpen(true)} className="hidden sm:flex h-12 px-6 gradient-bg text-white rounded-xl glow-primary font-bold">
              <Sparkles className="mr-2 h-4 w-4" /> Deep Work
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <CardContent className="p-6 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Flame className="h-5 w-5" />
                <span className="font-bold uppercase tracking-wider text-sm">Daily Goals</span>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                Level {Math.floor(stats.completed / 5) + 1}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-black text-white">{stats.completed}</span>
                  <span className="text-muted-foreground ml-2 text-sm">/ {stats.total} Tasks</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold">{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} className="h-2 bg-background/50" indicatorClassName="bg-emerald-400 shadow-[0_0_10px_#10b981]" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* The 2D Interactive Matrix Graph */}
      <div className="flex-1 relative bg-[hsla(225,20%,8%,0.4)] rounded-3xl border border-white/5 overflow-hidden p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Graph Axes Labels */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 hidden md:block" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10 hidden md:block" />
        
        <div className="absolute left-1/2 -top-3 -translate-x-1/2 bg-[hsl(225,22%,6%)] px-4 text-xs font-bold tracking-[0.2em] text-muted-foreground hidden md:block">URGENT</div>
        <div className="absolute top-1/2 -left-8 -translate-y-1/2 -rotate-90 bg-[hsl(225,22%,6%)] px-4 text-xs font-bold tracking-[0.2em] text-muted-foreground hidden md:block">IMPORTANT</div>

        {quadrants.map((quad) => {
          const quadTasks = tasks?.filter(t => t.category === quad.id) || [];
          
          return (
            <motion.div 
              key={quad.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`group relative rounded-2xl border ${quad.borderClass} ${quad.bgClass} p-4 flex flex-col transition-all duration-500 ${quad.glowClass}`}
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <div>
                  <h3 className="font-black text-lg" style={{ color: quad.color }}>{quad.label}</h3>
                  <p className="text-xs text-muted-foreground">{quad.desc}</p>
                </div>
                <Badge variant="outline" style={{ borderColor: quad.color, color: quad.color }} className="bg-background/50">
                  {quadTasks.length}
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                <AnimatePresence mode="popLayout">
                  {quadTasks.map((task) => (
                    <motion.div
                      layout
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 rounded-xl border border-white/5 bg-[hsla(225,20%,5%,0.6)] backdrop-blur-md relative overflow-hidden ${
                        task.completed ? 'opacity-50 grayscale' : ''
                      }`}
                    >
                      {task.completed && (
                        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
                      )}
                      
                      <div className="flex items-start gap-3">
                        <button 
                          onClick={() => toggleTask(task.id)}
                          className={`mt-0.5 shrink-0 transition-colors ${task.completed ? 'text-emerald-500' : 'text-muted-foreground hover:text-white'}`}
                        >
                          {task.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${task.completed ? 'line-through text-muted-foreground' : 'text-white'}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </div>
                            )}
                            {task.priority && task.priority > 3 && (
                              <div className="flex items-center gap-1 text-[10px] text-red-400">
                                <AlertCircle className="h-3 w-3" />
                                High Priority
                              </div>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="shrink-0 text-muted-foreground/50 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {quadTasks.length === 0 && (
                  <div className="h-full min-h-[100px] flex items-center justify-center opacity-30">
                    <p className="text-sm text-muted-foreground">Empty Quadrant</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
    </div>
  );
}
