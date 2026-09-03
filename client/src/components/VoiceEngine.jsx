import { useEffect, useRef } from 'react';

/**
 * Headless Voice Engine for Text-to-Speech (TTS)
 */
export function VoiceEngine({
  state,
  dialogues = [],
  language = 'en',
  speechEnabled = true,
  speechRate = 0.9,
  speechPitch = 1.0,
  speechVolume = 70, // 0 to 100%
  selectedVoiceURI = '',
  dialogueCooldown = 6,
  testVoiceTrigger = 0,
  onSubtitleChange,
}) {
  const lastSpokenRef = useRef(0);
  const prevStateRef = useRef(state);
  const testTriggerRef = useRef(testVoiceTrigger);

  /** Pick active enabled dialogue matching state */
  function getActiveDialogue(targetState) {
    if (!dialogues || dialogues.length === 0) return null;
    const available = dialogues.filter((d) => d.enabled && d.state === targetState);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  function speakText(text, targetLang, isTest = false, isTransition = false) {
    if (!text) return;

    if (onSubtitleChange) {
      onSubtitleChange({ text, isSpeaking: true, language: targetLang });
    }

    if (!window.speechSynthesis || (!speechEnabled && !isTest)) return;

    const now = Date.now();
    const cooldownMs = dialogueCooldown * 1000;
    // Apply cooldown ONLY for repetitive periodic speech within the same state, NOT for state transitions or tests
    if (!isTest && !isTransition && now - lastSpokenRef.current < cooldownMs && lastSpokenRef.current !== 0) {
      return;
    }

    // 1. Cancel previous speech immediately to prevent overlapping or stale sentences
    window.speechSynthesis.cancel();

    // 2. Create ONE new utterance
    const utt = new SpeechSynthesisUtterance(text);

    // 3. Map Volume 0–100% → 0.0–1.0
    const normVolume = Math.max(0, Math.min(1, (speechVolume ?? 70) / 100));
    utt.volume = normVolume;

    // 4. Apply Pitch & Rate
    utt.rate = Math.max(0.5, Math.min(2.0, speechRate || 0.9));
    utt.pitch = Math.max(0.5, Math.min(1.5, speechPitch || 1.0));

    // 5. Apply Voice & Language
    const voices = window.speechSynthesis.getVoices() || [];
    let chosenVoice = null;

    if (selectedVoiceURI) {
      chosenVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    }

    if (!chosenVoice) {
      if (targetLang === 'ml') {
        chosenVoice = voices.find(
          (v) => v.lang.toLowerCase().includes('ml') || v.name.toLowerCase().includes('malayalam')
        );
      } else {
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

    // 6. Speak
    window.speechSynthesis.speak(utt);
    lastSpokenRef.current = now;
  }

  // Handle "Test Voice" trigger
  useEffect(() => {
    if (testVoiceTrigger === testTriggerRef.current || testVoiceTrigger === 0) return;
    testTriggerRef.current = testVoiceTrigger;

    const testText =
      language === 'ml'
        ? "ഹലോ! ഇത് വൈകാരിക സംഭാഷണ സംവിധാനത്തിന്റെ ഒരു പരീക്ഷണമാണ്."
        : "Hello! This is a test of the emotional voice system.";

    speakText(testText, language, true, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testVoiceTrigger]);

  // Trigger dialogue speech ONCE on emotional state transition
  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;

    // Cancel old speech immediately whenever state changes!
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const dlg = getActiveDialogue(state);
    if (!dlg) {
      if (onSubtitleChange) {
        onSubtitleChange({ text: '', isSpeaking: false, language });
      }
      return;
    }

    const textToSpeak = language === 'ml' ? (dlg.malayalam || dlg.english) : (dlg.english || dlg.malayalam);

    // Immediately display corresponding subtitle
    if (onSubtitleChange) {
      onSubtitleChange({ text: textToSpeak, isSpeaking: true, language });
    }

    const timer = setTimeout(() => {
      speakText(textToSpeak, language, false, true);
    }, 120);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, language, dialogues, speechEnabled]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return null;
}
