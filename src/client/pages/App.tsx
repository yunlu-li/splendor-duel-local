import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { JEWEL_CARDS, ROYAL_CARDS } from '../../shared/constants/cards.local';
import { ABILITY_LABEL, GEM_LABEL, TOKEN_LABEL } from '../../shared/constants/labels';
import type { CardLevel, GameState, GemColor, PayableTokenColor, TokenColor, TokenCounts } from '../../shared/types/game';
import { applyAction, IllegalActionError } from '../../shared/rules/reducers';
import { initializeGame } from '../../shared/rules/initialize';
import { canPurchaseCard, canSpendPrivilegeTakeToken, canTakeTokens, discountedCost, getOpponent, getPlayer, suggestPaymentFor, tokenTotal } from '../../shared/rules/validators';
import { bonusCounts, sameColorPrestige, totalCrowns, totalPrestige } from '../../shared/rules/scoring';
import { getJewelCard, getRoyalCard } from '../../shared/rules/cards';
import { CardView } from '../components/CardView';
import { GemCost } from '../components/GemCost';
import type { ClientToServerEvents, PublicRoomState, ServerToClientEvents } from '../../shared/types/room';
import { io, type Socket } from 'socket.io-client';
import type { BotDecision, BotDifficulty } from '../../shared/bot/types';
import { createCoachSuggestion } from '../coach/suggestion';
import { actingPlayerId, canHumanControl, localViewerId } from '../gameAccess';

const TOKEN_ORDER: TokenColor[] = ['white', 'blue', 'green', 'red', 'black', 'pearl', 'gold'];
const PAYABLE_ORDER: PayableTokenColor[] = ['white', 'blue', 'green', 'red', 'black', 'pearl'];
const GEM_ORDER: GemColor[] = ['white', 'blue', 'green', 'red', 'black'];
const LEVELS: CardLevel[] = [3, 2, 1];
// Friend-room implementation is parked; only local and bot modes are exposed.
const ROOM_MODE_AVAILABLE = false;
const PRIVILEGE_SCROLL_SRC = `${import.meta.env.BASE_URL}assets/privilege-scroll.svg`;

type PurchaseSource =
  | { type: 'market'; level: CardLevel; cardId: string }
  | { type: 'reserved'; cardId: string };

type PaymentTarget = {
  playerId: string;
  source: PurchaseSource;
};

type DetailTarget = {
  playerId: string;
  type: 'purchased' | 'reserved';
};

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function createInitialSeed() {
  return `local-${new Date().toISOString().slice(0, 10)}`;
}

function paymentLabel(payment: TokenCounts) {
  const parts = TOKEN_ORDER.filter((color) => payment[color]).map((color) => `${payment[color]}${TOKEN_LABEL[color]}`);
  return parts.length ? parts.join(' + ') : '免费';
}

function missingPaymentLabel(game: GameState, playerId: string, cardId: string): string {
  const player = getPlayer(game, playerId);
  const cost = discountedCost(player, cardId);
  let totalGap = 0;
  const missing: string[] = [];
  for (const color of PAYABLE_ORDER) {
    const need = cost[color] ?? 0;
    const paid = Math.min(player.tokens[color], need);
    const gap = need - paid;
    totalGap += gap;
    if (gap > 0) missing.push(`${gap}${TOKEN_LABEL[color]}`);
  }
  const remainingAfterGold = Math.max(0, totalGap - player.tokens.gold);
  if (remainingAfterGold === 0) return '可买';
  return `缺 ${missing.join(' / ')}（还差 ${remainingAfterGold} 金/对应宝石）`;
}

function reservedPurchaseStatus(game: GameState, playerId: string, cardId: string, viewerPlayerId?: string): { canBuy: boolean; label: string; title: string } {
  const player = getPlayer(game, playerId);
  const payment = suggestPaymentFor(player, cardId);
  const validation = canPurchaseCard(game, player.id, { type: 'reserved', cardId }, payment);
  if (viewerPlayerId !== player.id) return { canBuy: false, label: '对手卡', title: '只能购买自己的保留卡' };
  if (game.currentPlayerId !== player.id) return { canBuy: false, label: '等回合', title: '轮到你时才能购买保留卡' };
  if (game.awaitingChoice) return { canBuy: false, label: '先选择', title: '先处理当前选择后才能购买' };
  if (!validation.ok) {
    const shortage = missingPaymentLabel(game, player.id, cardId);
    return { canBuy: false, label: shortage, title: shortage === '可买' ? validation.reason ?? '当前不能购买' : shortage };
  }
  return { canBuy: true, label: `购买 ${paymentLabel(payment)}`, title: `购买保留卡，支付：${paymentLabel(payment)}` };
}

function sourceKey(source: PurchaseSource): string {
  return source.type === 'market' ? `market:${source.level}:${source.cardId}` : `reserved:${source.cardId}`;
}

function isPaymentTarget(target: PaymentTarget | null, playerId: string, source: PurchaseSource): boolean {
  return Boolean(target && target.playerId === playerId && sourceKey(target.source) === sourceKey(source));
}

function emptyPayableCounts(): Required<Record<PayableTokenColor, number>> {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0, pearl: 0 };
}

function toPayableDraft(payment: TokenCounts): Required<Record<PayableTokenColor, number>> {
  return {
    white: payment.white ?? 0,
    blue: payment.blue ?? 0,
    green: payment.green ?? 0,
    red: payment.red ?? 0,
    black: payment.black ?? 0,
    pearl: payment.pearl ?? 0,
  };
}

function buildPaymentFromDraft(draft: Required<Record<PayableTokenColor, number>>, cost: Record<PayableTokenColor, number>): TokenCounts {
  const payment: TokenCounts = { ...draft };
  payment.gold = PAYABLE_ORDER.reduce((sum, color) => sum + Math.max(0, cost[color] - draft[color]), 0);
  return payment;
}

