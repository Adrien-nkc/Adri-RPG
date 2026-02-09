# Items

All **inventory and pickup items** are defined here.

- **ITEMS** – lookup by id (`hammer`, `pistol`, …)
- **DEFAULT_INVENTORY** – starting inventory (e.g. `[hammer]`)
- **getItem(id)** – get an item by id (for adding to inventory on pickup)

**Adding an item:** add an entry to `ITEMS` and use its `id` in room pickups and inventory logic.
