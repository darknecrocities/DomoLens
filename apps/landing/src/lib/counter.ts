/**
 * Global visitor + download counters backed by Firestore's REST API.
 * No SDK dependency: plain fetch, so the landing bundle stays small.
 * Env vars (set in Vercel): VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID.
 */
const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
const API_KEY = env.VITE_FIREBASE_API_KEY ?? "";
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID ?? "";

const COLLECTION = "domolenscounter";
export type CounterName = "visits" | "downloads";

export const isCounterConfigured = Boolean(API_KEY && PROJECT_ID);

const DB = `projects/${PROJECT_ID}/databases/(default)/documents`;
const BASE = `https://firestore.googleapis.com/v1/${DB}`;

export async function readCounter(name: CounterName): Promise<number | null> {
  if (!isCounterConfigured) return null;
  try {
    const res = await fetch(`${BASE}/${COLLECTION}/${name}?key=${API_KEY}`);
    if (res.status === 404) return 0;
    if (!res.ok) return null;
    const data = (await res.json()) as { fields?: { count?: { integerValue?: string } } };
    return Number(data.fields?.count?.integerValue ?? 0);
  } catch {
    return null;
  }
}

export async function incrementCounter(name: CounterName): Promise<boolean> {
  if (!isCounterConfigured) return false;
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/${DB}:commit?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [
          {
            transform: {
              document: `${DB}/${COLLECTION}/${name}`,
              fieldTransforms: [
                { fieldPath: "count", increment: { integerValue: "1" } },
              ],
            },
          },
        ],
      }),
    });
    return res.ok;
  } catch {
    /* counters are best-effort */
    return false;
  }
}

const VISIT_KEY = "domolens_visit_recorded_v2";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Count one unique visit per browser per 24h. */
export function recordVisitOnce(): void {
  try {
    const last = Number(localStorage.getItem(VISIT_KEY) ?? 0);
    if (Date.now() - last < DAY_MS) return;
  } catch {
    /* storage blocked: still count once per page load */
  }
  // Only remember the visit once the write really succeeded.
  void incrementCounter("visits").then((ok) => {
    if (!ok) return;
    try {
      localStorage.setItem(VISIT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  });
}

/** Count clicks on release/download links (event delegation). */
export function trackDownloadClicks(): () => void {
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
    if (!a) return;
    if (/releases\/latest\/download\//.test(a.href) || a.hasAttribute("data-download")) {
      void incrementCounter("downloads");
    }
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
