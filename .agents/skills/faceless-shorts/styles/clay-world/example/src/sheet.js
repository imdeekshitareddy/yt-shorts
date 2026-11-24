// The Clay World style sheet: every picture is a real render from the style's 3D engine.
import * as THREE from 'three';
import { ctx } from './core/lib.js';
import { startBoard, panel, frame, small, swatches, rules } from './core/board.js';
import { makeEngine, camera, lightRig } from './core/engine.js';
import { ClayHuman } from './core/human.js';
import * as SETS from './core/sets.js';
import { caption, thought, shockMarks } from './core/look2d.js';

await document.fonts.load('900 40px Inter'); await document.fonts.load('800 40px Inter');
const E = makeEngine(document.getElementById('gl')), E2 = makeEngine(document.getElementById('gl2'), { w: 1280, h: 860 });
const GL = document.getElementById('gl'), GL2 = document.getElementById('gl2');
const cam = camera(32);
const B = startBoard(document.getElementById('cv'), { title: 'CLAY WORLD 3D: VIDEO STYLE SHEET', bg: '#16171E', line: '#3E4254', head: '#F5EFE6', accent: '#FFD43B' });
const shot = (x, y, w, renderFn, over) => frame(x, y, w, () => { renderFn(); ctx.drawImage(GL, 0, 0); if (over) over(); });
// Center-crop GL2 to match destination box aspect ratio with zero stretching
const wide = (box, renderFn, over) => {
  renderFn();
  const sw = GL2.width, sh = GL2.height, srcA = sw / sh, dstA = box.w / box.h;
  let sx = 0, sy = 0, cw = sw, ch = sh;
  if (dstA > srcA) { ch = sw / dstA; sy = (sh - ch) / 2; }
  else { cw = sh * dstA; sx = (sw - cw) / 2; }
  B.save(); B.beginPath(); B.roundRect(box.x, box.y, box.w, box.h, 12); B.clip();
  B.drawImage(GL2, sx, sy, cw, ch, box.x, box.y, box.w, box.h);
  B.restore();
  if (over) over();
};

// Sets reused across panels
const BED = SETS.bedroom(E);
const heroBed = new ClayHuman({});
heroBed.group.position.set(-0.25, 0.12, -1.62);
BED.scene.add(heroBed.group);

// 1 · hero frame
let b = panel(20, 80, 540, 520, 1, 'HERO FRAME');
shot(b.x + 6, b.y, 240, () => {
  heroBed.express('surprised');
  heroBed.pose({ hipL: [85, 0, 4], hipR: [85, 0, 4], spine: [-6, 6, 0], head: [-5, 14, 0], shL: [52, 0, 6], elL: 45, shR: [52, 0, 6], elR: 45 });
  cam.position.set(0.35, 1.20, 0.95); cam.lookAt(-0.04, 0.92, -1.65);
  E.render(BED.scene, cam, { focus: 2.6, aperture: 0.0018, maxblur: 0.006, bloom: 0.08, exposure: 0.96 });
}, () => {
  shockMarks(690, 460, 1.1);
  caption([{ txt: 'What' }, { txt: 'happens', hi: 1 }], 540, 1460);
  caption([{ txt: 'when' }, { txt: 'you' }, { txt: 'stop?', hi: 1 }], 540, 1600);
});
small('CHIBI CLAY TOYS\nBIG HEAD, STUBBY LIMBS', b.x + 266, b.y + 44, 'left', 16);
small('8 EXPRESSIVE FACES\nNEUTRAL TO WINK', b.x + 266, b.y + 138, 'left', 16);
small('COZY DOMESTIC SETS\nSOFT WARM LIGHTING', b.x + 266, b.y + 232, 'left', 16);
small('RELATABLE STORYTIME\nWHOLESOME & CALM', b.x + 266, b.y + 326, 'left', 16);

