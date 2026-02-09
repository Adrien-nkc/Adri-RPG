import type { RoomConfig } from "../types";
import { GameScene } from "../types";

const DIALOGUES = {
  darius: [
    "Damian. You look... as empty as ever.",
    "RSI is moving fast. The Dyson project isn't about energy.",
    "It's about ownership. The CEO wants to own the very sun we see.",
    "I've mapped the Antarctica facility. It's a cage for geniuses.",
    "Let's go. The airport is waiting.",
  ],
  savePoint: [
    "The buzzing fan is the only sound in the void. Your objective is recorded.",
  ],
};

export const BrazilSafehouseRoom: RoomConfig = {
  bgMusic: "/OST/BOSSA NOBA.ogg",
  spawnPoint: { x: 100, y: 100 },
  bgColor: "#1a1a2e",
  description: "A humid, low-lit safehouse in Brazil. Fans buzz overhead.",
  objects: [
    {
      id: "darius",
      name: "Darius",
      x: 600,
      y: 200,
      width: 30,
      height: 50,
      color: "#ffdd00",
      type: "npc",
      dialogue: DIALOGUES.darius,
    },
    {
      id: "exit_safehouse",
      x: 750, // right edge (800 - 50)
      y: 200,
      width: 50,
      height: 100,
      color: "#333",
      type: "trigger",
      triggerScene: GameScene.AIRPORT,
    },
    {
      id: "save_point",
      x: 200,
      y: 400,
      width: 40,
      height: 40,
      color: "#ffd700",
      type: "save",
      dialogue: DIALOGUES.savePoint,
    },
  ],
};
