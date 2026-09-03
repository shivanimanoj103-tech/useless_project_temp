import { useEffect, useRef } from 'react';

// Background color matching --bg in index.css for realistic eyelid masks
const BG = '#0d0618';

/**
 * Visual configuration per emotional state.
 * Includes eyelid top/bottom ratios, pupil size, iris hue, wander distance, and lerp speed.
 */
const STATE_CONFIGS = {
  friendly: { lidT: 0.05, lidB: 0.38, pupR: 0.44, hue: '#4ade80', wander: 0.15, lerpSpd: 0.06, dartEvery: 120 },
  ignored: { lidT: 0.08, lidB: 0.04, pupR: 0.42, hue: '#5b86e5', wander: 0.20, lerpSpd: 0.05, dartEvery: 90 },
  mild_annoyance: { lidT: 0.25, lidB: 0.05, pupR: 0.40, hue: '#f59e0b', wander: 0.28, lerpSpd: 0.05, dartEvery: 80 },
  annoyed: { lidT: 0.40, lidB: 0.06, pupR: 0.38, hue: '#f97316', wander: 0.35, lerpSpd: 0.06, dartEvery: 65 },
  offended: { lidT: 0.55, lidB: 0.06, pupR: 0.36, hue: '#ef4444', wander: 0.45, lerpSpd: 0.06, dartEvery: 50 },
  petty: { lidT: 0.68, lidB: 0.06, pupR: 0.32, hue: '#a855f7', wander: 0.55, lerpSpd: 0.05, dartEvery: 100 },
  over_it: { lidT: 0.82, lidB: 0.04, pupR: 0.28, hue: '#64748b', wander: 0.60, lerpSpd: 0.04, dartEvery: 120 },
  uncomfortable: { lidT: 0.15, lidB: 0.10, pupR: 0.25, hue: '#06b6d4', wander: 0.35, lerpSpd: 0.08, dartEvery: 45 },
  very_uncomfortable: { lidT: 0.30, lidB: 0.20, pupR: 0.22, hue: '#0284c7', wander: 0.40, lerpSpd: 0.09, dartEvery: 35 },
  peak_uncomfortable: { lidT: 1.00, lidB: 1.00, pupR: 0.20, hue: '#38bdf8', wander: 0.25, lerpSpd: 0.10, dartEvery: 30 },
};

// ── Math & Color Helpers ────────────────────────────────────────────────────
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

