import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { readCounter, type CounterName } from "../lib/counter";

const POLL_MS = 30_000;

/** Smoothly animates from the previous value to the new one. */
function useCountUp(target: number | null, duration = 1800) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (target === null) return;
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const v = Math.round(origin + (target - origin) * eased);
      setValue(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function useLiveCounter(name: CounterName) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const v = await readCounter(name);
      if (alive && v !== null) setCount(v);
    };
    void load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [name]);
  return count;
}

function Stat({ name, label }: { name: CounterName; label: string }) {
  const count = useLiveCounter(name);
  const shown = useCountUp(count);
  return (
    <div className="text-center">
      <div className="text-5xl font-black tabular-nums tracking-tight text-white sm:text-7xl">
        {count === null ? "—" : shown.toLocaleString("en-US")}
      </div>
      <div className="mt-2 font-mono text-xs uppercase tracking-widest text-neutral-400">{label}</div>
    </div>
  );
}

export function LiveCounterSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="bg-black px-4 py-20 sm:px-6"
      aria-label="Live usage counters"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-12 sm:flex-row sm:gap-24">
        <Stat name="visits" label="People visited" />
        <Stat name="downloads" label="Downloads" />
      </div>
    </motion.section>
  );
}
