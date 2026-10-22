import { describe, expect, it } from 'vitest';
import { StatusTransitionRules } from './StatusTransitionRules';

describe('StatusTransitionRules', () => {
  it('allows pending_setup → setup_in_progress without approval', () => {
    expect(StatusTransitionRules.isTransitionAllowed('pending_setup', 'setup_in_progress')).toBe(
      true
    );
    expect(StatusTransitionRules.requiresApproval('pending_setup', 'setup_in_progress')).toBe(
      false
    );
  });

  it('requires approval for active → suspended', () => {
    expect(StatusTransitionRules.isTransitionAllowed('active', 'suspended')).toBe(true);
    expect(StatusTransitionRules.requiresApproval('active', 'suspended')).toBe(true);
  });

  it('rejects unknown transitions', () => {
    expect(StatusTransitionRules.isTransitionAllowed('active', 'pending_setup')).toBe(false);
    expect(StatusTransitionRules.getRule('active', 'pending_setup')).toBeUndefined();
  });

  it('lists available transitions for a status', () => {
    const available = StatusTransitionRules.getAvailableTransitions('suspended');
    expect(available).toEqual(expect.arrayContaining(['active', 'cancelled']));
  });
});
