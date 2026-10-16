import React from "react";
import { CalcState, amountInWords, fmtDateShort, fmtMonthYear, particularsText } from "../lib/calc";
import { cn } from "../utils/cn";

/* table primitives */
function Td({
  children,
  className,
  colSpan,
  rowSpan,
  center,
  bold,
  right,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
  center?: boolean;
  bold?: boolean;
  right?: boolean;
}) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        "border border-[#666] px-2 py-[3px] text-[11px] leading-snug align-middle",
        center && "text-center",
        bold && "font-bold",
        right && "text-right",
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
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      className={cn(
        "border border-[#666] px-2 py-[4px] text-[11px] font-bold leading-snug text-center bg-[#efefef]",
        className,
      )}
    >
      {children}
    </th>
  );
}

function fmtAmt(n: number): string {
  if (n <= 0) return "";
  return n.toFixed(2);
}

export function ContingentBill({ s, forPrint = false }: { s: CalcState; forPrint?: boolean }) {
  const items = s.contingency ?? [];
  const total = items.reduce((a, x) => a + x.amount, 0);

  // Group by date for merged date cells
  const dateCount = new Map<string, number>();
  items.forEach((it) => dateCount.set(it.date, (dateCount.get(it.date) ?? 0) + 1));
  const dateEmitted = new Set<string>();

  return (
    <div
      id={forPrint ? "print-bill" : "contingent-bill-preview"}
      className={cn(
        "bg-white text-[#111] leading-normal",
        !forPrint && "rounded-2xl shadow-paper overflow-hidden",
        "w-full",
      )}
      style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "12px" }}
    >
      {/* HEADER */}
      <div className="text-center pt-6 pb-3 px-6">
        <div className="text-[18px] italic font-bold">{s.railway || "South Eastern Railway"}</div>
        <div className="text-[14px] font-bold underline mt-1 tracking-wide">CONTINGENT BILL</div>
      </div>

      {/* META FIELDS */}
      <div className="px-6 pb-3 text-[11.5px] leading-relaxed space-y-0.5">
        <div className="flex flex-wrap gap-x-8 gap-y-0.5">
          <span>Name: <b>{s.profile.name || " "}</b></span>
          <span>Designation: <b>{s.profile.desig || " "}</b></span>
          <span>Department: <b>{s.profile.dept || " "}</b></span>
        </div>
        <div className="flex justify-between">
          <span>Head Quarter: <b>{s.distHQ || s.profile.hq || " "}{s.distHQ ? " Workshop" : ""}</b></span>
          <span>For the Month of: <b>{fmtMonthYear(s.claimMonth)}</b></span>
        </div>
      </div>

      {/* TABLE */}
      <div className="px-6 pb-2 overflow-x-auto">
        <table className="w-full border-collapse border border-[#666] text-[11px]">
          <thead>
            <tr>
              <Th className="w-[80px]">Date</Th>
              <Th>Particulars</Th>
              <Th className="w-[80px]">Amount Rs.</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isFirstOfDate = !dateEmitted.has(item.date);
              const span = dateCount.get(item.date) ?? 1;
              if (isFirstOfDate && item.date) dateEmitted.add(item.date);
              return (
                <tr key={item.id}>
                  {isFirstOfDate && (
                    <Td center rowSpan={span}>{item.date ? fmtDateShort(item.date) : ""}</Td>
                  )}
                  <Td>{particularsText(item)}</Td>
                  <Td right>{fmtAmt(item.amount)}</Td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><Td colSpan={3} center className="py-4 text-[#999] italic">No entries</Td></tr>
            )}
            {/* Total row */}
            <tr>
              <Td colSpan={2} right bold>Total</Td>
              <Td right bold>{fmtAmt(total)}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* REFERENCE NOTE */}
      <div className="px-6 py-2">
        <div className="border border-[#666] px-3 py-2 text-[10px] italic leading-relaxed text-[#333]">
          Contingent Bill is claimed as per the revised rates in terms of S.E.Railway's Estt. Sr. 51/2019 &amp; circulated vide
          CPO(R)/GRC's letter No. SER/P-HQ/Ruling/O/830 Dt. 06.03.2019
        </div>
      </div>

      {/* AMOUNT IN WORDS */}
      <div className="px-6 py-1 text-[11.5px]">
        Amount in Words: <span className="ml-4 font-bold">{amountInWords(total)}</span>
      </div>

      {/* CERTIFICATION */}
      <div className="px-6 pt-2 pb-1 text-[11px] leading-relaxed">
        Certified that the above expenses have actually been paid by me in discharge of railway duty and the amount claimed
        has been actually spent and that the expenditure was necessary and unavoidable.
      </div>

      {/* SIGNATURE BLOCK */}
      <div className="px-6 pt-8 pb-2">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-[11.5px]">
              Date: <span className="ml-4">{s.billDate ? fmtDateShort(s.billDate) : " "}</span>
            </div>
          </div>
          <div>
            <div className="text-[11.5px]">Signature:</div>
            <div className="mt-3 text-[11.5px]">Designation: {s.profile.desig || " "}</div>
          </div>
        </div>
      </div>

      {/* COUNTERSIGNED / CERTIFIED */}
      <div className="px-6 pt-6 pb-6">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="font-bold underline text-[11.5px]">Countersigned by</div>
            <div className="h-10" />
          </div>
          <div>
            <div className="font-bold text-[11.5px]">Certified by</div>
            <div className="h-10" />
          </div>
        </div>
      </div>

      {/* Screen-only note */}
      <div className="text-[9px] text-[#888] pb-3 px-6 italic print:hidden">
        Prepared by Biswajyoti Roy Sarkar
      </div>
    </div>
  );
}
