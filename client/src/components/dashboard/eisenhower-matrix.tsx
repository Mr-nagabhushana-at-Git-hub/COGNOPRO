import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExpandIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";

const categories = [
  {
    id: 'important-urgent',
    title: 'Important & Urgent',
    description: 'Do First',
    colorClass: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
    badgeClass: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
  },
  {
    id: 'important-not-urgent',
    title: 'Important & Not Urgent', 
    description: 'Schedule',
    colorClass: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
    badgeClass: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
  },
  {
    id: 'not-important-urgent',
    title: 'Not Important & Urgent',
    description: 'Delegate', 
    colorClass: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
    badgeClass: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
  },
  {
    id: 'not-important-not-urgent',
    title: 'Not Important & Not Urgent',
    description: 'Eliminate',
    colorClass: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    badgeClass: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
  }
];

export default function EisenhowerMatrix() {
  const { tasks, isLoading, toggleTask } = useTasks();

  const getTasksByCategory = (categoryId: string) => {
    return tasks?.filter(task => task.category === categoryId) || [];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eisenhower Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Eisenhower Matrix
          </CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-expand-matrix">
            <ExpandIcon className="h-4 w-4 mr-1" />
            Expand
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-96 lg:h-[500px]">
          {categories.map((category, index) => {
            const categoryTasks = getTasksByCategory(category.id);
            
            return (
              <motion.div
                key={category.id}
                className={cn(
                  "matrix-cell border-2 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer",
                  category.colorClass
                )}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                data-testid={`matrix-cell-${category.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {category.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {category.description}
                    </p>
                  </div>
                  <Badge className={cn("text-xs", category.badgeClass)}>
                    {categoryTasks.length}
                  </Badge>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categoryTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No tasks in this category
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 text-xs"
                        data-testid={`button-add-to-${category.id}`}
                      >
                        + Add Task
                      </Button>
                    </div>
                  ) : (
                    categoryTasks.slice(0, 4).map((task) => (
                      <motion.div
                        key={task.id}
                        className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        data-testid={`task-card-${task.id}`}
                      >
                        <div className="flex items-start space-x-2">
                          <Checkbox
                    checked={Boolean(task.completed)}
                            onCheckedChange={() => toggleTask(task.id)}
                            className="mt-0.5"
                            data-testid={`checkbox-${task.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium",
                              task.completed 
                                ? "line-through text-gray-500 dark:text-gray-400" 
                                : "text-gray-900 dark:text-white"
                            )}>
                              {task.title}
                            </p>
                            {task.dueDate && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                  
                  {categoryTasks.length > 4 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                      +{categoryTasks.length - 4} more tasks
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
