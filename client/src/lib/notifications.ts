import { createElement } from "react";
import { toast } from "@/hooks/use-toast";
import { ToastAction, type ToastActionElement } from "@/components/ui/toast";

// Notification types
export interface NotificationOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Predefined notification messages
export const NotificationMessages = {
  // Task notifications
  TASK_CREATED: {
    title: "✅ Task Created",
    description: "New task has been added to your matrix.",
  },
  TASK_UPDATED: {
    title: "📝 Task Updated",
    description: "Task has been successfully updated.",
  },
  TASK_COMPLETED: {
    title: "🎉 Task Completed",
    description: "Great job! Keep up the momentum.",
  },
  TASK_DELETED: {
    title: "🗑️ Task Deleted",
    description: "Task has been removed from your list.",
  },

  // Focus session notifications
  FOCUS_STARTED: {
    title: "🎯 Focus Session Started",
    description: "Stay focused and avoid distractions.",
  },
  FOCUS_PAUSED: {
    title: "⏸️ Focus Session Paused",
    description: "Take a moment to recharge.",
  },
  FOCUS_RESUMED: {
    title: "▶️ Focus Session Resumed",
    description: "Back to work! You've got this.",
  },
  FOCUS_COMPLETED: {
    title: "🏆 Focus Session Complete",
    description: "Excellent work! Time for a well-deserved break.",
  },
  FOCUS_BREAK_TIME: {
    title: "☕ Break Time",
    description: "Take 5 minutes to rest and recharge.",
  },

  // Monk mode notifications
  MONK_MODE_ACTIVATED: {
    title: "🧘 Monk Mode Activated",
    description: "Distractions blocked. Deep focus mode enabled.",
  },
  MONK_MODE_ENDING: {
    title: "⏰ Monk Mode Ending Soon",
    description: "5 minutes remaining in your focus session.",
  },
  MONK_MODE_COMPLETE: {
    title: "✨ Monk Mode Complete",
    description: "Incredible focus! You've achieved deep work state.",
  },

  // Brain training notifications
  BRAIN_GAME_STARTED: {
    title: "🧠 Brain Training Started",
    description: "Challenge your cognitive abilities!",
  },
  BRAIN_GAME_COMPLETED: {
    title: "🎯 Brain Training Complete",
    description: "Your mind is getting sharper!",
  },
  NEW_HIGH_SCORE: {
    title: "🏆 New High Score!",
    description: "You've beaten your personal best!",
  },
  BRAIN_STREAK: {
    title: "🔥 Brain Training Streak",
    description: "You're on fire! Keep the momentum going.",
  },

  // Fitness notifications
  WORKOUT_STARTED: {
    title: "💪 Workout Started",
    description: "Let's get moving! Your body will thank you.",
  },
  WORKOUT_COMPLETED: {
    title: "🎉 Workout Complete",
    description: "Fantastic effort! You've earned those endorphins.",
  },
  STEP_GOAL_REACHED: {
    title: "👟 Step Goal Reached",
    description: "You've hit your daily step target!",
  },
  EXERCISE_REMINDER: {
    title: "🏃 Time to Move",
    description: "You've been sitting for a while. Time for some movement!",
  },

  // Goal and achievement notifications
  DAILY_GOAL_ACHIEVED: {
    title: "🌟 Daily Goal Achieved",
    description: "You've completed all your tasks for today!",
  },
  WEEKLY_STREAK: {
    title: "🔥 Weekly Streak",
    description: "Seven days of productivity! You're unstoppable.",
  },
  PRODUCTIVITY_MILESTONE: {
    title: "📈 Productivity Milestone",
    description: "You've reached a new productivity level!",
  },

  // System notifications
  DATA_SYNCED: {
    title: "☁️ Data Synced",
    description: "Your progress has been saved to the cloud.",
  },
  BACKUP_COMPLETE: {
    title: "💾 Backup Complete",
    description: "Your data has been safely backed up.",
  },
  UPDATE_AVAILABLE: {
    title: "🔄 Update Available",
    description: "New features and improvements are ready!",
  },

  // Error notifications
  NETWORK_ERROR: {
    title: "🌐 Connection Issue",
    description: "Please check your internet connection and try again.",
    variant: "destructive" as const,
  },
  SAVE_ERROR: {
    title: "💾 Save Failed",
    description: "Unable to save your changes. Please try again.",
    variant: "destructive" as const,
  },
  PERMISSION_ERROR: {
    title: "🔒 Permission Required",
    description: "Please grant the necessary permissions to continue.",
    variant: "destructive" as const,
  },
} as const;

// Notification service class
export class NotificationService {
  private static instance: NotificationService;
  private notificationQueue: NotificationOptions[] = [];
  private isProcessing = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Show a notification immediately
  show(options: NotificationOptions): void {
    toast({
      title: options.title,
      description: options.description,
      variant: options.variant || "default",
      duration: options.duration,
      action: options.action
        ? createElement(ToastAction, { altText: options.action.label, onClick: options.action.onClick }, options.action.label) as unknown as ToastActionElement
        : undefined,
    });
  }

  // Show predefined notification
  showPredefined(messageKey: keyof typeof NotificationMessages, customDescription?: string): void {
    const message = NotificationMessages[messageKey];
    this.show({
      ...message,
      description: customDescription || message.description,
    });
  }

  // Queue a notification for later
  queue(options: NotificationOptions): void {
    this.notificationQueue.push(options);
    this.processQueue();
  }

