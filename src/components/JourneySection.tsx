import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoveRight, Plus, Ticket, Trash2, Navigation, MapPin } from "lucide-react";
import { CalcState, JourneyGroup, JourneyRow } from "../lib/calc";
import { IconBtn, Label, MoneyInput, SectionHead } from "./primitives";
import { GoogleMapDistanceModal } from "./GoogleMapDistanceModal";
import { cn } from "../utils/cn";

interface Props {
  s: CalcState;
  patch: (p: Partial<CalcState>) => void;
  patchGroup: (gid: string, p: Partial<JourneyGroup>) => void;
}

const uid = () => crypto.randomUUID();

function RowEditor({
  row,
  onChange,
  onDel,
  onOpenMap,
}: {
  row: JourneyRow;
  onChange: (p: Partial<JourneyRow>) => void;
  onDel: () => void;
  onOpenMap: () => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto_auto_auto_auto] gap-1.5 items-center rounded-lg border border-line/70 bg-ink/40 px-2 py-1.5 min-w-[780px]">
      {/* Date */}
      <input
        type="date"
        className="field w-32 py-1"
        value={row.date}
        onChange={(e) => onChange({ date: e.target.value })}
      />
      {/* Train no */}
      <input
        className="field py-1 uppercase text-center font-mono"
        placeholder="Train No."
        value={row.trainNo}
        onChange={(e) => onChange({ trainNo: e.target.value.toUpperCase() })}
      />
      {/* Dep */}
      <input
        type="time"
        className="field py-1 text-center font-mono"
        placeholder="Dep"
        value={row.depTime}
        onChange={(e) => onChange({ depTime: e.target.value })}
      />
      {/* Arr */}
      <input
        type="time"
        className="field py-1 text-center font-mono"
        placeholder="Arr"
        value={row.arrTime}
        onChange={(e) => onChange({ arrTime: e.target.value })}
      />
      {/* From */}
      <input
        className="field py-1 uppercase text-center font-bold tracking-wider"
        placeholder="From"
        value={row.from}
        onChange={(e) => onChange({ from: e.target.value.toUpperCase() })}
      />
      {/* To */}
      <input
        className="field py-1 uppercase text-center font-bold tracking-wider"
        placeholder="To"
        value={row.to}
        onChange={(e) => onChange({ to: e.target.value.toUpperCase() })}
      />
      {/* KMs + Google Map trigger */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          className="field w-16 py-1 text-right font-mono font-bold text-cream"
          placeholder="KMs"
          value={row.kms || ""}
          onChange={(e) => onChange({ kms: Math.max(0, parseFloat(e.target.value) || 0) })}
        />
        <button
          type="button"
          onClick={onOpenMap}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber/15 border border-amber/30 text-amber hover:bg-amber/25 font-mono text-[9px] font-bold uppercase transition-all cursor-pointer whitespace-nowrap shadow-[0_0_8px_-2px_rgba(242,169,59,0.2)] active:scale-95"
          title="Find KM between From and To using Google Maps"
        >
          <Navigation className="size-3" />
          <span>Map KM</span>
        </button>
      </div>

      {/* Pass toggle */}
      <button
        type="button"
        onClick={() => onChange(row.onPass ? { onPass: false } : { onPass: true, fare: 0 })}
        className={cn(
          "h-7 px-2 rounded-md font-mono text-[9px] font-bold border whitespace-nowrap transition-all cursor-pointer",
          row.onPass ? "border-leaf/40 bg-leaf/10 text-leaf" : "border-amber/40 bg-amber/10 text-amber",
        )}
      >
        {row.onPass ? (
          <>
            <Ticket className="size-3 inline mr-0.5" />PASS
          </>
        ) : (
          "FARE"
        )}
      </button>
      {!row.onPass && <MoneyInput className="w-24" value={row.fare} onChange={(n) => onChange({ fare: n })} />}
      <IconBtn danger onClick={onDel} title="Remove row">
        <Trash2 className="size-3" />
      </IconBtn>
    </div>
  );
}

