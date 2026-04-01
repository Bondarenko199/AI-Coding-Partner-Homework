import { XMLParser } from 'fast-xml-parser';
import { importTicketSchema } from '../models/validation-schemas.js';
import { ParsedTicket } from './csv-parser.js';

export class XmlParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text',
      parseAttributeValue: true,
      trimValues: true
    });
  }

  parse(content: string): {
    success: ParsedTicket[];
    errors: Array<{ row: number; error: string; data?: unknown }>;
  } {
    const success: ParsedTicket[] = [];
    const errors: Array<{ row: number; error: string; data?: unknown }> = [];

    try {
      const parsed = this.parser.parse(content);

      if (!parsed.tickets) {
        errors.push({
          row: 0,
          error: 'XML must have a root <tickets> element'
        });
        return { success, errors };
      }

      let ticketArray = parsed.tickets.ticket;

      if (!ticketArray) {
        // Empty tickets list
        return { success, errors };
      }

      // Ensure it's an array (single ticket becomes object)
      if (!Array.isArray(ticketArray)) {
        ticketArray = [ticketArray];
      }

      for (let i = 0; i < ticketArray.length; i++) {
        const item = ticketArray[i];
        const rowNumber = i + 1;

        try {
          const normalized = this.normalizeTicket(item);
          const { error, value } = importTicketSchema.validate(normalized, {
            abortEarly: false,
            stripUnknown: true
          });

          if (error) {
            errors.push({
              row: rowNumber,
              error: error.details.map(d => d.message).join('; '),
              data: item
            });
          } else {
            success.push(value);
          }
        } catch (err) {
          errors.push({
            row: rowNumber,
            error: err instanceof Error ? err.message : 'Unknown parsing error',
            data: item
          });
        }
      }
    } catch (err) {
      errors.push({
        row: 0,
        error: `XML parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }

    return { success, errors };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeTicket(item: any): ParsedTicket {
    const normalized: ParsedTicket = {
      customer_id: item.customer_id || item.customerId || '',
      customer_email: item.customer_email || item.customerEmail || '',
      customer_name: item.customer_name || item.customerName || '',
      subject: item.subject || '',
      description: item.description || ''
    };

    // Optional fields
    if (item.category) normalized.category = item.category;
    if (item.priority) normalized.priority = item.priority;
    if (item.status) normalized.status = item.status;
    if (item.assigned_to || item.assignedTo) {
      normalized.assigned_to = item.assigned_to || item.assignedTo;
    }

    // Tags
    if (item.tags) {
      if (typeof item.tags === 'string') {
        normalized.tags = item.tags
          .split(',')
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);
      } else if (item.tags.tag) {
        const tagArray = Array.isArray(item.tags.tag) ? item.tags.tag : [item.tags.tag];
        // Convert all tags to strings (in case XML parser converted numbers)
        normalized.tags = tagArray.map((t: unknown) => String(t));
      }
    }

    // Metadata
    if (item.metadata) {
      normalized.metadata = {
        source: item.metadata.source || 'api',
        device_type: item.metadata.device_type || item.metadata.deviceType || 'desktop'
      };
      if (item.metadata.browser) {
        normalized.metadata.browser = item.metadata.browser;
      }
    }

    // Dates
    if (item.created_at || item.createdAt) {
      const dateStr = item.created_at || item.createdAt;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        normalized.created_at = date;
      }
    }

    if (item.updated_at || item.updatedAt) {
      const dateStr = item.updated_at || item.updatedAt;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        normalized.updated_at = date;
      }
    }

    return normalized;
  }
}

export const xmlParser = new XmlParser();
