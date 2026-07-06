import { motion } from "framer-motion";
import { useQueries } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Brain, Dumbbell, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const activityIcons = {
  task: CheckCircle2,
  focus: Target,
  brain: Brain,
  fitness: Dumbbell,
  default: Clock
};

const activityColors = {
  task: "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
  focus: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  brain: "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  fitness: "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400",
  default: "bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400"
};

interface Activity {
  id: string;
  type: keyof typeof activityIcons;
  title: string;
  description: string;
  timestamp: Date;
  status?: "completed" | "started" | "failed";
}

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
};

function buildActivities(tasks: any[] = [], focusSessions: any[] = [], brainScores: any[] = [], fitnessRows: any[] = []): Activity[] {
  const taskActivities = tasks
    .map((task) => {
      const timestamp = toDate(task.updatedAt) || toDate(task.createdAt);
      if (!timestamp) return null;
      return {
        id: `task-${task.id}`,
        type: "task" as const,
        title: task.completed ? `Completed "${task.title}"` : `Updated "${task.title}"`,
        description: task.category ? `Task category: ${task.category}` : "Task updated",
        timestamp,
        status: task.completed ? ("completed" as const) : undefined
      };
    })
    .filter(Boolean) as Activity[];

  const focusActivities = focusSessions
    .map((session) => {
      const timestamp = toDate(session.endTime) || toDate(session.startTime) || toDate(session.createdAt);
      if (!timestamp) return null;
      return {
        id: `focus-${session.id}`,
        type: "focus" as const,
        title: session.completed ? "Completed focus session" : "Started focus session",
        description: session.taskId ? `Linked task: ${session.taskId}` : `${session.duration || 0} minute focus block`,
        timestamp,
        status: session.completed ? ("completed" as const) : ("started" as const)
      };
    })
    .filter(Boolean) as Activity[];

  const brainActivities = brainScores
    .map((score) => {
      const timestamp = toDate(score.createdAt);
      if (!timestamp) return null;
      return {
        id: `brain-${score.id}`,
        type: "brain" as const,
        title: `Brain training: ${score.gameType || "session"}`,
        description: `Score: ${score.score ?? 0}`,
        timestamp,
        status: "completed" as const
      };
    })
    .filter(Boolean) as Activity[];

  const fitnessActivities = fitnessRows
    .map((row) => {
      const timestamp = toDate(row.date) || toDate(row.createdAt);
      if (!timestamp) return null;
      return {
        id: `fitness-${row.id}`,
        type: "fitness" as const,
        title: "Fitness data recorded",
        description: `${row.steps ?? 0} steps, ${row.exerciseMinutes ?? 0} exercise minutes`,
        timestamp,
        status: "completed" as const
      };
    })
    .filter(Boolean) as Activity[];

  return [...taskActivities, ...focusActivities, ...brainActivities, ...fitnessActivities]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);
}

export default function RecentActivity() {
  const [tasksQuery, focusQuery, brainQuery, fitnessQuery] = useQueries({
    queries: [
      { queryKey: ["/api/tasks"], staleTime: 30_000 },
      { queryKey: ["/api/focus-sessions"], staleTime: 30_000 },
      { queryKey: ["/api/brain-games/scores"], staleTime: 30_000 },
      { queryKey: ["/api/fitness"], staleTime: 30_000 }
    ]
  });

  const isLoading = [tasksQuery, focusQuery, brainQuery, fitnessQuery].some((query) => query.isLoading);
  const activities = buildActivities(
    (tasksQuery.data as any[]) ?? [],
    (focusQuery.data as any[]) ?? [],
    (brainQuery.data as any[]) ?? [],
    (fitnessQuery.data as any[]) ?? []
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
              <p className="font-medium text-gray-500 dark:text-gray-400">No recent activity</p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                Real task, focus, brain training, and fitness events will appear here.
              </p>
            </div>
          ) : (
            activities.map((activity, index) => {
              const Icon = activityIcons[activity.type] || activityIcons.default;
              const colorClass = activityColors[activity.type] || activityColors.default;

              return (
                <motion.div
                  key={activity.id}
                  className="flex items-start space-x-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  data-testid={`activity-item-${activity.id}`}
                >
                  <div className={cn("mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full", colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {activity.description}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>

                  {activity.status && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "flex-shrink-0 text-xs",
                        activity.status === "completed" && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                        activity.status === "started" && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                        activity.status === "failed" && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                      )}
                    >
                      {activity.status}
                    </Badge>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
