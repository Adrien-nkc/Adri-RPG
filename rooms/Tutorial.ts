import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const TUTORIAL_TARGET_IDS = ["target_1", "target_2", "target_3"];

export const TutorialRoom: RoomConfig = {
  bgMusic: "",
  spawnPoint: { x: 100, y: 400 },
  bgColor: "#1a1a1a",
  description: "Shooting range. Get familiar with movement and your inventory.",
  objects: [
    {
      id: "target_1",
      x: 380,
      y: 80,
      width: 60,
      height: 60,
      color: "#c0392b",
      type: "prop",
      collidable: true,
      dialogue: [
      "A practice target. Shoot it with the pistol.",
    ]
    },
    {
      id: "target_2",
      x: 227,
      y: 86,
      width: 50,
      height: 50,
      color: "#e74c3c",
      type: "prop",
      collidable: true,
      dialogue: [
      "Target. Use the mouse to shoot.",
    ]
    },
    {
      id: "target_3",
      x: 534,
      y: 82,
      width: 50,
      height: 50,
      color: "#e74c3c",
      type: "prop",
      collidable: true,
      dialogue: [
      "Target. Hit all three to open the exit.",
    ]
    },
    {
      id: "pistol_floor",
      x: 391,
      y: 394,
      width: 24,
      height: 16,
      color: "#4a4a4a",
      type: "pickup",
      name: "Pistol",
      dialogue: [
      "Pistol picked up. Equip it from INV and click to shoot targets.",
    ]
    },
    {
      id: "hole",
      x: 720,
      y: 500,
      width: 80,
      height: 100,
      color: "#0d0d0d",
      type: "trigger",
      name: "Exit",
      triggerScene: GameScene.DAMIAN_HOUSE
    },
    {
      id: "obj_1770556960772",
      x: 2,
      y: 342,
      width: 793,
      height: 13,
      color: "#512f01",
      type: "prop",
      name: "Table",
      collidable: true
    },
  ],
};
