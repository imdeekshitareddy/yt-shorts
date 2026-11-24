// Clay World 2D layer (drawn over the 3D frame): captions, labels, thought bubbles.
// Softer, rounder look than Deep Dive — thicker outlines, warmer colours.
import { ctx } from './lib.js';
export const CAPLOOK = { size: 112, y: 1560, maxW: 940, fg: '#FFFFFF', hi: '#FFD43B', stroke: '#1A1A1E' };
/** caption: sentence case, white, thick dark outline, one yellow word. words = [{ txt, hi }] */
export function caption(words, x, y, sc = 1, look = CAPLOOK) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.font = `900 ${look.size}px Inter`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  const sp = look.size * 0.26, ws = words.map((w) => ctx.measureText(w.txt).width), tw = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let cx = -tw / 2;
  words.forEach((w, i) => { ctx.lineWidth = look.size * 0.18; ctx.strokeStyle = look.stroke; ctx.strokeText(w.txt, cx, 0); ctx.fillStyle = w.hi ? look.hi : look.fg; ctx.fillText(w.txt, cx, 0); cx += ws[i] + sp; });
  ctx.restore();
}
/** small floating label with a leader line */
export function label(text, x, y, tx, ty, sc = 1) {
  if (sc <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, sc);
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.beginPath(); ctx.arc(tx, ty, 9, 0, 7); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.translate(x, y); ctx.scale(sc, sc); ctx.font = '800 54px Inter'; const w = ctx.measureText(text).width + 50;
  ctx.fillStyle = 'rgba(20,18,28,0.82)'; ctx.beginPath(); ctx.roundRect(-w / 2, -44, w, 88, 44); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 3);
  ctx.restore();
}
/** rounded info pill */
export function pill(text, x, y, sc = 1, col = '#FFFFFF', bg = 'rgba(18,16,28,0.8)', size = 60) {
  if (sc <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.font = `900 ${size}px Inter`;
  const w = ctx.measureText(text).width + size * 1.2; ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-w / 2, -size * 0.85, w, size * 1.7, size * 0.85); ctx.fill();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, size * 0.06); ctx.restore();
}
/** thought bubble: rounded cloud shape */
export function thought(text, x, y, sc = 1) {
  if (sc <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, sc);
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = '#1A1A1E'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(0, 0, 210, 100, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-95, 110, 22, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-130, 148, 13, 0, 7); ctx.fill(); ctx.stroke();
  ctx.font = '900 56px Inter'; ctx.fillStyle = '#1A1A1E'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 3);
  ctx.restore();
}
/** exclamation marks (shock/surprise) above-right of head */
export function shockMarks(x, y, sc = 1) {
  if (sc <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, sc);
  ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.lineWidth = 15;
  const lines = [[-35, -35, -75, -105], [15, -55, 25, -135], [55, -20, 115, -65]];
  lines.forEach(([x1, y1, x2, y2]) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
  ctx.restore();
}
/** Zzz floating sleep letters */
export function sleepZzz(x, y, sc = 1, t = 0) {
  if (sc <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, sc);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const bob = Math.sin(t * 2) * 6;
  const drawZ = (ch, zx, zy, sz, a) => {
    ctx.globalAlpha = a; ctx.font = `900 ${sz}px Inter`; ctx.lineWidth = sz * 0.16;
    ctx.strokeStyle = '#1A1A1E'; ctx.strokeText(ch, zx, zy);
    ctx.fillStyle = '#FFF4D2'; ctx.fillText(ch, zx, zy);
  };
  drawZ('z', 34, -20 + bob, 60, 0.75);
  drawZ('z', 10, -70 + bob * 0.7, 74, 0.88);
  drawZ('Z', -18, -130 + bob * 0.5, 92, 1.0);
  ctx.restore();
}
/** warning sign - supports warning(x, y, s) or warning(text, x, y, s) */
export function warning(x, y, s, optS) {
  let text = null;
  if (typeof x === 'string') {
    text = x;
    x = typeof y === 'number' ? y : 540;
    y = typeof s === 'number' ? s : 320;
    s = optS !== undefined ? optS : 1;
  }
  if (!s || s <= 0 || isNaN(s)) return;
  if (s > 5) s = 1.0; // clamp scale: prevents accidental pixel coordinate (e.g. 320) from blowing out canvas
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.moveTo(0, -130); ctx.lineTo(140, 110); ctx.lineTo(-140, 110); ctx.closePath(); ctx.lineJoin = 'round'; ctx.lineWidth = 40; ctx.strokeStyle = '#D62839'; ctx.stroke(); ctx.fillStyle = '#D62839'; ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(-14, -60, 28, 110, 14); ctx.fill(); ctx.beginPath(); ctx.arc(0, 82, 17, 0, 7); ctx.fill(); ctx.restore();
  if (text) {
    pill(text, x, y + 140 * Math.min(1, s), Math.min(1, s) * 0.85, '#FFFFFF', '#D62839');
  }
}
/** fade/darken edges (sleepy effect) */
export function drowsy(k) { if (k <= 0) return; const g = ctx.createRadialGradient(540, 860, 250 * (1 - k), 540, 960, 1200 * (1 - k * 0.5)); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,15,30,${Math.min(1, k * 1.2)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920); if (k > 0.8) { ctx.fillStyle = `rgba(10,5,15,${(k - 0.8) * 5})`; ctx.fillRect(0, 0, 1080, 1920); } }

/** soft rounded whisper / speech bubble in Clay World outline style */
export function whisperBubble(text, x, y, sc = 1, tint = '#EEF3FF', tailDir = -1) {
  if (sc <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, sc);
  ctx.font = '900 54px Inter'; const tw = Math.max(320, ctx.measureText(text).width + 110);
  ctx.fillStyle = tint; ctx.strokeStyle = '#1A1A1E'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.roundRect(-tw / 2, -66, tw, 132, 66); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(tailDir * (tw * 0.24), 80, 18, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(tailDir * (tw * 0.30), 114, 11, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1A1A1E'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 4);
  ctx.restore();
}

/** pulsing sound/voice arcs radiating from an off-screen doorway */
export function voiceWaves(x, y, sc = 1, t = 0, dir = 1) {
  if (sc <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(sc * dir, sc);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 1.4 + i * 0.33) % 1);
    const r = 48 + ph * 145;
    ctx.globalAlpha = Math.max(0, (1 - ph * 0.85) * sc);
    ctx.strokeStyle = '#1A1A1E'; ctx.lineWidth = 22 - ph * 6;
    ctx.beginPath(); ctx.arc(0, 0, r, -0.62, 0.62); ctx.stroke();
    ctx.strokeStyle = '#FFE4B5'; ctx.lineWidth = 12 - ph * 4;
    ctx.beginPath(); ctx.arc(0, 0, r, -0.62, 0.62); ctx.stroke();
  }
  ctx.restore();
}

