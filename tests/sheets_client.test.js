// Tests for SheetsClient
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SheetsClient, SheetsApiError } from '../src/sheets_client.js';
import { createMockFetch, MOCK_VALID_TOKEN, MOCK_API_URL } from './mock_apps_script.js';

describe('Google Sheets Client Integration Tests', () => {
  let mock;

  beforeEach(() => {
    mock = createMockFetch();
  });

  test('1. Successful API authentication and claimNext', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    const narrative = await client.claimNext();
    assert.ok(narrative, 'Narrative should be returned');
    assert.strictEqual(narrative.ID, 'DREAM-001');
    assert.strictEqual(narrative.Status, 'Processing', 'Status should be changed to Processing atomically');
  });

  test('2. Invalid API token handling (success: false)', async () => {
    const invalidToken = 'wrong_invalid_secret_token_abc';
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: invalidToken,
      fetchFn: mock.mockFetch
    });

    await assert.rejects(
      async () => {
        await client.claimNext();
      },
      (err) => {
        assert.ok(err instanceof SheetsApiError);
        assert.match(err.message, /unauthorized|invalid/i);
        // Verify raw token is never exposed in error message
        assert.strictEqual(err.message.includes(invalidToken), false, 'Token must not be exposed in error message');
        return true;
      }
    );
  });

  test('3. Claiming next pending narrative transitions second row', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    // Claim first
    await client.claimNext();

    // Claim second
    const narrative2 = await client.claimNext();
    assert.ok(narrative2);
    assert.strictEqual(narrative2.ID, 'DREAM-002');
    assert.strictEqual(narrative2.Status, 'Processing');
  });

  test('4. Empty results when there are no more Pending narratives', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    // Claim both available rows
    await client.claimNext();
    await client.claimNext();

    // Third claim
    const narrative = await client.claimNext();
    assert.strictEqual(narrative, null, 'Should return null when no pending narratives exist');

    const preview = await client.getNext();
    assert.strictEqual(preview, null, 'getNext should return null when no pending narratives exist');
  });

  test('5. Fetch narrative by ID (byId)', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    const narrative = await client.getById('DREAM-001');
    assert.ok(narrative);
    assert.strictEqual(narrative.ID, 'DREAM-001');
    assert.strictEqual(narrative.Title, 'What Happens When You Dream?');
  });

  test('6. Updating permitted fields (update and updateStatus)', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    // Update status to 'Ready for Review'
    await client.updateStatus('DREAM-001', 'Ready for Review');

    const updated = await client.getById('DREAM-001');
    assert.strictEqual(updated.Status, 'Ready for Review');

    // Update YouTube Caption
    await client.update('DREAM-001', {
      'YouTube Caption': 'Updated Title #shorts'
    });

    const updatedCaption = await client.getById('DREAM-001');
    assert.strictEqual(updatedCaption['YouTube Caption'], 'Updated Title #shorts');
  });

  test('7. Rejects unpermitted fields on update', async () => {
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: mock.mockFetch
    });

    await assert.rejects(
      async () => {
        await client.update('DREAM-001', {
          Narrative: 'Attempting to change narrative text'
        });
      },
      /unpermitted field/i
    );
  });

  test('8. Handles request timeout properly', async () => {
    const slowMock = createMockFetch({}, { latencyMs: 200 });
    const client = new SheetsClient({
      apiUrl: MOCK_API_URL,
      token: MOCK_VALID_TOKEN,
      fetchFn: slowMock.mockFetch,
      timeoutMs: 20 // 20ms timeout with 200ms latency
    });

    await assert.rejects(
      async () => {
        await client.claimNext();
      },
      /timed out/i
    );
  });

  test('9. Missing required environment variables throws clean error', async () => {
    // Missing URL
    const clientNoUrl = new SheetsClient({
      apiUrl: '',
      token: 'some_token',
      fetchFn: mock.mockFetch
    });

    await assert.rejects(
      async () => {
        await clientNoUrl.claimNext();
      },
      /APPS_SCRIPT_URL is not configured/i
    );

    // Missing Token
    const clientNoToken = new SheetsClient({
      apiUrl: 'https://script.google.com/macros/s/test/exec',
      token: '',
      fetchFn: mock.mockFetch
    });

    await assert.rejects(
      async () => {
        await clientNoToken.claimNext();
      },
      /APPS_SCRIPT_TOKEN is not configured/i
    );
  });
});
