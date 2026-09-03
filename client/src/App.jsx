import { useState, useRef, useEffect } from 'react';
import { useWebcam } from './hooks/useWebcam';
import { useGaze } from './hooks/useGaze';
import { useEyeState } from './hooks/useEyeState';
import { GooglyEyes } from './components/GooglyEyes';
import { VoiceEngine } from './components/VoiceEngine';
import { DebugPanel } from './components/DebugPanel';
import { Leaderboard } from './components/Leaderboard';
import { DialogueModal } from './components/DialogueModal';
import { defaultDialogues } from './data/voiceLines';

// Comprehensive emotional state metadata
const STATE_META = {
  friendly: { label: 'HAPPY TO SEE YOU', msg: "Yay! You're back! I love attention!", color: '#4ade80' },
  ignored: { label: 'I See You', msg: "Hey. You came back. No big deal. (It's a big deal.)", color: '#5b86e5' },
  mild_annoyance: { label: 'Mild Annoyance', msg: "Oh, is something else more interesting than me?", color: '#f59e0b' },
  annoyed: { label: 'Annoyed', msg: "Seriously? Still looking away? I am right here.", color: '#f97316' },
  offended: { label: 'Offended', msg: "I'm starting to take this personally.", color: '#ef4444' },
  petty: { label: 'Petty', msg: "Fine. Whatever. I've moved on. (I haven't.)", color: '#a855f7' },
  over_it: { label: 'Over It', msg: "I have achieved emotional detachment. Goodbye forever.", color: '#64748b' },
  uncomfortable: { label: 'UNCOMFORTABLE', msg: "OKAY. TOO MUCH. You can stop now. Please.", color: '#06b6d4' },
  very_uncomfortable: { label: 'VERY UNCOMFORTABLE 💧', msg: "WHY ARE YOU STILL STARING?! I am getting teary-eyed!", color: '#0284c7' },
  peak_uncomfortable: { label: 'PEAK UNCOMFORTABLE 🙈', msg: "EYES CLOSED! Peeking with one eye... PLEASE STOP STARING!", color: '#38bdf8' },
};

// Emotion-responsive background gradient color map
const EMOTION_GRADIENTS = {
  friendly: { c1: '#10b981', c2: '#06b6d4' },
  ignored: { c1: '#3b82f6', c2: '#0f172a' },
  mild_annoyance: { c1: '#f59e0b', c2: '#78350f' },
  annoyed: { c1: '#f97316', c2: '#b91c1c' },
  offended: { c1: '#ef4444', c2: '#581c87' },
  petty: { c1: '#a855f7', c2: '#be185d' },
  over_it: { c1: '#4c1d95', c2: '#1e293b' },
  uncomfortable: { c1: '#f43f5e', c2: '#4c1d95' },
  very_uncomfortable: { c1: '#c026d3', c2: '#991b1b' },
  peak_uncomfortable: { c1: '#7f1d1d', c2: '#090514' },
};

const DEFAULT_TEAR_SETTINGS = {
  tearIntensity: 0.6,
  tearFormationSpeed: 1.0,
  tearFlowSpeed: 1.0,
  tearSize: 1.5,
  tearGravity: 1.0,
  tearOpacity: 0.85,
  tearDetachment: 0.5,
  originX: 0,
  originY: 0,
  originZ: 1.0,
  eyeWetness: 0.6,
};

const DEFAULT_DIALOGUE_SETTINGS = {
  language: 'en',
  speechEnabled: true,
  speechRate: 0.9,
  speechPitch: 1.0,
  speechVolume: 70, // 0 to 100%
  selectedVoiceURI: '',
  showSubtitles: true,
  dialogueCooldown: 6,
};

