import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  Circle,
  Clock,
  FileUp,
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
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
  },
  {
    id: "important-urgent",
    label: "DO NOW",
    desc: "Important & Urgent",
    color: "hsl(350,100%,60%)",
    bgClass: "bg-[hsla(350,100%,60%,0.05)]",
    borderClass: "border-rose-500/20",
    glowClass: "group-hover:shadow-[0_0_30px_hsla(350,100%,60%,0.15)]",
  },
  {
    id: "not-important-not-urgent",
    label: "ELIMINATE",
    desc: "Not Important, Not Urgent",
    color: "hsl(220,10%,50%)",
    bgClass: "bg-[hsla(220,10%,50%,0.05)]",
    borderClass: "border-slate-500/20",
    glowClass: "group-hover:shadow-[0_0_30px_hsla(220,10%,50%,0.15)]",
  },
  {
    id: "not-important-urgent",
    label: "DELEGATE",
    desc: "Not Important, Urgent",
    color: "hsl(30,100%,60%)",
    bgClass: "bg-[hsla(30,100%,60%,0.05)]",
    borderClass: "border-orange-500/20",
    glowClass: "group-hover:shadow-[0_0_30px_hsla(30,100%,60%,0.15)]",
  }
] as const;

export default function TasksGraph() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [quickTask, setQuickTask] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [lastImportSummary, setLastImportSummary] = useState<string>("Upload a TXT, CSV, TSV, JSON, or rough text dump. The backend agent cleans it and auto-sorts it into the matrix.");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    tasks,
    isLoading,
    error,
    toggleTask,
    deleteTask,
    createTask,
    updateTask,
    refetch,
    getTaskStats,
    syncTaskToCalendar,
    syncTaskToCalendarMutation,
    syncActionableTasksToCalendar,
    syncActionableTasksMutation,
    importTasksFromFile,
    importTasksMutation,
  } = useTasks();

  const stats = getTaskStats();
  const taskList = tasks ?? [];
  const taskErrorMessage = error instanceof Error ? error.message : null;

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTask.trim()) return;

    await createTask({
      title: quickTask,
      category: "important-not-urgent",
      priority: 2,
    });
    setQuickTask("");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importTasksFromFile(file);
    setLastImportSummary(`Imported ${result.importedCount} tasks from ${file.name} using ${result.mode} sorting.`);
    e.target.value = "";
  };

  const handleTaskDrop = async (category: string) => {
    if (!draggingTaskId) return;
    await updateTask(draggingTaskId, { category });
    setDraggingTaskId(null);
    setActiveDropZone(null);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[1680px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {(isLoading || taskErrorMessage) && (
        <div className={`rounded-2xl border p-4 ${
          taskErrorMessage
            ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
            : "border-indigo-500/25 bg-indigo-500/10 text-indigo-100"
        }`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {taskErrorMessage ? (
                <AlertCircle className="h-5 w-5 shrink-0" />
              ) : (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {taskErrorMessage ? "Tasks API is not responding cleanly" : "Refreshing tasks"}
                </p>
                <p className="mt-1 text-xs opacity-80">
                  {taskErrorMessage || "The matrix is usable while the latest tasks load."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]"
      >
        <Card className="glass-card border-[hsla(245,82%,63%,0.2)]">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(245,82%,63%)] to-[hsl(280,72%,58%)] shadow-[0_0_30px_hsla(245,82%,63%,0.3)]">
                    <Wand2 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Tasks & Matrix</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      AI-assisted import, automatic sort, drag-and-drop correction, and calendar-ready execution.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleImportClick} variant="outline" className="h-11 border-indigo-500/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15">
                    <FileUp className="mr-2 h-4 w-4" />
                    Import File
                  </Button>
                  <Button
                    onClick={syncActionableTasksToCalendar}
                    disabled={syncActionableTasksMutation.isPending}
                    variant="outline"
                    className="h-11 border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                  >
                    {syncActionableTasksMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarPlus className="mr-2 h-4 w-4" />
                    )}
                    Sync Actionable To Calendar
                  </Button>
                  <Button onClick={() => setIsTaskModalOpen(true)} className="h-11 gradient-bg text-white glow-primary">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Deep Work Task
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
                <div className="rounded-2xl border border-indigo-500/20 bg-[hsla(245,82%,63%,0.06)] p-4">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <FileUp className="h-4 w-4" />
                    <span className="text-sm font-semibold uppercase tracking-[0.18em]">Smart Import</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{lastImportSummary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-[11px] text-slate-300">TXT</Badge>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-[11px] text-slate-300">CSV</Badge>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-[11px] text-slate-300">TSV</Badge>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-[11px] text-slate-300">JSON</Badge>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-[11px] text-slate-300">Junk notes</Badge>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv,.tsv,.json,.md,.log,text/*"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[hsla(225,20%,5%,0.5)] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Action Layer</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Drag any task between boxes to override the AI sort. Bulk calendar sync pushes everything except <span className="text-slate-400">Eliminate</span>.
                      </p>
                    </div>
                    <div className="min-w-[170px]">
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-3xl font-black text-white">{stats.completed}</span>
                          <span className="ml-2 text-sm text-muted-foreground">/ {stats.total}</span>
                        </div>
                        <span className="font-mono text-emerald-400">{stats.completionRate}%</span>
                      </div>
                      <Progress value={stats.completionRate} className="mt-3 h-2 bg-background/50" indicatorClassName="bg-emerald-400 shadow-[0_0_10px_#10b981]" />
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleQuickAdd} className="relative max-w-xl">
                <Input
                  placeholder="Quick add task... press Enter"
                  value={quickTask}
                  onChange={(e) => setQuickTask(e.target.value)}
                  className="h-12 rounded-xl border-[hsla(245,82%,63%,0.3)] bg-[hsla(225,20%,5%,0.5)] pr-12 focus-visible:ring-[hsl(245,82%,63%)]"
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
          </CardContent>
        </Card>

        <Card className="glass-card border-emerald-500/20 relative overflow-hidden">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 bg-emerald-500/10 blur-[50px]" />
          <CardContent className="flex h-full flex-col justify-center p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-emerald-400">
                <span className="text-sm font-bold uppercase tracking-wider">Execution Pulse</span>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                Drag enabled
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-background/30 p-3">
                <span className="text-sm text-muted-foreground">Imported</span>
                <span className="font-semibold text-white">{importTasksMutation.isPending ? "Working..." : "Ready"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-background/30 p-3">
                <span className="text-sm text-muted-foreground">Calendar Sync</span>
                <span className="font-semibold text-white">{syncActionableTasksMutation.isPending ? "Syncing..." : "Standby"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-background/30 p-3">
                <span className="text-sm text-muted-foreground">Quadrant Load</span>
                <span className="font-semibold text-white">{stats.pending} active tasks</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="relative grid flex-1 grid-cols-1 gap-4 rounded-3xl border border-white/5 bg-[hsla(225,20%,8%,0.4)] p-6 md:grid-cols-2">
        <div className="absolute left-1/2 top-0 bottom-0 hidden w-px bg-white/10 md:block" />
        <div className="absolute left-0 right-0 top-1/2 hidden h-px bg-white/10 md:block" />

        <div className="absolute left-1/2 -top-3 hidden -translate-x-1/2 bg-[hsl(225,22%,6%)] px-4 text-xs font-bold tracking-[0.2em] text-muted-foreground md:block">
          URGENT
        </div>
        <div className="absolute top-1/2 -left-8 hidden -translate-y-1/2 -rotate-90 bg-[hsl(225,22%,6%)] px-4 text-xs font-bold tracking-[0.2em] text-muted-foreground md:block">
          IMPORTANT
        </div>

        {quadrants.map((quad) => {
          const quadTasks = taskList.filter((t) => t.category === quad.id);
          const isActiveDrop = activeDropZone === quad.id;

          return (
            <motion.div
              key={quad.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onDragOver={(event) => {
                event.preventDefault();
                setActiveDropZone(quad.id);
              }}
              onDragLeave={() => setActiveDropZone((current) => (current === quad.id ? null : current))}
              onDrop={async (event) => {
                event.preventDefault();
                await handleTaskDrop(quad.id);
              }}
              className={`group relative flex flex-col rounded-2xl border p-4 transition-all duration-500 ${quad.borderClass} ${quad.bgClass} ${quad.glowClass} ${
                isActiveDrop ? "ring-2 ring-white/30 shadow-[0_0_30px_rgba(255,255,255,0.08)]" : ""
              }`}
            >
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-lg font-black" style={{ color: quad.color }}>{quad.label}</h3>
                  <p className="text-xs text-muted-foreground">{quad.desc}</p>
                </div>
                <Badge variant="outline" style={{ borderColor: quad.color, color: quad.color }} className="bg-background/50">
                  {quadTasks.length}
                </Badge>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {quadTasks.map((task) => (
                    <motion.div
                      layout
                      key={task.id}
                      draggable
                      onDragStart={() => {
                        setDraggingTaskId(task.id);
                        setActiveDropZone(null);
                      }}
                      onDragEnd={() => {
                        setDraggingTaskId(null);
                        setActiveDropZone(null);
                      }}
                      initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                      whileHover={{ scale: 1.02 }}
                      className={`relative overflow-hidden rounded-xl border border-white/5 bg-[hsla(225,20%,5%,0.6)] p-3 backdrop-blur-md ${
                        task.completed ? "opacity-50 grayscale" : ""
                      } ${draggingTaskId === task.id ? "cursor-grabbing ring-2 ring-indigo-400/30" : "cursor-grab"}`}
                    >
                      {task.completed && <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />}

                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`mt-0.5 shrink-0 transition-colors ${task.completed ? "text-emerald-500" : "text-muted-foreground hover:text-white"}`}
                        >
                          {task.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className={`text-sm font-medium leading-tight ${task.completed ? "line-through text-muted-foreground" : "text-white"}`}>
                              {task.title}
                            </p>
                            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-white/25" />
                          </div>
                          {task.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-3">
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

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => syncTaskToCalendar(task.id)}
                            disabled={syncTaskToCalendarMutation.isPending}
                            className="text-muted-foreground/50 transition-colors hover:text-indigo-400 disabled:opacity-50"
                            title="Sync to Google Calendar"
                          >
                            {syncTaskToCalendarMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CalendarPlus className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-muted-foreground/50 transition-colors hover:text-red-400"
                            title="Delete Task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {quadTasks.length === 0 && (
                  <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background/10">
                    <p className="text-sm text-muted-foreground">
                      {isActiveDrop ? "Drop task here" : "Empty Quadrant"}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />
    </div>
  );
}
