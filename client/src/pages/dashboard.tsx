import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, MeshDistortMaterial, Float, Sparkles as DreiSparkles } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
import { 
  Target, Dumbbell, Brain, Zap, Activity,
  CalendarDays, NotebookPen, WandSparkles, Settings, ArrowRight
} from "lucide-react";

// --- 3D Components ---

function CoreSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      
      // Pulse effect based on time
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.setScalar(hovered ? scale * 1.1 : scale);
    }
  });

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      <mesh 
        ref={meshRef}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <icosahedronGeometry args={[2, 20]} />
        <MeshDistortMaterial 
          color={hovered ? "#e879f9" : "#a855f7"} // fuchsia-400 : purple-500
          emissive="#6b21a8" // purple-800
          emissiveIntensity={0.5}
          distort={0.4} 
          speed={3} 
          roughness={0.2}
          metalness={0.8}
          wireframe={hovered}
        />
      </mesh>
      
      {/* Outer wireframe shell */}
      <mesh scale={2.2}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.15} />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#a855f7" />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
      
      <CoreSphere />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <DreiSparkles count={200} scale={12} size={2} speed={0.4} opacity={0.3} color="#a855f7" />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2 + 0.2}
        minPolarAngle={Math.PI / 2 - 0.2}
      />
    </>
  );
}

// --- HUD Component ---

const navItems = [
  { id: "tasks", label: "Tasks & Matrix", short: "Tasks", icon: Target, path: "/tasks", color: "from-blue-500 to-cyan-400", detail: "Import, sort, drag, and sync actionable work." },
  { id: "planner", label: "Planner", short: "Planner", icon: CalendarDays, path: "/planner", color: "from-sky-500 to-indigo-400", detail: "Reserve calendar blocks and protect focus windows." },
  { id: "notes", label: "Notes", short: "Notes", icon: NotebookPen, path: "/notes", color: "from-violet-500 to-fuchsia-400", detail: "Capture fast context and pinned memory." },
  { id: "wellness", label: "Mental Wellness", short: "Wellness", icon: Activity, path: "/wellness", color: "from-rose-500 to-pink-500", detail: "Track reflection, burnout, and emotional signal." },
  { id: "health", label: "Health Predict", short: "Health", icon: Zap, path: "/health-predict", color: "from-orange-500 to-red-400", detail: "Review symptoms and health pattern predictions." },
  { id: "ultra", label: "Ultra Agent", short: "Ultra", icon: WandSparkles, path: "/ultra", color: "from-amber-500 to-yellow-400", detail: "Personal pulse, monk mode, and routed guidance." },
  { id: "brain", label: "Brain Training", short: "Brain", icon: Brain, path: "/brain-training", color: "from-purple-500 to-pink-400", detail: "Cognitive drills and performance telemetry." },
  { id: "fitness", label: "Fitness Tracker", short: "Fitness", icon: Dumbbell, path: "/fitness", color: "from-emerald-500 to-teal-400", detail: "Movement, camera coaching, and body metrics." },
  { id: "settings", label: "Platform Settings", short: "Settings", icon: Settings, path: "/settings", color: "from-slate-400 to-slate-200", detail: "Providers, health bridges, and security layers." }
];

export default function Dashboard() {
  const [hoveredNav, setHoveredNav] = useState<(typeof navItems)[number] | null>(null);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-[#030712]">
      {/* 3D Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <Scene />
        </Canvas>
      </div>

      {/* HUD Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 lg:p-12">
        
        {/* Top Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex justify-between items-start pointer-events-auto"
        >
          <div>
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-2xl">
              Focus<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Flow</span> Nexus
            </h1>
            <p className="text-white/50 font-mono text-sm tracking-widest uppercase mt-2">
              System Core Online • All Subsystems Nominal
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2 rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white/80 font-medium">Synced</span>
          </div>
        </motion.div>

        {/* Center Reticle / Information */}
        <AnimatePresence>
          {hoveredNav && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="w-64 h-64 border border-white/10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="w-48 h-48 border border-white/20 rounded-full border-dashed animate-[spin_10s_linear_infinite]" />
              </div>
              <div className="absolute flex flex-col items-center">
                <span className="text-white/50 uppercase tracking-widest text-xs font-mono mb-2">Target Lock</span>
                <span className="text-center text-2xl font-bold text-white tracking-widest">{hoveredNav.label}</span>
                <span className="mt-3 max-w-xs text-center text-sm leading-6 text-white/55">{hoveredNav.detail}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation Dock */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="w-full max-w-6xl mx-auto pointer-events-auto"
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {navItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.path}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + i * 0.1 }}
                    whileHover={{ y: -10, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onHoverStart={() => setHoveredNav(item)}
                    onHoverEnd={() => setHoveredNav(null)}
                    className="group relative h-28 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden cursor-pointer flex flex-col items-start justify-between p-4"
                  >
                    {/* Hover Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
                    
                    <div className="relative z-10 flex w-full items-start justify-between">
                      <div className={`rounded-2xl bg-gradient-to-br ${item.color} p-2.5 shadow-[0_0_24px_rgba(59,130,246,0.18)]`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/35 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/80" />
                    </div>

                    <div className="relative z-10">
                      <span className="block text-sm font-bold text-white/95 transition-colors duration-300">
                        {item.label}
                      </span>
                      <span className="mt-1 block text-xs text-white/45 group-hover:text-white/60">
                        {item.short}
                      </span>
                    </div>

                    {/* Active Indicator Line */}
                    <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${item.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
