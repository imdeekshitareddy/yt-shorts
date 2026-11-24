// A chibi vinyl/clay-toy character sculpted from SDFs. Big spherical head, glossy oval bead eyes,
// tiny nose, rounded ears, bean torso, cylinder arms/legs, hemisphere shoes, 8 expressions.
// new ClayHuman({ skin, shirt, shirtTrim, sleeveTrim, pants, shoes, hair, hairStyle, scrunchie, blush, scale }).
//   h.group (feet at y=0) · h.pose({...}) · h.walk(phase, amt) · h.express(name)
//   h.head, h.spine, h.hips groups for attaching things
import * as THREE from 'three';
import { sphere, ellipsoid, capsule, rbox, torus, smin, smax, mesh, rgb } from './sdf.js';

const D = THREE.MathUtils.degToRad;
const cache = new Map();
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function sculpt(key, f, bounds, step, color) { if (!cache.has(key)) cache.set(key, mesh(f, bounds, step, color)); return cache.get(key); }

// ---------- Clay material factory (matte vinyl/clay: soft roughness, gentle peach sheen, no gloss) ----------
export const CLAY_MAT = () => new THREE.MeshPhysicalMaterial({
  vertexColors: true, roughness: 0.78, sheen: 0.22, sheenRoughness: 0.85,
  sheenColor: new THREE.Color('#FFD8C2'), clearcoat: 0
});

// ---------- Default palette (from reference character sheet) ----------
const DEFAULTS = {
  skin: '#EDBE9C', blush: '#EA8D7C', shirt: '#F2EEE8', shirtTrim: '#5B8CC9',
  pants: '#4E6FB8', shoes: '#F2F2F2', hair: '#5C3A24',
  hairStyle: 'quiff', scrunchie: '#FFD43B'
};

// ---------- 8 Expression presets ----------
// eyeMode: 'dot' | 'happy' | 'wink'
// mouthMode: 'smile' | 'frown' | 'laugh' | 'open' | 'smallO'
// browY: vertical offset (-1..1), browTilt: -1 sad/worried, 0 neutral/arch, +1 angry
const EXPRESSIONS = {
  neutral:   { eyeMode: 'dot',   eyeScaleY: 1.0,  browY: 0.0,  browTilt: 0.0,  mouthMode: 'smile',  mouthScale: 0.85, lid: 0 },
  happy:     { eyeMode: 'happy', eyeScaleY: 1.0,  browY: 0.25, browTilt: 0.0,  mouthMode: 'smile',  mouthScale: 1.05, lid: 0 },
  laugh:     { eyeMode: 'happy', eyeScaleY: 1.0,  browY: 0.4,  browTilt: 0.0,  mouthMode: 'laugh',  mouthScale: 1.0,  lid: 0 },
  surprised: { eyeMode: 'dot',   eyeScaleY: 1.15, browY: 0.85, browTilt: -0.15,mouthMode: 'open',   mouthScale: 1.0,  lid: -0.3 },
  thinking:  { eyeMode: 'dot',   eyeScaleY: 1.0,  browY: 0.35, browTilt: 0.2,  mouthMode: 'smallO', mouthScale: 0.8,  lid: 0.05 },
  sad:       { eyeMode: 'dot',   eyeScaleY: 0.95, browY: -0.1, browTilt: -0.9, mouthMode: 'frown',  mouthScale: 0.9,  lid: 0.1 },
  angry:     { eyeMode: 'dot',   eyeScaleY: 0.95, browY: -0.35,browTilt: 1.0,  mouthMode: 'frown',  mouthScale: 0.95, lid: 0.15 },
  wink:      { eyeMode: 'wink',  eyeScaleY: 1.0,  browY: 0.2,  browTilt: 0.0,  mouthMode: 'smile',  mouthScale: 0.95, lid: 0 },
};

