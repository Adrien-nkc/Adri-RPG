import { GunStats } from "../types";

// Returns 99 or 100 randomly
function calculateDamage() {
  return Math.random() < 0.5 ? 99 : 100;
}

export const PISTOL: GunStats = {
  id: "pistol",
  name: "Pistol",
  damage: calculateDamage(),
  fireRate: 3, // 3 shots per second
  magazineSize: 12,
  reloadTime: 1500,
  bulletSpeed: 1000,
  range: 600,
  spread: 2,
  projectileType: "hitscan",
};

export const SHOTGUN: GunStats = {
  id: "shotgun",
  name: "Shotgun",
  damage: 90, // per pellet (fires 6 pellets)
  fireRate: 1, // 1 shot per second
  magazineSize: 6,
  reloadTime: 2500,
  bulletSpeed: 800,
  range: 250,
  spread: 15,
  projectileType: "hitscan",
};

export const RIFLE: GunStats = {
  id: "rifle",
  name: "Assault Rifle",
  damage: 18,
  fireRate: 8, // 8 shots per second (full auto)
  magazineSize: 30,
  reloadTime: 2000,
  bulletSpeed: 1200,
  range: 800,
  spread: 3,
  projectileType: "hitscan",
};

export const SMG: GunStats = {
  id: "smg",
  name: "SMG",
  damage: 15,
  fireRate: 12, // very fast
  magazineSize: 25,
  reloadTime: 1800,
  bulletSpeed: 900,
  range: 400,
  spread: 5,
  projectileType: "hitscan",
};

// Gun registry - add guns here as you create them
export const ALL_GUNS: Record<string, GunStats> = {
  pistol: PISTOL,
  shotgun: SHOTGUN,
  rifle: RIFLE,
  smg: SMG,
};

// Starting ammo for each gun
export const STARTING_AMMO: Record<string, { mag: number; reserve: number }> = {
  pistol: { mag: 12, reserve: 48 },
  shotgun: { mag: 6, reserve: 24 },
  rifle: { mag: 30, reserve: 90 },
  smg: { mag: 25, reserve: 100 },
};
