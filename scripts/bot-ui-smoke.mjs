import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeGame } from '../src/shared/rules/initialize.ts';

const executablePath = process.env.BOT_TEST_BROWSER ?? [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync);
const server = await createServer({ server: { host: '127.0.0.1', port: 4178, strictPort: true } });
let browser;
function botSeed(prefix) {
  let seed = `${prefix}-0`;
  for (let n = 0; initializeGame(seed).currentPlayerId !== 'p2'; n++) seed = `${prefix}-${n + 1}`;
  return seed;
}
async function restart(page, seed) {
  await page.getByLabel('Seed', { exact: true }).fill(seed);
  await page.getByRole('button', { name: '重开', exact: true }).click();
}
async function currentIs(page, name) {
  await page.waitForFunction((name) => document.querySelector('.state-ribbon span strong')?.textContent === name, name, { timeout: 30000 });
}
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage();
  const errors = [];
  const roomConnections = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.url().includes(':3001')) roomConnections.push(request.url()); });
  page.on('websocket', (socket) => { if (socket.url().includes(':3001')) roomConnections.push(socket.url()); });
  // Old invitation URLs must still open only the two supported local modes.
  await page.goto('http://127.0.0.1:4178/?room=disabled-room');
  assert.equal(await page.locator('.mode-card').count(), 2);
  assert.equal(await page.getByRole('button', { name: /邀请好友|好友房/ }).count(), 0);
  await page.getByRole('button', { name: /与机器人对战/ }).click();
  const difficulty = page.getByLabel('机器人难度');
  assert.equal(await difficulty.inputValue(), 'competitive');
  const seed = botSeed('ui-bot');
  for (const mode of ['competitive', 'friendly']) {
    await difficulty.selectOption(mode);
    await restart(page, seed);
    await page.locator('.bot-explanation').waitFor({ state: 'visible', timeout: 30000 });
    assert.equal(await page.locator('.error-banner').count(), 0);
    // Completing a turn changes the current player to the human.
    await currentIs(page, '玩家');
    assert((await page.locator('.bot-explanation').innerText()).startsWith('机器人：'));
  }
  // Leaving the mode while a worker/timer is pending must cancel its result.
  await page.getByRole('button', { name: '重开', exact: true }).click();
  await page.getByRole('button', { name: '模式', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.mode-entry-shell') !== null);
  assert.equal(page.workers().length, 0);
  await page.getByRole('button', { name: /本地双人对战/ }).click();
  assert.equal(await page.getByLabel('机器人难度').count(), 0);
  assert.equal(await page.locator('.bot-explanation').count(), 0);
  assert.equal(await page.getByRole('button', { name: '好友房', exact: true }).count(), 0);
  const before = await page.locator('.state-ribbon span strong').first().textContent();
  await page.locator('.board button:not(.token-gold):not(.token-empty)').first().click();
  await page.getByRole('button', { name: '拿取', exact: true }).click();
  assert.notEqual(await page.locator('.state-ribbon span strong').first().textContent(), before);
  assert.deepEqual(roomConnections, []);

  // Inject only the worker transport to hold a real bot turn and inspect human permissions.
  const accessPage = await browser.newPage();
  accessPage.on('pageerror', (error) => errors.push(error.message));
  await accessPage.addInitScript(() => {
    window.Worker = class {
      stopped = false;
      terminate() { this.stopped = true; }
      postMessage({ game }) {
        if (!game.seed.startsWith('ui-access-') || window.__reservedOnce) return;
        window.__reservedOnce = true;
        window.__privateCard = game.decks[1][0];
        const goldCellId = game.board.find((c) => c.token === 'gold').id;
        setTimeout(() => {
          if (!this.stopped) this.onmessage?.({ data: { decision: { action: { type: 'RESERVE_CARD', source: { type: 'deck', level: 1 }, goldCellId }, explanation: '测试保留动作' } } });
        }, 0);
      }
    };
  });
  await accessPage.goto('http://127.0.0.1:4178');
  await accessPage.getByRole('button', { name: /与机器人对战/ }).click();
  await restart(accessPage, botSeed('ui-access'));
  await currentIs(accessPage, '玩家');
  const secret = await accessPage.evaluate(() => window.__privateCard);
  assert(secret);
  assert.equal((await accessPage.locator('body').innerText()).includes(secret), false);
  await accessPage.locator('.board button:not(.token-gold):not(.token-empty)').first().click();
  await accessPage.getByRole('button', { name: '拿取', exact: true }).click();
  await currentIs(accessPage, '机器人');
  for (const label of ['拿取', '特权拿', '补盘', '拿已选 token', '花特权拿 1 个', '补充棋盘']) assert.equal(await accessPage.getByRole('button', { name: label, exact: true }).isDisabled(), true);
  assert.equal(await accessPage.locator('.board button:enabled').count(), 0);
  assert.equal(await accessPage.locator('.card-buttons button:enabled, .level-stamp button:enabled').count(), 0);
  assert.equal(await accessPage.locator('.opponent-seat .reserved-hidden-chip').count(), 1);
  assert.equal(await accessPage.locator('.opponent-seat .reserved-payment-wrap').count(), 0);
  assert.equal((await accessPage.locator('body').innerText()).includes(secret), false);

  // A failed computation can be retried without resetting the current board.
  const retryPage = await browser.newPage();
  retryPage.on('pageerror', (error) => errors.push(error.message));
  await retryPage.addInitScript(() => {
    window.Worker = class {
      stopped = false;
      terminate() { this.stopped = true; }
      postMessage({ game }) {
        if (!game.seed.startsWith('ui-retry-')) return;
        window.__attempts = (window.__attempts ?? 0) + 1;
        const failed = window.__attempts === 1;
        const cellId = game.board.find((c) => c.token && c.token !== 'gold').id;
        setTimeout(() => {
          if (!this.stopped) this.onmessage?.({ data: failed ? { error: '测试计算故障' } : { decision: { action: { type: 'TAKE_TOKENS', cellIds: [cellId] }, explanation: '测试恢复动作' } } });
        }, 0);
      }
    };
  });
  await retryPage.goto('http://127.0.0.1:4178');
  await retryPage.getByRole('button', { name: /与机器人对战/ }).click();
  const retrySeed = botSeed('ui-retry');
  await restart(retryPage, retrySeed);
  await retryPage.getByRole('button', { name: '重试机器人', exact: true }).click();
  await currentIs(retryPage, '玩家');
  assert.equal(await retryPage.getByLabel('Seed', { exact: true }).inputValue(), retrySeed);
  assert.equal(await retryPage.locator('.board button.token-empty').count(), 1);
  assert.equal(await retryPage.locator('.error-banner').count(), 0);
  assert.equal(await retryPage.evaluate(() => window.__attempts), 2);
  assert.deepEqual(errors, []);
  console.log('PASS: only two modes, legacy invite ignored, no room connections, local turn switching, both difficulties, real Web Worker turns, mode cancellation, bot permissions/private cards, retry without reset, no browser errors');
} finally {
  await browser?.close();
  await server.close();
}
