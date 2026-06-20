import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FocusSession, InsertFocusSession } from "@shared/schema";

type FocusSessionInput = Omit<InsertFocusSession, "userId">;

export function useFocusSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all focus sessions
  const {
    data: sessions,
    isLoading,
    error
  } = useQuery({
    queryKey: ["/api/focus-sessions"],
    select: (data) => data as FocusSession[],
  });

  // Fetch active focus session
  const {
    data: activeSession,
    isLoading: isLoadingActive
  } = useQuery({
    queryKey: ["/api/focus-sessions/active"],
    select: (data) => data as FocusSession | null,
    refetchInterval: 5000, // Check every 5 seconds for active session
  });

  // Create focus session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (sessionData: FocusSessionInput) => {
      // End any existing active session first
      if (activeSession) {
        await apiRequest('PATCH', `/api/focus-sessions/${activeSession.id}`, {
          isActive: false,
          endTime: new Date(),
          completed: false
        });
      }

      const response = await apiRequest('POST', '/api/focus-sessions', {
        ...sessionData,
        isActive: true,
        startTime: new Date()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/focus-sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to start focus session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update focus session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFocusSession> }) => {
      const response = await apiRequest('PATCH', `/api/focus-sessions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/focus-sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update focus session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const startSession = async (sessionData: FocusSessionInput) => {
    return startSessionMutation.mutateAsync(sessionData);
  };

  const updateSession = async (id: string, data: Partial<InsertFocusSession>) => {
    return updateSessionMutation.mutateAsync({ id, data });
  };

  const pauseSession = async (id: string) => {
    return updateSession(id, { isActive: false });
  };

  const resumeSession = async (id: string) => {
    return updateSession(id, { isActive: true });
  };

  const endSession = async (id: string, completedDuration: number) => {
    return updateSession(id, {
      isActive: false,
      completed: true,
      endTime: new Date(),
      completedDuration
    });
  };

  // Get session statistics
  const getSessionStats = () => {
    if (!sessions) return { 
      totalSessions: 0, 
      totalFocusTime: 0, 
      completedSessions: 0, 
      averageSession: 0,
      todaySessions: 0,
      todayFocusTime: 0
    };

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.completed).length;
    const totalFocusTime = sessions.reduce((sum, s) => sum + (s.completedDuration || 0), 0);
    const averageSession = totalSessions > 0 ? Math.round(totalFocusTime / totalSessions) : 0;

    // Today's stats
    const today = new Date();
    const todayStr = today.toDateString();
    const todaySessions = sessions.filter(s => 
      s.createdAt && new Date(s.createdAt).toDateString() === todayStr
    );
    const todayFocusTime = todaySessions.reduce((sum, s) => sum + (s.completedDuration || 0), 0);

    return {
      totalSessions,
      totalFocusTime,
      completedSessions,
      averageSession,
      todaySessions: todaySessions.length,
      todayFocusTime
    };
  };

  // Get sessions by type
  const getSessionsByType = (type: string) => {
    return sessions?.filter(session => session.type === type) || [];
  };

  // Get recent sessions
  const getRecentSessions = (limit: number = 5) => {
    return sessions?.slice(0, limit) || [];
  };

  // Check if user is currently in a focus session
  const isInFocusSession = () => {
    return activeSession?.isActive || false;
  };

  // Get current session duration (for active sessions)
  const getCurrentSessionDuration = () => {
    if (!activeSession?.isActive || !activeSession.startTime) return 0;
    
    const now = new Date();
    const startTime = new Date(activeSession.startTime);
    return Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60); // in minutes
  };

  // Get productivity streaks
  const getProductivityStreak = () => {
    if (!sessions) return { current: 0, best: 0 };

    // Calculate current streak (consecutive days with focus sessions)
    const today = new Date();
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Get unique dates with sessions
    const sessionDates = Array.from(new Set(
      sessions
        .filter(s => s.completed)
        .map(s => s.createdAt ? new Date(s.createdAt).toDateString() : '')
        .filter(date => date !== '')
    )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Calculate streaks
    for (let i = 0; i < sessionDates.length; i++) {
      const sessionDate = new Date(sessionDates[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (sessionDate.toDateString() === expectedDate.toDateString()) {
        currentStreak++;
        tempStreak++;
      } else {
        if (i === 0) currentStreak = 0; // No session today breaks the streak
        tempStreak = 0;
      }

      bestStreak = Math.max(bestStreak, tempStreak);
    }

    return { current: currentStreak, best: bestStreak };
  };

  return {
    // Data
    sessions,
    activeSession,
    isLoading: isLoading || isLoadingActive,
    error,

    // Mutation states
    isStarting: startSessionMutation.isPending,
    isUpdating: updateSessionMutation.isPending,

    // Actions
    startSession,
    updateSession,
    pauseSession,
    resumeSession,
    endSession,

    // Helpers
    getSessionStats,
    getSessionsByType,
    getRecentSessions,
    isInFocusSession,
    getCurrentSessionDuration,
    getProductivityStreak,
  };
}

// Hook for focus session analytics
export function useFocusSessionAnalytics() {
  return useQuery({
    queryKey: ["/api/focus-sessions/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/focus-sessions", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch focus session analytics");
      }
      const sessions = await response.json();

      // Process analytics
      const today = new Date();
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const todaySessions = sessions.filter((s: FocusSession) => 
        s.createdAt && new Date(s.createdAt).toDateString() === today.toDateString()
      );

      const weekSessions = sessions.filter((s: FocusSession) => 
        s.createdAt && new Date(s.createdAt) >= thisWeek
      );

      const monthSessions = sessions.filter((s: FocusSession) => 
        s.createdAt && new Date(s.createdAt) >= thisMonth
      );

      return {
        today: {
          sessions: todaySessions.length,
          focusTime: todaySessions.reduce((sum: number, s: FocusSession) => sum + (s.completedDuration || 0), 0),
          completed: todaySessions.filter((s: FocusSession) => s.completed).length
        },
        week: {
          sessions: weekSessions.length,
          focusTime: weekSessions.reduce((sum: number, s: FocusSession) => sum + (s.completedDuration || 0), 0),
          completed: weekSessions.filter((s: FocusSession) => s.completed).length
        },
        month: {
          sessions: monthSessions.length,
          focusTime: monthSessions.reduce((sum: number, s: FocusSession) => sum + (s.completedDuration || 0), 0),
          completed: monthSessions.filter((s: FocusSession) => s.completed).length
        },
        all: sessions
      };
    },
    select: (data) => data,
  });
}
