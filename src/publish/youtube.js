// YouTube Shorts Publisher via YouTube Data API v3 (Resumable Upload)
import fs from 'node:fs';
import { loadEnv } from '../config.js';

loadEnv();

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
    privacyStatus = 'public'
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

    const metadata = {
      snippet: {
        title: formattedTitle.slice(0, 100), // YouTube title max 100 chars
        description: formattedDesc.slice(0, 5000),
        tags: Array.isArray(tags) ? tags : ['shorts'],
        categoryId: '22' // People & Blogs
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false
      }
    };

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
      privacyStatus,
      uploadedAt: new Date().toISOString()
    };
  }
}
