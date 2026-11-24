// Mock Google Apps Script Web App for unit and integration testing
// Supports in-memory mockFetch (network-independent)

export const MOCK_VALID_TOKEN = 'secret_test_token_12345';
export const MOCK_API_URL = 'https://script.google.com/macros/s/mock-test-id/exec';

export function createMockState(initial = {}) {
  const narratives = initial.narratives ? JSON.parse(JSON.stringify(initial.narratives)) : [
    {
      ID: 'DREAM-001',
      Title: 'What Happens When You Dream?',
      Narrative: 'Have you ever wondered what your brain does while you sleep? During REM sleep, your mind creates vivid alternate realities, sorting memories and processing daily emotions. Scientists believe dreams act as a nightly reset button for your sanity.',
      'YouTube Caption': 'What happens when you dream? 🧠 #shorts #facts #psychology',
      'Instagram Caption': 'The truth about what happens in your sleep 🌙 #dreaming #brain #science',
      Status: 'Pending'
    },
    {
      ID: 'DREAM-002',
      Title: 'The Mystery of Sleep Walking',
      Narrative: 'Why do some people walk in their sleep? Sleepwalking occurs when your body awakens partially from deep sleep, but your rational brain remains off. You can perform complex actions without ever remembering them.',
      'YouTube Caption': 'Why people sleepwalk 👁️ #shorts #sleep #science',
      'Instagram Caption': 'The mystery of sleepwalking explained 💤 #sleepwalking #facts',
      Status: 'Pending'
    }
  ];

  function handleRequest(bodyStr) {
    let data;
    try {
      data = JSON.parse(bodyStr);
    } catch {
      return { status: 400, body: { success: false, error: 'Invalid JSON payload' } };
    }

    // 1. Authentication check
    if (!data.token || data.token !== MOCK_VALID_TOKEN) {
      return {
        status: 200,
        body: {
          success: false,
          error: 'Unauthorized: Invalid API token'
        }
      };
    }

    const { action } = data;

    // 2. Action: claimNext
    if (action === 'claimNext') {
      const item = narratives.find((n) => n.Status === 'Pending');
      if (!item) {
        return {
          status: 200,
          body: {
            success: true,
            narrative: null,
            message: 'No pending narratives'
          }
        };
      }
      item.Status = 'Processing';
      return { status: 200, body: { success: true, narrative: { ...item } } };
    }

    // 3. Action: next
    if (action === 'next') {
      const item = narratives.find((n) => n.Status === 'Pending');
      return {
        status: 200,
        body: {
          success: true,
          narrative: item ? { ...item } : null
        }
      };
    }

    // 4. Action: byId
    if (action === 'byId') {
      const item = narratives.find((n) => n.ID === data.id);
      if (!item) {
        return {
          status: 200,
          body: {
            success: false,
            error: `Narrative not found: ${data.id}`
          }
        };
      }
      return { status: 200, body: { success: true, narrative: { ...item } } };
    }

    // 5. Action: update
    if (action === 'update') {
      const item = narratives.find((n) => n.ID === data.id);
      if (!item) {
        return { status: 200, body: { success: false, error: `Narrative not found: ${data.id}` } };
      }

      const permitted = ['YouTube Caption', 'Instagram Caption', 'Status'];
      const keys = Object.keys(data).filter((k) => k !== 'token' && k !== 'action' && k !== 'id');
      const invalid = keys.filter((k) => !permitted.includes(k));

      if (invalid.length > 0) {
        return {
          status: 200,
          body: {
            success: false,
            error: `Unpermitted fields: ${invalid.join(', ')}`
          }
        };
      }

      for (const k of keys) {
        item[k] = data[k];
      }

      return { status: 200, body: { success: true, updated: { ...item } } };
    }

    return { status: 400, body: { success: false, error: `Unknown action: ${action}` } };
  }

  return { narratives, handleRequest };
}

// In-memory mock fetch function that complies with Fetch API without TCP sockets
export function createMockFetch(initialState = {}, { latencyMs = 0 } = {}) {
  const state = createMockState(initialState);

  const mockFetch = async (url, options = {}) => {
    if (latencyMs > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, latencyMs);
        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted due to timeout');
            err.name = 'TimeoutError';
            reject(err);
          });
        }
      });
    }

    if (options.signal?.aborted) {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    }

    const { status, body } = state.handleRequest(options.body || '{}');

    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };

  return {
    mockFetch,
    narratives: state.narratives
  };
}
