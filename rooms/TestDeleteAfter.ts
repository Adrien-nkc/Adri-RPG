import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const testdeleteafter: RoomConfig = {
  bgMusic: "",
  spawnPoint: { x: 1000, y: 1074 },
  bgColor: "#ffffff",
  description: "This is the testing room!",
  width: 2000,
  height: 2000,
  onEnterDialogue: {
    speaker: "Darius",
    lines: [
      "This is a testing room, it feels like an asylum",
    ],
  },
  objects: [
    {
      id: "obj_1770593306801",
      x: 910,
      y: 845,
      width: 160,
      height: 165,
      color: "#ffc800",
      type: "prop",
      name: "Box",
      collidable: true,
      dialogue: [
      "Just a boring box...",
    ]
    },
  ],
};
