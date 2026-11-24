// Clay World sets: cozy domestic environments for chibi vinyl/clay toy characters.
// Each returns { scene, lights, update(t) } — characters stand on y = 0, facing +z.
import * as THREE from 'three';
import { rbox, ellipsoid, capsule, smin, sphere, mesh, rgb } from './sdf.js';
import { lightRig } from './engine.js';

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
function canvasTex(w, h, draw, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; }
const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
function sdfMesh(f, b, step, mat) { return shadowed(new THREE.Mesh(mesh(f, b, step), mat)); }

// ═══════════════════════════ BEDROOM (cozy night, warm lamp) ═══════════════════════════
export function bedroom(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.25;
  scene.background = canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5E6E9E'); gr.addColorStop(0.5, '#4A5886'); gr.addColorStop(1, '#343D60');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog('#45527E', 6, 18);

  // ─── Floor: warm wooden planks ───
  const planks = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#4E3926'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const l = 105 + (i * 31) % 25;
      g.fillStyle = `rgb(${l + 48},${l + 15},${l - 18})`;
      g.fillRect(0, i * h / 8, w, h / 8);
      g.fillStyle = 'rgba(30,18,8,0.35)';
      g.fillRect(0, i * h / 8, w, 3);
      for (let k = 0; k < 30; k++) {
        g.fillStyle = 'rgba(50,30,15,0.06)';
        g.fillRect(Math.random() * w, i * h / 8 + Math.random() * h / 8, 100 + Math.random() * 180, 2);
      }
    }
  }, [5, 5]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), std('#ffffff', 0.65, { map: planks }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // ─── Walls: soft slate-blue ───
  const wallM = std('#566696', 0.9);
  const back = shadowed(new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.2), wallM));
  back.position.set(0, 2.5, -2.5); scene.add(back);
  const sideWall = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 10), wallM));
  sideWall.position.set(-3.2, 2.5, 1); scene.add(sideWall);

  // ─── Bed (centered around x = -0.25, z = -1.45): headboard, mattress, pillow, cozy blue duvet ───
  const bedX = -0.25, bedZ = -1.45;
  const bedWood = std('#856046', 0.7);
  const headboard = sdfMesh(
    (p) => rbox(p, [0, 0.55, 0], [0.76, 0.55, 0.06], 0.06),
    [[-0.85, -0.04, -0.08], [0.85, 1.14, 0.08]], 0.02, bedWood
  );
  headboard.position.set(bedX, 0, -2.18); scene.add(headboard);

  const bedFrame = sdfMesh(
    (p) => rbox(p, [0, 0.16, 0], [0.75, 0.16, 0.62], 0.04),
    [[-0.82, -0.04, -0.7], [0.82, 0.36, 0.7]], 0.025, bedWood
  );
  bedFrame.position.set(bedX, 0, bedZ); scene.add(bedFrame);

  const mattress = sdfMesh(
    (p) => rbox(p, [0, 0.08, 0], [0.70, 0.08, 0.56], 0.05),
    [[-0.78, -0.04, -0.64], [0.78, 0.2, 0.64]], 0.02,
    std('#ECEAF2', 0.8)
  );
  mattress.position.set(bedX, 0.32, bedZ); scene.add(mattress);

  // cozy puffy blue duvet covering the lower half of the bed
  const bedding = sdfMesh(
    (p) => {
      let d = rbox(p, [0, 0.06, 0.14], [0.72, 0.07, 0.38], 0.065);
      d = smin(d, ellipsoid(p, [0, 0.12, 0.06], [0.46, 0.13, 0.26]), 0.06);
      return d;
    },
    [[-0.8, -0.04, -0.35], [0.8, 0.32, 0.62]], 0.02,
    std('#6D8DC9', 0.8)
  );
  bedding.position.set(bedX, 0.42, bedZ); scene.add(bedding);

  // soft periwinkle pillow against headboard
  const pillowMat = std('#85A3DC', 0.85);
  const pillow = sdfMesh(
    (p) => rbox(p, [0, 0, 0], [0.34, 0.08, 0.16], 0.07),
    [[-0.44, -0.15, -0.26], [0.44, 0.15, 0.26]], 0.015, pillowMat
  );
  pillow.position.set(bedX, 0.54, -1.9);
  pillow.rotation.x = 0.22;
  scene.add(pillow);

  // ─── Nightstand on right with warm glowing lamp + small clock ───
  const nightstandMat = std('#825D44', 0.65);
  const nightstand = sdfMesh(
    (p) => {
      let d = rbox(p, [0, 0.24, 0], [0.22, 0.24, 0.20], 0.04);
      d = smin(d, rbox(p, [0, 0.50, 0], [0.25, 0.022, 0.23], 0.02), 0.02);
      return d;
    },
    [[-0.30, -0.04, -0.28], [0.30, 0.56, 0.28]], 0.015, nightstandMat
  );
  nightstand.position.set(0.58, 0, -1.96); scene.add(nightstand);

  const drawer = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.02), std('#926B50', 0.6)));
  drawer.position.set(0.58, 0.28, -1.76); scene.add(drawer);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), std('#D4B896', 0.4));
  knob.position.set(0.58, 0.28, -1.74); scene.add(knob);

  const lampBase = sdfMesh(
    (p) => capsule(p, [0, 0, 0], [0, 0.19, 0], 0.045, 0.025),
    [[-0.07, -0.04, -0.07], [0.07, 0.24, 0.07]], 0.008,
    std('#D0A066', 0.5)
  );
  lampBase.position.set(0.54, 0.52, -1.98); scene.add(lampBase);

  const lampShade = sdfMesh(
    (p) => capsule(p, [0, 0.04, 0], [0, 0.17, 0], 0.125, 0.075),
    [[-0.16, -0.02, -0.16], [0.16, 0.24, 0.16]], 0.01,
    new THREE.MeshStandardMaterial({ color: '#FFE8BF', roughness: 0.55, emissive: '#FFB95A', emissiveIntensity: 0.85 })
  );
  lampShade.position.set(0.54, 0.72, -1.98); scene.add(lampShade);

  // Small rounded bedside alarm clock
  const clock = sdfMesh(
    (p) => rbox(p, [0, 0.045, 0], [0.055, 0.045, 0.035], 0.015),
    [[-0.08, -0.02, -0.06], [0.08, 0.11, 0.06]], 0.006, std('#424658', 0.5)
  );
  clock.position.set(0.72, 0.52, -1.82); clock.rotation.y = -0.35; scene.add(clock);

  // Warm point light from the lamp (gentle enough not to blow out skin)
  const lampLight = new THREE.PointLight('#FFD79A', 3.2, 6, 1.5);
  lampLight.position.set(0.54, 0.94, -1.82);
  lampLight.castShadow = true; lampLight.shadow.mapSize.set(512, 512);
  scene.add(lampLight);

  // ─── Wall shelf on left with pastel books ───
  const shelfMat = std('#856046', 0.65);
  const shelf = sdfMesh(
    (p) => rbox(p, [0, 0, 0], [0.44, 0.024, 0.10], 0.012),
    [[-0.48, -0.04, -0.12], [0.48, 0.06, 0.12]], 0.01, shelfMat
  );
  shelf.position.set(-0.92, 1.48, -2.30); scene.add(shelf);

  const bookColors = ['#7EA6D9', '#E08A8A', '#88C498', '#E5C675', '#B193D6'];
  for (let i = 0; i < 5; i++) {
    const bw = 0.042, bh = 0.16 + (i % 2) * 0.035;
    const book = sdfMesh(
      (p) => rbox(p, [0, bh / 2, 0], [bw / 2, bh / 2, 0.055], 0.008),
      [[-0.04, -0.01, -0.07], [0.04, bh + 0.02, 0.07]], 0.006,
      std(bookColors[i], 0.75)
    );
    book.position.set(-1.12 + i * 0.056, 1.505, -2.28);
    scene.add(book);
  }

  // ─── Lighting: warm key from lamp side, soft cool ambient ───
  const L = lightRig(scene, {
    key: '#FFE2BA', keyI: 1.85, keyPos: [2.2, 3.0, 1.8],
    target: [bedX, 0.8, bedZ],
    rimCol: '#8FA2D8', rimI: 0.85,
    sky: '#6A7BB0', ground: '#2C324E',
    hemiI: 0.6, shadowBox: 3.5,
  });
  const coolAmb = new THREE.DirectionalLight('#9BB0E8', 0.55);
  coolAmb.position.set(-2.2, 2.5, 3.0); scene.add(coolAmb);

  return { scene, lights: L, bedPos: [bedX, 0.44, bedZ], update(t) {
    lampLight.intensity = 3.6 + Math.sin(t * 3.7) * 0.12 + Math.sin(t * 7.1) * 0.06;
  }};
}

