import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createTicketSchema, updateTicketSchema } from '../src/models/validation-schemas.js';
import { Source, DeviceType } from '../src/models/ticket.js';

describe('Ticket Model Validation', () => {
  it('should validate a valid ticket', () => {
    const validTicket = {
      customer_id: 'CUST001',
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      subject: 'Test Subject',
      description: 'This is a valid description that is long enough',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const { error } = createTicketSchema.validate(validTicket);
    assert.strictEqual(error, undefined, 'Valid ticket should pass validation');
  });

  it('should reject invalid email', () => {
    const invalidTicket = {
      customer_id: 'CUST001',
      customer_email: 'not-an-email',
      customer_name: 'Test User',
      subject: 'Test Subject',
      description: 'This is a valid description that is long enough',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const { error } = createTicketSchema.validate(invalidTicket);
    assert.ok(error, 'Should reject invalid email');
    assert.ok(error.message.includes('email'), 'Error should mention email');
  });

  it('should reject subject longer than 200 characters', () => {
    const longSubject = 'a'.repeat(201);
    const invalidTicket = {
      customer_id: 'CUST001',
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      subject: longSubject,
      description: 'This is a valid description that is long enough',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const { error } = createTicketSchema.validate(invalidTicket);
    assert.ok(error, 'Should reject subject longer than 200 characters');
  });

  it('should reject subject shorter than 1 character', () => {
    const invalidTicket = {
      customer_id: 'CUST001',
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      subject: '',
      description: 'This is a valid description that is long enough',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const { error } = createTicketSchema.validate(invalidTicket);
    assert.ok(error, 'Should reject empty subject');
  });

  it('should reject description shorter than 10 characters', () => {
    const invalidTicket = {
      customer_id: 'CUST001',
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      subject: 'Test Subject',
      description: 'Short',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const { error } = createTicketSchema.validate(invalidTicket);
    assert.ok(error, 'Should reject description shorter than 10 characters');
  });

  it('should reject description longer than 2000 characters', () => {
    const longDescription = 'a'.repeat(2001);
    const invalidTicket = {
      customer_id: 'CUST001',
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      subject: 'Test Subject',
      description: longDescription,
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const { error } = createTicketSchema.validate(invalidTicket);
    assert.ok(error, 'Should reject description longer than 2000 characters');
  });

  it('should reject invalid category', () => {
    const invalidTicket = {
      customer_id: 'CUST001',
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      subject: 'Test Subject',
      description: 'This is a valid description that is long enough',
      category: 'invalid_category',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const { error } = createTicketSchema.validate(invalidTicket);
    assert.ok(error, 'Should reject invalid category');
  });

  it('should reject invalid priority', () => {
    const invalidTicket = {
      customer_id: 'CUST001',
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      subject: 'Test Subject',
      description: 'This is a valid description that is long enough',
      priority: 'super_urgent',
      metadata: {
        source: Source.WEB_FORM,
        device_type: DeviceType.DESKTOP
      }
    };

    const { error } = createTicketSchema.validate(invalidTicket);
    assert.ok(error, 'Should reject invalid priority');
  });

  it('should validate update with partial fields', () => {
    const validUpdate = {
      subject: 'Updated Subject'
    };

    const { error } = updateTicketSchema.validate(validUpdate);
    assert.strictEqual(error, undefined, 'Valid partial update should pass validation');
  });
});
