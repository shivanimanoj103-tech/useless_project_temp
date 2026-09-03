import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const DEFAULT_THRESHOLDS = { yaw: 0.30, pitchMin: 0.15, pitchMax: 0.80 };

export function useGaze(videoRef, videoReady) {
  const [status,     setStatus]     = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadError,  setLoadError]  = useState(null);
  const [gazeData,   setGazeData]   = useState({
    isLookingAtScreen: false,
    faceDetected:      false,
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
          const { yaw: YAW_T, pitchMin: PITCH_MIN, pitchMax: PITCH_MAX } = thresholdsRef.current;

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

            const isLookingAtScreen =
              Math.abs(yawRatio)  < YAW_T    &&
              pitchRatio          > PITCH_MIN &&
              pitchRatio          < PITCH_MAX;

            setGazeData({
              isLookingAtScreen,
              faceDetected: true,
              yawRatio:     +yawRatio.toFixed(3),
              pitchRatio:   +pitchRatio.toFixed(3),
            });
          } else {
            setGazeData((prev) => ({
              ...prev,
              isLookingAtScreen: false,
              faceDetected:      false,
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
