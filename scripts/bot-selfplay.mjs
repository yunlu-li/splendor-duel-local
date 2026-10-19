// Run with Node >=22.6: node --experimental-strip-types scripts/bot-selfplay.mjs 1000 4
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { initializeGame } from '../src/shared/rules/initialize.ts';
import { applyAction } from '../src/shared/rules/reducers.ts';
import { ALL_TOKENS } from '../src/shared/constants/board.ts';
import { chooseBotAction } from '../src/shared/bot/chooseAction.ts';
import { legacyBot } from '../src/tests/helpers/legacyBot.ts';

function invariant(s) {
  for (const color of new Set(ALL_TOKENS)) {
    const count = s.board.filter((c) => c.token === color).length + s.bag.filter((c) => c === color).length + s.players.reduce((n, p) => n + p.tokens[color], 0);
    assert.equal(count, ALL_TOKENS.filter((c) => c === color).length, `token conservation: ${color}`);
  }
  assert.equal(s.publicPrivileges + s.players.reduce((n, p) => n + p.privileges, 0), 3, 'privilege conservation');
  const cards = [...Object.values(s.market).flat(), ...Object.values(s.decks).flat(), ...s.players.flatMap((p) => [...p.reserved, ...p.purchased.map((c) => c.cardId)])];
  assert.equal(cards.length, 67, 'card conservation');
  assert.equal(new Set(cards).size, 67, 'duplicate cards');
}

if (isMainThread) {
  const total = Number(process.argv[2] ?? 1000);
  const workers = Math.min(total, Number(process.argv[3] ?? 4));
  assert(Number.isInteger(total) && total > 0 && Number.isInteger(workers) && workers > 0);
  const reports = [];
  const started = performance.now();
  await Promise.all(Array.from({ length: workers }, (_, offset) => new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { total, workers, offset } });
    worker.on('message', (message) => {
      if (message.progress) console.log(JSON.stringify(message));
      else reports.push(message);
    });
    worker.on('error', reject);
    worker.on('exit', (code) => code ? reject(new Error(`worker exited ${code}`)) : resolve());
  })));
  const result = { games: 0, finished: 0, failures: [], groups: {}, decisions: 0, decisionMs: 0, maxDecisionMs: 0, actions: 0 };
  for (const r of reports) {
    for (const key of ['games', 'finished', 'decisions', 'decisionMs', 'actions']) result[key] += r[key];
    result.maxDecisionMs = Math.max(result.maxDecisionMs, r.maxDecisionMs);
    result.failures.push(...r.failures);
    for (const [group, counts] of Object.entries(r.groups)) {
      result.groups[group] ??= { games: 0, newWins: 0, actions: 0, reasons: {} };
      for (const k of ['games', 'newWins', 'actions']) result.groups[group][k] += counts[k];
      for (const [reason, count] of Object.entries(counts.reasons)) result.groups[group].reasons[reason] = (result.groups[group].reasons[reason] ?? 0) + count;
    }
  }
  result.averageDecisionMs = result.decisionMs / Math.max(1, result.decisions);
  result.elapsedSeconds = (performance.now() - started) / 1000;
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exitCode = 1;
} else {
  const { total, workers, offset } = workerData;
  const r = { games: 0, finished: 0, failures: [], groups: {}, decisions: 0, decisionMs: 0, maxDecisionMs: 0, actions: 0 };
  // Rotate each batch so every worker runs a mix of fast legacy and slower bot-vs-bot games.
  for (let batch = 0; batch * workers < total; batch++) {
    const start = batch * workers;
    const size = Math.min(workers, total - start);
    if (offset >= size) continue;
    const index = start + (offset + batch) % size;
    let s = initializeGame(`bot-validation-${Math.floor(index / 4)}`);
    const first = s.currentPlayerId;
    const selfplay = index % 4 >= 2;
    const newId = index % 2 === 0 ? first : s.players.find((p) => p.id !== first).id;
    const group = selfplay ? 'competitive-vs-friendly' : `new-vs-legacy-${newId === first ? 'first' : 'second'}`;
    r.groups[group] ??= { games: 0, newWins: 0, actions: 0, reasons: {} };
    let actions = 0;
    try {
      invariant(s);
      for (; s.status === 'playing' && actions < 600; actions++) {
        const actor = s.awaitingChoice?.playerId ?? s.currentPlayerId;
        const started = performance.now();
        const action = !selfplay && actor !== newId ? legacyBot(s) : chooseBotAction(s, actor === newId ? 'competitive' : 'friendly')?.action;
        if (selfplay || actor === newId) {
          const ms = performance.now() - started;
          r.decisions++; r.decisionMs += ms; r.maxDecisionMs = Math.max(r.maxDecisionMs, ms);
        }
        assert(action, `no legal action for ${actor}`);
        s = applyAction(s, actor, action);
        invariant(s);
        s.log = []; // UI text is not simulation history.
      }
      assert.equal(s.status, 'finished', '600-action limit exceeded');
      r.finished++;
      r.groups[group].games++;
      r.groups[group].newWins += Number(s.winner.winnerId === newId);
      r.groups[group].actions += actions;
      const reason = s.winner.reason;
      r.groups[group].reasons[reason] = (r.groups[group].reasons[reason] ?? 0) + 1;
    } catch (error) {
      r.failures.push({ index, actions, group, message: error.message, currentPlayer: s.currentPlayerId, choice: s.awaitingChoice });
    }
    r.games++; r.actions += actions;
    if (r.games % 10 === 0) parentPort.postMessage({ progress: r.games, worker: offset, failures: r.failures.length });
  }
  parentPort.postMessage(r);
}
