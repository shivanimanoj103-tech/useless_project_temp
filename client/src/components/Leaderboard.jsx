import { useEffect, useState } from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

function fmt(s) {
  if (!s || s <= 0) return '—';
  if (s < 60) return `${(+s).toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`;
}

export function Leaderboard({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('needy_leaderboard');
      const data = raw ? JSON.parse(raw) : [];
      data.sort((a, b) => (b.longestEyeContact || 0) - (a.longestEyeContact || 0));
      setEntries(data.slice(0, 10));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleClear() {
    if (window.confirm('Clear all leaderboard scores?')) {
      localStorage.removeItem('needy_leaderboard');
      setEntries([]);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} id="leaderboard-modal">
        <div className="modal-head">
          <h2 className="modal-title">🏆 Leaderboard</h2>
          <button className="modal-close" id="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="modal-sub">Longest sustained eye contact</p>

        {loading && <p className="lb-msg">Loading…</p>}

        {error && (
          <p className="lb-msg lb-msg--error">
            ⚠️ {error}
          </p>
        )}

        {!loading && !error && entries.length === 0 && (
          <p className="lb-msg">No sessions yet — be the first! 👀</p>
        )}

        {!loading && !error && entries.map((e, i) => (
          <div key={i} className={`lb-entry ${i < 3 ? `lb-entry--rank${i + 1}` : ''}`}>
            <span className="lb-medal">{MEDALS[i] ?? `#${i + 1}`}</span>
            <span className="lb-name">{e.name}</span>
            <span className="lb-score">{fmt(e.longestEyeContact)}</span>
          </div>
        ))}

        {entries.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button className="btn-ghost" style={{ fontSize: '0.8rem', opacity: 0.7 }} onClick={handleClear}>
              🗑️ Clear Leaderboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

