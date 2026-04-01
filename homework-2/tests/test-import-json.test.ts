import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { jsonParser } from '../src/services/json-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('JSON Import', () => {
  it('should parse valid JSON file', () => {
    const jsonContent = readFileSync(join(__dirname, '../fixtures/sample_tickets.json'), 'utf-8');
    const result = jsonParser.parse(jsonContent);

    assert.ok(result.success.length > 0, 'Should parse tickets successfully');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors for valid JSON');

    const firstTicket = result.success[0];
    assert.ok(firstTicket.customer_id, 'Should have customer_id');
    assert.ok(firstTicket.customer_email, 'Should have customer_email');
  });

  it('should handle JSON with invalid data', () => {
    const jsonContent = readFileSync(join(__dirname, 'fixtures/invalid_tickets.json'), 'utf-8');
    const result = jsonParser.parse(jsonContent);

    assert.ok(result.errors.length > 0, 'Should have validation errors');
  });

  it('should reject non-array JSON', () => {
    const jsonContent = readFileSync(join(__dirname, 'fixtures/malformed.json'), 'utf-8');
    const result = jsonParser.parse(jsonContent);

    assert.ok(result.errors.length > 0, 'Should reject non-array JSON');
    assert.ok(result.errors[0].error.includes('array'), 'Error should mention array requirement');
  });

  it('should handle empty JSON array', () => {
    const jsonContent = '[]';
    const result = jsonParser.parse(jsonContent);

    assert.strictEqual(result.success.length, 0, 'Should have no tickets');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors');
  });

  it('should handle invalid JSON syntax', () => {
    const jsonContent = '{ "invalid": json }';
    const result = jsonParser.parse(jsonContent);

    assert.ok(result.errors.length > 0, 'Should report JSON syntax error');
  });
});
