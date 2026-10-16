import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Clock3,
  CopyPlus,
  FileDown,
  FilePlus2,
  Files,
  Map as MapIcon,
  MoveDown,
  Printer,
  ReceiptText,
  RotateCcw,
  Sparkles,
  TrainTrack,
  Trash2,
  LogOut,
  Cloud,
  Database,
  Flame,
} from "lucide-react";
import { CalcState, JourneyGroup, compute, computeDaEntries, fmtMonthYear, inr, User } from "./lib/calc";
import { EmployeeSection } from "./components/EmployeeSection";
import { JourneySection } from "./components/JourneySection";
import { ContingencySection } from "./components/ContingencySection";
import { Journal } from "./components/Journal";
import { ContingentBill } from "./components/ContingentBill";
import { GoogleMapTab } from "./components/GoogleMapTab";
import { AuthGate } from "./components/AuthGate";
import { CloudDeployModal } from "./components/CloudDeployModal";
import { FadeIn, Money, SectionHead } from "./components/primitives";
import { cn } from "./utils/cn";
import { bandOf } from "./data/rules";
import { getDatabaseConfig } from "./lib/db";
import { 
  getFirebaseBills, 
  saveFirebaseBill, 
  deleteFirebaseBill, 
  firebaseConfig,
  saveFirebaseUser
} from "./lib/firebase";

// helpers
const uid = () => crypto.randomUUID();
const pad = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** Set document.title to a PDF-friendly filename, print, then restore */
function printWithTitle(title: string) {
  const prev = document.title;
  document.title = title;
  window.print();
  setTimeout(() => {
    document.title = prev;
  }, 500);
  window.addEventListener(
    "afterprint",
    () => {
      document.title = prev;
    },
    { once: true },
  );
}

/** Build the filename: TA_SriBiswajyotiRoySarkar_February2026 or Contingency_... */
function buildPrintTitle(s: CalcState, type: "journey" | "contingency"): string {
  const name = (s.profile.name || "Employee").replace(/[^a-zA-Z0-9]/g, "");
  const month = s.claimMonth ? fmtMonthYear(s.claimMonth).replace(/[\s,]/g, "") : "NoMonth";
  const prefix = type === "contingency" ? "Contingency" : "TA";
  return `${prefix}_${name}_${month}`;
}

// demo & empty state
function demoState(registeredName?: string): CalcState {
  const band = bandOf("5");
  const rate = band.da;
  const groups: JourneyGroup[] = [
    {
      id: uid(),
      object:
        "To handover original vetted service sheet & Leave record in favour of Manohar Kumar, Asst. WS & to collect original Service sheet & leave record of Sri Subhankar Biswas, Asst. TL&AC of NBQ WS/NFR",
      rows: [
        {
          id: uid(),
          date: "2026-02-03",
          trainNo: "12515",
          depTime: "06:48",
          arrTime: "",
          from: "KGP",
          to: " ",
          kms: 920,
          onPass: true,
          fare: 0,
        },
        {
          id: uid(),
          date: "2026-02-04",
          trainNo: "12515",
          depTime: "",
          arrTime: "00:20",
          from: " ",
          to: "NBQ",
          kms: 0,
          onPass: true,
          fare: 0,
        },
        {
          id: uid(),
          date: "2026-02-04",
          trainNo: "12552",
          depTime: "16:30",
          arrTime: "",
          from: "NBQ",
          to: " ",
          kms: 989,
          onPass: true,
          fare: 0,
        },
        {
          id: uid(),
          date: "2026-02-05",
          trainNo: "12552",
          depTime: "",
          arrTime: "12:27",
          from: " ",
          to: "HIJ",
          kms: 0,
          onPass: true,
          fare: 0,
        },
      ],
    },
    {
      id: uid(),
      object:
        "To handover the family pension case file in Original of Smt. Rita Dhirendra Biswas daughter of D. N. Biswas",
      rows: [
        {
          id: uid(),
          date: "2026-02-26",
          trainNo: "12860",
          depTime: "15:28",
          arrTime: "",
          from: "KGP",
          to: " ",
          kms: 1015,
          onPass: true,
          fare: 0,
        },
        {
          id: uid(),
          date: "2026-02-27",
          trainNo: "12860",
          depTime: "",
          arrTime: "09:15",
          from: " ",
          to: "NGP",
          kms: 0,
          onPass: true,
          fare: 0,
        },
        {
          id: uid(),
          date: "2026-02-27",
          trainNo: "12833",
          depTime: "18:23",
          arrTime: "",
          from: "NGP",
          to: " ",
          kms: 1015,
          onPass: true,
          fare: 0,
        },
        {
          id: uid(),
          date: "2026-02-28",
          trainNo: "12833",
          depTime: "",
          arrTime: "04:34",
          from: " ",
          to: "KGP",
          kms: 0,
          onPass: true,
          fare: 0,
        },
      ],
    },
  ];

  const daEntries = computeDaEntries(groups, rate);

  return {
    railway: "South Eastern Railway",
    distHQ: "KGPW",
    claimMonth: "2026-02",
    claimNo: "",
    billDate: todayISO(),
    profile: {
      name: registeredName || "Sri Biswajyoti Roy Sarkar",
      desig: "Sr. Clerk-Cum-Typist",
      dept: "Personnel",
      pay: "Rs. 29200",
      gp: "GP Rs. (2800/-)",
      doa: "2023-08-02",
      rule: "HOER",
      hq: "KGPW",
      level: "5",
    },
    groups,
    daEntries,
    daRateOverride: null,
    contingency: [],
  };
}

