import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Branch A: User is LOOKING at the eyes (returning to look after looking away)
 * Progression: SAD (scolding) → UNCOMFORTABLE → VERY UNCOMFORTABLE → PEAK UNCOMFORTABLE (every 4 seconds)
 */
const BRANCH_A_TIMINGS = [
  { state: 'sad',                 time: 0 },
  { state: 'uncomfortable',      time: 4.0 },
  { state: 'very_uncomfortable',  time: 8.0 },
  { state: 'peak_uncomfortable',  time: 12.0 },
];

/**
 * Branch B: User is LOOKING AWAY from the eyes
 * Progression: IGNORED → MILD ANNOYANCE → ANNOYED → OFFENDED → PETTY → OVER IT (every 4 seconds)
 */
const BRANCH_B_TIMINGS = [
  { state: 'ignored',        time: 0 },
  { state: 'mild_annoyance', time: 4.0 },
  { state: 'annoyed',        time: 8.0 },
  { state: 'offended',       time: 12.0 },
  { state: 'petty',          time: 16.0 },
  { state: 'over_it',        time: 20.0 },
];

const BRANCH_A_SET = new Set(BRANCH_A_TIMINGS.map((item) => item.state));
const BRANCH_B_SET = new Set(BRANCH_B_TIMINGS.map((item) => item.state));

