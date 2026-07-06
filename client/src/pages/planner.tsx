import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import Schedule from "@/components/dashboard/schedule";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Planner() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-[calc(100vh-64px)] p-6 lg:p-10 bg-background">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="w-11 h-11 rounded-2xl gradient-bg flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            {greeting()}
          </h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
      </motion.div>

      <div className="max-w-3xl">
        <Schedule />
      </div>
    </div>
  );
}
