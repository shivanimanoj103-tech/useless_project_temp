import { useState } from 'react';

const ALL_STATES = [
  'friendly',
  'ignored',
  'mild_annoyance',
  'annoyed',
  'offended',
  'petty',
  'over_it',
  'uncomfortable',
  'very_uncomfortable',
  'peak_uncomfortable',
];

// ── Small sub-components ───────────────────────────────────────────────────
function Row({ label, children }) {
  return (
    <div className="db-row">
      <span className="db-label">{label}</span>
      <span className="db-value">{children}</span>
    </div>
  );
}

function Pill({ val }) {
  return <span className={val ? 'db-pill db-pill--true' : 'db-pill db-pill--false'}>{String(val)}</span>;
}

function Slider({ label, min, max, step, value, onChange }) {
  return (
    <label className="db-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}

// ── Main DebugPanel ────────────────────────────────────────────────────────
export function DebugPanel({
  gazeStatus, faceDetected, isLookingAtScreen, yawRatio, pitchRatio,
  thresholds, onThresholdChange,
  state, timers, transitions,
  forceState, setSpeed,
  onClose,
  // New State Threshold & Timing Controls
  stateThreshold, setStateThreshold,
  transitionDelay, setTransitionDelay,
  eyeMovementSpeed, setEyeMovementSpeed,
  discomfortIntensity, setDiscomfortIntensity,
  sneakPeekDuration, setSneakPeekDuration,
  sneakPeekCooldown, setSneakPeekCooldown,
  sneakPeekInfo,
}) {
  const [speed, setSpeedLocal] = useState(1);

  function handleSpeed(v) {
    setSpeedLocal(v);
    setSpeed(v);
  }

  return (
    <aside className="debug-panel" id="debug-panel">
      {/* Panel Header with Close Button */}
      <div className="db-header">
        <h3 className="db-title">🔧 Debug Panel</h3>
        <button
          className="db-close-btn"
          onClick={onClose}
          aria-label="Close Debug Panel"
          title="Close Debug Menu"
        >
          ✖ Close
        </button>
      </div>

      {/* ── Gaze Detection Telemetry ── */}
      <section className="db-section">
        <h4 className="db-heading">Gaze Detection</h4>
        <Row label="Model status">
          <span className={`db-badge db-badge--${gazeStatus}`}>{gazeStatus}</span>
        </Row>
        <Row label="Face detected"><Pill val={faceDetected} /></Row>
        <Row label="isLookingAtScreen"><Pill val={isLookingAtScreen} /></Row>
        <Row label="Yaw ratio">
          {yawRatio} &nbsp;<span className="db-muted">(±{thresholds.yaw})</span>
        </Row>
        <Row label="Pitch ratio">
          {pitchRatio} &nbsp;<span className="db-muted">([{thresholds.pitchMin}–{thresholds.pitchMax}])</span>
        </Row>

        <h5 className="db-sub">Threshold Tuning</h5>
        <Slider label={`Yaw ±${thresholds.yaw}`} min={0.05} max={0.7} step={0.05}
          value={thresholds.yaw}
          onChange={(v) => onThresholdChange((t) => ({ ...t, yaw: v }))} />
        <Slider label={`Pitch min ${thresholds.pitchMin}`} min={0.0} max={0.4} step={0.05}
          value={thresholds.pitchMin}
          onChange={(v) => onThresholdChange((t) => ({ ...t, pitchMin: v }))} />
        <Slider label={`Pitch max ${thresholds.pitchMax}`} min={0.5} max={1.0} step={0.05}
          value={thresholds.pitchMax}
          onChange={(v) => onThresholdChange((t) => ({ ...t, pitchMax: v }))} />
      </section>

      {/* ── State Machine & Progression Tuning ── */}
      <section className="db-section">
        <h4 className="db-heading">State Machine</h4>
        <Row label="Current state">
          <span className="db-badge">{state.replace(/_/g, ' ')}</span>
        </Row>
        <Row label="Away timer"><span>{timers.awayTime}s</span></Row>
        <Row label="Contact timer"><span>{timers.contactTime}s</span></Row>

        {/* State Machine Threshold & Timing Controls */}
        <h5 className="db-sub">State Threshold & Timing</h5>
        <Slider label={`State Threshold: ${stateThreshold} (Scale: ${(stateThreshold / 5).toFixed(1)}x)`}
          min={1} max={10} step={1}
          value={stateThreshold} onChange={setStateThreshold} />

        <Slider label={`Transition Delay: ${transitionDelay}s`}
          min={0.5} max={5.0} step={0.5}
          value={transitionDelay} onChange={setTransitionDelay} />

        <Slider label={`Eye Movement Speed: ${eyeMovementSpeed.toFixed(2)}`}
          min={0.02} max={0.20} step={0.01}
          value={eyeMovementSpeed} onChange={setEyeMovementSpeed} />

        <Slider label={`Discomfort Intensity: ${discomfortIntensity}`}
          min={1} max={10} step={1}
          value={discomfortIntensity} onChange={setDiscomfortIntensity} />

        <Slider label={`Sneak-Peek Duration: ${sneakPeekDuration}s`}
          min={0.5} max={3.0} step={0.1}
          value={sneakPeekDuration} onChange={setSneakPeekDuration} />

        <Slider label={`Sneak-Peek Cooldown: ${sneakPeekCooldown}s`}
          min={1.0} max={6.0} step={0.5}
          value={sneakPeekCooldown} onChange={setSneakPeekCooldown} />

        <Slider label={`Timer Speed: ×${speed}`} min={1} max={20} step={1}
          value={speed} onChange={handleSpeed} />

        {/* Sneak Peek & Discomfort Telemetry */}
        {sneakPeekInfo && (
          <div className="db-telemetry">
            <Row label="Discomfort / Tear Level">
              <span>{Math.round((sneakPeekInfo.discomfortLevel || 0) * 100)}%</span>
            </Row>
            {sneakPeekInfo.phase !== 'none' && (
              <Row label="Sneak Peek Sub-State">
                <span className="db-badge">{sneakPeekInfo.phase} ({sneakPeekInfo.eye || 'both closed'})</span>
              </Row>
            )}
          </div>
        )}

        <h5 className="db-sub">Force State</h5>
        <div className="db-force-grid">
          {ALL_STATES.map((s) => (
            <button
              key={s}
              id={`force-${s}`}
              className={`db-force-btn${state === s ? ' db-force-btn--active' : ''}`}
              onClick={() => forceState(s)}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </section>

      {/* ── Transition Log ── */}
      <section className="db-section">
        <h4 className="db-heading">Transitions ({transitions.length})</h4>
        <div className="db-log">
          {transitions.length === 0 && (
            <p className="db-log-empty">No transitions yet.</p>
          )}
          {[...transitions].reverse().map((t, i) => (
            <div key={i} className="db-log-row">
              <span className="db-log-time">{t.timeStr}</span>
              <span className="db-log-from">{t.from}</span>
              <span className="db-log-arrow">→</span>
              <span className="db-log-to">{t.to}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
