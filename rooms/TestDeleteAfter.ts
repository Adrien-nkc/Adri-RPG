import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const TestdeleteafterRoom: RoomConfig = {
  bgMusic: "/OST/! PHONK BRAZIL 2.ogg",
  spawnPoint: { x: 100, y: 400 },
  bgColor: "#1a1a1a",
  description: "Combat test arena",
  width: 1200,
  height: 800,
  objects: [
    {
      id: "floor",
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
      color: "#2d3436",
      type: "floor"
    },
    {
      id: "wall_top",
      x: 0,
      y: 0,
      width: 1200,
      height: 20,
      color: "#34495e",
      type: "prop",
      collidable: true
    },
    {
      id: "wall_bottom",
      x: 0,
      y: 780,
      width: 1200,
      height: 20,
      color: "#34495e",
      type: "prop",
      collidable: true
    },
    {
      id: "wall_left",
      x: 0,
      y: 0,
      width: 20,
      height: 800,
      color: "#34495e",
      type: "prop",
      collidable: true
    },
    {
      id: "wall_right",
      x: 1180,
      y: 0,
      width: 20,
      height: 800,
      color: "#34495e",
      type: "prop",
      collidable: true
    },
    {
      id: "cover_1",
      x: 300,
      y: 200,
      width: 80,
      height: 80,
      color: "#7f8c8d",
      type: "prop",
      collidable: true
    },
    {
      id: "cover_2",
      x: 600,
      y: 400,
      width: 80,
      height: 80,
      color: "#7f8c8d",
      type: "prop",
      collidable: true
    },
    {
      id: "cover_3",
      x: 900,
      y: 200,
      width: 80,
      height: 80,
      color: "#7f8c8d",
      type: "prop",
      collidable: true
    },
    {
      id: "enemy_test",
      x: 600,
      y: 100,
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
      ]
    },
    {
      id: "pistol_pickup",
      x: 150,
      y: 500,
      width: 30,
      height: 20,
      color: "#95a5a6",
      type: "pickup",
      name: "Pistol",
      dialogue: [
      "Picked up: Pistol",
    ]
    },
    {
      id: "shotgun_pickup",
      x: 500,
      y: 600,
      width: 40,
      height: 20,
      color: "#8e44ad",
      type: "pickup",
      name: "Shotgun",
      dialogue: [
      "Picked up: Shotgun",
    ]
    },
    {
      id: "rifle_pickup",
      x: 800,
      y: 100,
      width: 50,
      height: 20,
      color: "#27ae60",
      type: "pickup",
      name: "Rifle",
      dialogue: [
      "Picked up: Assault Rifle",
    ]
    },
    {
      id: "smg_pickup",
      x: 300,
      y: 650,
      width: 44,
      height: 20,
      color: "#f1c40f",
      type: "pickup",
      name: "SMG",
      dialogue: [
      "Picked up: SMG",
    ]
    },
    {
      id: "exit_door",
      x: 1100,
      y: 350,
      width: 60,
      height: 100,
      color: "#2c3e50",
      type: "doorway",
      triggerScene: GameScene.DAMIAN_HOUSE
    },
    {
      id: "obj_1770637779481",
      x: 100,
      y: 100,
      width: 25,
      height: 50,
      color: "#636e72",
      type: "enemy",
      name: "New object",
      collidable: true,
      isEnemy: true,
      health: 100,
      maxHealth: 100,
      aiType: "patrol",
      speed: 2,
      detectionRange: 250,
      attackRange: 40,
      attackDamage: 10,
      sprite: {
      w: 8,
      h: 8,
      pixels: [
        "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000",
        "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000",
        "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500",
        "#ff9500", "#ff9500", "#ffffff", "#ff9500", "#ff9500", "#ffffff", "#ff9500", "#ff9500",
        "#ff9500", "#ff9500", "#ffffff", "#ff9500", "#ff9500", "#ffffff", "#ff9500", "#ff9500",
        "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500",
        "#ff9500", "#ff9500", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ff9500", "#ff9500",
        "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500", "#ff9500",
      ],
    }
    },
  ],
};
