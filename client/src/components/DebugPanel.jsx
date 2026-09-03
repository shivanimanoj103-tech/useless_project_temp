import { useState, useEffect } from 'react';

const ALL_STATES_BRANCH_A = [
  'sad',
  'uncomfortable',
  'very_uncomfortable',
  'peak_uncomfortable',
];

const ALL_STATES_BRANCH_B = [
  'ignored',
  'mild_annoyance',
  'annoyed',
  'offended',
  'petty',
  'over_it',
];

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

export function DebugPanel({
  theme = 'default', setTheme,
  gazeStatus, faceDetected, isLookingAtScreen, isEyesClosed, avgEAR, yawRatio, pitchRatio,
  thresholds, onThresholdChange,
  state, timers, transitions,
  forceState, setSpeed,
  onClose,
  // State Machine Controls
  stateThreshold, setStateThreshold,
  transitionDelay, setTransitionDelay,
  eyeMovementSpeed, setEyeMovementSpeed,
  discomfortIntensity, setDiscomfortIntensity,
  sneakPeekDuration, setSneakPeekDuration,
  sneakPeekCooldown, setSneakPeekCooldown,
  sneakPeekInfo,
  // Realistic Tears Settings
  tearSettings, setTearSettings, onResetTearPosition,
  // Background Gradient Settings
  bgSettings, setBgSettings,
  // Black Blur Depth Settings
  blurSettings, setBlurSettings,
  // Dialogue & TTS Settings
  dialogueSettings, setDialogueSettings,
  dialogues, setDialogues,
  onOpenAddDialogueModal,
  onEditDialogue,
  onDeleteDialogue,
  onTriggerTestVoice,
}) {
  const [speed, setSpeedLocal] = useState(1);
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    function loadVoices() {
      if (window.speechSynthesis) {
        setAvailableVoices(window.speechSynthesis.getVoices() || []);
      }
    }
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  function handleSpeed(v) {
    setSpeedLocal(v);
    setSpeed(v);
  }

  return (
    <aside className="debug-panel" id="debug-panel">
      {/* Header */}
      <div className="db-header">
        <h3 className="db-title">🔧 Debug Panel</h3>
        <button className="db-close-btn" onClick={onClose} aria-label="Close Debug Panel">
          ✖ Close
        </button>
      </div>

      {/* ── Visual Theme ── */}
      {setTheme && (
        <section className="db-section">
          <h4 className="db-heading">Visual Theme</h4>
          <Row label="Theme Selection">
            <div className="db-lang-toggle">
              <button
                className={`db-force-btn ${theme === 'default' ? 'db-force-btn--active' : ''}`}
                onClick={() => setTheme('default')}
              >
                Default
              </button>
              <button
                className={`db-force-btn ${theme === 'neon-void' ? 'db-force-btn--active' : ''}`}
                onClick={() => setTheme('neon-void')}
              >
                🌌 Neon Void
              </button>
            </div>
          </Row>
        </section>
      )}

      {/* ── Gaze & Eye Aspect Ratio (EAR) Telemetry ── */}
      <section className="db-section">
        <h4 className="db-heading">Gaze & Eye Closure Telemetry</h4>
        <Row label="Model status">
          <span className={`db-badge db-badge--${gazeStatus}`}>{gazeStatus}</span>
        </Row>
        <Row label="Face detected"><Pill val={faceDetected} /></Row>
        <Row label="Eyes Closed Detection">
          <span className={isEyesClosed ? 'db-pill db-pill--false' : 'db-pill db-pill--true'}>
            {isEyesClosed ? 'Closed 🙈' : 'Open 👀'}
          </span>
        </Row>
        <Row label="isLookingAtScreen"><Pill val={isLookingAtScreen} /></Row>
        <Row label="Avg EAR (Eye Aspect Ratio)">
          <span>{avgEAR !== undefined ? avgEAR : 'N/A'} &nbsp;<span className="db-muted">(T: &lt;{thresholds.ear || 0.18})</span></span>
        </Row>
        <Row label="Yaw ratio">
          {yawRatio} &nbsp;<span className="db-muted">(±{thresholds.yaw})</span>
        </Row>
        <Row label="Pitch ratio">
          {pitchRatio} &nbsp;<span className="db-muted">([{thresholds.pitchMin}–{thresholds.pitchMax}])</span>
        </Row>

        <h5 className="db-sub">Eye Closure & Gaze Threshold Tuning</h5>
        <Slider label={`EAR Closure Threshold: ${thresholds.ear || 0.18}`} min={0.10} max={0.30} step={0.01}
          value={thresholds.ear || 0.18}
          onChange={(v) => onThresholdChange((t) => ({ ...t, ear: v }))} />
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

      {/* ── 1. REALISTIC TEARS & ORIGIN CONTROLS ── */}
      <section className="db-section">
        <h4 className="db-heading">Realistic Tears & Duct Origin</h4>
        <Slider
          label={`Tear Intensity: ${tearSettings.tearIntensity.toFixed(2)}`}
          min={0.0} max={1.0} step={0.05}
          value={tearSettings.tearIntensity}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, tearIntensity: v }))}
        />
        <Slider
          label={`Tear Formation Speed: ${tearSettings.tearFormationSpeed.toFixed(1)}x`}
          min={0.5} max={2.0} step={0.1}
          value={tearSettings.tearFormationSpeed}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, tearFormationSpeed: v }))}
        />
        <Slider
          label={`Tear Flow Speed: ${tearSettings.tearFlowSpeed.toFixed(1)}x`}
          min={0.5} max={2.0} step={0.1}
          value={tearSettings.tearFlowSpeed}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, tearFlowSpeed: v }))}
        />
        <Slider
          label={`Tear Size: ${tearSettings.tearSize.toFixed(1)}x`}
          min={1.0} max={3.0} step={0.1}
          value={tearSettings.tearSize}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, tearSize: v }))}
        />
        <Slider
          label={`Tear Gravity: ${tearSettings.tearGravity.toFixed(1)}x`}
          min={0.5} max={2.0} step={0.1}
          value={tearSettings.tearGravity}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, tearGravity: v }))}
        />
        <Slider
          label={`Tear Opacity: ${tearSettings.tearOpacity.toFixed(2)}`}
          min={0.1} max={1.0} step={0.05}
          value={tearSettings.tearOpacity}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, tearOpacity: v }))}
        />
        <Slider
          label={`Tear Detachment: ${tearSettings.tearDetachment.toFixed(2)}`}
          min={0.0} max={1.0} step={0.05}
          value={tearSettings.tearDetachment}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, tearDetachment: v }))}
        />
        <Slider
          label={`Eye Wetness Sheen: ${tearSettings.eyeWetness.toFixed(2)}`}
          min={0.0} max={1.0} step={0.05}
          value={tearSettings.eyeWetness}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, eyeWetness: v }))}
        />

        <h5 className="db-sub">Tear Duct Origin Offsets</h5>
        <Slider
          label={`Origin X Offset: ${tearSettings.originX}px`}
          min={-30} max={30} step={1}
          value={tearSettings.originX}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, originX: v }))}
        />
        <Slider
          label={`Origin Y Offset: ${tearSettings.originY}px`}
          min={-30} max={30} step={1}
          value={tearSettings.originY}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, originY: v }))}
        />
        <Slider
          label={`Origin Z Scale: ${tearSettings.originZ.toFixed(2)}`}
          min={0.5} max={2.0} step={0.05}
          value={tearSettings.originZ}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, originZ: v }))}
        />

        <button
          className="btn-ghost db-add-dlg-btn"
          onClick={onResetTearPosition}
          style={{ marginTop: '6px' }}
        >
          🔄 Reset Tear Position
        </button>
      </section>

      {/* ── 2. BACKGROUND GRADIENT ── */}
      <section className="db-section">
        <h4 className="db-heading">Background Gradient</h4>
        <Row label="Emotion Gradient">
          <button
            className={`db-force-btn ${bgSettings.bgGradientEnabled ? 'db-force-btn--active' : ''}`}
            onClick={() => setBgSettings((prev) => ({ ...prev, bgGradientEnabled: !prev.bgGradientEnabled }))}
          >
            {bgSettings.bgGradientEnabled ? 'ON' : 'OFF'}
          </button>
        </Row>
        <Slider
          label={`Gradient Intensity: ${bgSettings.bgGradientIntensity.toFixed(2)}`}
          min={0.1} max={1.0} step={0.05}
          value={bgSettings.bgGradientIntensity}
          onChange={(v) => setBgSettings((prev) => ({ ...prev, bgGradientIntensity: v }))}
        />
        <Slider
          label={`Transition Speed: ${bgSettings.bgTransitionSpeed.toFixed(1)}x`}
          min={0.5} max={3.0} step={0.1}
          value={bgSettings.bgTransitionSpeed}
          onChange={(v) => setBgSettings((prev) => ({ ...prev, bgTransitionSpeed: v }))}
        />
      </section>

      {/* ── 3. BLACK BLUR DEPTH EFFECT ── */}
      <section className="db-section">
        <h4 className="db-heading">Eye Depth Black Blur</h4>
        <Slider
          label={`Blur Intensity: ${blurSettings.blurIntensity.toFixed(2)}`}
          min={0.0} max={1.0} step={0.05}
          value={blurSettings.blurIntensity}
          onChange={(v) => setBlurSettings((prev) => ({ ...prev, blurIntensity: v }))}
        />
        <Slider
          label={`Blur Size: ${blurSettings.blurSize}px`}
          min={100} max={400} step={10}
          value={blurSettings.blurSize}
          onChange={(v) => setBlurSettings((prev) => ({ ...prev, blurSize: v }))}
        />
        <Slider
          label={`Blur Opacity: ${blurSettings.blurOpacity.toFixed(2)}`}
          min={0.0} max={1.0} step={0.05}
          value={blurSettings.blurOpacity}
          onChange={(v) => setBlurSettings((prev) => ({ ...prev, blurOpacity: v }))}
        />
      </section>

      {/* ── 4. EMOTIONAL DIALOGUE & SPEECH CONTROLS ── */}
      <section className="db-section">
        <h4 className="db-heading">Emotional Dialogue & TTS</h4>
        <button
          className="btn-primary db-add-dlg-btn"
          onClick={onOpenAddDialogueModal}
        >
          💬 + Add Emotional Dialog
        </button>

        {/* Language Selection Buttons */}
        <Row label="Language">
          <div className="db-lang-toggle">
            <button
              className={`db-force-btn ${dialogueSettings.language === 'en' ? 'db-force-btn--active' : ''}`}
              onClick={() => setDialogueSettings((prev) => ({ ...prev, language: 'en' }))}
            >
              English
            </button>
            <button
              className={`db-force-btn ${dialogueSettings.language === 'ml' ? 'db-force-btn--active' : ''}`}
              onClick={() => setDialogueSettings((prev) => ({ ...prev, language: 'ml' }))}
            >
              മലയാളം
            </button>
          </div>
        </Row>

        <Row label="Auto Read">
          <button
            className={`db-force-btn ${dialogueSettings.speechEnabled ? 'db-force-btn--active' : ''}`}
            onClick={() => setDialogueSettings((prev) => ({ ...prev, speechEnabled: !prev.speechEnabled }))}
          >
            {dialogueSettings.speechEnabled ? 'ON' : 'OFF'}
          </button>
        </Row>

        <Row label="Show Subtitles">
          <button
            className={`db-force-btn ${dialogueSettings.showSubtitles ? 'db-force-btn--active' : ''}`}
            onClick={() => setDialogueSettings((prev) => ({ ...prev, showSubtitles: !prev.showSubtitles }))}
          >
            {dialogueSettings.showSubtitles ? 'ON' : 'OFF'}
          </button>
        </Row>

        <h5 className="db-sub">Voice Selection</h5>
        <select
          value={dialogueSettings.selectedVoiceURI}
          onChange={(e) => setDialogueSettings((prev) => ({ ...prev, selectedVoiceURI: e.target.value }))}
          className="db-select db-select--full"
        >
          <option value="">Default System Voice</option>
          {availableVoices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>

        {/* Volume Slider (0 - 100%) */}
        <Slider
          label={`Volume: ${dialogueSettings.speechVolume}%`}
          min={0} max={100} step={1}
          value={dialogueSettings.speechVolume}
          onChange={(v) => setDialogueSettings((prev) => ({ ...prev, speechVolume: v }))}
        />

        <Slider
          label={`Speech Rate: ${dialogueSettings.speechRate.toFixed(1)}x`}
          min={0.5} max={2.0} step={0.1}
          value={dialogueSettings.speechRate}
          onChange={(v) => setDialogueSettings((prev) => ({ ...prev, speechRate: v }))}
        />
        <Slider
          label={`Speech Pitch: ${dialogueSettings.speechPitch.toFixed(1)}`}
          min={0.5} max={1.5} step={0.1}
          value={dialogueSettings.speechPitch}
          onChange={(v) => setDialogueSettings((prev) => ({ ...prev, speechPitch: v }))}
        />

        {/* Test Voice Button */}
        <button
          className="btn-primary db-add-dlg-btn"
          onClick={onTriggerTestVoice}
          style={{ marginTop: '8px', background: 'linear-gradient(135deg, #2ecc71, #27ae60)' }}
        >
          🔊 Test Voice
        </button>

        {/* Dialogue Bank List */}
        <h5 className="db-sub">Dialogue Bank ({dialogues.length})</h5>
        <div className="db-dlg-list">
          {dialogues.map((d) => (
            <div key={d.id} className="db-dlg-item">
              <div className="db-dlg-header">
                <span className="db-badge">{d.state}</span>
                <span className="db-dlg-actions">
                  <button onClick={() => onEditDialogue(d)} title="Edit">✏️</button>
                  <button onClick={() => onDeleteDialogue(d.id)} title="Delete">🗑️</button>
                </span>
              </div>
              <p className="db-dlg-text">🇬🇧 {d.english}</p>
              <p className="db-dlg-text db-dlg-text--ml">🇮🇳 {d.malayalam}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. STATE MACHINE CONTROLS ── */}
      <section className="db-section">
        <h4 className="db-heading">State Machine Controls</h4>
        <Row label="Current state">
          <span className="db-badge">{state.replace(/_/g, ' ')}</span>
        </Row>

        <Slider label={`State Threshold: ${stateThreshold}`} min={1} max={10} step={1}
          value={stateThreshold} onChange={setStateThreshold} />
        <Slider label={`⚡ Response Speed / Gaze Delay: ${transitionDelay.toFixed(1)}s`} min={0.1} max={3.0} step={0.1}
          value={transitionDelay} onChange={setTransitionDelay} />
        <Slider label={`Eye Movement Speed: ${eyeMovementSpeed.toFixed(2)}`} min={0.02} max={0.20} step={0.01}
          value={eyeMovementSpeed} onChange={setEyeMovementSpeed} />
        <Slider label={`Discomfort Intensity: ${discomfortIntensity}`} min={1} max={10} step={1}
          value={discomfortIntensity} onChange={setDiscomfortIntensity} />
        <Slider label={`Sneak-Peek Duration: ${sneakPeekDuration}s`} min={0.5} max={3.0} step={0.1}
          value={sneakPeekDuration} onChange={setSneakPeekDuration} />
        <Slider label={`Sneak-Peek Cooldown: ${sneakPeekCooldown}s`} min={1.0} max={6.0} step={0.5}
          value={sneakPeekCooldown} onChange={setSneakPeekCooldown} />
        <Slider label={`Timer Speed: ×${speed}`} min={1} max={20} step={1}
          value={speed} onChange={handleSpeed} />

        <h5 className="db-sub">Branch A: Looking at Eyes</h5>
        <div className="db-force-grid">
          {ALL_STATES_BRANCH_A.map((s) => (
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

        <h5 className="db-sub" style={{ marginTop: '10px' }}>Branch B: Looking Away</h5>
        <div className="db-force-grid">
          {ALL_STATES_BRANCH_B.map((s) => (
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
    </aside>
  );
}
