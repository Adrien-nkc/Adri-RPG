import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const PlaneRoom: RoomConfig = {
  bgMusic: "",
  spawnPoint: { x: 100, y: 300 },
  bgColor: "#000000",
  description: "Inside the jet. The hum of engines masking silence.",
  objects: [
    {
      id: "plane",
      x: 300,
      y: 300,
      width: 30,
      height: 50,
      color: "#ffdd00",
      type: "npc",
      name: "Darius",
      dialogue: [
        "My mother worked there, Damian.",
        "I didn't find a body. I found a slaughterhouse.",
        "RSI calls it 'progress'. I call it a target.",
        "We're almost at Antarctica. Ready the hammer.",
      ],
    },
    {
      id: "land_trigger",
      x: 740,
      y: 260,
      width: 60,
      height: 80,
      color: "#ffffff",
      type: "trigger",
      triggerScene: GameScene.ANTARCTICA,
    },
  ],
};
