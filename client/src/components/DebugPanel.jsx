import { useState } from 'react';

const ALL_STATES = ['ignored', 'mild_annoyance', 'offended', 'petty', 'over_it', 'uncomfortable'];

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
}) {
  const [speed, setSpeedLocal] = useState(1);

  function handleSpeed(v) {
    setSpeedLocal(v);
    setSpeed(v);
  }

  return (
    <aside className="debug-panel" id="debug-panel">
      <h3 className="db-title">🔧 Debug Panel</h3>

      {/* ── Gaze ── */}
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

        <h5 className="db-sub">Threshold tuning</h5>
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

      {/* ── State machine ── */}
      <section className="db-section">
        <h4 className="db-heading">State Machine</h4>
        <Row label="Current state">
          <span className="db-badge">{state}</span>
        </Row>
        <Row label="Away timer"><span>{timers.awayTime}s</span></Row>
        <Row label="Contact timer"><span>{timers.contactTime}s</span></Row>

        <Slider label={`Speed ×${speed}`} min={1} max={20} step={1}
          value={speed} onChange={handleSpeed} />

        <h5 className="db-sub">Force state</h5>
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

      {/* ── Transition log ── */}
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
