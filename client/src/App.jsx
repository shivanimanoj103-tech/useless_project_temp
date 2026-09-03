import { useState, useRef } from 'react';
import { useWebcam } from './hooks/useWebcam';
import { useGaze } from './hooks/useGaze';
import { useEyeState } from './hooks/useEyeState';
import { GooglyEyes } from './components/GooglyEyes';
import { VoiceEngine } from './components/VoiceEngine';
import { DebugPanel } from './components/DebugPanel';
import { Leaderboard } from './components/Leaderboard';

const STATE_META = {
  ignored: { label: 'I See You', msg: "Hey. You came back. No big deal. (It's a big deal.)", color: '#5b86e5' },
  mild_annoyance: { label: 'Mild Annoyance', msg: "Oh, is something else more interesting than me?", color: '#e8a838' },
  offended: { label: 'Offended', msg: "I'm starting to take this personally.", color: '#e84c3d' },
  petty: { label: 'Petty', msg: "Fine. Whatever. I've moved on. (I haven't.)", color: '#9b59b6' },
  over_it: { label: 'Over It', msg: "I have achieved emotional detachment. Goodbye forever.", color: '#7f8c8d' },
  uncomfortable: { label: 'UNCOMFORTABLE', msg: "OKAY. TOO MUCH. You can stop now. Please.", color: '#00d2ff' },
};

export default function App() {
  const [showDebug, setShowDebug] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [sessionSaved, setSessionSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Phase 1 — Webcam
  const { videoRef, isReady, error: camError, isLoading } = useWebcam();

  // Phase 2 — Gaze detection
  const {
    isLookingAtScreen, faceDetected, yawRatio, pitchRatio,
    status: gazeStatus, loadError,
    thresholds, setThresholds,
  } = useGaze(videoRef, isReady);

  // Phase 3 — Emotional state machine
  const { state, timers, transitions, forceState, setSpeed } = useEyeState(isLookingAtScreen);

  const meta = STATE_META[state] || STATE_META.ignored;
  const color = meta.color;

  // Track longest sustained contact across the session
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

  return (
    <div className="app">
      {/* Hidden webcam — tiny preview bottom-right */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="webcam-pip"
        aria-label="Webcam preview"
      />

      {/* Ambient colour glow that shifts with emotional state */}
      <div
        className="ambient-glow"
        style={{ background: `radial-gradient(ellipse at 50% 42%, ${color}1e 0%, transparent 68%)` }}
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
          {/* Googly eyes canvas */}
          <div className="eyes-wrap" style={{ '--eye-glow': color }}>
            <GooglyEyes state={state} />
          </div>

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
                : isLookingAtScreen
                  ? 'Eye contact ✓'
                  : 'Looking away'}
            </span>
          </div>
        </main>
      )}

      {/* ── Voice lines engine (headless) ── */}
      <VoiceEngine state={state} />

      {/* ── Debug panel (slide-in from right) ── */}
      {showDebug && (
        <DebugPanel
          gazeStatus={gazeStatus}
          faceDetected={faceDetected}
          isLookingAtScreen={isLookingAtScreen}
          yawRatio={yawRatio}
          pitchRatio={pitchRatio}
          thresholds={thresholds}
          onThresholdChange={setThresholds}
          state={state}
          timers={timers}
          transitions={transitions}
          forceState={forceState}
          setSpeed={setSpeed}
        />
      )}

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
