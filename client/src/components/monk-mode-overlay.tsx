import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MonkModeOverlay() {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    const handleStart = (e: any) => {
      const minutes = e.detail?.duration || 25;
      const seconds = minutes * 60;
      setTotalTime(seconds);
      setTimeLeft(seconds);
      setIsActive(true);
      
      // Tell Chrome Extension to start blocking distracting sites
      window.postMessage({
        source: "FOCUS_FLOW_APP",
        type: "START_MONK_MODE",
        payload: { domains: ["youtube.com", "reddit.com", "twitter.com", "instagram.com", "facebook.com", "tiktok.com"] }
      }, "*");
    };

    window.addEventListener("monk-mode-start", handleStart);
    return () => window.removeEventListener("monk-mode-start", handleStart);
  }, []);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      if (isActive && timeLeft <= 0) {
        setIsActive(false);
        window.postMessage({ source: "FOCUS_FLOW_APP", type: "STOP_MONK_MODE" }, "*");
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  if (!isActive) return null;

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-black to-blue-900/20" />
        
        <div className="relative z-10 flex flex-col items-center space-y-12">
          {/* Top Header */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center space-x-3 text-purple-400"
          >
            <Shield className="h-6 w-6" />
            <h2 className="text-xl font-bold tracking-widest uppercase">Monk Mode Active</h2>
          </motion.div>

          {/* Central Timer */}
          <div className="relative w-80 h-80 flex items-center justify-center">
            {/* Pulsing glow behind timer */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-purple-500/20 blur-3xl" 
            />
            
            {/* SVG Progress Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="160"
                cy="160"
                r="150"
                className="stroke-white/10"
                strokeWidth="8"
                fill="none"
              />
              <motion.circle
                cx="160"
                cy="160"
                r="150"
                className="stroke-purple-500"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                initial={{ strokeDasharray: "942", strokeDashoffset: "942" }}
                animate={{ strokeDashoffset: 942 - (942 * progress) / 100 }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </svg>

            {/* Time Display */}
            <div className="text-center font-mono">
              <motion.div 
                key={timeLeft}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-7xl font-black text-white drop-shadow-2xl"
              >
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </motion.div>
              <p className="text-purple-300/60 mt-4 text-sm font-bold tracking-[0.3em] uppercase">Deep Focus</p>
            </div>
          </div>

          {/* Action Button */}
          <Button 
            variant="ghost" 
            onClick={() => {
              setIsActive(false);
              window.postMessage({ source: "FOCUS_FLOW_APP", type: "STOP_MONK_MODE" }, "*");
            }}
            className="text-white/40 hover:text-white hover:bg-white/10 px-8 py-6 rounded-full transition-all"
          >
            <ArrowLeft className="mr-3 h-5 w-5" /> Terminate Session early
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
