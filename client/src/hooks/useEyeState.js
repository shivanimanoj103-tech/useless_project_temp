import { useEffect, useRef, useState, useCallback } from 'react';

// Transition thresholds (seconds away from screen)
const T = {
  mild_annoyance: 3,
  offended: 8,
  petty: 20,
  over_it: 40,
  uncomfortable_enter: 5,    // sustained contact to trigger uncomfortable
  uncomfortable_linger: 2.5,  // auto-reset after this many seconds of uncomfortable
};

function nowStr() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export function useEyeState(isLookingAtScreen) {
  const [state, setState] = useState('ignored');
  const [timers, setTimers] = useState({ awayTime: 0, contactTime: 0 });
  const [transitions, setTransitions] = useState([]);

  // Refs — mutation without re-renders inside the RAF loop
  const stateRef = useRef('ignored');
  const awayRef = useRef(0);
  const contactRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animRef = useRef(null);
  const isLookingRef = useRef(isLookingAtScreen);
  const speedRef = useRef(1);
  const startedRef = useRef(false);

  useEffect(() => { isLookingRef.current = isLookingAtScreen; }, [isLookingAtScreen]);

  const doTransition = useCallback((newState) => {
    if (stateRef.current === newState) return;
    const t = {
      from: stateRef.current,
      to: newState,
      timeStr: nowStr(),
      timestamp: Date.now(),
    };
    console.log(`[Needy] 🔄 ${t.from} → ${t.to}`);
    stateRef.current = newState;
    setState(newState);
    setTransitions((prev) => [...prev.slice(-29), t]);
  }, []);

  /** Force a specific state (for debug panel) */
  const forceState = useCallback((newState) => {
    awayRef.current = 0;
    contactRef.current = 0;
    doTransition(newState);
  }, [doTransition]);

  /** Set timer speed multiplier (for debug panel) */
  const setSpeed = useCallback((s) => { speedRef.current = s; }, []);

  // ── Main RAF tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    function tick() {
      const now = performance.now();
      const delta = ((now - lastTimeRef.current) / 1000) * speedRef.current;
      lastTimeRef.current = now;

      const looking = isLookingRef.current;
      const cur = stateRef.current;

      if (cur === 'uncomfortable') {
        if (looking) {
          contactRef.current += delta;
          // Auto-reset to ignored after lingering in uncomfortable
          if (contactRef.current >= T.uncomfortable_linger) {
            contactRef.current = 0;
            awayRef.current = 0;
            doTransition('ignored');
          }
        } else {
          // User looked away — forgiven, reset
          contactRef.current = 0;
          doTransition('ignored');
        }
      } else if (looking) {
        // Looking at screen
        awayRef.current = 0;
        contactRef.current += delta;

        if (cur !== 'ignored') {
          // Forgiveness — eye contact resets annoyance immediately
          doTransition('ignored');
          contactRef.current = 0;
        } else if (contactRef.current >= T.uncomfortable_enter) {
          // Too much staring → uncomfortable
          contactRef.current = 0;
          doTransition('uncomfortable');
        }
      } else {
        // Not looking
        contactRef.current = 0;
        awayRef.current += delta;

        if (awayRef.current >= T.over_it) doTransition('over_it');
        else if (awayRef.current >= T.petty) doTransition('petty');
        else if (awayRef.current >= T.offended) doTransition('offended');
        else if (awayRef.current >= T.mild_annoyance) doTransition('mild_annoyance');
      }

      // Expose timer values to React state (throttled via RAF — ~60fps)
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

  return { state, timers, transitions, forceState, setSpeed };
}
