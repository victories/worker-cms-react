import { describe, it, expect } from 'vitest';
import { sitesToPauseRequired, canReactivate } from '../src/lib/site-quota';

describe('sitesToPauseRequired', () => {
  it('returns 0 when resulting max >= active sites', () => {
    expect(sitesToPauseRequired(3, 3)).toBe(0);
    expect(sitesToPauseRequired(2, 5)).toBe(0);
  });
  it('returns the overage when resulting max < active sites', () => {
    expect(sitesToPauseRequired(5, 4)).toBe(1);
    expect(sitesToPauseRequired(5, 1)).toBe(4);
  });
  it('never returns negative', () => {
    expect(sitesToPauseRequired(0, 0)).toBe(0);
  });
});

describe('canReactivate', () => {
  it('allows when active count is below max', () => {
    expect(canReactivate(2, 3)).toBe(true);
  });
  it('blocks when active count meets or exceeds max', () => {
    expect(canReactivate(3, 3)).toBe(false);
    expect(canReactivate(4, 3)).toBe(false);
  });
});
