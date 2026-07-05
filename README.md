# Splendor Duel Local

一个基于 React + TypeScript 实现的《璀璨宝石：对决》网页原型。项目目标是把核心规则、单机对局、机器人练习和好友房联机流程跑通，便于本地试玩、规则验证和后续迭代。

> 本项目是个人学习和原型实现，不包含官方素材，也不用于商业用途。

## 最快开始

只想马上试玩，可以按下面 4 步走：

```bash
git clone https://github.com/yunlu-li/splendor-duel-local.git
cd splendor-duel-local
npm install
npm run dev:full
```

然后打开：

```text
http://localhost:5173/
```

进入首页后推荐先选：

1. `与机器人对战`：一个人最快体验完整流程。
2. `本地双人对战`：同一台电脑上两个人轮流操作。
3. `邀请好友对战`：复制邀请链接，用另一个浏览器或发给朋友加入房间。

## 功能概览

- 5x5 宝石棋盘与中心螺旋补盘。
- 本地双人轮流操作。
- 机器人练习模式，机器人会自动执行可行动作。
- 好友房模式，支持创建房间、邀请链接、双方准备和 Socket.IO 同步。
- 市场卡、牌堆盲保、保留区购买、黄金支付、特权卷轴。
- 皇冠、皇室卡、威望、同色分胜利判定。
- 卡牌能力：
  - 获得特权。
  - 额外回合。
  - 偷取对手 token。
  - 拿同色 token。
  - Associate 复制 bonus。
- 对手保留卡隐藏展示，只显示保留数量。
- Vitest 单元测试覆盖初始化、规则校验、reducer 行为和胜利判断。

## 技术栈

- React
- TypeScript
- Vite
- Fastify
- Socket.IO
- Vitest

## 环境要求

建议使用 Node.js 20+ 和 npm。先确认本机已安装：

```bash
node -v
npm -v
```

如果没有 Node.js，先安装 LTS 版本：

- 官网：`https://nodejs.org/`
- 或使用 nvm：

```bash
nvm install 20
nvm use 20
```

## 安装

```bash
git clone https://github.com/yunlu-li/splendor-duel-local.git
cd splendor-duel-local
npm install
```

## 开始游戏

### 单机或机器人模式

启动前端：

```bash
npm run dev
```

浏览器打开 Vite 输出的地址，通常是：

```text
http://localhost:5173/
```

如果本机端口或 IPv6 解析有冲突，也可以使用：

```text
http://127.0.0.1:5173/
```

这个模式适合：

- 本地双人对战。
- 与机器人对战。
- 只验证规则和 UI。

### 好友房模式

如果要体验好友房联机流程，启动前端和服务端：

```bash
npm run dev:full
```

该命令会同时启动：

- Vite 前端开发服务器。
- Fastify + Socket.IO 房间服务器。

也可以单独启动服务端：

```bash
npm run server
```

好友房试玩步骤：

1. 执行 `npm run dev:full`。
2. 打开 `http://localhost:5173/`。
3. 选择 `邀请好友对战`。
4. 创建房间后复制邀请链接。
5. 用另一个浏览器窗口、无痕窗口，或另一台设备打开邀请链接。
6. 两边都点准备，游戏开始。

## 游戏模式

进入首页后可以选择：

- 本地双人对战：同一浏览器中玩家 A / 玩家 B 轮流操作。
- 与机器人对战：玩家操作一方，机器人自动行动。
- 邀请好友对战：创建房间并复制邀请链接，双方准备后开始。

## 基本操作

- 点击棋盘上的宝石来选择 token。
- 点击 `拿已选 token` 执行拿取。
- 有特权时，选中 1 个非黄金 token 后可以点击 `花特权拿 1 个`。
- 点击市场卡下面的 `买` 打开支付面板。
- 点击市场卡下面的 `留` 保留该卡并拿黄金。
- 点击牌堆区域的 `盲保` 保留对应等级的牌堆顶牌。
- 自己的保留区会显示具体卡牌、购买按钮和资源缺口。
- 对手的保留区只显示保留数量，不显示具体卡牌。
- 点击已购买卡或自己的保留卡，会在右侧显示完整卡牌详情。

## 常见问题

### 打开 localhost 不是这个项目

如果本机有其他服务占用了 `localhost:5173`，可以直接打开：

```text
http://127.0.0.1:5173/
```

也可以停掉旧服务后重新执行 `npm run dev` 或 `npm run dev:full`。

### 好友房连不上

好友房需要运行完整服务：

```bash
npm run dev:full
```

只执行 `npm run dev` 时，前端可以玩本地双人和机器人模式，但没有房间服务器。

### 依赖安装失败

先确认 Node.js 版本：

```bash
node -v
```

建议使用 Node.js 20+。如果依赖状态异常，可以重新安装：

```bash
rm -rf node_modules package-lock.json
npm install
```

## 常用命令

运行测试：

```bash
npm test
```

监听测试：

```bash
npm run test:watch
```

生产构建：

```bash
npm run build
```

预览构建产物：

```bash
npm run preview
```

## 项目结构

```text
src/
  client/
    components/        # 卡牌、费用等 React 组件
    pages/App.tsx      # 主游戏页面和交互流程
    styles/            # 页面样式
  server/
    index.ts           # Fastify / Socket.IO 服务入口
    rooms/             # 房间管理
  shared/
    constants/         # 棋盘、卡牌、文案常量
    rules/             # 初始化、校验、reducer、计分
    types/             # 游戏状态和房间类型
  tests/               # Vitest 单元测试
docs/                  # 规则调研、卡牌数据和开发记录
scripts/               # 本地开发辅助脚本
```

## 开发说明

规则层集中在 `src/shared/rules/`，前端和服务端都复用同一套 reducer 和 validator。联机模式下服务端负责执行权威 action，并把房间状态同步给客户端。

如果要新增规则，建议同时补充对应单元测试：

- `src/tests/initialize.test.ts`
- `src/tests/rules.test.ts`

## 当前状态

当前版本已经可以本地运行并完成基础对局流程。仍适合作为原型继续迭代，后续可以继续补强：

- 更完整的支付选择体验。
- 好友房断线重连。
- 更强的机器人策略。
- 更多端到端流程测试。
