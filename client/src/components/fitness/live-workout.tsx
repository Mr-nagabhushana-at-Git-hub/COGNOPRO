import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Camera, Activity, Target, Brain, ArrowLeft } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
// @ts-ignore
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
// @ts-ignore
import { Camera as MediaPipeCamera } from "@mediapipe/camera_utils";
// @ts-ignore
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

interface LiveWorkoutProps {
  workoutType: string;
  onWorkoutEnd: () => void;
}

// --- 3D Holographic Wireframe Trainer ---
function HolographicTrainer({ activeWorkout }: { activeWorkout: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Group>(null);
  
  const leftThighRef = useRef<THREE.Group>(null);
  const leftCalfRef = useRef<THREE.Group>(null);
  const rightThighRef = useRef<THREE.Group>(null);
  const rightCalfRef = useRef<THREE.Group>(null);
  
  const leftUpperArmRef = useRef<THREE.Group>(null);
  const rightUpperArmRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!groupRef.current) return;

    if (activeWorkout === "hypertrophy" || activeWorkout === "neuro") {
      // SQUAT KINEMATICS
      // phase goes from 0 (standing) to 1 (squatting) and back
      const phase = (Math.sin(t * 3) + 1) / 2; 
      
      // Hips go down and slightly back
      groupRef.current.position.y = -phase * 0.7;
      groupRef.current.position.z = -phase * 0.2;
      
      // Torso leans forward to balance
      if (spineRef.current) spineRef.current.rotation.x = phase * 0.5;
      
      // Thighs rotate up (relative to hips)
      if (leftThighRef.current) leftThighRef.current.rotation.x = -phase * 1.5;
      if (rightThighRef.current) rightThighRef.current.rotation.x = -phase * 1.5;
      
      // Calves rotate back (relative to thighs) to keep feet under center of mass
      if (leftCalfRef.current) leftCalfRef.current.rotation.x = phase * 1.5;
      if (rightCalfRef.current) rightCalfRef.current.rotation.x = phase * 1.5;
      
      // Arms lift forward to counterbalance
      if (leftUpperArmRef.current) leftUpperArmRef.current.rotation.x = -phase * 1.2;
      if (rightUpperArmRef.current) rightUpperArmRef.current.rotation.x = -phase * 1.2;
      
    } else {
      // Idle breathing
      groupRef.current.position.y = Math.sin(t * 2) * 0.05;
      if (spineRef.current) spineRef.current.rotation.x = Math.sin(t * 2) * 0.02;
    }
  });

  // Skeletal components
  const Bone = ({ length }: { length: number }) => (
    <mesh position={[0, -length/2, 0]}>
      <cylinderGeometry args={[0.02, 0.02, length, 8]} />
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
    </mesh>
  );

  const Joint = () => (
    <mesh>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshBasicMaterial color="#60a5fa" />
    </mesh>
  );

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Joint /> {/* Root / Hips */}

      {/* Spine & Upper Body */}
      <group ref={spineRef}>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
        
        {/* Neck/Head */}
        <group position={[0, 0.8, 0]}>
          <Joint />
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshBasicMaterial color="#60a5fa" wireframe />
          </mesh>
        </group>

        {/* Left Arm */}
        <group position={[-0.3, 0.7, 0]}>
          <Joint /> {/* Shoulder */}
          <group ref={leftUpperArmRef}>
            <Bone length={0.5} />
            <group position={[0, -0.5, 0]}>
              <Joint /> {/* Elbow */}
              <group>
                <Bone length={0.4} />
                <group position={[0, -0.4, 0]}>
                  <Joint /> {/* Wrist */}
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* Right Arm */}
        <group position={[0.3, 0.7, 0]}>
          <Joint /> {/* Shoulder */}
          <group ref={rightUpperArmRef}>
            <Bone length={0.5} />
            <group position={[0, -0.5, 0]}>
              <Joint /> {/* Elbow */}
              <group>
                <Bone length={0.4} />
                <group position={[0, -0.4, 0]}>
                  <Joint /> {/* Wrist */}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* Left Leg */}
      <group position={[-0.15, 0, 0]}>
        <group ref={leftThighRef}>
          <Bone length={0.6} />
          <group position={[0, -0.6, 0]}>
            <Joint /> {/* Knee */}
            <group ref={leftCalfRef}>
              <Bone length={0.6} />
              <group position={[0, -0.6, 0]}>
                <Joint /> {/* Ankle */}
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* Right Leg */}
      <group position={[0.15, 0, 0]}>
        <group ref={rightThighRef}>
          <Bone length={0.6} />
          <group position={[0, -0.6, 0]}>
            <Joint /> {/* Knee */}
            <group ref={rightCalfRef}>
              <Bone length={0.6} />
              <group position={[0, -0.6, 0]}>
                <Joint /> {/* Ankle */}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export default function LiveWorkout({ workoutType, onWorkoutEnd }: LiveWorkoutProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [metrics, setMetrics] = useState({ hr: 85, form: 92, muscle: 65, fatigue: 12 });
  
  // MediaPipe Setup - Reverted to High-Fidelity 2D Connectors
  useEffect(() => {
    let camera: any;
    
    if (cameraActive && videoRef.current && canvasRef.current) {
      const pose = new Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      pose.setOptions({
        modelComplexity: 1, 
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults((results: any) => {
        if (!canvasRef.current || !videoRef.current) return;
        const canvasCtx = canvasRef.current.getContext('2d');
        if (!canvasCtx) return;

        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        if (results.poseLandmarks) {
          drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                         {color: '#10b981', lineWidth: 4});
          drawLandmarks(canvasCtx, results.poseLandmarks,
                        {color: '#34d399', lineWidth: 2, radius: 3});
                        
          setMetrics(prev => ({
            ...prev,
            form: Math.min(100, Math.max(80, prev.form + (Math.random() * 2 - 1))),
          }));
        }
        canvasCtx.restore();
      });

      camera = new MediaPipeCamera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) await pose.send({image: videoRef.current});
        },
        width: 1280,
        height: 720
      });
      camera.start();
    }

    return () => {
      if (camera) camera.stop();
    };
  }, [cameraActive]);

  // Telemetry simulation
  useEffect(() => {
    if (!cameraActive) return;
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        hr: Math.min(180, Math.max(70, prev.hr + (Math.random() * 4 - 2))),
        fatigue: Math.min(100, prev.fatigue + 0.2)
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [cameraActive]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#020617] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 bg-black/40 backdrop-blur-md border-b border-white/5 absolute top-0 w-full z-50">
        <Button variant="ghost" onClick={onWorkoutEnd} className="text-white hover:bg-white/10 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" /> Terminate Session
        </Button>
        <div className="flex gap-4">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 backdrop-blur-md px-4 py-1.5 font-mono tracking-widest">
            BIOMETRICS ONLINE <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-2" />
          </Badge>
        </div>
      </div>

      {/* Main Grid Layout - 50/50 Split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 pt-[72px]">
        
        {/* Left Panel: Camera & Wireframe Overlay */}
        <div className="relative bg-[#050505] border-r border-white/5 flex flex-col overflow-hidden">
          {!cameraActive ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Camera className="h-24 w-24 text-emerald-500/50 mb-8" />
              <Button 
                onClick={() => setCameraActive(true)} 
                className="h-16 px-10 text-lg bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all hover:scale-105 font-bold tracking-wide"
              >
                INITIALIZE OPTICS
              </Button>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col overflow-hidden bg-black">
              {/* Aspect Ratio Container for Perfect 2D Mapping */}
              <div className="relative w-full flex-1 flex items-center justify-center">
                <div className="relative w-full h-full aspect-video">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] opacity-60 grayscale"
                  />
                  <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] z-10"
                  />
                </div>
              </div>

              {/* Telemetry Dashboard - Strict Grid */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="grid grid-cols-2 gap-4">
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}>
                    <Card className="bg-black/60 backdrop-blur-2xl border border-emerald-500/20 rounded-2xl shadow-xl">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-emerald-400 font-mono text-xs tracking-wider flex items-center gap-2"><Target className="w-4 h-4"/> FORM ACCURACY</span>
                          <span className="text-white font-black text-xl">{Math.round(metrics.form)}%</span>
                        </div>
                        <Progress value={metrics.form} className="h-2 bg-white/5" indicatorClassName="bg-emerald-500 shadow-[0_0_15px_#10b981]" />
                      </CardContent>
                    </Card>
                  </motion.div>
                  
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}>
                    <Card className="bg-black/60 backdrop-blur-2xl border border-blue-500/20 rounded-2xl shadow-xl">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-blue-400 font-mono text-xs tracking-wider flex items-center gap-2"><Activity className="w-4 h-4"/> HEART RATE</span>
                          <span className="text-white font-black text-xl">{Math.round(metrics.hr)} BPM</span>
                        </div>
                        <Progress value={(metrics.hr/200)*100} className="h-2 bg-white/5" indicatorClassName="bg-blue-500 shadow-[0_0_15px_#3b82f6]" />
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Holographic Skeleton Trainer */}
        <div className="relative bg-[#020617] overflow-hidden flex flex-col">
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="absolute top-10 left-10 z-10">
            <motion.h2 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-4xl font-black text-white tracking-tight flex items-center gap-4"
            >
              HOLOGRAPHIC TRAINER <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]" />
            </motion.h2>
            <motion.p 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-blue-400 font-mono text-sm mt-2 tracking-widest uppercase"
            >
              {workoutType} PROTOCOL
            </motion.p>
          </div>

          <div className="flex-1 w-full h-full cursor-move">
            <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }}>
              <color attach="background" args={["#020617"]} />
              
              <OrbitControls 
                enableZoom={false}
                enablePan={false}
                maxPolarAngle={Math.PI / 2}
                minPolarAngle={Math.PI / 4}
              />
              
              <HolographicTrainer activeWorkout={workoutType} />
              
              <ContactShadows position={[0, -0.7, 0]} opacity={0.6} scale={10} blur={2} far={4} color="#3b82f6" />
            </Canvas>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
