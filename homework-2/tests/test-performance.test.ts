import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startTestServer, request } from './helpers/test-server.js';
import { Source, DeviceType } from '../src/models/ticket.js';

describe('Performance Tests', () => {
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

  it('should create 1000 tickets efficiently', async () => {
    const startTime = Date.now();
    const batchSize = 100;
    const totalTickets = 1000;

    for (let batch = 0; batch < totalTickets / batchSize; batch++) {
      const promises = [];

      for (let i = 0; i < batchSize; i++) {
        const ticketNum = batch * batchSize + i;
        promises.push(
          request(`${baseUrl}/tickets`, {
            method: 'POST',
            body: {
              customer_id: `CUST_PERF_${ticketNum}`,
              customer_email: `perf${ticketNum}@example.com`,
              customer_name: `Performance Test ${ticketNum}`,
              subject: `Performance test ticket ${ticketNum}`,
              description: `Testing performance with ticket number ${ticketNum}. This is a longer description to simulate real-world data.`,
              metadata: {
                source: Source.API,
                device_type: DeviceType.DESKTOP
              }
            }
          })
        );
      }

      await Promise.all(promises);
    }

    const duration = Date.now() - startTime;

    console.log(`Created ${totalTickets} tickets in ${duration}ms (${(duration / totalTickets).toFixed(2)}ms per ticket)`);

    // Verify all tickets were created
    const listResponse = await request(`${baseUrl}/tickets`);
    assert.ok(listResponse.body.count >= totalTickets, `Should have at least ${totalTickets} tickets`);
  });

  it('should retrieve tickets with filtering efficiently', async () => {
    // Ensure we have tickets
    await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: {
        customer_id: 'CUST_FILTER_PERF',
        customer_email: 'filterperf@example.com',
        customer_name: 'Filter Performance',
        subject: 'Filter test',
        description: 'Testing filter performance',
        category: 'technical_issue',
        metadata: {
          source: Source.WEB_FORM,
          device_type: DeviceType.DESKTOP
        }
      }
    });

    const startTime = Date.now();

    // Run 100 filtered queries
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(request(`${baseUrl}/tickets?category=technical_issue`));
    }

    await Promise.all(promises);

    const duration = Date.now() - startTime;

    console.log(`Performed 100 filtered queries in ${duration}ms (${(duration / 100).toFixed(2)}ms per query)`);
    assert.ok(duration < 10000, 'Should complete 100 queries in less than 10 seconds');
  });

  it('should handle large bulk import efficiently', async () => {
    // Create CSV with 500 records
    const headers = 'customer_id,customer_email,customer_name,subject,description,source,device_type';
    const rows = [];

    for (let i = 0; i < 500; i++) {
      rows.push(
        `CUST_BULK_${i},bulk${i}@example.com,Bulk User ${i},Bulk ticket ${i},This is bulk ticket number ${i} for performance testing,api,desktop`
      );
    }

    const csvContent = [headers, ...rows].join('\n');

    const startTime = Date.now();

    const response = await request(`${baseUrl}/tickets/import`, {
      method: 'POST',
      body: {
        content: csvContent,
        fileType: 'csv'
      }
    });

    const duration = Date.now() - startTime;

    console.log(`Imported 500 tickets in ${duration}ms (${(duration / 500).toFixed(2)}ms per ticket)`);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.successful, 500, 'Should import all 500 tickets');
    assert.ok(duration < 15000, 'Should import 500 tickets in less than 15 seconds');
  });

  it('should handle concurrent read and write operations', async () => {
    const startTime = Date.now();
    const operations = [];

    // Mix of reads and writes
    for (let i = 0; i < 50; i++) {
      // Write operation
      operations.push(
        request(`${baseUrl}/tickets`, {
          method: 'POST',
          body: {
            customer_id: `CUST_RW_${i}`,
            customer_email: `rw${i}@example.com`,
            customer_name: `RW Test ${i}`,
            subject: `Read/Write test ${i}`,
            description: `Testing concurrent read and write operations ${i}`,
            metadata: {
              source: Source.API,
              device_type: DeviceType.DESKTOP
            }
          }
        })
      );

      // Read operation
      operations.push(request(`${baseUrl}/tickets`));
    }

    const results = await Promise.all(operations);

    const duration = Date.now() - startTime;

    console.log(`Completed 100 concurrent operations in ${duration}ms`);

    const successCount = results.filter(r => r.status === 200 || r.status === 201).length;
    assert.strictEqual(successCount, 100, 'All operations should succeed');
  });

  it('should efficiently auto-classify multiple tickets', async () => {
    // Create tickets that need classification
    const createPromises = [];
    for (let i = 0; i < 50; i++) {
      createPromises.push(
        request(`${baseUrl}/tickets`, {
          method: 'POST',
          body: {
            customer_id: `CUST_CLASS_${i}`,
            customer_email: `class${i}@example.com`,
            customer_name: `Classification Test ${i}`,
            subject: `Cannot login to account ${i}`,
            description: `I forgot my password and cannot access my account anymore. This is urgent issue number ${i}.`,
            metadata: {
              source: Source.WEB_FORM,
              device_type: DeviceType.DESKTOP
            }
          }
        })
      );
    }

    const createResults = await Promise.all(createPromises);
    const ticketIds = createResults.map(r => r.body.id);

    const startTime = Date.now();

    // Auto-classify all tickets
    const classifyPromises = ticketIds.map(id =>
      request(`${baseUrl}/tickets/${id}/auto-classify`, {
        method: 'POST'
      })
    );

    await Promise.all(classifyPromises);

    const duration = Date.now() - startTime;

    console.log(`Auto-classified 50 tickets in ${duration}ms (${(duration / 50).toFixed(2)}ms per ticket)`);
    assert.ok(duration < 5000, 'Should classify 50 tickets in less than 5 seconds');
  });
});