function nowStr() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export function useEyeState(isLookingAtScreen) {
  const [state, setState] = useState('ignored');
  const [timers, setTimers] = useState({ awayTime: 0, contactTime: 0 });
  const [transitions, setTransitions] = useState([]);

  // ── Configurable debug parameters with natural defaults ────────────────────
  const [stateThreshold, setStateThreshold] = useState(5);        // Range 1-10 (default 5 = 1.0x scale)
  const [transitionDelay, setTransitionDelay] = useState(1.0);    // Default 1.0s response delay
  const [eyeMovementSpeed, setEyeMovementSpeed] = useState(0.08);  // Range 0.02-0.20
  const [discomfortIntensity, setDiscomfortIntensity] = useState(5); // Range 1-10
  const [sneakPeekDuration, setSneakPeekDuration] = useState(1.2);  // Range 0.5-3s (how long one-eye peek lasts)
  const [sneakPeekCooldown, setSneakPeekCooldown] = useState(2.5);  // Range 1-6s (delay between sneak peeks)

  // Sneak peek & tear runtime state exposed to renderer
  const [sneakPeekInfo, setSneakPeekInfo] = useState({
    eye: null,        // 'left' | 'right' | null
    phase: 'none',    // 'closed' | 'peeking' | 'none'
    discomfortLevel: 0, // 0 to 1 float driving tear generation and eyelid strain
  });

  // ── Mutable refs for RAF loop performance ──────────────────────────────────
  const stateRef = useRef('ignored');
  const awayRef = useRef(0);
  const contactRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animRef = useRef(null);
  const isLookingRef = useRef(isLookingAtScreen);
  const speedRef = useRef(1);
  const startedRef = useRef(false);

  // Settings refs for instant RAF read
  const thresholdRef = useRef(stateThreshold);
  const delayRef = useRef(transitionDelay);
  const peakDurRef = useRef(sneakPeekDuration);
  const peakCoolRef = useRef(sneakPeekCooldown);
  const discIntRef = useRef(discomfortIntensity);

  useEffect(() => { thresholdRef.current = stateThreshold; }, [stateThreshold]);
  useEffect(() => { delayRef.current = transitionDelay; }, [transitionDelay]);
  useEffect(() => { peakDurRef.current = sneakPeekDuration; }, [sneakPeekDuration]);
  useEffect(() => { peakCoolRef.current = sneakPeekCooldown; }, [sneakPeekCooldown]);
  useEffect(() => { discIntRef.current = discomfortIntensity; }, [discomfortIntensity]);

  // Fast Cross-Branch Switch Debounce Tracker (guaranteed <= 1.0s)
  const pendingBranchRef = useRef(null);
  const pendingBranchTimeRef = useRef(0);

  // Peak Uncomfortable sneak-peek state machine
  const peakPhaseRef = useRef('closed'); // 'closed' | 'peeking'
  const peakTimerRef = useRef(0);
  const sneakEyeRef = useRef('left');
  const discomfortLevelRef = useRef(0);

  useEffect(() => {
    isLookingRef.current = isLookingAtScreen;
  }, [isLookingAtScreen]);

  /** Execute a verified state transition */
  const doTransition = useCallback((newState) => {
    if (stateRef.current === newState) return;
    const t = {
      from: stateRef.current,
      to: newState,
      timeStr: nowStr(),
      timestamp: Date.now(),
    };
    console.log(`[Needy State Machine] 🔄 ${t.from} → ${t.to}`);
    stateRef.current = newState;
    setState(newState);
    setTransitions((prev) => [...prev.slice(-29), t]);
  }, []);

  /** Force a specific state (for debug panel) */
  const forceState = useCallback((newState) => {
    if (BRANCH_A_SET.has(newState)) {
      const entry = BRANCH_A_TIMINGS.find((item) => item.state === newState);
      contactRef.current = (entry ? entry.time : 0) * (thresholdRef.current / 5) + 0.1;
      awayRef.current = 0;
    } else {
      const entry = BRANCH_B_TIMINGS.find((item) => item.state === newState);
      awayRef.current = (entry ? entry.time : 0) * (thresholdRef.current / 5) + 0.1;
      contactRef.current = 0;
    }
    pendingBranchRef.current = null;
    pendingBranchTimeRef.current = 0;
    if (newState === 'peak_uncomfortable') {
      peakPhaseRef.current = 'closed';
      peakTimerRef.current = 0;
      sneakEyeRef.current = 'left';
    }
    doTransition(newState);
  }, [doTransition]);

  /** Set timer speed multiplier (for debug panel) */
  const setSpeed = useCallback((s) => { speedRef.current = s; }, []);

  // ── Main RAF State Machine Tick ────────────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    function tick() {
      const now = performance.now();
      const delta = ((now - lastTimeRef.current) / 1000) * speedRef.current;
      lastTimeRef.current = now;

      const looking = isLookingRef.current;
      const cur = stateRef.current;

      // Time multiplier based on stateThreshold setting (1..10, 5 = 1.0x)
      const thresholdScale = Math.max(0.2, thresholdRef.current / 5);

      // Determine Target Branch vs Current Branch
      const targetBranch = looking ? 'A' : 'B';
      const currentBranch = BRANCH_A_SET.has(cur) ? 'A' : 'B';

      // ── 1. CROSS-BRANCH SWITCHING (MAX RESPONSE TIME <= 1.0 SECOND) ────────
      if (targetBranch !== currentBranch) {
        // Debounce before switching branches on gaze change
        const branchDebounce = Math.max(0.5, delayRef.current);

        if (pendingBranchRef.current === targetBranch) {
          pendingBranchTimeRef.current += delta;
          if (pendingBranchTimeRef.current >= branchDebounce) {
            // GAZE DIRECTION CHANGED! Switch branch immediately and reset timers.
            if (targetBranch === 'A') {
              // LOOKING AT SCREEN → Returning to look after looking away shows SAD eyes with scolding!
              contactRef.current = 0;
              awayRef.current = 0;
              doTransition('sad');
            } else {
              // LOOKING AWAY → BRANCH B starts at IGNORED immediately
              awayRef.current = 0;
              contactRef.current = 0;
              doTransition('ignored');
            }
            pendingBranchRef.current = null;
            pendingBranchTimeRef.current = 0;
          }
        } else {
          pendingBranchRef.current = targetBranch;
          pendingBranchTimeRef.current = 0;
        }
      } else {
        // Gaze is consistent with current branch
        pendingBranchRef.current = null;
        pendingBranchTimeRef.current = 0;

        // ── 2. PROGRESSION WITHIN ACTIVE BRANCH ──────────────────────────────
        if (currentBranch === 'A') {
          // BRANCH A: User is continuously looking at the eyes
          awayRef.current = 0;
          contactRef.current += delta;
          const t = contactRef.current;

          let candidateState = 'sad';
          if (t >= 12.0 * thresholdScale) {
            candidateState = 'peak_uncomfortable';
          } else if (t >= 8.0 * thresholdScale) {
            candidateState = 'very_uncomfortable';
          } else if (t >= 4.0 * thresholdScale) {
            candidateState = 'uncomfortable';
          } else {
            candidateState = 'sad';
          }

          if (candidateState !== cur) {
            doTransition(candidateState);
            if (candidateState === 'peak_uncomfortable') {
              peakPhaseRef.current = 'closed';
              peakTimerRef.current = 0;
              sneakEyeRef.current = Math.random() > 0.5 ? 'left' : 'right';
            }
          }
        } else {
          // BRANCH B: User is continuously looking away
          contactRef.current = 0;
          awayRef.current += delta;
          const t = awayRef.current;

          let candidateState = 'ignored';
          if (t >= 20.0 * thresholdScale) {
            candidateState = 'over_it';
          } else if (t >= 16.0 * thresholdScale) {
            candidateState = 'petty';
          } else if (t >= 12.0 * thresholdScale) {
            candidateState = 'offended';
          } else if (t >= 8.0 * thresholdScale) {
            candidateState = 'annoyed';
          } else if (t >= 4.0 * thresholdScale) {
            candidateState = 'mild_annoyance';
          } else {
            candidateState = 'ignored';
          }

          if (candidateState !== cur) {
            doTransition(candidateState);
          }
        }
      }

      // ── 3. PEAK UNCOMFORTABLE SNEAK-PEEK BEHAVIOR (MUST NOT CRY) ───────────
      if (stateRef.current === 'peak_uncomfortable') {
        peakTimerRef.current += delta;

        if (peakPhaseRef.current === 'closed') {
          // Both eyes fully closed
          if (peakTimerRef.current >= peakCoolRef.current) {
            // Open ONE eye for sneak peek
            peakPhaseRef.current = 'peeking';
            peakTimerRef.current = 0;
            sneakEyeRef.current = Math.random() > 0.5 ? 'left' : 'right';
          }
        } else if (peakPhaseRef.current === 'peeking') {
          // One eye peeking
          if (peakTimerRef.current >= peakDurRef.current) {
            // Close eye again and wait cooldown
            peakPhaseRef.current = 'closed';
            peakTimerRef.current = 0;
          }
        }
      }

      // ── 4. CALCULATE DISCOMFORT & TEAR LEVEL (0.0 to 1.0) ──────────────────
      // IMPORTANT: Peak uncomfortable MUST NOT CRY. Tears only in very_uncomfortable.
      let targetDiscomfort = 0;
      const intensityScale = discIntRef.current / 5;

      switch (stateRef.current) {
        case 'sad':
          // Mild glossy moisture sheen for hurt sad eyes
          targetDiscomfort = 0.25 * intensityScale;
          break;
        case 'uncomfortable':
          // Subtle eye moisture sheen, do NOT start crying yet
          targetDiscomfort = 0.40 * intensityScale;
          break;
        case 'very_uncomfortable':
          // High moisture + tears begin forming and falling
          targetDiscomfort = 0.85 * intensityScale;
          break;
        case 'peak_uncomfortable':
          // MUST NOT CRY! Extreme embarrassment/closed eyes only
          targetDiscomfort = 0.0;
          break;
        default:
          targetDiscomfort = 0.0;
          break;
      }

      // Smoothly interpolate discomfort level
      discomfortLevelRef.current += (targetDiscomfort - discomfortLevelRef.current) * 0.08;

      // Sync sneak peek runtime info to state
      setSneakPeekInfo({
        eye: stateRef.current === 'peak_uncomfortable' && peakPhaseRef.current === 'peeking' ? sneakEyeRef.current : null,
        phase: stateRef.current === 'peak_uncomfortable' ? peakPhaseRef.current : 'none',
        discomfortLevel: +discomfortLevelRef.current.toFixed(2),
      });

      // Update timers state
      setTimers({
        awayTime: +awayRef.current.toFixed(1),
        contactTime: +contactRef.current.toFixed(1),
      });

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => {
      startedRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [doTransition]);

  return {
    state,
    timers,
    transitions,
    forceState,
    setSpeed,
    // Debug & animation controls
    stateThreshold, setStateThreshold,
    transitionDelay, setTransitionDelay,
    eyeMovementSpeed, setEyeMovementSpeed,
    discomfortIntensity, setDiscomfortIntensity,
    sneakPeekDuration, setSneakPeekDuration,
    sneakPeekCooldown, setSneakPeekCooldown,
    sneakPeekInfo,
  };
}
