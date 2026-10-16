import { ReactNode, useEffect, useRef } from "react";
import { motion, animate, useInView } from "framer-motion";
import { cn } from "../utils/cn";
import { inr } from "../lib/calc";

/* Animated INR value - springs between amounts tabular-nums */
export function Money({ value, className, big = false }: { value: number; className?: string; big?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const controls = animate(from, value, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(v) {
        if (ref.current) ref.current.textContent = inr(v);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);
  return (
    <span
      ref={ref}
      className={cn(
        "font-mono tabular-nums tracking-tight",
        big ? "text-3xl md:text-4xl font-semibold" : "text-[13px]",
        className,
      )}
    >
      {inr(value)}
    </span>
  );
}

/* Section header with a live signal lamp and route number */
export function SectionHead({ no, title, hint, lamp }: { no: string; title: string; hint?: string; lamp?: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="flex items-center gap-1.5 rounded-full border border-line bg-coal-2 px-2.5 py-1.5">
        <span className="size-2 rounded-full lamp-pulse" style={{ background: lamp ?? "#F2A93B", boxShadow: `0 0 10px ${lamp ?? "#F2A93B"}` }} />
      </div>
      <div className="flex items-baseline gap-3 min-w-0">
        <span className="font-mono text-[11px] font-semibold text-signal tracking-widest">{no}</span>
        <h2 className="font-display text-[15px] font-bold uppercase tracking-[0.14em] text-cream truncate">{title}</h2>
        {hint && <span className="font-mono text-[10px] text-mute hidden lg:inline tracking-wide">{hint}</span>}
      </div>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <label className={cn("block font-mono text-[10px] uppercase tracking-[0.18em] text-mute mb-1.5", className)}>
      {children}
    </label>
  );
}

export function MoneyInput({
  value, onChange, placeholder = "0", className,
}: { value: number; onChange: (n: number) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-mute">₹</span>
      <input
        type="number" min={0}
        className="field pl-7 text-right"
        placeholder={placeholder}
        value={value === 0 ? "" : String(value)}
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
      />
    </div>
  );
}

export function NumInput({
  value, onChange, className, min = 0, max,
}: { value: number; onChange: (n: number) => void; className?: string; min?: number; max?: number }) {
  return (
    <input
      type="number" min={min} max={max}
      className={cn("field text-right", className)}
      placeholder="0"
      value={value === 0 ? "" : String(value)}
      onChange={(e) => {
        let v = parseFloat(e.target.value) || 0;
        v = Math.max(min, v);
        if (max !== undefined) v = Math.min(max, v);
        onChange(v);
      }}
    />
  );
}

export function IconBtn({
  onClick, children, title, danger,
}: { onClick: () => void; children: ReactNode; title?: string; danger?: boolean }) {
  return (
    <button
      type="button" onClick={onClick} title={title}
      className={cn(
        "inline-flex items-center justify-center size-7 rounded-lg border border-line bg-coal-2 text-mute transition-all hover:text-cream hover:border-mute/40 active:scale-90",
        danger && "hover:text-signal hover:border-signal/50 hover:bg-signal/10",
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-ink p-0.5 gap-0.5">
      {options.map((o) => (
        <button
          key={o.v} type="button" onClick={() => onChange(o.v)}
          className={cn(
            "px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold transition-all",
            value === o.v ? "bg-amber text-ink shadow" : "text-mute hover:text-cream",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (b: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex items-center gap-2 group">
      <span className={cn("relative h-4.5 w-8 rounded-full border transition-colors", on ? "bg-leaf/25 border-leaf/50" : "bg-ink border-line")}>
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn("absolute top-1/2 -translate-y-1/2 size-3 rounded-full", on ? "left-[calc(100%-0.9rem)] bg-leaf" : "left-1 bg-mute")}
        />
      </span>
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-mute group-hover:text-cream transition-colors">{label}</span>
    </button>
  );
}

export function FadeIn({ children, delay = 0, className, inViewOnce = true }: { children: ReactNode; delay?: number; className?: string; inViewOnce?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: inViewOnce, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={seen ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
