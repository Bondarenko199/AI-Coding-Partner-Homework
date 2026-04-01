import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { csvParser } from '../src/services/csv-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CSV Import', () => {
  it('should parse valid CSV file', () => {
    const csvContent = readFileSync(join(__dirname, '../fixtures/sample_tickets.csv'), 'utf-8');
    const result = csvParser.parse(csvContent);

    assert.ok(result.success.length > 0, 'Should parse tickets successfully');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors for valid CSV');

    const firstTicket = result.success[0];
    assert.ok(firstTicket.customer_id, 'Should have customer_id');
    assert.ok(firstTicket.customer_email, 'Should have customer_email');
    assert.ok(firstTicket.subject, 'Should have subject');
    assert.ok(firstTicket.description, 'Should have description');
  });

  it('should handle CSV with invalid data', () => {
    const csvContent = readFileSync(join(__dirname, 'fixtures/invalid_tickets.csv'), 'utf-8');
    const result = csvParser.parse(csvContent);

    assert.ok(result.errors.length > 0, 'Should have validation errors');
    assert.ok(result.errors.some(e => e.error.includes('email')), 'Should report email validation error');
  });

  it('should handle malformed CSV', () => {
    const csvContent = readFileSync(join(__dirname, 'fixtures/malformed.csv'), 'utf-8');
    const result = csvParser.parse(csvContent);

    // Malformed CSV might parse with errors or fail completely
    assert.ok(result.errors.length > 0 || result.success.length === 0, 'Should handle malformed CSV');
  });

  it('should handle empty CSV', () => {
    const csvContent = 'customer_id,customer_email,customer_name,subject,description\n';
    const result = csvParser.parse(csvContent);

    assert.strictEqual(result.success.length, 0, 'Should have no tickets');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors');
  });

  it('should parse tags correctly', () => {
    const csvContent = `customer_id,customer_email,customer_name,subject,description,tags
CUST001,test@example.com,Test User,Test Subject,This is a test description,"tag1,tag2,tag3"`;

    const result = csvParser.parse(csvContent);

    assert.strictEqual(result.success.length, 1, 'Should parse one ticket');
    assert.ok(Array.isArray(result.success[0].tags), 'Tags should be an array');
    assert.strictEqual(result.success[0].tags!.length, 3, 'Should have 3 tags');
  });

  it('should handle special characters and quotes', () => {
    const csvContent = `customer_id,customer_email,customer_name,subject,description
CUST001,test@example.com,"User, Name","Subject with ""quotes""","Description with special chars: @#$%^&*()_+-=[]{}|;:,.<>?"`;

    const result = csvParser.parse(csvContent);

    assert.strictEqual(result.success.length, 1, 'Should parse ticket with special characters');
    assert.ok(result.success[0].subject.includes('quotes'), 'Should handle quotes in subject');
  });
});
