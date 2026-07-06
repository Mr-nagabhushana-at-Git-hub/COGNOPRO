import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calendar, CalendarPlus, Video, AlertTriangle, Brain, Dumbbell, Clock,
  Loader2, Trash2, Cloud, CloudOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  duration: number;
  type: "meeting" | "task" | "brain-training" | "fitness" | "break";
  priority: "high" | "medium" | "low";
  location?: string | null;
  source?: "local" | "google";
  googleEventId?: string | null;
}

const eventColors: Record<string, string> = {
  meeting: "bg-blue-500/10 border-l-blue-500 text-blue-100",
  task: "bg-emerald-500/10 border-l-emerald-500 text-emerald-100",
  "brain-training": "bg-purple-500/10 border-l-purple-500 text-purple-100",
  fitness: "bg-rose-500/10 border-l-rose-500 text-rose-100",
  break: "bg-slate-500/10 border-l-slate-400 text-slate-100",
};

const eventIcons: Record<string, any> = {
  meeting: Video,
  task: AlertTriangle,
  "brain-training": Brain,
  fitness: Dumbbell,
  break: Clock,
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

const isUpcoming = (e: CalendarEvent): boolean => {
  const end = new Date(e.startTime).getTime() + e.duration * 60 * 1000;
  return end > Date.now();
};
const isActive = (e: CalendarEvent): boolean => {
  const start = new Date(e.startTime).getTime();
  const end = start + e.duration * 60 * 1000;
  return Date.now() >= start && Date.now() < end;
};

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  // format for datetime-local input (local time)
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function Schedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startTime: defaultStart(),
    duration: "30",
    type: "task",
    priority: "medium",
    location: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/calendar/events"],
    select: (d) => d as { events: CalendarEvent[]; googleConnected: boolean },
  });

  const events = data?.events ?? [];
  const googleConnected = data?.googleConnected ?? false;

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startTime: new Date(form.startTime).toISOString(),
        duration: parseInt(form.duration) || 30,
        type: form.type,
        priority: form.priority,
        location: form.location.trim() || undefined,
      };
      const res = await apiRequest("POST", "/api/calendar/events", payload);
      return res.json();
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setOpen(false);
      setForm({ ...form, title: "", description: "", location: "" });
      toast({
        title: "Event added",
        description: res?.googleSynced ? "Saved and synced to Google Calendar." : "Saved to your planner.",
      });
    },
    onError: () => toast({ title: "Error", description: "Could not add event.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/calendar/events/${id}`); return id; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] }),
    onError: () => toast({ title: "Error", description: "Could not delete event.", variant: "destructive" }),
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
            {googleConnected ? (
              <Badge variant="secondary" className="ml-1 gap-1 bg-emerald-500/15 text-emerald-300 border-0">
                <Cloud className="h-3 w-3" /> Google synced
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-1 gap-1 bg-white/5 text-muted-foreground border-0">
                <CloudOff className="h-3 w-3" /> Local only
              </Badge>
            )}
          </CardTitle>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" data-testid="button-add-event">
                <CalendarPlus className="h-4 w-4 mr-1" /> Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Event title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  data-testid="input-event-title"
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Start</label>
                    <Input
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      data-testid="input-event-start"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Duration (min)</label>
                    <Input
                      type="number"
                      min={5}
                      step={5}
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Type</label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="brain-training">Brain Training</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="break">Break</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Priority</label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Input
                  placeholder="Location (optional)"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  className="gradient-bg text-white"
                  disabled={!form.title.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                  data-testid="button-save-event"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Add Event
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading events...
          </div>
        ) : !events.length ? (
          <div className="text-center py-10">
            <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No events scheduled</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Add an event to start planning your day.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => {
              const Icon = eventIcons[event.type] || Clock;
              const colorClass = eventColors[event.type] || eventColors.break;
              const upcoming = isUpcoming(event);
              const active = isActive(event);
              const isGoogle = event.source === "google";
              return (
                <motion.div
                  key={event.id}
                  className={cn(
                    "group flex items-center gap-4 p-3 border-l-4 rounded-r-lg transition-all",
                    colorClass,
                    active && "ring-2 ring-primary/30 shadow-md",
                    !upcoming && "opacity-50"
                  )}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  data-testid={`schedule-item-${event.id}`}
                >
                  <div className="text-center flex-shrink-0 w-16">
                    <p className="text-xs font-medium">{formatTime(event.startTime)}</p>
                    <p className="text-xs opacity-70">{event.duration}min</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-medium text-sm">{event.title}</p>
                      {active && <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-xs">Active</Badge>}
                      {event.priority === "high" && <Badge variant="destructive" className="text-xs">High</Badge>}
                      {isGoogle && <Cloud className="h-3 w-3 text-blue-300" />}
                    </div>
                    {event.description && <p className="text-xs opacity-70 line-clamp-1">{event.description}</p>}
                    {event.location && <p className="text-xs opacity-60 mt-0.5">📍 {event.location}</p>}
                  </div>
                  <Icon className="h-5 w-5 opacity-50 flex-shrink-0" />
                  {!isGoogle && (
                    <button
                      onClick={() => deleteMutation.mutate(event.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-all"
                      data-testid={`delete-event-${event.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {!googleConnected && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-sm text-muted-foreground">
              Connect your Google account in{" "}
              <a href="/settings" className="text-indigo-400 hover:text-indigo-300 underline">Settings</a>{" "}
              to sync events with Google Calendar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
