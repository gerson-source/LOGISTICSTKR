import { describe, it, expect } from 'vitest';
import { getRunItems, deriveRunStatus, isRunDispatchable, isRunComplete, checkRunMobConflicts } from './logic.js';

// ── Shared fixture data ───────────────────────────────────────────────────────
const moves = [
  { id: 1, run_id: 10, status: 'queued',   kind: 'equipment', item_name: 'Excavator' },
  { id: 2, run_id: 10, status: 'transit',  kind: 'tool',      item_name: 'Hammer Drill' },
  { id: 3, run_id: 20, status: 'complete', kind: 'equipment', item_name: 'Loader' },
  { id: 4, run_id: null, status: 'queued', kind: 'equipment', item_name: 'Dozer' },
];
const bulkTransfers = [
  { id: 1, run_id: 10, status: 'out',      item_name: 'Lumber' },
  { id: 2, run_id: 20, status: 'returned', item_name: 'Plywood' },
];
const assetMoves = [
  { id: 1, run_id: 10, status: 'dispatched', item_name: 'Shore Post 6ft' },
  { id: 2, run_id: 20, status: 'delivered',  item_name: 'Tower Frame' },
];

// ── getRunItems ───────────────────────────────────────────────────────────────
describe('getRunItems', () => {
  it('returns only items for the given run_id', () => {
    const result = getRunItems(10, moves, bulkTransfers, assetMoves);
    expect(result.moves).toHaveLength(2);
    expect(result.bulkTransfers).toHaveLength(1);
    expect(result.assetMoves).toHaveLength(1);
  });

  it('returns empty arrays when no items match', () => {
    const result = getRunItems(999, moves, bulkTransfers, assetMoves);
    expect(result.moves).toHaveLength(0);
    expect(result.bulkTransfers).toHaveLength(0);
    expect(result.assetMoves).toHaveLength(0);
  });

  it('does not include run 20 items when querying run 10', () => {
    const result = getRunItems(10, moves, bulkTransfers, assetMoves);
    expect(result.moves.every(m => m.run_id === 10)).toBe(true);
    expect(result.moves.some(m => m.item_name === 'Loader')).toBe(false);
  });

  it('does not include items with null run_id when querying a real run', () => {
    const result = getRunItems(10, moves, bulkTransfers, assetMoves);
    expect(result.moves.some(m => m.id === 4)).toBe(false);
  });

  it('returns all three arrays as empty for a completely unknown run', () => {
    const result = getRunItems(42, [], [], []);
    expect(result).toEqual({ moves: [], bulkTransfers: [], assetMoves: [] });
  });
});

// ── deriveRunStatus ───────────────────────────────────────────────────────────
describe('deriveRunStatus', () => {
  it('returns planned when all items are queued', () => {
    const m = [{ run_id: 1, status: 'queued' }];
    expect(deriveRunStatus(1, m, [], [])).toBe('planned');
  });

  it('returns dispatched when any move is in transit (run 10)', () => {
    expect(deriveRunStatus(10, moves, bulkTransfers, assetMoves)).toBe('dispatched');
  });

  it('returns dispatched when bulk is out (in-flight)', () => {
    const m = [{ run_id: 5, status: 'queued' }];
    const b = [{ run_id: 5, status: 'out' }];
    expect(deriveRunStatus(5, m, b, [])).toBe('dispatched');
  });

  it('returns dispatched when bulk is partial', () => {
    const b = [{ run_id: 6, status: 'partial' }];
    expect(deriveRunStatus(6, [], b, [])).toBe('dispatched');
  });

  it('returns dispatched when asset move is dispatched', () => {
    const a = [{ run_id: 7, status: 'dispatched' }];
    expect(deriveRunStatus(7, [], [], a)).toBe('dispatched');
  });

  it('returns complete when all items are terminal (run 20)', () => {
    expect(deriveRunStatus(20, moves, bulkTransfers, assetMoves)).toBe('complete');
  });

  it('returns complete with mixed terminal types', () => {
    const m = [{ run_id: 8, status: 'complete' }];
    const b = [{ run_id: 8, status: 'returned' }];
    const a = [{ run_id: 8, status: 'delivered' }];
    expect(deriveRunStatus(8, m, b, a)).toBe('complete');
  });

  it('returns planned for an empty run', () => {
    expect(deriveRunStatus(999, moves, bulkTransfers, assetMoves)).toBe('planned');
  });

  it('returns planned when run has no items at all', () => {
    expect(deriveRunStatus(1, [], [], [])).toBe('planned');
  });
});

