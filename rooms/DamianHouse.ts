import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const DamianHouseRoom: RoomConfig = {
  bgMusic: "/OST/CHILL OMG_2.ogg",
  spawnPoint: { x: 380, y: 420 },
  bgColor: "#2c2c2c",
  description: "Your house. Quiet. You're alone.",
  bgImage: "/Textures/Floor.jpg",
  width: 800,
  height: 600,
  onEnterDialogue: {
    speaker: "Damian",
    lines: [
      "Home. Empty. As always.",
      "Darius said to meet in Brazil. One last stop before the mission.",
      "Nothing left here. Just the walls.",
    ],
  },
  objects: [
    {
      id: "couch",
      x: 326,
      y: 299,
      width: 140,
      height: 50,
      color: "#4a3728",
      type: "prop",
      name: "Couch",
      dialogue: [
      "The couch hasn't been sat on in months. You don't invite people over.",
    ]
    },
    {
      id: "window",
      x: 320,
      y: 0,
      width: 160,
      height: 80,
      color: "#1a2a3a",
      type: "prop",
      name: "Window",
      dialogue: [
      "Same grey sky. It doesn't change. You don't care.",
    ]
    },
    {
      id: "table",
      x: 357,
      y: 211,
      width: 80,
      height: 60,
      color: "#3d2914",
      type: "prop",
      name: "Table",
      dialogue: [
      "Bills. Unopened. They'll wait. Everything waits.",
    ]
    },
    {
      id: "door_bedroom",
      x: 0,
      y: 200,
      width: 50,
      height: 80,
      color: "#1a1a1a",
      type: "doorway",
      name: "Bedroom",
      triggerScene: GameScene.DAMIAN_HOUSE_BEDROOM
    },
    {
      id: "door_kitchen",
      x: 750,
      y: 200,
      width: 50,
      height: 80,
      color: "#1a1a1a",
      type: "doorway",
      name: "Kitchen",
      triggerScene: GameScene.DAMIAN_HOUSE_KITCHEN
    },
    {
      id: "front_door",
      x: 360,
      y: 530,
      width: 80,
      height: 70,
      color: "#3d2817",
      type: "trigger",
      name: "Front door",
      triggerScene: GameScene.AIRPORT
    },
    {
      id: "obj_1770641062021",
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      color: "#636e72",
      type: "spawn_marker",
      name: "New object",
      fromScene: "DAMIAN_HOUSE_BEDROOM"
    },
  ],
};