function RulesModal({ close }: { close: () => void }) {
  return (
    <div className="rules-overlay" role="presentation" onClick={close}>
      <section className="rules-modal royal-panel" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={(event) => event.stopPropagation()}>
        <div className="rules-header">
          <div>
            <p className="eyebrow">How to Play</p>
            <h2 id="rules-title">规则说明</h2>
          </div>
          <button className="rules-close" onClick={close} aria-label="关闭规则说明">关闭</button>
        </div>

        <div className="rules-content">
          <section>
            <h3>游戏目标</h3>
            <ul>
              <li>率先达到 20 总威望，或</li>
              <li>任意一种宝石颜色达到 10 威望，或</li>
              <li>收集 10 个皇冠，即可获胜。</li>
            </ul>
          </section>

          <section>
            <h3>回合流程</h3>
            <ul>
              <li>每回合先进入可选行动阶段，可以花特权拿 1 个非黄金 token，或补充棋盘。</li>
              <li>之后必须执行一个主要行动：拿宝石、买卡或保留卡。</li>
              <li>如果 token 超过 10 个，需要弃到 10 个以内。</li>
            </ul>
          </section>

          <section>
            <h3>拿宝石</h3>
            <ul>
              <li>一次可以拿 1 到 3 个非黄金 token。</li>
              <li>拿多个 token 时，它们必须相邻、连续，并且在同一行、列或对角线上。</li>
              <li>黄金 token 不能直接拿，只能通过保留卡获得。</li>
            </ul>
          </section>

          <section>
            <h3>买卡和保留</h3>
            <ul>
              <li>购买卡牌时，已有奖励会降低对应颜色费用。</li>
              <li>黄金 token 可以代替任意颜色补足费用缺口。</li>
              <li>保留卡需要从棋盘拿 1 个黄金 token，保留区最多 3 张。</li>
              <li>自己的保留卡可查看和购买，对手的保留卡只显示数量。</li>
            </ul>
          </section>

          <section>
            <h3>特权和卡牌能力</h3>
            <ul>
              <li>有特权时，可以在可选行动阶段花 1 个特权拿 1 个非黄金 token。</li>
              <li>部分卡牌会触发能力，例如获得特权、额外回合、偷取 token、拿同色 token 或复制奖励。</li>
              <li>出现选择面板时，需要先完成当前选择，才能继续其他行动。</li>
            </ul>
          </section>
        </div>
      </section>
    </div>
  );
}