// ═══════════════════════════ LIVING ROOM (bright daytime, cozy) ═══════════════════════════
export function livingRoom(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.4;
  scene.background = new THREE.Color('#EFE3D0'); scene.fog = new THREE.Fog('#EFE3D0', 8, 20);

  // ─── Floor: warm wood ───
  const planks = canvasTex(1024, 1024, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      const l = 160 + (i * 29) % 20;
      g.fillStyle = `rgb(${l + 15},${l - 10},${l - 50})`;
      g.fillRect(0, i * h / 8, w, h / 8);
      g.fillStyle = 'rgba(60,35,15,0.3)';
      g.fillRect(0, i * h / 8, w, 3);
      for (let k = 0; k < 35; k++) {
        g.fillStyle = 'rgba(80,50,25,0.07)';
        g.fillRect(Math.random() * w, i * h / 8 + Math.random() * h / 8, 110 + Math.random() * 180, 2);
      }
    }
  }, [6, 6]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), std('#ffffff', 0.55, { map: planks }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // ─── Walls ───
  const wallM = std('#EFE3D0', 0.9);
  const back = shadowed(new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.2), wallM));
  back.position.set(0, 2.5, -2.5); scene.add(back);
  const side = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 10), wallM));
  side.position.set(-3.5, 2.5, 1); scene.add(side);

  // ─── Window with bright sky ───
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.5),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#DDEEFF').multiplyScalar(1.8) })
  );
  sky.position.set(1.2, 2.1, -2.39); scene.add(sky);
  // window frame
  const frM = std('#FFFFFF', 0.4);
  for (const [fw, fh, fx, fy] of [[1.95, 0.08, 1.2, 2.88], [1.95, 0.08, 1.2, 1.35], [0.08, 1.56, 0.23, 2.1], [0.08, 1.56, 2.17, 2.1], [0.05, 1.5, 1.2, 2.1]]) {
    const b = shadowed(new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.12), frM));
    b.position.set(fx, fy, -2.38); scene.add(b);
  }

  // ─── Couch: soft blue, rounded SDF shapes ───
  const couchMat = std('#7AA8C4', 0.75);
  // seat cushion
  const couchSeat = sdfMesh(
    (p) => rbox(p, [0, 0.22, 0], [0.7, 0.12, 0.28], 0.06),
    [[-0.8, -0.04, -0.38], [0.8, 0.4, 0.38]], 0.025, couchMat
  );
  couchSeat.position.set(-0.5, 0, -1.6); scene.add(couchSeat);
  // back rest
  const couchBack = sdfMesh(
    (p) => rbox(p, [0, 0.3, 0], [0.7, 0.25, 0.08], 0.06),
    [[-0.8, -0.02, -0.12], [0.8, 0.58, 0.12]], 0.025, couchMat
  );
  couchBack.position.set(-0.5, 0.34, -2.0); scene.add(couchBack);
  // armrests
  for (const sx of [-1, 1]) {
    const arm = sdfMesh(
      (p) => rbox(p, [0, 0.18, 0], [0.06, 0.18, 0.24], 0.05),
      [[-0.12, -0.04, -0.32], [0.12, 0.4, 0.32]], 0.02, couchMat
    );
    arm.position.set(-0.5 + sx * 0.76, 0, -1.7); scene.add(arm);
  }
  // couch legs
  const legMat = std('#8B6842', 0.5);
  for (const [lx, lz] of [[-0.6, -1.35], [0.1, -1.35], [-0.6, -1.95], [0.1, -1.95]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.1, 8), legMat);
    leg.position.set(lx, 0.05, lz); scene.add(leg);
  }

  // ─── Coffee table: rounded wood ───
  const tableMat = std('#A07850', 0.55);
  const tableTop = sdfMesh(
    (p) => rbox(p, [0, 0.02, 0], [0.45, 0.02, 0.22], 0.04),
    [[-0.52, -0.04, -0.28], [0.52, 0.08, 0.28]], 0.015, tableMat
  );
  tableTop.position.set(-0.3, 0.35, -0.6); scene.add(tableTop);
  // table legs
  for (const [lx, lz] of [[-0.32, -0.15], [0.32, -0.15], [-0.32, 0.15], [0.32, 0.15]]) {
    const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), tableMat);
    tl.position.set(-0.3 + lx, 0.175, -0.6 + lz); scene.add(tl);
  }

  // ─── Potted plant ───
  const potMat = std('#C8734A', 0.6);
  const pot = sdfMesh(
    (p) => capsule(p, [0, 0, 0], [0, 0.14, 0], 0.08, 0.1),
    [[-0.12, -0.08, -0.12], [0.12, 0.26, 0.12]], 0.01, potMat
  );
  pot.position.set(1.6, 0, -1.8); scene.add(pot);
  // leaves
  const leafMat = std('#5E9A50', 0.6);
  for (let i = 0; i < 7; i++) {
    const leaf = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), leafMat));
    leaf.scale.set(0.5, 1.5, 0.4);
    leaf.position.set(
      1.6 + Math.sin(i * 2.2) * 0.07,
      0.28 + (i % 3) * 0.04,
      -1.8 + Math.cos(i * 2.2) * 0.07
    );
    leaf.rotation.z = Math.sin(i * 2.2) * 0.6;
    scene.add(leaf);
  }

  // ─── Rug: a soft disc on the floor ───
  const rugTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#C4A882'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(180,140,100,0.3)';
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(160,120,85,0.2)';
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2); g.fill();
  });
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 48),
    std('#D4B896', 0.9, { map: rugTex })
  );
  rug.rotation.x = -Math.PI / 2; rug.position.set(-0.3, 0.005, -0.6);
  rug.receiveShadow = true; scene.add(rug);

  // ─── Lighting: warm sunlight streaming through window ───
  const L = lightRig(scene, {
    key: '#FFEDCE', keyI: 2.3, keyPos: [2.5, 3.5, 1.5],
    target: [0, 0.5, -0.5],
    rimCol: '#CFE0FF', rimI: 0.8,
    sky: '#FFF8ED', ground: '#9C7B5E',
    hemiI: 0.7, shadowBox: 3.5,
  });
  const fill = new THREE.DirectionalLight('#FFF5E0', 0.75);
  fill.position.set(-1, 2.5, 4); scene.add(fill);

  // sun beam from the window
  const sunBeam = new THREE.SpotLight('#FFEDCE', 1.2, 10, 0.5, 0.8, 1.5);
  sunBeam.position.set(1.2, 3.5, -2.0);
  sunBeam.target.position.set(0.5, 0, 0);
  scene.add(sunBeam); scene.add(sunBeam.target);

  return { scene, lights: L, update(t) {} };
}

