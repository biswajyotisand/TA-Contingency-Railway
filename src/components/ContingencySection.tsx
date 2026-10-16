import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Plus, Trash2, Navigation } from "lucide-react";
import { CalcState, ContingencyRow, inr, calcContingencyRowAmount } from "../lib/calc";
import { IconBtn, SectionHead } from "./primitives";
import { GoogleMapDistanceModal } from "./GoogleMapDistanceModal";

interface Props {
  s: CalcState;
  patch: (p: Partial<CalcState>) => void;
}

const uid = () => crypto.randomUUID();

function RowCard({
  item,
  onSet,
  onDel,
  onOpenMap,
}: {
  item: ContingencyRow;
  onSet: (p: Partial<ContingencyRow>) => void;
  onDel: () => void;
  onOpenMap: () => void;
}) {
  const rowAmount = calcContingencyRowAmount(item);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="rounded-xl border border-line bg-ink/50 px-3 py-3 space-y-2.5">
        {/* Date */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-mute w-10 shrink-0">Date</span>
          <input
            type="date"
            className="field py-1 flex-1"
            value={item.date}
            onChange={(e) => onSet({ date: e.target.value })}
          />
          <IconBtn danger onClick={onDel} title="Remove">
            <Trash2 className="size-3.5" />
          </IconBtn>
        </div>

        {/* From - To + Return */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-mute w-10 shrink-0">From</span>
          <input
            className="field py-1 flex-1 min-w-0"
            placeholder="KGPW"
            value={item.from}
            onChange={(e) => onSet({ from: e.target.value })}
          />
          <ArrowRight className="size-3.5 text-mute shrink-0" />
          <input
            className="field py-1 flex-1 min-w-0"
            placeholder="KGP Station"
            value={item.to}
            onChange={(e) => onSet({ to: e.target.value })}
          />
          <div className="flex items-center gap-1.5 shrink-0 pl-1.5 border-l border-line/60">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-mute">Return?</span>
            <select
              className="field py-1 px-2 w-16 text-center font-bold cursor-pointer"
              value={item.isReturn ? "yes" : "no"}
              onChange={(e) => {
                const nextReturn = e.target.value === "yes";
                onSet({
                  isReturn: nextReturn,
                  amount: calcContingencyRowAmount({ ...item, isReturn: nextReturn }),
                });
              }}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        {/* KMs + Google Map trigger + Rate + Row Amount */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-mute w-10 shrink-0">KMs</span>
          <input
            type="number"
            min={0}
            step={0.5}
            className="field py-1 w-20 text-right font-bold text-cream"
            placeholder="0"
            value={item.kms || ""}
            onChange={(e) => {
              const nextKm = Math.max(0, parseFloat(e.target.value) || 0);
              onSet({
                kms: nextKm,
                amount: calcContingencyRowAmount({ ...item, kms: nextKm }),
              });
            }}
          />

          {/* Google Map KM Button */}
          <button
            type="button"
            onClick={onOpenMap}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber/15 border border-amber/30 text-amber hover:bg-amber/25 font-mono text-[9.5px] font-bold uppercase transition-all cursor-pointer shadow-[0_0_10px_-2px_rgba(242,169,59,0.2)] active:scale-95"
            title="Calculate distance using Google Maps"
          >
            <Navigation className="size-3" />
            <span>Map KM</span>
          </button>

          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-mute shrink-0 ml-1">@ ₹/km</span>
          <input
            type="number"
            min={0}
            step={0.5}
            className="field py-1 w-20 text-right font-mono"
            placeholder="Rate"
            value={item.rate || ""}
            onChange={(e) => {
              const nextRate = Math.max(0, parseFloat(e.target.value) || 0);
              onSet({
                rate: nextRate,
                amount: calcContingencyRowAmount({ ...item, rate: nextRate }),
              });
            }}
          />

          {/* Live Row Calculated Amount */}
          <div className="flex items-center gap-1.5 ml-auto font-mono text-[11px] bg-coal/80 px-2.5 py-1 rounded-lg border border-line">
            <span className="text-mute text-[9px] uppercase tracking-wider">Amount:</span>
            <span className="font-bold text-amber">{inr(rowAmount)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ContingencySection({ s, patch }: Props) {
  const items = s.contingency ?? [];
  const total = items.reduce((a, x) => a + (Number(x.amount) || calcContingencyRowAmount(x)), 0);
  const totalKms = items.reduce(
    (a, x) => a + (Number(x.kms) || 0) * (x.isReturn ? 2 : 1),
    0
  );

  // Modal state
  const [mapTargetRow, setMapTargetRow] = useState<ContingencyRow | null>(null);

  const add = () => {
    const last = items[items.length - 1];
    const nextDate = last?.date || (s.claimMonth ? s.claimMonth + "-01" : "");
    const base = {
      id: uid(),
      date: nextDate,
      from: s.distHQ || "KGPW",
      to: "KGP Station",
      isReturn: false,
      kms: 0,
      rate: 15,
      amount: 0,
    };
    patch({
      contingency: [
        ...items,
        { ...base, amount: calcContingencyRowAmount(base) },
      ],
    });
  };

  const set = (id: string, p: Partial<ContingencyRow>) =>
    patch({
      contingency: items.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, ...p };
        updated.amount = calcContingencyRowAmount(updated);
        return updated;
      }),
    });

  const del = (id: string) =>
    patch({ contingency: items.filter((it) => it.id !== id) });

  return (
    <section className="rounded-2xl border border-line bg-coal p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionHead no="02" title="Contingency Entries" hint="from - to - kms - rate • Live auto-calculated" lamp="#F2A93B" />
        <button
          type="button"
          onClick={add}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-ink transition-all hover:bg-cream active:scale-95 cursor-pointer"
        >
          <Plus className="size-3" strokeWidth={2.8} /> Row
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <RowCard
              key={item.id}
              item={item}
              onSet={(p) => set(item.id, p)}
              onDel={() => del(item.id)}
              onOpenMap={() => setMapTargetRow(item)}
            />
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <p className="text-center font-mono text-[10.5px] text-mute border border-dashed border-line rounded-xl py-5">
            No entries yet - click <b className="text-amber">+ Row</b> to add
          </p>
        )}
      </div>

      {/* Live Auto-Calculated Contingency Total */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 font-mono bg-ink/30 px-3 py-2 rounded-xl">
        <div className="text-[10px] uppercase tracking-[0.16em] text-mute">
          Total Conveyance ({totalKms} KMs • {items.length} Entr{items.length === 1 ? 'y' : 'ies'})
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-mute">Total Sum:</span>
          <span className="text-[16px] font-bold text-amber">{inr(total)}</span>
        </div>
      </div>

      {/* Google Map Distance Modal */}
      {mapTargetRow && (
        <GoogleMapDistanceModal
          isOpen={true}
          onClose={() => setMapTargetRow(null)}
          initialFrom={mapTargetRow.from || s.distHQ || "KGPW"}
          initialTo={mapTargetRow.to || "KGP Station"}
          contextTitle={`Contingency: ${mapTargetRow.from || 'Origin'} → ${mapTargetRow.to || 'Destination'}`}
          onApplyKm={(km) => {
            set(mapTargetRow.id, { kms: km });
            setMapTargetRow(null);
          }}
        />
      )}
    </section>
  );
}
