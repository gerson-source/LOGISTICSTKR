// logic.js — Pure logic functions for the Run Planner.
// Imported by logic.test.js (Vitest). Index.html uses inline copies of these
// same functions to avoid converting the app's non-module <script> tag.

/**
 * Returns all items for a given run across the three move/transfer arrays.
 * @param {number} runId
 * @param {Object[]} moves         rows from the `moves` table
 * @param {Object[]} bulkTransfers rows from `bulk_transfers`
 * @param {Object[]} assetMoves    rows from `asset_moves`
 */
export function getRunItems(runId, moves, bulkTransfers, assetMoves) {
  return {
    moves:         moves.filter(m => m.run_id === runId),
    bulkTransfers: bulkTransfers.filter(x => x.run_id === runId),
    assetMoves:    assetMoves.filter(a => a.run_id === runId),
  };
}

/**
 * Derives the overall run status from the statuses of all linked items.
 *
 * Terminal states:  moves='complete', bulkTransfers='returned', assetMoves='delivered'
 * Active states:    moves='transit', bulkTransfers='out'|'partial', assetMoves='dispatched'
 *
 * Rules (in order):
 *   'complete'   — every item is terminal
 *   'dispatched' — any item is active
 *   'planned'    — all items are pre-dispatch (queued), or there are no items
 */
export function deriveRunStatus(runId, moves, bulkTransfers, assetMoves) {
  const items = getRunItems(runId, moves, bulkTransfers, assetMoves);
  const all = [
    ...items.moves.map(m => m.status),
    ...items.bulkTransfers.map(x => x.status),
    ...items.assetMoves.map(a => a.status),
  ];
  if (all.length === 0) return 'planned';
  const terminal = s => s === 'complete' || s === 'returned' || s === 'delivered';
  const active   = s => s === 'transit'  || s === 'out'      || s === 'partial' || s === 'dispatched';
  if (all.every(terminal)) return 'complete';
  if (all.some(active))    return 'dispatched';
  return 'planned';
}

/**
 * Returns true if the run has at least one item and none of them are
 * in a terminal or in-transit state (i.e., safe to dispatch).
 */
export function isRunDispatchable(runId, moves, bulkTransfers, assetMoves) {
  const items = getRunItems(runId, moves, bulkTransfers, assetMoves);
  const total = items.moves.length + items.bulkTransfers.length + items.assetMoves.length;
  if (total === 0) return false;
  const anyTerminal = [...items.moves, ...items.bulkTransfers, ...items.assetMoves]
    .some(i => i.status === 'complete' || i.status === 'returned' || i.status === 'delivered');
  const anyTransit = items.moves.some(m => m.status === 'transit');
  return !anyTerminal && !anyTransit;
}

/**
 * Returns moves in a run whose required mobilization (move.truck) does not
 * match the run's assigned truck type (run.truck). Skips completed moves and
 * moves or runs with no truck value set.
 *
 * @param {number} runId
 * @param {Object[]} runs
 * @param {Object[]} moves
 * @returns {Object[]} conflicting moves
 */
export function checkRunMobConflicts(runId, runs, moves) {
  const run = runs.find(r => r.id === runId);
  if (!run || !run.truck) return [];
  return moves.filter(m =>
    m.run_id === runId &&
    m.truck &&
    m.truck !== run.truck &&
    m.status !== 'complete'
  );
}

/**
 * Returns true when every item linked to the run is in a terminal state.
 * A run with zero items is never considered complete.
 */
export function isRunComplete(runId, moves, bulkTransfers, assetMoves) {
  const items = getRunItems(runId, moves, bulkTransfers, assetMoves);
  const total = items.moves.length + items.bulkTransfers.length + items.assetMoves.length;
  if (total === 0) return false;
  return (
    items.moves.every(m => m.status === 'complete') &&
    items.bulkTransfers.every(x => x.status === 'returned') &&
    items.assetMoves.every(a => a.status === 'delivered')
  );
}
