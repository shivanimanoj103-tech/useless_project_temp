import { useEffect, useRef } from 'react';
import { voiceLines } from '../data/voiceLines';

const COOLDOWN_MS = 8_000;   // minimum gap between any two spoken lines
const REPEAT_MS = 20_000;  // repeat a line if stuck in same state

function pickRandom(arr) {
  if (!arr?.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function VoiceEngine({ state }) {
  const lastSpokenRef = useRef(0);
  const prevStateRef = useRef(state);
  const repeatRef = useRef(null);

  function speak(text) {
    if (!window.speechSynthesis || !text) return;
    const now = Date.now();
    if (now - lastSpokenRef.current < COOLDOWN_MS) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.88;
    utt.pitch = 1.05;
    utt.volume = 1;
    window.speechSynthesis.speak(utt);
    lastSpokenRef.current = now;
  }

  // Trigger on state change
  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;

    // Clear old repeating timer
    if (repeatRef.current) clearInterval(repeatRef.current);

    // Speak after a short delay so it doesn't stack with prior line
    const delay = setTimeout(() => speak(pickRandom(voiceLines[state])), 900);

    // Keep reminding the user while they stay in this state
    repeatRef.current = setInterval(
      () => speak(pickRandom(voiceLines[state])),
      REPEAT_MS
    );

    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (repeatRef.current) clearInterval(repeatRef.current);
    window.speechSynthesis?.cancel();
  }, []);

  return null; // headless — no UI
}