// ── isRunDispatchable ─────────────────────────────────────────────────────────
describe('isRunDispatchable', () => {
  it('returns false for a run with no items', () => {
    expect(isRunDispatchable(999, moves, bulkTransfers, assetMoves)).toBe(false);
  });

  it('returns false for completely empty arrays', () => {
    expect(isRunDispatchable(1, [], [], [])).toBe(false);
  });

  it('returns false when any move is in transit (run 10)', () => {
    expect(isRunDispatchable(10, moves, bulkTransfers, assetMoves)).toBe(false);
  });

  it('returns false when any item is terminal (run 20)', () => {
    expect(isRunDispatchable(20, moves, bulkTransfers, assetMoves)).toBe(false);
  });

  it('returns true when all items are pre-dispatch (queued only)', () => {
    const m = [{ run_id: 30, status: 'queued' }, { run_id: 30, status: 'queued' }];
    expect(isRunDispatchable(30, m, [], [])).toBe(true);
  });

  it('returns true for a run with only a queued move and a bulk transfer out', () => {
    const m = [{ run_id: 31, status: 'queued' }];
    const b = [{ run_id: 31, status: 'out' }];
    expect(isRunDispatchable(31, m, b, [])).toBe(true);
  });

  it('returns false when one move is complete and another is queued', () => {
    const m = [{ run_id: 32, status: 'complete' }, { run_id: 32, status: 'queued' }];
    expect(isRunDispatchable(32, m, [], [])).toBe(false);
  });
});

// ── isRunComplete ─────────────────────────────────────────────────────────────
describe('isRunComplete', () => {
  it('returns false for a run with no items', () => {
    expect(isRunComplete(999, moves, bulkTransfers, assetMoves)).toBe(false);
  });

  it('returns false for completely empty arrays', () => {
    expect(isRunComplete(1, [], [], [])).toBe(false);
  });

  it('returns true when all items are terminal (run 20)', () => {
    expect(isRunComplete(20, moves, bulkTransfers, assetMoves)).toBe(true);
  });

  it('returns false when any move is still in transit (run 10)', () => {
    expect(isRunComplete(10, moves, bulkTransfers, assetMoves)).toBe(false);
  });

  it('returns false when moves are complete but bulk is still out', () => {
    const m = [{ run_id: 40, status: 'complete' }];
    const b = [{ run_id: 40, status: 'out' }];
    expect(isRunComplete(40, m, b, [])).toBe(false);
  });

  it('returns false when moves are complete but asset is still dispatched', () => {
    const m = [{ run_id: 41, status: 'complete' }];
    const a = [{ run_id: 41, status: 'dispatched' }];
    expect(isRunComplete(41, m, [], a)).toBe(false);
  });

  it('returns true with only asset moves, all delivered', () => {
    const a = [{ run_id: 42, status: 'delivered' }, { run_id: 42, status: 'delivered' }];
    expect(isRunComplete(42, [], [], a)).toBe(true);
  });

  it('returns true with only bulk transfers, all returned', () => {
    const b = [{ run_id: 43, status: 'returned' }];
    expect(isRunComplete(43, [], b, [])).toBe(true);
  });

  it('returns false if one of many moves is not yet complete', () => {
    const m = [
      { run_id: 44, status: 'complete' },
      { run_id: 44, status: 'complete' },
      { run_id: 44, status: 'transit' },
    ];
    expect(isRunComplete(44, m, [], [])).toBe(false);
  });
});

// ── checkRunMobConflicts ──────────────────────────────────────────────────────
describe('checkRunMobConflicts', () => {
  const runs = [
    { id: 1, truck: 'Pickup' },
    { id: 2, truck: 'Lowboy' },
    { id: 3, truck: null },
  ];
  const moves = [
    { id: 1, run_id: 1, truck: 'Lowboy',  status: 'queued',   item_name: 'Excavator' },
    { id: 2, run_id: 1, truck: 'Pickup',  status: 'queued',   item_name: 'Compactor' },
    { id: 3, run_id: 2, truck: 'Lowboy',  status: 'queued',   item_name: 'Bulldozer' },
    { id: 4, run_id: 1, truck: 'Lowboy',  status: 'complete', item_name: 'Old move' },
    { id: 5, run_id: 1, truck: null,      status: 'queued',   item_name: 'Hand tools' },
  ];

  it('returns moves whose truck does not match the run truck', () => {
    const result = checkRunMobConflicts(1, runs, moves);
    expect(result).toHaveLength(1);
    expect(result[0].item_name).toBe('Excavator');
  });

  it('does not flag moves whose truck matches the run truck', () => {
    const result = checkRunMobConflicts(1, runs, moves);
    expect(result.some(m => m.item_name === 'Compactor')).toBe(false);
  });

  it('ignores completed moves even if truck mismatches', () => {
    const result = checkRunMobConflicts(1, runs, moves);
    expect(result.some(m => m.id === 4)).toBe(false);
  });

  it('ignores moves with no truck set', () => {
    const result = checkRunMobConflicts(1, runs, moves);
    expect(result.some(m => m.id === 5)).toBe(false);
  });

  it('returns empty when run has no truck assigned', () => {
    expect(checkRunMobConflicts(3, runs, moves)).toHaveLength(0);
  });

  it('returns empty when all moves match the run truck', () => {
    expect(checkRunMobConflicts(2, runs, moves)).toHaveLength(0);
  });

  it('returns empty for an unknown run id', () => {
    expect(checkRunMobConflicts(99, runs, moves)).toHaveLength(0);
  });

  it('returns empty when there are no moves', () => {
    expect(checkRunMobConflicts(1, runs, [])).toHaveLength(0);
  });
});
