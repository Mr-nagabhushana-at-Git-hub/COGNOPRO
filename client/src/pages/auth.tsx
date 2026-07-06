import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  Cloud,
  HeartPulse,
  Loader2,
  Info,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
  X,
  Youtube,
} from "lucide-react";

interface AuthProps {
  onLogin: () => void;
}

type Theme = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  glow: string;
  bgDark: string;
};

const THEMES: Theme[] = [
  {
    id: "cyberpunk",
    name: "Cyber Neon",
    primary: "hsl(280, 100%, 60%)",
    secondary: "hsl(320, 100%, 55%)",
    glow: "hsla(280, 100%, 60%, 0.4)",
    bgDark: "hsl(280, 50%, 5%)",
  },
  {
    id: "matrix",
    name: "Neural Green",
    primary: "hsl(160, 100%, 45%)",
    secondary: "hsl(140, 100%, 40%)",
    glow: "hsla(160, 100%, 45%, 0.4)",
    bgDark: "hsl(160, 50%, 4%)",
  },
  {
    id: "space",
    name: "Deep Space",
    primary: "hsl(220, 100%, 60%)",
    secondary: "hsl(190, 100%, 50%)",
    glow: "hsla(220, 100%, 60%, 0.4)",
    bgDark: "hsl(220, 50%, 5%)",
  },
  {
    id: "crimson",
    name: "Blood Moon",
    primary: "hsl(350, 100%, 55%)",
    secondary: "hsl(20, 100%, 50%)",
    glow: "hsla(350, 100%, 55%, 0.4)",
    bgDark: "hsl(350, 50%, 5%)",
  },
];

const googleErrors: Record<string, { title: string; detail: string }> = {
  missing_code: {
    title: "Google sign-in was interrupted",
    detail: "The consent flow returned without an authorization code. Try the Google button again.",
  },
  auth_failed: {
    title: "Google authorization failed",
    detail: "The token exchange or one of the requested scopes was rejected. Check the OAuth client, test users, and enabled APIs.",
  },
  google_oauth_not_configured: {
    title: "Google OAuth is not configured",
    detail: "The app is missing a valid Google client id or client secret on the server.",
  },
};

const syncModules = [
  { label: "Fitness telemetry", detail: "Health metrics and body data", icon: HeartPulse },
  { label: "Calendar sync", detail: "Planner and task routing", icon: CalendarDays },
  { label: "Drive context", detail: "Knowledge and workspace files", icon: Cloud },
  { label: "YouTube learning", detail: "Research and study signals", icon: Youtube },
];

const statChips = [
  { label: "TEE", value: "Ready" },
  { label: "Agents", value: "Live" },
  { label: "Focus", value: "Monk Mode" },
];

const orbitSymbols = [
  { icon: HeartPulse, label: "Health", x: "10%", y: "22%" },
  { icon: CalendarDays, label: "Planner", x: "74%", y: "18%" },
  { icon: Cloud, label: "Drive", x: "14%", y: "70%" },
  { icon: Youtube, label: "Learn", x: "76%", y: "68%" },
];

