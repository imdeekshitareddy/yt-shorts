# Clay World 3D: cute chibi characters in cozy 3D scenes, 9:16

Warm, wholesome, relatable. Cute chibi 3D characters built like vinyl/clay toys — big round heads, dot eyes,
stubby limbs — acting in cozy everyday 3D rooms: bedrooms, living rooms, kitchens. Matte clay material, soft warm
lighting, gentle camera moves. The characters show emotions through expressive faces (8 expressions). Stories feel
like a friend telling you something interesting while sitting on a couch.
Example: `example/` = **WHAT HAPPENS WHEN YOU DON'T SLEEP?** (38 s, 10 shots). Sheet: `style-sheet.png`
(regenerate it by opening `example/sheet.html` through `node tools/capture.mjs preview`).

## 1. The look (rules)
- **Characters are chibi vinyl/clay toys.** Big spherical head (~40% of height), dot eyes with white highlight,
  tiny nose, bean torso, stubby cylinder arms and legs, hemisphere shoes. Matte clay material (roughness 0.75,
  subtle sheen), never glossy or wet-looking.
- **Expressions do the acting.** 8 expressions: `neutral`, `happy`, `laugh`, `surprised`, `thinking`, `sad`,
  `angry`, `wink`. Change expression on the beat — `surprised` on a reveal, `thinking` on a question, `happy`
  on good news, `sad` on bad news. `.express('surprised')` on the character.
- **Cozy everyday places.** Bedrooms, living rooms, kitchens — warm and domestic, never dark or scary.
  Night scenes use soft blue-purple with a warm lamp glow, not pitch black.
- **Palette:** skin `#EDBE9C` · blush `#EA8D7C` · hair `#5C3A24` · shirt white `#F2EEE8` · shirt yellow `#FFD06A`
  · trim blue `#5B8CC9` · jeans `#4E6FB8` · shoes `#F2F2F2` · room warm `#EFE3D0` · room night `#4A5886`
  · lamp `#FFE4B5` · bed blue `#6D8DC9` · accent yellow `#FFD43B` · ink `#1A1A1E`.
