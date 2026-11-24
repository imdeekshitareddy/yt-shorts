// Instagram Reels Publisher via Meta Graph API (Official Resumable Upload Flow)
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadEnv } from '../config.js';

loadEnv();

// Helper to sanitize error messages and prevent leaking access tokens
function sanitizeError(err, token) {
  let msg = typeof err === 'string' ? err : err?.message || 'Unknown error';
  if (err?.cause) {
    const causeMsg = err.cause.message || err.cause.code || String(err.cause);
    msg += ` [cause: ${causeMsg}]`;
  }
  if (token && typeof token === 'string' && token.length > 0) {
    msg = msg.replaceAll(token, '***');
  }
  return msg;
}

// Helper to stream binary upload via native curl on Windows if Node fetch encounters SSL leaf certificate issues
function uploadBinaryWithCurl(uploadUri, videoPath, fileSize, accessToken) {
  const curlArgs = [
    '-k',
    '-s',
    '-S',
    '-X', 'POST',
    uploadUri,
    '-H', `Authorization: OAuth ${accessToken}`,
    '-H', 'Content-Type: application/octet-stream',
    '-H', 'offset: 0',
    '-H', `file_size: ${fileSize}`,
    '-H', `Content-Length: ${fileSize}`,
    '--data-binary', `@${videoPath}`
  ];

  const res = spawnSync('curl.exe', curlArgs, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 180000 });
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error(`curl upload failed (code ${res.status}): ${res.stderr || res.stdout}`);
  }
  if (res.stdout) {
    try {
      const parsed = JSON.parse(res.stdout);
      if (parsed.error || parsed.debug_info?.type === 'ProcessingFailedError') {
        throw new Error(`Instagram binary video upload failed: ${JSON.stringify(parsed)}`);
      }
    } catch (e) {
      if (e.message.includes('Instagram binary video upload failed')) throw e;
    }
  }
  return res.stdout;
}

export class InstagramPublisher {
  constructor(options = {}) {
    this.accountId = options.accountId !== undefined ? options.accountId : process.env.INSTAGRAM_ACCOUNT_ID;
    this.accessToken = options.accessToken !== undefined ? options.accessToken : process.env.INSTAGRAM_ACCESS_TOKEN;
    this.graphVersion = options.graphVersion || process.env.META_GRAPH_VERSION || 'v21.0';
    this.baseUrl = options.baseUrl || 'https://graph.facebook.com';
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.pollIntervalMs = options.pollIntervalMs || 5000;
    this.maxPollAttempts = options.maxPollAttempts || 60;
  }

  isConfigured() {
    return Boolean(this.accountId && this.accessToken);
  }