// ═══════════════════════════ THINKING STAGE (minimal, abstract close-up) ═══════════════════════════
export function thinkingStage(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.3;

  // soft gradient background: warm cream to light blue
  scene.background = canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#B8D4E8');   // light blue top
    gr.addColorStop(0.5, '#E8DDD0'); // warm cream middle
    gr.addColorStop(1, '#F2EBE0');   // lighter warm bottom
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

  // subtle ground plane with soft shadow catcher
  const groundMat = new THREE.MeshStandardMaterial({
    color: '#F0E8DC', roughness: 0.9, transparent: true, opacity: 0.6,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0;
  ground.receiveShadow = true; scene.add(ground);

  // very subtle radial gradient on the ground for depth
  const groundDecal = new THREE.Mesh(
    new THREE.CircleGeometry(3, 48),
    new THREE.MeshStandardMaterial({
      color: '#E0D4C6', roughness: 0.95, transparent: true, opacity: 0.35,
    })
  );
  groundDecal.rotation.x = -Math.PI / 2; groundDecal.position.y = 0.002;
  groundDecal.receiveShadow = true; scene.add(groundDecal);

  // ─── Lighting: gentle ambient from all sides ───
  const hemi = new THREE.HemisphereLight('#EAE0D6', '#C8BEB4', 0.65);
  scene.add(hemi);

  // soft key from the front-right — enough for gentle shadows
  const L = lightRig(scene, {
    key: '#FFF4E6', keyI: 1.7, keyPos: [1.5, 3.0, 3.0],
    target: [0, 0.8, 0],
    rimCol: '#D0E0F0', rimI: 0.7,
    sky: '#F0E8DC', ground: '#C8BEB4',
    hemiI: 0.55, shadowBox: 2.5,
  });

  // additional fill from the left for even illumination
  const fillL = new THREE.DirectionalLight('#F0E8DC', 0.55);
  fillL.position.set(-2, 2, 2); scene.add(fillL);

  // back fill for subtle rim separation
  const backFill = new THREE.DirectionalLight('#D0E0F0', 0.4);
  backFill.position.set(0, 2, -3); scene.add(backFill);

  return { scene, lights: L, update(t) {} };
}

// ═══════════════════════════ GENERAL CLAY PROPS & ELEMENTS ═══════════════════════════

/** Animated gentle rippling clay water surface */
export function clayWater({ color = '#4E88B8', opacity = 0.78, size = 10, y = 0.08 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, 24, 24);
  const pos = geo.attributes.position;
  const initialZ = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) initialZ[i] = pos.getZ(i);

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.05,
    transparent: true,
    opacity,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;

  return {
    mesh,
    update(t, height = y) {
      mesh.position.y = height + Math.sin(t * 2.2) * 0.025;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i), v = pos.getY(i);
        const wave = Math.sin(u * 1.5 + t * 2.5) * 0.035 + Math.cos(v * 1.5 + t * 2.0) * 0.035;
        pos.setZ(i, initialZ[i] + wave);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
  };
}

/** Freestanding clay wooden door with swinging door leaf and brass knob */
export function clayDoor({ woodCol = '#856046', panelCol = '#A0683A' } = {}) {
  const group = new THREE.Group();
  const woodMat = std(woodCol, 0.65);
  const panelMat = std(panelCol, 0.6);

  // Door posts & top lintel (standing from y = 0 up to y = 1.85)
  const postGeo = new THREE.BoxGeometry(0.12, 1.85, 0.12);
  const postL = shadowed(new THREE.Mesh(postGeo, woodMat)); postL.position.set(-0.48, 0.925, 0);
  const postR = shadowed(new THREE.Mesh(postGeo, woodMat)); postR.position.set(0.48, 0.925, 0);
  const topGeo = new THREE.BoxGeometry(1.08, 0.12, 0.14);
  const topBar = shadowed(new THREE.Mesh(topGeo, woodMat)); topBar.position.set(0, 1.85, 0);
  group.add(postL, postR, topBar);

  // Door leaf on pivot (swings open)
  const pivot = new THREE.Group();
  pivot.position.set(-0.42, 0.925, 0);
  const leafGeo = new THREE.BoxGeometry(0.84, 1.73, 0.06);
  const leaf = shadowed(new THREE.Mesh(leafGeo, panelMat));
  leaf.position.set(0.42, 0, 0);
  pivot.add(leaf);

  // Cute brass round knob
  const knobMat = new THREE.MeshStandardMaterial({ color: '#FFD43B', roughness: 0.35, metalness: 0.7 });
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 14), knobMat);
  knob.position.set(0.76, 0, 0.05);
  pivot.add(knob);
  group.add(pivot);

  return {
    group,
    pivot,
    setOpen(angle) { pivot.rotation.y = angle; }
  };
}

