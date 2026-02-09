# Rooms

Each room is a separate file. Room-specific **dialogues** live in the same file as the room (in the `DIALOGUES` object).

- **Start.ts** – Title / intro transition
- **Tutorial.ts** – Shooting range; exports `TUTORIAL_TARGET_IDS` for hit detection
- **DamianHouse.ts** – Protagonist’s house (main room); uses `onEnterDialogue` for Damian’s self-dialogue when you enter
- **DamianHouseBedroom.ts** – Bedroom; door back to main
- **DamianHouseKitchen.ts** – Kitchen; door back to main
- **BrazilSafehouse.ts** – Safehouse with Darius
- **Airport.ts** – Terminal before the plane
- **Plane.ts** – In-flight with Darius
- **Antarctica.ts** – The Facility
- **Ending.ts** – End screen

**Adding a room:** create `YourRoom.ts` (export a `RoomConfig`), add the scene to `GameScene` in `types.ts`, then register it in `index.ts`.
