import { AmmoState, Player } from "../types";
import { ALL_GUNS } from "../items/guns";

interface HUDProps {
  player: Player;
  equippedGun: string | null;
  ammo: Record<string, AmmoState>;
}

export default function HUD({
  player,
  equippedGun,
  ammo,
}: HUDProps) {
  const currentGun = equippedGun ? ALL_GUNS[equippedGun] : null;
  const currentAmmo = equippedGun ? ammo[equippedGun] : null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: 20,
        color: "#fff",
        fontFamily: "monospace",
        fontSize: "16px",
        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
        userSelect: "none",
        zIndex: 100,
      }}
    >
      {/* Health Bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>HEALTH</div>
        <div
          style={{
            width: 200,
            height: 20,
            background: "rgba(0,0,0,0.6)",
            border: "2px solid #fff",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${((player.health ?? 100) / (player.maxHealth ?? 100)) * 100}%`,
              height: "100%",
              background:
                (player.health ?? 100) > 50
                  ? "#2ecc71"
                  : (player.health ?? 100) > 25
                    ? "#f39c12"
                    : "#e74c3c",
              transition: "width 0.3s",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: "bold",
            }}
          >
            {player.health ?? 100} / {player.maxHealth ?? 100}
          </div>
        </div>
      </div>

      {/* Weapon Info */}
      {currentGun && currentAmmo && (
        <div>
          <div style={{ fontSize: 14, marginBottom: 4, color: "#f39c12" }}>
            {currentGun.name.toUpperCase()}
          </div>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>
            {currentAmmo.isReloading ? (
              <span style={{ color: "#e74c3c" }}>RELOADING...</span>
            ) : (
              <>
                <span
                  style={{
                    color: currentAmmo.current === 0 ? "#e74c3c" : "#fff",
                  }}
                >
                  {currentAmmo.current}
                </span>
                <span style={{ fontSize: 16, color: "#95a5a6" }}>
                  {" "}
                  / {currentAmmo.reserve}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reload Hint */}
      {currentGun &&
        currentAmmo &&
        !currentAmmo.isReloading &&
        currentAmmo.current < currentGun.magazineSize && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#95a5a6" }}>
            Press R to reload
          </div>
        )}
    </div>
  );
}
