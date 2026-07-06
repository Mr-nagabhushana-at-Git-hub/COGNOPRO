import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
  FaceLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { LandmarkSmoother, type Vec3 } from "@/lib/one-euro-filter";
import {
  computeAngles, estimateGround, analyzeFace, POSE,
  type JointAngles, type FaceState, type LM,
} from "@/lib/pose-analysis";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

export interface TrackingFrame {
  poseScreen: LM[] | null;   // normalized image landmarks (for drawing)
  poseWorld: LM[] | null;    // metric world landmarks (for angles)
  leftHand: LM[] | null;
  rightHand: LM[] | null;
  angles: JointAngles | null;
  face: FaceState;
  ground: { y: number; planted: boolean };
  fps: number;
}

export interface TrackingOptions {
  trackHands?: boolean;
  trackFace?: boolean;
  /** Run hands/face every Nth frame to save compute (pose runs every frame). */
  auxEveryNFrames?: number;
}

interface Args {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  enabled: boolean;
  options?: TrackingOptions;
  onFrame?: (frame: TrackingFrame) => void;
}

export function useHolisticTracking({ videoRef, canvasRef, enabled, options, onFrame }: Args) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poseRef = useRef<PoseLandmarker | null>(null);
  const handRef = useRef<HandLandmarker | null>(null);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(-1);
  const frameCountRef = useRef(0);
  const fpsRef = useRef({ last: performance.now(), frames: 0, fps: 0 });

  const smootherRef = useRef(new LandmarkSmoother(30, 0.5, 0.1));
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const optsRef = useRef<Required<TrackingOptions>>({
    trackHands: options?.trackHands ?? true,
    trackFace: options?.trackFace ?? true,
    auxEveryNFrames: options?.auxEveryNFrames ?? 2,
  });
  optsRef.current = {
    trackHands: options?.trackHands ?? true,
    trackFace: options?.trackFace ?? true,
    auxEveryNFrames: options?.auxEveryNFrames ?? 2,
  };

  // cached aux results between skipped frames
  const lastHands = useRef<{ left: LM[] | null; right: LM[] | null }>({ left: null, right: null });
  const lastFace = useRef<{ landmarks: LM[] | null; blend: any[] | null }>({ landmarks: null, blend: null });

  const initModels = useCallback(async () => {
    if (poseRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      poseRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      if (optsRef.current.trackHands) {
        handRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
      }
      if (optsRef.current.trackFace) {
        faceRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
      }
      setReady(true);
    } catch (e: any) {
      setError(e?.message || "Failed to load tracking models. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  const toLM = (a: any): LM[] => a.map((p: any) => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility }));

  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !poseRef.current) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    if (video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const now = performance.now();
    let ts = Math.max(now, lastTsRef.current + 1);
    lastTsRef.current = ts;
    frameCountRef.current += 1;
    const runAux = frameCountRef.current % optsRef.current.auxEveryNFrames === 0;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }
    const draw = new DrawingUtils(ctx);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Pose (every frame) ──
    let poseScreen: LM[] | null = null;
    let poseWorld: LM[] | null = null;
    try {
      const res = poseRef.current.detectForVideo(video, ts);
      if (res.landmarks?.[0]) {
        poseScreen = smootherRef.current.smooth("pose", toLM(res.landmarks[0]) as Vec3[]) as LM[];
        poseWorld = res.worldLandmarks?.[0] ? (toLM(res.worldLandmarks[0])) : null;
      }
    } catch { /* frame skipped */ }

    // ── Hands (throttled) ──
    if (optsRef.current.trackHands && handRef.current) {
      if (runAux) {
        try {
          const hres = handRef.current.detectForVideo(video, ts);
          let left: LM[] | null = null, right: LM[] | null = null;
          hres.landmarks?.forEach((hand: any, i: number) => {
            const label = hres.handednesses?.[i]?.[0]?.categoryName;
            const lm = toLM(hand);
            if (label === "Left") left = lm; else right = lm;
          });
          lastHands.current = { left, right };
        } catch { /* skip */ }
      }
    } else {
      lastHands.current = { left: null, right: null };
    }

    // ── Face (throttled) ──
    if (optsRef.current.trackFace && faceRef.current) {
      if (runAux) {
        try {
          const fres = faceRef.current.detectForVideo(video, ts);
          lastFace.current = {
            landmarks: fres.faceLandmarks?.[0] ? toLM(fres.faceLandmarks[0]) : null,
            blend: fres.faceBlendshapes?.[0]?.categories ?? null,
          };
        } catch { /* skip */ }
      }
    } else {
      lastFace.current = { landmarks: null, blend: null };
    }

    // ── Draw overlay ──
    // Face mesh (subtle)
    if (lastFace.current.landmarks) {
      draw.drawConnectors(lastFace.current.landmarks as any, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "rgba(120,255,190,0.18)", lineWidth: 0.5 });
      draw.drawConnectors(lastFace.current.landmarks as any, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "rgba(120,255,190,0.5)", lineWidth: 1.5 });
    }
    // Pose skeleton
    if (poseScreen) {
      draw.drawConnectors(poseScreen as any, PoseLandmarker.POSE_CONNECTIONS, { color: "#10b981", lineWidth: 4 });
      draw.drawLandmarks(poseScreen as any, { color: "#34d399", lineWidth: 1, radius: 3 });
      drawFeetAndGround(ctx, poseScreen, canvas.width, canvas.height);
      if (poseWorld) drawAngleLabels(ctx, poseScreen, computeAngles(poseWorld), canvas.width, canvas.height);
    }
    // Hands (finger joints + fingertip highlights)
    for (const [hand, color] of [[lastHands.current.left, "#facc15"], [lastHands.current.right, "#f472b6"]] as const) {
      if (!hand) continue;
      draw.drawConnectors(hand as any, HandLandmarker.HAND_CONNECTIONS, { color: color as string, lineWidth: 3 });
      draw.drawLandmarks(hand as any, { color: "#ffffff", radius: 2 });
      drawFingertips(ctx, hand, color as string, canvas.width, canvas.height);
    }

    // ── FPS ──
    const f = fpsRef.current;
    f.frames++;
    if (now - f.last >= 500) { f.fps = Math.round((f.frames * 1000) / (now - f.last)); f.frames = 0; f.last = now; }

    // ── Emit ──
    const angles = poseWorld ? computeAngles(poseWorld) : null;
    const face = analyzeFace(lastFace.current.blend);
    const ground = poseScreen ? estimateGround(poseScreen) : { y: 0.95, planted: false };
    onFrameRef.current?.({ poseScreen, poseWorld, leftHand: lastHands.current.left, rightHand: lastHands.current.right, angles, face, ground, fps: f.fps });

    rafRef.current = requestAnimationFrame(loop);
  }, [videoRef, canvasRef]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      await initModels();
      if (cancelled) return;
      lastTsRef.current = -1;
      smootherRef.current.reset();
      rafRef.current = requestAnimationFrame(loop);
    })();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled, initModels, loop]);

  useEffect(() => () => {
    poseRef.current?.close();
    handRef.current?.close();
    faceRef.current?.close();
    poseRef.current = handRef.current = faceRef.current = null;
  }, []);

  return { ready, loading, error };
}

