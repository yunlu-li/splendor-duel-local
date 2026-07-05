import type { JewelCardDef, RoyalCardDef } from '../types/game.ts';

// Local-only card dataset, transcribed from public card database pages for personal use.
// Do not publish official card data or official card artwork as part of a public product.

export const JEWEL_CARDS: readonly JewelCardDef[] = [
  {
    "id": "l1-01",
    "name": "Level 1 White Bonus #1",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "blue": 1,
      "green": 1,
      "red": 1,
      "black": 1
    },
    "ability": null,
    "prestige": 0,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l1-02",
    "name": "Level 1 White Bonus #2",
    "kind": "jewel",
    "level": 1,
    "crowns": 1,
    "cost": {
      "blue": 3
    },
    "ability": null,
    "prestige": 0,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l1-03",
    "name": "Level 1 White Bonus #3",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "blue": 2,
      "green": 2,
      "pearl": 1
    },
    "ability": "EXTRA_TURN",
    "prestige": 0,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l1-04",
    "name": "Level 1 White Bonus #4",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "red": 2,
      "black": 2
    },
    "ability": "TAKE_MATCHING_TOKEN",
    "prestige": 0,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l1-05",
    "name": "Level 1 White Bonus #5",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "green": 2,
      "red": 3
    },
    "ability": null,
    "prestige": 1,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l1-06",
    "name": "Level 1 Blue Bonus #1",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 1,
      "green": 1,
      "red": 1,
      "black": 1
    },
    "ability": null,
    "prestige": 0,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l1-07",
    "name": "Level 1 Blue Bonus #2",
    "kind": "jewel",
    "level": 1,
    "crowns": 1,
    "cost": {
      "green": 3
    },
    "ability": null,
    "prestige": 0,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l1-08",
    "name": "Level 1 Blue Bonus #3",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "green": 2,
      "red": 2,
      "pearl": 1
    },
    "ability": "EXTRA_TURN",
    "prestige": 0,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l1-09",
    "name": "Level 1 Blue Bonus #4",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 2,
      "black": 2
    },
    "ability": "TAKE_MATCHING_TOKEN",
    "prestige": 0,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l1-10",
    "name": "Level 1 Blue Bonus #5",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "red": 2,
      "black": 3
    },
    "ability": null,
    "prestige": 1,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l1-11",
    "name": "Level 1 Green Bonus #1",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 1,
      "blue": 1,
      "red": 1,
      "black": 1
    },
    "ability": null,
    "prestige": 0,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l1-12",
    "name": "Level 1 Green Bonus #2",
    "kind": "jewel",
    "level": 1,
    "crowns": 1,
    "cost": {
      "red": 3
    },
    "ability": null,
    "prestige": 0,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l1-13",
    "name": "Level 1 Green Bonus #3",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "red": 2,
      "black": 2,
      "pearl": 1
    },
    "ability": "EXTRA_TURN",
    "prestige": 0,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l1-14",
    "name": "Level 1 Green Bonus #4",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 2,
      "blue": 2
    },
    "ability": "TAKE_MATCHING_TOKEN",
    "prestige": 0,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l1-15",
    "name": "Level 1 Green Bonus #5",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 3,
      "black": 2
    },
    "ability": null,
    "prestige": 1,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l1-16",
    "name": "Level 1 Black Bonus #1",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 1,
      "blue": 1,
      "green": 1,
      "red": 1
    },
    "ability": null,
    "prestige": 0,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l1-17",
    "name": "Level 1 Black Bonus #2",
    "kind": "jewel",
    "level": 1,
    "crowns": 1,
    "cost": {
      "white": 3
    },
    "ability": null,
    "prestige": 0,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l1-18",
    "name": "Level 1 Black Bonus #3",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 2,
      "blue": 2,
      "pearl": 1
    },
    "ability": "EXTRA_TURN",
    "prestige": 0,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l1-19",
    "name": "Level 1 Black Bonus #4",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "green": 2,
      "red": 2
    },
    "ability": "TAKE_MATCHING_TOKEN",
    "prestige": 0,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l1-20",
    "name": "Level 1 Black Bonus #5",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "blue": 2,
      "green": 3
    },
    "ability": null,
    "prestige": 1,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l1-21",
    "name": "Level 1 Red Bonus #1",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 1,
      "blue": 1,
      "green": 1,
      "black": 1
    },
    "ability": null,
    "prestige": 0,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l1-22",
    "name": "Level 1 Red Bonus #2",
    "kind": "jewel",
    "level": 1,
    "crowns": 1,
    "cost": {
      "black": 3
    },
    "ability": null,
    "prestige": 0,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l1-23",
    "name": "Level 1 Red Bonus #3",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 2,
      "black": 2,
      "pearl": 1
    },
    "ability": "EXTRA_TURN",
    "prestige": 0,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l1-24",
    "name": "Level 1 Red Bonus #4",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "blue": 2,
      "green": 2
    },
    "ability": "TAKE_MATCHING_TOKEN",
    "prestige": 0,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l1-25",
    "name": "Level 1 Red Bonus #5",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 2,
      "blue": 3
    },
    "ability": null,
    "prestige": 1,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l1-26",
    "name": "Level 1 Associate #1",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "black": 4,
      "pearl": 1
    },
    "ability": "COPY_BONUS",
    "prestige": 1,
    "bonusColor": null,
    "cardType": "associate"
  },
  {
    "id": "l1-27",
    "name": "Level 1 Associate #2",
    "kind": "jewel",
    "level": 1,
    "crowns": 1,
    "cost": {
      "white": 4,
      "pearl": 1
    },
    "ability": "COPY_BONUS",
    "prestige": 0,
    "bonusColor": null,
    "cardType": "associate"
  },
  {
    "id": "l1-28",
    "name": "Level 1 Gold Card",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "red": 4,
      "pearl": 1
    },
    "ability": null,
    "prestige": 3,
    "bonusColor": null,
    "cardType": "gold"
  },
  {
    "id": "l1-29",
    "name": "Level 1 Associate #3",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "blue": 2,
      "red": 2,
      "black": 1,
      "pearl": 1
    },
    "ability": "COPY_BONUS",
    "prestige": 1,
    "bonusColor": null,
    "cardType": "associate"
  },
  {
    "id": "l1-30",
    "name": "Level 1 Associate #4",
    "kind": "jewel",
    "level": 1,
    "crowns": 0,
    "cost": {
      "white": 2,
      "green": 2,
      "black": 1,
      "pearl": 1
    },
    "ability": "COPY_BONUS",
    "prestige": 1,
    "bonusColor": null,
    "cardType": "associate"
  },
  {
    "id": "l2-01",
    "name": "Level 2 White Bonus #1",
    "kind": "jewel",
    "level": 2,
    "crowns": 1,
    "cost": {
      "green": 2,
      "red": 2,
      "black": 2,
      "pearl": 1
    },
    "ability": null,
    "prestige": 2,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l2-02",
    "name": "Level 2 White Bonus #2",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "blue": 4,
      "red": 3
    },
    "ability": "STEAL_TOKEN",
    "prestige": 1,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l2-03",
    "name": "Level 2 White Bonus #3",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "white": 4,
      "black": 2,
      "pearl": 1
    },
    "ability": "TAKE_PRIVILEGE",
    "prestige": 2,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l2-04",
    "name": "Level 2 White Bonus #4",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "blue": 5,
      "green": 2
    },
    "ability": null,
    "prestige": 1,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l2-05",
    "name": "Level 2 Blue Bonus #1",
    "kind": "jewel",
    "level": 2,
    "crowns": 1,
    "cost": {
      "white": 2,
      "red": 2,
      "black": 2,
      "pearl": 1
    },
    "ability": null,
    "prestige": 2,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l2-06",
    "name": "Level 2 Blue Bonus #2",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "green": 4,
      "black": 3
    },
    "ability": "STEAL_TOKEN",
    "prestige": 1,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l2-07",
    "name": "Level 2 Blue Bonus #3",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "white": 2,
      "blue": 4,
      "pearl": 1
    },
    "ability": "TAKE_PRIVILEGE",
    "prestige": 2,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l2-08",
    "name": "Level 2 Blue Bonus #4",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "green": 5,
      "red": 2
    },
    "ability": null,
    "prestige": 1,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l2-09",
    "name": "Level 2 Green Bonus #1",
    "kind": "jewel",
    "level": 2,
    "crowns": 1,
    "cost": {
      "white": 2,
      "blue": 2,
      "black": 2,
      "pearl": 1
    },
    "ability": null,
    "prestige": 2,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l2-10",
    "name": "Level 2 Green Bonus #2",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "white": 3,
      "red": 4
    },
    "ability": "STEAL_TOKEN",
    "prestige": 1,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l2-11",
    "name": "Level 2 Green Bonus #3",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "blue": 2,
      "green": 4,
      "pearl": 1
    },
    "ability": "TAKE_PRIVILEGE",
    "prestige": 2,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l2-12",
    "name": "Level 2 Green Bonus #4",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "red": 5,
      "black": 2
    },
    "ability": null,
    "prestige": 1,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l2-13",
    "name": "Level 2 Black Bonus #1",
    "kind": "jewel",
    "level": 2,
    "crowns": 1,
    "cost": {
      "blue": 2,
      "green": 2,
      "red": 2,
      "pearl": 1
    },
    "ability": null,
    "prestige": 2,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l2-14",
    "name": "Level 2 Black Bonus #2",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "white": 4,
      "green": 3
    },
    "ability": "STEAL_TOKEN",
    "prestige": 1,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l2-15",
    "name": "Level 2 Black Bonus #3",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "red": 2,
      "black": 4,
      "pearl": 1
    },
    "ability": "TAKE_PRIVILEGE",
    "prestige": 2,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l2-16",
    "name": "Level 2 Black Bonus #4",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "white": 5,
      "blue": 2
    },
    "ability": null,
    "prestige": 1,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l2-17",
    "name": "Level 2 Red Bonus #1",
    "kind": "jewel",
    "level": 2,
    "crowns": 1,
    "cost": {
      "white": 2,
      "blue": 2,
      "green": 2,
      "pearl": 1
    },
    "ability": null,
    "prestige": 2,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l2-18",
    "name": "Level 2 Red Bonus #2",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "blue": 3,
      "black": 4
    },
    "ability": "STEAL_TOKEN",
    "prestige": 1,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l2-19",
    "name": "Level 2 Red Bonus #3",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "green": 2,
      "red": 4,
      "pearl": 1
    },
    "ability": "TAKE_PRIVILEGE",
    "prestige": 2,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l2-20",
    "name": "Level 2 Red Bonus #4",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "white": 2,
      "black": 5
    },
    "ability": null,
    "prestige": 1,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l2-21",
    "name": "Level 2 Associate #1",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "green": 6,
      "pearl": 1
    },
    "ability": "COPY_BONUS",
    "prestige": 2,
    "bonusColor": null,
    "cardType": "associate"
  },
  {
    "id": "l2-22",
    "name": "Level 2 Associate #2",
    "kind": "jewel",
    "level": 2,
    "crowns": 2,
    "cost": {
      "green": 6,
      "pearl": 1
    },
    "ability": "COPY_BONUS",
    "prestige": 0,
    "bonusColor": null,
    "cardType": "associate"
  },
  {
    "id": "l2-23",
    "name": "Level 2 Associate #3",
    "kind": "jewel",
    "level": 2,
    "crowns": 2,
    "cost": {
      "blue": 6,
      "pearl": 1
    },
    "ability": "COPY_BONUS",
    "prestige": 0,
    "bonusColor": null,
    "cardType": "associate"
  },
  {
    "id": "l2-24",
    "name": "Level 2 Gold Card",
    "kind": "jewel",
    "level": 2,
    "crowns": 0,
    "cost": {
      "blue": 6,
      "pearl": 1
    },
    "ability": null,
    "prestige": 5,
    "bonusColor": null,
    "cardType": "gold"
  },
  {
    "id": "l3-01",
    "name": "Level 3 White Bonus #1",
    "kind": "jewel",
    "level": 3,
    "crowns": 2,
    "cost": {
      "blue": 3,
      "red": 5,
      "black": 3,
      "pearl": 1
    },
    "ability": null,
    "prestige": 3,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l3-02",
    "name": "Level 3 White Bonus #2",
    "kind": "jewel",
    "level": 3,
    "crowns": 0,
    "cost": {
      "white": 6,
      "blue": 2,
      "black": 2
    },
    "ability": null,
    "prestige": 4,
    "bonusColor": "white",
    "cardType": "standard"
  },
  {
    "id": "l3-03",
    "name": "Level 3 Blue Bonus #1",
    "kind": "jewel",
    "level": 3,
    "crowns": 2,
    "cost": {
      "white": 3,
      "green": 3,
      "black": 5,
      "pearl": 1
    },
    "ability": null,
    "prestige": 3,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l3-04",
    "name": "Level 3 Blue Bonus #2",
    "kind": "jewel",
    "level": 3,
    "crowns": 0,
    "cost": {
      "white": 2,
      "blue": 6,
      "green": 2
    },
    "ability": null,
    "prestige": 4,
    "bonusColor": "blue",
    "cardType": "standard"
  },
  {
    "id": "l3-05",
    "name": "Level 3 Green Bonus #1",
    "kind": "jewel",
    "level": 3,
    "crowns": 2,
    "cost": {
      "white": 5,
      "blue": 3,
      "red": 3,
      "pearl": 1
    },
    "ability": null,
    "prestige": 3,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l3-06",
    "name": "Level 3 Green Bonus #2",
    "kind": "jewel",
    "level": 3,
    "crowns": 0,
    "cost": {
      "blue": 2,
      "green": 6,
      "red": 2
    },
    "ability": null,
    "prestige": 4,
    "bonusColor": "green",
    "cardType": "standard"
  },
  {
    "id": "l3-07",
    "name": "Level 3 Black Bonus #1",
    "kind": "jewel",
    "level": 3,
    "crowns": 2,
    "cost": {
      "white": 3,
      "green": 5,
      "red": 3,
      "pearl": 1
    },
    "ability": null,
    "prestige": 3,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l3-08",
    "name": "Level 3 Black Bonus #2",
    "kind": "jewel",
    "level": 3,
    "crowns": 0,
    "cost": {
      "white": 2,
      "red": 2,
      "black": 6
    },
    "ability": null,
    "prestige": 4,
    "bonusColor": "black",
    "cardType": "standard"
  },
  {
    "id": "l3-09",
    "name": "Level 3 Red Bonus #1",
    "kind": "jewel",
    "level": 3,
    "crowns": 2,
    "cost": {
      "blue": 5,
      "green": 3,
      "black": 3,
      "pearl": 1
    },
    "ability": null,
    "prestige": 3,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l3-10",
    "name": "Level 3 Red Bonus #2",
    "kind": "jewel",
    "level": 3,
    "crowns": 0,
    "cost": {
      "green": 2,
      "red": 6,
      "black": 2
    },
    "ability": null,
    "prestige": 4,
    "bonusColor": "red",
    "cardType": "standard"
  },
  {
    "id": "l3-11",
    "name": "Level 3 Associate #1",
    "kind": "jewel",
    "level": 3,
    "crowns": 0,
    "cost": {
      "red": 8
    },
    "ability": "EXTRA_TURN",
    "prestige": 3,
    "bonusColor": null,
    "cardType": "associate"
  },
  {
    "id": "l3-12",
    "name": "Level 3 Associate #2",
    "kind": "jewel",
    "level": 3,
    "crowns": 3,
    "cost": {
      "black": 8
    },
    "ability": "COPY_BONUS",
    "prestige": 0,
    "bonusColor": null,
    "cardType": "associate"
  },
  {
    "id": "l3-13",
    "name": "Level 3 Gold Card",
    "kind": "jewel",
    "level": 3,
    "crowns": 0,
    "cost": {
      "white": 8
    },
    "ability": null,
    "prestige": 6,
    "bonusColor": null,
    "cardType": "gold"
  }
] as const;

export const ROYAL_CARDS: readonly RoyalCardDef[] = [
  {
    "id": "royal-01",
    "name": "Royal Card #1",
    "kind": "royal",
    "level": 1,
    "crowns": 0,
    "cost": {},
    "ability": "STEAL_TOKEN",
    "prestige": 2,
    "bonusColor": null,
    "cardType": "royal"
  },
  {
    "id": "royal-02",
    "name": "Royal Card #2",
    "kind": "royal",
    "level": 1,
    "crowns": 0,
    "cost": {},
    "ability": "EXTRA_TURN",
    "prestige": 2,
    "bonusColor": null,
    "cardType": "royal"
  },
  {
    "id": "royal-03",
    "name": "Royal Card #3",
    "kind": "royal",
    "level": 1,
    "crowns": 0,
    "cost": {},
    "ability": "TAKE_PRIVILEGE",
    "prestige": 2,
    "bonusColor": null,
    "cardType": "royal"
  },
  {
    "id": "royal-04",
    "name": "Royal Card #4",
    "kind": "royal",
    "level": 1,
    "crowns": 0,
    "cost": {},
    "ability": null,
    "prestige": 3,
    "bonusColor": null,
    "cardType": "royal"
  }
] as const;
