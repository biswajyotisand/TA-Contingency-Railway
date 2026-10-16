/*
 * Rule tables - Travelling Allowance for Railway employees
 * Daily Allowance: Railway Board RBE No. 51/2024 (w.e.f. 01.01.2024,
 * +25% upon DA reaching 50%); Hotel & travel entitlement:
 * 7th CPC OM / RBE 84/2017 as escalated w.e.f. 01.01.2024.
 */

export type LevelKey =
  | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
  | "11" | "12" | "13" | "13A" | "14" | "15" | "16" | "17" | "18";

export const LEVELS: LevelKey[] = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "11", "12", "13", "13A", "14", "15", "16", "17", "18",
];

export const LEVEL_GP: Record<LevelKey, string> = {
  "1": "GP 1800", "2": "GP 1900", "3": "GP 2000", "4": "GP 2400",
  "5": "GP 2800", "6": "GP 4200", "7": "GP 4600", "8": "GP 4800",
  "9": "GP 5400", "10": "GP 5400", "11": "GP 6600", "12": "GP 7600",
  "13": "GP 8700", "13A": "GP 8900", "14": "GP 10000",
  "15": "HAG", "16": "HAG+", "17": "APEX", "18": "SECY",
};

export const levelNum = (k: LevelKey): number => (k === "13A" ? 13.5 : Number(k));

export interface Band {
  id: string;
  name: string; // e.g. "Level 6 - 8"
  levels: LevelKey[];
  da: number; // daily allowance (food lumpsum) in ₹/day
  hotel: number; // hotel/guest-house ceiling in ₹/day
  xUplift: boolean; // Class-X voucher uplift to 1250 (L8 & below)
  local: string; // local travel entitlement text
  train: string; // entitled class by train
  lamp: string; // hex color
}

export const BANDS: Band[] = [
  {
    id: "A",
    name: "Level 5 & below",
    levels: ["1", "2", "3", "4", "5"],
    da: 625,
    hotel: 562.5,
    xUplift: true,
    local: "Non-AC taxi up to ₹141.25/day",
    train: "First Class / AC-III / AC Chair",
    lamp: "#35B26B",
  },
  {
    id: "B",
    name: "Level 6 - 8",
    levels: ["6", "7", "8"],
    da: 1000,
    hotel: 937.5,
    xUplift: true,
    local: "Non-AC taxi up to ₹281.25/day",
    train: "AC-II Tier",
    lamp: "#8DC63F",
  },
  {
    id: "C",
    name: "Level 9 - 11",
    levels: ["9", "10", "11"],
    da: 1125,
    hotel: 2812.5,
    xUplift: false,
    local: "Non-AC taxi up to ₹422.50/day",
    train: "AC-II Tier",
    lamp: "#F2A93B",
  },
  {
    id: "D",
    name: "Level 12 - 13A",
    levels: ["12", "13", "13A"],
    da: 1250,
    hotel: 5625,
    xUplift: false,
    local: "AC taxi up to 50 km/day",
    train: "AC-I Class",
    lamp: "#F26D3A",
  },
  {
    id: "E",
    name: "Level 14 & above",
    levels: ["14", "15", "16", "17", "18"],
    da: 1500,
    hotel: 9375,
    xUplift: false,
    local: "AC taxi / actual expenditure",
    train: "AC-I Class",
    lamp: "#E2483A",
  },
];

export const X_CLASS_UPLIFT = 1250; // ₹/day for L8 & below in X cities, with vouchers

export const bandOf = (k: LevelKey): Band =>
  BANDS.find((b) => b.levels.includes(k)) ?? BANDS[0];

/* Hotel ceiling per night for a level + city class (X/Y/Z) */
export const hotelCeiling = (k: LevelKey, cls: "X" | "Y" | "Z"): number => {
  const b = bandOf(k);
  if (b.xUplift && cls === "X") return Math.max(b.hotel, X_CLASS_UPLIFT);
  return b.hotel;
};

/* DA slab for the remainder hours of absence beyond full 24-h cycles */
export const daSlabForHours = (h: number): number => (h <= 0 ? 0 : h <= 6 ? 0.3 : h <= 12 ? 0.7 : 1);

/* Road mileage (RBE 51/2024 - w.e.f. 01.01.2024) */
export const MILEAGE = {
  car: { label: "Own car / taxi", rate: 30 },
  two: { label: "Auto / scooter", rate: 15 },
} as const;

export const CITY_CLASSES = [
  { id: "X" as const, name: "X - Metro", eg: "Eight metros (UA)" },
  { id: "Y" as const, name: "Y - Large", eg: "97 large towns" },
  { id: "Z" as const, name: "Z - Others", eg: "All other stations" },
];

export const CONVEY_CHIPS = ["Taxi / Cab", "Auto fare", "Metro / local train", "Site inspection travel", "Porterage"];
export const CONTING_CHIPS = [
  "Photocopies & plan prints",
  "Official records freight",
  "Stationery / survey material",
  "Mobile & data recharge",
  "Courier - official docs",
];
