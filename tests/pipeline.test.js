// Tests for Pipeline Orchestrator and Video Generation Handoff
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PipelineOrchestrator, PipelineLogger } from '../src/pipeline.js';
import { SheetsClient, STATUS_ENUM } from '../src/sheets_client.js';
import { createMockFetch, MOCK_VALID_TOKEN, MOCK_API_URL } from './mock_apps_script.js';

describe('Pipeline Orchestrator & Video Handoff Tests', () => {
  let mock;
  const testProjectsDir = path.resolve(process.cwd(), 'temp_test_projects');
  const testLogDir = path.resolve(process.cwd(), 'temp_test_logs');

  before(() => {
    mock = createMockFetch({
      narratives: [
        {
          ID: 'DREAM-TEST-101',
          Title: 'The Power of Sleep',
          Narrative: 'When you fall asleep, your brain clears toxic waste products that build up while you are awake. Without deep sleep, brain fog quickly sets in.',
          'YouTube Caption': 'Why sleep is essential #shorts #brain',
          'Instagram Caption': 'The biology of deep sleep #health #science',
          Status: 'Pending'
        },
        {
          ID: 'DREAM-TEST-102',
          Title: 'Broken Narrative Missing Captions',
          Narrative: 'This narrative is missing social media captions intentionally to test failure handling.',
          'YouTube Caption': '', // Missing
          'Instagram Caption': '', // Missing
          Status: 'Pending'
        }
      ]
    });
  });

  after(() => {
    try {
      if (fs.existsSync(testProjectsDir)) {
        fs.rmSync(testProjectsDir, { recursive: true, force: true });
      }
      if (fs.existsSync(testLogDir)) {
        fs.rmSync(testLogDir, { recursive: true, force: true });
      }
    } catch {}
  });

  test('1. Successful claim and clean scaffolding without template audio/timing data', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    const orchestrator = new PipelineOrchestrator({
      client,
      projectsRoot: testProjectsDir,
      logger: new PipelineLogger(testLogDir)
    });

    const result = await orchestrator.claimNextNarrative();

    assert.strictEqual(result.status, 'CLAIMED');
    assert.strictEqual(result.id, 'DREAM-TEST-101');

    // Verify project folder is an independent directory named after narrative ID
    const projectDir = result.projectDir;
    assert.strictEqual(projectDir, path.join(testProjectsDir, 'DREAM-TEST-101'));
    assert.ok(fs.existsSync(projectDir), 'Project folder should exist');
    assert.ok(fs.existsSync(path.join(projectDir, 'metadata.json')), 'metadata.json should exist');
    assert.ok(fs.existsSync(path.join(projectDir, 'renders')), 'renders/ should exist');
    assert.ok(fs.existsSync(path.join(projectDir, 'review')), 'review/ should exist');

    // Verify metadata.json contents
    const meta = JSON.parse(fs.readFileSync(path.join(projectDir, 'metadata.json'), 'utf8'));
    assert.strictEqual(meta.id, 'DREAM-TEST-101');
    assert.strictEqual(meta.title, 'The Power of Sleep');
    assert.strictEqual(meta.status, 'Processing');
    assert.strictEqual(meta.youtubeCaption, 'Why sleep is essential #shorts #brain');
    assert.strictEqual(meta.instagramCaption, 'The biology of deep sleep #health #science');

    // Verify template audio/timing data was purged to prevent contamination
    assert.strictEqual(fs.existsSync(path.join(projectDir, 'data/narration.wav')), false);
    assert.strictEqual(fs.existsSync(path.join(projectDir, 'data/mix.wav')), false);
    assert.strictEqual(fs.existsSync(path.join(projectDir, 'data/lines.json')), false);
    assert.strictEqual(fs.existsSync(path.join(projectDir, 'data/words.json')), false);

    // Verify status on the mock sheet transitioned to Processing
    const item = await client.getById('DREAM-TEST-101');
    assert.strictEqual(item.Status, 'Processing');
  });

  test('2. Strictly refuses to overwrite existing projects', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    const orchestrator = new PipelineOrchestrator({
      client,
      projectsRoot: testProjectsDir,
      logger: new PipelineLogger(testLogDir)
    });

    // DREAM-TEST-101 directory already exists from Test 1
    await assert.rejects(
      async () => {
        await orchestrator.processOneNarrative({
          mode: 'byId',
          id: 'DREAM-TEST-101'
        });
      },
      /Project directory already exists.*Aborting to prevent overwriting/i
    );
  });

  test('3. Missing required narrative fields triggers validation failure and updates sheet to Failed', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    const orchestrator = new PipelineOrchestrator({
      client,
      projectsRoot: testProjectsDir,
      logger: new PipelineLogger(testLogDir)
    });

    const result = await orchestrator.claimNextNarrative();

    assert.strictEqual(result.status, 'VALIDATION_FAILED');
    assert.strictEqual(result.id, 'DREAM-TEST-102');
    assert.ok(result.errors.length > 0);

    // Verify status on the sheet was updated to Failed
    const item = await client.getById('DREAM-TEST-102');
    assert.strictEqual(item.Status, 'Failed', 'Status must be updated to Failed on sheet');
  });

  test('4. No pending narratives left returns cleanly', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    const orchestrator = new PipelineOrchestrator({
      client,
      projectsRoot: testProjectsDir,
      logger: new PipelineLogger(testLogDir)
    });

    const result = await orchestrator.claimNextNarrative();
    assert.strictEqual(result.status, 'NO_PENDING');
    assert.strictEqual(result.narrative, null);
  });

  test('5. verifyProjectArtifacts rejects when video/QA files are missing', () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    const orchestrator = new PipelineOrchestrator({
      client,
      projectsRoot: testProjectsDir,
      logger: new PipelineLogger(testLogDir)
    });

    // DREAM-TEST-101 has not rendered video yet
    const verification = orchestrator.verifyProjectArtifacts('DREAM-TEST-101', { requireVideo: true });
    assert.strictEqual(verification.valid, false);
    assert.ok(verification.missing.includes('renders/DREAM-TEST-101.mp4'));
    assert.ok(verification.missing.includes('review/all.jpg'));
  });

  test('6. markReadyForReview succeeds only after required video and QA artifacts exist', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    const orchestrator = new PipelineOrchestrator({
      client,
      projectsRoot: testProjectsDir,
      logger: new PipelineLogger(testLogDir)
    });

    const projectDir = path.join(testProjectsDir, 'DREAM-TEST-101');

    // Simulate Agent generating all required assets
    fs.writeFileSync(path.join(projectDir, 'script.json'), JSON.stringify({
      title: 'The Power of Sleep',
      lines: [{ text: 'Cut 1', caps: '*CUT 1', gap: 0.2 }]
    }));
    fs.writeFileSync(path.join(projectDir, 'src/shots.js'), '// shots code');
    fs.writeFileSync(path.join(projectDir, 'data/narration.wav'), 'dummy-audio');
    fs.writeFileSync(path.join(projectDir, 'data/words.json'), JSON.stringify([{ word: 'test' }]));
    fs.writeFileSync(path.join(projectDir, 'renders/DREAM-TEST-101.mp4'), 'dummy-video-data');
    fs.writeFileSync(path.join(projectDir, 'review/all.jpg'), 'dummy-image-data');

    // Now mark ready for review should succeed
    const res = await orchestrator.markReadyForReview('DREAM-TEST-101');
    assert.strictEqual(res.status, 'Ready for Review');
    assert.strictEqual(res.id, 'DREAM-TEST-101');

    // Verify on mock Google Sheet
    const item = await client.getById('DREAM-TEST-101');
    assert.strictEqual(item.Status, 'Ready for Review');

    // Verify metadata.json updated
    const meta = JSON.parse(fs.readFileSync(path.join(projectDir, 'metadata.json'), 'utf8'));
    assert.strictEqual(meta.status, 'Ready for Review');
  });

  test('7. Manual approval and publishing status transitions', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    const orchestrator = new PipelineOrchestrator({
      client,
      projectsRoot: testProjectsDir,
      logger: new PipelineLogger(testLogDir)
    });

    // Transition to Approved
    await orchestrator.updateStatus('DREAM-TEST-101', STATUS_ENUM.APPROVED);
    let item = await client.getById('DREAM-TEST-101');
    assert.strictEqual(item.Status, 'Approved');

    // Transition to Published
    await orchestrator.updateStatus('DREAM-TEST-101', STATUS_ENUM.PUBLISHED);
    item = await client.getById('DREAM-TEST-101');
    assert.strictEqual(item.Status, 'Published');
  });
});
