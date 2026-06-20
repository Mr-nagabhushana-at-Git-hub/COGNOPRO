import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Home,
  CheckSquare,
  Brain,
  Dumbbell,
  HeartHandshake,
  Stethoscope,
  Sparkles,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Tasks & Matrix", href: "/tasks", icon: CheckSquare },
  { name: "Mental Wellness", href: "/wellness", icon: HeartHandshake },
  { name: "Health Predict", href: "/health-predict", icon: Stethoscope },
  { name: "Brain Training", href: "/brain-training", icon: Brain },
  { name: "Fitness Tracker", href: "/fitness", icon: Dumbbell },
];

const sidebarVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { x: -16, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 min-h-[calc(100vh-64px)] border-r border-border/50 bg-[hsl(225_22%_6%)] relative overflow-hidden shrink-0 hidden lg:block">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-[hsla(245,82%,63%,0.06)] rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute bottom-20 right-0 w-32 h-32 bg-[hsla(280,72%,58%,0.04)] rounded-full blur-[50px] pointer-events-none" />

      <motion.nav
        className="relative z-10 mt-6 px-3 space-y-1"
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
      >
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <motion.div key={item.name} variants={itemVariants}>
              <Link href={item.href}>
                <a
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative",
                    isActive
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  )}
                  data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {/* Active indicator glow */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[hsla(245,82%,63%,0.15)] to-[hsla(280,72%,58%,0.10)] border border-[hsla(245,82%,63%,0.25)]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] transition-colors",
                        isActive
                          ? "text-[hsl(245,82%,70%)]"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {item.name}
                  </span>
                  {/* Active dot */}
                  {isActive && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[hsl(245,82%,63%)] glow-primary z-10" />
                  )}
                </a>
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* Bottom accent card */}
      <div className="absolute bottom-6 left-3 right-3">
        <div className="rounded-xl p-4 glass-card border-[hsla(245,82%,63%,0.15)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-foreground">AI Status</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">Engine</span>
              <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">Crisis Guard</span>
              <span className="text-[11px] font-medium text-emerald-400">Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
