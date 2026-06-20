import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, InsertTask } from "@shared/schema";

type TaskInput = Omit<InsertTask, "userId">;

export function useTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all tasks
  const {
    data: tasks,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["/api/tasks"],
    select: (data) => data as Task[],
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskInput) => {
      const response = await apiRequest('POST', '/api/tasks', taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskInput> }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/tasks/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle task completion
  const toggleTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const task = tasks?.find(t => t.id === id);
      if (!task) throw new Error('Task not found');
      
      const response = await apiRequest('PATCH', `/api/tasks/${id}`, {
        completed: !task.completed
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const createTask = async (taskData: TaskInput) => {
    return createTaskMutation.mutateAsync(taskData);
  };

  const updateTask = async (id: string, data: Partial<TaskInput>) => {
    return updateTaskMutation.mutateAsync({ id, data });
  };

  const deleteTask = async (id: string) => {
    return deleteTaskMutation.mutateAsync(id);
  };

  const toggleTask = async (id: string) => {
    return toggleTaskMutation.mutateAsync(id);
  };

  // Get tasks by category
  const getTasksByCategory = (category: string) => {
    return tasks?.filter(task => task.category === category) || [];
  };

  // Get task statistics
  const getTaskStats = () => {
    if (!tasks) return { total: 0, completed: 0, pending: 0, completionRate: 0 };
    
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, pending, completionRate };
  };

  // Get high priority tasks
  const getHighPriorityTasks = () => {
    return tasks?.filter(task => !task.completed && task.priority && task.priority >= 4) || [];
  };

  // Get overdue tasks
  const getOverdueTasks = () => {
    const now = new Date();
    return tasks?.filter(task => 
      !task.completed && 
      task.dueDate && 
      new Date(task.dueDate) < now
    ) || [];
  };

  // Get tasks due today
  const getTasksDueToday = () => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    return tasks?.filter(task => 
      !task.completed && 
      task.dueDate && 
      new Date(task.dueDate).toDateString() === todayStr
    ) || [];
  };

  return {
    // Data
    tasks,
    isLoading,
    error,
    
    // Mutations state
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    isToggling: toggleTaskMutation.isPending,
    
    // Actions
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    refetch,
    
    // Helpers
    getTasksByCategory,
    getTaskStats,
    getHighPriorityTasks,
    getOverdueTasks,
    getTasksDueToday,
  };
}

// Hook for tasks by specific category
export function useTasksByCategory(category: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["/api/tasks/category", category],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/category/${category}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks for category: ${category}`);
      }
      return response.json();
    },
    select: (data) => data as Task[],
  });
}

// Hook for a single task
export function useTask(id: string) {
  return useQuery({
    queryKey: ["/api/tasks", id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${id}`);
      }
      return response.json();
    },
    select: (data) => data as Task,
    enabled: !!id,
  });
}
