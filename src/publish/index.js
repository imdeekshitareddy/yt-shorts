// Unified Multi-Platform Publisher for Faceless Shorts
// Coordinates automated uploads to YouTube Shorts & Instagram Reels and updates Google Sheets.
import fs from 'node:fs';
import path from 'node:path';
import { YouTubePublisher, getScheduledPublishTime } from './youtube.js';
import { InstagramPublisher } from './instagram.js';
import { SheetsClient, STATUS_ENUM } from '../sheets_client.js';
import { readProjectMetadata, updateProjectMetadata } from '../script_prep.js';
import { getDefaultProjectsDir } from '../exec_utils.js';

export class UnifiedPublisher {
  constructor(options = {}) {
    this.youtube = options.youtube || new YouTubePublisher(options.youtubeOptions || {});
    this.instagram = options.instagram || new InstagramPublisher(options.instagramOptions || {});
    this.sheetsClient = options.sheetsClient || new SheetsClient(options.sheetsOptions || {});
    this.projectsRoot = path.resolve(options.projectsRoot || getDefaultProjectsDir());
    this.logger = options.logger || console;
  }

  // Publishes a rendered short to configured platforms and updates Google Sheet
  async publishNarrative(narrativeId, options = {}) {
    const {
      skipYouTube = false,
      skipInstagram = false,
      dryRun = false,
      publishAt: customPublishAt = null,
      scheduleTime = process.env.YOUTUBE_SCHEDULE_TIME || '19:00'
    } = options;

    const projectDir = path.join(this.projectsRoot, narrativeId);
    if (!fs.existsSync(projectDir)) {
      throw new Error(`Project directory does not exist at: ${projectDir}`);
    }

    const metadata = readProjectMetadata(projectDir);
    if (!metadata) {
      throw new Error(`metadata.json not found in project directory: ${projectDir}`);
    }

    const videoPath = path.join(projectDir, `renders/${narrativeId}.mp4`);
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Rendered video file not found at: ${videoPath}`);
    }

    const title = metadata.title || 'Untitled Short';
    const ytCaption = metadata.youtubeCaption || title;
    const igCaption = metadata.instagramCaption || title;

    // Determine scheduled publish timestamp (default: 7:00 PM IST today)
    let publishAt = customPublishAt;
    if (!publishAt && scheduleTime && scheduleTime !== 'none' && scheduleTime !== 'immediate') {
      const parts = String(scheduleTime).split(':');
      const h = parseInt(parts[0], 10) || 19;
      const m = parseInt(parts[1], 10) || 0;
      publishAt = getScheduledPublishTime(h, m);
    }

    const results = {
      id: narrativeId,
      youtube: null,
      instagram: null,
      errors: []
    };

    if (dryRun) {
      this.logger.log(`[DRY-RUN] Simulated publishing for ${narrativeId}`);
      results.youtube = {
        success: true,
        platform: 'YouTube (Dry-Run)',
        url: `https://www.youtube.com/shorts/mock_${narrativeId}`,
        privacyStatus: publishAt ? 'scheduled' : 'public',
        publishAt: publishAt || null
      };
      results.instagram = {
        success: true,
        platform: 'Instagram (Dry-Run)',
        url: `https://www.instagram.com/reel/mock_${narrativeId}/`
      };

      return results;
    }

    // ── 1. Upload to YouTube Shorts ──
    if (!skipYouTube && this.youtube.isConfigured()) {
      try {
        const scheduleLog = publishAt ? ` (scheduled for ${publishAt} / 7:00 PM IST)` : ' (immediate public)';
        this.logger.log(`Uploading ${narrativeId} to YouTube Shorts${scheduleLog}...`);
        const ytRes = await this.youtube.uploadShort({
          videoPath,
          title,
          description: ytCaption,
          publishAt
        });
        results.youtube = ytRes;
        this.logger.log(`YouTube upload successful: ${ytRes.url}${ytRes.publishAt ? ` (Scheduled: ${ytRes.publishAt})` : ''}`);
      } catch (err) {
        this.logger.error(`YouTube upload failed for ${narrativeId}: ${err.message}`);
        results.errors.push(`YouTube: ${err.message}`);
      }
    } else if (!skipYouTube) {
      this.logger.log(`YouTube publishing skipped for ${narrativeId}: YouTube credentials not configured in .env`);
    }

    // ── 2. Upload to Instagram Reels ──
    if (!skipInstagram && this.instagram.isConfigured()) {
      try {
        this.logger.log(`Uploading ${narrativeId} to Instagram Reels...`);
        const igRes = await this.instagram.uploadReel({
          videoPath,
          caption: igCaption
        });
        results.instagram = igRes;
        this.logger.log(`Instagram upload successful: ${igRes.url}`);
      } catch (err) {
        this.logger.error(`Instagram upload failed for ${narrativeId}: ${err.message}`);
        results.errors.push(`Instagram: ${err.message}`);
      }
    } else if (!skipInstagram) {
      this.logger.log(`Instagram publishing skipped for ${narrativeId}: Instagram credentials not configured in .env`);
    }

    // ── 3. Record Live URLs & Update Status ──
    const ytUrl = results.youtube?.url || metadata.youtubeUrl || null;
    const igUrl = results.instagram?.url || metadata.instagramUrl || null;

    // Update local metadata on disk
    updateProjectMetadata(projectDir, {
      youtubeUrl: ytUrl,
      instagramUrl: igUrl,
      publishedAt: new Date().toISOString(),
      youtubePublishAt: results.youtube?.publishAt || null,
      status: STATUS_ENUM.PUBLISHED
    });

    // Update Google Sheet if at least one platform succeeded or both were processed
    if (ytUrl || igUrl) {
      try {
        const updatePayload = {
          Status: STATUS_ENUM.PUBLISHED
        };

        if (ytUrl) {
          const scheduleNotice = results.youtube?.publishAt ? ' (Scheduled for 7:00 PM IST)' : '';
          updatePayload['YouTube Caption'] = `${ytCaption}\n\nLive: ${ytUrl}${scheduleNotice}`;
        }
        if (igUrl) {
          updatePayload['Instagram Caption'] = `${igCaption}\n\nLive: ${igUrl}`;
        }

        this.logger.log(`Updating Google Sheet for ${narrativeId} to Status='Published'...`);
        await this.sheetsClient.update(narrativeId, updatePayload);
        this.logger.log(`Google Sheet updated successfully for ${narrativeId}!`);
      } catch (sheetErr) {
        this.logger.error(`Failed to update Google Sheet after publishing: ${sheetErr.message}`);
        results.errors.push(`Google Sheet Update: ${sheetErr.message}`);
      }
    }

    return results;
  }
}
