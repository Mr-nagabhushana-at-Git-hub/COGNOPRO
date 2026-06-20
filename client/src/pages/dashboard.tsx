import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, MeshDistortMaterial, Float, Sparkles as DreiSparkles } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
import { 
  Target, Dumbbell, Brain, Zap, Activity,
  ChevronRight, Power
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  { id: 'tasks', label: 'Task Matrix', icon: Target, path: '/tasks', color: 'from-blue-500 to-cyan-400' },
  { id: 'fitness', label: 'Command Center', icon: Dumbbell, path: '/fitness', color: 'from-emerald-500 to-teal-400' },
  { id: 'brain', label: 'Neural Training', icon: Brain, path: '/brain-training', color: 'from-purple-500 to-pink-400' },
  { id: 'health', label: 'Health Predict', icon: Zap, path: '/health-predict', color: 'from-orange-500 to-red-400' },
  { id: 'wellness', label: 'Wellness Core', icon: Activity, path: '/wellness', color: 'from-rose-500 to-pink-500' }
];

export default function Dashboard() {
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

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
                <span className="text-2xl font-bold text-white tracking-widest">{hoveredNav}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation Dock */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="w-full max-w-4xl mx-auto pointer-events-auto"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                    onHoverStart={() => setHoveredNav(item.label)}
                    onHoverEnd={() => setHoveredNav(null)}
                    className="group relative h-24 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden cursor-pointer flex flex-col items-center justify-center"
                  >
                    {/* Hover Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
                    
                    <Icon className="w-8 h-8 text-white/70 group-hover:text-white mb-2 transition-colors duration-300" />
                    <span className="text-xs font-bold text-white/50 group-hover:text-white uppercase tracking-wider transition-colors duration-300">
                      {item.label.split(' ')[0]}
                    </span>

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
