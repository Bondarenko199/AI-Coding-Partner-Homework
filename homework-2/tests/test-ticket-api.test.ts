import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startTestServer, request } from './helpers/test-server.js';
import { assertTicket, assertValidationError, assertNotFound, assertSuccess } from './helpers/assertions.js';
import { Source, DeviceType, TicketCategory, TicketPriority } from '../src/models/ticket.js';

describe('Ticket API Endpoints', () => {
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

  it('should create a new ticket', async () => {
    const newTicket = {
      customer_id: 'CUST001',
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      subject: 'Test Ticket',
      description: 'This is a test ticket with a valid description',
      tags: ['test'],
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const response = await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: newTicket
    });

    assertSuccess(response, 201);
    assertTicket(response.body);
    assert.strictEqual(response.body.customer_email, newTicket.customer_email);
    assert.strictEqual(response.body.subject, newTicket.subject);
  });

  it('should create ticket with auto-classification', async () => {
    const newTicket = {
      customer_id: 'CUST002',
      customer_email: 'user@example.com',
      customer_name: 'Another User',
      subject: 'Cannot login to my account',
      description: 'I forgot my password and cannot access my account anymore',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const response = await request(`${baseUrl}/tickets?autoClassify=true`, {
      method: 'POST',
      body: newTicket
    });

    assertSuccess(response, 201);
    assertTicket(response.body);
    assert.strictEqual(response.body.category, TicketCategory.ACCOUNT_ACCESS);
    assert.ok(response.body.classification, 'Should have classification data');
    assert.ok(response.body.classification.confidence, 'Should have confidence score');
  });

  it('should reject ticket with invalid email', async () => {
    const invalidTicket = {
      customer_id: 'CUST003',
      customer_email: 'not-an-email',
      customer_name: 'Test User',
      subject: 'Test',
      description: 'Valid description here',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const response = await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: invalidTicket
    });

    assertValidationError(response, 'email');
  });

  it('should get all tickets', async () => {
    const response = await request(`${baseUrl}/tickets`);

    assertSuccess(response, 200);
    assert.ok(response.body.tickets, 'Should have tickets array');
    assert.ok(Array.isArray(response.body.tickets), 'Tickets should be an array');
    assert.ok(response.body.count !== undefined, 'Should have count field');
  });

  it('should filter tickets by category', async () => {
    // Create a ticket with specific category first
    const newTicket = {
      customer_id: 'CUST004',
      customer_email: 'billing@example.com',
      customer_name: 'Billing User',
      subject: 'Invoice question',
      description: 'I need help with my invoice and payment',
      category: TicketCategory.BILLING_QUESTION,
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: newTicket
    });

    const response = await request(`${baseUrl}/tickets?category=${TicketCategory.BILLING_QUESTION}`);

    assertSuccess(response, 200);
    assert.ok(response.body.tickets.length > 0, 'Should return filtered tickets');
    response.body.tickets.forEach((ticket: any) => {
      assert.strictEqual(ticket.category, TicketCategory.BILLING_QUESTION);
    });
  });

  it('should get a specific ticket by ID', async () => {
    // Create a ticket first
    const newTicket = {
      customer_id: 'CUST005',
      customer_email: 'specific@example.com',
      customer_name: 'Specific User',
      subject: 'Specific Ticket',
      description: 'This ticket will be retrieved by ID',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const createResponse = await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: newTicket
    });

    const ticketId = createResponse.body.id;

    const response = await request(`${baseUrl}/tickets/${ticketId}`);

    assertSuccess(response, 200);
    assertTicket(response.body);
    assert.strictEqual(response.body.id, ticketId);
  });

  it('should return 404 for non-existent ticket', async () => {
    const response = await request(`${baseUrl}/tickets/non-existent-id`);
    assertNotFound(response);
  });

  it('should update a ticket', async () => {
    // Create a ticket first
    const newTicket = {
      customer_id: 'CUST006',
      customer_email: 'update@example.com',
      customer_name: 'Update User',
      subject: 'Original Subject',
      description: 'Original description that is long enough',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const createResponse = await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: newTicket
    });

    const ticketId = createResponse.body.id;

    const updateData = {
      subject: 'Updated Subject',
      priority: TicketPriority.HIGH
    };

    const response = await request(`${baseUrl}/tickets/${ticketId}`, {
      method: 'PUT',
      body: updateData
    });

    assertSuccess(response, 200);
    assert.strictEqual(response.body.subject, 'Updated Subject');
    assert.strictEqual(response.body.priority, TicketPriority.HIGH);
  });

  it('should delete a ticket', async () => {
    // Create a ticket first
    const newTicket = {
      customer_id: 'CUST007',
      customer_email: 'delete@example.com',
      customer_name: 'Delete User',
      subject: 'To Be Deleted',
      description: 'This ticket will be deleted',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const createResponse = await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: newTicket
    });

    const ticketId = createResponse.body.id;

    const response = await request(`${baseUrl}/tickets/${ticketId}`, {
      method: 'DELETE'
    });

    assertSuccess(response, 204);

    // Verify ticket is deleted
    const getResponse = await request(`${baseUrl}/tickets/${ticketId}`);
    assertNotFound(getResponse);
  });

  it('should auto-classify an existing ticket', async () => {
    // Create a ticket without classification
    const newTicket = {
      customer_id: 'CUST008',
      customer_email: 'classify@example.com',
      customer_name: 'Classify User',
      subject: 'Critical bug in production',
      description: 'The application crashes when users try to login. This is urgent and affecting all customers.',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const createResponse = await request(`${baseUrl}/tickets`, {
      method: 'POST',
      body: newTicket
    });

    const ticketId = createResponse.body.id;

    const response = await request(`${baseUrl}/tickets/${ticketId}/auto-classify`, {
      method: 'POST'
    });

    assertSuccess(response, 200);
    assert.ok(response.body.ticket, 'Should return updated ticket');
    assert.ok(response.body.classification, 'Should return classification result');
    assert.ok(response.body.classification.category, 'Should have category');
    assert.ok(response.body.classification.priority, 'Should have priority');
    assert.ok(response.body.classification.confidence !== undefined, 'Should have confidence');
    assert.ok(response.body.classification.reasoning, 'Should have reasoning');
    assert.ok(Array.isArray(response.body.classification.keywords), 'Should have keywords array');
  });

  it('should handle bulk import', async () => {
    const importData = {
      content: JSON.stringify([
        {
          customer_id: 'CUST100',
          customer_email: 'bulk1@example.com',
          customer_name: 'Bulk User 1',
          subject: 'Bulk Ticket 1',
          description: 'First ticket in bulk import',
          metadata: {
            source: Source.API,
            device_type: DeviceType.DESKTOP
          }
        },
        {
          customer_id: 'CUST101',
          customer_email: 'bulk2@example.com',
          customer_name: 'Bulk User 2',
          subject: 'Bulk Ticket 2',
          description: 'Second ticket in bulk import',
          metadata: {
            source: Source.API,
            device_type: DeviceType.DESKTOP
          }
        }
      ]),
      fileType: 'json'
    };

    const response = await request(`${baseUrl}/tickets/import`, {
      method: 'POST',
      body: importData
    });

    assertSuccess(response, 200);
    assert.ok(response.body.total !== undefined, 'Should have total count');
    assert.ok(response.body.successful !== undefined, 'Should have successful count');
    assert.ok(response.body.failed !== undefined, 'Should have failed count');
    assert.ok(Array.isArray(response.body.errors), 'Should have errors array');
    assert.strictEqual(response.body.successful, 2, 'Should import 2 tickets successfully');
  });
});
