import { BANDS, LEVEL_GP, LevelKey } from "../data/rules";
import { CalcState } from "../lib/calc";
import { Label, SectionHead } from "./primitives";

interface Props {
  s: CalcState;
  patch: (p: Partial<CalcState>) => void;
  patchProfile: (p: Partial<CalcState["profile"]>) => void;
}

const RAILWAYS = [
  "South Eastern Railway",
  "Central Railway",
  "Eastern Railway",
  "East Central Railway",
  "East Coast Railway",
  "Northern Railway",
  "North Central Railway",
  "North Eastern Railway",
  "Northeast Frontier Railway",
  "North Western Railway",
  "Southern Railway",
  "South Central Railway",
  "South Western Railway",
  "Western Railway",
  "West Central Railway",
];

export function EmployeeSection({ s, patch, patchProfile }: Props) {
  return (
    <section className="rounded-2xl border border-line bg-coal p-4 md:p-5 space-y-4">
      <SectionHead no="01" title="Bill header" hint="railway - employee - month" lamp="#35B26B" />

      {/* Railway & HQ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Label>Railway</Label>
          <select className="field" value={s.railway} onChange={(e) => patch({ railway: e.target.value })}>
            {RAILWAYS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Dist. HQ</Label>
          <input
            className="field uppercase"
            placeholder="KGPW"
            value={s.distHQ}
            onChange={(e) => patch({ distHQ: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      {/* Month & bill date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Claim month</Label>
          <input
            type="month"
            className="field"
            value={s.claimMonth}
            onChange={(e) => patch({ claimMonth: e.target.value })}
          />
        </div>
        <div>
          <Label>Date of bill</Label>
          <input
            type="date"
            className="field"
            value={s.billDate}
            onChange={(e) => patch({ billDate: e.target.value })}
          />
        </div>
      </div>

      {/* Name, Designation, Department */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Employee name</Label>
          <input
            className="field"
            placeholder="Sri / Smt. Full Name"
            value={s.profile.name}
            onChange={(e) => patchProfile({ name: e.target.value })}
          />
        </div>
        <div>
          <Label>Designation</Label>
          <input
            className="field"
            placeholder="Sr. Clerk-Cum-Typist"
            value={s.profile.desig}
            onChange={(e) => patchProfile({ desig: e.target.value })}
          />
        </div>
        <div>
          <Label>Department</Label>
          <input
            className="field"
            placeholder="Personnel"
            value={s.profile.dept}
            onChange={(e) => patchProfile({ dept: e.target.value })}
          />
        </div>
      </div>

      {/* Pay, GP, DOA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <Label>Pay (basic)</Label>
          <input
            className="field"
            placeholder="Rs. 29200/-"
            value={s.profile.pay}
            onChange={(e) => patchProfile({ pay: e.target.value })}
          />
        </div>
        <div>
          <Label>Scale of Pay (GP)</Label>
          <input
            className="field"
            placeholder="GP Rs. (2800/-)"
            value={s.profile.gp}
            onChange={(e) => patchProfile({ gp: e.target.value })}
          />
        </div>
        <div>
          <Label>Date of Appointment</Label>
          <input
            type="date"
            className="field"
            value={s.profile.doa}
            onChange={(e) => patchProfile({ doa: e.target.value })}
          />
        </div>
      </div>

      {/* Pay Level + Rule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Pay Level (7th CPC)</Label>
          <select
            className="field font-mono font-semibold"
            value={s.profile.level}
            onChange={(e) => patchProfile({ level: e.target.value as LevelKey })}
          >
            {BANDS.map((band) => (
              <optgroup key={band.id} label={band.name}>
                {band.levels.map((k) => (
                  <option key={k} value={k}>
                    Level {k} - {LEVEL_GP[k]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <Label>Rule governed by</Label>
          <select className="field" value={s.profile.rule} onChange={(e) => patchProfile({ rule: e.target.value })}>
            {["HOER", "OSR", "IRSR"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