function RoomLobby({ room, playerId, playerName, setPlayerName, inviteCodeInput, setInviteCodeInput, createRoom, joinRoom, setReady, copyInviteLink, copiedInvite, error, backToLocal }: {
  room: PublicRoomState | null;
  playerId: string | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  inviteCodeInput: string;
  setInviteCodeInput: (code: string) => void;
  createRoom: () => void;
  joinRoom: () => void;
  setReady: (ready: boolean) => void;
  copyInviteLink: () => void;
  copiedInvite: boolean;
  error: string | null;
  backToLocal: () => void;
}) {
  const me = room?.players.find((player) => player.id === playerId);
  const canReady = Boolean(room && me);
  return (
    <main className="app-shell room-shell">
      <section className="panel royal-panel room-lobby">
        <p className="eyebrow">Friend Duel Room</p>
        <h1>好友邀请房</h1>
        <p>创建房间后复制邀请链接给好友；双方进入房间并准备后会自动开始对局。</p>
        {error && <div className="error-banner">{error}</div>}

        <div className="room-form-grid">
          <label>你的名字<input value={playerName} onChange={(event) => setPlayerName(event.target.value)} /></label>
          <button onClick={createRoom}>创建房间</button>
          <label>邀请码<input value={inviteCodeInput} onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())} placeholder="输入 6 位邀请码" /></label>
          <button onClick={joinRoom}>加入房间</button>
          <button onClick={backToLocal}>返回本地对局</button>
        </div>

        {room && (
          <section className="room-card">
            <div className="panel-title-row">
              <h2>房间 {room.inviteCode}</h2>
              <button onClick={copyInviteLink}>{copiedInvite ? '已复制' : '复制邀请链接'}</button>
            </div>
            <div className="room-players">
              {(['p1', 'p2'] as const).map((seat) => {
                const player = room.players.find((item) => item.seat === seat);
                return (
                  <div className="room-seat" key={seat}>
                    <strong>{seat.toUpperCase()}</strong>
                    <span>{player ? player.name : '等待好友加入...'}</span>
                    <small>{player ? `${player.connected ? '在线' : '离线'} / ${player.ready ? '已准备' : '未准备'}` : '空位'}</small>
                  </div>
                );
              })}
            </div>
            <div className="action-bar">
              <button disabled={!canReady} onClick={() => setReady(!me?.ready)}>{me?.ready ? '取消准备' : '准备'}</button>
              <span className="hint">需要 2 名玩家都准备后开始。当前 {room.players.length}/2 人。</span>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function ModeEntry({ startLocalDuel, startBotDuel, openRules }: { startLocalDuel: () => void; startBotDuel: () => void; openRules: () => void }) {
  return (
    <main className="app-shell mode-entry-shell">
      <section className="mode-hero royal-panel">
        <div className="mode-hero-header">
          <div>
            <p className="eyebrow">Royal Duel Chamber</p>
            <h1>璀璨宝石对决</h1>
          </div>
          <button className="rules-button" onClick={openRules}>规则说明</button>
        </div>
        <p>请选择游戏模式。你可以在同一台电脑双人轮流操作，也可以和机器人练习。</p>
      </section>
      <section className="mode-grid">
        <button className="mode-card royal-panel" onClick={startLocalDuel}>
          <span>01</span>
          <strong>本地双人对战</strong>
          <small>同一屏幕轮流操作，适合线下试玩和规则验证。</small>
        </button>
        <button className="mode-card royal-panel" onClick={startBotDuel}>
          <span>02</span>
          <strong>与机器人对战</strong>
          <small>无需好友，机器人会自动行动，适合快速体验流程。</small>
        </button>
      </section>
    </main>
  );
}

export function App() {
  const hasRoomInvite = ROOM_MODE_AVAILABLE && window.location.search.includes('room=');
  const [seed, setSeed] = useState(createInitialSeed());
  const [game, setGame] = useState(() => initializeGame(seed));
  const [modeSelected, setModeSelected] = useState(hasRoomInvite);
  const [localMode, setLocalMode] = useState(() => !hasRoomInvite);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [roomPlayerId, setRoomPlayerId] = useState<string | null>(null);
  const [socket, setSocket] = useState<RoomSocket | null>(null);
  const [playerName, setPlayerName] = useState('玩家');
  const [inviteCodeInput, setInviteCodeInput] = useState(() => new URLSearchParams(window.location.search).get('room') ?? '');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<Required<Record<PayableTokenColor, number>>>(() => emptyPayableCounts());
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [botEnabled, setBotEnabled] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('competitive');
  const [botExplanation, setBotExplanation] = useState('');
  const [botComputeFailed, setBotComputeFailed] = useState(false);
  const [botRetryToken, setBotRetryToken] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const botPlayerId = 'p2';
  const visibleGame = localMode ? game : room?.game;

  const currentPlayer = visibleGame ? getPlayer(visibleGame, visibleGame.currentPlayerId) : game.players[0];

  const marketCards = useMemo(() => new Map(JEWEL_CARDS.map((card) => [card.id, card])), []);

  useEffect(() => {
    setBotExplanation('');
  }, [seed, botEnabled]);

  useEffect(() => {
    if (localMode || socket) return;
    const nextSocket: RoomSocket = io(`${window.location.protocol}//${window.location.hostname}:3001`, { transports: ['websocket', 'polling'] });
    nextSocket.on('room:update', (nextRoom) => {
      setRoom(nextRoom);
      if (nextRoom.game) setGame(nextRoom.game);
    });
    nextSocket.on('room:error', (payload) => setError(payload.message));
    setSocket(nextSocket);
    return () => { nextSocket.disconnect(); };
  }, [localMode, socket]);

  useEffect(() => {
    if (!socket || localMode || !inviteCodeInput) return;
    if (room) return;
    joinRoom();
  }, [socket, localMode]);

  function resetGame(nextSeed = seed) {
    if (!localMode) return;
    setBotExplanation('');
    setSeed(nextSeed);
    setGame(initializeGame(nextSeed, ['玩家', botEnabled ? '机器人' : '玩家 B']));
    setSelectedCells([]);
    setPaymentTarget(null);
    setDetailTarget(null);
    setError(null);
  }

  function setBotMode(enabled: boolean) {
    setLocalMode(true);
    setModeSelected(true);
    setBotEnabled(enabled);
    const nextSeed = `local-${Date.now()}`;
    setSeed(nextSeed);
    setGame(initializeGame(nextSeed, ['玩家', enabled ? '机器人' : '玩家 B']));
    setSelectedCells([]);
    setPaymentTarget(null);
    setDetailTarget(null);
    setError(null);
  }

  function run(actionPlayerId: string, action: Parameters<typeof applyAction>[2]) {
    if (localMode && !canHumanControl(game, actionPlayerId, botEnabled)) {
      setError('当前不能操作，请等待当前玩家完成行动。');
      return;
    }
    dispatchAction(actionPlayerId, action);
  }

  // Bot results use a separate internal dispatch path; UI handlers always go through run().
  function dispatchAction(actionPlayerId: string, action: Parameters<typeof applyAction>[2]) {
    try {
      if (!localMode && room && socket) {
        socket.emit('game:action', { roomId: room.roomId, action }, (response) => {
          if (response.ok) {
            setRoom(response.room);
            if (response.room.game) setGame(response.room.game);
            setSelectedCells([]);
            setPaymentTarget(null);
            setDetailTarget(null);
            setError(null);
          } else {
            setError(response.error);
          }
        });
        return;
      }
      setGame(applyAction(game, actionPlayerId, action));
      setSelectedCells([]);
      setPaymentTarget(null);
      setDetailTarget(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof IllegalActionError || caught instanceof Error ? caught.message : String(caught));
    }
  }

  function toggleCell(cellId: string) {
    if (localMode && !canHumanControl(game, actingPlayerId(game), botEnabled)) return;
    const choice = visibleGame?.awaitingChoice;
    if (choice?.type === 'CHOOSE_MATCHING_TOKEN') {
      const cell = visibleGame?.board.find((item) => item.id === cellId);
      if (cell?.token === choice.color) {
        run(choice.playerId, { type: 'CHOOSE_MATCHING_TOKEN', cellId });
      } else {
        setError(`请选择带绿边的 ${GEM_LABEL[choice.color]} 宝石。`);
      }
      return;
    }
    if (choice) {
      setError('请先处理当前弹出的选择。');
      return;
    }
    setSelectedCells((prev) => prev.includes(cellId) ? prev.filter((id) => id !== cellId) : prev.length >= 3 ? prev : [...prev, cellId]);
  }

  function openPaymentSelector(source: PurchaseSource, playerId = currentPlayer.id) {
    if (!visibleGame) return;
    if (localMode && !canHumanControl(game, playerId, botEnabled)) return;
    const player = getPlayer(visibleGame, playerId);
    setPaymentTarget({ playerId, source });
    setPaymentDraft(toPayableDraft(suggestPaymentFor(player, source.cardId)));
    setError(null);
  }

  function firstGoldCellId() {
    return visibleGame?.board.find((cell) => cell.token === 'gold')?.id;
  }

  function switchToRoomMode() {
    setModeSelected(true);
    setLocalMode(false);
    setBotEnabled(false);
    setSelectedCells([]);
    setPaymentTarget(null);
    setDetailTarget(null);
    setError(null);
  }

  function startLocalDuel() {
    const nextSeed = `local-${Date.now()}`;
    setModeSelected(true);
    setLocalMode(true);
    setBotEnabled(false);
    setSeed(nextSeed);
    setGame(initializeGame(nextSeed, ['玩家 A', '玩家 B']));
    setSelectedCells([]);
    setPaymentTarget(null);
    setDetailTarget(null);
    setError(null);
    window.history.replaceState(null, '', window.location.pathname);
  }

  function startBotDuel() {
    const nextSeed = `local-${Date.now()}`;
    setModeSelected(true);
    setLocalMode(true);
    setBotEnabled(true);
    setSeed(nextSeed);
    setGame(initializeGame(nextSeed, ['玩家', '机器人']));
    setSelectedCells([]);
    setPaymentTarget(null);
    setDetailTarget(null);
    setError(null);
    window.history.replaceState(null, '', window.location.pathname);
  }

  function handleRoomAck(response: Parameters<NonNullable<Parameters<ClientToServerEvents['room:create']>[1]>>[0]) {
    if (response.ok) {
      setRoom(response.room);
      setRoomPlayerId(response.playerId);
      if (response.room.game) setGame(response.room.game);
      window.history.replaceState(null, '', `?room=${response.room.inviteCode}`);
      setError(null);
    } else {
      setError(response.error);
    }
  }

  function createRoom() {
    const activeSocket = socket ?? io(`${window.location.protocol}//${window.location.hostname}:3001`, { transports: ['websocket', 'polling'] });
    if (!socket) setSocket(activeSocket);
    activeSocket.emit('room:create', { playerName }, handleRoomAck);
  }

  function joinRoom() {
    const code = inviteCodeInput.trim();
    if (!code) {
      setError('请输入邀请码');
      return;
    }
    const activeSocket = socket ?? io(`${window.location.protocol}//${window.location.hostname}:3001`, { transports: ['websocket', 'polling'] });
    if (!socket) setSocket(activeSocket);
    activeSocket.emit('room:join', { inviteCode: code, playerName }, handleRoomAck);
  }

  function setReady(ready: boolean) {
    if (!socket || !room) return;
    socket.emit('room:ready', { roomId: room.roomId, ready }, handleRoomAck);
  }

  async function copyInviteLink() {
    if (!room) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${room.inviteCode}`;
    await navigator.clipboard?.writeText(url);
    setCopiedInvite(true);
    window.setTimeout(() => setCopiedInvite(false), 1400);
  }

  useEffect(() => {
    if (!modeSelected || !localMode || !botEnabled || game.status !== 'playing') return;
    const actingPlayerId = game.awaitingChoice?.playerId ?? game.currentPlayerId;
    if (actingPlayerId !== botPlayerId) return;
    setBotComputeFailed(false);
    let worker: Worker | undefined;
    let watchdog: number | undefined;
    let cancelled = false;
    const fail = (message: string) => {
      if (cancelled) return;
      worker?.terminate();
      window.clearTimeout(watchdog);
      setBotComputeFailed(true);
      setError(message);
    };
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL('../workers/bot.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<{ decision?: BotDecision | null; error?: string }>) => {
          if (cancelled) return;
          worker?.terminate();
          window.clearTimeout(watchdog);
          const { decision, error: workerError } = event.data;
          if (decision) {
            setBotExplanation(decision.explanation);
            dispatchAction(botPlayerId, decision.action);
          } else {
            fail(workerError ?? '机器人暂时没有可执行行动，可以重试或重开此局。');
          }
        };
        worker.onerror = () => fail('机器人计算失败，可以重试，当前对局已保留。');
        watchdog = window.setTimeout(() => fail('机器人计算超时，可以重试，当前对局已保留。'), 30000);
        worker.postMessage({ game, difficulty: botDifficulty });
      } catch {
        fail('机器人无法启动，可以重试，当前对局已保留。');
      }
    }, 650);
    return () => { cancelled = true; window.clearTimeout(timer); window.clearTimeout(watchdog); worker?.terminate(); };
  }, [modeSelected, localMode, botEnabled, botDifficulty, game, botRetryToken]);

  if (!modeSelected) {
    return (
      <>
        <ModeEntry startLocalDuel={startLocalDuel} startBotDuel={startBotDuel} openRules={() => setRulesOpen(true)} />
        {rulesOpen && <RulesModal close={() => setRulesOpen(false)} />}
      </>
    );
  }

  if (!localMode && (!room || room.status !== 'playing' || !room.game)) {
    return (
      <RoomLobby
        room={room}
        playerId={roomPlayerId}
        playerName={playerName}
        setPlayerName={setPlayerName}
        inviteCodeInput={inviteCodeInput}
        setInviteCodeInput={setInviteCodeInput}
        createRoom={createRoom}
        joinRoom={joinRoom}
        setReady={setReady}
        copyInviteLink={copyInviteLink}
        copiedInvite={copiedInvite}
        error={error}
        backToLocal={() => {
          setModeSelected(false);
          setLocalMode(true);
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  const gameView = visibleGame ?? game;
  const matchingChoice = gameView.awaitingChoice?.type === 'CHOOSE_MATCHING_TOKEN' ? gameView.awaitingChoice : null;
  const roomViewerSeat = room?.players.find((player) => player.id === roomPlayerId)?.seat;
  const viewerPlayerId = localMode ? localViewerId(gameView, botEnabled) : roomViewerSeat;
  const canOperate = localMode ? canHumanControl(gameView, actingPlayerId(gameView), botEnabled)
    : viewerPlayerId === actingPlayerId(gameView) && gameView.status === 'playing';
  const selectedPrivilegeCheck = selectedCells.length === 1 ? canSpendPrivilegeTakeToken(gameView, currentPlayer.id, selectedCells[0]) : null;

  return (
    <main className="app-shell compact-shell">
      <section className="top-courtbar">
        <div className="brand-lockup">
          <p className="eyebrow">Royal Duel Chamber</p>
          <h1>璀璨宝石对决</h1>
          <button className="rules-button compact-rules-button" onClick={() => setRulesOpen(true)}>规则说明</button>
        </div>
        <div className="state-ribbon">
          <span>当前：<strong>{currentPlayer.name}</strong></span>
          <span>阶段：<strong>{game.turnPhase}</strong></span>
          <span>对手：<strong>{botEnabled ? '机器人' : '本地双人'}</strong></span>
          <span>公共卷轴：<strong>{gameView.publicPrivileges}</strong></span>
          <span>袋：<strong>{gameView.bag.length}</strong></span>
          <span>额外：<strong>{gameView.extraTurnPlayerId ?? '-'}</strong></span>
        </div>
        <div className="seed-box compact-seed">
          <input aria-label="Seed" value={seed} onChange={(event) => setSeed(event.target.value)} />
          <button onClick={() => resetGame(seed)}>重开</button>
          <button onClick={() => resetGame(`local-${Date.now()}`)}>随机</button>
          <button className={botEnabled ? 'mode-active' : ''} onClick={() => setBotMode(!botEnabled)}>{botEnabled ? '关机器人' : '开机器人'}</button>
          {localMode && botEnabled && <label>难度 <select aria-label="机器人难度" value={botDifficulty} onChange={(event) => setBotDifficulty(event.target.value as BotDifficulty)}>
            <option value="friendly">休闲</option><option value="competitive">竞技</option>
          </select></label>}
          <button onClick={() => setModeSelected(false)}>模式</button>
        </div>
      </section>

      {error && <div className="error-banner floating-banner">{error}
        {localMode && botEnabled && botComputeFailed && actingPlayerId(game) === botPlayerId && <button onClick={() => {
          setError(null);
          setBotRetryToken((value) => value + 1);
        }}>重试机器人</button>}
      </div>}
      {localMode && botEnabled && botExplanation && <p className="bot-explanation" role="status">机器人：{botExplanation}</p>}
      {gameView.winner && (
        <section className="winner-banner floating-banner">
          <h2>{getPlayer(gameView, gameView.winner.winnerId).name} 获胜！</h2>
          <p>原因：{gameView.winner.reason}，数值：{gameView.winner.value}</p>
          <button onClick={() => resetGame(`local-${Date.now()}`)}>再来一局</button>
        </section>
      )}

      {gameView.awaitingChoice && canOperate && (
        <AwaitingChoicePanel game={gameView} run={run} />
      )}

      <TurnCoachPanel
        game={gameView}
        selectedCells={selectedCells}
        clearSelection={() => setSelectedCells([])}
        run={run}
        botEnabled={botEnabled}
        botPlayerId={botPlayerId}
      />

      <section className="physical-table">
        <div className="opponent-seat">
          <PlayerPanel game={gameView} playerId={gameView.players[1].id} active={gameView.currentPlayerId === gameView.players[1].id} viewerPlayerId={viewerPlayerId} openPaymentSelector={openPaymentSelector} openDetails={setDetailTarget} paymentTarget={paymentTarget} paymentDraft={paymentDraft} setPaymentDraft={setPaymentDraft} closePayment={() => setPaymentTarget(null)} run={run} />
        </div>

        <section className="panel board-panel royal-panel table-board-area">
          <div className="panel-title-row">
            <h2>宝石棋盘</h2>
            <span className="hint">已选：{selectedCells.length ? selectedCells.length : '无'}</span>
          </div>
          <div className="board board-5x5 compact-board table-board">
            {gameView.board.map((cell) => (
              <button
                disabled={!canOperate || Boolean(gameView.awaitingChoice && !matchingChoice)}
                className={`token token-${cell.token ?? 'empty'} ${selectedCells.includes(cell.id) ? 'selected' : ''} ${matchingChoice && cell.token === matchingChoice.color ? 'matching-available' : ''} ${matchingChoice && cell.token !== matchingChoice.color ? 'matching-unavailable' : ''}`}
                key={cell.id}
                style={{ gridColumn: cell.pos.x + 1, gridRow: cell.pos.y + 1 }}
                onClick={() => toggleCell(cell.id)}
                title={matchingChoice && cell.token === matchingChoice.color ? `点击拿取这颗${GEM_LABEL[matchingChoice.color]}宝石` : undefined}
              >
                {cell.token ? TOKEN_LABEL[cell.token] : '-'}
              </button>
            ))}
          </div>
          <div className="action-bar board-actions">
            <button disabled={!canOperate || Boolean(gameView.awaitingChoice)} onClick={() => run(currentPlayer.id, { type: 'TAKE_TOKENS', cellIds: selectedCells })}>拿取</button>
            <button disabled={!canOperate || !selectedPrivilegeCheck?.ok} title={selectedPrivilegeCheck?.reason} onClick={() => run(currentPlayer.id, { type: 'SPEND_PRIVILEGE_TAKE_TOKEN', cellId: selectedCells[0] })}>特权拿</button>
            <button disabled={!canOperate || gameView.turnPhase !== 'optional' || Boolean(gameView.awaitingChoice)} onClick={() => run(currentPlayer.id, { type: 'REPLENISH_BOARD' })}>补盘</button>
            <button onClick={() => setSelectedCells([])}>清空</button>
          </div>
          <div className="board-below-tray">
            <div className="scroll-bank" title={`公共卷轴 ${gameView.publicPrivileges}`}>
              <span className="tray-label">公共卷轴</span>
              <div className="scroll-icons">
                {[0, 1, 2].map((index) => <img className={`scroll-icon-img ${index < gameView.publicPrivileges ? 'available' : 'spent'}`} key={index} src={PRIVILEGE_SCROLL_SRC} alt={index < gameView.publicPrivileges ? '可用公共卷轴' : '已使用公共卷轴'} />)}
              </div>
            </div>
            <div className="board-royals">
              <span className="tray-label">皇室</span>
              <div className="royal-mini-row table-royals board-royals-row">
                {game.availableRoyals.map((id) => <CardView card={getRoyalCard(id)} key={id} />)}
              </div>
            </div>
          </div>
        </section>

        <section className="panel market-panel royal-panel table-market-area">
          <div className="panel-title-row">
            <h2>卡牌金字塔</h2>
            <span className="hint">当前玩家需支付按 {currentPlayer.name} 的奖励计算</span>
          </div>
          <div className="compact-market table-pyramid">
            {LEVELS.map((level) => (
              <div className={`market-level market-level-${level}`} key={level}>
                <div className="level-stamp">
                  <strong>L{level}</strong>
                  <span>{gameView.decks[level].length}</span>
                  <button disabled={!canOperate || Boolean(gameView.awaitingChoice) || !firstGoldCellId() || currentPlayer.reserved.length >= 3 || gameView.decks[level].length === 0} onClick={() => {
                    const goldCellId = firstGoldCellId();
                    if (goldCellId) run(currentPlayer.id, { type: 'RESERVE_CARD', source: { type: 'deck', level }, goldCellId });
                  }}>盲保</button>
                </div>
                <div className="card-row compact-card-row table-card-row">
                  {game.market[level].map((id) => {
                    const card = marketCards.get(id)!;
                    const payment = suggestPaymentFor(currentPlayer, id);
                    const canBuy = canOperate && canPurchaseCard(gameView, currentPlayer.id, { type: 'market', level, cardId: id }, payment).ok;
                    const goldCellId = firstGoldCellId();
                    return (
                      <div className={`card-action compact-card-action table-card-action ${canBuy ? 'card-can-buy' : 'card-cannot-buy'}`} key={id}>
                        <CardView card={card} />
                        <div className="mini-info pay-info"><GemCost cost={discountedCost(currentPlayer, id)} /><small>{missingPaymentLabel(gameView, currentPlayer.id, id)}</small></div>
                        <div className="card-buttons">
                          <button disabled={!canBuy} onClick={() => openPaymentSelector({ type: 'market', level, cardId: id })}>买</button>
                          <button disabled={!canOperate || Boolean(gameView.awaitingChoice) || !goldCellId || currentPlayer.reserved.length >= 3} onClick={() => goldCellId && run(currentPlayer.id, { type: 'RESERVE_CARD', source: { type: 'market', level, cardId: id }, goldCellId })}>留</button>
                        </div>
                        {isPaymentTarget(paymentTarget, currentPlayer.id, { type: 'market', level, cardId: id }) && (
                          <CompactPaymentPopover
                            game={gameView}
                            target={paymentTarget!}
                            draft={paymentDraft}
                            setDraft={setPaymentDraft}
                            close={() => setPaymentTarget(null)}
                            run={run}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className={`panel side-panel royal-panel table-side-area ${detailTarget ? 'detail-side' : 'log-only-side'}`}>
          {detailTarget && (
            <CardDetailPanel
              game={gameView}
              target={detailTarget}
              viewerPlayerId={viewerPlayerId}
              close={() => setDetailTarget(null)}
              openPaymentSelector={openPaymentSelector}
            />
          )}
          <div className="panel-title-row log-title"><h2>诏令日志</h2></div>
          <ol className="compact-log table-log">
            {gameView.log.slice(-12).map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}
          </ol>
        </aside>

        <div className="self-seat">
          <PlayerPanel game={gameView} playerId={gameView.players[0].id} active={gameView.currentPlayerId === gameView.players[0].id} viewerPlayerId={viewerPlayerId} openPaymentSelector={openPaymentSelector} openDetails={setDetailTarget} paymentTarget={paymentTarget} paymentDraft={paymentDraft} setPaymentDraft={setPaymentDraft} closePayment={() => setPaymentTarget(null)} run={run} />
        </div>
      </section>
      {rulesOpen && <RulesModal close={() => setRulesOpen(false)} />}
    </main>
  );
}

function TurnCoachPanel({ game, selectedCells, clearSelection, run, botEnabled, botPlayerId }: { game: GameState; selectedCells: string[]; clearSelection: () => void; run: (playerId: string, action: Parameters<typeof applyAction>[2]) => void; botEnabled: boolean; botPlayerId: string }) {
  const player = getPlayer(game, game.currentPlayerId);
  const isBotTurn = botEnabled && ((game.awaitingChoice?.playerId ?? game.currentPlayerId) === botPlayerId);
  const chosenCells = selectedCells.map((id) => game.board.find((cell) => cell.id === id)).filter(Boolean) as GameState['board'];
  const chosenTokens = chosenCells.map((cell) => cell.token).filter(Boolean) as TokenColor[];
  const takeCheck = selectedCells.length ? canTakeTokens(game, player.id, selectedCells) : null;
  const privilegeCheck = selectedCells.length === 1 ? canSpendPrivilegeTakeToken(game, player.id, selectedCells[0]) : null;
  const selectedText = chosenTokens.length ? chosenTokens.map((token) => TOKEN_LABEL[token]).join(' + ') : '尚未选择棋盘 token';
  const affordableMarket = LEVELS.flatMap((level) => game.market[level].map((cardId) => ({ level, cardId })))
    .filter(({ level, cardId }) => canPurchaseCard(game, player.id, { type: 'market', level, cardId }, suggestPaymentFor(player, cardId)).ok);
  const affordableReserved = isBotTurn ? [] : player.reserved.filter((cardId) => canPurchaseCard(game, player.id, { type: 'reserved', cardId }, suggestPaymentFor(player, cardId)).ok);
  const goldCell = game.board.find((cell) => cell.token === 'gold');
  const suggestion: ReturnType<typeof createCoachSuggestion> = isBotTurn
    ? { title: '机器人正在思考', detail: '行动后会展示理由。' }
    : createCoachSuggestion(game, player.id, paymentLabel);

  let nextHint = '先执行可选行动，或直接选择一个强制行动结束回合。';
  if (game.awaitingChoice) nextHint = '先处理弹出的选择/弃牌面板，之后回合会继续结算。';
  else if (game.turnPhase === 'mandatory') nextHint = '已经进入强制行动阶段：购买、保留或拿 token 后会结算并换人。';
  else if (player.tokens.gold && affordableMarket.length + affordableReserved.length > 0) nextHint = '你有黄金 token，可优先查看可购买卡牌的自动支付。';
  else if (goldCell && player.reserved.length < 3) nextHint = '棋盘有黄金，可保留明牌或盲保牌堆。';

  return (
    <section className="panel royal-panel turn-coach">
      <div>
        <p className="eyebrow">Turn Assistant</p>
        <h2>{player.name} 的操作面板</h2>
      </div>
      <div className="coach-status">
        <span>阶段：<strong>{game.turnPhase}</strong></span>
        <span>手牌 token：<strong>{tokenTotal(player.tokens)}/10</strong></span>
        <span>已选：<strong>{selectedText}</strong></span>
      </div>
      <p>{isBotTurn ? '机器人正在思考并会自动行动。' : nextHint}</p>
      <div className="coach-actions">
        <button disabled={isBotTurn || !suggestion.action} onClick={() => suggestion.action && run(player.id, suggestion.action)}>执行建议</button>
        <button disabled={isBotTurn || !takeCheck?.ok} onClick={() => run(player.id, { type: 'TAKE_TOKENS', cellIds: selectedCells })}>拿已选 token</button>
        <button disabled={isBotTurn || !privilegeCheck?.ok} onClick={() => run(player.id, { type: 'SPEND_PRIVILEGE_TAKE_TOKEN', cellId: selectedCells[0] })}>花特权拿 1 个</button>
        <button disabled={isBotTurn || game.status !== 'playing' || game.turnPhase !== 'optional' || !game.board.some((cell) => cell.token === null) || game.bag.length === 0 || Boolean(game.awaitingChoice)} onClick={() => run(player.id, { type: 'REPLENISH_BOARD' })}>补充棋盘</button>
        <button disabled={!selectedCells.length} onClick={clearSelection}>清空选择</button>
      </div>
      <div className="coach-lists">
        <span className="coach-suggestion">建议：{suggestion.title} - {suggestion.detail}</span>
        <span>可买市场：{affordableMarket.length ? affordableMarket.map(({ cardId }) => cardId).join('、') : '暂无'}</span>
        <span>可买保留：{isBotTurn ? '对手保留卡已隐藏' : affordableReserved.length ? affordableReserved.join('、') : '暂无'}</span>
        <span>黄金格：{goldCell ? goldCell.id : '暂无'}</span>
      </div>
      {takeCheck && !takeCheck.ok && <small className="coach-warning">拿取校验：{takeCheck.reason}</small>}
      {privilegeCheck && !privilegeCheck.ok && <small className="coach-warning">特权校验：{privilegeCheck.reason}</small>}
    </section>
  );
}

function CompactPaymentPopover({ game, target, draft, setDraft, close, run }: {
  game: GameState;
  target: PaymentTarget;
  draft: Required<Record<PayableTokenColor, number>>;
  setDraft: Dispatch<SetStateAction<Required<Record<PayableTokenColor, number>>>>;
  close: () => void;
  run: (playerId: string, action: Parameters<typeof applyAction>[2]) => void;
}) {
  const player = getPlayer(game, target.playerId);
  const card = getJewelCard(target.source.cardId);
  const cost = discountedCost(player, card.id) as Record<PayableTokenColor, number>;
  const autoPayment = suggestPaymentFor(player, card.id);
  const payment = buildPaymentFromDraft(draft, cost);
  const validation = canPurchaseCard(game, player.id, target.source, payment);
  const usedColors = PAYABLE_ORDER.filter((color) => cost[color] > 0 || player.tokens[color] > 0);

  function changeDraft(color: PayableTokenColor, delta: number) {
    setDraft((prev) => ({
      ...prev,
      [color]: Math.max(0, Math.min(player.tokens[color], cost[color], prev[color] + delta)),
    }));
  }

  return (
    <div className="payment-popover">
      <div className="payment-popover-head">
        <strong>支付 {card.id}</strong>
        <button onClick={close}>x</button>
      </div>
      <div className="payment-mini-line">
        <span>需</span><GemCost cost={cost} compact />
      </div>
      <div className="payment-mini-line">
        <span>付</span><GemCost cost={payment} compact />
      </div>
      <div className="payment-mini-grid">
        {usedColors.map((color) => (
          <div className="payment-mini-row" key={color}>
            <span className={`gem-dot gem-${color}`}>{TOKEN_LABEL[color].slice(0, 1)}</span>
            <button disabled={draft[color] <= 0} onClick={() => changeDraft(color, -1)}>-</button>
            <strong>{draft[color]}</strong>
            <button disabled={draft[color] >= player.tokens[color] || draft[color] >= cost[color]} onClick={() => changeDraft(color, 1)}>+</button>
          </div>
        ))}
      </div>
      <div className="payment-mini-gold">金补缺：{payment.gold ?? 0} / 持有 {player.tokens.gold}</div>
      {!validation.ok && <div className="payment-mini-error">{validation.reason}</div>}
      <div className="payment-mini-actions">
        <button onClick={() => setDraft(toPayableDraft(autoPayment))}>自动</button>
        <button disabled={!validation.ok} onClick={() => run(player.id, { type: 'PURCHASE_CARD', source: target.source, payment })}>确认买</button>
      </div>
    </div>
  );
}

function emptyTokenCounts(): Required<Record<TokenColor, number>> {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0, pearl: 0, gold: 0 };
}

function AwaitingChoicePanel({ game, run }: { game: GameState; run: (playerId: string, action: Parameters<typeof applyAction>[2]) => void }) {
  const [discardDraft, setDiscardDraft] = useState<Required<Record<TokenColor, number>>>(() => emptyTokenCounts());
  const choice = game.awaitingChoice;
  if (!choice) return null;
  const player = getPlayer(game, choice.playerId);
  const opponent = getOpponent(game, choice.playerId);
  const discardTotal = tokenTotal(discardDraft);

  function changeDiscard(color: TokenColor, delta: number) {
    setDiscardDraft((prev) => ({ ...prev, [color]: Math.max(0, Math.min(player.tokens[color], prev[color] + delta)) }));
  }

  return (
    <section className="panel choice-panel">
      <h2>需要选择：{choice.type}</h2>
      {choice.type === 'DISCARD_TOKENS' && (
        <>
          <p>{player.name} 必须一次性弃掉 {choice.excess} 个 token。已选择 {discardTotal}/{choice.excess}。</p>
          <div className="discard-grid">
            {TOKEN_ORDER.map((color) => (
              <div className="discard-row" key={color}>
                <span>{TOKEN_LABEL[color]}：持有 {player.tokens[color]}</span>
                <button disabled={discardDraft[color] <= 0} onClick={() => changeDiscard(color, -1)}>-</button>
                <strong>{discardDraft[color]}</strong>
                <button disabled={discardDraft[color] >= player.tokens[color]} onClick={() => changeDiscard(color, 1)}>+</button>
              </div>
            ))}
          </div>
          <div className="action-bar">
            <button disabled={discardTotal !== choice.excess} onClick={() => run(player.id, { type: 'DISCARD_TOKENS', tokens: discardDraft })}>确认弃置</button>
            <button onClick={() => setDiscardDraft(emptyTokenCounts())}>清空</button>
          </div>
        </>
      )}
      {choice.type === 'CHOOSE_ROYAL' && (
        <div className="card-row">
          {game.availableRoyals.map((id) => <button className="royal-choice" key={id} onClick={() => run(player.id, { type: 'CHOOSE_ROYAL', royalCardId: id })}><CardView card={getRoyalCard(id)} /></button>)}
        </div>
      )}
      {choice.type === 'CHOOSE_STEAL_TOKEN' && (
        <div className="action-bar">
          {TOKEN_ORDER.filter((color) => color !== 'gold').map((color) => <button key={color} disabled={opponent.tokens[color] <= 0} onClick={() => run(player.id, { type: 'CHOOSE_STEAL_TOKEN', token: color as Exclude<TokenColor, 'gold'> })}>偷 1 {TOKEN_LABEL[color]}</button>)}
          <button onClick={() => run(player.id, { type: 'SKIP_EFFECT' })}>跳过</button>
        </div>
      )}
      {choice.type === 'CHOOSE_MATCHING_TOKEN' && (
        <div className="action-bar matching-choice-hint">
          <span>棋盘上带绿边的是可拿的 {GEM_LABEL[choice.color]} 宝石，请直接点击其中一颗。</span>
          <button onClick={() => run(player.id, { type: 'SKIP_EFFECT' })}>跳过</button>
        </div>
      )}
      {choice.type === 'CHOOSE_COPY_BONUS' && (
        <div className="action-bar">
          {GEM_ORDER.map((color) => <button key={color} disabled={bonusCounts(player)[color] <= 0} onClick={() => run(player.id, { type: 'CHOOSE_COPY_BONUS', cardId: choice.cardId, color })}>复制 {GEM_LABEL[color]}</button>)}
          <button onClick={() => run(player.id, { type: 'SKIP_EFFECT' })}>跳过</button>
        </div>
      )}
    </section>
  );
}

function CardDetailPanel({ game, target, viewerPlayerId, close, openPaymentSelector }: {
  game: GameState;
  target: DetailTarget;
  viewerPlayerId?: string;
  close: () => void;
  openPaymentSelector: (source: PurchaseSource, playerId?: string) => void;
}) {
  const player = getPlayer(game, target.playerId);
  const title = target.type === 'reserved' ? `${player.name} 的保留区` : `${player.name} 的已购卡`;
  const canViewReservedCards = target.type !== 'reserved' || viewerPlayerId === player.id;
  const cardIds = target.type === 'reserved' ? player.reserved : player.purchased.map((owned) => owned.cardId);

  return (
    <section className="panel card-detail-panel royal-panel">
      <div className="panel-title-row">
        <h2>{title}</h2>
        <button onClick={close}>关闭</button>
      </div>
        {!canViewReservedCards && (
          <p className="reserved-hidden-note">对手保留了 {player.reserved.length} 张卡，具体内容不可见。</p>
        )}
      {cardIds.length === 0 && <p className="hint">暂无卡牌。</p>}
        {canViewReservedCards && <div className="card-detail-grid">
        {cardIds.map((cardId, index) => {
          const card = getJewelCard(cardId);
          const owned = target.type === 'purchased' ? player.purchased[index] : undefined;
            const buyStatus = target.type === 'reserved' ? reservedPurchaseStatus(game, player.id, cardId, viewerPlayerId) : null;
          return (
            <article className="card-detail-item" key={`${cardId}-${index}`}>
              <CardView card={card} />
              <div className="card-detail-copy">
                <strong>{card.name}</strong>
                <span>{card.id} / L{card.level} / {card.prestige} 威望 / {card.crowns} 皇冠</span>
                <span>奖励：{card.bonusColor ? `${GEM_LABEL[card.bonusColor]} ×${card.bonusCount}` : owned?.copiedBonusColor ? `联结${GEM_LABEL[owned.copiedBonusColor]}` : card.cardType === 'gold' ? '黄金' : '联结'}</span>
                <span>能力：{card.ability ? ABILITY_LABEL[card.ability] : '无'}</span>
                <div className="payment-mini-line"><span>原价</span><GemCost cost={card.cost} compact /></div>
                <div className="payment-mini-line"><span>折后</span><GemCost cost={discountedCost(player, cardId)} compact /></div>
                {target.type === 'reserved' && (
                    <button disabled={!buyStatus?.canBuy} title={buyStatus?.title} onClick={() => openPaymentSelector({ type: 'reserved', cardId }, player.id)}>
                      {buyStatus?.label}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        </div>}
    </section>
  );
}

function PlayerPanel({ game, playerId, active, viewerPlayerId, openPaymentSelector, openDetails, paymentTarget, paymentDraft, setPaymentDraft, closePayment, run }: {
  game: GameState;
  playerId: string;
  active: boolean;
  viewerPlayerId?: string;
  openPaymentSelector: (source: PurchaseSource, playerId?: string) => void;
  openDetails: (target: DetailTarget) => void;
  paymentTarget: PaymentTarget | null;
  paymentDraft: Required<Record<PayableTokenColor, number>>;
  setPaymentDraft: Dispatch<SetStateAction<Required<Record<PayableTokenColor, number>>>>;
  closePayment: () => void;
  run: (playerId: string, action: Parameters<typeof applyAction>[2]) => void;
}) {
  const player = getPlayer(game, playerId);
  const bonuses = bonusCounts(player);
  const colorPoints = sameColorPrestige(player);
  const canOperate = active && viewerPlayerId === player.id && !game.awaitingChoice && game.status === 'playing';
  const canViewReservedCards = viewerPlayerId === player.id;
  return (
    <section className={`panel player-panel ${active ? 'active-player' : ''}`}>
      <h2>{player.name}</h2>
      <p>威望 {totalPrestige(player)} / 皇冠 {totalCrowns(player)} / 特权 {player.privileges}</p>
      <div className="token-line">
        {TOKEN_ORDER.map((color) => <span className={`mini-token token-${color}`} key={color}>{TOKEN_LABEL[color]} {player.tokens[color]}</span>)}
      </div>
      <h3>奖励 / 同色分</h3>
      <div className="token-line">
        {GEM_ORDER.map((color) => <span key={color}>{GEM_LABEL[color]} {bonuses[color]} / {colorPoints[color]}</span>)}
      </div>
      <h3>保留区</h3>
      <div className="small-card-list">
        {player.reserved.length === 0 && <span className="hint">无</span>}
        {!canViewReservedCards && player.reserved.length > 0 && (
          <button className="reserved-chip reserved-hidden-chip" onClick={() => openDetails({ playerId: player.id, type: 'reserved' })}>
            保留 {player.reserved.length} 张
          </button>
        )}
        {canViewReservedCards && player.reserved.map((id) => {
          const card = getJewelCard(id);
          const buyStatus = reservedPurchaseStatus(game, player.id, id, viewerPlayerId);
          const canBuy = canOperate && buyStatus.canBuy;
          const source: PurchaseSource = { type: 'reserved', cardId: id };
          return (
            <span className="reserved-payment-wrap" key={id}>
              <button className="reserved-chip" onClick={() => openDetails({ playerId: player.id, type: 'reserved' })}>{card.id}<br /><small>{card.name}</small></button>
              <button className="reserved-buy-chip" disabled={!canBuy} title={buyStatus.title} onClick={() => openPaymentSelector(source, player.id)}>{buyStatus.label}</button>
              {isPaymentTarget(paymentTarget, player.id, source) && (
                <CompactPaymentPopover game={game} target={paymentTarget!} draft={paymentDraft} setDraft={setPaymentDraft} close={closePayment} run={run} />
              )}
            </span>
          );
        })}
      </div>
      <h3>已购卡</h3>
      <div className="small-card-list">
        {player.purchased.length === 0 && <span className="hint">无</span>}
        {player.purchased.map((owned, index) => {
          const card = getJewelCard(owned.cardId);
          const label = card.bonusColor ? GEM_LABEL[card.bonusColor] : owned.copiedBonusColor ? `联结${GEM_LABEL[owned.copiedBonusColor]}` : card.cardType === 'gold' ? '金卡' : '联结';
          return <button className="owned-chip" key={`${owned.cardId}-${index}`} onClick={() => openDetails({ playerId: player.id, type: 'purchased' })}>{card.prestige} {label}{card.crowns ? ` 👑${card.crowns}` : ''}{card.ability ? ` ${ABILITY_LABEL[card.ability].slice(0, 2)}` : ''}</button>;
        })}
      </div>
      <h3>皇室</h3>
      <div className="small-card-list">
        {player.royals.length === 0 && <span className="hint">无</span>}
        {player.royals.map((id) => <span key={id}>{getRoyalCard(id).name}</span>)}
      </div>
    </section>
  );
}
