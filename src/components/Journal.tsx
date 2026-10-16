import React from "react";
import {
  CalcState,
  Computed,
  DaEntry,
  amountInWords,
  fmtDateShort,
  fmtMonthYear,
  inrJ,
  computeDaEntries,
} from "../lib/calc";
import { bandOf } from "../data/rules";
import { cn } from "../utils/cn";

/* TABLE CELL PRIMITIVES */
function Td({
  children,
  className,
  colSpan,
  rowSpan,
  center,
  bold,
  mid,
  italic,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
  center?: boolean;
  bold?: boolean;
  mid?: boolean;
  italic?: boolean;
}) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        "border border-[#666] px-1.5 py-[3px] text-[10.5px] leading-snug",
        center && "text-center",
        bold && "font-bold",
        italic && "italic",
        mid ? "align-middle" : "align-top",
        className,
      )}
    >
      {children}
    </td>
  );
}

function Th({
  children,
  className,
  colSpan,
  rowSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        "border border-[#666] px-1.5 py-[5px] text-[11px] font-bold leading-snug text-center bg-[#efefef]",
        className,
      )}
    >
      {children}
    </th>
  );
}

function pctClass(pct: number) {
  if (pct === 100) return "text-[#111]";
  if (pct === 70) return "text-[#884400]";
  return "text-[#555]";
}

function amtClass(pct: number) {
  if (pct === 70) return "text-[#884400]";
  if (pct === 30) return "text-[#555]";
  return "";
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ta = new Date(a + "T00:00:00Z").getTime();
  const tb = new Date(b + "T00:00:00Z").getTime();
  return Math.round((tb - ta) / 86400000);
}

type RowKind = "journey" | "halt";
interface FlatRow {
  kind: RowKind;
  id: string;
  date: string;
  haltDays?: number;
  trainNo: string;
  depTime: string;
  arrTime: string;
  from: string;
  to: string;
  kms: number;
  kmsRowSpan: number;
  dateRowSpan: number;
  daEntry: DaEntry | null;
  daRowSpan: number;
  amtRowSpan: number;
}

function hasBoth(from: string, to: string) {
  const bad = new Set(["", " ", "-", "–"]);
  return !bad.has(from) && !bad.has(to);
}

function buildFlatRows(
  grp: CalcState["groups"][number],
  daMap: Map<string, DaEntry>,
): FlatRow[] {
  const rows = grp.rows;
  const result: FlatRow[] = [];

  interface JRow {
    id: string;
    date: string;
    trainNo: string;
    depTime: string;
    arrTime: string;
    from: string;
    to: string;
    kms: number;
    kmsRowSpan: number;
  }

  const jrows: JRow[] = rows.map((r, i) => {
    const next = rows[i + 1];
    const prev = rows[i - 1];
    const complete = hasBoth(r.from, r.to);
    const spansNext = !complete && next && next.trainNo === r.trainNo;
    const spannedByPrev = !complete && prev && prev.trainNo === r.trainNo;
    let kms = r.kms;
    let kmsRowSpan: number;
    if (spansNext) {
      kmsRowSpan = 2;
      kms = r.kms > 0 ? r.kms : (next.kms > 0 ? next.kms : 0);
    } else if (spannedByPrev) {
      kmsRowSpan = 0;
    } else {
      kmsRowSpan = 1;
    }
    return {
      id: r.id,
      date: r.date,
      trainNo: r.trainNo,
      depTime: r.depTime,
      arrTime: r.arrTime,
      from: r.from,
      to: r.to,
      kms,
      kmsRowSpan,
    };
  });

  const seenDates: string[] = [];
  const seenSet = new Set<string>();
  for (const r of jrows) {
    if (r.date && !seenSet.has(r.date)) {
      seenDates.push(r.date);
      seenSet.add(r.date);
    }
  }

  const dateCount = new Map<string, number>();
  for (const r of jrows) dateCount.set(r.date, (dateCount.get(r.date) ?? 0) + 1);

  const dateEmitted = new Set<string>();
  const daEmitted = new Set<string>();

  for (let di = 0; di < seenDates.length; di++) {
    const date = seenDates[di];
    const nextDate = seenDates[di + 1];
    const dayJrows = jrows.filter((r) => r.date === date);
    const spanForDate = dateCount.get(date) ?? 1;

    for (let ri = 0; ri < dayJrows.length; ri++) {
      const r = dayJrows[ri];
      const isFirstOfDate = !dateEmitted.has(date);
      if (isFirstOfDate) dateEmitted.add(date);
      let daEntry: DaEntry | null = null;
      let daRowSpan = 1;
      let amtRowSpan = 1;
      if (isFirstOfDate) {
        daEntry = daMap.get(date) ?? null;
        if (daEntry) daEmitted.add(date);
        daRowSpan = spanForDate;
        amtRowSpan = spanForDate;
      }
      result.push({
        kind: "journey",
        id: r.id,
        date,
        trainNo: r.trainNo,
        depTime: r.depTime,
        arrTime: r.arrTime,
        from: r.from,
        to: r.to,
        kms: r.kms,
        kmsRowSpan: r.kmsRowSpan,
        dateRowSpan: isFirstOfDate ? spanForDate : 0,
        daEntry,
        daRowSpan,
        amtRowSpan,
      });
    }

    if (nextDate) {
      const gap = daysBetween(date, nextDate) - 1;
      if (gap > 0) {
        for (let g = 0; g < gap; g++) {
          const haltDate = addDays(date, g + 1);
          const daEntry = daMap.get(haltDate) ?? null;
          if (daEntry && !daEmitted.has(haltDate)) daEmitted.add(haltDate);
          result.push({
            kind: "halt",
            id: `halt-${haltDate}`,
            date: haltDate,
            haltDays: 1,
            trainNo: "",
            depTime: "",
            arrTime: "",
            from: "",
            to: "",
            kms: 0,
            kmsRowSpan: 1,
            dateRowSpan: 1,
            daEntry,
            daRowSpan: 1,
            amtRowSpan: 1,
          });
        }
      }
    }
  }
  return result;
}

