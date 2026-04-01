import { importTicketSchema } from '../models/validation-schemas.js';
import { ParsedTicket } from './csv-parser.js';

export class JsonParser {
  parse(content: string): {
    success: ParsedTicket[];
    errors: Array<{ row: number; error: string; data?: unknown }>;
  } {
    const success: ParsedTicket[] = [];
    const errors: Array<{ row: number; error: string; data?: unknown }> = [];

    try {
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        errors.push({
          row: 0,
          error: 'JSON must be an array of ticket objects'
        });
        return { success, errors };
      }

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const rowNumber = i + 1;

        try {
          // Convert date strings to Date objects if present
          if (item.created_at && typeof item.created_at === 'string') {
            item.created_at = new Date(item.created_at);
          }
          if (item.updated_at && typeof item.updated_at === 'string') {
            item.updated_at = new Date(item.updated_at);
          }

          const { error, value } = importTicketSchema.validate(item, {
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
        error: `JSON parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }

    return { success, errors };
  }
}

export const jsonParser = new JsonParser();