  // Uploads a video as an Instagram Reel using Meta Graph API's official resumable upload workflow
  async uploadReel({
    videoPath,
    caption = '',
    shareToFeed = true
  }) {
    if (!this.isConfigured()) {
      throw new Error('Instagram Publisher is not configured. Missing INSTAGRAM_ACCOUNT_ID or INSTAGRAM_ACCESS_TOKEN.');
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file does not exist at: ${videoPath}`);
    }

    const fileStats = fs.statSync(videoPath);
    const fileSize = fileStats.size;

    if (fileSize === 0) {
      throw new Error(`Video file at ${videoPath} is 0 bytes.`);
    }

    const formattedCaption = /#reels/i.test(caption) ? caption : `${caption}\n\n#reels`;

    // ── Phase 1: Create Media Container & Initialize Resumable Upload Session ──
    // Endpoint: POST /{ig-user-id}/media
    const initUrl = `${this.baseUrl}/${this.graphVersion}/${this.accountId}/media`;
    const initParams = new URLSearchParams({
      upload_type: 'resumable',
      media_type: 'REELS',
      caption: formattedCaption.slice(0, 2200), // Instagram caption limit is 2,200 chars
      share_to_feed: shareToFeed ? 'true' : 'false',
      access_token: this.accessToken
    });

    let initRes;
    try {
      initRes = await this.fetchFn(initUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: initParams.toString()
      });
    } catch (netErr) {
      throw new Error(`Network failure during Instagram container initialization: ${sanitizeError(netErr, this.accessToken)}`);
    }

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`Instagram container initialization failed (${initRes.status}): ${sanitizeError(errText, this.accessToken)}`);
    }

    const initData = await initRes.json();
    const containerId = initData.id;
    const uploadUri = initData.uri;

    if (!containerId || !uploadUri) {
      throw new Error('Instagram did not return container id or upload uri.');
    }

    console.log(`[Instagram] Created container ${containerId}. Uploading binary stream...`);

    // ── Phase 2: Upload Video Binary Stream to rupload.facebook.com ──
    const fileBuffer = fs.readFileSync(videoPath);

    let uploadRes;
    try {
      uploadRes = await this.fetchFn(uploadUri, {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${this.accessToken}`,
          offset: '0',
          file_size: String(fileSize),
          'Content-Length': String(fileSize),
          'Content-Type': 'application/octet-stream'
        },
        body: fileBuffer
      });
    } catch (netErr) {
      const errString = String(netErr?.cause?.message || netErr?.cause?.code || netErr?.message || '');
      if (/certificate|leaf|ssl|tls/i.test(errString) && process.platform === 'win32') {
        try {
          const curlOutput = uploadBinaryWithCurl(uploadUri, videoPath, fileSize, this.accessToken);
          uploadRes = {
            ok: true,
            status: 200,
            text: async () => curlOutput,
            json: async () => {
              try { return JSON.parse(curlOutput); } catch { return { success: true }; }
            }
          };
        } catch (curlErr) {
          throw new Error(`Network and curl failure during video upload: ${sanitizeError(curlErr, this.accessToken)}`);
        }
      } else {
        throw new Error(`Network failure during video binary upload to Meta: ${sanitizeError(netErr, this.accessToken)}`);
      }
    }

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Instagram binary video upload failed (${uploadRes.status}): ${sanitizeError(errText, this.accessToken)}`);
    }

    // ── Phase 3: Poll Container Processing Status ──
    // Endpoint: GET /{container-id}?fields=status_code,status
    let isFinished = false;
    let attempts = 0;

    while (!isFinished && attempts < this.maxPollAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, this.pollIntervalMs));

      const statusUrl = `${this.baseUrl}/${this.graphVersion}/${containerId}?fields=status_code,status&access_token=${this.accessToken}`;
      let statusRes;

      try {
        statusRes = await this.fetchFn(statusUrl);
      } catch (pollErr) {
        // Transient network error during poll, continue polling
        continue;
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const code = statusData.status_code;

        if (code === 'FINISHED') {
          console.log(`[Instagram] Container ${containerId} processing FINISHED after ${attempts} checks.`);
          isFinished = true;
          break;
        } else if (code === 'ERROR' || code === 'EXPIRED') {
          const detail = statusData.status || code;
          throw new Error(`Instagram video processing failed with status_code: ${code} (${detail})`);
        } else if (attempts % 4 === 0 || attempts === 1) {
          console.log(`[Instagram] Container ${containerId} status: ${code || 'IN_PROGRESS'} (check ${attempts}/${this.maxPollAttempts})...`);
        }
      }
    }

    if (!isFinished) {
      throw new Error(`Instagram video processing timed out after ${attempts} polling attempts.`);
    }

    // ── Phase 4: Publish the Media Container ──
    // Endpoint: POST /{ig-user-id}/media_publish
    const publishUrl = `${this.baseUrl}/${this.graphVersion}/${this.accountId}/media_publish`;
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: this.accessToken
    });

    let publishRes;
    try {
      publishRes = await this.fetchFn(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishParams.toString()
      });
    } catch (netErr) {
      throw new Error(`Network failure during Instagram publishing: ${sanitizeError(netErr, this.accessToken)}`);
    }

    if (!publishRes.ok) {
      const errText = await publishRes.text();
      throw new Error(`Instagram media publishing failed (${publishRes.status}): ${sanitizeError(errText, this.accessToken)}`);
    }

    const publishData = await publishRes.json();
    const mediaId = publishData.id;

    if (!mediaId) {
      throw new Error('Instagram publish endpoint succeeded but did not return media id.');
    }

    // ── Phase 5: Resolve Published Reel Permalink ──
    // Endpoint: GET /{media-id}?fields=permalink
    let permalink = `https://www.instagram.com/reel/`;
    try {
      const permalinkUrl = `${this.baseUrl}/${this.graphVersion}/${mediaId}?fields=permalink&access_token=${this.accessToken}`;
      const permalinkRes = await this.fetchFn(permalinkUrl);
      if (permalinkRes.ok) {
        const permalinkData = await permalinkRes.json();
        if (permalinkData.permalink) {
          permalink = permalinkData.permalink;
        }
      }
    } catch {}

    return {
      success: true,
      platform: 'Instagram',
      mediaId,
      url: permalink,
      publishedAt: new Date().toISOString()
    };
  }
}
