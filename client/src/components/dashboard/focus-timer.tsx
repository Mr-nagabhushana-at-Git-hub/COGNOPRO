import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { useFocusSession } from "@/hooks/use-focus-session";
import { useTimer } from "@/hooks/use-timer";

export default function FocusTimer() {
  const { activeSession, startSession, updateSession } = useFocusSession();
  const { time, isRunning, start, pause, stop, reset } = useTimer(25 * 60); // 25 minutes default

  const [currentTask, setCurrentTask] = useState("Focus Session");
  const [sessionType, setSessionType] = useState<"pomodoro" | "deep-work" | "custom">("pomodoro");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalTime = sessionType === "pomodoro" ? 25 * 60 : 
                     sessionType === "deep-work" ? 90 * 60 : 25 * 60;
    return ((totalTime - time) / totalTime) * 100;
  };

  const handleStart = () => {
    if (!isRunning) {
      start();
      if (!activeSession) {
        startSession({
          type: sessionType,
          duration: sessionType === "pomodoro" ? 25 : 90,
          taskId: undefined
        });
      }
    }
  };

  const handlePause = () => {
    pause();
    if (activeSession) {
      updateSession(activeSession.id, { isActive: false });
    }
  };

  const handleStop = () => {
    stop();
    if (activeSession) {
      updateSession(activeSession.id, { 
        isActive: false, 
        completed: true,
        endTime: new Date(),
        completedDuration: (25 * 60) - time
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          Focus Timer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-6">
          {/* Circular Progress */}
          <div className="relative w-32 h-32 mx-auto">
            <motion.div
              className="absolute inset-0"
              initial={{ rotate: -90 }}
              animate={{ rotate: -90 }}
            >
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className="text-primary"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - getProgress() / 100)}`}
                  transition={{ duration: 0.5 }}
                />
              </svg>
            </motion.div>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span 
                className="text-2xl font-bold text-primary-600 dark:text-primary-400"
                key={time}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
                data-testid="text-timer-display"
              >
                {formatTime(time)}
              </motion.span>
            </div>
          </div>
          
          {/* Session Info */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {currentTask}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {sessionType === "pomodoro" ? "Pomodoro Session" : 
               sessionType === "deep-work" ? "Deep Work Session" : "Custom Session"}
            </p>
            <div className="flex items-center justify-center space-x-1">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < 2 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex justify-center space-x-2">
            <AnimatePresence mode="wait">
              {!isRunning ? (
                <motion.div
                  key="play"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button
                    onClick={handleStart}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="button-start-timer"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="pause"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button
                    onClick={handlePause}
                    variant="secondary"
                    data-testid="button-pause-timer"
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <Button
              onClick={handleStop}
              variant="outline"
              size="sm"
              data-testid="button-stop-timer"
            >
              <Square className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={() => reset()}
              variant="ghost"
              size="sm"
              data-testid="button-reset-timer"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Session Type Selector */}
          <div className="flex justify-center space-x-1 pt-2">
            <Button
              variant={sessionType === "pomodoro" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSessionType("pomodoro")}
              data-testid="button-pomodoro"
            >
              25m
            </Button>
            <Button
              variant={sessionType === "deep-work" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSessionType("deep-work")}
              data-testid="button-deep-work"
            >
              90m
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
