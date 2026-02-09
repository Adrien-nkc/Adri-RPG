export enum GameScene {
  AIRPORT = "AIRPORT",
  AIRPORT_GATE = "AIRPORT_GATE",
  ANTARCTICA = "ANTARCTICA",
  BRAZIL_SAFEHOUSE = "BRAZIL_SAFEHOUSE",
  DAMIAN_HOUSE = "DAMIAN_HOUSE",
  DAMIAN_HOUSE_BEDROOM = "DAMIAN_HOUSE_BEDROOM",
  DAMIAN_HOUSE_KITCHEN = "DAMIAN_HOUSE_KITCHEN",
  ENDING = "ENDING",
  PLANE = "PLANE",
  START = "START",
  // TEST_DELETE_AFTER = "TEST_DELETE_AFTER", // Removed duplicate, use TESTDELETEAFTER only
  TUTORIAL = "TUTORIAL",
  TESTDELETEAFTER = "TESTDELETEAFTER",
}

export interface InventoryItem {
  id: string;
  name: string;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: "npc" | "prop" | "trigger" | "doorway" | "save" | "pickup" | "floor";
  dialogue?: string[];
  name?: string;
  triggerScene?: GameScene;
  /** If true, this object blocks player movement (collides). */
  collidable?: boolean;
}

export interface OnEnterDialogue {
  speaker: string;
  lines: string[];
}

export interface RoomConfig {
  bgMusic: string;
  objects: GameObject[];
  spawnPoint: { x: number; y: number };
  description: string;
  bgColor: string;
  /** Optional room dimensions (defaults to canvas size when not set). */
  width?: number;
  height?: number;
  /** Optional dialogue played once when the player enters this room. */
  onEnterDialogue?: OnEnterDialogue;
  /** Walkable areas: array of polygons (each polygon is an array of points) */
  walkableAreas?: Vector2[][];
}

export interface DialogueState {
  speaker: string;
  text: string[];
  currentIndex: number;
  active: boolean;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  frame: number;
  facing: "up" | "down" | "left" | "right";
}
