import type { RoomConfig } from "../types";
import { GameScene } from "../types";

const DIALOGUES = {
  scientistCorpse: [
    "A scientist. Their appendix was removed long ago.",
    "So is their heartbeat.",
  ],
};

export const AntarcticaRoom: RoomConfig = {
  bgMusic: "/OST/AMBIENVE BEAT_2 v2.ogg",
  spawnPoint: { x: 400, y: 500 },
  bgColor: "#f0f0f0",
  description: "The Facility. An icy tomb for the brilliant.",
  objects: [
    {
      id: "rsi_gate",
      x: 380,
      y: 0,
      width: 40,
      height: 60,
      color: "#000",
      type: "trigger",
      triggerScene: GameScene.ENDING,
    },
    {
      id: "scientist_corpse",
      x: 200,
      y: 300,
      width: 50,
      height: 20,
      color: "#d63031",
      type: "prop",
      dialogue: DIALOGUES.scientistCorpse,
    },
  ],
};