export default function App() {
  const [showDebug, setShowDebug] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [sessionSaved, setSessionSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [testVoiceTrigger, setTestVoiceTrigger] = useState(0);

  // ── Persistent Settings (LocalStorage) ───────────────────────────────────
  const [dialogues, setDialogues] = useState(() => {
    try {
      const raw = localStorage.getItem('needy_dialogues');
      return raw ? JSON.parse(raw) : defaultDialogues;
    } catch (_) { return defaultDialogues; }
  });

  const [tearSettings, setTearSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('needy_tear_settings');
      return raw ? { ...DEFAULT_TEAR_SETTINGS, ...JSON.parse(raw) } : DEFAULT_TEAR_SETTINGS;
    } catch (_) { return DEFAULT_TEAR_SETTINGS; }
  });

  const [bgSettings, setBgSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('needy_bg_settings');
      return raw ? JSON.parse(raw) : { bgGradientEnabled: true, bgGradientIntensity: 0.65, bgTransitionSpeed: 1.0 };
    } catch (_) { return { bgGradientEnabled: true, bgGradientIntensity: 0.65, bgTransitionSpeed: 1.0 }; }
  });

  const [blurSettings, setBlurSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('needy_blur_settings');
      return raw ? JSON.parse(raw) : { blurIntensity: 0.5, blurSize: 250, blurOpacity: 0.6 };
    } catch (_) { return { blurIntensity: 0.5, blurSize: 250, blurOpacity: 0.6 }; }
  });

  const [dialogueSettings, setDialogueSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('needy_dialogue_settings');
      return raw ? { ...DEFAULT_DIALOGUE_SETTINGS, ...JSON.parse(raw) } : DEFAULT_DIALOGUE_SETTINGS;
    } catch (_) { return DEFAULT_DIALOGUE_SETTINGS; }
  });

  // Save settings to LocalStorage on update
  useEffect(() => { localStorage.setItem('needy_dialogues', JSON.stringify(dialogues)); }, [dialogues]);
  useEffect(() => { localStorage.setItem('needy_tear_settings', JSON.stringify(tearSettings)); }, [tearSettings]);
  useEffect(() => { localStorage.setItem('needy_bg_settings', JSON.stringify(bgSettings)); }, [bgSettings]);
  useEffect(() => { localStorage.setItem('needy_blur_settings', JSON.stringify(blurSettings)); }, [blurSettings]);
  useEffect(() => { localStorage.setItem('needy_dialogue_settings', JSON.stringify(dialogueSettings)); }, [dialogueSettings]);

  // Dialogue Modal State
  const [isDialogueModalOpen, setIsDialogueModalOpen] = useState(false);
  const [editingDialogue, setEditingDialogue] = useState(null);

  // Subtitle State
  const [subtitleData, setSubtitleData] = useState({ text: '', isSpeaking: false, language: 'en' });

  // Phase 1 — Webcam
  const { videoRef, isReady, error: camError, isLoading } = useWebcam();

  // Phase 2 — Gaze & Eye Closure detection
  const {
    isLookingAtScreen, faceDetected, isEyesClosed, avgEAR, yawRatio, pitchRatio,
    status: gazeStatus, loadError,
    thresholds, setThresholds,
  } = useGaze(videoRef, isReady);

  // Phase 3 — Emotional state machine
  const {
    state, timers, transitions, forceState, setSpeed,
    stateThreshold, setStateThreshold,
    transitionDelay, setTransitionDelay,
    eyeMovementSpeed, setEyeMovementSpeed,
    discomfortIntensity, setDiscomfortIntensity,
    sneakPeekDuration, setSneakPeekDuration,
    sneakPeekCooldown, setSneakPeekCooldown,
    sneakPeekInfo,
  } = useEyeState(isLookingAtScreen);

  const meta = STATE_META[state] || STATE_META.ignored;
  const color = meta.color;
  const bgTheme = EMOTION_GRADIENTS[state] || EMOTION_GRADIENTS.ignored;

  // Track longest eye contact duration
  const maxContactRef = useRef(0);
  if (timers.contactTime > maxContactRef.current) {
    maxContactRef.current = timers.contactTime;
  }

  function saveSession() {
    if (!playerName.trim() || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const raw = localStorage.getItem('needy_leaderboard');
      const entries = raw ? JSON.parse(raw) : [];
      const newEntry = {
        name: playerName.trim(),
        longestEyeContact: maxContactRef.current,
        createdAt: new Date().toISOString(),
      };
      entries.push(newEntry);
      entries.sort((a, b) => (b.longestEyeContact || 0) - (a.longestEyeContact || 0));
      localStorage.setItem('needy_leaderboard', JSON.stringify(entries.slice(0, 50)));
      setSessionSaved(true);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setIsSaving(false);
    }
  }

  // Dialogue Modal Handlers
  function handleSaveDialogue(newDlg) {
    setDialogues((prev) => {
      const idx = prev.findIndex((d) => d.id === newDlg.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newDlg;
        return copy;
      }
      return [...prev, newDlg];
    });
  }

  function handleDeleteDialogue(id) {
    setDialogues((prev) => prev.filter((d) => d.id !== id));
  }

  function handleResetTearPosition() {
    setTearSettings((prev) => ({
      ...prev,
      originX: 0,
      originY: 0,
      originZ: 1.0,
    }));
  }

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('needy_theme') || 'default';
    } catch (_) { return 'default'; }
  });

  useEffect(() => {
    localStorage.setItem('needy_theme', theme);
  }, [theme]);

  return (
    <div className="app" data-theme={theme}>
      {/* Hidden webcam preview */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="webcam-pip"
        aria-label="Webcam preview"
      />

      {/* Emotion-responsive Background Ambient Gradient */}
      <div
        className="ambient-glow"
        style={{
          background: bgSettings.bgGradientEnabled
            ? `radial-gradient(ellipse at 50% 40%, ${bgTheme.c1} 0%, ${bgTheme.c2} 55%, var(--bg) 95%)`
            : `radial-gradient(ellipse at 50% 42%, ${color}1e 0%, transparent 68%)`,
          opacity: bgSettings.bgGradientIntensity,
          transition: `background ${2.0 / bgSettings.bgTransitionSpeed}s ease, opacity 0.5s ease`,
        }}
      />

      {/* ── Header ── */}
      <header className="app-header">
        <h1 className="app-logo">NEEDY</h1>
        <div className="header-actions">
          {gazeStatus === 'loading' && !camError && (
            <span className="loading-pill">⏳ Loading face model…</span>
          )}
          {gazeStatus === 'error' && (
            <span className="loading-pill loading-pill--err" title={loadError}>
              ⚠️ Gaze model failed
            </span>
          )}
          <button
            id="theme-toggle"
            className="btn-ghost"
            onClick={() => setTheme((t) => (t === 'default' ? 'neon-void' : 'default'))}
            title="Toggle Visual Theme"
          >
            {theme === 'neon-void' ? '🌌 Neon Void' : '🎨 Default'}
          </button>
          <button
            id="debug-toggle"
            className="btn-ghost"
            onClick={() => setShowDebug((v) => !v)}
          >
            {showDebug ? '🔒 Hide Debug' : '🔧 Debug'}
          </button>
          <button
            id="leaderboard-btn"
            className="btn-ghost"
            onClick={() => setShowLeaderboard((v) => !v)}
          >
            🏆 Leaderboard
          </button>
        </div>
      </header>

      {/* ── Camera loading overlay ── */}
      {isLoading && (
        <div className="splash" aria-live="polite">
          <div className="spinner" />
          <p>Requesting camera access…</p>
        </div>
      )}

      {/* ── Camera error overlay ── */}
      {camError && (
        <div className="splash splash--error" role="alert">
          <span className="splash-icon">📵</span>
          <p>{camError}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {/* ── Main stage ── */}
      {!camError && !isLoading && (
        <main className="stage">
          {/* Eyes wrapper container with dark black depth blur behind eyes */}
          <div className="eyes-outer-container">
            <div
              className="eye-black-blur"
              style={{
                width: `${blurSettings.blurSize}px`,
                height: `${blurSettings.blurSize * 0.55}px`,
                filter: `blur(${Math.max(12, 40 * blurSettings.blurIntensity)}px)`,
                opacity: blurSettings.blurOpacity * (0.35 + 0.65 * (sneakPeekInfo?.discomfortLevel || 0.2)),
              }}
            />
            <div className="eyes-wrap" style={{ '--eye-glow': theme === 'neon-void' ? '#4fd8ff' : color }}>
              <GooglyEyes
                state={state}
                theme={theme}
                eyeMovementSpeed={eyeMovementSpeed}
                sneakPeekInfo={sneakPeekInfo}
                tearSettings={tearSettings}
              />
            </div>
          </div>

          {/* Subtitle Dialogue Bubble */}
          {dialogueSettings.showSubtitles && subtitleData.text && (
            <div className={`subtitle-bubble ${subtitleData.isSpeaking ? 'subtitle-bubble--active' : ''}`}>
              <span className="subtitle-text">{subtitleData.text}</span>
              <span className="subtitle-speaker">🔊</span>
            </div>
          )}

          {/* Emotional state label + message */}
          <div className="state-info">
            <div className="state-badge" style={{ color, borderColor: `${color}88` }}>
              {meta.label.toUpperCase()}
            </div>
            <p className="state-msg">{meta.msg}</p>
          </div>

          {/* Gaze status indicator */}
          <div className="gaze-row">
            <span className={`gaze-dot ${isLookingAtScreen ? 'gaze-dot--on' : 'gaze-dot--off'}`} />
            <span className="gaze-label">
              {!faceDetected
                ? 'No face detected'
                : isEyesClosed
                  ? 'Eyes closed 🙈'
                  : isLookingAtScreen
                    ? 'Eye contact ✓'
                    : 'Looking away'}
            </span>
          </div>
        </main>
      )}

      {/* ── Voice & Dialogue Speech Engine (Headless) ── */}
      <VoiceEngine
        state={state}
        dialogues={dialogues}
        language={dialogueSettings.language}
        speechEnabled={dialogueSettings.speechEnabled}
        speechRate={dialogueSettings.speechRate}
        speechPitch={dialogueSettings.speechPitch}
        speechVolume={dialogueSettings.speechVolume}
        selectedVoiceURI={dialogueSettings.selectedVoiceURI}
        dialogueCooldown={dialogueSettings.dialogueCooldown}
        testVoiceTrigger={testVoiceTrigger}
        onSubtitleChange={setSubtitleData}
      />

      {/* ── Debug Panel ── */}
      {showDebug && (
        <DebugPanel
          theme={theme}
          setTheme={setTheme}
          gazeStatus={gazeStatus}
          faceDetected={faceDetected}
          isLookingAtScreen={isLookingAtScreen}
          isEyesClosed={isEyesClosed}
          avgEAR={avgEAR}
          yawRatio={yawRatio}
          pitchRatio={pitchRatio}
          thresholds={thresholds}
          onThresholdChange={setThresholds}
          state={state}
          timers={timers}
          transitions={transitions}
          forceState={forceState}
          setSpeed={setSpeed}
          onClose={() => setShowDebug(false)}
          stateThreshold={stateThreshold}
          setStateThreshold={setStateThreshold}
          transitionDelay={transitionDelay}
          setTransitionDelay={setTransitionDelay}
          eyeMovementSpeed={eyeMovementSpeed}
          setEyeMovementSpeed={setEyeMovementSpeed}
          discomfortIntensity={discomfortIntensity}
          setDiscomfortIntensity={setDiscomfortIntensity}
          sneakPeekDuration={sneakPeekDuration}
          setSneakPeekDuration={setSneakPeekDuration}
          sneakPeekCooldown={sneakPeekCooldown}
          setSneakPeekCooldown={setSneakPeekCooldown}
          sneakPeekInfo={sneakPeekInfo}
          tearSettings={tearSettings}
          setTearSettings={setTearSettings}
          onResetTearPosition={handleResetTearPosition}
          bgSettings={bgSettings}
          setBgSettings={setBgSettings}
          blurSettings={blurSettings}
          setBlurSettings={setBlurSettings}
          dialogueSettings={dialogueSettings}
          setDialogueSettings={setDialogueSettings}
          dialogues={dialogues}
          setDialogues={setDialogues}
          onOpenAddDialogueModal={() => { setEditingDialogue(null); setIsDialogueModalOpen(true); }}
          onEditDialogue={(dlg) => { setEditingDialogue(dlg); setIsDialogueModalOpen(true); }}
          onDeleteDialogue={handleDeleteDialogue}
          onTriggerTestVoice={() => setTestVoiceTrigger((v) => v + 1)}
        />
      )}

      {/* ── Dialogue Modal ── */}
      <DialogueModal
        isOpen={isDialogueModalOpen}
        onClose={() => setIsDialogueModalOpen(false)}
        onSave={handleSaveDialogue}
        editingDialogue={editingDialogue}
      />

      {/* ── Leaderboard modal ── */}
      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}

      {/* ── Save session bar ── */}
      {transitions.length > 0 && !sessionSaved && !camError && (
        <div className="save-bar">
          <span className="save-label">Save to leaderboard</span>
          <input
            id="player-name-input"
            type="text"
            className="save-input"
            placeholder="Your name…"
            value={playerName}
            maxLength={32}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveSession()}
          />
          <button
            id="save-btn"
            className="btn-primary"
            disabled={!playerName.trim() || isSaving}
            onClick={saveSession}
          >
            {isSaving ? '…' : '💾 Save'}
          </button>
          {saveError && <span className="save-error">⚠️ {saveError}</span>}
        </div>
      )}

      {sessionSaved && (
        <div className="save-bar save-bar--done">
          ✅ Saved! Open the leaderboard to see your rank.
        </div>
      )}
    </div>
  );
}
