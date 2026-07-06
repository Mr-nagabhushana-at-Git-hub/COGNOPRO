import { Suspense, Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

// A realistic body-shaped 3D trainer that demonstrates each exercise with correct
// form. Ships fully offline (procedural athlete). If `avatarUrl` points to a rigged
// humanoid .glb (Mixamo / Ready Player Me), it loads that mesh and drives its
// humanoid bones with the same kinematics — falling back safely on any load error.

interface Props {
  exerciseId: string;
  /** Optional rigged humanoid .glb URL (Mixamo/Ready Player Me). */
  avatarUrl?: string;
  speed?: number;
  className?: string;
}

// phase 0 (top/neutral) → 1 (bottom/extended) → 0
function phaseFor(t: number, speed: number) {
  return (Math.sin(t * speed) + 1) / 2;
}

// ─── Procedural athlete (body shapes, not lines) ───
function Limb({ length, radius, color }: { length: number; radius: number; color: string }) {
  return (
    <mesh position={[0, -length / 2, 0]} castShadow>
      <capsuleGeometry args={[radius, length - radius * 2, 6, 12]} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} />
    </mesh>
  );
}

function ProceduralAthlete({ exerciseId, speed = 3 }: { exerciseId: string; speed?: number }) {
  const root = useRef<THREE.Group>(null);
  const spine = useRef<THREE.Group>(null);
  const lThigh = useRef<THREE.Group>(null);
  const rThigh = useRef<THREE.Group>(null);
  const lShin = useRef<THREE.Group>(null);
  const rShin = useRef<THREE.Group>(null);
  const lUpperArm = useRef<THREE.Group>(null);
  const rUpperArm = useRef<THREE.Group>(null);
  const lForeArm = useRef<THREE.Group>(null);
  const rForeArm = useRef<THREE.Group>(null);

  const skin = "#8ea3c4";
  const accent = "#5b8def";

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.getElapsedTime();
    const p = phaseFor(t, speed);
    // reset baselines
    root.current.position.y = 0;
    root.current.rotation.set(0, 0, 0);
    const set = (r: React.RefObject<THREE.Group>, x = 0, z = 0) => { if (r.current) r.current.rotation.set(x, 0, z); };

    switch (exerciseId) {
      case "squat":
      case "lunge": {
        root.current.position.y = -p * 0.7;
        if (spine.current) spine.current.rotation.x = p * 0.45;
        set(lThigh, -p * 1.5); set(rThigh, -p * 1.5);
        set(lShin, p * 1.5); set(rShin, p * 1.5);
        set(lUpperArm, -p * 1.2); set(rUpperArm, -p * 1.2);
        break;
      }
      case "pushup": {
        root.current.rotation.x = Math.PI / 2.2;
        root.current.position.y = -0.2 - p * 0.15;
        set(lUpperArm, 0, 0.5); set(rUpperArm, 0, -0.5);
        set(lForeArm, -p * 1.4); set(rForeArm, -p * 1.4);
        break;
      }
      case "bicep-curl": {
        set(lForeArm, -p * 2.4); set(rForeArm, -p * 2.4);
        break;
      }
      case "shoulder-press": {
        set(lUpperArm, -Math.PI * (0.5 + p * 0.45), 0.2);
        set(rUpperArm, -Math.PI * (0.5 + p * 0.45), -0.2);
        set(lForeArm, -(1 - p) * 1.2); set(rForeArm, -(1 - p) * 1.2);
        break;
      }
      case "jumping-jack": {
        root.current.position.y = Math.abs(Math.sin(t * speed)) * 0.15;
        set(lUpperArm, 0, 0.4 + p * 1.6);
        set(rUpperArm, 0, -(0.4 + p * 1.6));
        set(lThigh, 0, p * 0.4); set(rThigh, 0, -p * 0.4);
        break;
      }
      default: {
        root.current.position.y = Math.sin(t * 2) * 0.04;
        if (spine.current) spine.current.rotation.x = Math.sin(t * 2) * 0.02;
        set(lUpperArm, 0, 0.15); set(rUpperArm, 0, -0.15);
      }
    }
  });

  return (
    <group ref={root} position={[0, 0, 0]}>
      {/* Pelvis */}
      <mesh castShadow><sphereGeometry args={[0.16, 20, 20]} /><meshStandardMaterial color={accent} roughness={0.4} /></mesh>

      {/* Spine → chest → head */}
      <group ref={spine}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <capsuleGeometry args={[0.17, 0.5, 8, 16]} />
          <meshStandardMaterial color={skin} roughness={0.5} />
        </mesh>
        <group position={[0, 0.92, 0]}>
          <mesh castShadow><sphereGeometry args={[0.09, 16, 16]} /><meshStandardMaterial color={skin} /></mesh>
          <mesh position={[0, 0.2, 0]} castShadow><sphereGeometry args={[0.17, 24, 24]} /><meshStandardMaterial color={skin} roughness={0.4} /></mesh>
        </group>

        {/* Arms */}
        <group position={[-0.28, 0.72, 0]} ref={lUpperArm}>
          <Limb length={0.42} radius={0.06} color={accent} />
          <group position={[0, -0.42, 0]} ref={lForeArm}>
            <Limb length={0.38} radius={0.05} color={skin} />
            <mesh position={[0, -0.42, 0]} castShadow><sphereGeometry args={[0.06, 12, 12]} /><meshStandardMaterial color={accent} /></mesh>
          </group>
        </group>
        <group position={[0.28, 0.72, 0]} ref={rUpperArm}>
          <Limb length={0.42} radius={0.06} color={accent} />
          <group position={[0, -0.42, 0]} ref={rForeArm}>
            <Limb length={0.38} radius={0.05} color={skin} />
            <mesh position={[0, -0.42, 0]} castShadow><sphereGeometry args={[0.06, 12, 12]} /><meshStandardMaterial color={accent} /></mesh>
          </group>
        </group>
      </group>

      {/* Legs */}
      <group position={[-0.12, 0, 0]} ref={lThigh}>
        <Limb length={0.5} radius={0.075} color={skin} />
        <group position={[0, -0.5, 0]} ref={lShin}>
          <Limb length={0.48} radius={0.06} color={accent} />
          <mesh position={[0.02, -0.5, 0.06]} castShadow><boxGeometry args={[0.12, 0.06, 0.22]} /><meshStandardMaterial color={skin} /></mesh>
        </group>
      </group>
      <group position={[0.12, 0, 0]} ref={rThigh}>
        <Limb length={0.5} radius={0.075} color={skin} />
        <group position={[0, -0.5, 0]} ref={rShin}>
          <Limb length={0.48} radius={0.06} color={accent} />
          <mesh position={[-0.02, -0.5, 0.06]} castShadow><boxGeometry args={[0.12, 0.06, 0.22]} /><meshStandardMaterial color={skin} /></mesh>
        </group>
      </group>
    </group>
  );
}

