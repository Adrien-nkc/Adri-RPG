import { GameObject as BaseGameObject, Vector2 } from "../types";
import { AIEntity, AIConfig, AIState } from "./types";
import { AIBehaviors } from "./behaviors";

// Extend GameObject to allow aiData for AI system
export type GameObject = BaseGameObject & {
  aiData?: {
    config: AIConfig;
    state: AIState;
  };
};
export class AISystem {
  /**
   * Initialize AI for an enemy
   */
  static initializeAI(enemy: GameObject): GameObject {
    const aiConfig: AIConfig = {
      type: enemy.aiType || "stationary",
      detectionRange: enemy.detectionRange || 300,
      attackRange: enemy.attackRange || 50,
      attackDamage: enemy.attackDamage || 10,
      speed: enemy.speed || 2,
      patrolPoints: enemy.patrolPoints,
      idleDuration: 2000,
      chaseTimeout: 3000,
      attackCooldown: 1000,
    };

    const aiState: AIState = {
      state: "idle",
      patrolIndex: 0,
      lastStateChange: Date.now(),
      lastAttackTime: 0,
      idleTimer: 0,
    };

    // Store AI data in the aiData field
    return {
      ...enemy,
      aiData: {
        config: aiConfig,
        state: aiState,
      },
    };
  }

  /**
   * Update a single AI entity
   */
  static updateEntity(
    entity: GameObject,
    playerPos: Vector2,
    deltaTime: number,
    roomWidth: number,
    roomHeight: number,
    collidableObjects: GameObject[],
  ): GameObject {
    if (entity.isDead || !entity.aiData) return entity;

    const { config: aiConfig, state: aiState } = entity.aiData;

    const entityCenter = {
      x: entity.x + entity.width / 2,
      y: entity.y + entity.height / 2,
    };

    const distToPlayer = Math.hypot(
      playerPos.x - entityCenter.x,
      playerPos.y - entityCenter.y,
    );

    // State transitions
    const newState = this.determineState(
      aiConfig,
      aiState,
      distToPlayer,
      playerPos,
    );

    // Update state if changed
    if (newState !== aiState.state) {
      aiState.state = newState;
      aiState.lastStateChange = Date.now();
    }

    // Execute behavior based on state
    let movement = { dx: 0, dy: 0 };

    // Create temporary AIEntity for behavior functions
    const tempEntity: AIEntity = {
      ...entity,
      aiConfig,
      aiState,
    };

    switch (aiState.state) {
      case "idle":
        movement = AIBehaviors.idle(tempEntity, deltaTime);
        break;
      case "patrol":
        movement = AIBehaviors.patrol(tempEntity, deltaTime);
        aiState.patrolIndex = tempEntity.aiState.patrolIndex;
        break;
      case "chase":
        movement = AIBehaviors.chase(tempEntity, playerPos, deltaTime);
        aiState.targetLastSeen = tempEntity.aiState.targetLastSeen;
        break;
      case "attack":
        const attackResult = AIBehaviors.attack(
          tempEntity,
          playerPos,
          deltaTime,
        );
        movement = { dx: attackResult.dx, dy: attackResult.dy };
        aiState.lastAttackTime = tempEntity.aiState.lastAttackTime;
        break;
    }

    // Apply movement with collision
    let newX = entity.x + movement.dx;
    let newY = entity.y + movement.dy;

    // Clamp to room bounds
    newX = Math.max(0, Math.min(roomWidth - entity.width, newX));
    newY = Math.max(0, Math.min(roomHeight - entity.height, newY));

    // Check collision with other objects
    const wouldCollide = collidableObjects.some((obj) => {
      if (obj.id === entity.id) return false;
      return (
        newX < obj.x + obj.width &&
        newX + entity.width > obj.x &&
        newY < obj.y + obj.height &&
        newY + entity.height > obj.y
      );
    });

    if (wouldCollide) {
      newX = entity.x;
      newY = entity.y;
    }

    return {
      ...entity,
      x: newX,
      y: newY,
      aiData: {
        config: aiConfig,
        state: aiState,
      },
    };
  }

  /**
   * Determine what state the AI should be in
   */
  private static determineState(
    aiConfig: AIConfig,
    aiState: AIState,
    distToPlayer: number,
    _playerPos: Vector2,
  ): "idle" | "patrol" | "chase" | "attack" {
    const { detectionRange, attackRange } = aiConfig;
    const { state } = aiState;

    // Attack range check
    if (distToPlayer <= attackRange) {
      return "attack";
    }

    // Detection range check
    if (distToPlayer <= detectionRange) {
      return "chase";
    }

    // Lost sight of player
    if (state === "chase" || state === "attack") {
      // Optionally use timeSinceLostSight for advanced logic
      // const timeSinceLostSight = Date.now() - lastStateChange;
      // For now, just fall through to patrol/idle
    }

    // Default fallback
    if (aiConfig.type === "patrol") return "patrol";
    return "idle";
  }
}
