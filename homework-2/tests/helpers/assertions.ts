import assert from 'node:assert';
import { Ticket } from '../../src/models/ticket.js';

export function assertTicket(ticket: any): asserts ticket is Ticket {
  assert.ok(ticket, 'Ticket should exist');
  assert.ok(ticket.id, 'Ticket should have an id');
  assert.ok(ticket.customer_id, 'Ticket should have a customer_id');
  assert.ok(ticket.customer_email, 'Ticket should have a customer_email');
  assert.ok(ticket.customer_name, 'Ticket should have a customer_name');
  assert.ok(ticket.subject, 'Ticket should have a subject');
  assert.ok(ticket.description, 'Ticket should have a description');
  assert.ok(ticket.category, 'Ticket should have a category');
  assert.ok(ticket.priority, 'Ticket should have a priority');
  assert.ok(ticket.status, 'Ticket should have a status');
  assert.ok(ticket.created_at, 'Ticket should have a created_at');
  assert.ok(ticket.updated_at, 'Ticket should have an updated_at');
  assert.ok(ticket.metadata, 'Ticket should have metadata');
}

export function assertValidationError(response: any, field?: string) {
  assert.strictEqual(response.status, 400, 'Should return 400 for validation error');
  assert.ok(response.body.error, 'Should have error message');
  if (field) {
    assert.ok(
      JSON.stringify(response.body).includes(field),
      `Error should mention field: ${field}`
    );
  }
}

export function assertNotFound(response: any) {
  assert.strictEqual(response.status, 404, 'Should return 404 for not found');
  assert.ok(response.body.error, 'Should have error message');
}

export function assertSuccess(response: any, expectedStatus = 200) {
  assert.strictEqual(response.status, expectedStatus, `Should return ${expectedStatus}`);
}