function emptyState(registeredName?: string): CalcState {
  return {
    railway: "South Eastern Railway",
    distHQ: "",
    claimMonth: thisMonth(),
    claimNo: "",
    billDate: todayISO(),
    profile: {
      name: registeredName || "",
      desig: "",
      dept: "",
      pay: "",
      gp: "",
      doa: "",
      rule: "HOER",
      hq: "",
      level: "5",
    },
    groups: [{ id: uid(), object: "", rows: [] }],
    daEntries: [],
    daRateOverride: null,
    contingency: [],
  };
}

function normalize(raw: any): CalcState {
  const base = emptyState();
  return {
    ...base,
    ...(raw ?? {}),
    profile: { ...base.profile, ...(raw?.profile ?? {}) },
    groups: raw?.groups ?? [{ id: uid(), object: "", rows: [] }],
    daEntries: (raw?.daEntries ?? []).map((e: any) => ({ ...e, auto: e.auto ?? true })),
    contingency: (raw?.contingency ?? []).map((c: any) => {
      const kms = c.kms ?? 0;
      const rate = c.rate ?? 0;
      const isReturn = c.isReturn ?? false;
      const mult = isReturn ? 2 : 1;
      return {
        id: c.id ?? uid(),
        date: c.date ?? "",
        from: c.from ?? "",
        to: c.to ?? "",
        isReturn,
        kms,
        rate,
        amount: kms > 0 && rate > 0 ? Math.round(kms * rate * mult * 100) / 100 : c.amount ?? 0,
      };
    }),
  };
}

function makeTitle(s: CalcState): string {
  const m = s.claimMonth ? fmtMonthYear(s.claimMonth) : "NEW BILL";
  return `${s.profile.name || "EMPLOYEE"} • ${m}`;
}

// multi-bill desk
interface BillFile {
  id: string;
  title: string;
  state: any;
}
interface Desk {
  activeId: string;
  bills: BillFile[];
}
const STORE_KEY = "ta-junction-desk-v7";