export class ClayHuman {
  constructor(o = {}) {
    const c = { ...DEFAULTS, ...o };
    if (c.headband && !o.hairStyle) c.hairStyle = 'ponytail';
    if (c.headbandCol && !o.scrunchie) c.scrunchie = c.headbandCol;
    this.o = c;
    const K = JSON.stringify(c);

    const S = rgb(c.skin), BL = rgb(c.blush), SH = rgb(c.shirt), ST = rgb(c.shirtTrim || c.shirt);
    const PA = rgb(c.pants), SO = rgb(c.shoes), HA = rgb(c.hair), SC = rgb(c.scrunchie);

    this.mat = CLAY_MAT();
    this.parts = [];
    this._lastPose = {};

    const add = (parent, geo, pos = [0, 0, 0]) => {
      const m = new THREE.Mesh(geo, this.mat);
      m.castShadow = true; m.receiveShadow = true;
      m.position.set(...pos); parent.add(m); this.parts.push(m);
      return m;
    };
    const G = (parent, pos) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };

    // ---------- Hierarchy (~1.42 units tall, head centre at y ~ 1.05, big ~40% chibi head) ----------
    this.group = new THREE.Group();
    this.group.scale.setScalar(c.scale || 1);
    this.hips = G(this.group, [0, 0.46, 0]);
    this.spine = G(this.hips, [0, 0.02, 0]);

    // -------- Torso (Rounded Cube construction with smooth crew-neck collar & pants waist) --------
    add(this.spine, sculpt('cw_torso_' + K, (p) => {
      let d = rbox(p, [0, 0.19, 0], [0.13, 0.145, 0.088], 0.055);
      d = smin(d, sphere(p, [-0.11, 0.28, 0], 0.048), 0.045);
      d = smin(d, sphere(p, [ 0.11, 0.28, 0], 0.048), 0.045);
      d = smin(d, capsule(p, [0, 0.32, 0], [0, 0.40, 0], 0.045, 0.04), 0.03);
      return d;
    }, [[-0.21, 0.0, -0.14], [0.21, 0.44, 0.14]], 0.0055, (p) => {
      // Smooth spherical crew-neck distance around neck front-top
      const neckR = Math.hypot(p[0], (p[1] - 0.365) * 1.15, p[2] - 0.02);
      const skinAmt = sstep(0.082, 0.068, neckR);
      const collarAmt = sstep(0.112, 0.098, neckR);
      const shirtC = mixc(SH, ST, collarAmt);
      const upper = mixc(shirtC, S, skinAmt);
      return mixc(PA, upper, sstep(0.105, 0.122, p[1]));
    }));

    // -------- Head (big smooth sphere + ears + tiny round nose + soft blush) --------
    this.head = G(this.spine, [0, 0.34, 0]);
    const headY = 0.175;
    this._headY = headY;
    add(this.head, sculpt('cw_head_' + c.skin + '_' + c.blush, (p) => {
      let d = sphere(p, [0, headY, 0], 0.168);
      // Soft rounded cheeks
      for (const s of [-1, 1]) {
        d = smin(d, ellipsoid(p, [s * 0.088, headY - 0.036, 0.055], [0.078, 0.068, 0.072]), 0.05);
        // Cute rounded ears sticking out cleanly on sides
        d = smin(d, ellipsoid(p, [s * 0.172, headY - 0.015, 0.002], [0.028, 0.038, 0.024]), 0.014);
      }
      // Tiny button nose bump
      d = smin(d, sphere(p, [0, headY - 0.022, 0.170], 0.016), 0.014);
      // Short cute neck base
      d = smin(d, capsule(p, [0, -0.02, 0], [0, 0.04, 0], 0.044), 0.03);
      return d;
    }, [[-0.22, -0.05, -0.22], [0.22, 0.40, 0.22]], 0.004, (p) => {
      // Subtle rosy blush on cheeks
      const dL = Math.hypot((p[0] + 0.084) / 0.048, (p[1] - (headY - 0.038)) / 0.032, (p[2] - 0.135) / 0.045);
      const dR = Math.hypot((p[0] - 0.084) / 0.048, (p[1] - (headY - 0.038)) / 0.032, (p[2] - 0.135) / 0.045);
      const blushAmt = Math.max(0, 1 - Math.min(dL, dR));
      return mixc(S, BL, blushAmt * blushAmt * 0.45);
    }));

