// YouTube Shorts Publisher via YouTube Data API v3 (Resumable Upload)
import fs from 'node:fs';
import { loadEnv } from '../config.js';

loadEnv();

/**
 * Calculates ISO 8601 UTC publish timestamp for a target time in Indian Standard Time (IST, UTC+05:30).
 * If target time has already passed today (or is less than 10 mins away), rolls over to tomorrow.
 *
 * @param {number} targetHourIST - Target hour in IST (0-23, default: 19 = 7:00 PM)
 * @param {number} targetMinuteIST - Target minute in IST (0-59, default: 0)
 * @param {Date} now - Optional current date for testing
 * @returns {string} - ISO 8601 UTC string (e.g. "2026-11-25T13:30:00.000Z")
 */
export function getScheduledPublishTime(targetHourIST = 19, targetMinuteIST = 0, now = new Date()) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);

  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const date = istDate.getUTCDate();

  // Target time in UTC = Target time in IST minus 5.5 hours
  const targetUtcMs = Date.UTC(year, month, date, targetHourIST, targetMinuteIST, 0, 0) - IST_OFFSET_MS;
  let targetDate = new Date(targetUtcMs);

  // If target time is within 10 minutes from now or in the past, schedule for tomorrow
  if (targetDate.getTime() - now.getTime() < 10 * 60 * 1000) {
    targetDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
  }

  return targetDate.toISOString();
}

export class YouTubePublisher {
  constructor(options = {}) {
    this.clientId = options.clientId !== undefined ? options.clientId : process.env.YOUTUBE_CLIENT_ID;
    this.clientSecret = options.clientSecret !== undefined ? options.clientSecret : process.env.YOUTUBE_CLIENT_SECRET;
    this.refreshToken = options.refreshToken !== undefined ? options.refreshToken : process.env.YOUTUBE_REFRESH_TOKEN;
    this.tokenEndpoint = options.tokenEndpoint || 'https://oauth2.googleapis.com/token';
    this.uploadEndpoint = options.uploadEndpoint || 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret && this.refreshToken);
  }

  // Refreshes short-lived access token using stored OAuth2 refresh token
  async getAccessToken() {
    if (!this.isConfigured()) {
      throw new Error('YouTube Publisher is not configured. Missing YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, or YOUTUBE_REFRESH_TOKEN.');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token'
    });

    const res = await this.fetchFn(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`YouTube OAuth token refresh failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (!data.access_token) {
      throw new Error('OAuth endpoint did not return an access_token.');
    }

    return data.access_token;
  }

  // Uploads video as a vertical YouTube Short
  async uploadShort({
    videoPath,
    title = 'Untitled Short',
    description = '',
    tags = ['shorts', 'clayworld', 'animation'],
    privacyStatus = 'public',
    publishAt = null
  }) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file does not exist at: ${videoPath}`);
    }

    const fileStats = fs.statSync(videoPath);
    const fileSize = fileStats.size;

    if (fileSize === 0) {
      throw new Error(`Video file at ${videoPath} is 0 bytes.`);
    }

    const accessToken = await this.getAccessToken();

    // Ensure #shorts hashtag is included in title or description
    const formattedTitle = /#shorts/i.test(title) ? title : `${title} #shorts`;
    const formattedDesc = /#shorts/i.test(description) ? description : `${description}\n\n#shorts`;

    // YouTube Data API v3 rule: When scheduling (publishAt set), privacyStatus MUST be 'private'
    const effectivePrivacy = publishAt ? 'private' : privacyStatus;

    const metadata = {
      snippet: {
        title: formattedTitle.slice(0, 100), // YouTube title max 100 chars
        description: formattedDesc.slice(0, 5000),
        tags: Array.isArray(tags) ? tags : ['shorts'],
        categoryId: '22' // People & Blogs
      },
      status: {
        privacyStatus: effectivePrivacy,
        selfDeclaredMadeForKids: false
      }
    };

    if (publishAt) {
      metadata.status.publishAt = publishAt;
    }

    // 1. Initiate Resumable Upload Session
    const initRes = await this.fetchFn(this.uploadEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(fileSize)
      },
      body: JSON.stringify(metadata)
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`YouTube upload initiation failed (${initRes.status}): ${errText}`);
    }

    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) {
      throw new Error('YouTube did not return a Location header for resumable upload.');
    }

    // 2. Stream video file binary to uploadUrl
    const fileBuffer = fs.readFileSync(videoPath);

    const uploadRes = await this.fetchFn(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(fileSize)
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`YouTube video upload failed (${uploadRes.status}): ${errText}`);
    }

    const result = await uploadRes.json();
    const videoId = result.id;
    if (!videoId) {
      throw new Error('YouTube upload completed but did not return a video ID.');
    }

    const shortUrl = `https://www.youtube.com/shorts/${videoId}`;

    return {
      success: true,
      platform: 'YouTube',
      videoId,
      url: shortUrl,
      privacyStatus: publishAt ? 'scheduled' : privacyStatus,
      publishAt: publishAt || null,
      uploadedAt: new Date().toISOString()
    };
  }
}