- **Warm and soft lighting.** No harsh shadows. Key light is warm (#FFE8D0), strong hemisphere ambient for that
  toy-shelf look. Night scenes: warm lamp + cool blue ambient. No dramatic chiaroscuro.
- **Shallow focus:** gentle depth of field (aperture 0.001–0.003), softer than Deep Dive.
- **The camera moves gently:** slow push-ins, gentle orbits, slight crane moves. No fast cuts; this style is
  calmer. New shot every 2–4 s.
- **No gore, no x-ray, no inside-body.** This is wholesome content. Problems shown through expressions,
  visual metaphors (thought bubbles, Zzz, shock marks), and environmental cues (messy room, dark circles).
- Captions: sentence case, 1-3 words, white with dark outline, one yellow word (y 1480).

## 2. Format
- 1080x1920, 24 fps, 30-45 s.
- **Voice & Modulation**: Use Kokoro TTS (`voice.py`). For rich, lively storytelling modulation:
  - `bm_fable` (UK male, expressive storyteller with deep vocal dynamics - recommended for dreams & stories)
  - `am_puck` (US male, lively and playful)
  - `af_heart` (US female, warm & expressive)
  - `am_michael` (US male, calm explainer)
  - **Punctuation shapes modulation**: Always include natural punctuation in line scripts (`!`, `?`, `—`, `...`, `,`) — the neural voice generator derives pitch contours and emotional emphasis from punctuation.
- One line = one shot (cut just before the line: `cut(i)`). Shots are 2-4 s; this style breathes more.
- Music: `"bed"` (light, warm ambient) for most topics. `"tension"` only if there's genuine suspense.

## 3. Engine map (`example/src/`)
| file | gives you |
|---|---|
| `core/engine.js` | `makeEngine(canvas)` → `E.render(scene, cam, look)`: ACES tone, soft shadows, warm ambient, gentle bloom, DoF, vignette + grain. `look = { focus, aperture, maxblur, bloom, bloomThreshold, exposure, vignette, grain, warm }`. `lightRig(scene, {...})`, `camera(fov)` |
| `core/sdf.js` | sculpting: `sphere, ellipsoid, capsule, rbox, torus, smin/smax/ssub, noise3`, `mesh(sdf, bounds, step, colorFn)` — same as Deep Dive |
| `core/human.js` | `new ClayHuman(look)`: `.group` (feet at y 0, ~1.42 units tall), `.pose({spine, head, shL, elL, shR, elR, hipL, knL, hipR, knR, lid, look})` (degrees), `.walk(phase, amt)`, `.express(name)` (`neutral`/`happy`/`laugh`/`surprised`/`thinking`/`sad`/`angry`/`wink`), `.head`, `.spine`, `.hips` groups. Look: `{ skin, blush, shirt, shirtTrim, pants, shoes, hair, hairStyle: 'quiff'│'ponytail', scrunchie, scale }` |
| `core/sets.js` | **Environments**: `bedroom(E)`, `livingRoom(E)`, `elevatorHall(E)`, `outdoorNature(E, { timeOfDay })` (rolling hills, path, trees, flowers, clouds), `oceanCoast(E, { deepSea, timeOfDay })` (water swells, beach shoreline, sea clouds), `thinkingStage(E)`.<br>**Reusable Clay Props**: `clayWater(...)`, `clayDoor(...)`, `clayFish(...)`, `clayBubbles(...)`, `claySign(...)`, `clayTree(...)`, `clayBush(...)`, `clayGrassPatch(...)`, `clayFlower(...)`, `clayCloud(...)`, `clayRock(...)`. |
| `core/look2d.js` | 2D overlays: `caption`, `label`, `pill(text, x, y, sc)`, `thought(text, x, y, sc)`, `shockMarks(x, y, sc)`, `sleepZzz(x, y, sc, t)`, `warning(x, y, sc)` or `warning(text, x, y, sc)`, `drowsy(k)`, `whisperBubble(text, x, y, sc, tint, tailDir)`, `voiceWaves(x, y, sc, t, dir)` |
| `src/shots.js` | the per-video file |
| `src/main.js` | boot, renders 3D → 2D, fades, `window.OP` for capture |

## 4. A shot
```js
add({ id: 'S03', at: cut(2), note: 'hero yawns in bed, rubbing eyes', draw(lt, d, t, blit) {
  hero.express(lerp(lt, 0, 0.8) < 0.5 ? 'neutral' : 'sad');
  hero.pose({ head: [-6, 4 * Math.sin(lt), 0], spine: [3, 0, 0], shR: [60, 0, -10], elR: 90 });
  cam.position.copy(lerpV(V3(0.5, 1.4, 1.8), V3(0.3, 1.35, 1.3), eio(lt / d))); cam.lookAt(0, 1.2, 0);
  E.render(B.scene, cam, { ...BLOOK, focus: cam.position.distanceTo(V3(0, 1.2, 0)) }); blit();
  sleepZzz(820, 300, eob(seg(lt, 0, 0.3)), t);
} });
cue(st, 'whoosh'); cue(st + 0.3, 'pop', { gain: 0.4 });
```
Keep the hero and key objects between y 200 and 1250 so the caption (y 1350-1550) never covers them.

**Sound cues** same as all styles: `whoosh` (every cut) · `pop` · `slide` · `boing` · `thud` · `tock` · `sparkle` · `alarm`.

## 5. Rendering speed
Same as Deep Dive: 3D frames are heavy without a GPU. With one it's fast. Without:
`SOFTWARE_GL=1 QS='&res=0.6&aa=0&shadow=1024' FPS=24` (≈2-3 s/frame).

## 6. QA pitfalls
- **Expression not matching the narration:** if the line says something surprising, the character must look surprised.
  Check `.express()` calls against the script.
- **Camera too close to a chibi head:** the head is proportionally huge; keep the camera far enough that
  it doesn't distort (fov 30-34, distance > 0.8 from the face).
- **Character floating above the bed/floor:** check `.group.position.y` matches the furniture height.
  Bed surface ≈ y 0.45; standing floor = y 0.
- **Overlays on the face:** thought bubbles, shock marks and Zzz should be offset above/beside the head,
  not covering eyes or mouth.
- **Night scenes too dark:** the lamp must be bright enough; check exposure ≥ 0.9 for bedroom scenes.

