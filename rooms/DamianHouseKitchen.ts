import type { RoomConfig } from "../types";
import { GameScene } from "../types";

const DIALOGUES = {
  fridge: ["Empty shelves. You buy what you need. Nothing more."],
  sink: ["Water runs. You drink. It doesn't taste like anything."],
};

export const DamianHouseKitchenRoom: RoomConfig = {
  bgMusic: "/OST/CHILL OMG_2.ogg",
  spawnPoint: { x: 380, y: 400 },
  bgColor: "#2a2825",
  description: "Kitchen. Clean. Unused.",
  onEnterDialogue: {
    speaker: "Damian",
    lines: ["Kitchen. You eat because you have to."],
  },
  objects: [
    {
      id: "fridge",
      name: "Fridge",
      x: 120,
      y: 150,
      width: 80,
      height: 140,
      color: "#4a4a4a",
      type: "prop",
      dialogue: DIALOGUES.fridge,
    },
    {
      id: "sink",
      name: "Sink",
      x: 380,
      y: 200,
      width: 100,
      height: 60,
      color: "#5a5a5a",
      type: "prop",
      dialogue: DIALOGUES.sink,
    },
    {
      id: "door_main",
      name: "Living room",
      x: 360,
      y: 530,
      width: 80,
      height: 70,
      color: "#1a1a1a",
      type: "trigger",
      triggerScene: GameScene.DAMIAN_HOUSE,
    },
  ],
};