// ─── Optional rigged GLB avatar ───
function RiggedAvatar({ url, exerciseId, speed = 3 }: { url: string; exerciseId: string; speed?: number }) {
  const { scene, animations } = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(animations, group);
  const bones = useMemo(() => {
    const map: Record<string, THREE.Object3D> = {};
    scene.traverse((o) => { if ((o as THREE.Bone).isBone || /hips|spine|arm|leg|forearm|hand|foot|thigh|shin|knee|elbow/i.test(o.name)) map[o.name.toLowerCase()] = o; });
    return map;
  }, [scene]);

  // If the model ships an exercise-like clip, play it; else drive bones procedurally.
  const clip = names.find((n) => new RegExp(exerciseId.replace("-", ".?"), "i").test(n));
  useEffect(() => {
    if (clip && actions[clip]) { const a = actions[clip]!; a.reset().fadeIn(0.3).play(); return () => { a.fadeOut(0.2); }; }
  }, [clip, actions]);

  const find = (re: RegExp) => Object.entries(bones).find(([k]) => re.test(k))?.[1];
  useFrame((state) => {
    if (clip) return; // animation clip is driving it
    const p = phaseFor(state.clock.getElapsedTime(), speed);
    const hips = find(/hips|pelvis/);
    const lLeg = find(/(left).*(up).*(leg|thigh)/) || find(/leftupleg/);
    const rLeg = find(/(right).*(up).*(leg|thigh)/) || find(/rightupleg/);
    const lArm = find(/left.*(fore)?arm/);
    const rArm = find(/right.*(fore)?arm/);
    if (exerciseId === "squat" || exerciseId === "lunge") {
      if (hips) hips.position.y = (hips.userData._y0 ??= hips.position.y) - p * 0.4;
      if (lLeg) lLeg.rotation.x = -p * 1.2;
      if (rLeg) rLeg.rotation.x = -p * 1.2;
    } else if (exerciseId === "bicep-curl") {
      if (lArm) lArm.rotation.z = p * 1.6;
      if (rArm) rArm.rotation.z = -p * 1.6;
    }
  });

  return <primitive ref={group} object={scene} scale={1} position={[0, -0.9, 0]} />;
}

// Error boundary → procedural fallback if the GLB fails to load
class AvatarBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function ExerciseAvatar({ exerciseId, avatarUrl, speed = 3, className }: Props) {
  return (
    <div className={className}>
      <Canvas shadows camera={{ position: [0, 0.6, 3.6], fov: 45 }}>
        <color attach="background" args={["#0a0f1e"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.3} castShadow />
        <pointLight position={[-4, 2, -3]} intensity={0.4} color="#5b8def" />
        <Suspense fallback={<ProceduralAthlete exerciseId={exerciseId} speed={speed} />}>
          {avatarUrl ? (
            <AvatarBoundary fallback={<ProceduralAthlete exerciseId={exerciseId} speed={speed} />}>
              <RiggedAvatar url={avatarUrl} exerciseId={exerciseId} speed={speed} />
            </AvatarBoundary>
          ) : (
            <ProceduralAthlete exerciseId={exerciseId} speed={speed} />
          )}
        </Suspense>
        <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={8} blur={2.4} far={3} color="#5b8def" />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.8} minPolarAngle={Math.PI / 4} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  );
}
