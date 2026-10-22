import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DiningTableStatusDto } from '../services/api/floor';
import { buildTableDropPrompt } from './floorPlanTableOps';

vi.mock('../services/api/floor', async () => {
  const actual = await vi.importActual<typeof import('../services/api/floor')>(
    '../services/api/floor'
  );
  return {
    ...actual,
    getTicket: vi.fn(),
    replaceTicketItems: vi.fn(),
    openTicket: vi.fn(),
    transferTicket: vi.fn(),
    mergeTickets: vi.fn(),
  };
});

function table(partial: Partial<DiningTableStatusDto>): DiningTableStatusDto {
  return {
    id: 1,
    establishment_id: 'e',
    floor_plan_id: 1,
    label: 'A',
    pos_x: 0,
    pos_y: 0,
    width: 80,
    height: 80,
    capacity: null,
    shape: 'rectangle',
    sort_order: 0,
    is_active: true,
    open_ticket_id: null,
    open_ticket_updated_at: null,
    opened_by_user_id: null,
    last_served_by_user_id: null,
    has_validated_items: false,
    ...partial,
  };
}

describe('buildTableDropPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows transfer onto a free table', () => {
    expect(
      buildTableDropPrompt(
        table({ label: '1', open_ticket_id: 10, has_active_items: true }),
        table({ id: 2, label: '2', has_active_items: false })
      )
    ).toEqual({
      sourceLabel: '1',
      targetLabel: '2',
      canTransfer: true,
      canMerge: false,
    });
  });

  it('allows merge onto another busy table', () => {
    expect(
      buildTableDropPrompt(
        table({ label: '1', open_ticket_id: 10, has_active_items: true }),
        table({ id: 2, label: '2', open_ticket_id: 11, has_active_items: true })
      )
    ).toEqual({
      sourceLabel: '1',
      targetLabel: '2',
      canTransfer: false,
      canMerge: true,
    });
  });

  it('denies merge onto the same open ticket', () => {
    expect(
      buildTableDropPrompt(
        table({ label: '1', open_ticket_id: 10, has_active_items: true }),
        table({ id: 2, label: '2', open_ticket_id: 10, has_active_items: true })
      ).canMerge
    ).toBe(false);
  });
});
