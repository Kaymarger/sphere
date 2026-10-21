"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { applyAction, type Action } from "@/lib/actions";
import { todayInTimeZone } from "@/lib/dates";
import { loadOffice, saveOffice } from "@/lib/persist";
import { seedDatabase } from "@/lib/seed";
import type { Database } from "@/lib/types";

type ActResult = { ok: true; result?: Record<string, string> } | { ok: false; error: string };

type OfficeValue = {
  db: Database | null;
  today: string;
  busy: boolean;
  error: string | null;
  reload: () => Promise<void>;
  act: (action: Action | { type: "resetSample" }) => Promise<ActResult>;
};

const OfficeContext = createContext<OfficeValue | null>(null);

export function OfficeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dbRef = useRef<Database | null>(null);
  dbRef.current = db;

  const reload = useCallback(async () => {
    try {
      const next = loadOffice();
      setDb(next);
      setError(null);
    } catch {
      setError("The office book didn’t open. Try again in a moment.");
    }
  }, []);

  useEffect(() => {
    if (pathname === "/login") return;
    void reload();
  }, [pathname, reload]);

  const act = useCallback(async (action: Action | { type: "resetSample" }) => {
    const current = dbRef.current;
    if (!current) return { ok: false as const, error: "The office book isn’t open yet." };
    setBusy(true);
    try {
      const out =
        action.type === "resetSample"
          ? { db: seedDatabase() }
          : applyAction(structuredClone(current), action);
      if (out.error) return { ok: false as const, error: out.error };
      saveOffice(out.db);
      setDb(out.db);
      return { ok: true as const, result: "result" in out ? out.result : undefined };
    } catch {
      return { ok: false as const, error: "That didn’t save in this browser. The book may be too full." };
    } finally {
      setBusy(false);
    }
  }, []);

  const today = todayInTimeZone(db?.settings.timezone || "America/Vancouver");
  const value = useMemo(() => ({ db, today, busy, error, reload, act }), [db, today, busy, error, reload, act]);

  return <OfficeContext.Provider value={value}>{children}</OfficeContext.Provider>;
}

export function useOffice() {
  const ctx = useContext(OfficeContext);
  if (!ctx) throw new Error("The office desk is not ready.");
  return ctx;
}
