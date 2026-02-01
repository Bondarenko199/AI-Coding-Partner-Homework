import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { xmlParser } from '../src/services/xml-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('XML Import', () => {
  it('should parse valid XML file', () => {
    const xmlContent = readFileSync(join(__dirname, '../fixtures/sample_tickets.xml'), 'utf-8');
    const result = xmlParser.parse(xmlContent);

    assert.ok(result.success.length > 0, 'Should parse tickets successfully');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors for valid XML');

    const firstTicket = result.success[0];
    assert.ok(firstTicket.customer_id, 'Should have customer_id');
    assert.ok(firstTicket.customer_email, 'Should have customer_email');
  });

  it('should handle XML with invalid data', () => {
    const xmlContent = readFileSync(join(__dirname, 'fixtures/invalid_tickets.xml'), 'utf-8');
    const result = xmlParser.parse(xmlContent);

    assert.ok(result.errors.length > 0, 'Should have validation errors');
  });

  it('should handle malformed XML', () => {
    const xmlContent = readFileSync(join(__dirname, 'fixtures/malformed.xml'), 'utf-8');
    const result = xmlParser.parse(xmlContent);

    assert.ok(result.errors.length > 0, 'Should report XML parsing error');
  });

  it('should handle XML without root tickets element', () => {
    const xmlContent = '<?xml version="1.0"?><root></root>';
    const result = xmlParser.parse(xmlContent);

    assert.ok(result.errors.length > 0, 'Should reject XML without tickets root');
    assert.ok(result.errors[0].error.includes('tickets'), 'Error should mention tickets element');
  });

  it('should handle single ticket correctly', () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<tickets>
  <ticket>
    <customer_id>CUST001</customer_id>
    <customer_email>single@example.com</customer_email>
    <customer_name>Single User</customer_name>
    <subject>Single Ticket</subject>
    <description>This is a single ticket in the XML</description>
    <metadata>
      <source>web_form</source>
      <device_type>desktop</device_type>
    </metadata>
  </ticket>
</tickets>`;

    const result = xmlParser.parse(xmlContent);

    assert.strictEqual(result.success.length, 1, 'Should parse single ticket');
    assert.strictEqual(result.success[0].customer_id, 'CUST001');
  });
});
