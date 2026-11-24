#!/usr/bin/env node
// CLI Entrypoint to inspect, claim, verify, and update narratives from Google Sheets
import fs from 'node:fs';
import path from 'node:path';
import { PipelineOrchestrator } from '../src/pipeline.js';
import { SheetsClient, STATUS_ENUM } from '../src/sheets_client.js';
import { getConfig, maskToken } from '../src/config.js';
import { getDefaultProjectsDir, findPythonExecutable, findGitBashExecutable } from '../src/exec_utils.js';
import { UnifiedPublisher } from '../src/publish/index.js';

function printHelp() {
  console.log(`
Faceless Shorts & Google Sheets Pipeline CLI

Usage:
  node bin/run-narrative.js [options]

Options:
  --claim             Claim next Pending narrative, validate, scaffold clean project folder
  --next              Preview the next Pending narrative without claiming or modifying the sheet
  --id <ID>           Scaffold or inspect a specific narrative by its ID
  --verify <ID>       Check if all required generation and render artifacts exist on disk
  --ready <ID>        Verify final video and QA sheet, then update Google Sheet status to Ready for Review
  --publish-yt <ID>   Verify and publish short directly to YouTube Shorts, updating Google Sheet
  --status <ID> <ST>  Update status of a narrative (Pending|Processing|Ready for Review|Approved|Published|Failed)
  --config            Display current environment configuration status (tokens masked)
  --help              Display this help message

Examples:
  node bin/run-narrative.js --config
  node bin/run-narrative.js --next
  node bin/run-narrative.js --claim
  node bin/run-narrative.js --verify DREAM-003
  node bin/run-narrative.js --publish-yt DREAM-003
  node bin/run-narrative.js --ready DREAM-003
  node bin/run-narrative.js --status DREAM-003 "Approved"
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--config')) {
    const cfg = getConfig();
    console.log('=== Configuration & Environment Status ===');
    console.log(`APPS_SCRIPT_URL:   ${cfg.apiUrl ? cfg.apiUrl : '[NOT SET]'}`);
    console.log(`APPS_SCRIPT_TOKEN: ${maskToken(cfg.token)}`);
    console.log(`Configured:        ${cfg.isConfigured ? 'YES' : 'NO'}`);
    console.log(`Projects Root:     ${getDefaultProjectsDir()}`);
    console.log(`Python Binary:     ${findPythonExecutable() || '[NOT FOUND]'}`);
    console.log(`Git Bash:          ${findGitBashExecutable() || '[NOT FOUND]'}`);
    return;
  }

  const orchestrator = new PipelineOrchestrator();

  if (args.includes('--verify')) {
    const idx = args.indexOf('--verify');
    const id = args[idx + 1];
    if (!id) {
      console.error('Error: --verify requires <ID>.');
      process.exit(1);
    }
    console.log(`Verifying artifacts for ${id}...`);
    const res = orchestrator.verifyProjectArtifacts(id, { requireVideo: true });
    console.log(JSON.stringify(res, null, 2));
    if (!res.valid) {
      console.log(`Missing artifacts: ${res.missing.join(', ')}`);
      process.exit(1);
    } else {
      console.log('All required artifacts verified successfully!');
    }
    return;
  }

  if (args.includes('--publish-yt')) {
    const idx = args.indexOf('--publish-yt');
    let id = args[idx + 1];
    if (!id || id.startsWith('--')) {
      // Auto-detect the most recently modified project with a rendered MP4 video
      const projectsDir = getDefaultProjectsDir();
      try {
        const entries = fs.readdirSync(projectsDir, { withFileTypes: true })
          .filter(d => d.isDirectory() && !d.name.startsWith('.'))
          .map(d => {
            const p = path.join(projectsDir, d.name);
            const stat = fs.statSync(p);
            return { id: d.name, mtime: stat.mtimeMs, dir: p };
          })
          .sort((a, b) => b.mtime - a.mtime);

        const candidate = entries.find(e => {
          const video = path.join(e.dir, 'renders', `${e.id}.mp4`);
          return fs.existsSync(video);
        });
        if (candidate) {
          id = candidate.id;
          console.log(`Auto-detected latest rendered project: ${id}`);
        }
      } catch (err) {
        console.error('Error scanning projects directory:', err.message);
      }
    }
    if (!id) {
      console.error('Error: --publish-yt requires <ID> or a rendered project in the projects directory.');
      process.exit(1);
    }
    console.log(`Verifying and publishing ${id} strictly to YouTube Shorts...`);
    const verification = orchestrator.verifyProjectArtifacts(id, { requireVideo: true });
    if (!verification.valid) {
      console.error(`Cannot publish ${id}. Missing artifacts: ${verification.missing.join(', ')}`);
      process.exit(1);
    }
    const publisher = new UnifiedPublisher();
    const result = await publisher.publishNarrative(id, { skipInstagram: true });
    if (result.youtube?.success) {
      console.log(`\n=== PUBLISH SUCCESS ===\nShort ID:  ${id}\nYouTube:   ${result.youtube.url}\nStatus:    Published on Google Sheet\n`);
    } else {
      console.error(`Failed to publish ${id} to YouTube Shorts: ${result.errors.join('; ')}`);
      process.exit(1);
    }
    return;
  }

  if (args.includes('--ready')) {
    const idx = args.indexOf('--ready');
    const id = args[idx + 1];
    if (!id) {
      console.error('Error: --ready requires <ID>.');
      process.exit(1);
    }
    console.log(`Marking ${id} as Ready for Review...`);
    const res = await orchestrator.markReadyForReview(id);
    console.log('Result:', JSON.stringify(res, null, 2));
    return;
  }

  if (args.includes('--status')) {
    const idx = args.indexOf('--status');
    const id = args[idx + 1];
    const status = args[idx + 2];
    if (!id || !status) {
      console.error('Error: --status requires <ID> and <STATUS>.');
      process.exit(1);
    }
    console.log(`Updating ${id} status to '${status}'...`);
    const res = await orchestrator.updateStatus(id, status);
    console.log('Result:', JSON.stringify(res, null, 2));
    return;
  }

  const isClaim = args.includes('--claim');
  const isNext = args.includes('--next');
  const idIdx = args.indexOf('--id');
  const id = idIdx !== -1 ? args[idIdx + 1] : null;

  if (isNext) {
    console.log('Previewing next pending narrative without claiming...');
    const result = await orchestrator.processOneNarrative({ mode: 'next' });
    if (result.status === 'NO_PENDING') {
      console.log('No pending narratives found in Google Sheet.');
    } else {
      console.log('Next Pending Narrative:');
      console.log(JSON.stringify(result.narrative, null, 2));
    }
    return;
  }

  if (id && !isClaim) {
    console.log(`Preparing project for narrative ID: ${id}...`);
    const result = await orchestrator.processOneNarrative({
      mode: 'byId',
      id
    });
    console.log('Result:', JSON.stringify(result, null, 2));
    return;
  }

  if (isClaim) {
    console.log('Claiming next pending narrative...');
    const result = await orchestrator.processOneNarrative({
      mode: 'claim'
    });
    console.log('Result:', JSON.stringify(result, null, 2));
    return;
  }

  printHelp();
}

main().catch((err) => {
  console.error('\n[FATAL ERROR]', err.message);
  process.exit(1);
});
