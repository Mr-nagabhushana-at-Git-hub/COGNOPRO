import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Activity,
  AlertTriangle,
  Cloud,
  Cpu,
  ExternalLink,
  HeartPulse,
  Info,
  Key,
  LockKeyhole,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";

const googleHealthSetupUrl = "https://developers.google.com/health/setup";
const googleCloudConsoleUrl = "https://console.cloud.google.com/apis/credentials";
const googleFitMigrationUrl = "https://developer.android.com/health-and-fitness/health-connect/migration/fit";
const healthConnectUrl = "https://developer.android.com/health-and-fitness/health-connect";
const healthKitUrl = "https://developer.apple.com/documentation/healthkit";
const cerebrasGetStartedUrl = "https://cloud.cerebras.ai/platform/org_m92rk4rdrp8383xc6jhvhvrk/get-started";

function ExternalTextLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function StatusBadge({ children, className }: { children: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={`border-white/10 bg-white/5 text-[11px] font-medium tracking-wide ${className ?? ""}`}
    >
      {children}
    </Badge>
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [geminiKey, setGeminiKey] = useState("");
  const [cerebrasKey, setCerebrasKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({
        title: "Google Health Connected",
        description: "Your Google Health bridge is ready for sync.",
      });
      setLocation("/settings");
    } else if (params.get("error")) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Health. " + params.get("error"),
        variant: "destructive",
      });
      setLocation("/settings");
    }
  }, [setLocation, toast]);

  const saveAiKeys = async () => {
    setIsSaving(true);
    try {
      await apiRequest("PATCH", "/api/users/settings", {
        geminiKey: geminiKey || undefined,
        cerebrasKey: cerebrasKey || undefined,
        groqKey: groqKey || undefined,
      });
      toast({
        title: "Configuration Validated & Saved",
        description: "Your orchestration providers were verified and updated.",
      });
    } catch (error: any) {
      let errorMessage = "Could not save AI settings. Please check your keys.";
      try {
        const parsed = JSON.parse(error.message.split(": ")[1]);
        if (parsed.error) errorMessage = parsed.error;
      } catch {
        if (error.message) errorMessage = error.message;
      }
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const connectGoogleHealth = async () => {
    try {
      const res = await fetch(`/api/auth/google/url?intent=settings&t=${Date.now()}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
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
      const response = await apiRequest("DELETE", "/api/users/data");
      if (!response.ok) throw new Error("Failed to clear data");

      localStorage.removeItem("FOCUSFLOW_DEVICE_ID");

      toast({
        title: "Data Cleared",
        description: "Your account has been completely wiped.",
      });

      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast({
        title: "Error",
        description: "Could not clear data.",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const integrationCardClass = "rounded-2xl border border-border/60 bg-background/70 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.12)]";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-primary/30 bg-primary/10 text-primary">Private Orchestration</Badge>
          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
            Health Sync Stack
          </Badge>
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-sky-400 to-indigo-500 bg-clip-text text-transparent">
          Platform Settings
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Wire up real health providers, secure model routing, and future on-device inference without exposing agent internals on the surface UI.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}
        >
          <Card className="h-full border-border/60 bg-card/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(37,99,235,0.10)]">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Key className="h-5 w-5" />
                    AI Model Orchestration
                  </CardTitle>
                  <CardDescription className="mt-2 text-muted-foreground">
                    Bring your own providers and let COGNO route across private, fast, and fallback paths.
                  </CardDescription>
                </div>
                <StatusBadge className="border-primary/20 bg-primary/10 text-primary">
                  Live provider routing
                </StatusBadge>
              </div>

              <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-sky-500/5 to-transparent p-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">TEE Security Layer</p>
                      <StatusBadge className="border-primary/20 bg-primary/10 text-primary">TEE ready</StatusBadge>
                      <StatusBadge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">Dual encrypted</StatusBadge>
                      <StatusBadge className="border-sky-500/20 bg-sky-500/10 text-sky-300">Session scoped</StatusBadge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Trusted Execution Environment support keeps compatible deployments isolated. Conversations, prompts, keys, traces, and provider hops are treated as dual-encrypted and session-scoped so orchestration stays private by default.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/15"
                          >
                            <Cpu className="h-3.5 w-3.5" />
                            Local ARM based Gemma 4 model coming soon
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs border-border/60 bg-background/95 text-sm leading-5 text-foreground">
                          Gemma is Google's open model family. We are reserving this slot for future private ARM-side inference, while Cerebras is our preferred high-speed cloud path for Gemma 4-class workloads because of its public low-latency and multimodal positioning.
                        </TooltipContent>
                      </Tooltip>
                      <ExternalTextLink href={googleCloudConsoleUrl} label="Google Cloud console" />
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="flex items-center justify-between gap-4 text-sm font-medium text-foreground">
                  <span>Google Gemini API Key (Primary reasoning)</span>
                  <ExternalTextLink href="https://aistudio.google.com/app/apikey" label="Get key" />
                </label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="h-12 border-border/70 bg-background/70 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between gap-4 text-sm font-medium text-foreground">
                  <span>Cerebras API Key (Ultra-fast cloud lane)</span>
                  <ExternalTextLink href={cerebrasGetStartedUrl} label="Get started" />
                </label>
                <Input
                  type="password"
                  placeholder="csk_..."
                  value={cerebrasKey}
                  onChange={(e) => setCerebrasKey(e.target.value)}
                  className="h-12 border-border/70 bg-background/70 text-foreground placeholder:text-muted-foreground"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                  <span>Preferred fast provider for future Gemma 4-class inference experiments and high-speed fallback orchestration.</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between gap-4 text-sm font-medium text-foreground">
                  <span>Groq API Key (Secondary fallback)</span>
                  <ExternalTextLink href="https://console.groq.com/keys" label="Get key" />
                </label>
                <Input
                  type="password"
                  placeholder="gsk_..."
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  className="h-12 border-border/70 bg-background/70 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <LockKeyhole className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">OAuth setup reference</span>
                  <ExternalTextLink href={googleHealthSetupUrl} label="Health API setup" />
                </div>
                <p className="mt-2 leading-6">
                  Google OAuth setup follows the Health API console flow: enable the API, configure the consent screen, and create the OAuth client inside Google Cloud.
                </p>
              </div>

              <Button
                onClick={saveAiKeys}
                disabled={isSaving}
                className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving Configuration..." : "Save Provider Keys"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.16 }}
        >
          <Card className="h-full border-border/60 bg-card/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(16,185,129,0.10)]">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-emerald-400">
                    <Activity className="h-5 w-5" />
                    Health Integrations
                  </CardTitle>
                  <CardDescription className="mt-2 text-muted-foreground">
                    Real health sync, current migration guidance, and honest status for the native bridges still under work.
                  </CardDescription>
                </div>
                <StatusBadge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  Sync roadmap
                </StatusBadge>
              </div>

              <div className="rounded-3xl border border-amber-500/15 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-amber-500/10 p-3">
                    <RefreshCw className="h-6 w-6 text-amber-300" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                        Google Fit sunset
                      </StatusBadge>
                      <StatusBadge className="border-sky-500/20 bg-sky-500/10 text-sky-300">
                        Health Connect
                      </StatusBadge>
                      <StatusBadge className="border-primary/20 bg-primary/10 text-primary">
                        Google Health API
                      </StatusBadge>
                      <StatusBadge className="border-pink-500/20 bg-pink-500/10 text-pink-300">
                        Apple HealthKit
                      </StatusBadge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Google Fit is in sunset mode, with support ending at the end of 2026. The active replacement path is Health Connect for Android on-device data and Google Health API for cloud integrations, while Apple sync lands through HealthKit.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <ExternalTextLink href={googleFitMigrationUrl} label="Migration guide" />
                      <ExternalTextLink href={healthConnectUrl} label="Health Connect docs" />
                      <ExternalTextLink href={healthKitUrl} label="HealthKit docs" />
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className={integrationCardClass}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-500/10 p-3">
                      <Cloud className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">Google Health OAuth</h3>
                        <StatusBadge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">Live now</StatusBadge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Real Google account authorization for health/profile scopes and the cloud sync layer already wired into this app.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <ExternalTextLink href={googleHealthSetupUrl} label="Setup steps" />
                        <ExternalTextLink href={googleCloudConsoleUrl} label="OAuth credentials" />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={connectGoogleHealth}
                    className="min-w-[180px] bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    Connect Google
                  </Button>
                </div>
              </div>

              <div className={integrationCardClass}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-sky-500/10 p-3">
                      <Smartphone className="h-5 w-5 text-sky-300" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">Android Health Connect</h3>
                        <StatusBadge className="border-sky-500/20 bg-sky-500/10 text-sky-300">Under work</StatusBadge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        This is the Android replacement path for mobile-first steps, sleep, heart rate, and workouts. It needs a native permission bridge rather than a simple web OAuth popup.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <ExternalTextLink href={healthConnectUrl} label="Android docs" />
                        <ExternalTextLink href={googleFitMigrationUrl} label="Migration path" />
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" disabled className="min-w-[180px] border-border/70 bg-background/60">
                    Native bridge under work
                  </Button>
                </div>
              </div>

              <div className={integrationCardClass}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-pink-500/10 p-3">
                      <HeartPulse className="h-5 w-5 text-pink-300" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">Apple Health / HealthKit</h3>
                        <StatusBadge className="border-pink-500/20 bg-pink-500/10 text-pink-300">Under work</StatusBadge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Apple sync needs the native HealthKit entitlement flow for iPhone and Apple Watch. We are keeping the product slot ready, but a real mobile bridge is required before data can sync.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <ExternalTextLink href={healthKitUrl} label="HealthKit docs" />
                        <ExternalTextLink href="https://developer.apple.com/health-fitness/" label="Apple health platform" />
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" disabled className="min-w-[180px] border-border/70 bg-background/60">
                    iPhone bridge under work
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-xs leading-6 text-muted-foreground">
                OAuth requires a valid Google Client ID and secret in your environment variables. Native Android and Apple health data still need platform-specific bridges before web sync can be honest and complete.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
      >
        <Card className="border-red-500/20 bg-red-950/10 shadow-[0_0_40px_rgba(239,68,68,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-300/70">
              Permanently delete all personal data from this device's sandboxed session.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3 text-sm text-red-200/80">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <p className="max-w-2xl">
                This clears journals, focus sessions, planner events, fitness records, notes, and stored provider keys for the current local profile.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={clearMyData}
              disabled={isSaving}
              className="bg-red-900/60 text-red-100 hover:bg-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Wipe My Data
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
