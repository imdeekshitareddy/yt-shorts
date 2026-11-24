// Tests for YouTube, Instagram, and Unified Multi-Platform Publishers
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { YouTubePublisher } from '../src/publish/youtube.js';
import { InstagramPublisher } from '../src/publish/instagram.js';
import { UnifiedPublisher } from '../src/publish/index.js';
import { SheetsClient } from '../src/sheets_client.js';
import { createMockFetch, MOCK_VALID_TOKEN, MOCK_API_URL } from './mock_apps_script.js';

describe('Publishing Layer Integration Tests', () => {
  const testDir = path.resolve(process.cwd(), 'temp_test_publish');
  const testVideoPath = path.join(testDir, 'test_short.mp4');

  before(() => {
    fs.mkdirSync(testDir, { recursive: true });
    // Write 1 KB dummy MP4 file for testing
    fs.writeFileSync(testVideoPath, Buffer.alloc(1024, 'dummy-video-bytes'));
  });

  after(() => {
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {}
  });

  test('1. YouTubePublisher: refreshes access token and uploads Short via resumable upload', async () => {
    const mockUploadLocation = 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=mock_session_999';

    const mockFetch = async (url, opts = {}) => {
      // 1. OAuth token refresh
      if (url === 'https://oauth2.googleapis.com/token') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'mock_access_token_abc123' })
        };
      }

      // 2. Resumable upload initialization
      if (url.includes('uploadType=resumable')) {
        assert.strictEqual(opts.method, 'POST');
        assert.ok(opts.headers.Authorization.includes('mock_access_token_abc123'));
        return {
          ok: true,
          status: 200,
          headers: new Headers({ location: mockUploadLocation }),
          text: async () => ''
        };
      }

      // 3. Binary video upload
      if (url === mockUploadLocation) {
        assert.strictEqual(opts.method, 'PUT');
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'mock_yt_vid_456' })
        };
      }

      throw new Error(`Unexpected fetch call in test: ${url}`);
    };

    const yt = new YouTubePublisher({
      clientId: 'mock_client_id',
      clientSecret: 'mock_client_secret',
      refreshToken: 'mock_refresh_token',
      fetchFn: mockFetch
    });

    assert.strictEqual(yt.isConfigured(), true);

    const token = await yt.getAccessToken();
    assert.strictEqual(token, 'mock_access_token_abc123');

    const res = await yt.uploadShort({
      videoPath: testVideoPath,
      title: 'The Ocean in Apartment 302',
      description: 'Dream story about seawater in an apartment'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.videoId, 'mock_yt_vid_456');
    assert.strictEqual(res.url, 'https://www.youtube.com/shorts/mock_yt_vid_456');
  });

  test('2. YouTubePublisher: rejects when video file is missing', async () => {
    const yt = new YouTubePublisher({
      clientId: 'mock_id',
      clientSecret: 'mock_secret',
      refreshToken: 'mock_token'
    });

    await assert.rejects(
      async () => {
        await yt.uploadShort({ videoPath: 'non_existent_file.mp4' });
      },
      /Video file does not exist/
    );
  });

  test('3. InstagramPublisher: executes official Instagram Graph API Reels flow via rupload.facebook.com', async () => {
    const mockUploadUrl = 'https://rupload.facebook.com/ig-api-upload/v21.0/mock_container_111';
    let pollCount = 0;

    const mockFetch = async (url, opts = {}) => {
      // 1. Phase 1: Initialize resumable container on /{id}/media
      if (url.endsWith('/mock_ig_account_123/media') && opts.method === 'POST') {
        assert.ok(opts.body.includes('upload_type=resumable'));
        assert.ok(opts.body.includes('media_type=REELS'));
        assert.ok(opts.body.includes('caption='));
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'mock_container_111', uri: mockUploadUrl })
        };
      }

      // 2. Phase 2: Binary transfer to rupload.facebook.com
      if (url === mockUploadUrl) {
        assert.strictEqual(opts.method, 'POST');
        assert.strictEqual(opts.headers.Authorization, 'OAuth mock_meta_access_token');
        assert.strictEqual(opts.headers.offset, '0');
        assert.strictEqual(opts.headers.file_size, '1024');
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        };
      }

      // 3. Phase 3: Status polling on /{container_id}?fields=status_code,status
      if (url.includes('/mock_container_111?fields=status_code')) {
        pollCount++;
        // Simulate 1 in_progress poll, then finished
        const code = pollCount >= 2 ? 'FINISHED' : 'IN_PROGRESS';
        return {
          ok: true,
          status: 200,
          json: async () => ({ status_code: code })
        };
      }

      // 4. Phase 4: Publish container on /{id}/media_publish
      if (url.endsWith('/mock_ig_account_123/media_publish') && opts.method === 'POST') {
        assert.ok(opts.body.includes('creation_id=mock_container_111'));
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'mock_ig_media_999' })
        };
      }

      // 5. Phase 5: Permalink lookup on /{media_id}?fields=permalink
      if (url.includes('/mock_ig_media_999?fields=permalink')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ permalink: 'https://www.instagram.com/reel/C3xYZ123/' })
        };
      }

      throw new Error(`Unexpected Instagram fetch call in test: ${url}`);
    };

    const ig = new InstagramPublisher({
      accountId: 'mock_ig_account_123',
      accessToken: 'mock_meta_access_token',
      pollIntervalMs: 5,
      fetchFn: mockFetch
    });

    assert.strictEqual(ig.isConfigured(), true);

    const res = await ig.uploadReel({
      videoPath: testVideoPath,
      caption: 'The Ocean in Apartment 302'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.mediaId, 'mock_ig_media_999');
    assert.strictEqual(res.url, 'https://www.instagram.com/reel/C3xYZ123/');
  });

  test('4. InstagramPublisher: throws when credentials are not configured', async () => {
    const ig = new InstagramPublisher({
      accountId: '',
      accessToken: ''
    });

    assert.strictEqual(ig.isConfigured(), false);

    await assert.rejects(
      async () => {
        await ig.uploadReel({ videoPath: testVideoPath });
      },
      /Instagram Publisher is not configured/
    );
  });

  test('5. InstagramPublisher: handles API errors during container creation and sanitizes tokens', async () => {
    const mockSecretToken = 'secret_access_token_XYZ987';
    const mockFetch = async () => ({
      ok: false,
      status: 400,
      text: async () => `OAuthException: Invalid OAuth access token - ${mockSecretToken}`
    });

    const ig = new InstagramPublisher({
      accountId: 'mock_acc_123',
      accessToken: mockSecretToken,
      fetchFn: mockFetch
    });

    await assert.rejects(
      async () => {
        await ig.uploadReel({ videoPath: testVideoPath });
      },
      (err) => {
        assert.ok(err.message.includes('Instagram container initialization failed'));
        // Assert token was sanitized and never appears in error
        assert.strictEqual(err.message.includes(mockSecretToken), false);
        assert.ok(err.message.includes('***'));
        return true;
      }
    );
  });

  test('6. InstagramPublisher: handles processing failure when status_code is ERROR', async () => {
    const mockUploadUrl = 'https://rupload.facebook.com/ig-api-upload/v21.0/mock_container_err';

    const mockFetch = async (url) => {
      if (url.includes('/media') && !url.includes('/media_publish')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'mock_container_err', uri: mockUploadUrl })
        };
      }
      if (url === mockUploadUrl) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        };
      }
      if (url.includes('/mock_container_err?fields=status_code')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status_code: 'ERROR', status: 'Media processing failed during transcode' })
        };
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    };

    const ig = new InstagramPublisher({
      accountId: 'mock_acc_123',
      accessToken: 'mock_token',
      pollIntervalMs: 5,
      fetchFn: mockFetch
    });

    await assert.rejects(
      async () => {
        await ig.uploadReel({ videoPath: testVideoPath });
      },
      /Instagram video processing failed with status_code: ERROR/
    );
  });

  test('7. UnifiedPublisher: dry-run mode returns simulated URLs without network requests', async () => {
    // Scaffold test project directory
    const projDir = path.join(testDir, 'DREAM-TEST-PUB');
    fs.mkdirSync(path.join(projDir, 'renders'), { recursive: true });
    fs.writeFileSync(path.join(projDir, 'renders/DREAM-TEST-PUB.mp4'), 'dummy-video');
    fs.writeFileSync(path.join(projDir, 'metadata.json'), JSON.stringify({
      id: 'DREAM-TEST-PUB',
      title: 'Dry Run Narrative',
      youtubeCaption: 'YouTube caption text',
      instagramCaption: 'Instagram caption text'
    }));

    const publisher = new UnifiedPublisher({
      projectsRoot: testDir
    });

    const res = await publisher.publishNarrative('DREAM-TEST-PUB', { dryRun: true });
    assert.strictEqual(res.id, 'DREAM-TEST-PUB');
    assert.ok(res.youtube.url.includes('youtube.com/shorts'));
    assert.ok(res.instagram.url.includes('instagram.com/reel'));
  });

  test('8. UnifiedPublisher: uploads to both platforms and updates Google Sheet status to Published', async () => {
    const mockState = createMockFetch({
      narratives: [
        {
          ID: 'DREAM-TEST-LIVE',
          Title: 'Live Publishing Test',
          Narrative: 'Test narrative text',
          'YouTube Caption': 'Original YT caption',
          'Instagram Caption': 'Original IG caption',
          Status: 'Ready for Review'
        }
      ]
    });

    const sheetsClient = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mockState.mockFetch
    });

    const projDir = path.join(testDir, 'DREAM-TEST-LIVE');
    fs.mkdirSync(path.join(projDir, 'renders'), { recursive: true });
    fs.writeFileSync(path.join(projDir, 'renders/DREAM-TEST-LIVE.mp4'), 'dummy-video-data');
    fs.writeFileSync(path.join(projDir, 'metadata.json'), JSON.stringify({
      id: 'DREAM-TEST-LIVE',
      title: 'Live Publishing Test',
      youtubeCaption: 'Original YT caption',
      instagramCaption: 'Original IG caption'
    }));

    // Mock YouTube
    const mockYouTube = {
      isConfigured: () => true,
      uploadShort: async () => ({
        success: true,
        videoId: 'yt_live_123',
        url: 'https://www.youtube.com/shorts/yt_live_123'
      })
    };

    // Mock Instagram
    const mockInstagram = {
      isConfigured: () => true,
      uploadReel: async () => ({
        success: true,
        mediaId: 'ig_live_456',
        url: 'https://www.instagram.com/reel/ig_live_456/'
      })
    };

    const publisher = new UnifiedPublisher({
      projectsRoot: testDir,
      youtube: mockYouTube,
      instagram: mockInstagram,
      sheetsClient
    });

    const res = await publisher.publishNarrative('DREAM-TEST-LIVE');
    assert.strictEqual(res.id, 'DREAM-TEST-LIVE');
    assert.strictEqual(res.youtube.url, 'https://www.youtube.com/shorts/yt_live_123');
    assert.strictEqual(res.instagram.url, 'https://www.instagram.com/reel/ig_live_456/');

    // Verify Google Sheet updated to Published with live links appended
    const updated = await sheetsClient.getById('DREAM-TEST-LIVE');
    assert.strictEqual(updated.Status, 'Published');
    assert.ok(updated['YouTube Caption'].includes('https://www.youtube.com/shorts/yt_live_123'));
    assert.ok(updated['Instagram Caption'].includes('https://www.instagram.com/reel/ig_live_456/'));
  });
});
