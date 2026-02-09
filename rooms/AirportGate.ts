import type { RoomConfig } from "../types";
import { GameScene } from "../types";

export const AirportGateRoom: RoomConfig = {
  bgMusic: "",
  spawnPoint: { x: 80, y: 300 },
  bgColor: "#2d3436",
  description: "The gate lounge. Rows of seats. A board shows your flight.",
  onEnterDialogue: {
    speaker: "Damian",
    lines: [
      "Gate lounge. The flight to Brazil is boarding.",
      "Darius is waiting. One last leg.",
    ],
  },
  objects: [
    {
      id: "board_flight",
      x: 640,
      y: 240,
      width: 140,
      height: 100,
      color: "#00b894",
      type: "trigger",
      name: "Board flight to Brazil",
      triggerScene: GameScene.BRAZIL_SAFEHOUSE,
    },
    {
      id: "seat_1",
      x: 200,
      y: 320,
      width: 50,
      height: 40,
      color: "#636e72",
      type: "prop",
      name: "Seat",
      dialogue: ["Plastic. You've been sitting for hours. Almost there."],
    },
    {
      id: "board_sign",
      x: 400,
      y: 120,
      width: 180,
      height: 50,
      color: "#b2bec3",
      type: "prop",
      name: "Departure board",
      dialogue: ["São Paulo. Gate 7. Final call."],
    },
  ],
};
