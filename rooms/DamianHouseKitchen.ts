import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const DamianHouseKitchenRoom: RoomConfig = {
  bgMusic: "/OST/CHILL OMG_2.ogg",
  spawnPoint: { x: 394, y: 546 },
  bgColor: "#2a2825",
  description: "Kitchen. Clean. Unused.",
  width: 800,
  height: 600,
  onEnterDialogue: {
    speaker: "Damian",
    lines: [
      "Kitchen. You eat because you have to.",
    ],
  },
  objects: [
    {
      id: "fridge",
      x: 120,
      y: 150,
      width: 80,
      height: 140,
      color: "#4a4a4a",
      type: "prop",
      name: "Fridge",
      dialogue: [
      "Empty shelves. You buy what you need. Nothing more.",
    ]
    },
    {
      id: "sink",
      x: 380,
      y: 200,
      width: 100,
      height: 60,
      color: "#5a5a5a",
      type: "prop",
      name: "Sink",
      dialogue: [
      "Water runs. You drink. It doesn't taste like anything.",
    ]
    },
    {
      id: "door_main",
      x: 360,
      y: 530,
      width: 80,
      height: 70,
      color: "#1a1a1a",
      type: "trigger",
      name: "Living room",
      triggerScene: GameScene.DAMIAN_HOUSE
    },
  ],
};
