# 卡牌数据整理与核对记录

来源：公开卡牌数据库页面与本地规则实现核对。用途是为当前原型提供结构化数据检查记录。仓库不包含官方卡面图片、规则书全文或原始网页抓取快照。

字段说明：`分`=威望点；`冠`=皇冠数；`奖励`=永久 bonus 颜色；`费用` 不包含黄金，黄金在支付时可抵任意缺口。

## Level 1 珠宝卡（30 张）

| ID | 名称 | 分 | 冠 | 奖励 | 费用 | 能力 |
|---|---:|---:|---:|---|---|---|
| l1-01 | Level 1 White Bonus #1 | 0 | 0 | 白 | 1蓝 + 1绿 + 1红 + 1黑 | - |
| l1-02 | Level 1 White Bonus #2 | 0 | 1 | 白 | 3蓝 | - |
| l1-03 | Level 1 White Bonus #3 | 0 | 0 | 白 | 2蓝 + 2绿 + 1珍珠 | 额外回合 |
| l1-04 | Level 1 White Bonus #4 | 0 | 0 | 白 | 2红 + 2黑 | 拿同色宝石 |
| l1-05 | Level 1 White Bonus #5 | 1 | 0 | 白 | 2绿 + 3红 | - |
| l1-06 | Level 1 Blue Bonus #1 | 0 | 0 | 蓝 | 1白 + 1绿 + 1红 + 1黑 | - |
| l1-07 | Level 1 Blue Bonus #2 | 0 | 1 | 蓝 | 3绿 | - |
| l1-08 | Level 1 Blue Bonus #3 | 0 | 0 | 蓝 | 2绿 + 2红 + 1珍珠 | 额外回合 |
| l1-09 | Level 1 Blue Bonus #4 | 0 | 0 | 蓝 | 2白 + 2黑 | 拿同色宝石 |
| l1-10 | Level 1 Blue Bonus #5 | 1 | 0 | 蓝 | 2红 + 3黑 | - |
| l1-11 | Level 1 Green Bonus #1 | 0 | 0 | 绿 | 1白 + 1蓝 + 1红 + 1黑 | - |
| l1-12 | Level 1 Green Bonus #2 | 0 | 1 | 绿 | 3红 | - |
| l1-13 | Level 1 Green Bonus #3 | 0 | 0 | 绿 | 2红 + 2黑 + 1珍珠 | 额外回合 |
| l1-14 | Level 1 Green Bonus #4 | 0 | 0 | 绿 | 2白 + 2蓝 | 拿同色宝石 |
| l1-15 | Level 1 Green Bonus #5 | 1 | 0 | 绿 | 3白 + 2黑 | - |
| l1-16 | Level 1 Black Bonus #1 | 0 | 0 | 黑 | 1白 + 1蓝 + 1绿 + 1红 | - |
| l1-17 | Level 1 Black Bonus #2 | 0 | 1 | 黑 | 3白 | - |
| l1-18 | Level 1 Black Bonus #3 | 0 | 0 | 黑 | 2白 + 2蓝 + 1珍珠 | 额外回合 |
| l1-19 | Level 1 Black Bonus #4 | 0 | 0 | 黑 | 2绿 + 2红 | 拿同色宝石 |
| l1-20 | Level 1 Black Bonus #5 | 1 | 0 | 黑 | 2蓝 + 3绿 | - |
| l1-21 | Level 1 Red Bonus #1 | 0 | 0 | 红 | 1白 + 1蓝 + 1绿 + 1黑 | - |
| l1-22 | Level 1 Red Bonus #2 | 0 | 1 | 红 | 3黑 | - |
| l1-23 | Level 1 Red Bonus #3 | 0 | 0 | 红 | 2白 + 2黑 + 1珍珠 | 额外回合 |
| l1-24 | Level 1 Red Bonus #4 | 0 | 0 | 红 | 2蓝 + 2绿 | 拿同色宝石 |
| l1-25 | Level 1 Red Bonus #5 | 1 | 0 | 红 | 2白 + 3蓝 | - |
| l1-26 | Level 1 Associate #1 | 1 | 0 | 无 | 4黑 + 1珍珠 | - |
| l1-27 | Level 1 Associate #2 | 0 | 1 | 无 | 4白 + 1珍珠 | - |
| l1-28 | Level 1 Gold Card | 3 | 0 | 无 | 4红 + 1珍珠 | - |
| l1-29 | Level 1 Associate #3 | 1 | 0 | 无 | 2蓝 + 2红 + 1黑 + 1珍珠 | - |
| l1-30 | Level 1 Associate #4 | 1 | 0 | 无 | 2白 + 2绿 + 1黑 + 1珍珠 | - |

## Level 2 珠宝卡（24 张）

