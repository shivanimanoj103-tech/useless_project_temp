import { useEffect, useRef } from 'react';

// Must match --bg in index.css so eyelids "cut into" the sclera convincingly
const BG = '#0d0618';

// Per-state visual config
const S = {
  ignored: { lidT: 0.08, lidB: 0.04, pupR: 0.42, hue: '#5b86e5', wander: 0.22, lerpSpd: 0.05, dartEvery: 90 },
  mild_annoyance: { lidT: 0.35, lidB: 0.06, pupR: 0.40, hue: '#e8a838', wander: 0.38, lerpSpd: 0.07, dartEvery: 70 },
  offended: { lidT: 0.50, lidB: 0.05, pupR: 0.36, hue: '#e84c3d', wander: 0.52, lerpSpd: 0.09, dartEvery: 40 },
  petty: { lidT: 0.65, lidB: 0.06, pupR: 0.32, hue: '#9b59b6', wander: 0.65, lerpSpd: 0.05, dartEvery: 110 },
  over_it: { lidT: 0.80, lidB: 0.04, pupR: 0.28, hue: '#7f8c8d', wander: 0.72, lerpSpd: 0.04, dartEvery: 130 },
  uncomfortable: { lidT: 0.00, lidB: 0.00, pupR: 0.20, hue: '#00d2ff', wander: 0.90, lerpSpd: 0.20, dartEvery: 16 },
};

// ── Utilities ──────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