// ── Overlay helpers ──
function drawFingertips(ctx: CanvasRenderingContext2D, hand: LM[], color: string, w: number, h: number) {
  const tips = [4, 8, 12, 16, 20];
  for (const t of tips) {
    const lm = hand[t];
    if (!lm) continue;
    const x = lm.x * w, y = lm.y * h;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "#ffffff"; ctx.stroke();
  }
}

function drawFeetAndGround(ctx: CanvasRenderingContext2D, pose: LM[], w: number, h: number) {
  // Emphasise ankles + feet
  for (const idx of [POSE.LEFT_ANKLE, POSE.RIGHT_ANKLE, POSE.LEFT_HEEL, POSE.RIGHT_HEEL, POSE.LEFT_FOOT, POSE.RIGHT_FOOT]) {
    const lm = pose[idx];
    if (!lm || (lm.visibility ?? 1) < 0.4) continue;
    ctx.beginPath(); ctx.arc(lm.x * w, lm.y * h, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#22d3ee"; ctx.fill();
  }
  // Ground line at lowest foot point
  const g = estimateGround(pose);
  if (g.planted) {
    const y = g.y * h;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y);
    ctx.strokeStyle = "rgba(34,211,238,0.35)"; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.stroke(); ctx.setLineDash([]);
  }
}

function drawAngleLabels(ctx: CanvasRenderingContext2D, pose: LM[], a: JointAngles, w: number, h: number) {
  const label = (idx: number, val: number) => {
    const lm = pose[idx];
    if (!lm || (lm.visibility ?? 1) < 0.5) return;
    const x = lm.x * w, y = lm.y * h;
    const text = `${Math.round(val)}°`;
    ctx.font = "bold 14px ui-monospace, monospace";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(2,6,23,0.7)";
    ctx.fillRect(x + 8, y - 20, tw + 8, 18);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(text, x + 12, y - 6);
  };
  label(POSE.LEFT_KNEE, a.leftKnee);
  label(POSE.RIGHT_KNEE, a.rightKnee);
  label(POSE.LEFT_ELBOW, a.leftElbow);
  label(POSE.RIGHT_ELBOW, a.rightElbow);
  label(POSE.LEFT_HIP, a.leftHip);
  label(POSE.RIGHT_HIP, a.rightHip);
}
