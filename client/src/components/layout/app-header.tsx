import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Bell, Sparkles, Orbit, Sun, Moon, Laptop } from "lucide-react";
import type { Notification } from "@shared/schema";
import MonkModeModal from "@/components/modals/monk-mode-modal";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function AppHeader() {
  const [isMonkModeOpen, setIsMonkModeOpen] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications/unread"],
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.length || 0;
  const ThemeIcon = theme === "system" ? Laptop : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <motion.div
                className="relative w-9 h-9 rounded-xl gradient-bg flex items-center justify-center"
                whileHover={{ scale: 1.08, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="text-white h-4.5 w-4.5" />
                <div className="absolute inset-0 rounded-xl gradient-bg opacity-50 blur-md -z-10" />
              </motion.div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-extrabold gradient-text tracking-tight">
                  COGNO
                </h1>
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Pro
                </span>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/5"
                    data-testid="button-theme-toggle"
                  >
                    <ThemeIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme("light")} className={theme === "light" ? "bg-accent/60" : ""}>
                    <Sun className="h-4 w-4" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className={theme === "dark" ? "bg-accent/60" : ""}>
                    <Moon className="h-4 w-4" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className={theme === "system" ? "bg-accent/60" : ""}>
                    <Laptop className="h-4 w-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Monk Mode */}
              <Button
                variant="outline"
                size="sm"
                className="relative border-[hsla(280,72%,58%,0.3)] bg-[hsla(280,72%,58%,0.08)] text-[hsl(280,72%,75%)] hover:bg-[hsla(280,72%,58%,0.15)] hover:border-[hsla(280,72%,58%,0.5)] transition-all"
                onClick={() => setIsMonkModeOpen(true)}
                data-testid="button-monk-mode"
              >
                <Orbit className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline font-medium text-xs">Monk Mode</span>
              </Button>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  data-testid="button-notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center p-0 text-[10px] glow-danger"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-2.5 ml-1">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white">
                    N
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[hsl(225,22%,6%)]" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-foreground leading-tight" data-testid="text-username">
                    Nagabhushana
                  </p>
                  <p className="text-[10px] text-muted-foreground">Architect</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <MonkModeModal
        isOpen={isMonkModeOpen}
        onClose={() => setIsMonkModeOpen(false)}
      />
    </>
  );
}
