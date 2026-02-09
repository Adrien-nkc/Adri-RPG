import { Vector2 } from "../types";
import { AIEntity, AIConfig, AIState } from "./types";

export class AIBehaviors {
  /**
   * IDLE - Stand still or wander slightly
   */
  static idle(entity: AIEntity, deltaTime: number): { dx: number; dy: number } {
    // Just stand still for now
    // You could add slight random movement here if desired
    return { dx: 0, dy: 0 };
  }

  /**
   * PATROL - Move between waypoints
   */
  static patrol(
    entity: AIEntity,
    deltaTime: number,
  ): { dx: number; dy: number } {
    const { patrolPoints } = entity.aiConfig;
    const { patrolIndex } = entity.aiState;

    if (!patrolPoints || patrolPoints.length === 0) {
      return { dx: 0, dy: 0 };
    }

    const target = patrolPoints[patrolIndex % patrolPoints.length];
    const entityCenter = {
      x: entity.x + entity.width / 2,
      y: entity.y + entity.height / 2,
    };

    const dx = target.x - entityCenter.x;
    const dy = target.y - entityCenter.y;
    const distance = Math.hypot(dx, dy);

    // Reached waypoint
    if (distance < 8) {
      entity.aiState.patrolIndex = (patrolIndex + 1) % patrolPoints.length;
      entity.aiState.lastStateChange = Date.now();
      return { dx: 0, dy: 0 };
    }

    // Move toward waypoint
    const speed = entity.aiConfig.speed;
    const moveX = (dx / distance) * speed;
    const moveY = (dy / distance) * speed;

    return { dx: moveX, dy: moveY };
  }

  /**
   * CHASE - Move toward player
   */
  static chase(
    entity: AIEntity,
    playerPos: Vector2,
    deltaTime: number,
  ): { dx: number; dy: number } {
    const entityCenter = {
      x: entity.x + entity.width / 2,
      y: entity.y + entity.height / 2,
    };

    const dx = playerPos.x - entityCenter.x;
    const dy = playerPos.y - entityCenter.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1) return { dx: 0, dy: 0 };

    const speed = entity.aiConfig.speed * 1.2; // Chase slightly faster
    const moveX = (dx / distance) * speed;
    const moveY = (dy / distance) * speed;

    // Update last seen position
    entity.aiState.targetLastSeen = { ...playerPos };

    return { dx: moveX, dy: moveY };
  }

  /**
   * ATTACK - Stop and attack player (you can expand this)
   */
  static attack(
    entity: AIEntity,
    playerPos: Vector2,
    deltaTime: number,
  ): { dx: number; dy: number; shouldAttack: boolean } {
    const now = Date.now();
    const cooldown = entity.aiConfig.attackCooldown || 1000;
    const canAttack = now - entity.aiState.lastAttackTime > cooldown;

    if (canAttack) {
      entity.aiState.lastAttackTime = now;
      return { dx: 0, dy: 0, shouldAttack: true };
    }

    return { dx: 0, dy: 0, shouldAttack: false };
  }
}
