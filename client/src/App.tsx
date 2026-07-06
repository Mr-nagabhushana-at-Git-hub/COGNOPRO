import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import BrainTraining from "@/pages/brain-training";
import Fitness from "@/pages/fitness";
import Wellness from "@/pages/wellness";
import HealthPredict from "@/pages/health-predict";
import Notes from "@/pages/notes";
import Planner from "@/pages/planner";
import Settings from "@/pages/settings";
import UltraAgent from "@/pages/ultra-agent";
import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";
import { ThemeProvider } from "@/components/theme-provider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/planner" component={Planner} />
      <Route path="/notes" component={Notes} />
      <Route path="/brain-training" component={BrainTraining} />
      <Route path="/fitness" component={Fitness} />
      <Route path="/wellness" component={Wellness} />
      <Route path="/health-predict" component={HealthPredict} />
      <Route path="/ultra" component={UltraAgent} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { useEffect, useState } from "react";
import Auth from "@/pages/auth";
import { MonkModeOverlay } from "@/components/monk-mode-overlay";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("COGNO_DEMO_AUTH") === "true");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "google" && params.get("connected") === "true") {
      localStorage.setItem("COGNO_DEMO_AUTH", "true");
      localStorage.setItem("COGNO_AUTH_METHOD", "google");
      setIsAuthenticated(true);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const handleLogin = () => {
    localStorage.setItem("COGNO_DEMO_AUTH", "true");
    localStorage.setItem("COGNO_AUTH_METHOD", "local");
    setIsAuthenticated(true);
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground relative">
            {!isAuthenticated ? (
              <Auth onLogin={handleLogin} />
            ) : (
              <>
                <AppHeader />
                <div className="flex">
                  <Sidebar />
                  <main className="flex-1 min-h-[calc(100vh-64px)] overflow-y-auto">
                    <Router />
                  </main>
                </div>
              </>
            )}
          </div>
          <Toaster />
          <MonkModeOverlay />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
