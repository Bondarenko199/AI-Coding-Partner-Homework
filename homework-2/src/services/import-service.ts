import { v4 as uuidv4 } from 'uuid';
import { csvParser } from './csv-parser.js';
import { jsonParser } from './json-parser.js';
import { xmlParser } from './xml-parser.js';
import { ticketStore } from './ticket-store.js';
import { classificationService } from './classification-service.js';
import { ImportResult, Ticket, TicketCategory, TicketPriority, TicketStatus, Source, DeviceType } from '../models/ticket.js';
import { ParsedTicket } from './csv-parser.js';

export enum FileType {
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml'
}

export class ImportService {
  async import(content: string, fileType: FileType, autoClassify = false): Promise<ImportResult> {
    let parseResult: {
      success: ParsedTicket[];
      errors: Array<{ row: number; error: string; data?: unknown }>;
    };

    // Parse based on file type
    switch (fileType) {
      case FileType.CSV:
        parseResult = csvParser.parse(content);
        break;
      case FileType.JSON:
        parseResult = jsonParser.parse(content);
        break;
      case FileType.XML:
        parseResult = xmlParser.parse(content);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    const tickets: Ticket[] = [];

    // Create tickets from successfully parsed records
    for (const parsed of parseResult.success) {
      try {
        const now = new Date();

        let category = parsed.category as TicketCategory | undefined;
        let priority = parsed.priority as TicketPriority | undefined;
        let classification = undefined;

        // Auto-classify if requested or if category/priority not provided
        if (autoClassify || !category || !priority) {
          const result = classificationService.classify(parsed.subject, parsed.description);

          if (!category) category = result.category;
          if (!priority) priority = result.priority;

          classification = {
            confidence: result.confidence,
            keywords: result.keywords,
            reasoning: result.reasoning,
            manually_classified: false
          };
        }

        const ticket: Ticket = {
          id: uuidv4(),
          customer_id: parsed.customer_id,
          customer_email: parsed.customer_email,
          customer_name: parsed.customer_name,
          subject: parsed.subject,
          description: parsed.description,
          category: category || TicketCategory.OTHER,
          priority: priority || TicketPriority.MEDIUM,
          status: (parsed.status as TicketStatus) || TicketStatus.NEW,
          created_at: parsed.created_at || now,
          updated_at: parsed.updated_at || now,
          assigned_to: parsed.assigned_to,
          tags: parsed.tags || [],
          metadata: parsed.metadata
            ? {
                source: parsed.metadata.source as Source,
                browser: parsed.metadata.browser,
                device_type: parsed.metadata.device_type as DeviceType
              }
            : {
                source: Source.API,
                device_type: DeviceType.DESKTOP
              },
          classification
        };

        ticketStore.createWithId(ticket);
        tickets.push(ticket);
      } catch (err) {
        parseResult.errors.push({
          row: tickets.length + parseResult.errors.length + 1,
          error: err instanceof Error ? err.message : 'Failed to create ticket'
        });
      }
    }

    return {
      total: parseResult.success.length + parseResult.errors.length,
      successful: tickets.length,
      failed: parseResult.errors.length,
      errors: parseResult.errors,
      tickets
    };
  }

  detectFileType(content: string, filename?: string): FileType {
    // Try filename extension first
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      if (ext === 'csv') return FileType.CSV;
      if (ext === 'json') return FileType.JSON;
      if (ext === 'xml') return FileType.XML;
    }

    // Try content detection
    const trimmed = content.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return FileType.JSON;
    }

    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<tickets')) {
      return FileType.XML;
    }

    // Default to CSV
    return FileType.CSV;
  }
}

export const importService = new ImportService();