// 2 · palette + cast
b = panel(570, 80, 690, 520, 2, 'PALETTE & CAST');
const yy = swatches(b, [
  ['SKIN', '#EDBE9C'], ['HAIR', '#5C3A24'], ['SHIRT', '#F2EEE8'], ['GIRL', '#FFD06A'],
  ['TRIM', '#5B8CC9'], ['JEANS', '#4E6FB8'], ['WARM', '#EFE3D0'], ['NIGHT', '#4A5886']
]);
const castScene = new THREE.Scene(); castScene.background = new THREE.Color('#F3ECE2'); castScene.environment = E2.envMap; castScene.environmentIntensity = 0.25;
{
  const f = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: '#E6DCCD', roughness: 0.9 }));
  f.rotation.x = -Math.PI / 2; f.receiveShadow = true; castScene.add(f);
  lightRig(castScene, { key: '#FFE8D0', keyI: 1.9, keyPos: [2, 3.5, 4], hemiI: 0.8, shadowBox: 3 });
}
[
  [{}, -0.62, { head: [0, 12, 0], shL: [35, 0, 20], elL: 50, shR: [10, 0, 10] }, 'happy'],
  [{ shirt: '#FFD06A', shirtTrim: '#FFD06A', pants: '#7C9CD6', hairStyle: 'ponytail', scrunchie: '#FFD43B' }, 0, { head: [2, -6, 0], shL: [24, 0, 12], elL: 70, shR: [24, 0, 12], elR: 70 }, 'neutral'],
  [{ skin: '#D0946E', shirt: '#6DAA6A', shirtTrim: '#4E824B', pants: '#3E4864', hair: '#2A1B12' }, 0.62, { head: [-3, -14, 0], shR: [55, 0, 16], elR: 80 }, 'wink'],
].forEach(([look, x, pose, expr]) => {
  const h = new ClayHuman(look);
  h.group.position.x = x; h.group.rotation.y = -x * 0.35;
  h.pose(pose); h.express(expr);
  castScene.add(h.group);
});
const c2 = new THREE.PerspectiveCamera(26, 1280 / 860, 0.05, 100); c2.position.set(0, 0.92, 4.9); c2.lookAt(0, 0.68, 0);
wide({ x: b.x, y: yy + 6, w: b.w, h: 256 }, () => E2.render(castScene, c2, { aperture: 0, bloom: 0.06, exposure: 0.95 }));
small('MALE & FEMALE LOOKS: SWAPPABLE SHIRT, TRIM, HAIR & SCRUNCHIE', b.x + b.w / 2, yy + 294, 'center', 13, '#C9CDD6');

// 3 · 8 expressions rendered in 3D
b = panel(1270, 80, 630, 520, 3, 'FACES DO THE ACTING');
{
  const exprScene = new THREE.Scene(); exprScene.background = new THREE.Color('#2B2D3E'); exprScene.environment = E2.envMap; exprScene.environmentIntensity = 0.25;
  lightRig(exprScene, { key: '#FFEAD2', keyI: 1.7, keyPos: [1.5, 2.5, 3.0], target: [0, 0.95, 0], hemiI: 0.95, shadowBox: 2 });
  const exprHero = new ClayHuman({});
  exprScene.add(exprHero.group);
  const ec = new THREE.PerspectiveCamera(24, 1280 / 860, 0.05, 50);
  ec.position.set(0, 1.0, 1.38); ec.lookAt(0, 0.97, 0);
  const moods = ['neutral', 'happy', 'laugh', 'surprised', 'thinking', 'sad', 'angry', 'wink'];
  moods.forEach((m, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const slotW = 136, slotH = 160;
    const cx = b.x + 84 + col * 144, cy = b.y + 10 + row * 214;
    exprHero.pose(m === 'thinking' ? { head: [2, 8, -4], shR: [68, 0, -14], elR: 112 } : { head: [0, 8, 0] });
    exprHero.express(m);
    E2.render(exprScene, ec, { aperture: 0, bloom: 0.04, exposure: 0.96, vignette: 0.12 });
    B.save();
    B.beginPath(); B.roundRect(cx - slotW / 2, cy, slotW, slotH, 10); B.clip();
    B.drawImage(GL2, 370, 112, 540, 635, cx - slotW / 2, cy, slotW, slotH);
    B.restore();
    B.strokeStyle = '#4B5068'; B.lineWidth = 1.5;
    B.beginPath(); B.roundRect(cx - slotW / 2, cy, slotW, slotH, 10); B.stroke();
    small(m.toUpperCase(), cx, cy + slotH + 24, 'center', 13, '#F5EFE6');
  });
}