    // -------- Face features (glossy oval bead eyes + happy arcs + brows + 3D mouths) --------
    const eyeY = headY + 0.008, eyeZ = 0.153, eyeSpX = 0.054;
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: '#161418', roughness: 0.15, clearcoat: 0.8 });
    const hlMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const browMat = new THREE.MeshStandardMaterial({ color: '#2B1B12', roughness: 0.8 });
    const mouthDarkMat = new THREE.MeshStandardMaterial({ color: '#4A1D1D', roughness: 0.7 });
    const tongueMat = new THREE.MeshStandardMaterial({ color: '#E87A7A', roughness: 0.75 });
    const skinLidMat = new THREE.MeshPhysicalMaterial({ color: c.skin, roughness: 0.78, sheen: 0.22, sheenColor: new THREE.Color('#FFD8C2') });

    this.eyes = []; this.eyeDots = []; this.eyeHls = []; this.eyeArcs = []; this.lids = []; this.brows = [];
    for (const s of [-1, 1]) {
      const eg = new THREE.Group();
      eg.position.set(s * eyeSpX, eyeY, eyeZ);
      this.head.add(eg);
      this.eyes.push(eg);

      // Oval glossy bead eye + crisp highlight
      const dotGroup = new THREE.Group();
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.017, 24, 18), eyeMat);
      bead.scale.set(0.76, 1.18, 0.52);
      dotGroup.add(bead);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 12, 10), hlMat);
      hl.position.set(0.0045, 0.0085, 0.0082);
      dotGroup.add(hl);
      this.eyeHls.push(hl);
      eg.add(dotGroup);
      this.eyeDots.push(dotGroup);

      // Happy / wink closed eye arc (◠)
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0036, 8, 20, Math.PI * 0.78), eyeMat);
      arc.rotation.z = Math.PI * 0.11;
      arc.position.set(0, -0.005, 0.004);
      arc.visible = false;
      eg.add(arc);
      this.eyeArcs.push(arc);

      // Blink eyelid (covers dot eye cleanly without Z-fighting highlight)
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0205, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), skinLidMat);
      lid.scale.set(0.9, 1.22, 0.78);
      lid.rotation.x = -0.35;
      lid.visible = false;
      eg.add(lid);
      this.lids.push(lid);

      // Brow (horizontal capsule rotated by Math.PI/2)
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0044, 0.020, 4, 8), browMat);
      brow.position.set(s * eyeSpX, eyeY + 0.042, eyeZ + 0.005);
      brow.rotation.z = Math.PI / 2;
      this.head.add(brow);
      this.brows.push(brow);
    }

    // ---- Mouths (5 variants toggled cleanly by expression) ----
    this.mouthGroup = new THREE.Group();
    this.mouthGroup.position.set(0, headY - 0.062, 0.156);
    this.head.add(this.mouthGroup);

    // 1. Smile arc (◡)
    this._mSmile = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0035, 8, 20, Math.PI * 0.7), mouthDarkMat);
    this._mSmile.rotation.z = Math.PI + Math.PI * 0.15;
    this._mSmile.position.y = 0.011;
    this.mouthGroup.add(this._mSmile);

    // 2. Frown arc (◠)
    this._mFrown = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0035, 8, 20, Math.PI * 0.7), mouthDarkMat);
    this._mFrown.rotation.z = Math.PI * 0.15;
    this._mFrown.position.y = -0.014;
    this._mFrown.visible = false;
    this.mouthGroup.add(this._mFrown);

    // 3. Laugh D-shape open mouth + tongue
    this._mLaugh = new THREE.Group();
    const laughBg = new THREE.Mesh(new THREE.CircleGeometry(0.023, 24, Math.PI, Math.PI), mouthDarkMat);
    laughBg.position.y = 0.008;
    this._mLaugh.add(laughBg);
    const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.014, 20, Math.PI, Math.PI), tongueMat);
    tongue.position.set(0, 0.002, 0.002);
    this._mLaugh.add(tongue);
    this._mLaugh.visible = false;
    this.mouthGroup.add(this._mLaugh);

    // 4. Open O mouth (surprised / thinking)
    this._mOpen = new THREE.Mesh(new THREE.SphereGeometry(0.016, 18, 14), mouthDarkMat);
    this._mOpen.scale.set(0.85, 1.15, 0.45);
    this._mOpen.position.y = -0.004;
    this._mOpen.visible = false;
    this.mouthGroup.add(this._mOpen);

    // -------- Hair (smooth vinyl/clay sculpted — quiff or female ponytail) --------
    add(this.head, sculpt('cw_hair_' + c.hair + '_' + c.hairStyle + '_' + c.scrunchie, (p) => {
      // Main thick rounded cap
      let d = ellipsoid(p, [0, headY + 0.018, -0.012], [0.186, 0.182, 0.186]);
      // Cut open the face window cleanly without receding at temples
      const faceCut = ellipsoid(p, [0, headY - 0.042, 0.105], [0.132, 0.135, 0.125]);
      d = smax(d, -faceCut, 0.02);
      // Trim hair cleanly around ears and jawline
      const backLine = headY - 0.065 + 0.095 * Math.min(1, Math.max(0, (p[2] + 0.05) / 0.15));
      d = smax(d, -(p[1] - backLine), 0.018);

      if (c.hairStyle === 'ponytail') {
        // Soft center-parted bangs framing forehead
        d = smin(d, ellipsoid(p, [-0.072, headY + 0.102, 0.115], [0.068, 0.055, 0.055]), 0.025);
        d = smin(d, ellipsoid(p, [ 0.072, headY + 0.102, 0.115], [0.068, 0.055, 0.055]), 0.025);
        // Side ponytail swoop
        d = smin(d, capsule(p, [0.10, headY + 0.13, -0.10], [0.165, headY + 0.08, -0.17], 0.050, 0.074), 0.03);
        d = smin(d, capsule(p, [0.165, headY + 0.08, -0.17], [0.175, headY - 0.09, -0.16], 0.074, 0.054), 0.035);
        // Yellow scrunchie torus around ponytail base
        const pCenter = [p[0] - 0.115, p[1] - (headY + 0.115), p[2] + 0.118];
        const scD = torus([pCenter[0], pCenter[2], pCenter[1]], [0, 0, 0], 0.050, 0.017);
        d = Math.min(d, scD);
      } else {
        // Male swept rounded pompadour / quiff (big soft fluffy clay volume)
        d = smin(d, ellipsoid(p, [0.035, headY + 0.168, 0.035], [0.138, 0.075, 0.125]), 0.045);
        d = smin(d, ellipsoid(p, [-0.078, headY + 0.145, 0.02], [0.082, 0.058, 0.095]), 0.04);
      }
      return d;
    }, [[-0.25, 0.00, -0.26], [0.27, 0.45, 0.23]], 0.0045, (p) => {
      if (c.hairStyle === 'ponytail') {
        const dSc = Math.hypot(p[0] - 0.115, p[1] - (headY + 0.115), p[2] + 0.118);
        if (dSc < 0.066 && p[2] < -0.08) return mixc(HA, SC, sstep(0.065, 0.048, dSc));
      }
      return HA;
    }));

    // -------- Arms (Cylinder arms + blue sleeve cuffs + Sphere hands) --------
    this.arm = {};
    for (const s of [-1, 1]) {
      const k = s < 0 ? 'L' : 'R';
      const sh = G(this.spine, [s * 0.155, 0.285, 0]);
      add(sh, sculpt('cw_uarm_' + K, (p) => {
        let d = capsule(p, [0, 0, 0], [0, -0.145, 0], 0.040, 0.035);
        d = smin(d, capsule(p, [0, 0.005, 0], [0, -0.075, 0], 0.052, 0.048), 0.015);
        return d;
      }, [[-0.07, -0.20, -0.07], [0.07, 0.07, 0.07]], 0.005, (p) => {
        const isSleeve = p[1] > -0.088;
        if (!isSleeve) return S;
        const isCuff = p[1] < -0.066;
        return isCuff ? ST : SH;
      }));

      const el = G(sh, [0, -0.145, 0]);
      add(el, sculpt('cw_farm_' + s + '_' + c.skin, (p) => {
        let d = capsule(p, [0, 0, 0], [0, -0.115, 0.005], 0.034, 0.029);
        // Smooth spherical clay hand + subtle thumb nub
        d = smin(d, sphere(p, [0, -0.145, 0.008], 0.036), 0.018);
        d = smin(d, capsule(p, [-s * 0.024, -0.128, 0.018], [-s * 0.036, -0.148, 0.03], 0.012, 0.01), 0.01);
        return d;
      }, [[-0.07, -0.20, -0.06], [0.07, 0.05, 0.06]], 0.005, () => S));

      this.arm[k] = { sh, el };
    }

    // -------- Legs (Cylinder jeans + Hemisphere shoes) --------
    this.leg = {};
    for (const s of [-1, 1]) {
      const k = s < 0 ? 'L' : 'R';
      const hip = G(this.hips, [s * 0.068, -0.015, 0]);
      add(hip, sculpt('cw_thigh_' + K, (p) => {
        return capsule(p, [0, 0, 0], [0, -0.19, 0.003], 0.060, 0.052);
      }, [[-0.08, -0.26, -0.08], [0.08, 0.08, 0.08]], 0.0055, () => PA));

      const kn = G(hip, [0, -0.19, 0.003]);
      add(kn, sculpt('cw_shin_' + K, (p) => {
        let d = capsule(p, [0, 0, 0], [0, -0.18, -0.003], 0.051, 0.048);
        // Hemisphere rounded shoe
        d = smin(d, ellipsoid(p, [0, -0.225, 0.028], [0.054, 0.046, 0.088]), 0.025);
        d = smax(d, -(p[1] + 0.252), 0.006);
        return d;
      }, [[-0.08, -0.27, -0.08], [0.08, 0.06, 0.14]], 0.005, (p) => {
        return mixc(SO, PA, sstep(-0.185, -0.165, p[1]));
      }));

      this.leg[k] = { hip, kn };
    }

    this._expr = { ...EXPRESSIONS.neutral };
    this.pose({});
  }

  /** Apply facial state without resetting body joint pose */
  _applyFace(q = {}) {
    const ex = this._expr;
    const lidVal = q.lid ?? ex.lid ?? 0;

    // Toggle dot eyes vs happy arcs
    for (let i = 0; i < 2; i++) {
      const isHappyArc = ex.eyeMode === 'happy' || (ex.eyeMode === 'wink' && i === 0);
      this.eyeDots[i].visible = !isHappyArc;
      this.eyeArcs[i].visible = isHappyArc;
      if (!isHappyArc) {
        this.eyeDots[i].scale.set(1, ex.eyeScaleY, 1);
        this.lids[i].visible = lidVal > 0.25;
        this.lids[i].rotation.x = -0.35 + lidVal * 1.1;
        this.eyeHls[i].visible = lidVal <= 0.35;
      } else {
        this.lids[i].visible = false;
      }
    }

    // Brows (base z = Math.PI/2 makes CapsuleGeometry horizontal)
    const eyeY = this._headY + 0.008;
    const browUp = ex.browY ?? 0;
    const tilt = ex.browTilt ?? 0;
    this.brows[0].position.y = eyeY + 0.042 + browUp * 0.011;
    this.brows[1].position.y = eyeY + 0.042 + browUp * 0.011;
    // tilt < 0: worried/sad (/ \); tilt > 0: angry (\ /)
    this.brows[0].rotation.z = Math.PI / 2 - tilt * 0.28;
    this.brows[1].rotation.z = Math.PI / 2 + tilt * 0.28;

    // Mouth variant
    const m = ex.mouthMode;
    this._mSmile.visible = m === 'smile';
    this._mFrown.visible = m === 'frown';
    this._mLaugh.visible = m === 'laugh';
    this._mOpen.visible = m === 'open' || m === 'smallO';
    if (m === 'smile') this._mSmile.scale.setScalar(ex.mouthScale);
    if (m === 'frown') this._mFrown.scale.setScalar(ex.mouthScale);
    if (m === 'open') this._mOpen.scale.set(0.85, 1.15, 0.45);
    if (m === 'smallO') this._mOpen.scale.set(0.6, 0.65, 0.45);

    // Eye look shift
    if (q.look && this.eyes) {
      this.eyes.forEach((e) => e.rotation.set(D((q.look[1] || 0) * 0.6), D((q.look[0] || 0) * 0.6), 0));
    }
  }

  /** pose in degrees: spine/head [x,y,z]; shL/shR [x,y,z]; elL/elR bend; hipL/hipR [x,y,z]; knL/knR bend; lid, look */
  pose(q = {}) {
    this._lastPose = q;
    const r3 = (g, a = [0, 0, 0]) => g.rotation.set(D(a[0]), D(a[1]), D(a[2]));
    r3(this.spine, q.spine);
    r3(this.head, q.head);
    r3(this.arm.L.sh, [-(q.shL?.[0] ?? 0), q.shL?.[1] ?? 0, -(q.shL?.[2] ?? 8)]);
    this.arm.L.el.rotation.set(-D(q.elL ?? 12), 0, 0);
    r3(this.arm.R.sh, [-(q.shR?.[0] ?? 0), q.shR?.[1] ?? 0, q.shR?.[2] ?? 8]);
    this.arm.R.el.rotation.set(-D(q.elR ?? 12), 0, 0);
    r3(this.leg.L.hip, [-(q.hipL?.[0] ?? 0), q.hipL?.[1] ?? 0, -(q.hipL?.[2] ?? 3)]);
    this.leg.L.kn.rotation.set(D(q.knL ?? 3), 0, 0);
    r3(this.leg.R.hip, [-(q.hipR?.[0] ?? 0), q.hipR?.[1] ?? 0, q.hipR?.[2] ?? 3]);
    this.leg.R.kn.rotation.set(D(q.knR ?? 3), 0, 0);

    this._applyFace(q);
    this.group.updateMatrixWorld(true);
  }

  /** walking pose at phase ph (radians) */
  walk(ph, amt = 1) {
    const s = Math.sin(ph) * amt;
    this.pose({
      hipL: [s * 22, 0, 3], hipR: [-s * 22, 0, 3],
      knL: Math.max(0, -Math.sin(ph + 0.6)) * 35 * amt + 5,
      knR: Math.max(0, Math.sin(ph + 0.6)) * 35 * amt + 5,
      shL: [-s * 16, 0, 8], shR: [s * 16, 0, 8],
      elL: 20, elR: 20,
      spine: [2, s * 3, 0]
    });
    this.hips.position.y = 0.46 - Math.abs(Math.cos(ph)) * 0.01 * amt;
  }

  /** Set facial expression without wiping body pose: neutral, happy, laugh, surprised, thinking, sad, angry, wink */
  express(name) {
    const preset = EXPRESSIONS[name];
    if (!preset) return;
    this._expr = { ...preset };
    this._applyFace(this._lastPose);
  }

  setBodyMaterial(m) { this.parts.forEach((p) => { if (p.parent !== this.head) p.material = m || this.mat; p.castShadow = !m; }); }
  setAllMaterial(m) { this.parts.forEach((p) => (p.material = m)); }
}
