# Faceless Shorts Pipeline (Clay World 3D)

Automated, code-driven 3D animated YouTube Shorts and Instagram Reels generator with high-fidelity local AI voice, word-synced captions, and Google Sheets orchestration.

---

## Overview

This pipeline transforms short story narratives from a centralized Google Sheet into fully rendered vertical videos (1080×1920, 30 fps) in the **Clay World 3D** aesthetic. Every stage of production is 100% code:

- **3D Graphics & Sets:** Procedural Three.js WebGL scenes rendered headlessly via Chrome.
- **Character Animation:** Expressive chibi clay figures with walk cycles, head tilts, reaching gestures, and 8 facial emotions.
- **AI Voice Narration:** Kokoro-82M neural TTS featuring the **Broadcaster Blend** (65% Michael + 35% Fenrir) with studio EQ mastering (80 Hz high-pass, 220 Hz chest warmth, 3.2 kHz presence clarity).
- **Word-Synced Captions:** Faster-Whisper word-level alignment with animated comic text accents (`pill`, `shockMarks`, `thought`, `whisperBubble`).
- **Sound Effects & Music:** Procedural audio cues (whooshes, pops, slams, footsteps) ducked under a tension soundtrack.
- **Publishing & Synchronization:** Automated Google Sheets claiming, status tracking, and direct-to-platform YouTube Shorts resumable uploads.

---

## Architecture & Layout

```text
faceless-shorts-skill/
├── bin/
│   ├── run-narrative.js           # Main CLI entrypoint (claim, verify, publish, status)
│   └── auth-youtube.js            # YouTube OAuth 2.0 token generator
├── src/
│   ├── config.js                  # Environment configuration and token masking
│   ├── exec_utils.js              # Binary discovery and process runners
│   ├── pipeline.js                # Narrative lifecycle and project scaffolding
│   ├── script_prep.js             # Project metadata persistence
│   ├── sheets_client.js           # Google Apps Script Web App API client
│   ├── validate.js                # Narrative schema validation
│   └── publish/
│       ├── index.js               # Unified multi-platform publisher
│       ├── youtube.js             # YouTube Data API v3 Shorts publisher
│       └── instagram.js           # Meta Graph API Reels publisher
├── tests/
│   ├── pipeline.test.js           # Scaffolding and lifecycle integration tests
│   ├── publish.test.js            # YouTube and Instagram upload tests
│   ├── sheets_client.test.js      # Apps Script API integration tests
│   ├── validate.test.js           # Schema validation tests
│   └── mock_apps_script.js        # Offline mock server for test suite
├── .agents/skills/faceless-shorts/
│   ├── SKILL.md                   # Agentic skill instructions
│   ├── scripts/
│   │   ├── voice.py               # Kokoro TTS with Broadcaster Blend and studio mastering
│   │   └── words.py               # Whisper word-level timestamp alignment
│   └── styles/
│       └── clay-world/            # Clay World 3D engine, components, and sets
│           ├── STYLE.md           # Style guide and 3D API reference
│           ├── style-sheet.png    # Visual look reference
│           └── example/           # Base project template with Three.js engine
├── .env.example                   # Template for required environment variables
├── package.json                   # Project scripts and dependencies
└── README.md                      # Documentation
```

---

## Prerequisites

1. **Node.js**: v20+ (with npm)
2. **Python**: v3.10+ with `virtualenv` containing:
   - `kokoro-onnx` (and ONNX runtime)
   - `faster-whisper`
   - `scipy`, `numpy`
3. **FFmpeg & FFprobe**: Added to system `PATH`
4. **Google Chrome**: Standard installation for headless WebGL frame capture

---

## Quick Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd faceless-shorts-skill
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Google Apps Script URL, token, and API credentials:
   ```ini
   FACELESS_PYTHON=C:/Users/username/.faceless-shorts/venv/Scripts/python.exe
   APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
   APPS_SCRIPT_TOKEN=your_secret_token
   YOUTUBE_CLIENT_ID=your_id.apps.googleusercontent.com
   YOUTUBE_CLIENT_SECRET=your_secret
   YOUTUBE_REFRESH_TOKEN=your_refresh_token
   ```

4. **Run Test Suite:**
   ```bash
   npm test
   ```
   Ensures all 31 unit and integration tests pass with 100% coverage.

---

## CLI Usage

The CLI (`bin/run-narrative.js`) manages the complete story lifecycle:

### 1. Inspect Environment
```bash
node bin/run-narrative.js --config
```

### 2. Preview Next Pending Narrative
```bash
node bin/run-narrative.js --next
```

### 3. Claim and Scaffold Narrative
Claims the next `Pending` row from Google Sheets and prepares a clean project folder:
```bash
node bin/run-narrative.js --claim
```

### 4. Verify Generation Artifacts
Verifies that the script, narration, word timings, sound mix, QA contact sheet, and final MP4 exist:
```bash
node bin/run-narrative.js --verify DREAM-005
# Or auto-detect the latest project:
node bin/run-narrative.js --verify
```

### 5. Publish to YouTube Shorts
Uploads the Short via resumable upload, verifies metadata, and sets Google Sheet status to `Published`:
```bash
node bin/run-narrative.js --publish-yt DREAM-005
# Or auto-detect and publish the most recent render:
node bin/run-narrative.js --publish-yt
```

---

## 3D Clay World Environments

The pipeline includes built-in procedural sets ready to dress any scene:

- `SETS.bedroom(E)`: Cozy bedroom with bed, wardrobe, rug, nightstand, and lamp.
- `SETS.livingRoom(E)`: Modern living space with sofa, television, coffee table, and gallery art.
- `SETS.elevatorHall(E)`: Mysterious apartment hallway with elevator doors and indicator lights.
- `SETS.outdoorNature(E, { timeOfDay })`: Rolling clay hills, stone path, clay trees, bushes, flowers, and clouds.
- `SETS.oceanCoast(E, { deepSea, timeOfDay })`: Animated vertex waves, sandy shoreline, foam line, and distant islands.

---

## Unattended Daily Automation

For hands-free operation, this repository is pre-configured to run as an **Antigravity Sidecar Automation** every morning at **10:30 AM IST**:

1. Claims the next pending narrative from Google Sheets.
2. Generates the Broadcaster voice and Whisper timings.
3. Choreographs custom 3D clay scenes with dynamic camera tracking and comic accents.
4. Renders the contact sheet and high-definition vertical MP4.
5. Uploads directly to YouTube Shorts and writes back the live URL.

---

## License

MIT License. Free for personal and commercial content production.
