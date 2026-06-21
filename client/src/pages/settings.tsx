import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Key, Activity, CheckCircle, Database, Trash2, ExternalLink } from "lucide-react";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [geminiKey, setGeminiKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Check URL for Google OAuth success
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({
        title: "Google Fit Connected",
        description: params.get("demo") ? "Demo mode connected successfully!" : "Actual Google Fit integration complete.",
        variant: "default",
      });
      // Clear URL params
      setLocation("/settings");
    } else if (params.get("error")) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Fit. " + params.get("error"),
        variant: "destructive",
      });
      setLocation("/settings");
    }
  }, [setLocation, toast]);

  const saveAiKeys = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/users/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiKey, groqKey }),
      });
      if (!response.ok) throw new Error("Failed to save keys");
      toast({
        title: "Configuration Saved",
        description: "Your AI models have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save AI settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const connectGoogleFit = async () => {
    try {
      const res = await fetch(`/api/auth/google/url?t=${Date.now()}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Could not initialize Google authentication.",
        variant: "destructive",
      });
    }
  };

  const clearMyData = async () => {
    if (!confirm("Are you sure? This will permanently delete all your data including journals, focus sessions, and fitness records. This cannot be undone.")) return;
    
    setIsSaving(true);
    try {
      const response = await fetch("/api/users/data", { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to clear data");
      
      // Clear the local device ID to get a fresh start
      localStorage.removeItem("FOCUSFLOW_DEVICE_ID");
      
      toast({
        title: "Data Cleared",
        description: "Your account has been completely wiped.",
      });
      
      // Reload to regenerate ID and clear UI state
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not clear data.",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-2">
          Platform Settings
        </h1>
        <p className="text-slate-400">Configure your external integrations and artificial intelligence models.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-indigo-500/20 bg-black/40 backdrop-blur-xl h-full shadow-[0_0_40px_rgba(99,102,241,0.05)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-400">
                <Key className="w-5 h-5" />
                AI Model Orchestration
              </CardTitle>
              <CardDescription className="text-slate-400">
                Supply your own API keys. The system will route to Groq as a fallback if Gemini fails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-medium text-slate-300">
                  <span>Google Gemini API Key (Primary)</span>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    Get Key <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="bg-black/50 border-indigo-500/30 text-slate-200 focus:border-indigo-400 placeholder:text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Groq API Key (Llama 3.1 Fallback)</label>
                <Input
                  type="password"
                  placeholder="gsk_..."
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  className="bg-black/50 border-indigo-500/30 text-slate-200 focus:border-indigo-400 placeholder:text-slate-700"
                />
              </div>
              <Button 
                onClick={saveAiKeys} 
                disabled={isSaving}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving Configuration..." : "Save AI Keys"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-emerald-500/20 bg-black/40 backdrop-blur-xl h-full shadow-[0_0_40px_rgba(16,185,129,0.05)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-400">
                <Activity className="w-5 h-5" />
                Health Integrations
              </CardTitle>
              <CardDescription className="text-slate-400">
                Connect your actual Google Fit account to inject real biometric telemetry into the Neural Guide.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 flex items-center gap-4">
                <div className="bg-emerald-500/20 p-3 rounded-full">
                  <Database className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-200">Google Fit Sync</h3>
                  <p className="text-sm text-slate-400">Pulls steps, active minutes, and cardiovascular data.</p>
                </div>
              </div>
              
              <Button 
                onClick={connectGoogleFit}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-none h-12"
              >
                Connect Google Account
              </Button>
              
              <p className="text-xs text-center text-slate-500 mt-4">
                OAuth requires a valid Client ID & Secret in your environment variables.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-red-500/20 bg-red-950/10 h-full shadow-[0_0_40px_rgba(239,68,68,0.02)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-400/70">
              Permanently delete all your personal data from this device's sandboxed session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={clearMyData} 
              disabled={isSaving}
              className="bg-red-900/50 hover:bg-red-600 text-red-200 border border-red-800"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Wipe My Data
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
