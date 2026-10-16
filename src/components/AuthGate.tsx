import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogIn, UserPlus, ShieldCheck, ArrowRight, TrainFront, Flame } from "lucide-react";
import { getFirebaseUser, saveFirebaseUser, firebaseConfig } from "../lib/firebase";

const USERS_KEY = "ta-junction-users-mock";
const SESSION_KEY = "ta-junction-session";

interface AuthGateProps {
  children: React.ReactNode;
  onUserChange: (user: { name: string; hrmsId: string } | null) => void;
}

export function AuthGate({ children, onUserChange }: AuthGateProps) {
  const [session, setSession] = useState<{ name: string; hrmsId: string } | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [hrmsId, setHrmsId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setSession(user);
        onUserChange(user);
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStoredUsers = (): any[] => {
    try {
      const stored = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      if (stored.length === 0) {
        const seed = [{ name: "Sri Biswajyoti Roy Sarkar", hrmsId: "KGP999" }];
        localStorage.setItem(USERS_KEY, JSON.stringify(seed));
        return seed;
      }
      return stored;
    } catch {
      return [{ name: "Sri Biswajyoti Roy Sarkar", hrmsId: "KGP999" }];
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanHrms = hrmsId.trim().toUpperCase();

    try {
      if (isRegistering) {
        if (!name.trim() || !cleanHrms) throw new Error("Please fill all fields");

        // Try checking in Firebase Firestore first
        const existingRemote = await getFirebaseUser(cleanHrms);
        const localUsers = getStoredUsers();
        if (existingRemote || localUsers.find((u) => u.hrmsId === cleanHrms)) {
          throw new Error("HRMS ID already registered. Please login.");
        }

        const newUser = { name: name.trim(), hrmsId: cleanHrms };

        // Save to Firebase Firestore & local fallback
        await saveFirebaseUser(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify([...localUsers, newUser]));

        login(newUser);
      } else {
        if (!cleanHrms) throw new Error("Please enter HRMS ID");

        // 1. Try Firebase Firestore
        let user: { name: string; hrmsId: string } | null = null;
        try {
          const remoteUser = await getFirebaseUser(cleanHrms);
          if (remoteUser) {
            user = { name: remoteUser.name, hrmsId: remoteUser.hrmsId };
          }
        } catch {
          // fallback to local
        }

        // 2. Try localStorage if not found remotely
        if (!user) {
          const localUsers = getStoredUsers();
          const localMatch = localUsers.find((u) => u.hrmsId === cleanHrms);
          if (localMatch) {
            user = localMatch;
            // Background sync to Firebase
            saveFirebaseUser(localMatch).catch(() => {});
          }
        }

        if (!user) {
          throw new Error("User not found. Try demo ID 'KGP999' or click Create account.");
        }

        login(user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = (user: { name: string; hrmsId: string }) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setSession(user);
    onUserChange(user);
  };

  if (session) return <>{children}</>;

  return (
    <div className="min-h-screen bg-ink bg-tracks flex items-center justify-center p-4">
      <div className="bg-fade absolute inset-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-6">
          <div className="size-16 rounded-2xl bg-coal-2 border border-line flex items-center justify-center shadow-ticket mb-4">
            <TrainFront className="size-8 text-amber" />
          </div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight text-cream">TA JUNCTION</h1>
          <p className="font-mono text-[10px] tracking-[0.2em] text-mute uppercase mt-1">Indian Railways Claim Desk</p>

          <div className="mt-3 flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber/30 bg-amber/10 font-mono text-[9px] text-amber">
              <Flame className="size-3 text-amber" />
              <span>Firebase:</span>
              <span className="font-bold text-cream">{firebaseConfig.projectId}</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-line bg-coal font-mono text-[9px] text-mute">
              <span>Demo:</span>
              <button
                type="button"
                onClick={() => setHrmsId("KGP999")}
                className="text-amber underline font-bold cursor-pointer"
              >
                KGP999
              </button>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-line bg-coal p-6 md:p-8 shadow-ticket overflow-hidden relative">
          <div className="hazard-red absolute inset-x-0 top-0 h-1.5 opacity-50" />

          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber/10 border border-amber/20">
                {isRegistering ? <UserPlus className="size-5 text-amber" /> : <LogIn className="size-5 text-amber" />}
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-cream">
                  {isRegistering ? "Create Account" : "Access Desk"}
                </h2>
                <p className="font-mono text-[10px] text-mute">Verified Personnel Only</p>
              </div>
            </div>

            <div className="flex items-center gap-1 font-mono text-[9px] text-leaf bg-leaf/10 border border-leaf/20 px-2 py-0.5 rounded-full">
              <span className="size-1.5 rounded-full bg-leaf animate-pulse" />
              <span>Cloud Sync</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-mute mb-1.5 ml-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-mute" />
                  <input
                    type="text"
                    className="field pl-10"
                    placeholder="Sri/Smt Name"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    required={isRegistering}
                  />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-mute mb-1.5 ml-1">
                HRMS ID
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-mute" />
                <input
                  type="text"
                  className="field pl-10 uppercase"
                  placeholder="EX: KGP999 or RZ1234"
                  value={hrmsId}
                  onChange={(e) => setHrmsId(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-signal text-[11px] font-mono text-center bg-signal/10 py-2 rounded-lg border border-signal/20"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full group flex items-center justify-center gap-2 rounded-xl bg-amber py-3.5 font-mono text-[11px] font-bold uppercase tracking-widest text-ink transition-all hover:bg-cream active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="size-4 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              ) : (
                <>
                  {isRegistering ? "Register with Firebase" : "Login Now"}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-line text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              className="font-mono text-[10px] text-mute hover:text-amber transition-colors uppercase tracking-widest cursor-pointer"
            >
              {isRegistering ? "Already have account? Login" : "New user? Create account"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[9px] text-mute/50 leading-relaxed uppercase tracking-tighter">
          Connected to Firebase Firestore project: {firebaseConfig.projectId}.<br />
          Data automatically syncs across sessions and devices.
        </p>
      </motion.div>
    </div>
  );
}