export function Journal({ s, c, forPrint = false }: { s: CalcState; c: Computed; forPrint?: boolean }) {
  const band = bandOf(s.profile.level);
  const daRate = s.daRateOverride ?? band.da;

  return (
    <div
      id={forPrint ? "print-bill" : "journal-preview"}
      className={cn(
        "bg-white text-[#111] leading-normal",
        !forPrint && "rounded-2xl shadow-paper overflow-hidden",
        "w-full",
      )}
      style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11.5px" }}
    >
      {/* HEADER */}
      <div className="text-center pt-5 pb-3 px-5 border-b border-[#aaa]">
        <div className="text-[21px] font-bold">{s.railway || "South Eastern Railway"}</div>
        <div className="text-[13.5px] font-semibold underline mt-0.5 tracking-wide">
          TRAVELLING ALLOWANCE JOURNAL
        </div>
        <div className="text-[11px] mt-2 leading-relaxed max-w-2xl mx-auto">
          Dist Headquarters at: <b>{s.distHQ || s.profile.hq || " "}</b>.{" "}
          Duties performed by <b>{s.profile.name || " "}</b>{" "}
          for which allowance for the month of <b>{fmtMonthYear(s.claimMonth)}</b> is claimed.
        </div>
        <div className="text-[11px] mt-0.5 leading-relaxed">
          Designation: <b>{s.profile.desig || " "}</b>. Pay: <b>{s.profile.pay || " "}/-</b> Scale of pay{" "}
          <b>{s.profile.gp || " "}</b> Date of Appointment: <b>{s.profile.doa ? fmtDateShort(s.profile.doa) : " "}</b>{" "}
          Rule by which governed: <b>{s.profile.rule || "HOER"}</b>
        </div>
      </div>

      {/* TABLE */}
      <div className="px-3 py-2.5 overflow-x-auto">
        <table className="w-full border-collapse border border-[#666] text-[10.5px]">
          <thead>
            <tr>
              <Th rowSpan={2} className="w-[72px]">
                Date of
                <br />
                Journey
              </Th>
              <Th rowSpan={2} className="w-[52px]">
                Train
                <br />
                No.
              </Th>
              <Th colSpan={2}>Time</Th>
              <Th rowSpan={2} className="w-[38px]">
                From
              </Th>
              <Th rowSpan={2} className="w-[38px]">
                To
              </Th>
              <Th rowSpan={2} className="w-[38px]">
                KMs
              </Th>
              <Th rowSpan={2} className="w-[46px]">
                Days /
                <br />
                Nights
              </Th>
              <Th rowSpan={2} className="min-w-[160px]">
                Object of journey
              </Th>
              <Th rowSpan={2} className="w-[46px]">
                Rate
              </Th>
              <Th rowSpan={2} className="w-[60px]">
                Amount
                <br />
                (in Rs.)
              </Th>
            </tr>
            <tr>
              <Th className="w-[44px]">
                Dep.
                <br />
                Time
              </Th>
              <Th className="w-[44px]">
                Arr.
                <br />
                Time
              </Th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const effectiveDaEntries = (s.daEntries && s.daEntries.length > 0)
                ? s.daEntries
                : computeDaEntries(s.groups ?? [], daRate, []);
              return s.groups.map((grp, gi) => {
                const bg = gi % 2 === 0 ? "" : "bg-[#fafaf7]";
                const rowDates = grp.rows.map((r) => r.date).filter(Boolean).sort();
                if (rowDates.length === 0) return null;
                const firstDate = rowDates[0];
                const lastDate = rowDates[rowDates.length - 1];
                const daMap = new Map<string, DaEntry>();
                effectiveDaEntries
                  .filter((e) => e.date >= firstDate && e.date <= lastDate)
                  .forEach((e) => {
                    if (!daMap.has(e.date)) daMap.set(e.date, e);
                  });
                rowDates.forEach((d) => {
                  if (!daMap.has(d)) {
                    daMap.set(d, { id: d, date: d, pct: 100, amount: daRate, auto: true });
                  }
                });
                const flat = buildFlatRows(grp, daMap);
                const totalRows = flat.length;

              return (
                <React.Fragment key={grp.id}>
                  {flat.map((rr, ri) => {
                    if (rr.kind === "halt") {
                      return (
                        <tr key={rr.id} className={bg}>
                          <Td center mid>
                            {fmtDateShort(rr.date)}
                          </Td>
                          <Td colSpan={6} center mid italic className="text-[10px] text-[#333]">
                            Halt for Duty
                          </Td>
                          <Td center mid>
                            {rr.daEntry ? (
                              <span className={cn("font-bold", pctClass(rr.daEntry.pct))}>{rr.daEntry.pct}%</span>
                            ) : (
                              <span className="font-bold text-[#111]">100%</span>
                            )}
                          </Td>
                          <Td center bold mid className={amtClass(rr.daEntry?.pct ?? 100)}>
                            {rr.daEntry ? inrJ(rr.daEntry.amount) : inrJ(daRate)}
                          </Td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={rr.id} className={bg}>
                        {rr.dateRowSpan > 0 && (
                          <Td center rowSpan={rr.dateRowSpan} mid>
                            {rr.date ? fmtDateShort(rr.date) : ""}
                          </Td>
                        )}
                        <Td center>{rr.trainNo}</Td>
                        <Td center>{rr.depTime || (rr.arrTime ? "-" : "")}</Td>
                        <Td center>{rr.arrTime || (rr.depTime ? "-" : "")}</Td>
                        <Td center bold>
                          {rr.from}
                        </Td>
                        <Td center bold>
                          {rr.to}
                        </Td>
                        {rr.kmsRowSpan > 0 && (
                          <Td center rowSpan={rr.kmsRowSpan} mid>
                            {rr.kms > 0 ? rr.kms : ""}
                          </Td>
                        )}
                        {rr.dateRowSpan > 0 && (
                          <Td center rowSpan={rr.daRowSpan} mid>
                            {rr.daEntry ? (
                              <span className={cn("font-bold", pctClass(rr.daEntry.pct))}>{rr.daEntry.pct}%</span>
                            ) : (
                              ""
                            )}
                          </Td>
                        )}
                        {ri === 0 && (
                          <Td rowSpan={Math.max(totalRows, 1)} className="text-[10.5px] leading-relaxed" mid>
                            {grp.object}
                          </Td>
                        )}
                        {ri === 0 && (
                          <Td rowSpan={Math.max(totalRows, 1)} center bold mid>
                            {inrJ(daRate)}
                          </Td>
                        )}
                        {rr.dateRowSpan > 0 && (
                          <Td center bold mid rowSpan={rr.amtRowSpan} className={amtClass(rr.daEntry?.pct ?? 100)}>
                            {rr.daEntry ? inrJ(rr.daEntry.amount) : ""}
                          </Td>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            });
            })()}
            {/* Total row */}
            <tr className="bg-[#f0f0f0]">
              <td colSpan={10} className="border border-[#666] px-3 py-[5px] text-center text-[12px] font-bold">
                Total
              </td>
              <td className="border border-[#666] px-2 py-[5px] text-center text-[13px] font-bold">
                {inrJ(c.taGrand)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="px-5 pb-4 pt-1 space-y-3">
        <div className="flex items-start justify-between gap-4 pt-1">
          <div className="text-[11px]">Dt : {s.billDate ? fmtDateShort(s.billDate) : " "}</div>
          <div className="text-[11px] font-bold text-center flex-1">({amountInWords(c.taGrand)})</div>
        </div>
        <p className="text-[11px] leading-relaxed border-t border-[#ccc] pt-3">
          Certified that no TA/DA or any other remuneration has been claimed from any other source in
          respect of journeys performed on <b>Duty Pass</b> and <b>also for the halts</b> for which
          TA/DA has been claimed in this journal.
        </p>
        <div className="grid grid-cols-3 gap-6 pt-6 pb-3">
          {["Controlling Officer", "Head of Office", "Signature of Officer claiming T.A"].map((t) => (
            <div key={t} className="text-center">
              <div className="h-8 border-b border-[#555] mb-1.5" />
              <div className="text-[10.5px]">{t}</div>
            </div>
          ))}
        </div>
        {s.claimNo && (
          <div className="text-[9.5px] text-[#555] border-t border-[#ddd] pt-2 pb-1">
            Claim No.: {s.claimNo}
          </div>
        )}
        <div className="text-[9px] text-[#888] pb-2 italic print:hidden">
          Prepared by Biswajyoti Roy Sarkar
        </div>
      </div>
    </div>
  );
}
