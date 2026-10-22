import type { BinBucket, Contact, Database } from "./types";
import { digits } from "./format";

export function isOpen<T extends { deletedAt?: string | null }>(row: T): boolean {
  return !row.deletedAt;
}

const BIN_KEYS: BinBucket[] = [
  "contacts",
  "tasks",
  "events",
  "emailTemplates",
  "letterTemplates",
  "campaigns",
  "plans",
  "vendors",
  "listings",
  "buyers",
  "deals",
  "enrollments",
];

export function binCount(db: Database): number {
  return BIN_KEYS.reduce((total, key) => total + db[key].filter((row) => row.deletedAt).length, 0);
}

export function people(db: Database): Contact[] {
  return db.contacts.filter(isOpen);
}

export function personName(c: Pick<Contact, "firstName" | "lastName">): string {
  return `${c.firstName} ${c.lastName}`.trim() || "Unnamed";
}

export function householdLabel(c: Contact): string {
  if (!c.spouseFirst) return personName(c);
  if (!c.spouseLast || c.spouseLast === c.lastName) {
    return `${c.firstName} & ${c.spouseFirst} ${c.lastName}`;
  }
  return `${c.firstName} ${c.lastName} & ${c.spouseFirst} ${c.spouseLast}`;
}

export function spouseName(c: Contact): string {
  return `${c.spouseFirst} ${c.spouseLast || c.lastName}`.trim();
}

export function primaryPhone(c: Contact): string {
  return c.phones[0]?.number ?? "";
}

export function primaryEmail(c: Contact): string {
  return c.emails[0]?.address ?? "";
}

export function fullAddress(c: Contact): string {
  return [c.street, c.city, c.province, c.postal].filter(Boolean).join(", ");
}

export function findPerson(db: Database, id: string): Contact | undefined {
  return db.contacts.find((c) => c.id === id);
}

export function contactMatches(c: Contact, query: string): boolean {
  const s = query.trim().toLowerCase();
  if (!s) return true;
  const blob = [
    c.firstName,
    c.lastName,
    c.spouseFirst,
    c.spouseLast,
    c.city,
    c.street,
    c.company,
    c.jobTitle,
    c.agent,
    c.source,
    c.type,
    ...c.tags,
    ...c.interests,
    ...c.emails.map((e) => e.address),
    ...c.children.map((child) => child.name),
    ...c.pets.map((p) => p.name),
  ]
    .join(" ")
    .toLowerCase();
  if (blob.includes(s)) return true;
  const d = digits(s);
  if (d.length >= 3) {
    return c.phones.some((p) => digits(p.number).includes(d)) || digits(c.workPhone).includes(d);
  }
  return false;
}

export function sortPeople(list: Contact[], sort: "last" | "first"): Contact[] {
  const copy = [...list];
  copy.sort((a, b) => {
    const aKey = sort === "first" ? [a.firstName, a.lastName] : [a.lastName, a.firstName];
    const bKey = sort === "first" ? [b.firstName, b.lastName] : [b.lastName, b.firstName];
    return aKey.join(" ").localeCompare(bKey.join(" "), "en", { sensitivity: "base" });
  });
  return copy;
}

export function letterOf(c: Contact, sort: "last" | "first"): string {
  const name = sort === "first" ? c.firstName : c.lastName;
  const ch = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
}

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function suggestSalutations(input: {
  firstName: string;
  lastName: string;
  spouseFirst?: string;
  spouseLast?: string;
}): { salutation: string; envelopeLine: string; letterGreeting: string } {
  const first = input.firstName.trim();
  const last = input.lastName.trim();
  const spouse = (input.spouseFirst ?? "").trim();
  const spouseLast = (input.spouseLast ?? "").trim();
  if (spouse) {
    const family = spouseLast && spouseLast !== last ? `${last} / ${spouseLast}` : last;
    return {
      salutation: first,
      envelopeLine: `The ${family} Family`,
      letterGreeting: `Dear ${first} and ${spouse},`,
    };
  }
  return {
    salutation: first,
    envelopeLine: `${first} ${last}`.trim(),
    letterGreeting: first ? `Dear ${first},` : "Hello,",
  };
}
