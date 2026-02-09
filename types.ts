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

// Gun stats interface
export interface GunStats {
  id: string;
  name: string;
  damage: number;
  fireRate: number; // shots per second
  magazineSize: number;
  reloadTime: number; // milliseconds
  bulletSpeed: number;
  range: number;
  spread: number; // degrees of inaccuracy
  projectileType: "hitscan" | "projectile";
}

// Ammo tracking
export interface AmmoState {
  current: number; // current mag
  reserve: number; // reserve ammo
  isReloading: boolean;
}

export interface PixelSprite {
  w: number;
  h: number;
  pixels: (string | null)[];
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type:
    | "npc"
    | "prop"
    | "trigger"
    | "doorway"
    | "save"
    | "pickup"
    | "floor"
    | "enemy"
    | "spawn_marker"
    | "gun";
  dialogue?: string[];
  name?: string;
  triggerScene?: GameScene;
  /** If true, this object blocks player movement (collides). */
  collidable?: boolean;

  // Visuals
  sprite?: PixelSprite;
  spriteRepeat?: boolean;
  zIndex?: number;
  /** If true, this object is hidden and won't render until triggered */
  hidden?: boolean;

  // Gun stats interface
  itemId?: string;
  // Health system (for enemies and destructible objects)
  health?: number;
  maxHealth?: number;
  isEnemy?: boolean;
  isDead?: boolean;

  // For multiple spawn points: if set, this object acts as a spawn point when entering FROM this scene
  fromScene?: string;

  // Enemy AI
  aiType?: "stationary" | "patrol" | "chase" | "follow";
  patrolPoints?: Vector2[];
  detectionRange?: number;
  attackRange?: number;
  attackDamage?: number;
  // Death behavior
  dropItems?: string[]; // items to drop when enemy dies
  onDeathTrigger?: string; // object ID to trigger when enemy dies
  // AI stateful fields (for runtime only, not in static config)
  aiState?: "idle" | "patrol" | "chase";
  patrolIndex?: number;
  speed?: number;
  lastStateChange?: number;
  /** Runtime flag: set to true when this object has been activated by a death trigger */
  isTriggered?: boolean;
}

export interface OnEnterDialogue {
  speaker: string;
  lines: string[];
}

export interface RoomConfig {
  bgMusic: string;
  bgImage?: string;
  objects: GameObject[];
  spawnPoint: { x: number; y: number };
  description: string;
  bgColor: string;
  /** Room dimensions (defaults to canvas size when not set). */
  width?: number;
  height?: number;
  /** Optional dialogue played once when the player enters this room. */
  onEnterDialogue?: OnEnterDialogue;
  /** Tile size for collision grid (default 16) */
  tileSize?: number;
  /** Collision map: 2D array where 1 = blocked, 0 = walkable */
  collisionMap?: number[][];
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
  health?: number;
  maxHealth?: number;
}

// Bullet/projectile for projectile-based weapons
export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  range: number;
  distanceTraveled: number;
  fromPlayer: boolean;
  gunId?: string; // ID of the gun that fired this projectile
}

// Visual effects
export interface VisualEffect {
  id: string;
  type: "muzzle_flash" | "impact" | "blood_splatter" | "shell_casing";
  x: number;
  y: number;
  lifetime: number; // milliseconds
  createdAt: number;
}

export interface ShotLine {
  from: Vector2;
  to: Vector2;
  createdAt: number;
}
