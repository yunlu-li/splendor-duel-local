# 开发进度

## 已完成

- Vite + React + TypeScript 项目骨架。
- 67 张珠宝卡 + 4 张皇室卡结构化本地数据：`src/shared/constants/cards.local.ts`。
- 5x5 中央棋盘建模与中心螺旋填充顺序：`src/shared/constants/board.ts`。
- seeded random、初始化游戏状态：`src/shared/rules/initialize.ts`。
- 基础计分与胜利判定：总分、皇冠、同色分：`src/shared/rules/scoring.ts`。
- 规则动作与校验：
  - 花特权拿非黄金 token。
  - 补充棋盘。
  - 强制拿 1-3 个非黄金 token，要求相邻、连续、同行/列/对角线。
  - 保留卡并拿黄金，保留上限 3。
  - 购买市场/保留卡，bonus 折扣，黄金补缺口。
  - 弃 token 到 10 个。
  - 皇冠触发选择皇室卡。
  - 卡牌能力：额外回合、获得特权、拿同色 token、偷 token、Associate 复制 bonus。
- 抽象卡牌 UI 原型，不复刻官方图片。
- 测试：2 个测试文件，10 个测试用例。

## 当前限制

- reducer 已可用于服务端权威规则，但前端页面还只是预览，不是完整可交互对局。
- 暂未实现房间、WebSocket、断线重连。
- 支付选择目前由 action 明确传入；后续 UI 需要做自动推荐与黄金抵扣选择器。
- `REPLENISH_BOARD` 当前按 bag 顺序补充；实际支付回袋后是否需要重新随机抽取，后续可在 reducer 中用 state 内 RNG/事件日志方式补强。

## 下一步建议

1. 建立客户端本地单机对局页面，先用 reducer 跑完整双人流程。
2. 添加操作面板：选择 token、保留、购买、支付、处理 awaiting_choice。
3. 再接 Fastify + Socket.IO 房间系统，把 reducer 放到服务端权威执行。

## 视觉布局更新

- 页面改为紧凑单屏仪表盘：顶部状态栏、左右玩家面板、中间棋盘、右侧皇室/日志、底部三层市场。
- 背景改为动态深紫金宫廷风，带流动金纹与柔光。
- 字体改为衬线/宋体优先，整体更偏王室贵族风。
- 卡牌市场改为紧凑排布，按钮缩短为“买 / 留 / 盲保”。
- 低高度或窄屏下会自动允许页面滚动，避免内容完全挤压不可用。
