import { useState } from 'react';

const ALL_STATES = [
  'sad',
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

export function DialogueModal({ isOpen, onClose, onSave, editingDialogue }) {
  const [state, setState] = useState(editingDialogue?.state || 'sad');
  const [english, setEnglish] = useState(editingDialogue?.english || '');
  const [malayalam, setMalayalam] = useState(editingDialogue?.malayalam || '');
  const [enabled, setEnabled] = useState(editingDialogue?.enabled ?? true);
  const [autoRead, setAutoRead] = useState(editingDialogue?.autoRead ?? true);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!english.trim() && !malayalam.trim()) return;

    onSave({
      id: editingDialogue?.id || `d-custom-${Date.now()}`,
      state,
      english: english.trim(),
      malayalam: malayalam.trim(),
      enabled,
      autoRead,
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal dialogue-modal">
        <div className="modal-head">
          <h3 className="modal-title">
            {editingDialogue ? '✏️ Edit Emotional Dialogue' : '💬 Add Emotional Dialogue'}
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✖
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dlg-form">
          <label className="dlg-label">
            <span>Emotional State</span>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="dlg-select"
            >
              {ALL_STATES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="dlg-label">
            <span>English Dialogue</span>
            <input
              type="text"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="e.g. Please... don't look at me."
              className="dlg-input"
              required
            />
          </label>

          <label className="dlg-label">
            <span>Malayalam Dialogue (മലയാളം)</span>
            <input
              type="text"
              value={malayalam}
              onChange={(e) => setMalayalam(e.target.value)}
              placeholder="ഉദാഹരണം: ദയവായി... എന്നെ നോക്കരുതേ."
              className="dlg-input"
              required
            />
          </label>

          <div className="dlg-checkbox-row">
            <label className="dlg-check">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>Enabled</span>
            </label>
            <label className="dlg-check">
              <input
                type="checkbox"
                checked={autoRead}
                onChange={(e) => setAutoRead(e.target.checked)}
              />
              <span>Auto-Read TTS</span>
            </label>
          </div>

          <div className="dlg-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              💾 Save Dialogue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