/** Cute swimming chibi clay fish with wiggling tail fin */
export function clayFish({ color = '#FF7A45', size = 0.22 } = {}) {
  const group = new THREE.Group();
  group.scale.setScalar(size);
  const bodyMat = std(color, 0.6);

  // Rounded body
  const body = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 14), bodyMat));
  body.scale.set(1.4, 0.8, 0.5);
  group.add(body);

  // Small black bead eyes with white reflection
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#1A1A1E' });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), eyeMat);
  eyeL.position.set(0.42, 0.14, 0.22);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), eyeMat);
  eyeR.position.set(0.42, 0.14, -0.22);
  group.add(eyeL, eyeR);

  // Tail fin on pivot for wiggling
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-0.6, 0, 0);
  const finGeo = new THREE.ConeGeometry(0.35, 0.55, 8);
  const fin = shadowed(new THREE.Mesh(finGeo, std(color, 0.55)));
  fin.rotation.z = Math.PI / 2;
  tailPivot.add(fin);
  group.add(tailPivot);

  return {
    group,
    update(t, speed = 6) {
      tailPivot.rotation.y = Math.sin(t * speed) * 0.45;
    }
  };
}

/** Translucent floating clay bubbles */
export function clayBubbles({ count = 10, radius = 1.2 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: '#D4EBFF',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });

  const bubbles = [];
  for (let i = 0; i < count; i++) {
    const r = 0.04 + Math.random() * 0.06;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat);
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = Math.random() * radius;
    const baseY = Math.random() * 1.5;
    const speed = 0.4 + Math.random() * 0.5;
    mesh.position.set(Math.cos(angle) * dist, baseY, Math.sin(angle) * dist);
    group.add(mesh);
    bubbles.push({ mesh, baseY, speed, x: mesh.position.x, z: mesh.position.z });
  }

  return {
    group,
    update(t) {
      for (const b of bubbles) {
        b.mesh.position.y = ((b.baseY + t * b.speed) % 2.0);
        b.mesh.position.x = b.x + Math.sin(t * 2 + b.baseY) * 0.05;
      }
    }
  };
}

/** Freestanding wooden signpost */
export function claySign({ woodCol = '#926B50', postH = 1.1 } = {}) {
  const group = new THREE.Group();
  const woodMat = std(woodCol, 0.7);

  // Post
  const post = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, postH, 8), woodMat));
  post.position.set(0, postH / 2, 0);
  group.add(post);

  // Plaque board
  const board = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.32, 0.06), woodMat));
  board.position.set(0, postH - 0.08, 0.04);
  group.add(board);

  return { group, board };
}

