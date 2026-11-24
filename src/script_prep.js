// Project Metadata Management for Faceless Shorts
// Replaces procedural script/shot generators. Creative video authoring is delegated to the AI Agent.
import fs from 'node:fs';
import path from 'node:path';

// Saves narrative metadata alongside the project for the AI Agent to consume
export function saveProjectMetadata(projectDir, narrative, extra = {}) {
  const metadata = {
    id: narrative.id,
    title: narrative.title,
    narrative: narrative.narrative,
    youtubeCaption: narrative.youtubeCaption,
    instagramCaption: narrative.instagramCaption,
    style: extra.style || 'clay-world',
    status: extra.status || 'Processing',
    claimedAt: extra.claimedAt || new Date().toISOString(),
    ...extra
  };

  const metadataPath = path.join(projectDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  return metadata;
}

// Reads project metadata from disk
export function readProjectMetadata(projectDir) {
  const metadataPath = path.join(projectDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) return null;
  return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
}

// Updates project metadata status on disk
export function updateProjectMetadata(projectDir, updates = {}) {
  const current = readProjectMetadata(projectDir) || {};
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  const metadataPath = path.join(projectDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}
