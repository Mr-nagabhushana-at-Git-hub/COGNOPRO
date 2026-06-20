import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Sparkles, Activity, ShieldCheck, Mail, Lock, CheckCircle2, ArrowRight } from "lucide-react";

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
  }
];

export default function Auth({ onLogin }: AuthProps) {
  const [activeTheme, setActiveTheme] = useState<Theme>(THEMES[0]);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Background Striping Pattern
  const backgroundStyle = {
    background: `
      linear-gradient(135deg, ${activeTheme.bgDark} 0%, hsl(225, 20%, 5%) 100%),
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        rgba(255, 255, 255, 0.02) 10px,
        rgba(255, 255, 255, 0.02) 20px
      )
    `,
    transition: "background 1s ease-in-out"
  };

  const handleMockLogin = () => {
    setIsAuthenticating(true);
    setTimeout(() => {
      onLogin();
    }, 1500);
  };

  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 sm:p-8"
      style={backgroundStyle}
    >
      {/* Animated Floating Orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full mix-blend-screen filter blur-[100px] opacity-60"
        style={{ backgroundColor: activeTheme.primary }}
      />
      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.5, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] rounded-full mix-blend-screen filter blur-[120px] opacity-40"
        style={{ backgroundColor: activeTheme.secondary }}
      />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        
        {/* Left Side: Brand & Hero */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col justify-center space-y-8"
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500"
              style={{ background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.secondary})`, boxShadow: `0 0 40px ${activeTheme.glow}` }}
            >
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter">
              Focus<span style={{ color: activeTheme.primary }}>Flow</span>
            </h1>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white/90">
              Cognitive Enhancement Protocol
            </h2>
            <p className="text-lg text-white/60 max-w-md leading-relaxed">
              Synchronize your neural and physical subsystems. Join the next generation of performance tracking and neuro-athletic training.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md">
              <Activity style={{ color: activeTheme.primary }} className="w-6 h-6" />
              <span className="text-white/80 font-medium">Real-time Biometrics</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md">
              <Sparkles style={{ color: activeTheme.secondary }} className="w-6 h-6" />
              <span className="text-white/80 font-medium">AI Form Correction</span>
            </div>
          </div>

          {/* Theme Switcher */}
          <div className="pt-8 space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/40 font-mono">Select Interface Theme</p>
            <div className="flex gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setActiveTheme(theme)}
                  className={`relative w-12 h-12 rounded-xl transition-all duration-300 ${activeTheme.id === theme.id ? 'scale-110 shadow-2xl' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                    boxShadow: activeTheme.id === theme.id ? `0 0 20px ${theme.glow}` : 'none'
                  }}
                >
                  {activeTheme.id === theme.id && (
                    <motion.div layoutId="theme-active" className="absolute inset-0 border-2 border-white rounded-xl" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Side: Auth Box */}
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex items-center justify-center"
        >
          <Card className="w-full max-w-md bg-[hsla(225,20%,10%,0.7)] backdrop-blur-2xl border-white/10 shadow-2xl overflow-hidden relative">
            
            {/* Animated Glow Border */}
            <div 
              className="absolute top-0 left-0 w-full h-1" 
              style={{ background: `linear-gradient(90deg, ${activeTheme.primary}, ${activeTheme.secondary})`, boxShadow: `0 0 20px ${activeTheme.glow}` }} 
            />

            <CardHeader className="space-y-1 pb-6 pt-8">
              <CardTitle className="text-2xl font-bold text-center text-white">
                {authMode === 'signin' ? 'Initialize Session' : 'Create Access Key'}
              </CardTitle>
              <p className="text-sm text-center text-white/50">
                {authMode === 'signin' ? 'Enter your credentials to continue' : 'Register your biometric profile'}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              
              {/* Magic OAuth Button */}
              <Button 
                variant="outline" 
                className="w-full h-14 bg-white hover:bg-gray-100 text-black border-0 transition-transform hover:scale-[1.02]"
                onClick={handleMockLogin}
                disabled={isAuthenticating}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#13161c] px-2 text-white/40">Or standard protocol</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70">Email Array</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                    <Input 
                      id="email" 
                      placeholder="user@neural-net.com" 
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 focus-visible:ring-1"
                      style={{ '--tw-ring-color': activeTheme.primary } as any}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white/70">Security Cipher</Label>
                    {authMode === 'signin' && (
                      <a href="#" className="text-xs hover:underline" style={{ color: activeTheme.primary }}>
                        Forgot cipher?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                    <Input 
                      id="password" 
                      type="password"
                      placeholder="••••••••" 
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 focus-visible:ring-1"
                      style={{ '--tw-ring-color': activeTheme.primary } as any}
                    />
                  </div>
                </div>

                <Button 
                  className="w-full h-12 text-white font-bold text-lg transition-all hover:scale-[1.02]"
                  style={{ 
                    background: `linear-gradient(90deg, ${activeTheme.primary}, ${activeTheme.secondary})`,
                    boxShadow: `0 0 20px ${activeTheme.glow}`
                  }}
                  onClick={handleMockLogin}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <ShieldCheck className="h-6 w-6" />
                    </motion.div>
                  ) : (
                    <>{authMode === 'signin' ? 'Establish Link' : 'Register Profile'} <ArrowRight className="ml-2 w-5 h-5" /></>
                  )}
                </Button>
              </div>

              {/* Developer / Tester Login Bypass */}
              <div className="pt-4 mt-6 border-t border-white/10">
                <Button 
                  variant="ghost" 
                  className="w-full h-12 bg-white/5 hover:bg-white/10 text-white/70 border border-white/5"
                  onClick={handleMockLogin}
                  disabled={isAuthenticating}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5 text-emerald-400" />
                  Bypass as Tester / Developer
                </Button>
              </div>

              <div className="text-center text-sm text-white/50 pt-2">
                {authMode === 'signin' ? "Don't have an access key? " : "Already registered? "}
                <button 
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="font-bold hover:underline transition-colors"
                  style={{ color: activeTheme.primary }}
                >
                  {authMode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </div>

            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