| ID | 名称 | 分 | 冠 | 奖励 | 费用 | 能力 |
|---|---:|---:|---:|---|---|---|
| l2-01 | Level 2 White Bonus #1 | 2 | 1 | 白 | 2绿 + 2红 + 2黑 + 1珍珠 | - |
| l2-02 | Level 2 White Bonus #2 | 1 | 0 | 白 | 4蓝 + 3红 | 偷对手宝石 |
| l2-03 | Level 2 White Bonus #3 | 2 | 0 | 白 | 4白 + 2黑 + 1珍珠 | 获得特权 |
| l2-04 | Level 2 White Bonus #4 | 1 | 0 | 白 | 5蓝 + 2绿 | - |
| l2-05 | Level 2 Blue Bonus #1 | 2 | 1 | 蓝 | 2白 + 2红 + 2黑 + 1珍珠 | - |
| l2-06 | Level 2 Blue Bonus #2 | 1 | 0 | 蓝 | 4绿 + 3黑 | 偷对手宝石 |
| l2-07 | Level 2 Blue Bonus #3 | 2 | 0 | 蓝 | 2白 + 4蓝 + 1珍珠 | 获得特权 |
| l2-08 | Level 2 Blue Bonus #4 | 1 | 0 | 蓝 | 5绿 + 2红 | - |
| l2-09 | Level 2 Green Bonus #1 | 2 | 1 | 绿 | 2白 + 2蓝 + 2黑 + 1珍珠 | - |
| l2-10 | Level 2 Green Bonus #2 | 1 | 0 | 绿 | 3白 + 4红 | 偷对手宝石 |
| l2-11 | Level 2 Green Bonus #3 | 2 | 0 | 绿 | 2蓝 + 4绿 + 1珍珠 | 获得特权 |
| l2-12 | Level 2 Green Bonus #4 | 1 | 0 | 绿 | 5红 + 2黑 | - |
| l2-13 | Level 2 Black Bonus #1 | 2 | 1 | 黑 | 2蓝 + 2绿 + 2红 + 1珍珠 | - |
| l2-14 | Level 2 Black Bonus #2 | 1 | 0 | 黑 | 4白 + 3绿 | 偷对手宝石 |
| l2-15 | Level 2 Black Bonus #3 | 2 | 0 | 黑 | 2红 + 4黑 + 1珍珠 | 获得特权 |
| l2-16 | Level 2 Black Bonus #4 | 1 | 0 | 黑 | 5白 + 2蓝 | - |
| l2-17 | Level 2 Red Bonus #1 | 2 | 1 | 红 | 2白 + 2蓝 + 2绿 + 1珍珠 | - |
| l2-18 | Level 2 Red Bonus #2 | 1 | 0 | 红 | 3蓝 + 4黑 | 偷对手宝石 |
| l2-19 | Level 2 Red Bonus #3 | 2 | 0 | 红 | 2绿 + 4红 + 1珍珠 | 获得特权 |
| l2-20 | Level 2 Red Bonus #4 | 1 | 0 | 红 | 2白 + 5黑 | - |
| l2-21 | Level 2 Associate #1 | 2 | 0 | 无 | 6绿 + 1珍珠 | - |
| l2-22 | Level 2 Associate #2 | 0 | 2 | 无 | 6绿 + 1珍珠 | - |
| l2-23 | Level 2 Associate #3 | 0 | 2 | 无 | 6蓝 + 1珍珠 | - |
| l2-24 | Level 2 Gold Card | 5 | 0 | 无 | 6蓝 + 1珍珠 | - |

## Level 3 珠宝卡（13 张）

| ID | 名称 | 分 | 冠 | 奖励 | 费用 | 能力 |
|---|---:|---:|---:|---|---|---|
| l3-01 | Level 3 White Bonus #1 | 3 | 2 | 白 | 3蓝 + 5红 + 3黑 + 1珍珠 | - |
| l3-02 | Level 3 White Bonus #2 | 4 | 0 | 白 | 6白 + 2蓝 + 2黑 | - |
| l3-03 | Level 3 Blue Bonus #1 | 3 | 2 | 蓝 | 3白 + 3绿 + 5黑 + 1珍珠 | - |
| l3-04 | Level 3 Blue Bonus #2 | 4 | 0 | 蓝 | 2白 + 6蓝 + 2绿 | - |
| l3-05 | Level 3 Green Bonus #1 | 3 | 2 | 绿 | 5白 + 3蓝 + 3红 + 1珍珠 | - |
| l3-06 | Level 3 Green Bonus #2 | 4 | 0 | 绿 | 2蓝 + 6绿 + 2红 | - |
| l3-07 | Level 3 Black Bonus #1 | 3 | 2 | 黑 | 3白 + 5绿 + 3红 + 1珍珠 | - |
| l3-08 | Level 3 Black Bonus #2 | 4 | 0 | 黑 | 2白 + 2红 + 6黑 | - |
| l3-09 | Level 3 Red Bonus #1 | 3 | 2 | 红 | 5蓝 + 3绿 + 3黑 + 1珍珠 | - |
| l3-10 | Level 3 Red Bonus #2 | 4 | 0 | 红 | 2绿 + 6红 + 2黑 | - |
| l3-11 | Level 3 Associate #1 | 3 | 0 | 无 | 8红 | 额外回合 |
| l3-12 | Level 3 Associate #2 | 0 | 3 | 无 | 8黑 | - |
| l3-13 | Level 3 Gold Card | 6 | 0 | 无 | 8白 | - |

## 皇室卡（4 张）

| ID | 名称 | 分 | 能力 |
|---|---|---:|---|
| royal-01 | Royal Card #1 | 2 | 偷对手宝石 |
| royal-02 | Royal Card #2 | 2 | 额外回合 |
| royal-03 | Royal Card #3 | 2 | 获得特权 |
| royal-04 | Royal Card #4 | 3 | - |

## 快速统计

- Level 1: 30 张
- Level 2: 24 张
- Level 3: 13 张
- 珠宝卡合计: 67 张
- 皇室卡: 4 张
- 注意：`Gold Card` / `Associate` 类卡没有普通奖励色，代码中 bonus 为 null。
