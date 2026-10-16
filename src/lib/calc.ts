import { LevelKey, bandOf } from "../data/rules";

export type CityClass = "X" | "Y" | "Z";

export interface Profile {
  name: string;
  desig: string;
  dept: string; // department e.g. "Personnel"
  pay: string;
  gp: string;
  doa: string;
  rule: string;
  hq: string;
  level: LevelKey;
}

export interface User {
  name: string;
  hrmsId: string;
}

/* Contingency row - structured fields; particulars is auto-composed for printing */
export interface ContingencyRow {
  id: string;
  date: string; // YYYY-MM-DD
  from: string; // e.g. "KGPW"
  to: string; // e.g. "KGP Station"
  isReturn: boolean; // round trip (doubles the amount)
  kms: number; // distance in km (one-way)
  rate: number; // rate per km (e.g. 15)
  amount: number; // computed: kms * rate * (isReturn ? 2 : 1)
}

/** Auto-compose the particulars string for the Contingent Bill print */
export function particularsText(r: ContingencyRow): string {
  const parts: string[] = [];
  if (r.from || r.to) {
    const fromTo = [r.from, r.to].filter(Boolean).join(" to ");
    parts.push(fromTo);
  }
  if (r.kms > 0) parts.push(`${r.kms} Kms`);
  if (r.rate > 0) parts.push(`@ Rs. ${r.rate.toFixed(2)}`);
  let text = parts.join(" ") || "";
  if (r.isReturn && text !== "") {
    text += " & Return";
  }
  return text;
}

/* A single journey sub-row in the journal table */
export interface JourneyRow {
  id: string;
  date: string; // YYYY-MM-DD
  trainNo: string;
  depTime: string; // HH:MM or ""
  arrTime: string; // HH:MM or ""
  from: string;
  to: string;
  kms: number;
  onPass: boolean;
  fare: number;
}

/* A journey group = one object of journey + its rows */
export interface JourneyGroup {
  id: string;
  object: string;
  rows: JourneyRow[];
}

/* DA entry - one per calendar day of absence */
export interface DaEntry {
  id: string;
  date: string; // YYYY-MM-DD
  pct: 100 | 70 | 30; // absence slab %
  amount: number; // = rate * pct/100
  auto: boolean; // was this auto-generated? (user can override pct)
}

export interface Item {
  id: string;
  label: string;
  amount: number;
}

export interface CalcState {
  railway: string;
  distHQ: string;
  claimMonth: string;
  claimNo: string;
  billDate: string;
  profile: Profile;
  groups: JourneyGroup[];
  daEntries: DaEntry[];
  daRateOverride: number | null;
  contingency: ContingencyRow[];
}

