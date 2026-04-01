import { parse } from 'csv-parse/sync';
import { importTicketSchema } from '../models/validation-schemas.js';
import { Source, DeviceType } from '../models/ticket.js';

export interface ParsedTicket {
  customer_id: string;
  customer_email: string;
  customer_name: string;
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  status?: string;
  assigned_to?: string;
  tags?: string[];
  metadata?: {
    source: string;
    browser?: string;
    device_type: string;
  };
  created_at?: Date;
  updated_at?: Date;
}

export class CsvParser {
  parse(content: string): {
    success: ParsedTicket[];
    errors: Array<{ row: number; error: string; data?: unknown }>;
  } {
    const success: ParsedTicket[] = [];
    const errors: Array<{ row: number; error: string; data?: unknown }> = [];

    try {
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true
      }) as Record<string, string>[];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 2; // +2 because: 1 for header, 1 for 0-index

        try {
          const parsed = this.parseRecord(record);
          const { error, value } = importTicketSchema.validate(parsed, {
            abortEarly: false,
            stripUnknown: true
          });

          if (error) {
            errors.push({
              row: rowNumber,
              error: error.details.map(d => d.message).join('; '),
              data: record
            });
          } else {
            success.push(value);
          }
        } catch (err) {
          errors.push({
            row: rowNumber,
            error: err instanceof Error ? err.message : 'Unknown parsing error',
            data: record
          });
        }
      }
    } catch (err) {
      errors.push({
        row: 0,
        error: `CSV parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }

    return { success, errors };
  }

  private parseRecord(record: Record<string, string>): ParsedTicket {
    const tags = record.tags
      ? record.tags
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0)
      : [];

    const parsed: ParsedTicket = {
      customer_id: record.customer_id || record.customerId || '',
      customer_email: record.customer_email || record.customerEmail || '',
      customer_name: record.customer_name || record.customerName || '',
      subject: record.subject || '',
      description: record.description || '',
      tags,
      metadata: {
        source: (record.source || Source.API) as Source,
        browser: record.browser || undefined,
        device_type: (record.device_type || record.deviceType || DeviceType.DESKTOP) as DeviceType
      }
    };

    // Optional fields
    if (record.category) parsed.category = record.category;
    if (record.priority) parsed.priority = record.priority;
    if (record.status) parsed.status = record.status;
    if (record.assigned_to || record.assignedTo) {
      parsed.assigned_to = record.assigned_to || record.assignedTo;
    }

    // Parse dates if present
    if (record.created_at || record.createdAt) {
      const dateStr = record.created_at || record.createdAt;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        parsed.created_at = date;
      }
    }

    if (record.updated_at || record.updatedAt) {
      const dateStr = record.updated_at || record.updatedAt;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        parsed.updated_at = date;
      }
    }

    return parsed;
  }
}

export const csvParser = new CsvParser();
