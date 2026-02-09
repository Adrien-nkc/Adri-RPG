import type { InventoryItem } from "../types";

/**
 * All items available in the game.
 * Add new items here; rooms reference items by id.
 */
export const ITEMS: Record<string, InventoryItem> = {
  hammer: { id: "hammer", name: "Hammer" },
  pistol: { id: "pistol", name: "Pistol" },
};

/** Default inventory when starting (before any pickups). */
export const DEFAULT_INVENTORY: InventoryItem[] = [ITEMS.hammer];

/** Item ids that can be used for shooting (e.g. in tutorial). */
export const SHOOTABLE_ITEM_IDS = ["pistol"] as const;

export function getItem(id: string): InventoryItem | undefined {
  return ITEMS[id];
}
