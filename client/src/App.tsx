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
import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/brain-training" component={BrainTraining} />
      <Route path="/fitness" component={Fitness} />
      <Route path="/wellness" component={Wellness} />
      <Route path="/health-predict" component={HealthPredict} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { useState } from "react";
import Auth from "@/pages/auth";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground relative">
          {!isAuthenticated ? (
            <Auth onLogin={() => setIsAuthenticated(true)} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
