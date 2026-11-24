// Reusable Google Sheets API Client for dream_narrative_library
import { getConfig, maskToken } from './config.js';

export class SheetsApiError extends Error {
  constructor(message, { statusCode = null, action = null, details = null } = {}) {
    super(message);
    this.name = 'SheetsApiError';
    this.statusCode = statusCode;
    this.action = action;
    this.details = details;
  }
}

export const PERMITTED_UPDATE_FIELDS = [
  'YouTube Caption',
  'Instagram Caption',
  'Status'
];

export const STATUS_ENUM = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  READY_FOR_REVIEW: 'Ready for Review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  FAILED: 'Failed'
};

export class SheetsClient {
  constructor(options = {}) {
    const config = getConfig(options);
    this.apiUrl = options.apiUrl !== undefined ? (options.apiUrl ? options.apiUrl.trim() : '') : config.apiUrl;
    this.token = options.token !== undefined ? (options.token ? options.token.trim() : '') : config.token;
    this.timeoutMs = options.timeoutMs !== undefined ? options.timeoutMs : config.timeoutMs;
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  // Sanitizes error messages to ensure token is never leaked
  _sanitizeError(err, action) {
    let msg = typeof err === 'string' ? err : err?.message || 'Unknown API error';
    if (this.token && msg.includes(this.token)) {
      msg = msg.replaceAll(this.token, maskToken(this.token));
    }
    return new SheetsApiError(msg, {
      statusCode: err?.statusCode || null,
      action
    });
  }

  // Low-level HTTP POST request with authentication & timeout
  async request(action, payload = {}) {
    if (!this.apiUrl) {
      throw new SheetsApiError('APPS_SCRIPT_URL is not configured.', { action });
    }
    if (!this.token) {
      throw new SheetsApiError('APPS_SCRIPT_TOKEN is not configured.', { action });
    }

    const requestBody = {
      token: this.token,
      action,
      ...payload
    };

    let response;
    try {
      const signal = AbortSignal.timeout(this.timeoutMs);
      response = await this.fetchFn(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal,
        redirect: 'follow'
      });
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        throw new SheetsApiError(`Request timed out after ${this.timeoutMs}ms`, { action });
      }
      throw this._sanitizeError(err, action);
    }

    let responseData;
    const responseText = await response.text();
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // If HTML or non-JSON returned (e.g. Google auth or 502 gateway error)
      const sanitized = responseText.slice(0, 200).replace(/<[^>]+>/g, ' ').trim();
      throw new SheetsApiError(
        `Invalid JSON response from Google Apps Script (HTTP ${response.status}): ${sanitized || 'Empty response'}`,
        { statusCode: response.status, action }
      );
    }

    // Check HTTP status code
    if (!response.ok) {
      const errMsg = responseData?.error || responseData?.message || `HTTP ${response.status} error`;
      throw new SheetsApiError(errMsg, { statusCode: response.status, action });
    }

    // Check application-level success flag
    if (responseData && responseData.success === false) {
      const errMsg = responseData.error || responseData.message || 'API request failed';
      // Specific check for "no pending narratives" message: do not throw if it's just empty
      if (action === 'claimNext' || action === 'next') {
        if (/no pending/i.test(errMsg) || /not found/i.test(errMsg)) {
          return { empty: true, raw: responseData };
        }
      }
      throw new SheetsApiError(errMsg, { statusCode: response.status, action });
    }

    return responseData;
  }

  // Extract narrative object from varying Apps Script response envelopes
  _extractNarrative(result) {
    if (!result || result.empty) return null;
    if (result.data) return result.data;
    if (result.narrative) return result.narrative;
    if (result.row) return result.row;
    if (result.item) return result.item;
    // If top-level object itself represents the narrative (has ID / Title)
    if (result.ID || result.id || result.Title || result.title) {
      return result;
    }
    return null;
  }

  // Action: claimNext
  // Claims the first row whose Status is 'Pending'. Atomically sets status to 'Processing'.
  async claimNext() {
    const res = await this.request('claimNext');
    return this._extractNarrative(res);
  }

  // Action: next
  // Returns next Pending narrative without claiming it.
  async getNext() {
    const res = await this.request('next');
    return this._extractNarrative(res);
  }

  // Action: byId
  // Fetches a narrative by ID.
  async getById(id) {
    if (!id || typeof id !== 'string') {
      throw new SheetsApiError('A valid narrative ID is required.', { action: 'byId' });
    }
    const res = await this.request('byId', { id: id.trim() });
    return this._extractNarrative(res);
  }

  // Action: update
  // Updates permitted fields for a narrative: 'YouTube Caption', 'Instagram Caption', 'Status'
  async update(id, fields = {}) {
    if (!id || typeof id !== 'string') {
      throw new SheetsApiError('A valid narrative ID is required.', { action: 'update' });
    }

    // Normalize field names to canonical sheet column names
    const updatePayload = {};
    const unpermitted = [];

    for (const [key, value] of Object.entries(fields)) {
      let canonicalKey = null;
      if (/^youtube[\s_]?caption$/i.test(key)) {
        canonicalKey = 'YouTube Caption';
      } else if (/^instagram[\s_]?caption$/i.test(key)) {
        canonicalKey = 'Instagram Caption';
      } else if (/^status$/i.test(key)) {
        canonicalKey = 'Status';
      } else {
        unpermitted.push(key);
      }

      if (canonicalKey) {
        updatePayload[canonicalKey] = value;
      }
    }

    if (unpermitted.length > 0) {
      throw new SheetsApiError(
        `Cannot update unpermitted field(s): ${unpermitted.join(', ')}. ` +
        `Permitted fields are: ${PERMITTED_UPDATE_FIELDS.join(', ')}`,
        { action: 'update' }
      );
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new SheetsApiError('No valid fields provided to update.', { action: 'update' });
    }

    return await this.request('update', { id: id.trim(), ...updatePayload });
  }

  // Helper method: updateStatus
  // Transitions narrative status: 'Pending' | 'Processing' | 'Ready for Review' | 'Failed'
  async updateStatus(id, status) {
    const validStatuses = Object.values(STATUS_ENUM);
    if (!validStatuses.includes(status)) {
      throw new SheetsApiError(
        `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`,
        { action: 'updateStatus' }
      );
    }
    return await this.update(id, { Status: status });
  }
}
