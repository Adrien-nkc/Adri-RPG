import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const BrazilSafehouseRoom: RoomConfig = {
  bgMusic: "/OST/BOSSA NOBA.ogg",
  spawnPoint: { x: 100, y: 100 },
  bgColor: "#1a1a2e",
  description: "A humid, low-lit safehouse in Brazil. Fans buzz overhead.",
  width: 800,
  height: 600,
  objects: [
    {
      id: "darius",
      x: 513,
      y: 238,
      width: 30,
      height: 50,
      color: "#ffdd00",
      type: "npc",
      name: "Darius",
      dialogue: [
      "Damian. You look... as empty as ever.",
      "RSI is moving fast. The Dyson project isn't about energy.",
      "It's about ownership. The CEO wants to own the very sun we see.",
      "I've mapped the Antarctica facility. It's a cage for geniuses.",
      "Let's go. The airport is waiting.",
    ]
    },
    {
      id: "exit_safehouse",
      x: 750,
      y: 200,
      width: 50,
      height: 100,
      color: "#333",
      type: "trigger",
      triggerScene: GameScene.AIRPORT
    },
  ],
};