// ═══════════════════════════ ELEVATOR + HALLWAY ═══════════════════════════
export function elevatorHall(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.3;
  scene.background = new THREE.Color('#2B2D3E'); scene.fog = new THREE.Fog('#2B2D3E', 7, 16);

  // Soft matte materials (ceiling & outer walls don't cast shadows so interior key light reaches characters)
  const creamWall = std('#EAE0D2', 0.88);
  const woodPanel = std('#B58863', 0.72);
  const darkWood = std('#78553B', 0.68);
  const metalTrim = std('#8A94A6', 0.55);
  const doorSteel = std('#9AA6B8', 0.6);

  // Helper for rounded box walls/panels (no shadow casting on room shells)
  const roomBox = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m;
  };

  // ─── Cabin Floor (tile clay look) & Ceiling ───
  const tileTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#D5C7B4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,100,80,0.22)'; g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke();
    }
  }, [2, 2]);
  const cabFloor = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.85), std('#ffffff', 0.7, { map: tileTex }));
  cabFloor.rotation.x = -Math.PI / 2; cabFloor.position.set(0, 0, -0.25); cabFloor.receiveShadow = true; scene.add(cabFloor);

  roomBox(2.6, 0.14, 2.9, creamWall, 0, 2.52, -0.25); // cabin ceiling
  const ceilGlow = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.04, 1.4),
    new THREE.MeshStandardMaterial({ color: '#FFF6E0', emissive: '#FFE4B0', emissiveIntensity: 0.75, roughness: 0.5 })
  );
  ceilGlow.position.set(0, 2.44, -0.25); scene.add(ceilGlow);

  // ─── Cabin Back, Left, Right Walls + Wood Wainscoting + Handrail ───
  roomBox(2.55, 1.55, 0.12, creamWall, 0, 1.72, -1.68);
  roomBox(2.55, 0.95, 0.14, woodPanel, 0, 0.48, -1.66);
  for (const sx of [-1, 1]) {
    roomBox(0.12, 1.55, 2.85, creamWall, sx * 1.25, 1.72, -0.25);
    roomBox(0.14, 0.95, 2.85, woodPanel, sx * 1.24, 0.48, -0.25);
  }
  const rail = sdfMesh(
    (p) => capsule(p, [-0.95, 0, 0], [0.95, 0, 0], 0.032, 0.032),
    [[-1.05, -0.06, -0.06], [1.05, 0.06, 0.06]], 0.015, metalTrim
  );
  rail.position.set(0, 0.88, -1.52); scene.add(rail);

  // ─── Front Wall (z = +1.15) framing 1.12w x 1.88h Doorway ───
  roomBox(0.72, 2.52, 0.14, creamWall, -0.92, 1.26, 1.15);
  roomBox(0.72, 2.52, 0.14, creamWall, 0.92, 1.26, 1.15);
  roomBox(0.72, 0.95, 0.16, woodPanel, -0.92, 0.48, 1.15);
  roomBox(0.72, 0.95, 0.16, woodPanel, 0.92, 0.48, 1.15);
  roomBox(1.22, 0.66, 0.14, creamWall, 0, 2.21, 1.15);
  roomBox(0.06, 1.92, 0.18, metalTrim, -0.58, 0.96, 1.15);
  roomBox(0.06, 1.92, 0.18, metalTrim, 0.58, 0.96, 1.15);
  roomBox(1.22, 0.06, 0.18, metalTrim, 0, 1.90, 1.15);

  // ─── Sliding Doors (meet at x=0 when k=0, open to x=±0.86 when k=1) ───
  const mkDoor = () => {
    const g = new THREE.Group();
    const leaf = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.57, 1.87, 0.05), doorSteel));
    leaf.position.set(0, 0.935, 0); g.add(leaf);
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.56, 0.06), std('#8490A4', 0.65));
    groove.position.set(0, 0.94, 0); g.add(groove);
    scene.add(g); return g;
  };
  const doorL = mkDoor(), doorR = mkDoor();
  const setDoors = (k) => {
    const off = 0.285 + Math.max(0, Math.min(1, k)) * 0.58;
    doorL.position.set(-off, 0, 1.14);
    doorR.position.set(off, 0, 1.14);
  };
  setDoors(0);

  // ─── Inner Button Panel (on right inner cabin wall x = +1.17, z = 0.25, facing -x) ───
  const plate = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.48, 0.28), std('#505666', 0.55)));
  plate.position.set(1.17, 1.04, 0.25); scene.add(plate);
  const mkBtnTex = (txt, active) => canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = active ? '#FFD43B' : '#DCE2EC';
    g.beginPath(); g.arc(w / 2, h / 2, 54, 0, Math.PI * 2); g.fill();
    g.strokeStyle = active ? '#B57B00' : '#7A8396'; g.lineWidth = 8; g.stroke();
    g.fillStyle = '#1A1A1E'; g.font = '900 58px Inter, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 4);
  });
  const btns = {};
  const bezelMat = std('#8E98AC', 0.5);
  for (const [label, bz, by] of [['12', 0.16, 1.16], ['7', 0.16, 1.02], ['4', 0.16, 0.88], ['13', 0.34, 1.16], ['9', 0.34, 1.02], ['1', 0.34, 0.88]]) {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.050, 0.024, 20), bezelMat);
    bezel.rotation.z = Math.PI / 2; bezel.position.set(1.148, by, bz); scene.add(bezel);
    const offT = mkBtnTex(label, false), onT = mkBtnTex(label, true);
    const mat = new THREE.MeshStandardMaterial({ map: offT, roughness: 0.45, emissive: '#000000', emissiveIntensity: 0 });
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.046, 24), mat);
    face.rotation.y = -Math.PI / 2;
    face.position.set(1.134, by, bz); scene.add(face);
    btns[label] = { mat, offT, onT };
  }
  const setButton = (num, on) => {
    const b = btns[String(num)]; if (!b) return;
    b.mat.map = on ? b.onT : b.offT;
    b.mat.emissive.set(on ? '#FFB830' : '#000000');
    b.mat.emissiveIntensity = on ? 0.55 : 0;
    b.mat.needsUpdate = true;
  };

  // ─── Digital Floor Display above doors (x = 0, y = 2.04, z = 1.06) ───
  const dispBox = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.20, 0.04), std('#232634', 0.5)));
  dispBox.position.set(0, 2.04, 1.06); scene.add(dispBox);
  const dispTex = canvasTex(256, 128, () => {});
  const dispMat = new THREE.MeshBasicMaterial({ map: dispTex });
  const dispFace = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.15), dispMat);
  dispFace.position.set(0, 2.04, 1.038); dispFace.rotation.y = Math.PI; scene.add(dispFace);
  let _lastFloor = '';
  const setFloor = (txt, alert = false) => {
    const key = `${txt}|${alert ? 1 : 0}`;
    if (key === _lastFloor) return; _lastFloor = key;
    const c = dispTex.image, g = c.getContext('2d');
    g.fillStyle = '#181A24'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = alert ? '#FF595E' : '#FFD43B';
    g.font = '900 84px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(txt), c.width / 2, c.height / 2 + 4);
    dispTex.needsUpdate = true;
  };
  setFloor('1', false);

  // ─── Outside Apartment Hallway (z = 1.15 .. 5.2) ───
  const hallGrp = new THREE.Group(); scene.add(hallGrp);
  const hWoodTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8C6343'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const l = 115 + (i * 23) % 20;
      g.fillStyle = `rgb(${l + 30},${l - 5},${l - 38})`; g.fillRect(0, i * h / 8, w, h / 8);
      g.fillStyle = 'rgba(40,22,10,0.28)'; g.fillRect(0, i * h / 8, w, 3);
    }
  }, [3, 4]);
  const hFloor = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.4), std('#ffffff', 0.65, { map: hWoodTex }));
  hFloor.rotation.x = -Math.PI / 2; hFloor.position.set(0, 0, 3.35); hFloor.receiveShadow = true; hallGrp.add(hFloor);
  const rugTex = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#9C5B52'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#E5C687'; g.lineWidth = 14; g.strokeRect(18, 18, w - 36, h - 36);
  });
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.85), std('#ffffff', 0.9, { map: rugTex }));
  runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.004, 2.85); runner.receiveShadow = true; hallGrp.add(runner);

  const hWallMat = std('#DED0BC', 0.9);
  const hAdd = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.receiveShadow = true; hallGrp.add(m); return m;
  };
  hAdd(3.3, 0.14, 4.4, creamWall, 0, 2.52, 3.35);
  for (const sx of [-1, 1]) {
    hAdd(0.14, 1.55, 4.4, hWallMat, sx * 1.55, 1.72, 3.35);
    hAdd(0.16, 0.95, 4.4, woodPanel, sx * 1.54, 0.48, 3.35);
    const sconce = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.09, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: '#FFE6BA', emissive: '#FFBC66', emissiveIntensity: 0.75, roughness: 0.6 })
    );
    sconce.position.set(sx * 1.41, 1.48, 2.65); hallGrp.add(sconce);
  }
  for (const [fx, fz, col] of [[-1.46, 2.15, '#7EA6D9'], [1.46, 3.35, '#88C498']]) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.34), darkWood);
    fr.position.set(fx, 1.38, fz); hallGrp.add(fr);
    const art = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.32, 0.24), std(col, 0.8));
    art.position.set(fx, 1.38, fz); hallGrp.add(art);
  }

  // Apartment Front Wall + Door Frame (z = +4.65)
  hAdd(1.05, 2.52, 0.14, hWallMat, -1.03, 1.26, 4.65);
  hAdd(1.05, 2.52, 0.14, hWallMat, 1.03, 1.26, 4.65);
  hAdd(1.10, 0.66, 0.14, hWallMat, 0, 2.21, 4.65);
  hAdd(0.08, 1.92, 0.18, darkWood, -0.52, 0.96, 4.65);
  hAdd(0.08, 1.92, 0.18, darkWood, 0.52, 0.96, 4.65);
  hAdd(1.12, 0.08, 0.18, darkWood, 0, 1.90, 4.65);

  const aptPivot = new THREE.Group();
  aptPivot.position.set(-0.48, 0, 4.65); hallGrp.add(aptPivot);
  const aptLeaf = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.86, 0.06), std('#9E6F4B', 0.68)));
  aptLeaf.position.set(0.48, 0.93, 0); aptPivot.add(aptLeaf);
  const aptKnob = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), std('#E8C374', 0.35));
  aptKnob.position.set(0.86, 0.78, -0.05); aptPivot.add(aptKnob);
  const plaqueTex = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#E8C374'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7A5828'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#2B1E12'; g.font = '900 40px Inter, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('4B', w / 2, h / 2 + 2);
  });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.10), std('#ffffff', 0.4, { map: plaqueTex }));
  plaque.position.set(0.48, 1.32, -0.035); plaque.rotation.y = Math.PI; aptPivot.add(plaque);

  const matTex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#B87D4B'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#F2E5C8'; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#4A2E1B'; g.font = '900 40px Inter, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HOME', w / 2, h / 2 + 2);
  });
  const welcomeMat = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.42), std('#ffffff', 0.95, { map: matTex }));
  welcomeMat.rotation.x = -Math.PI / 2; welcomeMat.rotation.z = Math.PI; welcomeMat.position.set(0, 0.008, 4.30); hallGrp.add(welcomeMat);

  const aptBack = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.5), std('#F0D4A8', 0.9));
  aptBack.rotation.y = Math.PI; aptBack.position.set(0, 1.25, 5.85); hallGrp.add(aptBack);
  const aptFloor = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), std('#A07652', 0.7));
  aptFloor.rotation.x = -Math.PI / 2; aptFloor.position.set(0, 0.002, 5.25); hallGrp.add(aptFloor);
  const aptTable = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.56, 0.35), darkWood);
  aptTable.position.set(0.18, 0.28, 5.45); hallGrp.add(aptTable);
  const aptLamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.13, 0.20, 14),
    new THREE.MeshStandardMaterial({ color: '#FFE8BF', emissive: '#FFB95A', emissiveIntensity: 0.9, roughness: 0.5 })
  );
  aptLamp.position.set(0.18, 0.72, 5.45); hallGrp.add(aptLamp);
  const setAptDoorOpen = (k) => { aptPivot.rotation.y = -Math.max(0, Math.min(1, k)) * 1.15; };
  setAptDoorOpen(0.28);

  // ─── Lighting ───
  const L = lightRig(scene, {
    key: '#FFE7C8', keyI: 1.55, keyPos: [1.5, 3.0, 2.5],
    target: [0, 0.85, 0.5],
    rimCol: '#9EB4E8', rimI: 0.75,
    sky: '#E6D8C8', ground: '#6A5B52',
    hemiI: 0.95, shadowBox: 4.5,
  });
  const cabinLight = new THREE.PointLight('#FFE9C8', 2.4, 5.5, 1.4);
  cabinLight.position.set(0, 2.25, -0.1); cabinLight.castShadow = true; cabinLight.shadow.mapSize.set(512, 512);
  scene.add(cabinLight);

  const hallLight = new THREE.PointLight('#FFDEA8', 2.6, 6.5, 1.4);
  hallLight.position.set(0, 2.15, 3.0); scene.add(hallLight);

  const aptGlowLight = new THREE.PointLight('#FFD088', 2.2, 4.5, 1.3);
  aptGlowLight.position.set(0.1, 1.45, 5.1); hallGrp.add(aptGlowLight);

  return {
    scene, lights: L, hallGrp, doorL, doorR,
    setDoors, setButton, setFloor, setAptDoorOpen,
    setHallwayVisible(v) { hallGrp.visible = v; },
    setTension(k) {
      cabinLight.intensity = 2.4 - k * 0.7;
      hallLight.intensity = 2.6 - k * 0.6;
      scene.background.set(k > 0.5 ? '#202236' : '#2B2D3E');
    },
    update(t) {
      aptGlowLight.intensity = 2.0 + Math.sin(t * 2.8) * 0.2;
    }
  };
}

