import { useState, useEffect } from 'react';

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
  gazeStatus, faceDetected, isLookingAtScreen, yawRatio, pitchRatio,
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
  tearSettings, setTearSettings,
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

      {/* ── 1. REALISTIC EYES ── */}
      <section className="db-section">
        <h4 className="db-heading">Realistic Tears & Moisture</h4>
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
          label={`Tear Drop Probability: ${tearSettings.tearDropProb.toFixed(2)}`}
          min={0.0} max={1.0} step={0.05}
          value={tearSettings.tearDropProb}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, tearDropProb: v }))}
        />
        <Slider
          label={`Eye Wetness Sheen: ${tearSettings.eyeWetness.toFixed(2)}`}
          min={0.0} max={1.0} step={0.05}
          value={tearSettings.eyeWetness}
          onChange={(v) => setTearSettings((prev) => ({ ...prev, eyeWetness: v }))}
        />
      </section>

      {/* ── 2. EMOTION BACKGROUND GRADIENT ── */}
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

      {/* ── 4. EMOTIONAL DIALOGUE & SPEECH ── */}
      <section className="db-section">
        <h4 className="db-heading">Emotional Dialogue & TTS</h4>
        <button
          className="btn-primary db-add-dlg-btn"
          onClick={onOpenAddDialogueModal}
        >
          💬 + Add Emotional Dialog
        </button>

        <Row label="Language">
          <select
            value={dialogueSettings.language}
            onChange={(e) => setDialogueSettings((prev) => ({ ...prev, language: e.target.value }))}
            className="db-select"
          >
            <option value="en">English (🇬🇧/🇺🇸)</option>
            <option value="ml">Malayalam (മലയാളം)</option>
          </select>
        </Row>

        <Row label="Speech TTS">
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

        <h5 className="db-sub">TTS Voice Selection</h5>
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
        <Slider
          label={`Speech Volume: ${dialogueSettings.speechVolume.toFixed(2)}`}
          min={0.0} max={1.0} step={0.05}
          value={dialogueSettings.speechVolume}
          onChange={(v) => setDialogueSettings((prev) => ({ ...prev, speechVolume: v }))}
        />
        <Slider
          label={`Dialogue Cooldown: ${dialogueSettings.dialogueCooldown}s`}
          min={1} max={15} step={1}
          value={dialogueSettings.dialogueCooldown}
          onChange={(v) => setDialogueSettings((prev) => ({ ...prev, dialogueCooldown: v }))}
        />

        {/* Dialogues Bank List */}
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
        <Slider label={`Transition Delay: ${transitionDelay}s`} min={0.5} max={5.0} step={0.5}
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
    </aside>
  );
}
