import { Vector2, GameObject } from "../types";

export interface AIState {
  state: "idle" | "patrol" | "chase" | "attack";
  patrolIndex: number;
  lastStateChange: number;
  lastAttackTime: number;
  targetLastSeen?: Vector2;
  idleTimer: number;
}

export interface AIConfig {
  type: "stationary" | "patrol" | "chase" | "follow";
  detectionRange: number;
  attackRange: number;
  attackDamage: number;
  speed: number;
  patrolPoints?: Vector2[];
  // Behavior timings
  idleDuration?: number;
  chaseTimeout?: number;
  attackCooldown?: number;
}

// Extend GameObject without conflicting
export interface AIEntity extends Omit<GameObject, "aiState"> {
  aiConfig: AIConfig;
  aiState: AIState;
}
