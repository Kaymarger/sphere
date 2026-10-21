import { seedDatabase } from "./seed";
import type { Database } from "./types";

const KEY = "sphere-office-v1";

function looksLikeOffice(value: unknown): value is Database {
  if (!value || typeof value !== "object") return false;
  const db = value as Database;
  return Array.isArray(db.contacts) && Boolean(db.settings?.officeName);
}

/** The book lives in this browser. Another computer starts from the sample again. */
export function loadOffice(): Database {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (looksLikeOffice(parsed)) return parsed;
    }
  } catch {
    // A broken saved book is replaced with the sample.
  }
  const db = seedDatabase();
  saveOffice(db);
  return db;
}

export function saveOffice(db: Database) {
  localStorage.setItem(KEY, JSON.stringify(db));
}
