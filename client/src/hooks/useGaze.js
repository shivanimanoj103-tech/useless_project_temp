import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const DEFAULT_THRESHOLDS = { yaw: 0.30, pitchMin: 0.15, pitchMax: 0.80, ear: 0.18 };

export function useGaze(videoRef, videoReady) {
  const [status,     setStatus]     = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadError,  setLoadError]  = useState(null);
  const [gazeData,   setGazeData]   = useState({
    isLookingAtScreen: false,
    faceDetected:      false,
    isEyesClosed:      false,
    avgEAR:            0.30,
    leftEAR:           0.30,
    rightEAR:          0.30,
    yawRatio:          0,
    pitchRatio:        0,
  });
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);

  const landmarkerRef   = useRef(null);
  const animFrameRef    = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const thresholdsRef   = useRef(thresholds);
  useEffect(() => { thresholdsRef.current = thresholds; }, [thresholds]);

  // ── Load MediaPipe FaceLandmarker ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      for (const delegate of ['GPU', 'CPU']) {
        try {
          const filesetResolver = await FilesetResolver.forVisionTasks(WASM_CDN);
          const lm = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            outputFaceBlendshapes: false,
            runningMode: 'VIDEO',
            numFaces: 1,
          });
          if (!cancelled) {
            landmarkerRef.current = lm;
            setStatus('ready');
            console.log(`✅ MediaPipe FaceLandmarker ready (${delegate})`);
          }
          return; // success — stop trying delegates
        } catch (e) {
          console.warn(`[MediaPipe] ${delegate} failed:`, e.message);
          if (delegate === 'CPU' && !cancelled) {
            setStatus('error');
            setLoadError(e.message);
          }
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Detection loop (runs only when model + video are ready) ────────────────
  useEffect(() => {
    if (status !== 'ready' || !videoReady) return;

    let running = true;

    function detect() {
      if (!running) return;

      const video = videoRef.current;
      if (
        video &&
        video.readyState >= 2 &&
        video.currentTime !== lastVideoTimeRef.current
      ) {
        lastVideoTimeRef.current = video.currentTime;

        try {
          const results = landmarkerRef.current.detectForVideo(video, performance.now());
          const { yaw: YAW_T, pitchMin: PITCH_MIN, pitchMax: PITCH_MAX, ear: EAR_T } = thresholdsRef.current;

          if (results.faceLandmarks?.length > 0) {
            const lm = results.faceLandmarks[0];

            // Key landmarks (MediaPipe 468-point mesh)
            const noseTip  = lm[1];    // nose tip
            const leftEye  = lm[33];   // left eye outer corner
            const rightEye = lm[263];  // right eye outer corner
            const chin     = lm[152];  // chin

            // Yaw: nose deviation from eye midpoint, normalised by eye width
            const midEyeX  = (leftEye.x + rightEye.x) / 2;
            const eyeWidth = Math.abs(rightEye.x - leftEye.x);
            const yawRatio = eyeWidth > 0.01
              ? (noseTip.x - midEyeX) / eyeWidth
              : 0;

            // Pitch: where nose tip falls between eyes and chin
            const midEyeY    = (leftEye.y + rightEye.y) / 2;
            const faceHeight = Math.abs(chin.y - midEyeY);
            const pitchRatio = faceHeight > 0.01
              ? (noseTip.y - midEyeY) / faceHeight
              : 0.5;

            // ── Eye Aspect Ratio (EAR) Calculation for Eye Closure / Blink Detection ──
            // Left Eye: Upper 159, Lower 145, Outer 33, Inner 133
            const leftLidDist = Math.hypot(lm[159].x - lm[145].x, lm[159].y - lm[145].y);
            const leftCornerDist = Math.hypot(lm[33].x - lm[133].x, lm[33].y - lm[133].y);
            const leftEAR = leftCornerDist > 0.005 ? leftLidDist / leftCornerDist : 0.3;

            // Right Eye: Upper 386, Lower 374, Outer 263, Inner 362
            const rightLidDist = Math.hypot(lm[386].x - lm[374].x, lm[386].y - lm[374].y);
            const rightCornerDist = Math.hypot(lm[263].x - lm[362].x, lm[263].y - lm[362].y);
            const rightEAR = rightCornerDist > 0.005 ? rightLidDist / rightCornerDist : 0.3;

            const avgEAR = (leftEAR + rightEAR) / 2;
            const isEyesClosed = avgEAR < (EAR_T || 0.18);

            // User is considered looking at screen ONLY IF:
            // 1. Head yaw is within threshold
            // 2. Head pitch is within range
            // 3. User's eyes are OPEN (not closed/blinking)
            const isLookingAtScreen =
              !isEyesClosed &&
              Math.abs(yawRatio) < YAW_T &&
              pitchRatio > PITCH_MIN &&
              pitchRatio < PITCH_MAX;

            setGazeData({
              isLookingAtScreen,
              faceDetected: true,
              isEyesClosed,
              avgEAR:       +avgEAR.toFixed(3),
              leftEAR:      +leftEAR.toFixed(3),
              rightEAR:     +rightEAR.toFixed(3),
              yawRatio:     +yawRatio.toFixed(3),
              pitchRatio:   +pitchRatio.toFixed(3),
            });
          } else {
            setGazeData((prev) => ({
              ...prev,
              isLookingAtScreen: false,
              faceDetected:      false,
              isEyesClosed:      false,
            }));
          }
        } catch (_) { /* skip frame on error */ }
      }

      animFrameRef.current = requestAnimationFrame(detect);
    }

    animFrameRef.current = requestAnimationFrame(detect);
    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [status, videoReady, videoRef]);

  return { ...gazeData, status, loadError, thresholds, setThresholds };
}
