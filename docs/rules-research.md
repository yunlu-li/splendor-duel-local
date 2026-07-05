# 璀璨宝石对决 - 规则调研摘要

> 目的：为网页对战实现建立可编码的规则模型。请避免直接使用官方图片、商标、完整原文规则书或未授权卡面素材；网站可采用“受启发的原创美术/命名”。

## 已确认组件

- 2 名玩家，约 30 分钟。
- 67 张珠宝卡，分 3 个等级。
- 25 个实体 token：5 种宝石色各 4 个（white/blue/green/black/red），2 个 pearl，3 个 gold；中央棋盘为 5x5 共 25 格。
- 3 个 privilege scroll。
- 1 个中央棋盘，4 张 royal card，1 个 victory tile。

## 初始化

1. 三个等级的珠宝牌分别洗牌。
2. 展示金字塔：Level 3 展示 3 张，Level 2 展示 4 张，Level 1 展示 5 张。
3. 将 25 个 token 随机混合，并从中心开始按预设螺旋顺序填满 5x5 棋盘。
4. 公共区放 3 个 privilege scroll。
5. 展示 4 张 royal card。
6. 随机先手；后手获得 1 个 privilege。

## 回合结构

每回合：先按固定顺序执行 0 个或多个可选动作，然后必须执行 1 个强制动作。

### 可选动作 1：花特权拿 token

- 每花 1 个 privilege，可从棋盘拿 1 个非 gold token。
- 可重复执行多次。
- 一旦执行“补充棋盘”，本回合不能再返回执行该动作。

### 可选动作 2：补充棋盘

- 只有袋中还有 token 时可做。
- 将袋中 token 混合，按中心开始的螺旋顺序填补空位，直到棋盘满或袋空。
- 补充后，对手获得 1 个 privilege：优先从公共区拿；公共区没有则从当前玩家处拿；若对手已拥有 3 个则无事发生。

### 强制动作三选一

1. **拿 token**：从棋盘拿最多 3 个相邻、连续、同一直线（横/竖/斜）的非 gold token。可拿 1 或 2 个。若通过此动作拿了 3 个同色宝石，或拿了 2 个 pearl，则对手获得 1 个 privilege。
2. **保留卡 + 拿 gold**：从棋盘拿 1 个 gold，并保留 1 张金字塔明牌或任意牌堆顶牌。限制：棋盘必须有 gold；玩家保留区少于 3 张。
3. **购买卡**：从金字塔明牌或自己的保留牌购买 1 张。已购卡提供永久 bonus 折扣；gold 可作为任意 gem/pearl 支付；支付的实体 token 回袋。

若玩家没有任何强制动作可执行，必须先执行补充棋盘，然后再选择强制动作。

## 回合结束

- 实体 token 可在回合中暂时超过 10 个。
- 回合结束时必须弃到最多 10 个实体 token。
- 检查胜利；满足任意条件立即结束。

## 卡牌能力

购买/获得珠宝卡或 royal card 后立即结算能力：

- `EXTRA_TURN`：本回合结束后立即再获得一个回合。
- `TAKE_PRIVILEGE`：获得 1 个 privilege；公共区没有则从对手处拿；若自己已有 3 个则无事发生。
- `TAKE_MATCHING_TOKEN`：从棋盘拿 1 个与该卡 bonus 颜色相同的 token；没有则忽略。
- `STEAL_TOKEN`：从对手处拿 1 个非 gold token；对手没有则忽略。
- `COPY_BONUS`：覆盖/关联一张此前已获得的有 bonus 的珠宝卡；该卡视为复制该 bonus 颜色，用于折扣和同色分数。

## 皇冠与皇室卡

- 某些珠宝卡带有 1 个或多个 crown。
- 当玩家获得第 3 个 crown 时，从可用 royal cards 中选 1 张并立即结算其能力。
- 当玩家获得第 6 个 crown 时，再选 1 张 royal card 并结算。
- 获得 royal card 不是行动。
- 每名玩家最多因此获得 2 张 royal card。

## 胜利条件

任意回合结束时满足下列之一立即获胜：

1. 总 prestige >= 20。
2. crown >= 10。
3. 同一颜色卡牌上的 prestige >= 10（COPY_BONUS 计入所复制颜色）。

## 建模注意

- 规则引擎应避免把 UI 状态与规则状态耦合。
- 所有随机行为用 seed。
- 卡牌能力可能进入 `awaiting_choice`：如偷取目标、gold 支付分配、COPY_BONUS 目标、royal card 选择、弃 token。
- 不直接使用官方卡面图；开发期可用抽象卡牌数据和原创图标。

## 待补充数据

- 67 张珠宝卡的完整结构化数据（level、bonusColor、cost、prestige、crowns、ability）。建议从用户拥有的实体游戏/官方授权资料手工录入，或使用原创兼容牌组。
- 4 张 royal card 的 points/ability 精确组合。
- 中央棋盘坐标拓扑与官方螺旋顺序需要在实现时固化为常量。

## 参考来源与版权边界

- 官方/发行方产品页：Space Cowboys `https://www.spacecowboys-games.com/game/splendor-duel/`
- 英文规则书 PDF 镜像：`https://cdn.1j1ju.com/medias/d5/20/a3-splendor-duel-rulebook.pdf`
- Asmodee 商品页：`https://store.asmodee.com/products/splendor-duel`
- BoardGameArena 规则帮助：`https://en.doc.boardgamearena.com/Gamehelpsplendorduel`
- BGG 页面：`https://boardgamegeek.com/boardgame/364073/splendor-duel`

注意：公开规则足够实现规则引擎；但 67 张官方卡的完整牌表、成本、插画与文本属于出版内容/素材，不建议直接抓取或复制到公开项目。工程上建议：

1. 开发期使用抽象/原创牌组，字段结构兼容原规则；
2. 若用户拥有实体游戏，可在本地私用数据文件中手工录入；
3. 若要公开发布，使用原创名称、原创图标、原创成本分布，避免复刻官方卡面与完整牌表。

## 建议结构化类型

```ts
export type GemColor = 'white' | 'blue' | 'green' | 'red' | 'black';
export type TokenColor = GemColor | 'pearl' | 'gold';
export type CardLevel = 1 | 2 | 3;
export type AbilityType =
  | 'EXTRA_TURN'
  | 'TAKE_PRIVILEGE'
  | 'TAKE_MATCHING_TOKEN'
  | 'STEAL_TOKEN'
  | 'COPY_BONUS';

export interface JewelCardDef {
  id: string;
  level: CardLevel;
  bonusColor: GemColor | null;
  cost: Partial<Record<Exclude<TokenColor, 'gold'>, number>>;
  prestige: number;
  crowns: number;
  ability?: AbilityType;
}

export interface RoyalCardDef {
  id: string;
  prestige: number;
  ability?: AbilityType;
}
```

## 对你的原计划的关键修正

- token 颜色应包含 green：5 种宝石色是 blue/white/green/black/red，每种 4 个；另有 pearl 2 个、gold 3 个。
- 强制“拿 token”是最多 3 个相邻、连续、同一直线的 gem/pearl，不能拿 gold。
- “补充棋盘”后不能再花 privilege 拿 token，这需要在 turn phase 中锁定。
- 无强制动作可做时，必须先补充棋盘，再做强制动作。
- 胜利检查在回合结束后；额外回合应在胜利检查之后/或按规则顺序严谨处理：若已经触发胜利则不进入额外回合。
