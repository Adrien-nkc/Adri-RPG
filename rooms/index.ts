import type { RoomConfig } from "../types";
import { GameScene } from "../types";
import { AirportRoom } from "./Airport";
import { AirportGateRoom } from "./AirportGate";
import { AntarcticaRoom } from "./Antarctica";
import { BrazilSafehouseRoom } from "./BrazilSafehouse";
import { DamianHouseRoom } from "./DamianHouse";
import { DamianHouseBedroomRoom } from "./DamianHouseBedroom";
import { DamianHouseKitchenRoom } from "./DamianHouseKitchen";
import { EndingRoom } from "./Ending";
import { PlaneRoom } from "./Plane";
import { StartRoom } from "./Start";
import * as TestdeleteafterModule from "./Testdeleteafter";
import { TutorialRoom, TUTORIAL_TARGET_IDS } from "./Tutorial";

const TestdeleteafterRoom =
  (TestdeleteafterModule as Record<string, RoomConfig>).TestdeleteafterRoom ??
  (TestdeleteafterModule as Record<string, RoomConfig>).testdeleteafter;

export { GameScene };

export { TUTORIAL_TARGET_IDS };
export type { RoomConfig };

export const SCENE_CONFIGS: Record<GameScene, RoomConfig> = {
  [GameScene.AIRPORT]: AirportRoom,
  [GameScene.AIRPORT_GATE]: AirportGateRoom,
  [GameScene.ANTARCTICA]: AntarcticaRoom,
  [GameScene.BRAZIL_SAFEHOUSE]: BrazilSafehouseRoom,
  [GameScene.DAMIAN_HOUSE]: DamianHouseRoom,
  [GameScene.DAMIAN_HOUSE_BEDROOM]: DamianHouseBedroomRoom,
  [GameScene.DAMIAN_HOUSE_KITCHEN]: DamianHouseKitchenRoom,
  [GameScene.ENDING]: EndingRoom,
  [GameScene.PLANE]: PlaneRoom,
  [GameScene.START]: StartRoom,
  [GameScene.TESTDELETEAFTER]: TestdeleteafterRoom,
  [GameScene.TUTORIAL]: TutorialRoom,
};