function loadDesk(): Desk {
  const sessionUser = (() => {
    try {
      const saved = localStorage.getItem("ta-junction-session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.bills?.length)
        return {
          activeId: s.activeId,
          bills: s.bills.map((b: BillFile) => {
            const st = normalize(b.state);
            if (sessionUser?.name) {
              st.profile.name = sessionUser.name;
            }
            return { ...b, state: st, title: makeTitle(st) };
          }),
        };
    }
  } catch {
    // ignore
  }
  const st = demoState(sessionUser?.name);
  return { activeId: "b1", bills: [{ id: "b1", title: makeTitle(st), state: st }] };
}

// BillSwitcher
function BillSwitcher({
  desk,
  totals,
  onSwitch,
  onNew,
  onDup,
  onDel,
}: {
  desk: Desk;
  totals: Map<string, number>;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onDup: () => void;
  onDel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = desk.bills.find((b) => b.id === desk.activeId) ?? desk.bills[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-line bg-coal px-3 py-2 transition-all hover:border-mute/40 active:scale-95 cursor-pointer"
      >
        <Files className="size-3.5 text-amber shrink-0" />
        <span className="hidden sm:block max-w-44 truncate font-mono text-[10px] font-semibold tracking-wide text-cream">
          {active.title}
        </span>
        <span className="grid place-items-center rounded-full bg-coal-3 border border-line min-w-5 h-5 px-1 font-mono text-[9px] font-bold text-amber">
          {desk.bills.length}
        </span>
        <ChevronDown className={cn("size-3.5 text-mute transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute left-0 z-50 mt-2 w-[300px] rounded-2xl border border-line bg-coal shadow-ticket p-1.5"
            >
              <div className="px-2.5 py-2 font-mono text-[8.5px] uppercase tracking-[0.25em] text-mute">
                Claims on your desk
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {desk.bills.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSwitch(b.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer",
                      b.id === desk.activeId
                        ? "bg-amber/10 border border-amber/30"
                        : "border border-transparent hover:bg-coal-2",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full shrink-0",
                        b.id === desk.activeId ? "bg-amber" : "bg-line",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[10.5px] font-semibold text-cream">
                        {b.title}
                      </span>
                      <span className="block font-mono text-[9px] text-mute">
                        {inr(totals.get(b.id) ?? 0)}
                      </span>
                    </span>
                    {b.id === desk.activeId && <Check className="size-3.5 text-amber shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 flex items-center gap-1 border-t border-line pt-1.5">
                <button
                  onClick={() => {
                    onNew();
                    setOpen(false);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber/15 border border-amber/30 py-2 font-mono text-[9.5px] font-bold uppercase tracking-wider text-amber hover:bg-amber/25 transition-colors cursor-pointer"
                >
                  <FilePlus2 className="size-3.5" /> New
                </button>
                <button
                  onClick={() => {
                    onDup();
                    setOpen(false);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-line py-2 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mute hover:text-cream transition-colors cursor-pointer"
                >
                  <CopyPlus className="size-3.5" /> Dupe
                </button>
                <button
                  onClick={() => {
                    onDel();
                    setOpen(false);
                  }}
                  disabled={desk.bills.length <= 1}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-line py-2 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mute hover:text-signal hover:border-signal/50 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <Trash2 className="size-3.5" /> Drop
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-mute">
      <Clock3 className="size-3.5 text-amber" />
      <span className="tabular-nums text-cream">{t.toLocaleTimeString("en-IN", { hour12: false })}</span>
      <span className="hidden sm:inline">
        {t.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).toUpperCase()}
      </span>
    </div>
  );
}

// main App component
export default function App() {
  const [desk, setDesk] = useState<Desk>(loadDesk);
  const [activeTab, setActiveTab] = useState<"journey" | "contingency" | "map">("journey");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const dbConfig = getDatabaseConfig();

  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("ta-junction-session");
    window.location.reload();
  };

  const bill = desk.bills.find((b) => b.id === desk.activeId) ?? desk.bills[0];
  const state = bill.state;

  const updateActive = (fn: (st: CalcState) => CalcState) =>
    setDesk((d) => ({
      ...d,
      bills: d.bills.map((b) => {
        if (b.id !== d.activeId) return b;
        const ns = fn(b.state);
        return { ...b, state: ns, title: makeTitle(ns) };
      }),
    }));

  const patch = (p: Partial<CalcState>) => updateActive((st) => ({ ...st, ...p }));
  const patchProfile = (p: Partial<CalcState["profile"]>) =>
    updateActive((st) => ({ ...st, profile: { ...st.profile, ...p } }));

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(desk));
    } catch {
      // ignore
    }
  }, [desk]);

  const c = useMemo(() => compute(state), [state]);
  const totals = useMemo(() => {
    const m = new Map<string, number>();
    desk.bills.forEach((b) => {
      m.set(b.id, compute(b.state).grand);
    });
    return m;
  }, [desk, bill.id]);

  // Load remote bills from Firebase on login
  useEffect(() => {
    if (!currentUser?.hrmsId) return;
    let isMounted = true;
    getFirebaseBills(currentUser.hrmsId)
      .then((remoteBills) => {
        if (!isMounted || !remoteBills || remoteBills.length === 0) return;
        setDesk((prev) => {
          const mergedMap = new Map<string, BillFile>();
          prev.bills.forEach((b) => mergedMap.set(b.id, b));
          remoteBills.forEach((rb: any) => {
            if (rb.id && rb.state) {
              const norm = normalize(rb.state);
              if (currentUser?.name) {
                norm.profile.name = currentUser.name;
              }
              mergedMap.set(rb.id, {
                id: rb.id,
                title: rb.title || makeTitle(norm),
                state: norm,
              });
            }
          });
          const mergedList = Array.from(mergedMap.values());
          return {
            activeId: prev.activeId && mergedMap.has(prev.activeId) ? prev.activeId : mergedList[0].id,
            bills: mergedList,
          };
        });
      })
      .catch(console.warn);

    return () => {
      isMounted = false;
    };
  }, [currentUser?.hrmsId]);

  // Sync active bill changes to Firebase (debounced)
  useEffect(() => {
    if (!currentUser?.hrmsId || !bill) return;
    const timeout = setTimeout(() => {
      saveFirebaseBill(currentUser.hrmsId, {
        id: bill.id,
        title: bill.title,
        state: bill.state,
      }).catch(console.warn);
    }, 1200);
    return () => clearTimeout(timeout);
  }, [bill, currentUser?.hrmsId]);

  // Synchronize employee name across bills whenever registered user is logged in
  useEffect(() => {
    if (!currentUser?.name) return;
    setDesk((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => {
        if (b.state.profile.name === currentUser.name) return b;
        const ns = {
          ...b.state,
          profile: {
            ...b.state.profile,
            name: currentUser.name,
          },
        };
        return {
          ...b,
          state: ns,
          title: makeTitle(ns),
        };
      }),
    }));
  }, [currentUser?.name]);

  const newBill = () => {
    const id = uid();
    const st = emptyState(currentUser?.name);
    setDesk((d) => ({ activeId: id, bills: [...d.bills, { id, title: makeTitle(st), state: st }] }));
  };

  const dupBill = () => {
    const id = uid();
    const st: CalcState = structuredClone(state);
    st.claimNo = "";
    setDesk((d) => {
      const i = d.bills.findIndex((b) => b.id === d.activeId);
      const nb = [...d.bills];
      nb.splice(i + 1, 0, { id, title: makeTitle(st) + " (COPY)", state: st });
      return { activeId: id, bills: nb };
    });
  };

  const delBill = () =>
    setDesk((d) => {
      if (d.bills.length <= 1) return d;
      const targetId = d.activeId;
      if (currentUser?.hrmsId) {
        deleteFirebaseBill(currentUser.hrmsId, targetId).catch(console.warn);
      }
      const nb = d.bills.filter((b) => b.id !== targetId);
      return { activeId: nb[0].id, bills: nb };
    });

  const patchGroup = (gid: string, p: Partial<JourneyGroup>) =>
    patch({
      groups: state.groups.map((g: any) => (g.id === gid ? { ...g, ...p } : g)),
    });

  // Auto-recompute DA whenever groups, level or rate override changes
  useEffect(() => {
    const band = bandOf(state.profile.level);
    const rate = state.daRateOverride ?? band.da;
    const newEntries = computeDaEntries(state.groups, rate, state.daEntries);
    const same =
      newEntries.length === state.daEntries.length &&
      newEntries.every((ne, i) => {
        const oe = state.daEntries[i];
        return oe && ne.date === oe.date && ne.pct === oe.pct && ne.amount === oe.amount;
      });
    if (!same) patch({ daEntries: newEntries });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.groups, state.profile.level, state.daRateOverride]);

  return (
    <AuthGate onUserChange={setCurrentUser}>
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{" "}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{" "}
            for instructions to update your account.
          </span>
        </div>
      )}
      <div className="min-h-screen bg-ink bg-tracks">
        <div className="bg-fade min-h-screen">
          {/* header */}
          <header className="screen-only sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
            <div className="mx-auto max-w-[1400px] px-4 md:px-6">
              <div className="flex items-center justify-between h-16 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid place-items-center size-10 shrink-0 rounded-xl bg-coal-2 border border-line">
                    <div className="flex flex-col gap-[3px]">
                      <span className="size-[5px] rounded-full bg-signal lamp-pulse" />
                      <span className="size-[5px] rounded-full bg-amber lamp-pulse" style={{ animationDelay: ".4s" }} />
                      <span className="size-[5px] rounded-full bg-leaf lamp-pulse" style={{ animationDelay: ".8s" }} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-extrabold tracking-[0.08em] leading-none text-[17px]">
                      TA JUNCTION
                    </div>
                    <div className="font-mono text-[8.5px] tracking-[0.28em] text-mute mt-1">
                      TRAVELLING ALLOWANCE JOURNAL DESK
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Firebase Project Badge */}

                  {/* Firebase Project Badge */}
                  <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber/30 bg-amber/10 font-mono text-[9.5px] text-amber">
                    <Flame className="size-3 text-amber shrink-0" />
                    <span className="text-cream font-bold">{firebaseConfig.projectId}</span>
                    <span className="size-1.5 rounded-full bg-leaf animate-pulse" />
                  </div>

                  <BillSwitcher
                    desk={desk}
                    totals={totals}
                    onSwitch={(activeId) => setDesk((d) => ({ ...d, activeId }))}
                    onNew={newBill}
                    onDup={dupBill}
                    onDel={delBill}
                  />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-xl border border-line bg-coal px-3 py-2 text-mute hover:text-signal hover:border-signal/30 transition-all cursor-pointer"
                    title={`Logout ${currentUser?.name}`}
                  >
                    <LogOut className="size-3.5" />
                    <span className="hidden lg:block font-mono text-[9px] font-bold uppercase tracking-widest">
                      Logout
                    </span>
                  </button>

                  <div className="hidden xl:inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-leaf/10 px-3 py-1.5">
                    <span className="size-1.5 rounded-full bg-leaf" />
                    <span className="font-mono text-[9.5px] tracking-[0.14em] text-leaf">
                      RBE 51/2024 • W.E.F. 01.01.2024
                    </span>
                  </div>

                  <span className="hidden md:block">
                    <Clock />
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Cloud Deploy Modal */}
          <CloudDeployModal isOpen={showDeployModal} onClose={() => setShowDeployModal(false)} />

          {/* hero */}
          <div className="screen-only mx-auto max-w-[1400px] px-4 md:px-6">
            <div className="pt-8 pb-6 md:pt-10 md:pb-6 flex flex-wrap items-end justify-between gap-6">
              <FadeIn>
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-amber mb-3">
                  <TrainTrack className="size-4" /> FOR RAILWAY EMPLOYEES • 7TH CPC
                </div>
                <h1 className="font-display font-extrabold leading-[0.95] tracking-tight text-[clamp(2.2rem,6vw,4.4rem)]">
                  Travelling Allowance
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber via-[#f6c76d] to-leaf">
                    Journal • Ready to sign.
                  </span>
                </h1>
                <p className="mt-4 max-w-xl font-mono text-[12px] leading-relaxed text-mute">
                  Enter your journeys train-wise. Get a print-ready TA Journal matching the official format — with amount
                  in words and signature blocks.
                </p>
              </FadeIn>

              <FadeIn delay={0.15} className="hidden lg:block">
                <div className="rounded-2xl border border-line bg-coal px-6 py-5 text-right shadow-ticket">
                  <div className="font-mono text-[9px] tracking-[0.3em] text-mute">TOTAL CLAIM</div>
                  <Money value={c.grand} big className="text-amber" />
                  <div className="font-mono text-[9.5px] text-mute mt-1">
                    DA {inr(c.daTotal)} • KMs {c.totalKms}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>

          {/* toolbar */}
          <div className="screen-only mx-auto max-w-[1400px] px-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-leaf lamp-pulse" />
                  <span className="font-mono text-[10.5px] tracking-[0.2em] text-mute">
                    {desk.bills.length} BILL{desk.bills.length > 1 ? "S" : ""} ON DESK • AUTOSAVED
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateActive(() => demoState(currentUser?.name))}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-coal px-3.5 py-2 font-mono text-[10.5px] font-bold uppercase tracking-wider text-mute transition-all hover:text-cream hover:border-mute/40 active:scale-95 cursor-pointer"
                >
                  <Sparkles className="size-3.5" /> Demo
                </button>
                <button
                  onClick={() => updateActive(() => emptyState(currentUser?.name))}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-coal px-3.5 py-2 font-mono text-[10.5px] font-bold uppercase tracking-wider text-mute transition-all hover:text-signal hover:border-signal/50 active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" /> Reset
                </button>
                <button
                  onClick={() =>
                    printWithTitle(buildPrintTitle(state, activeTab === "contingency" ? "contingency" : "journey"))
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-signal px-4 py-2 font-mono text-[10.5px] font-bold uppercase tracking-wider text-cream shadow-[0_10px_30px_-8px_rgba(226,72,58,.6)] transition-all hover:bg-signal-deep active:scale-95 cursor-pointer"
                >
                  <Printer className="size-3.5" /> {activeTab === "contingency" ? "Print Contingency" : "Print Journal"}
                </button>
              </div>
            </div>

            {/* main grid */}
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-28">
              {/* LEFT — form panels */}
              <div className="lg:col-span-5 space-y-5">
                <FadeIn>
                  <EmployeeSection
                    s={state}
                    patch={patch}
                    patchProfile={patchProfile}
                    registeredName={currentUser?.name}
                  />
                </FadeIn>

                <FadeIn delay={0.04}>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => setActiveTab("journey")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all active:scale-95 cursor-pointer",
                        activeTab === "journey"
                          ? "bg-amber text-ink border-amber"
                          : "bg-coal border-line text-mute hover:text-cream",
                      )}
                    >
                      <TrainTrack className="size-5" />
                      <span className="font-mono text-[9px] font-bold tracking-widest uppercase">Journey</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("contingency")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all active:scale-95 cursor-pointer",
                        activeTab === "contingency"
                          ? "bg-amber text-ink border-amber"
                          : "bg-coal border-line text-mute hover:text-cream",
                      )}
                    >
                      <ReceiptText className="size-5" />
                      <span className="font-mono text-[9px] font-bold tracking-widest uppercase">Contingency</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("map")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all active:scale-95 cursor-pointer",
                        activeTab === "map"
                          ? "bg-amber text-ink border-amber"
                          : "bg-coal border-line text-mute hover:text-cream",
                      )}
                    >
                      <MapIcon className="size-5" />
                      <span className="font-mono text-[9px] font-bold tracking-widest uppercase">Google Map</span>
                    </button>
                  </div>
                </FadeIn>

                <AnimatePresence mode="wait">
                  {activeTab === "journey" && (
                    <motion.div
                      key="j"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <FadeIn delay={0.05}>
                        <JourneySection s={state} patch={patch} patchGroup={patchGroup} />
                      </FadeIn>
                    </motion.div>
                  )}
                  {activeTab === "contingency" && (
                    <motion.div
                      key="c"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <FadeIn delay={0.08}>
                        <ContingencySection s={state} patch={patch} />
                      </FadeIn>
                    </motion.div>
                  )}
                  {activeTab === "map" && (
                    <motion.div
                      key="m"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <FadeIn delay={0.08}>
                        <GoogleMapTab s={state} patch={patch} patchGroup={patchGroup} />
                      </FadeIn>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* RIGHT — document preview */}
              <div className="lg:col-span-7">
                <FadeIn delay={0.12}>
                  <div className="flex items-center gap-2 mb-3 font-mono text-[10px] tracking-[0.25em] text-mute">
                    <FileDown className="size-3.5 text-amber" />
                    {activeTab === "contingency" ? "CONTINGENT BILL PREVIEW" : "TA JOURNAL PREVIEW"} • PRINT-READY
                  </div>
                  <AnimatePresence mode="wait">
                    {activeTab === "contingency" ? (
                      <motion.div key="cb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <ContingentBill s={state} />
                      </motion.div>
                    ) : (
                      <motion.div key="tj" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Journal s={state} c={c} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </FadeIn>
              </div>
            </main>
          </div>

          {/* mobile sticky footer */}
          <div className="screen-only lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-ink/90 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <div>
                <div className="font-mono text-[8.5px] tracking-[0.25em] text-mute">TOTAL CLAIM</div>
                <Money value={c.grand} className="text-xl text-amber font-semibold" />
              </div>
              <button
                onClick={() => document.getElementById("journal-preview")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-mute active:scale-95 transition-transform"
              >
                Journal <MoveDown className="size-3.5" />
              </button>
              <button
                onClick={() =>
                  printWithTitle(buildPrintTitle(state, activeTab === "contingency" ? "contingency" : "journey"))
                }
                className="inline-flex items-center gap-2 rounded-xl bg-signal px-4 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-cream active:scale-95 transition-transform"
              >
                <Printer className="size-3.5" /> Print
              </button>
            </div>
          </div>

          {/* footer */}
          <footer className="screen-only border-t border-line bg-coal/60">
            <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.3em] text-amber">DISCLAIMER</div>
                  <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-mute">
                    Prepared by Biswajyoti Roy Sarkar. Indicative calculator for self-check. Cross-verify with current
                    Railway Board circulars and your establishment section before submitting TA claims.
                  </p>
                </div>
                <div className="font-mono text-[9px] text-mute flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-leaf" />
                  <span>Cloud Database Active</span>
                </div>
              </div>
            </div>
            <div className="hazard h-1.5" />
          </footer>

          {/* print twin */}
          <div className="print-only">
            {activeTab === "contingency" ? (
              <ContingentBill s={state} forPrint />
            ) : (
              <Journal s={state} c={c} forPrint />
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
