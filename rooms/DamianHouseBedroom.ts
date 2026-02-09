import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const DamianHouseBedroomRoom: RoomConfig = {
  bgMusic: "/OST/CHILL OMG_2.ogg",
  spawnPoint: { x: 382, y: 391 },
  bgColor: "#252530",
  description: "Your bedroom. Minimal. Functional.",
  height: 428,
  onEnterDialogue: {
    speaker: "Damian",
    lines: [
      "Your room. The only place that feels like a box you chose.",
    ],
  },
  objects: [
    {
      id: "bed",
      x: 301,
      y: 95,
      width: 180,
      height: 100,
      color: "#2a2a35",
      type: "prop",
      name: "Bed",
      dialogue: [
      "You don't dream. You never have. Sleep is just a reset.",
    ]
    },
    {
      id: "desk",
      x: 334,
      y: 0,
      width: 120,
      height: 70,
      color: "#3d3830",
      type: "prop",
      name: "Desk",
      dialogue: [
      "Old notes. Equations. Nothing that connects to anyone.",
    ]
    },
    {
      id: "door_main",
      x: 340,
      y: 358,
      width: 80,
      height: 70,
      color: "#1a1a1a",
      type: "trigger",
      name: "Living room",
      triggerScene: GameScene.DAMIAN_HOUSE
    },
  ],
};