export function JourneySection({ s, patch, patchGroup }: Props) {
  // Modal state for Google Maps distance lookup
  const [mapTargetRow, setMapTargetRow] = useState<{ gid: string; row: JourneyRow } | null>(null);

  const addGroup = () => patch({ groups: [...s.groups, { id: uid(), object: "", rows: [] }] });
  const delGroup = (gid: string) => patch({ groups: s.groups.filter((g) => g.id !== gid) });
  const patchRow = (gid: string, rid: string, p: Partial<JourneyRow>) =>
    patchGroup(gid, {
      rows: s.groups.find((g) => g.id === gid)!.rows.map((r) => (r.id === rid ? { ...r, ...p } : r)),
    });
  const addRow = (gid: string) =>
    patchGroup(gid, {
      rows: [
        ...(s.groups.find((g) => g.id === gid)?.rows ?? []),
        { id: uid(), date: "", trainNo: "", depTime: "", arrTime: "", from: "", to: "", kms: 0, onPass: true, fare: 0 },
      ],
    });
  const delRow = (gid: string, rid: string) =>
    patchGroup(gid, { rows: s.groups.find((g) => g.id === gid)!.rows.filter((r) => r.id !== rid) });

  return (
    <section className="rounded-2xl border border-line bg-coal p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionHead no="02" title="Journeys" hint="one group = one object of journey • With Google Map KM finder" lamp="#F2A93B" />
        <button
          type="button"
          onClick={addGroup}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-ink transition-all hover:bg-cream active:scale-95 cursor-pointer"
        >
          <Plus className="size-3" strokeWidth={2.8} /> Group
        </button>
      </div>

      <AnimatePresence initial={false}>
        {s.groups.map((g, gi) => (
          <motion.div
            key={g.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden rounded-xl border border-line bg-coal-2 p-3 space-y-3"
          >
            {/* Group header */}
            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid place-items-center size-5 rounded-md bg-amber/20 font-mono text-[9px] font-bold text-amber shrink-0">
                {gi + 1}
              </span>
              <div className="flex-1 min-w-0">
                <Label>Object of Journey</Label>
                <textarea
                  className="field resize-none text-[12px] leading-relaxed"
                  rows={2}
                  placeholder="Purpose / object of all journeys in this group..."
                  value={g.object}
                  onChange={(e) => patchGroup(g.id, { object: e.target.value })}
                />
              </div>
              {s.groups.length > 1 && (
                <IconBtn danger onClick={() => delGroup(g.id)} title="Remove group">
                  <Trash2 className="size-3.5" />
                </IconBtn>
              )}
            </div>

            {/* Column headers */}
            <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-mute grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto_auto_auto] gap-1.5 px-1 min-w-[780px]">
              <span className="w-32">Date</span>
              <span className="text-center">Train No.</span>
              <span className="text-center">Dep.</span>
              <span className="text-center">Arr.</span>
              <span className="text-center">From</span>
              <span className="text-center">To</span>
              <span className="text-center w-36">KMs & Google Map</span>
              <span className="text-center">Pass/Fare</span>
              <span className="w-6"></span>
            </div>

            {/* Journey rows */}
            <div className="space-y-1.5 overflow-x-auto">
              <AnimatePresence initial={false}>
                {g.rows.map((row) => (
                  <motion.div
                    key={row.id}
                    layout
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <RowEditor
                      row={row}
                      onChange={(p) => patchRow(g.id, row.id, p)}
                      onDel={() => delRow(g.id, row.id)}
                      onOpenMap={() => setMapTargetRow({ gid: g.id, row })}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => addRow(g.id)}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-amber hover:text-cream transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" /> Add row
            </button>

            {/* group KMs total */}
            <div className="flex items-center justify-end gap-2 border-t border-line/70 pt-2 font-mono text-[10px] text-mute">
              <MoveRight className="size-3.5" />
              Total KMs: <span className="text-cream font-bold">{g.rows.reduce((a, r) => a + r.kms, 0)}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {s.groups.length === 0 && (
        <p className="text-center font-mono text-[10.5px] text-mute border border-dashed border-line rounded-xl py-4">
          Add a journey group to get started
        </p>
      )}

      {/* Google Map Distance Modal */}
      {mapTargetRow && (
        <GoogleMapDistanceModal
          isOpen={true}
          onClose={() => setMapTargetRow(null)}
          initialFrom={mapTargetRow.row.from || ""}
          initialTo={mapTargetRow.row.to || ""}
          initialMode="TRANSIT"
          contextTitle={`Journey: ${mapTargetRow.row.from || 'Origin'} → ${mapTargetRow.row.to || 'Destination'}`}
          onApplyKm={(km) => {
            patchRow(mapTargetRow.gid, mapTargetRow.row.id, { kms: km });
            setMapTargetRow(null);
          }}
        />
      )}
    </section>
  );
}
