import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const AirportRoom: RoomConfig = {
  bgMusic: "",
  spawnPoint: { x: 50, y: 300 },
  bgColor: "#2d3436",
  description: "The liminal space of a private terminal. Steel and glass.",
  objects: [
    {
      id: "to_gate",
      x: 620,
      y: 220,
      width: 120,
      height: 80,
      color: "#74b9ff",
      type: "trigger",
      name: "To departure gate",
      triggerScene: GameScene.AIRPORT_GATE,
    },
    {
      id: "plane_trigger",
      x: 700,
      y: 380,
      width: 100,
      height: 100,
      color: "#dfe6e9",
      type: "trigger",
      name: "Flight to Antarctica",
      triggerScene: GameScene.PLANE,
    },
    {
      id: "worker_1",
      x: 400,
      y: 100,
      width: 30,
      height: 50,
      color: "#636e72",
      type: "npc",
      name: "Staff",
      dialogue: [
        "Please ensure all biological waste is disposed of correctly.",
        "The CEO doesn't like clutter.",
      ],
    },
    {
      id: "sign_gate",
      x: 500,
      y: 180,
      width: 80,
      height: 30,
      color: "#b2bec3",
      type: "prop",
      name: "Sign",
      dialogue: ["Departure gates →"],
    },
  ],
};