// ── Draw lower eyelid moisture gloss sheen ─────────────────────────────────
function drawEyeMoisture(ctx, cx, cy, R, wetnessLevel) {
  if (wetnessLevel <= 0.05) return;
  ctx.save();
  ctx.globalAlpha = Math.min(0.85, wetnessLevel * 0.7);

  // Gloss arc along bottom eyelid contour
  ctx.beginPath();
  ctx.arc(cx, cy + R * 0.3, R * 0.72, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = Math.max(1.5, R * 0.04 * wetnessLevel);
  ctx.shadowColor = 'rgba(186, 230, 253, 0.8)';
  ctx.shadowBlur = 8;
  ctx.stroke();

  ctx.restore();
}

// ── Draw one eye ───────────────────────────────────────────────────────────
function drawEye(ctx, cx, cy, R, { lidT, lidB, pupR, hue, px, py, blink, wetness }) {
  ctx.save();

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 7;

  // Sclera (3D radial gradient sphere)
  const sg = ctx.createRadialGradient(cx - R * 0.22, cy - R * 0.22, 0, cx, cy, R);
  sg.addColorStop(0, '#ffffff');
  sg.addColorStop(0.7, '#f0f0f0');
  sg.addColorStop(1, '#d5d5d5');
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Clip content inside sclera
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Pupil & Iris position
  const epx = cx + px * R * 0.44;
  const epy = cy + py * R * 0.44;
  const iR = R * pupR * 1.55; // Iris radius
  const pR = R * pupR;        // Pupil radius

  // Iris gradient
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

  // Specular reflections
  ctx.beginPath();
  ctx.arc(epx - pR * 0.3, epy - pR * 0.35, pR * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(epx + pR * 0.18, epy + pR * 0.2, pR * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();

  // Eyelid Masks
  const topLid = Math.min(1.0, lidT + Math.max(0, blink));
  if (topLid > 0.003) {
    ctx.fillStyle = BG;
    ctx.fillRect(cx - R - 4, cy - R - 4, (R + 4) * 2, topLid * 2 * R + 4);
  }
  if (lidB > 0.003) {
    ctx.fillStyle = BG;
    ctx.fillRect(cx - R - 4, cy + R - lidB * 2 * R, (R + 4) * 2, lidB * 2 * R + 4);
  }

  ctx.restore(); // end clip

  // Eye Moisture Sheen
  drawEyeMoisture(ctx, cx, cy, R, wetness);

  // Outer googly rim
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

// ── Render Realistic Liquid Tear Droplets ──────────────────────────────────
function renderRealisticTears(ctx, tears, discomfortLevel, tearSettings) {
  if (!tears || tears.length === 0) return;

  const flowSpd = tearSettings.tearFlowSpeed || 1.0;

  for (let i = tears.length - 1; i >= 0; i--) {
    const t = tears[i];

    if (t.phase === 'forming') {
      // Stage A: Accumulating tear at eye corner
      t.size = lerp(t.size, t.maxSize, 0.05 * (tearSettings.tearFormationSpeed || 1.0));
      t.accumTime += 0.016;
      t.alpha = Math.min(0.9, t.accumTime * 2);

      if (t.size >= t.maxSize * 0.9) {
        t.phase = 'flowing';
      }
    } else if (t.phase === 'flowing') {
      // Stage B: Flowing down following curved facial path
      t.pathProgress += 0.008 * flowSpd;
      t.wobble += 0.08;
      const wobbleX = Math.sin(t.wobble) * 1.5;

      t.x = t.startX + wobbleX;
      t.y = t.startY + t.pathProgress * 120;
      t.elongation = 1.0 + t.pathProgress * 0.8;

      // Stage D: Detach into falling drop
      if (t.pathProgress >= 0.7 && Math.random() < (tearSettings.tearDropProb || 0.5) * 0.05) {
        t.phase = 'falling';
        t.vy = 2.0;
      }
    } else if (t.phase === 'falling') {
      // Stage D: Free falling detached drop
      t.y += t.vy;
      t.vy += 0.22; // gravity
      t.alpha -= 0.02;
      t.elongation = lerp(t.elongation, 1.4, 0.1);
    }

    if (t.y > ctx.canvas.height || t.alpha <= 0) {
      tears.splice(i, 1);
      continue;
    }

    // Render realistic fluid tear graphics
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.alpha * Math.min(1, discomfortLevel * 1.2));

    const rx = t.size;
    const ry = t.size * (t.elongation || 1.0);

    // Subtle drop shadow behind liquid drop
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Fluid Teardrop Body (Bezier shape)
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - ry);
    ctx.bezierCurveTo(t.x + rx * 1.3, t.y, t.x + rx * 1.2, t.y + ry, t.x, t.y + ry);
    ctx.bezierCurveTo(t.x - rx * 1.2, t.y + ry, t.x - rx * 1.3, t.y, t.x, t.y - ry);

    // Glassy transparent gradient (clear fluid with light refraction)
    const tg = ctx.createLinearGradient(t.x - rx, t.y - ry, t.x + rx, t.y + ry);
    tg.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    tg.addColorStop(0.3, 'rgba(224, 242, 254, 0.35)');
    tg.addColorStop(0.8, 'rgba(186, 230, 253, 0.45)');
    tg.addColorStop(1, 'rgba(255, 255, 255, 0.8)');

    ctx.fillStyle = tg;
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Surface tension meniscus outline
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.stroke();

    // Glossy Specular Highlight (3D Curved sheen)
    ctx.beginPath();
    ctx.ellipse(t.x - rx * 0.35, t.y - ry * 0.35, rx * 0.3, ry * 0.25, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();

    ctx.restore();
  }
}

// ── GooglyEyes Component ────────────────────────────────────────────────────
export function GooglyEyes({
  state,
  eyeMovementSpeed = 0.08,
  sneakPeekInfo,
  tearSettings = { tearIntensity: 0.6, tearFormationSpeed: 1.0, tearFlowSpeed: 1.0, tearDropProb: 0.5, eyeWetness: 0.6 }
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const stateRef = useRef(state);
  const speedRef = useRef(eyeMovementSpeed);
  const sneakRef = useRef(sneakPeekInfo);
  const tearSetRef = useRef(tearSettings);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { speedRef.current = eyeMovementSpeed; }, [eyeMovementSpeed]);
  useEffect(() => { sneakRef.current = sneakPeekInfo; }, [sneakPeekInfo]);
  useEffect(() => { tearSetRef.current = tearSettings; }, [tearSettings]);

  const A = useRef({
    lpx: 0, lpy: 0, lvx: 0, lvy: 0,
    rpx: 0, rpy: 0, rvx: 0, rvy: 0,
    tx: 0, ty: 0,
    lidT: 0.08, lidB: 0.04, pupR: 0.42,
    blink: 0, blinking: false, blinkTimer: 0, nextBlink: 200,
    frame: 0,
    tears: [],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    function render() {
      const a = A.current;
      const curState = stateRef.current;
      const cfg = STATE_CONFIGS[curState] || STATE_CONFIGS.ignored;
      const sneak = sneakRef.current || {};
      const tSet = tearSetRef.current || {};
      const spdMultiplier = speedRef.current || 0.08;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Eye geometry
      const R = Math.min(w * 0.20, h * 0.34, 128);
      const ey = h * 0.52;
      const lx = w / 2 - R * 1.38;
      const rx = w / 2 + R * 1.38;

      // Smoothly lerp visual params toward state target
      a.lidT = lerp(a.lidT, cfg.lidT, cfg.lerpSpd);
      a.lidB = lerp(a.lidB, cfg.lidB, cfg.lerpSpd);
      a.pupR = lerp(a.pupR, cfg.pupR, cfg.lerpSpd);

      // ── Synchronized Natural Pupil Movement ───────────────────────────
      a.frame++;
      if (a.frame % cfg.dartEvery === 0) {
        const w_ = cfg.wander;

        if (curState === 'petty' || curState === 'over_it') {
          a.tx = -w_ * 0.75;
          a.ty = -0.30;
        } else if (curState === 'uncomfortable' || curState === 'very_uncomfortable') {
          const side = Math.random() > 0.5 ? 1 : -1;
          a.tx = side * (0.15 + Math.random() * 0.25);
          a.ty = (Math.random() - 0.5) * 0.20;
        } else if (curState === 'friendly') {
          a.tx = (Math.random() - 0.5) * 0.10;
          a.ty = -0.12;
        } else {
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.random() * w_ * 0.65;
          a.tx = Math.cos(ang) * dist;
          a.ty = Math.sin(ang) * dist * 0.7;
        }
      }

      // Synchronized micro-jitter
      const ltx = a.tx + (Math.random() - 0.5) * 0.02;
      const lty = a.ty + (Math.random() - 0.5) * 0.02;
      const rtx = a.tx + (Math.random() - 0.5) * 0.02;
      const rty = a.ty + (Math.random() - 0.5) * 0.02;

      // Spring physics interpolation
      const sp = spdMultiplier, dp = 0.78;
      a.lvx += (ltx - a.lpx) * sp; a.lvy += (lty - a.lpy) * sp;
      a.lvx *= dp; a.lvy *= dp;
      a.lpx += a.lvx; a.lpy += a.lvy;

      a.rvx += (rtx - a.rpx) * sp; a.rvy += (rty - a.rpy) * sp;
      a.rvx *= dp; a.rvy *= dp;
      a.rpx += a.rvx; a.rpy += a.rvy;

      // Blinking
      if (curState !== 'peak_uncomfortable') {
        a.blinkTimer++;
        if (!a.blinking && a.blinkTimer >= a.nextBlink) {
          a.blinking = true;
          a.blinkTimer = 0;
          a.nextBlink = 160 + Math.random() * 300;
        }
        if (a.blinking) {
          a.blink = Math.sin((a.blinkTimer / 16) * Math.PI) * 0.55;
          if (a.blinkTimer >= 16) { a.blinking = false; a.blink = 0; }
        }
      } else {
        a.blink = 0;
      }

      // Eyelids & Sneak Peek
      let leftLidT = a.lidT, rightLidT = a.lidT;
      let leftLidB = a.lidB, rightLidB = a.lidB;

      if (curState === 'peak_uncomfortable') {
        if (sneak.eye === 'left') {
          leftLidT = 0.35; leftLidB = 0.15;
          rightLidT = 1.0; rightLidB = 1.0;
        } else if (sneak.eye === 'right') {
          leftLidT = 1.0; leftLidB = 1.0;
          rightLidT = 0.35; rightLidB = 0.15;
        } else {
          leftLidT = 1.0; leftLidB = 1.0;
          rightLidT = 1.0; rightLidB = 1.0;
        }
      }

      const discomfort = sneak.discomfortLevel || 0;
      const wetness = (tSet.eyeWetness || 0.6) * discomfort;

      // Render Left & Right Eyes
      drawEye(ctx, lx, ey, R, { lidT: leftLidT, lidB: leftLidB, pupR: a.pupR, blink: a.blink, hue: cfg.hue, px: a.lpx, py: a.lpy, wetness });
      drawEye(ctx, rx, ey, R, { lidT: rightLidT, lidB: rightLidB, pupR: a.pupR, blink: a.blink, hue: cfg.hue, px: a.rpx, py: a.rpy, wetness });

      // ── Realistic Tear Formation & Flow ────────────────────────────────
      const intensity = tSet.tearIntensity || 0.6;
      if (discomfort > 0.15 && Math.random() < 0.08 * discomfort * intensity) {
        const eyeChoice = Math.random() > 0.5 ? 'left' : 'right';
        const eyeX = eyeChoice === 'left' ? lx : rx;
        // Corner of eye start
        const startX = eyeX + (Math.random() > 0.5 ? R * 0.4 : -R * 0.4);
        const startY = ey + R * 0.65;

        a.tears.push({
          eye: eyeChoice,
          phase: 'forming',
          startX, startY,
          x: startX, y: startY,
          size: 1.2,
          maxSize: 3.5 + Math.random() * 2.5,
          accumTime: 0,
          pathProgress: 0,
          wobble: Math.random() * Math.PI * 2,
          alpha: 0.1,
          elongation: 1.0,
          vy: 0,
        });
      }

      renderRealisticTears(ctx, a.tears, discomfort, tSet);

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
