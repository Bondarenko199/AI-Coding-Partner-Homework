import { describe, it } from 'node:test';
import assert from 'node:assert';
import { classificationService } from '../src/services/classification-service.js';
import { TicketCategory, TicketPriority } from '../src/models/ticket.js';

describe('Auto-Classification Service', () => {
  it('should classify account access issues', () => {
    const result = classificationService.classify(
      'Cannot login',
      'I forgot my password and cannot access my account'
    );

    assert.strictEqual(result.category, TicketCategory.ACCOUNT_ACCESS);
    assert.ok(result.keywords.length > 0, 'Should have matched keywords');
    assert.ok(result.reasoning, 'Should have reasoning');
  });

  it('should classify technical issues', () => {
    const result = classificationService.classify(
      'Application error',
      'Getting 500 error when trying to load the dashboard. This is broken and not working.'
    );

    assert.strictEqual(result.category, TicketCategory.TECHNICAL_ISSUE);
    assert.ok(result.keywords.length > 0, 'Should have matched keywords');
  });

  it('should classify billing questions', () => {
    const result = classificationService.classify(
      'Invoice problem',
      'I need a refund for the duplicate charge on my credit card. The payment was processed twice.'
    );

    assert.strictEqual(result.category, TicketCategory.BILLING_QUESTION);
    assert.ok(result.keywords.includes('refund') || result.keywords.includes('payment'));
  });

  it('should classify feature requests', () => {
    const result = classificationService.classify(
      'Enhancement suggestion',
      'Would like to see dark mode feature added. This would be a nice improvement.'
    );

    assert.strictEqual(result.category, TicketCategory.FEATURE_REQUEST);
    assert.ok(result.keywords.length > 0, 'Should have matched keywords');
  });

  it('should classify bug reports', () => {
    const result = classificationService.classify(
      'Bug in search',
      'Found a bug where search returns incorrect results. Expected: correct items, Actual: wrong items. Steps to reproduce included.'
    );

    assert.strictEqual(result.category, TicketCategory.BUG_REPORT);
    assert.ok(result.keywords.includes('bug'));
  });

  it('should default to other for unclear tickets', () => {
    const result = classificationService.classify(
      'General question',
      'I have a question about the service.'
    );

    assert.strictEqual(result.category, TicketCategory.OTHER);
  });

  it('should classify urgent priority', () => {
    const result = classificationService.classify(
      'Production down',
      'Critical issue - cannot access the system. Production is down and affecting all customers!'
    );

    assert.strictEqual(result.priority, TicketPriority.URGENT);
    assert.ok(result.keywords.includes('critical') || result.keywords.includes('production down'));
  });

  it('should classify high priority', () => {
    const result = classificationService.classify(
      'Important issue',
      'This is blocking our work and we need it fixed soon. Important for our business.'
    );

    assert.strictEqual(result.priority, TicketPriority.HIGH);
  });

  it('should classify low priority', () => {
    const result = classificationService.classify(
      'Minor UI issue',
      'This is a minor cosmetic issue with button alignment. It is low priority, fix when you have time.'
    );

    assert.strictEqual(result.priority, TicketPriority.LOW);
  });

  it('should default to medium priority', () => {
    const result = classificationService.classify(
      'Regular question',
      'I need some help understanding how to use this feature.'
    );

    assert.strictEqual(result.priority, TicketPriority.MEDIUM);
  });
});
