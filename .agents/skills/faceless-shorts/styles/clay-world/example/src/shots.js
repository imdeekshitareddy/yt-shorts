// WHAT HAPPENS WHEN YOU DON'T SLEEP? : the shot list (Clay World 3D example).
// A shot: { id, at, note, draw(lt, d, t, blit) } : pose characters, render 3D frame with E.render(...),
// call blit() to put it on the 2D canvas, then draw 2D overlays (shockMarks, sleepZzz, thought, pills).
// Times come from the voice: cut(i) = just before line i, Wd('word', i) = when that word is said.
import * as THREE from 'three';
import { W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd } from './core/timing.js';
import { camera } from './core/engine.js';
import { ClayHuman } from './core/human.js';
import * as SETS from './core/sets.js';
import { pill, thought, shockMarks, sleepZzz, warning, drowsy } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(32);

  const BLOOK = { aperture: 0.0018, maxblur: 0.006, bloom: 0.08, exposure: 0.96 };
  const LLOOK = { aperture: 0.0014, maxblur: 0.005, bloom: 0.06, exposure: 0.95 };
  const TLOOK = { aperture: 0.0010, maxblur: 0.004, bloom: 0.06, exposure: 0.96 };

  // ── the worlds ────────────────────────────────────────────────────────────
  const BED = SETS.bedroom(E);
  const heroBed = new ClayHuman({}); // male default (white/blue trim shirt, brown quiff)
  heroBed.group.position.set(-0.25, 0.12, -1.62); // seated inside bed, torso & head above duvet
  BED.scene.add(heroBed.group);

  const LIV = SETS.livingRoom(E);
  const heroLiv = new ClayHuman({});
  heroLiv.group.position.set(-0.35, 0, -0.8);
  LIV.scene.add(heroLiv.group);
  const friendLiv = new ClayHuman({ shirt: '#FFD06A', shirtTrim: '#FFD06A', pants: '#7C9CD6', hairStyle: 'ponytail', scrunchie: '#FFD43B' });
  friendLiv.group.position.set(0.45, 0, -1.1);
  friendLiv.group.rotation.y = -0.35;
  LIV.scene.add(friendLiv.group);

  const THK = SETS.thinkingStage(E);
  const heroThk = new ClayHuman({});
  heroThk.group.position.set(0, 0, 0);
  THK.scene.add(heroThk.group);

  const resetAll = () => {
    heroBed.pose({ hipL: [85, 0, 4], hipR: [85, 0, 4], knL: 15, knR: 15 });
    heroBed.express('neutral');
    heroLiv.group.position.set(-0.35, 0, -0.8);
    heroLiv.group.rotation.set(0, 0.15, 0);
    heroLiv.pose({});
    heroLiv.express('neutral');
    friendLiv.pose({ shL: [15, 0, 10], elL: 45, shR: [15, 0, 10], elR: 45 });
    friendLiv.express('neutral');
    heroThk.group.position.set(0, 0, 0);
    heroThk.group.rotation.set(0, 0, 0);
    heroThk.pose({});
    heroThk.express('neutral');
  };

  // 1 · HOOK: wide awake in bed at night, startled (echoes screenshot 2)
  { const st = cut(0), popAt = Math.max(0.2, Wd('stop', 0) - st - 0.15);
    add({ id: 'S01', at: st, note: 'bedroom hook: hero startled awake in bed', draw(lt, d, t, blit) {
      resetAll(); BED.update(t);
      const k = eo(seg(lt, 0.05, 0.5));
      heroBed.express(lt > popAt ? 'surprised' : 'sad');
      heroBed.pose({
        hipL: [85, 0, 4], hipR: [85, 0, 4], knL: 15, knR: 15,
        spine: [-8 * k, 4, 0], head: [-6 * k, 10 * k, 0],
        shL: [52, 0, 6], elL: 45, shR: [52, 0, 6], elR: 45,
        look: [8 * k, 0]
      });
      const focusPt = V3(-0.08, 0.94, -1.65);
      cam.position.copy(lerpV(V3(0.45, 1.24, 1.05), V3(0.32, 1.18, 0.65), eio(lt / d)));
      cam.lookAt(focusPt);
      E.render(BED.scene, cam, { ...BLOOK, focus: cam.position.distanceTo(focusPt) }); blit();
      if (lt > popAt) {
        const [sx, sy] = screen(V3(-0.15, 1.12, -1.62), cam);
        shockMarks(sx + 130, sy - 40, eob(seg(lt, popAt, popAt + 0.2)));
      }
    } });
    cue(st + popAt, 'pop', { gain: 0.7 }); }

  // 2 · ONE NIGHT: tired in the living room, "24 HOURS" pill
  { const st = cut(1);
    add({ id: 'S02', at: st, note: 'living room: exhausted after one night', draw(lt, d, t, blit) {
      resetAll();
      heroLiv.express('sad');
      heroLiv.pose({ spine: [10, 0, 0], head: [14, -6 + Math.sin(lt * 2) * 3, 2], shR: [35, 0, 8], elR: 85, lid: 0.35 });
      friendLiv.express('thinking');
      friendLiv.pose({ head: [4, -18, 0], shL: [65, 0, 12], elL: 105 });
      const focusPt = V3(-0.35, 0.95, -0.8);
      cam.position.copy(lerpV(V3(-0.65, 1.25, 1.55), V3(-0.2, 1.18, 1.15), eio(lt / d)));
      cam.lookAt(focusPt);
      E.render(LIV.scene, cam, { ...LLOOK, focus: cam.position.distanceTo(focusPt) }); blit();
      pill('24 HOURS AWAKE', 540, 320, eob(seg(lt, 0.15, 0.4)), '#FFD43B');
    } });
    cue(st, 'whoosh'); cue(st + 0.2, 'pop', { gain: 0.5 }); }

  // 3 · WADING THROUGH MUD: thinking stage close-up, foggy thoughts
  { const st = cut(2);
    add({ id: 'S03', at: st, note: 'thinking stage: brain fog, thought bubble', draw(lt, d, t, blit) {
      resetAll();
      heroThk.express('thinking');
      const sway = Math.sin(lt * 1.8) * 4;
      heroThk.pose({ spine: [4, sway, 0], head: [8, -10 + sway, 4], shR: [72, 0, -10], elR: 112, look: [-6, 4] });
      const focusPt = V3(0, 1.02, 0);
      cam.position.copy(lerpV(V3(0.45, 1.2, 1.65), V3(0.18, 1.14, 1.3), eio(lt / d)));
      cam.lookAt(focusPt);
      E.render(THK.scene, cam, { ...TLOOK, focus: cam.position.distanceTo(focusPt) }); blit();
      thought('FOGGY...', 760, 420, eob(seg(lt, 0.2, 0.5)));
    } });
    cue(st, 'whoosh'); cue(st + 0.25, 'pop', { gain: 0.45 }); }

  // 4 · CLEAR OUT WASTE: cleanup explanation, female character explaining on stage
  { const st = cut(3);
    add({ id: 'S04', at: st, note: 'thinking stage: brain waste pill, head shakes', draw(lt, d, t, blit) {
      resetAll();
      heroThk.express(lt > d * 0.55 ? 'sad' : 'neutral');
      heroThk.pose({ head: [4, Math.sin(lt * 2.5) * 8, 0], shL: [30, 0, 22], elL: 65, shR: [30, 0, 22], elR: 65 });
      const focusPt = V3(0, 0.98, 0);
      cam.position.copy(lerpV(V3(-0.35, 1.18, 1.6), V3(-0.15, 1.12, 1.25), eio(lt / d)));
      cam.lookAt(focusPt);
      E.render(THK.scene, cam, { ...TLOOK, focus: cam.position.distanceTo(focusPt) }); blit();
      pill('CLEANUP PAUSED', 540, 320, eob(seg(lt, 0.2, 0.45)), '#9BB8D8');
    } });
    cue(st, 'whoosh'); cue(st + 0.2, 'tock', { gain: 0.5 }); }

  // 5 · 48 HOURS: living room, restless pacing / tricks
  { const st = cut(4);
    add({ id: 'S05', at: st, note: '48 hours: pacing in living room, angry/frustrated', draw(lt, d, t, blit) {
      resetAll();
      const ph = lt * 4.5;
      heroLiv.group.position.set(lerp(-0.55, 0.05, eio(lt / d)), 0, -0.75);
      heroLiv.group.rotation.y = 0.7;
      heroLiv.walk(ph, 0.8);
      heroLiv.express('angry');
      const focusPt = V3(heroLiv.group.position.x, 0.92, -0.75);
      cam.position.copy(lerpV(V3(0.4, 1.3, 1.65), V3(0.7, 1.22, 1.35), eio(lt / d)));
      cam.lookAt(focusPt);
      E.render(LIV.scene, cam, { ...LLOOK, focus: cam.position.distanceTo(focusPt) }); blit();
      pill('48 HOURS', 540, 320, eob(seg(lt, 0.1, 0.35)), '#FF8A8A');
    } });
    cue(st, 'whoosh'); cue(st + 0.15, 'pop', { gain: 0.55 }); }

  // 6 · MICROSLEEPS: eyes droop shut, drowsy vignette + screen dip on "shuts off"
  { const st = cut(5), shut = Wd('shuts', 5) - st;
    add({ id: 'S06', at: st, note: 'microsleeps: eyelids droop, drowsy blackout', draw(lt, d, t, blit) {
      resetAll(); BED.update(t);
      const drop = clamp(seg(lt, shut - 0.3, shut + 0.4));
      heroBed.express('sad');
      heroBed.pose({
        hipL: [85, 0, 4], hipR: [85, 0, 4], knL: 15, knR: 15,
        spine: [6 + 12 * drop, 0, 0], head: [10 + 20 * drop, 0, 6 * drop],
        lid: lerp(0.2, 1.0, drop)
      });
      const focusPt = V3(-0.22, 0.94, -1.62);
      cam.position.copy(lerpV(V3(0.22, 1.22, 0.65), V3(0.12, 1.16, 0.28), eio(lt / d)));
      cam.lookAt(focusPt);
      E.render(BED.scene, cam, { ...BLOOK, focus: cam.position.distanceTo(focusPt) }); blit();
      drowsy(drop * 0.92);
      pill('MICROSLEEP', 540, 260, eob(seg(lt, 0.15, 0.4)), '#9BB8D8');
    } });
    cue(st, 'whoosh'); cue(st + shut, 'slide', { dur: 0.9, gain: 0.45 }); }

  // 7 · WON'T EVEN KNOW: snaps back awake in bed, confused
  { const st = cut(6);
    add({ id: 'S07', at: st, note: 'snaps back awake, wide-eyed surprised', draw(lt, d, t, blit) {
      resetAll(); BED.update(t);
      const snap = eo(seg(lt, 0, 0.25));
      heroBed.express('surprised');
      heroBed.pose({
        hipL: [85, 0, 4], hipR: [85, 0, 4], knL: 15, knR: 15,
        spine: [lerp(14, -4, snap), 0, 0], head: [lerp(22, -4, snap), -6, 0],
        shL: [48, 0, 12], elL: 55, shR: [48, 0, 12], elR: 55
      });
      const focusPt = V3(-0.25, 1.06, -1.62);
      cam.position.copy(lerpV(V3(-0.2, 1.18, -0.35), V3(-0.05, 1.2, -0.05), eio(lt / d)));
      cam.lookAt(focusPt);
      E.render(BED.scene, cam, { ...BLOOK, focus: cam.position.distanceTo(focusPt) }); blit();
      const [sx, sy] = screen(V3(-0.25, 1.35, -1.62), cam);
      shockMarks(sx + 85, sy - 30, eob(seg(lt, 0.05, 0.25)));
    } });
    cue(st, 'boing', { gain: 0.65 }); }

  // 8 · THREE DAYS: hallucinations / seeing things, warning triangle + 72 HOURS
  { const st = cut(7);
    add({ id: 'S08', at: st, note: '72+ hours: startled looking around + warning', draw(lt, d, t, blit) {
      resetAll();
      const lookX = Math.sin(lt * 4.0) * 14;
      heroThk.express('surprised');
      heroThk.pose({ head: [-4, lookX, 0], spine: [-2, lookX * 0.3, 0], shL: [40, 0, 26], elL: 85, shR: [40, 0, 26], elR: 85, look: [lookX * 0.6, 0] });
      const focusPt = V3(0, 1.0, 0);
      cam.position.copy(lerpV(V3(0.3, 1.12, 1.75), V3(-0.25, 1.16, 1.45), eio(lt / d)));
      cam.lookAt(focusPt);
      E.render(THK.scene, cam, { ...TLOOK, focus: cam.position.distanceTo(focusPt) }); blit();
      pill('72+ HOURS', 540, 320, eob(seg(lt, 0.1, 0.35)), '#FF5A5A');
      warning(860, 480, eob(seg(lt, 0.4, 0.65)) * 0.55);
    } });
    cue(st, 'whoosh'); cue(st + 0.4, 'alarm', { dur: 1.2, gain: 0.4 }); }

  // 9 · BODY ALWAYS WINS: friend nodding / winking on stage
  { const st = cut(8);
    add({ id: 'S09', at: st, note: 'body always wins: knowing wink on stage', draw(lt, d, t, blit) {
      resetAll();
      heroThk.express(lt > d * 0.45 ? 'wink' : 'happy');
      heroThk.pose({ head: [Math.sin(lt * 5) * 4, 4, -3], shR: [60, 0, 25], elR: 85, shL: [12, 0, 10] });
      const focusPt = V3(0, 1.02, 0);
      cam.position.copy(lerpV(V3(-0.2, 1.1, 1.45), V3(0.1, 1.14, 1.2), eio(lt / d)));
      cam.lookAt(focusPt);
      E.render(THK.scene, cam, { ...TLOOK, focus: cam.position.distanceTo(focusPt) }); blit();
    } });
    cue(st, 'whoosh'); cue(st + 0.3, 'pop', { gain: 0.5 }); }

  // 10 · FORCES YOU TO SLEEP: fast asleep peacefully in cozy bed + Zzz
  { const st = cut(9);
    add({ id: 'S10', at: st, note: 'ending: peacefully asleep in bed with Zzz', draw(lt, d, t, blit) {
      resetAll(); BED.update(t);
      const settle = eo(seg(lt, 0, 0.6));
      heroBed.express('happy');
      heroBed.pose({
        hipL: [85, 0, 4], hipR: [85, 0, 4], knL: 15, knR: 15,
        spine: [lerp(0, 12, settle), 0, 0], head: [lerp(0, 18, settle), -8, 10 * settle],
        shL: [35, 0, 6], elL: 65, shR: [35, 0, 6], elR: 65,
        lid: 1.0
      });
      const focusPt = V3(-0.10, 0.92, -1.65);
      cam.position.copy(lerpV(V3(0.32, 1.24, 0.55), V3(0.55, 1.32, 0.95), eio(lt / d)));
      cam.lookAt(focusPt);
      E.render(BED.scene, cam, { ...BLOOK, focus: cam.position.distanceTo(focusPt) }); blit();
      const [zx, zy] = screen(V3(-0.1, 1.34, -1.62), cam);
      sleepZzz(zx + 65, zy - 40, eob(seg(lt, 0.35, 0.7)), t);
    } });
    cue(st, 'whoosh'); cue(st + 0.4, 'sparkle', { dur: 1.4, gain: 0.4 }); }

  return { shots: S, cues: CUES };
}
