import { Router, Request, Response } from 'express';
import { ticketStore } from '../services/ticket-store.js';
import { classificationService } from '../services/classification-service.js';
import { importService, FileType } from '../services/import-service.js';
import { validateBody, validateQuery } from '../middleware/validation-middleware.js';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import {
  createTicketSchema,
  updateTicketSchema,
  ticketFiltersSchema
} from '../models/validation-schemas.js';
import { CreateTicketDTO, UpdateTicketDTO, TicketFilters } from '../models/ticket.js';

const router = Router();

// POST /tickets - Create a new ticket
router.post(
  '/',
  validateBody(createTicketSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const dto = req.validatedBody as CreateTicketDTO;
    const autoClassify = req.query.autoClassify === 'true';

    let ticket = ticketStore.create(dto);

    // Auto-classify if requested
    if (autoClassify) {
      const result = classificationService.classify(ticket.subject, ticket.description);

      ticket = ticketStore.update(ticket.id, {
        category: result.category,
        priority: result.priority
      })!;

      ticket.classification = {
        confidence: result.confidence,
        keywords: result.keywords,
        reasoning: result.reasoning,
        manually_classified: false
      };
    }

    res.status(201).json(ticket);
  })
);

// POST /tickets/import - Bulk import tickets
router.post(
  '/import',
  asyncHandler(async (req: Request, res: Response) => {
    const { content, fileType, filename, autoClassify } = req.body;

    if (!content || typeof content !== 'string') {
      throw new AppError(400, 'Content is required and must be a string');
    }

    let detectedType: FileType;
    if (fileType) {
      detectedType = fileType.toLowerCase() as FileType;
      if (!Object.values(FileType).includes(detectedType)) {
        throw new AppError(400, `Invalid file type. Must be one of: ${Object.values(FileType).join(', ')}`);
      }
    } else {
      detectedType = importService.detectFileType(content, filename);
    }

    const result = await importService.import(
      content,
      detectedType,
      autoClassify === true || autoClassify === 'true'
    );

    let statusCode = 200;
    if (result.successful === 0 && result.failed > 0) {
      statusCode = 400;
    } else if (result.successful > 0 && result.failed > 0) {
      statusCode = 207; // Multi-Status for partial success
    }

    res.status(statusCode).json(result);
  })
);

// GET /tickets - List all tickets with optional filters
router.get(
  '/',
  validateQuery(ticketFiltersSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = (req.validatedQuery as TicketFilters) || {};
    const tickets = ticketStore.findByFilters(filters);
    res.status(200).json({
      count: tickets.length,
      tickets
    });
  })
);

// GET /tickets/:id - Get a specific ticket
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const ticket = ticketStore.findById(req.params.id);

    if (!ticket) {
      throw new AppError(404, `Ticket with ID ${req.params.id} not found`);
    }

    res.status(200).json(ticket);
  })
);

// PUT /tickets/:id - Update a ticket
router.put(
  '/:id',
  validateBody(updateTicketSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const dto = req.validatedBody as UpdateTicketDTO;
    const ticket = ticketStore.update(req.params.id, dto);

    if (!ticket) {
      throw new AppError(404, `Ticket with ID ${req.params.id} not found`);
    }

    // Mark manual overrides for classification-related fields
    if (dto.category || dto.priority) {
      ticket.classification = {
        confidence: ticket.classification?.confidence,
        keywords: ticket.classification?.keywords || [],
        reasoning: 'Manually overridden via PUT /tickets/:id',
        manually_classified: true
      };
    }

    res.status(200).json(ticket);
  })
);

// DELETE /tickets/:id - Delete a ticket
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = ticketStore.delete(req.params.id);

    if (!deleted) {
      throw new AppError(404, `Ticket with ID ${req.params.id} not found`);
    }

    res.status(204).send();
  })
);

// POST /tickets/:id/auto-classify - Auto-classify an existing ticket
router.post(
  '/:id/auto-classify',
  asyncHandler(async (req: Request, res: Response) => {
    const ticket = ticketStore.findById(req.params.id);

    if (!ticket) {
      throw new AppError(404, `Ticket with ID ${req.params.id} not found`);
    }

    const result = classificationService.classify(ticket.subject, ticket.description);

    const updated = ticketStore.update(ticket.id, {
      category: result.category,
      priority: result.priority
    })!;

    updated.classification = {
      confidence: result.confidence,
      keywords: result.keywords,
      reasoning: result.reasoning,
      manually_classified: false
    };

    res.status(200).json({
      ticket: updated,
      classification: result
    });
  })
);

export default router;