const featureList = [
  "Real Google OAuth with return-to-app flow",
  "Google Health, Calendar, Drive, and YouTube sync path",
  "Agent orchestration across personal data signals",
  "Monk Mode workspace with distraction-aware tooling",
  "Task matrix, planner, notes, wellness, fitness, and health prediction",
  "TEE-ready privacy messaging and scoped provider routing",
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function Auth({ onLogin }: AuthProps) {
  const [activeTheme, setActiveTheme] = useState<Theme>(THEMES[0]);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const authError = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("authError");
    return code
      ? googleErrors[code] ?? {
          title: "Google sign-in needs attention",
          detail: `Returned with error: ${code}`,
        }
      : null;
  }, []);

  const backgroundStyle = {
    background: `
      radial-gradient(circle at 18% 18%, ${activeTheme.glow} 0%, transparent 28%),
      radial-gradient(circle at 82% 22%, ${activeTheme.glow.replace("0.4", "0.22")} 0%, transparent 30%),
      linear-gradient(135deg, ${activeTheme.bgDark} 0%, hsl(228, 28%, 6%) 52%, hsl(225, 24%, 4%) 100%)
    `,
    transition: "background 800ms ease",
  };

  const startGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const response = await fetch(`/api/auth/google/url?intent=login&t=${Date.now()}`);
      const data = await response.json();
      if (!data.url) throw new Error("Missing Google OAuth URL");
      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      setIsGoogleLoading(false);
    }
  };

  const continueLocal = () => {
    setIsLocalLoading(true);
    window.setTimeout(() => {
      onLogin();
    }, 350);
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8 lg:px-10" style={backgroundStyle}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
      <motion.div
        className="pointer-events-none absolute left-[-10%] top-[12%] h-px w-[55%] origin-left"
        style={{ background: `linear-gradient(90deg, transparent, ${activeTheme.primary}, transparent)` }}
        animate={reduceMotion ? undefined : { x: [0, 80, 0], opacity: [0.18, 0.65, 0.18], rotate: [-8, -4, -8] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-[-8%] top-[68%] h-px w-[48%] origin-right"
        style={{ background: `linear-gradient(90deg, transparent, ${activeTheme.secondary}, transparent)` }}
        animate={reduceMotion ? undefined : { x: [0, -72, 0], opacity: [0.12, 0.55, 0.12], rotate: [6, 2, 6] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
      {[0, 1, 2, 3, 4, 5].map((dot) => (
        <motion.div
          key={dot}
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white/70"
          style={{
            left: `${16 + dot * 13}%`,
            top: `${18 + (dot % 3) * 22}%`,
            boxShadow: `0 0 18px ${dot % 2 === 0 ? activeTheme.glow : activeTheme.secondary}`,
          }}
          animate={reduceMotion ? undefined : { y: [0, -18, 0], opacity: [0.18, 0.72, 0.18], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 4.5 + dot * 0.35, repeat: Infinity, ease: "easeInOut", delay: dot * 0.22 }}
        />
      ))}

      <motion.div
        className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full blur-[120px]"
        style={{ backgroundColor: activeTheme.primary }}
        animate={reduceMotion ? undefined : { x: [0, 54, 0], y: [0, -28, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-28 bottom-10 h-[28rem] w-[28rem] rounded-full blur-[140px]"
        style={{ backgroundColor: activeTheme.secondary }}
        animate={reduceMotion ? undefined : { x: [0, -44, 0], y: [0, 20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.15fr_0.92fr]">
        <motion.section
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5 }}
          className="relative space-y-8"
        >
          {orbitSymbols.map(({ icon: Icon, label, x, y }, index) => (
            <motion.div
              key={label}
              className="pointer-events-none absolute hidden rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 text-white/75 backdrop-blur-2xl lg:flex lg:items-center lg:gap-2"
              style={{
                left: x,
                top: y,
                transformStyle: "preserve-3d",
                boxShadow: `0 18px 50px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.04)`,
              }}
              animate={reduceMotion ? undefined : {
                y: [0, -14, 0],
                rotateY: [-12, 10, -12],
                rotateX: [8, -6, 8],
              }}
              transition={{ duration: 7 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.45 }}
            >
              <Icon className="h-4 w-4" style={{ color: index % 2 === 0 ? activeTheme.primary : activeTheme.secondary }} />
              <span className="text-xs uppercase tracking-[0.16em]">{label}</span>
            </motion.div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.secondary})`,
                boxShadow: `0 0 40px ${activeTheme.glow}`,
              }}
            >
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                Focus<span style={{ color: activeTheme.primary }}>Flow</span>
              </h1>
              <p className="mt-2 text-sm font-medium uppercase tracking-[0.22em] text-white/45">
                COGNO Personal Intelligence Layer
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Badge className="border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-md">
              Real OAuth + premium workspace entry
            </Badge>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight text-white/95 sm:text-4xl">
              Seamless entry into your personal health and focus workspace.
            </h2>
            <p className="max-w-2xl text-base leading-8 text-white/62 sm:text-lg">
              Real Google authorization when you want full sync. Clean local entry when you just want to get moving.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsInfoOpen(true)}
              className="h-11 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-white/78 hover:bg-white/10 hover:text-white"
            >
              <Info className="mr-2 h-4 w-4" />
              About
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCustomizeOpen(true)}
              className="h-11 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-white/78 hover:bg-white/10 hover:text-white"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Customize
            </Button>
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-white/60">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]" />
              Google when you want sync. Local when you want speed.
            </div>
          </div>
        </motion.section>

        <motion.section
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.55, delay: 0.12 }}
          className="flex items-center justify-center"
        >
          <Card className="relative w-full max-w-lg overflow-hidden rounded-[32px] border-white/10 bg-[hsla(228,18%,10%,0.78)] shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
            <div
              className="absolute inset-x-0 top-0 h-1.5"
              style={{
                background: `linear-gradient(90deg, ${activeTheme.primary}, ${activeTheme.secondary})`,
                boxShadow: `0 0 22px ${activeTheme.glow}`,
              }}
            />
            <div className="absolute -right-14 top-16 h-40 w-40 rounded-full blur-[80px]" style={{ backgroundColor: activeTheme.primary, opacity: 0.18 }} />
            <div className="absolute -left-14 bottom-16 h-40 w-40 rounded-full blur-[90px]" style={{ backgroundColor: activeTheme.secondary, opacity: 0.16 }} />

            <CardHeader className="relative z-10 space-y-3 pb-6 pt-8">
              <div className="flex items-center justify-between gap-3">
                <Badge className="border-white/10 bg-white/5 px-3 py-1 text-white/78">Initialize Session</Badge>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/52">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Secure route
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                Enter COGNO with real Google access
              </CardTitle>
              <p className="text-sm leading-7 text-white/54">
                Use Google for the full sync stack, or enter locally now and connect providers inside Platform Settings when you are ready.
              </p>
            </CardHeader>

            <CardContent className="relative z-10 space-y-6">
              {authError && (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
                  <AlertTitle>{authError.title}</AlertTitle>
                  <AlertDescription className="mt-2 text-amber-50/80">
                    {authError.detail}
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Google workspace bridge</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/38">Full sync path</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="h-14 w-full rounded-2xl border-0 bg-white text-base font-semibold text-black transition-transform hover:scale-[1.015] hover:bg-gray-100"
                  onClick={startGoogleLogin}
                  disabled={isGoogleLoading || isLocalLoading}
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Redirecting to Google
                    </>
                  ) : (
                    "Sign in and connect Google"
                  )}
                </Button>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70">OAuth callback wired</Badge>
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70">Sensitive scopes staged</Badge>
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70">Returns to app</Badge>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="rounded-full border border-white/10 bg-[#13161c] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/40">
                    local mode fallback
                  </span>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="rounded-2xl bg-white/8 p-3">
                    <Sparkles className="h-5 w-5" style={{ color: activeTheme.secondary }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Open the workspace first</p>
                    <p className="mt-1 text-sm leading-6 text-white/50">
                      This keeps the experience fast when you just want the planner, notes, matrix, or local agent features before attaching Google permissions.
                    </p>
                  </div>
                </div>

                <Button
                  className="h-12 w-full rounded-2xl text-base font-semibold text-white transition-all hover:scale-[1.015]"
                  style={{
                    background: `linear-gradient(90deg, ${activeTheme.primary}, ${activeTheme.secondary})`,
                    boxShadow: `0 0 20px ${activeTheme.glow}`,
                  }}
                  onClick={continueLocal}
                  disabled={isGoogleLoading || isLocalLoading}
                >
                  {isLocalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Opening workspace
                    </>
                  ) : (
                    <>
                      Continue in local mode
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/85">
                  Created by Nagabhushana Raju S
                </p>
                <p className="mt-1 text-xs leading-6 text-amber-50/75">
                  IP and copyright reserved. Licensed under BUSL-1.1. Production, commercial, hosted, or unauthorized use beyond the license grant requires prior written consent.
                </p>
              </div>

            </CardContent>
          </Card>
        </motion.section>
      </div>

      <AnimatePresence>
        {isInfoOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close info panel"
              className="absolute inset-0 z-40 bg-black/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInfoOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="absolute inset-x-4 top-[10%] z-50 mx-auto max-w-2xl"
            >
              <div className="rounded-[30px] border border-white/12 bg-[hsla(228,18%,10%,0.86)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <Badge className="border-white/10 bg-white/5 text-white/78">Glass panel</Badge>
                    <h3 className="mt-3 text-2xl font-bold text-white">COGNO capability brief</h3>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-white/54">
                      Here is everything that was removed from the entry surface so it stays clean.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsInfoOpen(false)}
                    className="rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/38">About</p>
                    <h4 className="mt-2 text-xl font-bold text-white">FocusFlow</h4>
                    <p className="mt-1 text-sm text-white/60">COGNO Personal Intelligence Layer</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70">Real OAuth + premium workspace entry</Badge>
                      <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70">FocusFlow Nexus</Badge>
                      <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70">Synced</Badge>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-white/72">
                      Seamless entry into your personal health and focus workspace. Real Google authorization when you want full sync. Clean local entry when you just want to get moving.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                  {syncModules.map(({ label, detail, icon: Icon }) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8">
                        <Icon className="h-5 w-5" style={{ color: activeTheme.primary }} />
                      </div>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="mt-1 text-xs leading-6 text-white/44">{detail}</p>
                    </div>
                  ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {statChips.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/40">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-3">
                  {featureList.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <p className="text-sm leading-6 text-white/72">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/85">
                    Ownership and licensing
                  </p>
                  <p className="mt-2 text-sm leading-7 text-amber-50/80">
                    Created by Nagabhushana Raju S. This codebase is source-available under BUSL-1.1, not MIT. Intellectual property and copyright remain with the creator, and any use outside the license grant requires prior written consent.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomizeOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close customize panel"
              className="absolute inset-0 z-40 bg-black/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomizeOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="absolute inset-x-4 top-[12%] z-50 mx-auto max-w-xl"
            >
              <div className="rounded-[30px] border border-white/12 bg-[hsla(228,18%,10%,0.86)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <Badge className="border-white/10 bg-white/5 text-white/78">Customize</Badge>
                    <h3 className="mt-3 text-2xl font-bold text-white">Interface Theme</h3>
                    <p className="mt-2 max-w-lg text-sm leading-7 text-white/54">
                      Tune the login atmosphere without crowding the main entry experience.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCustomizeOpen(false)}
                    className="rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setActiveTheme(theme)}
                      className={`rounded-[24px] border p-4 text-left transition-all ${
                        activeTheme.id === theme.id
                          ? "border-white/30 bg-white/[0.09] shadow-[0_0_28px_rgba(255,255,255,0.08)]"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                      }`}
                    >
                      <div
                        className="mb-4 h-20 rounded-2xl border border-white/10"
                        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                      />
                      <p className="text-sm font-semibold text-white">{theme.name}</p>
                      <p className="mt-1 text-xs text-white/44">Adjusts glow, gradient field, and ambient motion color.</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
