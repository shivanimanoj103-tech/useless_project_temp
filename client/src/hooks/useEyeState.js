import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Base transition thresholds in seconds.
 * These base values are scaled dynamically by the user's `stateThreshold` setting.
 */
const BASE_TIMINGS = {
  // Away timings (seconds without eye contact)
  mild_annoyance: 4,
  annoyed: 9,
  offended: 16,
  petty: 28,
  over_it: 48,

  // Staring timings (sustained seconds of eye contact)
  uncomfortable_enter: 6,       // Normal uncomfortable
  very_uncomfortable_enter: 11, // High discomfort + tears start appearing
  peak_uncomfortable_enter: 16, // Peak uncomfortable (eyes close + sneak peek cycle)
};

function nowStr() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export function useEyeState(isLookingAtScreen) {
  const [state, setState] = useState('ignored');
  const [timers, setTimers] = useState({ awayTime: 0, contactTime: 0 });
  const [transitions, setTransitions] = useState([]);

  // ── Configurable debug parameters with natural defaults ────────────────────
  const [stateThreshold, setStateThreshold] = useState(5);        // Range 1-10 (higher = slower/more evidence required)
  const [transitionDelay, setTransitionDelay] = useState(1.5);    // Range 0.5-5s (debounce threshold before state change)
  const [eyeMovementSpeed, setEyeMovementSpeed] = useState(0.08);  // Range 0.02-0.20 (interpolation speed for pupils)
  const [discomfortIntensity, setDiscomfortIntensity] = useState(5); // Range 1-10 (intensity of uncomfortable reactions)
  const [sneakPeekDuration, setSneakPeekDuration] = useState(1.2);  // Range 0.5-3s (how long one-eye peek lasts)
  const [sneakPeekCooldown, setSneakPeekCooldown] = useState(3.0);  // Range 1-6s (delay between sneak peeks)

  // Sneak peek & tear runtime state exposed to renderer
  const [sneakPeekInfo, setSneakPeekInfo] = useState({
    eye: null,        // 'left' | 'right' | null
    phase: 'closed',  // 'closed' | 'peeking' | 'cooldown'
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

  // Debounce & state transition validation tracking
  const pendingStateRef = useRef(null);
  const pendingTimeRef = useRef(0);

  // Initial "Friendly" → "Shy" expression tracking
  const firstContactDoneRef = useRef(false);
  const friendlyTimerRef = useRef(0);
  const shyTimerRef = useRef(0);

  // Peak Uncomfortable state machine tracking
  const peakPhaseRef = useRef('closed'); // 'closed' | 'peeking' | 'cooldown'
  const peakTimerRef = useRef(0);
  const sneakEyeRef = useRef(null);
  const discomfortLevelRef = useRef(0);

  useEffect(() => { isLookingRef.current = isLookingAtScreen; }, [isLookingAtScreen]);

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
    awayRef.current = 0;
    contactRef.current = 0;
    pendingStateRef.current = null;
    pendingTimeRef.current = 0;
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

      // Calculate time multiplier based on stateThreshold setting (1..10, where 5 is default 1.0x multiplier)
      const thresholdScale = thresholdRef.current / 5;
      const effectiveDelay = delayRef.current * thresholdScale;

      // ── 1. Initial "Friendly" → "Shy" Eye Contact Reaction ──────────────
      if (looking && !firstContactDoneRef.current && cur !== 'shy') {
        if (cur !== 'friendly') {
          doTransition('friendly');
        }
        friendlyTimerRef.current += delta;
        if (friendlyTimerRef.current >= 3.5) {
          // Friendly greet done — slide into Shy mode
          doTransition('shy');
          shyTimerRef.current = 0;
        }
      } else if (cur === 'friendly') {
        // If user looks away during initial friendly state, skip shy → mild annoyance
        if (!looking) {
          firstContactDoneRef.current = true;
          doTransition('mild_annoyance');
        }
      } else if (cur === 'shy') {
        // Shy phase: eyes look away for 4 seconds then settle into ignored
        shyTimerRef.current += delta;
        if (shyTimerRef.current >= 4.0) {
          firstContactDoneRef.current = true;
          doTransition('ignored');
        }
        // If user looks away while we're shy, end shy early → mild annoyance
        if (!looking) {
          firstContactDoneRef.current = true;
          doTransition('mild_annoyance');
        }
      }

      // ── 2. Determine Candidate Next State ────────────────────────────────
      let candidateState = cur;

      if (cur !== 'friendly') {
        if (looking) {
          // User IS looking at screen
          awayRef.current = 0;
          contactRef.current += delta;

          if (cur === 'peak_uncomfortable') {
            // In Peak Uncomfortable mode — handle sneak peek sub-state machine
            candidateState = 'peak_uncomfortable';
          } else if (cur === 'very_uncomfortable') {
            if (contactRef.current >= BASE_TIMINGS.peak_uncomfortable_enter * thresholdScale) {
              candidateState = 'peak_uncomfortable';
            }
          } else if (cur === 'uncomfortable') {
            if (contactRef.current >= BASE_TIMINGS.very_uncomfortable_enter * thresholdScale) {
              candidateState = 'very_uncomfortable';
            }
          } else if (cur !== 'ignored') {
            // Eye contact forgives annoyance states back to ignored
            candidateState = 'ignored';
          } else if (contactRef.current >= BASE_TIMINGS.uncomfortable_enter * thresholdScale) {
            candidateState = 'uncomfortable';
          }
        } else {
          // User IS NOT looking at screen
          contactRef.current = 0;
          awayRef.current += delta;

          // Looking away forgives uncomfortable / peak uncomfortable states back to normal!
          if (cur === 'uncomfortable' || cur === 'very_uncomfortable' || cur === 'peak_uncomfortable') {
            candidateState = 'ignored';
          } else {
            // Progressively increase annoyance states based on time away
            if (awayRef.current >= BASE_TIMINGS.over_it * thresholdScale) candidateState = 'over_it';
            else if (awayRef.current >= BASE_TIMINGS.petty * thresholdScale) candidateState = 'petty';
            else if (awayRef.current >= BASE_TIMINGS.offended * thresholdScale) candidateState = 'offended';
            else if (awayRef.current >= BASE_TIMINGS.annoyed * thresholdScale) candidateState = 'annoyed';
            else if (awayRef.current >= BASE_TIMINGS.mild_annoyance * thresholdScale) candidateState = 'mild_annoyance';
          }
        }
      }

      // ── 3. Debounce & State Threshold Timing Verification ───────────────
      // Prevent rapid switching by requiring candidateState to be held consistently
      if (candidateState !== cur) {
        if (pendingStateRef.current === candidateState) {
          pendingTimeRef.current += delta;
          if (pendingTimeRef.current >= effectiveDelay) {
            doTransition(candidateState);
            pendingStateRef.current = null;
            pendingTimeRef.current = 0;
            if (candidateState === 'peak_uncomfortable') {
              peakPhaseRef.current = 'closed';
              peakTimerRef.current = 0;
              sneakEyeRef.current = Math.random() > 0.5 ? 'left' : 'right';
            }
          }
        } else {
          pendingStateRef.current = candidateState;
          pendingTimeRef.current = 0;
        }
      } else {
        pendingStateRef.current = null;
        pendingTimeRef.current = 0;
      }

      // ── 4. Peak Uncomfortable & One-Eye Sneak Peek Logic ────────────────
      if (stateRef.current === 'peak_uncomfortable') {
        peakTimerRef.current += delta;

        if (peakPhaseRef.current === 'closed') {
          // Phase A: Eyes fully closed because user is staring
          if (peakTimerRef.current >= peakCoolRef.current) {
            // Transition to Phase B: Sneak peek with ONE eye
            peakPhaseRef.current = 'peeking';
            peakTimerRef.current = 0;
            sneakEyeRef.current = Math.random() > 0.5 ? 'left' : 'right';
            console.log(`[Needy] 🙈 Sneak peek triggered with ${sneakEyeRef.current} eye`);
          }
        } else if (peakPhaseRef.current === 'peeking') {
          // Phase B: One-eye sneak peek active
          if (peakTimerRef.current >= peakDurRef.current) {
            // End of peek — check if user is STILL staring
            if (!isLookingRef.current) {
              // User stopped staring! Recover from peak uncomfortable!
              console.log('[Needy] 😌 User looked away during sneak peek! Recovering...');
              contactRef.current = 0;
              awayRef.current = 0;
              doTransition('ignored');
            } else {
              // User IS STILL STARING! Close eyes again & restart cooldown
              console.log('[Needy] 😳 User STILL staring! Closing eyes again...');
              peakPhaseRef.current = 'closed';
              peakTimerRef.current = 0;
            }
          }
        }
      }

      // ── 5. Calculate Tear & Discomfort Level (0.0 to 1.0) ───────────────
      let targetDiscomfort = 0;
      const intensityScale = discIntRef.current / 5;

      switch (stateRef.current) {
        case 'friendly': case 'shy': case 'ignored': targetDiscomfort = 0.0; break;
        case 'mild_annoyance': targetDiscomfort = 0.1 * intensityScale; break;
        case 'annoyed': targetDiscomfort = 0.35 * intensityScale; break;
        case 'offended': targetDiscomfort = 0.55 * intensityScale; break;
        case 'petty': targetDiscomfort = 0.65 * intensityScale; break;
        case 'over_it': targetDiscomfort = 0.40 * intensityScale; break;
        case 'uncomfortable': targetDiscomfort = 0.70 * intensityScale; break;
        case 'very_uncomfortable': targetDiscomfort = 0.90 * intensityScale; break;
        case 'peak_uncomfortable': targetDiscomfort = 1.00 * intensityScale; break;
        default: targetDiscomfort = 0.0;
      }

      // Smoothly interpolate discomfort level toward target
      discomfortLevelRef.current += (targetDiscomfort - discomfortLevelRef.current) * 0.05;

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