// 4 · scenes
b = panel(20, 610, 760, 456, 4, 'SCENES');
const sw = 200, sx = (i) => b.x + 20 + i * (sw + 45);
shot(sx(0), b.y, sw, () => {
  heroBed.express('surprised');
  heroBed.pose({ hipL: [85, 0, 4], hipR: [85, 0, 4], spine: [-4, 4, 0], head: [-4, 12, 0], shL: [48, 0, 6], elL: 45, shR: [48, 0, 6], elR: 45 });
  cam.position.set(0.38, 1.24, 1.15); cam.lookAt(0.06, 0.90, -1.65);
  E.render(BED.scene, cam, { focus: 2.8, aperture: 0.0016, bloom: 0.08, exposure: 0.96 });
});
const LIV = SETS.livingRoom(E);
{
  const hLiv = new ClayHuman({}), fLiv = new ClayHuman({ shirt: '#FFD06A', shirtTrim: '#FFD06A', pants: '#7C9CD6', hairStyle: 'ponytail', scrunchie: '#FFD43B' });
  hLiv.group.position.set(-0.32, 0, -0.8); hLiv.group.rotation.y = 0.25; hLiv.express('happy');
  fLiv.group.position.set(0.32, 0, -0.95); fLiv.group.rotation.y = -0.3; fLiv.express('laugh');
  LIV.scene.add(hLiv.group, fLiv.group);
  shot(sx(1), b.y, sw, () => {
    cam.position.set(0.05, 1.18, 2.25); cam.lookAt(0, 0.78, -0.9);
    E.render(LIV.scene, cam, { focus: 3.1, aperture: 0.0012, bloom: 0.06, exposure: 0.95 });
  });
}
const THK = SETS.thinkingStage(E);
{
  const hThk = new ClayHuman({}); hThk.express('thinking');
  hThk.pose({ head: [6, -8, 4], shR: [72, 0, -10], elR: 112 });
  THK.scene.add(hThk.group);
  shot(sx(2), b.y, sw, () => {
    cam.position.set(0.28, 1.1, 1.75); cam.lookAt(0.05, 0.9, 0);
    E.render(THK.scene, cam, { focus: 1.8, aperture: 0.001, bloom: 0.06, exposure: 0.96 });
  }, () => thought('FOGGY...', 750, 320, 0.9));
}
['(A) BEDROOM (NIGHT)', '(B) LIVING ROOM', '(C) THINKING STAGE'].forEach((t, i) => small(t, sx(i) + sw / 2, b.y + sw * 16 / 9 + 26, 'center', 14));

// 5 · captions
b = panel(790, 610, 520, 456, 5, 'CAPTIONS');
wide({ x: b.x, y: b.y, w: b.w, h: b.h - 10 }, () => {
  const c3 = new THREE.PerspectiveCamera(30, 1280 / 860, 0.05, 100);
  c3.position.set(0.8, 1.15, 1.5); c3.lookAt(0, 0.85, -1.0);
  E2.render(LIV.scene, c3, { focus: 0.8, aperture: 0.015, maxblur: 0.02, bloom: 0.06, exposure: 0.95 });
}, () => {
  const sc = 0.34, mid = b.x + b.w / 2;
  [[[{ txt: 'What' }, { txt: 'happens', hi: 1 }], 78], [[{ txt: 'when' }, { txt: 'you' }, { txt: 'stop', hi: 1 }], 172], [[{ txt: 'sleeping?', hi: 1 }], 266]]
    .forEach(([w, y]) => { B.save(); B.translate(mid, b.y + y); B.scale(sc, sc); caption(w, 0, 0); B.restore(); });
  small('SENTENCE CASE · 1-3 WORDS · ONE YELLOW WORD', mid, b.y + b.h - 28, 'center', 12.5, '#FFFFFF');
});

// 6 · rules
b = panel(1320, 610, 580, 456, 6, 'RULES');
rules(b, [
  'CHIBI CLAY TOY PROPORTIONS: BIG HEAD, MATTE CLAY.',
  '8 EXPRESSIONS ACT ON THE BEAT (NEUTRAL TO WINK).',
  'COZY ROOMS: BEDROOM, LIVING ROOM, THINKING STAGE.',
  'SOFT WARM LIGHTING; NIGHT SCENES USE LAMP GLOW.',
  'GENTLE CAMERA MOVES; NEW SHOT EVERY 2-4 S.',
  'NO GORE OR X-RAY: THOUGHT BUBBLES, ZZZ, SHOCKS.',
  'MOOD: WHOLESOME, WARM, RELATABLE STORYTIME.'
], b.y + 26, 13.5, 52);

window.SHEET_READY = true;
