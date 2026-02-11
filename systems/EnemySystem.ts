import { GameObject, Player, Vector2 } from "../types";

export class EnemySystem {
  static update(
    deltaTime: number,
    objects: GameObject[],
    player: Player,
    onShoot: (enemy: GameObject, targetX: number, targetY: number, damage: number) => void
  ): GameObject[] {
    const now = Date.now();
    const playerCenter = {
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
    };

    return objects.map((obj) => {
      // Determine if this object should have AI updates
      const hasAI = obj.aiType !== undefined;
      const isCombatant = obj.isEnemy || obj.type === "npc";
      
      if (!hasAI || !isCombatant || obj.isDead) return obj;

      // Initialize defaults if missing
      let {
        x,
        y,
        aiType = "stationary",
        patrolPoints,
        patrolIndex = 0,
        aiState = "idle",
        speed = 2,
        detectionRange = 250,
        attackRange = 150, // Range to stop and shoot
        width = 30,
        height = 50,
        attackDamage = 80,
        alignment = obj.isEnemy ? "enemy" : "player", // Default alignment if missing
      } = obj;

      const enemyCenter = {
        x: x + width / 2,
        y: y + height / 2,
      };

      // --- TARGET SELECTION ---
      let targetPos: Vector2 | null = null;
      let targetDist = Infinity;

      let isFriendlyFollow = false;

      if (alignment === "enemy") {
        // Enemies target player or friendly NPCs
        const distToPlayer = Math.hypot(
          playerCenter.x - enemyCenter.x,
          playerCenter.y - enemyCenter.y
        );
        targetPos = playerCenter;
        targetDist = distToPlayer;

        // Check for NPCs with 'player' alignment
        for (const other of objects) {
          if (other.alignment === "player" && other.type === "npc" && !other.isDead) {
            const dx = other.x + other.width / 2 - enemyCenter.x;
            const dy = other.y + other.height / 2 - enemyCenter.y;
            const dist = Math.hypot(dx, dy);
            if (dist < targetDist) {
              targetDist = dist;
              targetPos = { x: other.x + other.width / 2, y: other.y + other.height / 2 };
            }
          }
        }
      } else {
        // NPCs target enemies
        for (const other of objects) {
          if ((other.isEnemy || other.alignment === "enemy") && !other.isDead) {
            const dx = other.x + other.width / 2 - enemyCenter.x;
            const dy = other.y + other.height / 2 - enemyCenter.y;
            const dist = Math.hypot(dx, dy);
            if (dist < targetDist) {
              targetDist = dist;
              targetPos = { x: other.x + other.width / 2, y: other.y + other.height / 2 };
            }
          }
        }
        
        // Fallback: If no enemy target OR target is out of detection range, and not stationary, follow player
        if ((!targetPos || targetDist > detectionRange) && aiType !== "stationary" && alignment === "player") {
           const fRange = obj.followRange ?? 1000;
           const distToPlayer = Math.hypot(
             playerCenter.x - enemyCenter.x,
             playerCenter.y - enemyCenter.y
           );
           
           if (distToPlayer <= fRange) {
             targetPos = playerCenter;
             targetDist = distToPlayer;
             isFriendlyFollow = true;
           }
        }
      }

      // --- STATE TRANSITIONS ---
      let targetState = aiState;

      // 1. Detection Check
      // Use followRange for friendly following, detectionRange for combat
      const effectiveRange = isFriendlyFollow ? (obj.followRange ?? 1000) : detectionRange;
      
      if (targetPos && targetDist <= effectiveRange) {
        if (isFriendlyFollow) {
           targetState = "follow";
        } else if (aiType === "stationary") {
          targetState = "alert";
        } else if (aiType === "follow") {
          targetState = "follow";
        } else {
          targetState = "chase";
        }
      } else {
        // Target out of range or no target
        if (aiType === "patrol") {
          targetState = "patrol";
        } else {
          targetState = "idle";
        }
      }

      // 2. State Logic
      let newX = x;
      let newY = y;
      let newPatrolIndex = patrolIndex;
      
      // Shooting Logic
      // Shoot if we have a target AND are in an aggressive/alert state AND not friendly following
      const canShoot = !isFriendlyFollow && targetPos && (targetState === "chase" || targetState === "alert" || targetState === "follow") && targetDist <= detectionRange;
      
      const lastFireTime = (obj as any).lastFireTime || 0;
      const fireRateMs = 1500;
      
      if (canShoot && targetPos) {
        if (now - lastFireTime > fireRateMs) {
          onShoot(obj, targetPos.x, targetPos.y, attackDamage);
          (obj as any).lastFireTime = now;
        }
      }

      // Movement Logic
      if (targetState === "chase" && targetPos) {
        const effectiveStopDist = attackRange > 60 ? attackRange : 10;
        if (targetDist > effectiveStopDist) {
          const dx = targetPos.x - enemyCenter.x;
          const dy = targetPos.y - enemyCenter.y;
          const len = Math.hypot(dx, dy) || 1;
          newX += (dx / len) * speed;
          newY += (dy / len) * speed;
        }
      } else if (targetState === "follow" && targetPos) {
        const minFollowDist = 100;
        const maxFollowDist = 180;
        
        if (targetDist > maxFollowDist) {
          const dx = targetPos.x - enemyCenter.x;
          const dy = targetPos.y - enemyCenter.y;
          const len = Math.hypot(dx, dy) || 1;
          newX += (dx / len) * speed;
          newY += (dy / len) * speed;
        } else if (targetDist < minFollowDist) {
          const dx = targetPos.x - enemyCenter.x;
          const dy = targetPos.y - enemyCenter.y;
          const len = Math.hypot(dx, dy) || 1;
          newX -= (dx / len) * (speed * 0.5);
          newY -= (dy / len) * (speed * 0.5);
        }
      } else if (targetState === "patrol" && patrolPoints && patrolPoints.length > 0) {
        const target = patrolPoints[patrolIndex % patrolPoints.length];
        const dx = target.x - enemyCenter.x;
        const dy = target.y - enemyCenter.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 5) {
          newPatrolIndex = (patrolIndex + 1) % patrolPoints.length;
        } else {
          newX += (dx / (dist || 1)) * speed;
          newY += (dy / (dist || 1)) * speed;
        }
      }

      return {
        ...obj,
        x: newX,
        y: newY,
        aiState: targetState,
        patrolIndex: newPatrolIndex,
        lastFireTime: (obj as any).lastFireTime,
        alignment, // Store the determined alignment back
      };
    });
  }
}
