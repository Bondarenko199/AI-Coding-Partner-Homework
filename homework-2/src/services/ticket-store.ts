import { v4 as uuidv4 } from 'uuid';
import {
  Ticket,
  CreateTicketDTO,
  UpdateTicketDTO,
  TicketFilters,
  TicketCategory,
  TicketPriority,
  TicketStatus
} from '../models/ticket.js';

class TicketStore {
  private tickets: Map<string, Ticket>;
  private categoryIndex: Map<TicketCategory, Set<string>>;
  private priorityIndex: Map<TicketPriority, Set<string>>;
  private statusIndex: Map<TicketStatus, Set<string>>;

  constructor() {
    this.tickets = new Map();
    this.categoryIndex = new Map();
    this.priorityIndex = new Map();
    this.statusIndex = new Map();

    // Initialize indexes
    Object.values(TicketCategory).forEach(cat => {
      this.categoryIndex.set(cat, new Set());
    });
    Object.values(TicketPriority).forEach(pri => {
      this.priorityIndex.set(pri, new Set());
    });
    Object.values(TicketStatus).forEach(stat => {
      this.statusIndex.set(stat, new Set());
    });
  }

  create(dto: CreateTicketDTO): Ticket {
    const now = new Date();
    const ticket: Ticket = {
      id: uuidv4(),
      customer_id: dto.customer_id,
      customer_email: dto.customer_email,
      customer_name: dto.customer_name,
      subject: dto.subject,
      description: dto.description,
      category: dto.category || TicketCategory.OTHER,
      priority: dto.priority || TicketPriority.MEDIUM,
      status: dto.status || TicketStatus.NEW,
      created_at: now,
      updated_at: now,
      assigned_to: dto.assigned_to,
      tags: dto.tags || [],
      metadata: dto.metadata
    };

    this.tickets.set(ticket.id, ticket);
    this.addToIndexes(ticket);

    return ticket;
  }

  createWithId(ticket: Ticket): Ticket {
    this.tickets.set(ticket.id, ticket);
    this.addToIndexes(ticket);
    return ticket;
  }

  findById(id: string): Ticket | undefined {
    return this.tickets.get(id);
  }

  findAll(): Ticket[] {
    return Array.from(this.tickets.values());
  }

  findByFilters(filters: TicketFilters): Ticket[] {
    let resultIds: Set<string> | null = null;

    // Apply category filter
    if (filters.category) {
      const categoryIds = this.categoryIndex.get(filters.category);
      if (!categoryIds) return [];
      resultIds = new Set(categoryIds);
    }

    // Apply priority filter
    if (filters.priority) {
      const priorityIds = this.priorityIndex.get(filters.priority);
      if (!priorityIds) return [];

      if (resultIds) {
        resultIds = new Set([...resultIds].filter(id => priorityIds.has(id)));
      } else {
        resultIds = new Set(priorityIds);
      }
    }

    // Apply status filter
    if (filters.status) {
      const statusIds = this.statusIndex.get(filters.status);
      if (!statusIds) return [];

      if (resultIds) {
        resultIds = new Set([...resultIds].filter(id => statusIds.has(id)));
      } else {
        resultIds = new Set(statusIds);
      }
    }

    // Get tickets from IDs
    let tickets: Ticket[];
    if (resultIds) {
      tickets = Array.from(resultIds)
        .map(id => this.tickets.get(id))
        .filter((t): t is Ticket => t !== undefined);
    } else {
      tickets = this.findAll();
    }

    // Apply non-indexed filters
    if (filters.customer_id) {
      tickets = tickets.filter(t => t.customer_id === filters.customer_id);
    }

    if (filters.assigned_to) {
      tickets = tickets.filter(t => t.assigned_to === filters.assigned_to);
    }

    return tickets;
  }

  update(id: string, dto: UpdateTicketDTO): Ticket | undefined {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;

    // Remove from old indexes
    this.removeFromIndexes(ticket);

    // Update ticket
    const updatedTicket: Ticket = {
      ...ticket,
      ...dto,
      id: ticket.id,
      customer_id: ticket.customer_id,
      created_at: ticket.created_at,
      updated_at: new Date()
    };

    this.tickets.set(id, updatedTicket);
    this.addToIndexes(updatedTicket);

    return updatedTicket;
  }

  delete(id: string): boolean {
    const ticket = this.tickets.get(id);
    if (!ticket) return false;

    this.removeFromIndexes(ticket);
    this.tickets.delete(id);
    return true;
  }

  clear(): void {
    this.tickets.clear();
    this.categoryIndex.forEach(set => set.clear());
    this.priorityIndex.forEach(set => set.clear());
    this.statusIndex.forEach(set => set.clear());
  }

  count(): number {
    return this.tickets.size;
  }

  private addToIndexes(ticket: Ticket): void {
    this.categoryIndex.get(ticket.category)?.add(ticket.id);
    this.priorityIndex.get(ticket.priority)?.add(ticket.id);
    this.statusIndex.get(ticket.status)?.add(ticket.id);
  }

  private removeFromIndexes(ticket: Ticket): void {
    this.categoryIndex.get(ticket.category)?.delete(ticket.id);
    this.priorityIndex.get(ticket.priority)?.delete(ticket.id);
    this.statusIndex.get(ticket.status)?.delete(ticket.id);
  }
}

export const ticketStore = new TicketStore();
export default TicketStore;