function timeToMinutes(t: string): number {
  if (!t) return -1;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function hoursToSlab(h: number): 100 | 70 | 30 {
  if (h > 12) return 100;
  if (h >= 6) return 70;
  return 30;
}

/** Get all calendar dates from startDate to endDate inclusive as YYYY-MM-DD */
function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  if (!sy || !ey) return dates;
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  if (isNaN(cur.getTime()) || isNaN(end.getTime()) || end < cur) return dates;
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

interface TripSpan {
  depDate: string;
  depMinutes: number; // minutes from midnight on depDate
  arrDate: string;
  arrMinutes: number; // minutes from midnight on arrDate
}

function extractTripSpan(g: JourneyGroup): TripSpan | null {
  if (g.rows.length === 0) return null;
  const depRow = g.rows.find((r) => r.depTime || r.date);
  const arrRow = [...g.rows].reverse().find((r) => r.arrTime || r.date);
  if (!depRow) return null;
  const depDate = depRow.date;
  const arrDate = arrRow?.date || depDate;
  if (!depDate) return null;
  const depMin = depRow.depTime ? timeToMinutes(depRow.depTime) : 0;
  const arrMin = arrRow?.arrTime ? timeToMinutes(arrRow.arrTime) : 1439;
  return { depDate, depMinutes: depMin >= 0 ? depMin : 0, arrDate, arrMinutes: arrMin >= 0 ? arrMin : 1439 };
}

export function computeDaEntries(
  groups: JourneyGroup[],
  rate: number,
  existingEntries: DaEntry[] = [],
): DaEntry[] {
  const spans: TripSpan[] = groups.map(extractTripSpan).filter(Boolean) as TripSpan[];
  if (spans.length === 0) return [];
  const dayMap = new Map<string, { minStart: number; maxEnd: number }>();
  for (const span of spans) {
    const dates = dateRange(span.depDate, span.arrDate);
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      const isSameDay = dates.length === 1;
      const isFirstDay = i === 0;
      const isLastDay = i === dates.length - 1;
      let dayStart: number;
      let dayEnd: number;
      if (isSameDay) {
        dayStart = span.depMinutes;
        dayEnd = span.arrMinutes;
      } else if (isFirstDay) {
        dayStart = span.depMinutes;
        dayEnd = 1440;
      } else if (isLastDay) {
        dayStart = 0;
        dayEnd = span.arrMinutes;
      } else {
        dayStart = 0;
        dayEnd = 1440;
      }
      const ex = dayMap.get(d);
      if (ex) {
        ex.minStart = Math.min(ex.minStart, dayStart);
        ex.maxEnd = Math.max(ex.maxEnd, dayEnd);
      } else {
        dayMap.set(d, { minStart: dayStart, maxEnd: dayEnd });
      }
    }
  }
  const overrides = new Map<string, { pct: 100 | 70 | 30 }>();
  existingEntries.forEach((e) => {
    if (!e.auto) overrides.set(e.date, { pct: e.pct });
  });
  const sortedDates = [...dayMap.keys()].sort();
  return sortedDates.map((date) => {
    const { minStart, maxEnd } = dayMap.get(date)!;
    const hours = (maxEnd - minStart) / 60;
    const autoPct = hoursToSlab(hours);
    const ov = overrides.get(date);
    const pct = ov ? ov.pct : autoPct;
    return { id: date, date, pct, amount: round2((pct / 100) * rate), auto: !ov };
  });
}

export interface Computed {
  daRate: number;
  daTotal: number;
  totalKms: number;
  fareTotal: number;
  contingTotal: number;
  taGrand: number; // TA Journal total (DA + Fare)
  grand: number; // all-inclusive total
}

export function compute(s: CalcState): Computed {
  const band = bandOf(s.profile.level);
  const daRate = s.daRateOverride ?? band.da;
  const daTotal = round2(s.daEntries.reduce((a, e) => a + e.amount, 0));
  const allRows = s.groups.flatMap((g) => g.rows);
  const totalKms = allRows.reduce((a, r) => a + Math.max(0, r.kms), 0);
  const fareTotal = round2(allRows.filter((r) => !r.onPass).reduce((a, r) => a + Math.max(0, r.fare), 0));
  const contingTotal = round2((s.contingency ?? []).reduce((a, i) => a + Math.max(0, i.amount), 0));
  const taGrand = round2(daTotal + fareTotal);
  const grand = round2(daTotal + fareTotal + contingTotal);
  return { daRate, daTotal, totalKms, fareTotal, contingTotal, taGrand, grand };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function inr(n: number): string {
  const hasPaise = Math.abs(n % 1) > 0.001;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function inrJ(n: number): string {
  if (n <= 0) return "";
  const hasPaise = Math.abs(n % 1) > 0.001;
  return hasPaise ? n.toFixed(2) + "/-" : Math.round(n) + "/-";
}

export function fmtMonthYear(ym: string): string {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function fmtDateShort(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function two(n: number): string {
  return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function three(n: number): string {
  return (Math.floor(n / 100) ? ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " : "") : "") + two(n % 100);
}

export function amountInWords(n: number): string {
  let rupees = Math.floor(Math.round(n * 100) / 100);
  const paise = Math.round((Math.round(n * 100) / 100 - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Nil";
  const parts: string[] = [];
  const crore = Math.floor(rupees / 1e7);
  rupees %= 1e7;
  const lakh = Math.floor(rupees / 1e5);
  rupees %= 1e5;
  const thou = Math.floor(rupees / 1000);
  rupees %= 1000;
  if (crore) parts.push(three(crore) + " Crore");
  if (lakh) parts.push(two(lakh) + " Lakh");
  if (thou) parts.push(two(thou) + " Thousand");
  if (rupees) parts.push(three(rupees));
  return "Total Rupees " + parts.join(" ") + (paise ? " And " + two(paise) + " Paisa" : "") + " Only";
}