function hexParts(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function lighten(hex, amt) {
  const [r, g, b] = hexParts(hex);
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`;
}
function darken(hex, amt) {
  const [r, g, b] = hexParts(hex);
  return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`;
}

// ── Draw one eye ───────────────────────────────────────────────────────────
function drawEye(ctx, cx, cy, R, { lidT, lidB, pupR, hue, px, py, blink }) {
  ctx.save();

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 7;

  // Sclera (white ball with radial gradient for 3-D pop)
  const sg = ctx.createRadialGradient(cx - R * 0.22, cy - R * 0.22, 0, cx, cy, R);
  sg.addColorStop(0, '#ffffff');
  sg.addColorStop(0.7, '#f0f0f0');
  sg.addColorStop(1, '#d5d5d5');
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Clip everything inside the sclera circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Pupil position (offset within eye)
  const epx = cx + px * R * 0.48;
  const epy = cy + py * R * 0.48;
  const iR = R * pupR * 1.55;   // iris radius
  const pR = R * pupR;          // pupil radius

  // Iris
  const ig = ctx.createRadialGradient(epx - iR * 0.3, epy - iR * 0.3, 0, epx, epy, iR);
  ig.addColorStop(0, lighten(hue, 65));
  ig.addColorStop(0.45, hue);
  ig.addColorStop(1, darken(hue, 55));
  ctx.beginPath();
  ctx.arc(epx, epy, iR, 0, Math.PI * 2);
  ctx.fillStyle = ig;
  ctx.fill();

  // Iris texture spokes
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(epx, epy);
    ctx.arc(epx, epy, iR * 0.88, a, a + Math.PI / 12);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Pupil
  const pg = ctx.createRadialGradient(epx, epy, 0, epx, epy, pR);
  pg.addColorStop(0, '#1c1c1c');
  pg.addColorStop(1, '#000000');
  ctx.beginPath();
  ctx.arc(epx, epy, pR, 0, Math.PI * 2);
  ctx.fillStyle = pg;
  ctx.fill();

  // Primary specular highlight
  ctx.beginPath();
  ctx.arc(epx - pR * 0.3, epy - pR * 0.35, pR * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fill();

  // Secondary small highlight
  ctx.beginPath();
  ctx.arc(epx + pR * 0.18, epy + pR * 0.2, pR * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();

  // ── Eyelid masks (fill BG colour = gives "closing" illusion) ──
  const topLid = Math.min(1, lidT + Math.max(0, blink));
  if (topLid > 0.003) {
    ctx.fillStyle = BG;
    ctx.fillRect(cx - R - 2, cy - R - 2, (R + 2) * 2, topLid * 2 * R + 2);
  }
  if (lidB > 0.003) {
    ctx.fillStyle = BG;
    ctx.fillRect(cx - R - 2, cy + R - lidB * 2 * R, (R + 2) * 2, lidB * 2 * R + 2);
  }

  ctx.restore(); // end clip

  // Yellow googly rim
  ctx.beginPath();
  ctx.arc(cx, cy, R + 11, 0, Math.PI * 2);
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth = 18;
  ctx.stroke();

  // Rim specular shine arc
  ctx.beginPath();
  ctx.arc(cx, cy, R + 11, -Math.PI * 0.82, -Math.PI * 0.08);
  ctx.strokeStyle = 'rgba(255,248,140,0.72)';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Inner sclera border
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(210,210,210,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ── Component ──────────────────────────────────────────────────────────────
export function GooglyEyes({ state }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // All animation state lives in a ref — zero React re-renders in the loop
  const A = useRef({
    lpx: 0, lpy: 0, lvx: 0, lvy: 0, ltx: 0, lty: 0,   // left pupil spring
    rpx: 0, rpy: 0, rvx: 0, rvy: 0, rtx: 0, rty: 0,   // right pupil spring
    lidT: 0.08, lidB: 0.04, pupR: 0.42,                  // interpolated visual params
    blink: 0, blinking: false, blinkTimer: 0, nextBlink: 200,
    frame: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize observer keeps canvas pixel size in sync with CSS size
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    function render() {
      const a = A.current;
      const cfg = S[stateRef.current] || S.ignored;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Eye geometry — responsive to canvas size
      const R = Math.min(w * 0.20, h * 0.34, 128);
      const ey = h * 0.52;
      const lx = w / 2 - R * 1.38;
      const rx = w / 2 + R * 1.38;

      // Smoothly lerp visual params toward current state target
      a.lidT = lerp(a.lidT, cfg.lidT, cfg.lerpSpd);
      a.lidB = lerp(a.lidB, cfg.lidB, cfg.lerpSpd);
      a.pupR = lerp(a.pupR, cfg.pupR, cfg.lerpSpd);

      // Recalculate pupil targets every N frames
      a.frame++;
      if (a.frame % cfg.dartEvery === 0) {
        const w_ = cfg.wander;
        const cur = stateRef.current;

        if (cur === 'petty' || cur === 'over_it') {
          // Dramatic look-away
          a.ltx = -w_ * 0.88; a.lty = -0.42;
          a.rtx = w_ * 0.88; a.rty = -0.42;
        } else if (cur === 'uncomfortable') {
          // Rapid chaotic dart
          a.ltx = (Math.random() - 0.5) * 1.5;
          a.lty = (Math.random() - 0.5) * 1.5;
          a.rtx = (Math.random() - 0.5) * 1.5;
          a.rty = (Math.random() - 0.5) * 1.5;
        } else {
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.random() * w_;
          const ang2 = ang + (Math.random() - 0.5) * 0.9;
          const dst2 = Math.random() * w_;
          a.ltx = Math.cos(ang) * dist;
          a.lty = Math.sin(ang) * dist * 0.7;
          a.rtx = Math.cos(ang2) * dst2;
          a.rty = Math.sin(ang2) * dst2 * 0.7;
        }
      }

      // Spring physics for silky smooth pupil movement
      const sp = 0.09, dp = 0.78;
      a.lvx += (a.ltx - a.lpx) * sp; a.lvy += (a.lty - a.lpy) * sp;
      a.lvx *= dp; a.lvy *= dp;
      a.lpx += a.lvx; a.lpy += a.lvy;

      a.rvx += (a.rtx - a.rpx) * sp; a.rvy += (a.rty - a.rpy) * sp;
      a.rvx *= dp; a.rvy *= dp;
      a.rpx += a.rvx; a.rpy += a.rvy;

      // Blinking
      a.blinkTimer++;
      if (!a.blinking && a.blinkTimer >= a.nextBlink) {
        a.blinking = true;
        a.blinkTimer = 0;
        a.nextBlink = 140 + Math.random() * 320;
      }
      if (a.blinking) {
        a.blink = Math.sin((a.blinkTimer / 16) * Math.PI) * 0.55;
        if (a.blinkTimer >= 16) { a.blinking = false; a.blink = 0; }
      }

      const base = { lidT: a.lidT, lidB: a.lidB, pupR: a.pupR, blink: a.blink, hue: cfg.hue };
      drawEye(ctx, lx, ey, R, { ...base, px: a.lpx, py: a.lpy });
      drawEye(ctx, rx, ey, R, { ...base, px: a.rpx, py: a.rpy });

      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Animated googly eyes"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
