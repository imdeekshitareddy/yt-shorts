// Tests for Narrative Validation
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validateNarrative } from '../src/validate.js';

describe('Narrative Validation Tests', () => {
  const completeNarrative = {
    ID: 'DREAM-003',
    Title: 'The Science of Lucid Dreams',
    Narrative: 'Have you ever realized you were dreaming while still asleep? That is called a lucid dream.',
    'YouTube Caption': 'Lucid dreaming explained #shorts #facts',
    'Instagram Caption': 'Can you control your dreams? #luciddream #psychology',
    Status: 'Pending'
  };

  test('1. Valid narrative passes validation', () => {
    const result = validateNarrative(completeNarrative);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.narrative.id, 'DREAM-003');
    assert.strictEqual(result.narrative.title, 'The Science of Lucid Dreams');
    assert.strictEqual(result.narrative.status, 'Pending');
  });

  test('2. Missing ID fails validation', () => {
    const invalid = { ...completeNarrative, ID: '' };
    const result = validateNarrative(invalid);
    assert.strictEqual(result.valid, false);
    assert.ok(result.missingFields.includes('ID'));
  });

  test('3. Missing Title fails validation', () => {
    const invalid = { ...completeNarrative, Title: null };
    const result = validateNarrative(invalid);
    assert.strictEqual(result.valid, false);
    assert.ok(result.missingFields.includes('Title'));
  });

  test('4. Missing Narrative fails validation', () => {
    const invalid = { ...completeNarrative, Narrative: undefined };
    const result = validateNarrative(invalid);
    assert.strictEqual(result.valid, false);
    assert.ok(result.missingFields.includes('Narrative'));
  });

  test('5. Missing YouTube Caption fails validation', () => {
    const invalid = { ...completeNarrative };
    delete invalid['YouTube Caption'];
    const result = validateNarrative(invalid);
    assert.strictEqual(result.valid, false);
    assert.ok(result.missingFields.includes('YouTube Caption'));
  });

  test('6. Missing Instagram Caption fails validation', () => {
    const invalid = { ...completeNarrative };
    delete invalid['Instagram Caption'];
    const result = validateNarrative(invalid);
    assert.strictEqual(result.valid, false);
    assert.ok(result.missingFields.includes('Instagram Caption'));
  });

  test('7. Accepts case-insensitive property names', () => {
    const alternativeCasing = {
      id: 'DREAM-004',
      title: 'Title Lowercase',
      narrative: 'Narrative content here...',
      youtube_caption: 'YouTube Caption here',
      instagram_caption: 'Instagram Caption here'
    };
    const result = validateNarrative(alternativeCasing);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.narrative.id, 'DREAM-004');
    assert.strictEqual(result.narrative.youtubeCaption, 'YouTube Caption here');
  });
});
