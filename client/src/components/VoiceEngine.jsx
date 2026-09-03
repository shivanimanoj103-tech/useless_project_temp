import { useEffect, useRef } from 'react';

/**
 * Headless Voice & Subtitle Engine supporting English & Malayalam Text-to-Speech (TTS)
 */
export function VoiceEngine({
  state,
  dialogues = [],
  language = 'en',
  speechEnabled = true,
  speechRate = 0.9,
  speechPitch = 1.0,
  speechVolume = 1.0,
  selectedVoiceURI = '',
  dialogueCooldown = 6,
  onSubtitleChange,
}) {
  const lastSpokenRef = useRef(0);
  const prevStateRef = useRef(state);
  const currentUtteranceRef = useRef(null);

  /** Pick active enabled dialogue matching state */
  function getActiveDialogue(targetState) {
    if (!dialogues || dialogues.length === 0) return null;
    const available = dialogues.filter((d) => d.enabled && d.state === targetState);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  function speak(text, targetLang) {
    if (!text) return;

    if (onSubtitleChange) {
      onSubtitleChange({ text, isSpeaking: true, language: targetLang });
    }

    if (!window.speechSynthesis || !speechEnabled) return;

    const now = Date.now();
    const cooldownMs = dialogueCooldown * 1000;
    if (now - lastSpokenRef.current < cooldownMs && lastSpokenRef.current !== 0) {
      return;
    }

    // Cancel any previous speech to avoid overlapping audio
    window.speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = speechRate;
    utt.pitch = speechPitch;
    utt.volume = speechVolume;

    // Load available browser voices
    const voices = window.speechSynthesis.getVoices() || [];
    let chosenVoice = null;

    if (selectedVoiceURI) {
      chosenVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    }

    if (!chosenVoice) {
      if (targetLang === 'ml') {
        // Look for Malayalam voice (ml-IN)
        chosenVoice = voices.find(
          (v) => v.lang.toLowerCase().includes('ml') || v.name.toLowerCase().includes('malayalam')
        );
        if (!chosenVoice) {
          console.warn('[VoiceEngine] ⚠️ Malayalam (ml-IN) TTS voice not available in browser. Text displayed as subtitle.');
        }
      } else {
        // Look for English voice (en-US, en-GB, etc.)
        chosenVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      }
    }

    if (chosenVoice) {
      utt.voice = chosenVoice;
      utt.lang = chosenVoice.lang;
    }

    utt.onend = () => {
      if (onSubtitleChange) {
        onSubtitleChange({ text, isSpeaking: false, language: targetLang });
      }
    };

    utt.onerror = (e) => {
      console.warn('[VoiceEngine] SpeechSynthesis error:', e);
      if (onSubtitleChange) {
        onSubtitleChange({ text, isSpeaking: false, language: targetLang });
      }
    };

    currentUtteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
    lastSpokenRef.current = now;
  }

  // Trigger dialogue speech ONCE on emotional state change
  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;

    const dlg = getActiveDialogue(state);
    if (!dlg) return;

    const textToSpeak = language === 'ml' ? (dlg.malayalam || dlg.english) : (dlg.english || dlg.malayalam);

    // Speak after brief delay so state transition settles
    const timer = setTimeout(() => {
      speak(textToSpeak, language);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, language, dialogues, speechEnabled]);

  // Cleanup speech synthesis on unmount
  useEffect(() => () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return null; // Headless component
}