  // Process queued notifications
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (notification) {
        this.show(notification);
        // Wait between notifications to avoid spam
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    this.isProcessing = false;
  }

  // Show success notification
  success(title: string, description?: string): void {
    this.show({
      title: `✅ ${title}`,
      description,
      variant: "default",
    });
  }

  // Show error notification
  error(title: string, description?: string): void {
    this.show({
      title: `❌ ${title}`,
      description,
      variant: "destructive",
    });
  }

  // Show info notification
  info(title: string, description?: string): void {
    this.show({
      title: `ℹ️ ${title}`,
      description,
      variant: "default",
    });
  }

  // Show warning notification
  warning(title: string, description?: string): void {
    this.show({
      title: `⚠️ ${title}`,
      description,
      variant: "default",
    });
  }

  // Productivity-specific notifications
  motivational(): void {
    const motivationalMessages = [
      { title: "💪 You're Doing Great!", description: "Keep up the excellent work!" },
      { title: "🚀 Momentum Building", description: "You're on a productivity roll!" },
      { title: "🎯 Focus Power", description: "Your concentration is impressive!" },
      { title: "⭐ Star Performer", description: "You're crushing your goals today!" },
      { title: "🔥 On Fire", description: "Your productivity is through the roof!" },
    ];

    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    this.show(randomMessage);
  }

  // Reminder notifications
  reminder(title: string, description: string, action?: { label: string; onClick: () => void }): void {
    this.show({
      title: `🔔 ${title}`,
      description,
      action,
      duration: 10000, // Longer duration for reminders
    });
  }

  // Achievement notifications with confetti effect
  achievement(title: string, description: string): void {
    this.show({
      title: `🏆 ${title}`,
      description,
      duration: 5000,
    });

    // Trigger confetti effect (if available)
    if (typeof window !== "undefined" && (window as any).confetti) {
      (window as any).confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }

  // Progress notifications
  progress(title: string, percentage: number): void {
    this.show({
      title: `📊 ${title}`,
      description: `${percentage}% complete`,
    });
  }

  // Time-based reminders
  scheduleReminder(title: string, description: string, delayMs: number): void {
    setTimeout(() => {
      this.reminder(title, description);
    }, delayMs);
  }

  // Break reminders
  breakReminder(): void {
    this.reminder(
      "Time for a Break",
      "You've been working for a while. Take a 5-minute break to recharge.",
      {
        label: "Start Break Timer",
        onClick: () => {
          // This would integrate with the timer system
          console.log("Starting break timer");
        }
      }
    );
  }

  // Hydration reminders
  hydrationReminder(): void {
    this.reminder(
      "Stay Hydrated",
      "Don't forget to drink some water! Your brain needs hydration to function optimally."
    );
  }

  // Posture reminders
  postureReminder(): void {
    this.reminder(
      "Check Your Posture",
      "Sit up straight and adjust your workspace for better ergonomics."
    );
  }
}

// Export singleton instance
export const notifications = NotificationService.getInstance();

// Utility functions for common notification patterns
export const showTaskNotification = (action: string, taskTitle: string) => {
  const messages = {
    created: `Task "${taskTitle}" has been created`,
    updated: `Task "${taskTitle}" has been updated`,
    completed: `Great job completing "${taskTitle}"!`,
    deleted: `Task "${taskTitle}" has been deleted`,
  };

  notifications.success(`Task ${action}`, messages[action as keyof typeof messages]);
};

export const showFocusNotification = (action: string, duration?: number) => {
  const messages = {
    started: "Focus session started. Time to concentrate!",
    paused: "Focus session paused. Take a moment to recharge.",
    resumed: "Focus session resumed. Back to deep work!",
    completed: duration ? `Focus session completed! You focused for ${duration} minutes.` : "Focus session completed!",
  };

  notifications.success(`Focus ${action}`, messages[action as keyof typeof messages]);
};

export const showGameNotification = (gameType: string, score: number, isHighScore = false) => {
  if (isHighScore) {
    notifications.achievement(
      "New High Score!",
      `You scored ${score} points in ${gameType}. Your mind is getting sharper!`
    );
  } else {
    notifications.success(
      "Game Complete",
      `You scored ${score} points in ${gameType}. Great mental workout!`
    );
  }
};

export const showWorkoutNotification = (workoutType: string, duration: number, calories: number) => {
  notifications.achievement(
    "Workout Complete!",
    `You completed a ${duration}-minute ${workoutType} workout and burned ${calories} calories. Excellent work!`
  );
};

// Periodic reminder system
export const startPeriodicReminders = () => {
  // Break reminder every 45 minutes
  setInterval(() => {
    notifications.breakReminder();
  }, 45 * 60 * 1000);

  // Hydration reminder every 2 hours
  setInterval(() => {
    notifications.hydrationReminder();
  }, 2 * 60 * 60 * 1000);

  // Posture reminder every 30 minutes
  setInterval(() => {
    notifications.postureReminder();
  }, 30 * 60 * 1000);

  // Motivational message every 3 hours
  setInterval(() => {
    notifications.motivational();
  }, 3 * 60 * 60 * 1000);
};

// Browser notification API integration (if permission granted)
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const showBrowserNotification = (title: string, options: NotificationOptions) => {
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      body: options.description,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options.action) {
        options.action.onClick();
      }
    };

    // Auto close after duration
    setTimeout(() => {
      notification.close();
    }, options.duration || 5000);
  }
};
