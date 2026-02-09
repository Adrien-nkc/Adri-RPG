import type { InventoryItem } from "../types";
import { customItems } from "./customItems";

/**
 * Built-in items. Custom items are added via Admin Panel and stored in customItems.ts.
 */
const BUILTIN_ITEMS: Record<string, InventoryItem> = {
  hammer: { id: "hammer", name: "Hammer" },
  pistol: { id: "pistol", name: "Pistol" },
  shotgun: { id: "shotgun", name: "Shotgun" },
  rifle: { id: "rifle", name: "Rifle" },
  smg: { id: "smg", name: "SMG" },
  rocket_launcher: { id: "rocket_launcher", name: "Rocket Launcher" },
};

/** All items (built-in + custom from admin). */
export const ITEMS: Record<string, InventoryItem> = {
  ...BUILTIN_ITEMS,
  ...Object.fromEntries(customItems.map((i) => [i.id, i])),
};

/** Default inventory when starting (before any pickups). */
export const DEFAULT_INVENTORY: InventoryItem[] = [ITEMS.hammer];

/** Item ids that can be used for shooting (e.g. in tutorial). */
export const SHOOTABLE_ITEM_IDS = ["pistol"] as const;

export function getItem(id: string): InventoryItem | undefined {
  return ITEMS[id];
}
