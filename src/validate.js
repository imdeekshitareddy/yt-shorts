// Narrative Data Validator
export const REQUIRED_NARRATIVE_FIELDS = [
  'ID',
  'Title',
  'Narrative',
  'YouTube Caption',
  'Instagram Caption'
];

export function validateNarrative(rawRow) {
  if (!rawRow || typeof rawRow !== 'object') {
    return {
      valid: false,
      errors: ['Narrative payload is null, undefined, or not an object.'],
      missingFields: [...REQUIRED_NARRATIVE_FIELDS]
    };
  }

  // Helper to extract property case-insensitively
  const getProp = (obj, targetKey) => {
    const normalizedTarget = targetKey.toLowerCase().replace(/[\s_]+/g, '');
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().replace(/[\s_]+/g, '') === normalizedTarget) {
        return typeof v === 'string' ? v.trim() : v;
      }
    }
    return undefined;
  };

  const id = getProp(rawRow, 'ID');
  const title = getProp(rawRow, 'Title');
  const narrative = getProp(rawRow, 'Narrative');
  const youtubeCaption = getProp(rawRow, 'YouTube Caption');
  const instagramCaption = getProp(rawRow, 'Instagram Caption');
  const status = getProp(rawRow, 'Status') || 'Processing';

  const errors = [];
  const missingFields = [];

  if (!id) {
    errors.push("Missing required field: 'ID'");
    missingFields.push('ID');
  }
  if (!title) {
    errors.push("Missing required field: 'Title'");
    missingFields.push('Title');
  }
  if (!narrative) {
    errors.push("Missing required field: 'Narrative'");
    missingFields.push('Narrative');
  }
  if (!youtubeCaption) {
    errors.push("Missing required field: 'YouTube Caption'");
    missingFields.push('YouTube Caption');
  }
  if (!instagramCaption) {
    errors.push("Missing required field: 'Instagram Caption'");
    missingFields.push('Instagram Caption');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      missingFields
    };
  }

  return {
    valid: true,
    narrative: {
      id: String(id),
      title: String(title),
      narrative: String(narrative),
      youtubeCaption: String(youtubeCaption),
      instagramCaption: String(instagramCaption),
      status: String(status)
    }
  };
}
