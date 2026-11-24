// End-to-end Pipeline Orchestrator for Faceless Shorts & Google Sheets
// Handles API authentication, row claiming, project scaffolding, and status management.
// Creative scriptwriting and 3D scene choreography are delegated to the AI Agent.
import fs from 'node:fs';
import path from 'node:path';
import { SheetsClient, STATUS_ENUM } from './sheets_client.js';
import { validateNarrative } from './validate.js';
import { saveProjectMetadata, readProjectMetadata, updateProjectMetadata } from './script_prep.js';
import { maskToken } from './config.js';
import { getDefaultProjectsDir, scaffoldProject, findPythonExecutable } from './exec_utils.js';

export class PipelineLogger {
  constructor(logDir) {
    this.logDir = logDir || path.resolve(import.meta.dirname, '../logs');
    try {
      fs.mkdirSync(this.logDir, { recursive: true });
    } catch {}
    this.logFile = path.join(this.logDir, 'pipeline.log');
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let entry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (data) {
      const sanitized = JSON.stringify(data, (key, value) => {
        if (/token|secret|password|key/i.test(key) && typeof value === 'string') {
          return maskToken(value);
        }
        return value;
      });
      entry += ` ${sanitized}`;
    }
    console.log(entry);
    try {
      fs.appendFileSync(this.logFile, entry + '\n', 'utf8');
    } catch {}
  }

  info(msg, data) { this.log('INFO', msg, data); }
  warn(msg, data) { this.log('WARN', msg, data); }
  error(msg, data) { this.log('ERROR', msg, data); }
}

export class PipelineOrchestrator {
  constructor(options = {}) {
    this.client = options.client || new SheetsClient(options);
    this.logger = options.logger || new PipelineLogger(options.logDir);
    this.skillRoot = path.resolve(
      options.skillRoot ||
      path.resolve(import.meta.dirname, '../.agents/skills/faceless-shorts')
    );
    this.projectsRoot = path.resolve(options.projectsRoot || options.outputBaseDir || getDefaultProjectsDir());
    this.style = options.style || 'clay-world';
  }

  // Scaffolds a clean project folder for the narrative ID using original skill template
  // Template data (audio/timings) is purged to prevent cross-narrative contamination.
  scaffoldProject(narrativeId) {
    return scaffoldProject({
      skillRoot: this.skillRoot,
      style: this.style,
      name: narrativeId,
      parentDir: this.projectsRoot
    });
  }

  // Claims the next pending narrative from Google Sheets, validates it,
  // and scaffolds a clean project directory for the AI Agent to process.
  async claimNextNarrative() {
    this.logger.info('Calling claimNext on Google Sheets API...');
    const rawNarrative = await this.client.claimNext();

    if (!rawNarrative) {
      this.logger.info('No pending narratives found in library. Exiting.');
      return { status: 'NO_PENDING', narrative: null };
    }

    const claimedId = rawNarrative.ID || rawNarrative.id;
    this.logger.info(`Claimed narrative: ID=${claimedId}, Title="${rawNarrative.Title || rawNarrative.title}"`);

    // Validate narrative fields
    const validation = validateNarrative(rawNarrative);
    if (!validation.valid) {
      const errorDetails = validation.errors.join('; ');
      this.logger.error(`Validation failed for ${claimedId}: ${errorDetails}`);

      if (claimedId) {
        try {
          await this.client.updateStatus(claimedId, STATUS_ENUM.FAILED);
          this.logger.info(`Marked ${claimedId} as Failed on Google Sheet.`);
        } catch (updateErr) {
          this.logger.error(`Failed to update status for ${claimedId}: ${updateErr.message}`);
        }
      }

      return {
        status: 'VALIDATION_FAILED',
        id: claimedId,
        errors: validation.errors
      };
    }

    const narrative = validation.narrative;

    // Scaffold clean project directory
    const projectDir = this.scaffoldProject(narrative.id);

    // Save narrative metadata for the AI Agent
    const metadata = saveProjectMetadata(projectDir, narrative, {
      style: this.style,
      status: STATUS_ENUM.PROCESSING
    });

    this.logger.info(`Clean project scaffolded for AI Agent at: ${projectDir}`);

    return {
      status: 'CLAIMED',
      id: narrative.id,
      projectDir,
      narrative,
      metadata
    };
  }

