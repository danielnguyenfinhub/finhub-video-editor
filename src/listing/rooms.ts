// A photo scene's id names its room ("kitchen", "bedroom-2"): the room chip
// and the tour-progress icon come from here. Unknown ids get a plain home icon
// and the id itself as the label, so a new room never breaks a render.
import {
  Bath,
  Bed,
  Car,
  CookingPot,
  DoorOpen,
  Home,
  LayoutGrid,
  Shirt,
  Sofa,
  Trees,
  UtensilsCrossed,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

type Room = { vi: string; en: string; Icon: LucideIcon };

const ROOMS: [RegExp, Room][] = [
  [
    /^(front|exterior|facade|street)/,
    { vi: "Mặt tiền", en: "Front", Icon: Home },
  ],
  [/^(entry|hall|foyer)/, { vi: "Lối vào", en: "Entry", Icon: DoorOpen }],
  [
    /^(living|lounge|family|rumpus)/,
    { vi: "Phòng khách", en: "Living", Icon: Sofa },
  ],
  [/^(dining)/, { vi: "Phòng ăn", en: "Dining", Icon: UtensilsCrossed }],
  [/^(kitchen)/, { vi: "Nhà bếp", en: "Kitchen", Icon: CookingPot }],
  [
    /^(bedroom|master|main-bedroom)/,
    { vi: "Phòng ngủ", en: "Bedroom", Icon: Bed },
  ],
  [
    /^(bathroom|ensuite|toilet|wc)/,
    { vi: "Phòng tắm", en: "Bathroom", Icon: Bath },
  ],
  [/^(laundry)/, { vi: "Phòng giặt", en: "Laundry", Icon: WashingMachine }],
  [
    /^(backyard|yard|garden|outdoor|alfresco|patio|balcony|pool)/,
    { vi: "Sân vườn", en: "Outdoor", Icon: Trees },
  ],
  [
    /^(garage|carport|driveway|parking)/,
    { vi: "Garage", en: "Garage", Icon: Car },
  ],
  [/^(robe|wardrobe|walk-?in)/, { vi: "Tủ quần áo", en: "Robe", Icon: Shirt }],
  [
    /^(floor-?plan|plan)/,
    { vi: "Mặt bằng", en: "Floor plan", Icon: LayoutGrid },
  ],
];

// Drawings, not photos: shown whole on paper, never cropped or labelled "staged".
export const isPlan = (id: string) =>
  /^(floor-?plan|plan)/.test(id.toLowerCase());

export const roomOf = (id: string): Room => {
  const hit = ROOMS.find(([re]) => re.test(id.toLowerCase()));
  if (!hit) return { vi: id, en: id, Icon: Home };
  // "bedroom-2" -> "Phòng ngủ 2 / Bedroom 2"
  const n = /-(\d+)$/.exec(id)?.[1];
  return n
    ? { ...hit[1], vi: `${hit[1].vi} ${n}`, en: `${hit[1].en} ${n}` }
    : hit[1];
};

// Every room label, for the listing compliance run (scripts/listing-compliance.mjs).
export const roomLabels = (): string[] =>
  ROOMS.flatMap(([, r]) => [r.vi, r.en]);
