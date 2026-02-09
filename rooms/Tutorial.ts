import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const TUTORIAL_TARGET_IDS = [];

export const TutorialRoom: RoomConfig = {
  bgMusic: "",
  spawnPoint: { x: 100, y: 400 },
  bgColor: "#1a1a1a",
  description: "Shooting range. Get familiar with movement and your inventory.",
  width: 800,
  height: 600,
  objects: [
    {
      id: "pistol_pickup",
      x: 356,
      y: 470,
      width: 30,
      height: 20,
      color: "#95a5a6",
      type: "pickup",
      name: "Pistol",
      dialogue: [
      "Pickup: Pistol",
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
      hidden: true,
      triggerScene: GameScene.DAMIAN_HOUSE
    },
    {
      id: "enemy_test",
      x: 363,
      y: 55,
      width: 30,
      height: 50,
      color: "#ff0000",
      type: "enemy",
      name: "Guard",
      collidable: true,
      isEnemy: true,
      health: 100,
      maxHealth: 100,
      aiType: "patrol",
      speed: 2,
      detectionRange: 250,
      attackRange: 40,
      attackDamage: 10,
      patrolPoints: [
        { x: 600, y: 100 },
        { x: 600, y: 300 },
        { x: 400, y: 300 },
        { x: 400, y: 100 },
      ],
      onDeathTrigger: "hole",
      sprite: {
      w: 8,
      h: 8,
      pixels: [
        "", "#ffffff", "#ffffff", "", "", "#ffffff", "#ffffff", "",
        "", "#ffffff", "#ffffff", "", "", "#ffffff", "#ffffff", "",
        "", "", "", "", "", "", "", "",
        "", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "",
        "", "#ffffff", "", "", "", "", "#ffffff", "",
        "", "#ffffff", "", "", "", "", "#ffffff", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
      ],
    }
    },
  ],
};
