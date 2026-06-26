// =============================================================================
// src/lib/ticket-state-machine.ts — Ticket status state machine (2.3.1)
// =============================================================================
// THIS IS THE SINGLE SOURCE OF TRUTH for all legal ticket status transitions.
// Any inline status checks elsewhere in the codebase are forbidden. When a
// new transition is needed (future sub-phase), add it to LEGAL_TRANSITIONS
// and wire it into the corresponding orchestrating function in ticket-service.ts.
//
// recallCount approach: derived from TicketEvent rows at read time (approach b).
// The recallTicket() function counts existing RECALLED events inside the
// transaction to compute the new recallCount — no schema change is needed.
// =============================================================================

import type { TicketStatus, TicketEventType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Ticket action (the operation being performed)
// ---------------------------------------------------------------------------

export type TicketAction =
  | 'CALL'
  | 'RECALL'
  | 'NO_SHOW'
  | 'SERVE'
  | 'COMPLETE'
  | 'CANCEL'
  | 'TRANSFER';

// ---------------------------------------------------------------------------
// Single transition rule
// ---------------------------------------------------------------------------

export interface TicketTransition {
  readonly from: TicketStatus;
  readonly action: TicketAction;
  readonly to: TicketStatus;
}

// ---------------------------------------------------------------------------
// Error type for illegal transitions
// ---------------------------------------------------------------------------

export interface InvalidTicketTransitionError {
  kind: 'INVALID_TRANSITION';
  from: TicketStatus;
  action: TicketAction;
  message: string;
}

// ---------------------------------------------------------------------------
// LEGAL_TRANSITIONS — the single source of truth
// ---------------------------------------------------------------------------

/**
 * Every legal ticket status transition defined in Phase 2.
 *
 * Transitions deferred to later phases (e.g. SERVING, COMPLETED, TRANSFER,
 * CANCEL) are intentionally absent from this list.
 */
export const LEGAL_TRANSITIONS: readonly TicketTransition[] = [
  // CALL transitions
  { from: 'WAITING', action: 'CALL', to: 'CALLED' },
  { from: 'RECALLED', action: 'CALL', to: 'CALLED' },
  { from: 'NO_SHOW', action: 'CALL', to: 'CALLED' },

  // RECALL transitions
  { from: 'CALLED', action: 'RECALL', to: 'RECALLED' },
  { from: 'RECALLED', action: 'RECALL', to: 'RECALLED' },

  // NO_SHOW transitions (2.3.2 — listed here so the state machine is complete)
  { from: 'CALLED', action: 'NO_SHOW', to: 'NO_SHOW' },
  { from: 'RECALLED', action: 'NO_SHOW', to: 'NO_SHOW' },
];

// ---------------------------------------------------------------------------
// IMPLEMENTED_ACTIONS — which actions are wired up in Phase 2
// ---------------------------------------------------------------------------

export const IMPLEMENTED_ACTIONS: readonly TicketAction[] = ['CALL', 'RECALL', 'NO_SHOW'];

// ---------------------------------------------------------------------------
// canTransition — predicate
// ---------------------------------------------------------------------------

/**
 * Returns true if the given transition exists in LEGAL_TRANSITIONS.
 * Safe to import on the client (no server-only dependencies).
 */
export function canTransition(from: TicketStatus, to: TicketStatus, action: TicketAction): boolean {
  return LEGAL_TRANSITIONS.some((t) => t.from === from && t.action === action && t.to === to);
}

// ---------------------------------------------------------------------------
// transitionTicket — state transition with validation
// ---------------------------------------------------------------------------

/**
 * Returns the new status after applying `action` to `from`.
 * Throws InvalidTicketTransitionError if no matching transition exists.
 */
export function transitionTicket(from: TicketStatus, action: TicketAction): TicketStatus {
  const transition = LEGAL_TRANSITIONS.find((t) => t.from === from && t.action === action);

  if (!transition) {
    const err: InvalidTicketTransitionError = {
      kind: 'INVALID_TRANSITION',
      from,
      action,
      message: `Ticket cannot be ${action.toLowerCase()}ed from status ${from}.`,
    };
    throw err;
  }

  return transition.to;
}

// ---------------------------------------------------------------------------
// Action-to-event-type mapping (for TicketEvent creation)
// ---------------------------------------------------------------------------

export const ACTION_TO_EVENT_TYPE: Record<TicketAction, TicketEventType | null> = {
  CALL: 'CALLED',
  RECALL: 'RECALLED',
  NO_SHOW: 'NO_SHOW',
  SERVE: 'SERVED',
  COMPLETE: 'COMPLETED',
  CANCEL: 'CANCELLED',
  TRANSFER: 'TRANSFERRED',
};
