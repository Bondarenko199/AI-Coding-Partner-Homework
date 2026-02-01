import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { startTestServer, request } from './helpers/test-server.js';
import { TicketStatus, Source, DeviceType, TicketCategory, TicketPriority } from '../src/models/ticket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Integration Tests', () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  before(async () => {
    const server = await startTestServer();
    baseUrl = server.url;
    closeServer = server.close;
  });

  after(async () => {
    if (closeServer) await closeServer();
  });

  it('should complete full ticket lifecycle', async () => {
    // 1. Create ticket
    const createResponse = await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: {
        customer_id: 'CUST_INT_001',
        customer_email: 'lifecycle@example.com',
        customer_name: 'Lifecycle Test',
        subject: 'Test lifecycle',
        description: 'Testing complete ticket lifecycle workflow',
        metadata: {
          source: Source.WEB_FORM,
          device_type: DeviceType.DESKTOP
        }
      }
    });
    assert.strictEqual(createResponse.status, 201);
    const ticketId = createResponse.body.id;

    // 2. Update ticket
    const updateResponse = await request(`${baseUrl}/tickets/${ticketId}`, {
      method: 'PUT',
      body: {
        status: TicketStatus.IN_PROGRESS
      }
    });
    assert.strictEqual(updateResponse.status, 200);
    assert.strictEqual(updateResponse.body.status, TicketStatus.IN_PROGRESS);

    // 3. Auto-classify
    const classifyResponse = await request(`${baseUrl}/tickets/${ticketId}/auto-classify`, {
      method: 'POST'
    });
    assert.strictEqual(classifyResponse.status, 200);
    assert.ok(classifyResponse.body.classification);

    // 4. Resolve ticket
    const resolveResponse = await request(`${baseUrl}/tickets/${ticketId}`, {
      method: 'PUT',
      body: {
        status: TicketStatus.RESOLVED,
        resolved_at: new Date()
      }
    });
    assert.strictEqual(resolveResponse.status, 200);
    assert.strictEqual(resolveResponse.body.status, TicketStatus.RESOLVED);

    // 5. Close ticket
    const closeResponse = await request(`${baseUrl}/tickets/${ticketId}`, {
      method: 'PUT',
      body: {
        status: TicketStatus.CLOSED
      }
    });
    assert.strictEqual(closeResponse.status, 200);
    assert.strictEqual(closeResponse.body.status, TicketStatus.CLOSED);
  });

  it('should import and auto-classify bulk tickets', async () => {
    const csvContent = readFileSync(join(__dirname, '../fixtures/sample_tickets.csv'), 'utf-8');

    const importResponse = await request(`${baseUrl}/tickets/import`, {
      method: 'POST',
      body: {
        content: csvContent,
        fileType: 'csv',
        autoClassify: true
      }
    });

    assert.strictEqual(importResponse.status, 200);
    assert.ok(importResponse.body.successful > 0, 'Should import tickets successfully');

    // Verify tickets have classification
    const listResponse = await request(`${baseUrl}/tickets`);
    const classifiedTickets = listResponse.body.tickets.filter((t: any) => t.classification);
    assert.ok(classifiedTickets.length > 0, 'Should have auto-classified tickets');
  });

  it('should handle concurrent operations', async () => {
    const promises = [];

    // Create 20 tickets concurrently
    for (let i = 0; i < 20; i++) {
      promises.push(
        request(`${baseUrl}/tickets`, {
          method: 'POST',
          body: {
            customer_id: `CUST_CONCURRENT_${i}`,
            customer_email: `concurrent${i}@example.com`,
            customer_name: `Concurrent User ${i}`,
            subject: `Concurrent ticket ${i}`,
            description: `Testing concurrent ticket creation number ${i}`,
            metadata: {
              source: Source.API,
              device_type: DeviceType.DESKTOP
            }
          }
        })
      );
    }

    const results = await Promise.all(promises);

    const successCount = results.filter(r => r.status === 201).length;
    assert.strictEqual(successCount, 20, 'All concurrent requests should succeed');

    // Verify all tickets were created
    const listResponse = await request(`${baseUrl}/tickets`);
    assert.ok(listResponse.body.count >= 20, 'Should have at least 20 tickets');
  });

  it('should filter by multiple criteria', async () => {
    // Create tickets with specific criteria
    await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: {
        customer_id: 'CUST_FILTER_1',
        customer_email: 'filter1@example.com',
        customer_name: 'Filter Test 1',
        subject: 'Billing issue urgent',
        description: 'Need immediate help with billing problem',
        category: TicketCategory.BILLING_QUESTION,
        priority: TicketPriority.HIGH,
        status: TicketStatus.NEW,
        metadata: {
          source: Source.WEB_FORM,
          device_type: DeviceType.DESKTOP
        }
      }
    });

    // Filter by category and priority
    const response = await request(
      `${baseUrl}/tickets?category=${TicketCategory.BILLING_QUESTION}&priority=${TicketPriority.HIGH}`
    );

    assert.strictEqual(response.status, 200);
    assert.ok(response.body.tickets.length > 0, 'Should return filtered tickets');

    response.body.tickets.forEach((ticket: any) => {
      assert.strictEqual(ticket.category, TicketCategory.BILLING_QUESTION);
      assert.strictEqual(ticket.priority, TicketPriority.HIGH);
    });
  });

  it('should handle end-to-end workflow with validation errors', async () => {
    // Try to create invalid ticket
    const invalidResponse = await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: {
        customer_id: 'CUST_INVALID',
        customer_email: 'not-an-email',
        customer_name: 'Invalid User',
        subject: 'Test',
        description: 'Too short',
        metadata: {
          source: Source.WEB_FORM,
          device_type: DeviceType.DESKTOP
        }
      }
    });

    assert.strictEqual(invalidResponse.status, 400, 'Should reject invalid ticket');

    // Create valid ticket
    const validResponse = await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: {
        customer_id: 'CUST_VALID',
        customer_email: 'valid@example.com',
        customer_name: 'Valid User',
        subject: 'Valid Subject',
        description: 'This is a valid description that meets the minimum length requirement',
        metadata: {
          source: Source.WEB_FORM,
          device_type: DeviceType.DESKTOP
        }
      }
    });

    assert.strictEqual(validResponse.status, 201, 'Should create valid ticket');
  });
});