  // Unified method to process or claim a narrative
  async processOneNarrative(options = {}) {
    const {
      mode = 'claim', // 'claim' | 'next' | 'byId'
      id = null,
      dryRun = false
    } = options;

    this.logger.info(`Starting narrative processing (mode: ${mode}, dryRun: ${dryRun})`);
    this.logger.info(`Projects root directory: ${this.projectsRoot}`);

    if (mode === 'next') {
      this.logger.info('Calling next on Google Sheets API (preview only)...');
      const narrative = await this.client.getNext();
      if (!narrative) {
        this.logger.info('No pending narratives found in library.');
        return { status: 'NO_PENDING', narrative: null };
      }
      return { status: 'PREVIEW', narrative };
    }

    if (mode === 'byId') {
      if (!id) throw new Error('Narrative ID must be specified when using byId mode.');
      this.logger.info(`Fetching narrative by ID: ${id}`);
      const rawNarrative = await this.client.getById(id);
      if (!rawNarrative) {
        throw new Error(`Narrative with ID '${id}' not found.`);
      }

      const validation = validateNarrative(rawNarrative);
      if (!validation.valid) {
        return { status: 'VALIDATION_FAILED', id, errors: validation.errors };
      }

      const narrative = validation.narrative;
      const projectDir = this.scaffoldProject(narrative.id);
      const metadata = saveProjectMetadata(projectDir, narrative, {
        style: this.style,
        status: rawNarrative.Status || STATUS_ENUM.PROCESSING
      });

      return {
        status: 'CLAIMED',
        id: narrative.id,
        projectDir,
        narrative,
        metadata
      };
    }

    // Default mode: claim
    return await this.claimNextNarrative();
  }

  // Verifies that all required generation artifacts exist on disk
  verifyProjectArtifacts(narrativeId, { requireVideo = false } = {}) {
    const projectDir = path.join(this.projectsRoot, narrativeId);
    const missing = [];

    if (!fs.existsSync(projectDir)) {
      return {
        valid: false,
        projectDir,
        missing: ['Project directory does not exist']
      };
    }

    const checks = [
      { name: 'metadata.json', file: path.join(projectDir, 'metadata.json') },
      { name: 'script.json', file: path.join(projectDir, 'script.json') },
      { name: 'src/shots.js', file: path.join(projectDir, 'src/shots.js') }
    ];

    for (const c of checks) {
      if (!fs.existsSync(c.file)) {
        missing.push(c.name);
      }
    }

    // Check script.json validity
    if (fs.existsSync(path.join(projectDir, 'script.json'))) {
      try {
        const script = JSON.parse(fs.readFileSync(path.join(projectDir, 'script.json'), 'utf8'));
        if (!Array.isArray(script.lines) || script.lines.length === 0) {
          missing.push('script.json (lines array is empty)');
        }
      } catch {
        missing.push('script.json (invalid JSON)');
      }
    }

    // Check voice & words
    const narrationWav = path.join(projectDir, 'data/narration.wav');
    const wordsJson = path.join(projectDir, 'data/words.json');
    if (!fs.existsSync(narrationWav)) missing.push('data/narration.wav');
    if (!fs.existsSync(wordsJson)) missing.push('data/words.json');

    // Video & QA checks (for Ready for Review status)
    const videoFile = path.join(projectDir, `renders/${narrativeId}.mp4`);
    const reviewSheet = path.join(projectDir, 'review/all.jpg');

    if (requireVideo) {
      if (!fs.existsSync(videoFile)) {
        missing.push(`renders/${narrativeId}.mp4`);
      } else {
        const stats = fs.statSync(videoFile);
        if (stats.size === 0) missing.push(`renders/${narrativeId}.mp4 (0 bytes)`);
      }

      if (!fs.existsSync(reviewSheet)) {
        missing.push('review/all.jpg');
      }
    }

    return {
      valid: missing.length === 0,
      projectDir,
      missing,
      artifacts: {
        video: fs.existsSync(videoFile) ? videoFile : null,
        reviewSheet: fs.existsSync(reviewSheet) ? reviewSheet : null,
        script: path.join(projectDir, 'script.json')
      }
    };
  }

  // Marks a narrative Ready for Review after strictly verifying that the video and QA sheet exist
  async markReadyForReview(narrativeId) {
    this.logger.info(`Verifying artifacts for ${narrativeId} before marking Ready for Review...`);
    const verification = this.verifyProjectArtifacts(narrativeId, { requireVideo: true });

    if (!verification.valid) {
      const msg = `Cannot mark ${narrativeId} Ready for Review. Missing artifacts: ${verification.missing.join(', ')}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    this.logger.info(`Updating status to 'Ready for Review' for ${narrativeId} on Google Sheets...`);
    await this.client.updateStatus(narrativeId, STATUS_ENUM.READY_FOR_REVIEW);

    const projectDir = path.join(this.projectsRoot, narrativeId);
    updateProjectMetadata(projectDir, { status: STATUS_ENUM.READY_FOR_REVIEW });

    this.logger.info(`Successfully updated ${narrativeId} to 'Ready for Review'!`);
    return {
      status: STATUS_ENUM.READY_FOR_REVIEW,
      id: narrativeId,
      artifacts: verification.artifacts
    };
  }

  // Updates status on Google Sheets
  async updateStatus(narrativeId, status) {
    const validStatuses = Object.values(STATUS_ENUM);
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    this.logger.info(`Updating status to '${status}' for ${narrativeId}...`);
    await this.client.updateStatus(narrativeId, status);

    const projectDir = path.join(this.projectsRoot, narrativeId);
    if (fs.existsSync(projectDir)) {
      updateProjectMetadata(projectDir, { status });
    }

    return { status, id: narrativeId };
  }
}