// ═══════════════════════════ OUTDOOR ROLLING HILLS & NATURE ═══════════════════════════
export function outdoorNature(E, { timeOfDay = 'day' } = {}) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.35;

  const isSunset = timeOfDay === 'sunset';
  const isNight = timeOfDay === 'night';
  const skyTop = isNight ? '#1B2238' : (isSunset ? '#E87D5D' : '#6CAAD9');
  const skyMid = isNight ? '#2B3352' : (isSunset ? '#F5B878' : '#BFE0F5');
  const skyBot = isNight ? '#3D4668' : (isSunset ? '#FFE1A8' : '#EAF4FC');
  const fogCol = isNight ? '#252C48' : (isSunset ? '#F0AA7D' : '#9CCBF0');

  scene.background = canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, skyTop); gr.addColorStop(0.55, skyMid); gr.addColorStop(1, skyBot);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog(fogCol, 10, 26);

  // Main ground meadow
  const grassMat = std(isNight ? '#3A5C38' : (isSunset ? '#6B8E4E' : '#76AB5B'), 0.85);
  const groundGeo = new THREE.PlaneGeometry(24, 24);
  const ground = new THREE.Mesh(groundGeo, grassMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0; ground.receiveShadow = true;
  scene.add(ground);

  // Winding dirt walking path
  const pathTex = canvasTex(256, 1024, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#C2A378';
    g.beginPath();
    g.moveTo(w * 0.45, 0);
    g.bezierCurveTo(w * 0.3, h * 0.3, w * 0.65, h * 0.7, w * 0.5, h);
    g.lineTo(w * 0.7, h);
    g.bezierCurveTo(w * 0.85, h * 0.7, w * 0.5, h * 0.3, w * 0.65, 0);
    g.closePath(); g.fill();
  }, [1, 1]);
  const pathOverlay = new THREE.Mesh(new THREE.PlaneGeometry(6, 24), new THREE.MeshStandardMaterial({
    map: pathTex, transparent: true, roughness: 0.9
  }));
  pathOverlay.rotation.x = -Math.PI / 2; pathOverlay.position.set(0, 0.003, 0); pathOverlay.receiveShadow = true;
  scene.add(pathOverlay);

  // Distant rolling hills
  const hillMat1 = std(isNight ? '#2E4C2E' : (isSunset ? '#5C7E42' : '#6A9B50'), 0.9);
  const hillMat2 = std(isNight ? '#243D28' : (isSunset ? '#4E6C38' : '#568442'), 0.9);
  const h1 = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), hillMat1);
  h1.scale.set(1.6, 0.45, 0.8); h1.position.set(-6, -1.2, -9); h1.receiveShadow = true; scene.add(h1);
  const h2 = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), hillMat2);
  h2.scale.set(1.8, 0.5, 0.9); h2.position.set(5.5, -1.5, -11); h2.receiveShadow = true; scene.add(h2);
  const h3 = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14), hillMat1);
  h3.scale.set(1.4, 0.4, 0.7); h3.position.set(0, -1.0, -8); h3.receiveShadow = true; scene.add(h3);

  // Trees, bushes & flowers
  const trees = [];
  const treeCoords = [
    [-3.2, -2.5, 2.1], [-4.0, 0.8, 1.8], [3.5, -2.8, 2.2], [4.2, 0.5, 1.9],
    [-2.2, -5.2, 2.4], [2.8, -5.8, 2.5]
  ];
  for (const [tx, tz, th] of treeCoords) {
    const t = clayTree({ h: th, foliageCol: isSunset ? '#7CA852' : '#6FAF5A' });
    t.group.position.set(tx, 0, tz); scene.add(t.group);
    trees.push(t.group);
  }

  for (const [bx, bz, bs] of [[-1.2, -1.0, 0.45], [1.3, -0.6, 0.5], [-1.4, 1.2, 0.4], [1.4, 1.8, 0.45]]) {
    const b = clayBush({ size: bs });
    b.group.position.set(bx, 0, bz); scene.add(b.group);
  }
  for (const [fx, fz, col] of [[-0.8, -0.4, '#FF7A8A'], [0.9, -1.2, '#FFD43B'], [-0.9, 0.8, '#FF9E54'], [1.0, 0.9, '#8EC5FC']]) {
    const fl = clayFlower({ petalCol: col });
    fl.group.position.set(fx, 0, fz); scene.add(fl.group);
  }

  // Floating gentle puffy clouds
  const clouds = [];
  const cloudCoords = [[-4.5, 5.2, -7], [3.2, 5.8, -8], [-1.0, 6.2, -10], [5.5, 4.8, -6]];
  for (const [cx, cy, cz] of cloudCoords) {
    const c = clayCloud({ size: 1.1 + Math.random() * 0.4 });
    c.group.position.set(cx, cy, cz); scene.add(c.group);
    clouds.push({ group: c.group, baseX: cx, speed: 0.15 + Math.random() * 0.1 });
  }

  const L = lightRig(scene, {
    key: isNight ? '#6E82B8' : (isSunset ? '#FFB074' : '#FFF2D6'),
    keyI: isNight ? 0.7 : (isSunset ? 1.6 : 1.7),
    keyPos: [2.5, 4.5, 3.5],
    target: [0, 0.8, 0],
    rimCol: isNight ? '#4A5B8A' : (isSunset ? '#FF8E66' : '#A8D2F8'),
    rimI: 0.8,
    sky: isNight ? '#2B3858' : (isSunset ? '#F8C292' : '#88BEEC'),
    ground: isNight ? '#223322' : '#5E8848',
    hemiI: isNight ? 0.45 : 0.85,
    shadowBox: 5.5,
  });

  return {
    scene, lights: L, trees, clouds,
    update(t) {
      for (const c of clouds) {
        c.group.position.x = ((c.baseX + t * c.speed + 12) % 24) - 12;
      }
      for (let i = 0; i < trees.length; i++) {
        trees[i].rotation.z = Math.sin(t * 1.5 + i) * 0.02;
      }
    }
  };
}

