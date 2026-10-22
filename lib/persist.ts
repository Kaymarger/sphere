import { DEFAULT_CONTACT_TYPES, DEFAULT_SOURCES } from "./lists";
import { seedDatabase } from "./seed";
import type { Database } from "./types";

const KEY = "sphere-office-v1";

function looksLikeOffice(value: unknown): value is Database {
  if (!value || typeof value !== "object") return false;
  const db = value as Database;
  return Array.isArray(db.contacts) && Boolean(db.settings?.officeName);
}

function uniquePush(list: string[], value: string) {
  const clean = value.trim();
  if (clean && !list.includes(clean)) list.push(clean);
}

/** Older books saved before sources and contact types lived in settings. */
export function prepareOffice(db: Database): Database {
  if (!Array.isArray(db.settings.agents)) db.settings.agents = [];
  if (!Array.isArray(db.settings.groups)) db.settings.groups = [];
  if (!Array.isArray(db.settings.sources)) {
    db.settings.sources = [...DEFAULT_SOURCES];
    for (const contact of db.contacts) uniquePush(db.settings.sources, contact.source || "");
  }
  if (!Array.isArray(db.settings.contactTypes)) {
    db.settings.contactTypes = [...DEFAULT_CONTACT_TYPES];
    for (const contact of db.contacts) uniquePush(db.settings.contactTypes, contact.type || "");
  }
  uniquePush(db.settings.contactTypes, "Past Client");
  if (db.settings.contactTypes[0] !== "Past Client") {
    db.settings.contactTypes = ["Past Client", ...db.settings.contactTypes.filter((type) => type !== "Past Client")];
  }
  return db;
}

/** The book lives in this browser. Another computer starts from the sample again. */
export function loadOffice(): Database {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (looksLikeOffice(parsed)) {
        const ready = prepareOffice(parsed);
        saveOffice(ready);
        return ready;
      }
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
