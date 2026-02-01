import Joi from 'joi';
import { TicketCategory, TicketPriority, TicketStatus, Source, DeviceType } from './ticket.js';

const metadataSchema = Joi.object({
  source: Joi.string()
    .valid(...Object.values(Source))
    .required(),
  browser: Joi.string().optional().allow(''),
  device_type: Joi.string()
    .valid(...Object.values(DeviceType))
    .required()
});

export const createTicketSchema = Joi.object({
  customer_id: Joi.string().required().min(1),
  customer_email: Joi.string().email().required(),
  customer_name: Joi.string().required().min(1),
  subject: Joi.string().required().min(1).max(200),
  description: Joi.string().required().min(10).max(2000),
  category: Joi.string()
    .valid(...Object.values(TicketCategory))
    .optional(),
  priority: Joi.string()
    .valid(...Object.values(TicketPriority))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(TicketStatus))
    .optional(),
  assigned_to: Joi.string().optional().allow(''),
  tags: Joi.array().items(Joi.string()).optional().default([]),
  metadata: metadataSchema.required()
});

export const updateTicketSchema = Joi.object({
  customer_email: Joi.string().email().optional(),
  customer_name: Joi.string().min(1).optional(),
  subject: Joi.string().min(1).max(200).optional(),
  description: Joi.string().min(10).max(2000).optional(),
  category: Joi.string()
    .valid(...Object.values(TicketCategory))
    .optional(),
  priority: Joi.string()
    .valid(...Object.values(TicketPriority))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(TicketStatus))
    .optional(),
  assigned_to: Joi.string().optional().allow(''),
  tags: Joi.array().items(Joi.string()).optional(),
  resolved_at: Joi.date().optional()
}).min(1);

export const ticketFiltersSchema = Joi.object({
  category: Joi.string()
    .valid(...Object.values(TicketCategory))
    .optional(),
  priority: Joi.string()
    .valid(...Object.values(TicketPriority))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(TicketStatus))
    .optional(),
  customer_id: Joi.string().optional(),
  assigned_to: Joi.string().optional()
});

export const importTicketSchema = Joi.object({
  customer_id: Joi.string().required().min(1),
  customer_email: Joi.string().email().required(),
  customer_name: Joi.string().required().min(1),
  subject: Joi.string().required().min(1).max(200),
  description: Joi.string().required().min(10).max(2000),
  category: Joi.string()
    .valid(...Object.values(TicketCategory))
    .default(TicketCategory.OTHER),
  priority: Joi.string()
    .valid(...Object.values(TicketPriority))
    .default(TicketPriority.MEDIUM),
  status: Joi.string()
    .valid(...Object.values(TicketStatus))
    .default(TicketStatus.NEW),
  assigned_to: Joi.string().optional().allow('').default(''),
  tags: Joi.array().items(Joi.string()).optional().default([]),
  metadata: metadataSchema.default({
    source: Source.API,
    device_type: DeviceType.DESKTOP
  }),
  created_at: Joi.date().optional(),
  updated_at: Joi.date().optional()
});