// ═══════════════════════════ OCEAN & BEACH COAST ═══════════════════════════
export function oceanCoast(E, { deepSea = false, timeOfDay = 'day' } = {}) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.4;

  const isSunset = timeOfDay === 'sunset';
  const isNight = timeOfDay === 'night';
  const skyTop = isNight ? '#10182C' : (isSunset ? '#D46850' : '#4E93CD');
  const skyMid = isNight ? '#1E2C48' : (isSunset ? '#F09C68' : '#99C7EB');
  const skyBot = isNight ? '#324462' : (isSunset ? '#FED59B' : '#DDEEFB');
  const seaWaterCol = isNight ? '#16283E' : (isSunset ? '#3A6A88' : '#3E88BD');

  scene.background = canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, skyTop); gr.addColorStop(0.65, skyMid); gr.addColorStop(1, skyBot);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog(isNight ? '#1D2A42' : (isSunset ? '#E89874' : '#88BBE6'), 10, 28);

  // Large ocean plane with animated wave ripples
  const oceanSize = 36;
  const oceanGeo = new THREE.PlaneGeometry(oceanSize, oceanSize, 36, 36);
  const pos = oceanGeo.attributes.position;
  const initialZ = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) initialZ[i] = pos.getZ(i);

  const oceanMat = new THREE.MeshStandardMaterial({
    color: seaWaterCol,
    roughness: 0.28,
    metalness: 0.08,
    transparent: true,
    opacity: 0.88,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.position.y = 0.08;
  oceanMesh.receiveShadow = true;
  scene.add(oceanMesh);

  let beachMesh = null;
  if (!deepSea) {
    const sandTex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#E8CFA4'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 200; i++) {
        g.fillStyle = 'rgba(160,130,90,0.08)';
        g.fillRect(Math.random() * w, Math.random() * h, 14, 6);
      }
    }, [4, 4]);
    const sandMat = std('#ffffff', 0.9, { map: sandTex });
    const sandGeo = new THREE.PlaneGeometry(18, 12);
    beachMesh = new THREE.Mesh(sandGeo, sandMat);
    beachMesh.rotation.x = -Math.PI / 2;
    beachMesh.position.set(0, 0.04, 3.5);
    beachMesh.receiveShadow = true;
    scene.add(beachMesh);

    const foamTex = canvasTex(256, 32, (g, w, h) => {
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath();
      for (let x = 0; x <= w; x += 16) {
        g.arc(x, h / 2, 8 + Math.sin(x * 0.2) * 4, 0, Math.PI * 2);
      }
      g.fill();
    });
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.6), new THREE.MeshBasicMaterial({
      map: foamTex, transparent: true, opacity: 0.75
    }));
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(0, 0.09, -0.4);
    scene.add(foam);
  }

  // Distant horizon clay islands
  const islandMat = std(isNight ? '#1E2C38' : (isSunset ? '#5A6E6E' : '#4E7E7A'), 0.85);
  const island1 = new THREE.Mesh(new THREE.SphereGeometry(8, 20, 14), islandMat);
  island1.scale.set(1.8, 0.25, 0.8);
  island1.position.set(-8, -0.8, -14);
  scene.add(island1);

  const island2 = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 14), islandMat);
  island2.scale.set(1.4, 0.22, 0.7);
  island2.position.set(7, -0.8, -15);
  scene.add(island2);

  const seaClouds = [];
  for (const [cx, cy, cz] of [[-6, 5.5, -12], [4, 6.2, -14], [-1, 5.0, -10], [8, 5.8, -11]]) {
    const c = clayCloud({ size: 1.3 + Math.random() * 0.5 });
    c.group.position.set(cx, cy, cz); scene.add(c.group);
    seaClouds.push({ group: c.group, baseX: cx, speed: 0.12 + Math.random() * 0.08 });
  }

  const L = lightRig(scene, {
    key: isNight ? '#7A94C8' : (isSunset ? '#FF9A68' : '#FFF0D0'),
    keyI: isNight ? 0.75 : (isSunset ? 1.6 : 1.7),
    keyPos: [2.0, 4.0, 3.0],
    target: [0, 0.5, 0],
    rimCol: isNight ? '#3E507A' : (isSunset ? '#FFAA88' : '#7EC0F8'),
    rimI: 0.9,
    sky: isNight ? '#223454' : (isSunset ? '#E89874' : '#68A8E0'),
    ground: isNight ? '#162232' : (isSunset ? '#4A626E' : '#305874'),
    hemiI: isNight ? 0.45 : 0.85,
    shadowBox: 6.0,
  });

  return {
    scene, lights: L, oceanMesh, beachMesh, seaClouds,
    update(t) {
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i), v = pos.getY(i);
        const wave = Math.sin(u * 0.8 + t * 2.0) * 0.05 + Math.cos(v * 0.7 + t * 1.6) * 0.05;
        pos.setZ(i, initialZ[i] + wave);
      }
      pos.needsUpdate = true;
      oceanGeo.computeVertexNormals();

      for (const c of seaClouds) {
        c.group.position.x = ((c.baseX + t * c.speed + 16) % 32) - 16;
      }
    }
  };
}

// ═══════════════════════════ NATURE PROPS ═══════════════════════════

/** Cute chibi clay tree with clustered spherical foliage */
export function clayTree({ h = 1.8, foliageCol = '#6FAF5A', trunkCol = '#825D44' } = {}) {
  const group = new THREE.Group();
  const trunkMat = std(trunkCol, 0.75);
  const leafMat = std(foliageCol, 0.7);

  const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, h * 0.6, 10);
  const trunk = shadowed(new THREE.Mesh(trunkGeo, trunkMat));
  trunk.position.set(0, h * 0.3, 0);
  group.add(trunk);

  const topY = h * 0.75;
  const leafGeo = new THREE.SphereGeometry(0.38, 14, 12);
  const leafCenter = shadowed(new THREE.Mesh(leafGeo, leafMat));
  leafCenter.position.set(0, topY, 0);
  group.add(leafCenter);

  for (const [ox, oy, oz, sc] of [
    [-0.22, -0.06, 0.1, 0.8], [0.22, -0.04, -0.08, 0.82],
    [0.08, 0.18, 0.12, 0.75], [-0.12, 0.16, -0.12, 0.72]
  ]) {
    const clump = shadowed(new THREE.Mesh(leafGeo, leafMat));
    clump.scale.set(sc, sc, sc);
    clump.position.set(ox, topY + oy, oz);
    group.add(clump);
  }

  return { group };
}

/** Rounded chibi clay bush */
export function clayBush({ color = '#78B864', size = 0.55 } = {}) {
  const group = new THREE.Group();
  const mat = std(color, 0.75);
  const geo = new THREE.SphereGeometry(size * 0.6, 12, 10);

  const main = shadowed(new THREE.Mesh(geo, mat));
  main.position.set(0, size * 0.45, 0);
  group.add(main);

  for (const [ox, oy, oz, sc] of [
    [-size * 0.4, 0, 0, 0.75], [size * 0.38, 0, -size * 0.1, 0.72],
    [0, size * 0.2, size * 0.25, 0.65]
  ]) {
    const sub = shadowed(new THREE.Mesh(geo, mat));
    sub.scale.set(sc, sc, sc);
    sub.position.set(ox, size * 0.35 + oy, oz);
    group.add(sub);
  }

  return { group };
}

/** Tuft of stubby clay grass blades */
export function clayGrassPatch({ count = 8, radius = 0.45, color = '#7EB56B' } = {}) {
  const group = new THREE.Group();
  const mat = std(color, 0.8);
  const bladeGeo = new THREE.ConeGeometry(0.028, 0.28, 6);

  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const r = (0.2 + Math.random() * 0.8) * radius;
    const blade = shadowed(new THREE.Mesh(bladeGeo, mat));
    blade.position.set(Math.cos(ang) * r, 0.14, Math.sin(ang) * r);
    blade.rotation.x = (Math.random() - 0.5) * 0.35;
    blade.rotation.z = (Math.random() - 0.5) * 0.35;
    blade.rotation.y = Math.random() * Math.PI;
    group.add(blade);
  }

  return { group };
}

/** Tiny cheerful clay daisy / flower */
export function clayFlower({ petalCol = '#FF7A8A', centerCol = '#FFD43B', stemCol = '#5EA84A', scale = 1.0 } = {}) {
  const group = new THREE.Group();
  group.scale.set(scale, scale, scale);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.32, 6), std(stemCol, 0.7));
  stem.position.set(0, 0.16, 0);
  group.add(stem);

  const center = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), std(centerCol, 0.6));
  center.position.set(0, 0.32, 0);
  group.add(center);

  const petalGeo = new THREE.SphereGeometry(0.032, 8, 6);
  const petalMat = std(petalCol, 0.65);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new THREE.Mesh(petalGeo, petalMat);
    p.scale.set(1.2, 0.6, 1.0);
    p.position.set(Math.cos(a) * 0.052, 0.32, Math.sin(a) * 0.052);
    group.add(p);
  }

  return { group };
}

/** Soft floating clay cloud */
export function clayCloud({ size = 1.0, color = '#FFFFFF', opacity = 0.95 } = {}) {
  const group = new THREE.Group();
  group.scale.set(size, size, size);
  const mat = std(color, 0.65, { transparent: opacity < 1.0, opacity });
  const puffGeo = new THREE.SphereGeometry(0.42, 12, 10);

  const center = shadowed(new THREE.Mesh(puffGeo, mat));
  center.scale.set(1.3, 0.8, 0.9);
  group.add(center);

  for (const [ox, oy, oz, sx, sy, sz] of [
    [-0.38, -0.05, 0, 0.9, 0.65, 0.75],
    [0.38, -0.06, 0, 0.85, 0.6, 0.7],
    [-0.15, 0.18, 0.05, 0.8, 0.75, 0.7],
    [0.18, 0.15, -0.05, 0.75, 0.7, 0.65]
  ]) {
    const puff = shadowed(new THREE.Mesh(puffGeo, mat));
    puff.scale.set(sx, sy, sz);
    puff.position.set(ox, oy, oz);
    group.add(puff);
  }

  return { group };
}

/** Smooth rounded clay boulder / rock */
export function clayRock({ color = '#8A92A0', size = 0.45 } = {}) {
  const group = new THREE.Group();
  const mat = std(color, 0.8);
  const geo = new THREE.SphereGeometry(size * 0.5, 8, 6);
  const rock = shadowed(new THREE.Mesh(geo, mat));
  rock.scale.set(1.3, 0.75, 1.0);
  rock.position.set(0, size * 0.35, 0);
  group.add(rock);
  return { group };
}

