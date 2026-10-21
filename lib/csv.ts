import type { Contact, ContactDraft, ContactType, Database, MailPreference } from "./types";
import { parseLooseDate } from "./dates";
import { digits } from "./format";
import { fullAddress, personName, primaryPhone } from "./people";

export interface ParsedImport {
  headers: string[];
  mapped: { header: string; field: string }[];
  ignored: string[];
  rows: ImportReady[];
}

export interface ImportReady {
  index: number;
  draft: ContactDraft;
  warnings: string[];
  problems: string[];
  match?: { contactId: string; reason: string };
}

const FIELD_ALIASES: Record<string, string[]> = {
  firstName: ["first name", "firstname", "contact first name", "given name"],
  lastName: ["last name", "lastname", "contact last name", "surname", "family name"],
  spouseFirst: [
    "spouse first name",
    "spouse partner first name",
    "partner first name",
    "spouse first",
  ],
  spouseLast: ["spouse last name", "spouse partner last name", "partner last name", "spouse last"],
  email: ["email", "e mail", "e mail address", "email address", "primary email", "email 1"],
  spouseEmail: ["spouse email", "email 2", "secondary email", "partner email"],
  mobile: ["mobile", "mobile phone", "cell", "cell phone", "phone", "primary phone", "phone 1"],
  homePhone: ["home phone", "home", "phone 2", "secondary phone", "other phone"],
  street: ["street", "address", "home street", "address 1", "mailing address", "mailing street"],
  city: ["city", "home city", "mailing city"],
  province: ["province", "state", "home state province", "home state", "region", "mailing state"],
  postal: ["postal", "postal code", "zip", "zip code", "home postal code", "mailing postal code"],
  birthday: ["birthday", "birth date", "date of birth", "birthdate"],
  spouseBirthday: ["spouse birthday", "spouse birth date", "partner birthday"],
  anniversary: ["anniversary", "wedding anniversary", "anniversary date"],
  moveInDate: ["move in date", "move in", "moved in", "home anniversary"],
  type: ["contact type", "type"],
  source: ["source", "original source", "original source of contact", "lead source"],
  tags: ["tags", "groups", "categories", "category"],
  agent: ["agent", "assigned agent", "assigned to", "sales rep", "realtor"],
  company: ["company", "employer", "business", "company name"],
  jobTitle: ["job title", "occupation", "title"],
  acceptMassEmail: [
    "accepts mass email",
    "mass email",
    "do not send mass emails",
    "do not mass email",
    "do not email",
    "email opt out",
  ],
  mailPreference: ["mail preference", "preferred contact method", "correspondence", "preferred mail"],
  notes: ["notes", "note", "background", "comments"],
};

function normHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fieldForHeader(header: string): { field: string; invert: boolean } | null {
  const n = normHeader(header);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(n)) return { field, invert: n.includes("do not") || n.includes("opt out") };
  }
  return null;
}

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function yes(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "yes" || v === "y" || v === "true" || v === "1" || v === "x";
}

function mapType(value: string): ContactType | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (v.includes("prospect") || v.includes("lead")) return "Prospect";
  if (v.includes("personal") || v.includes("friend") || v.includes("family")) return "Personal";
  if (v.includes("b2b") || v.includes("business") || v.includes("vendor")) return "B2B";
  if (v.includes("client")) return "Client";
  return undefined;
}

function mapMail(value: string): MailPreference | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (v.includes("both") || (v.includes("email") && v.includes("mail"))) return "Both";
  if (v.includes("do not") || v === "none" || v.includes("no market")) return "Do not market";
  if (v.includes("mail") || v.includes("post") || v.includes("letter") || v.includes("print")) return "Mail";
  if (v.includes("email") || v.includes("e-mail")) return "Email";
  return undefined;
}

function cleanEmail(value: string): { email: string; warning: string } {
  const email = value.trim();
  if (!email) return { email: "", warning: "" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { email: "", warning: `“${value.trim()}” is not an email address, so that field was left blank.` };
  }
  return { email, warning: "" };
}

export function parseImport(text: string): ParsedImport | { error: string } {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { error: "That file needs a header row and at least one person." };
  }
  const headers = table[0];
  const mapped: { header: string; field: string; invert: boolean }[] = [];
  const ignored: string[] = [];
  headers.forEach((header) => {
    const found = fieldForHeader(header);
    if (!found) {
      if (header) ignored.push(header);
      return;
    }
    if (mapped.some((m) => m.field === found.field)) return;
    mapped.push({ header, field: found.field, invert: found.invert });
  });
  if (!mapped.some((m) => m.field === "firstName") && !mapped.some((m) => m.field === "lastName")) {
    return {
      error:
        "We could not find name columns. Use headers like Contact First Name and Contact Last Name, the way a Morris or IXACT export does.",
    };
  }

  const rows: ImportReady[] = table.slice(1).map((cells, index) => {
    const get = (field: string) => {
      const col = mapped.find((m) => m.field === field);
      if (!col) return "";
      const at = headers.indexOf(col.header);
      return at >= 0 ? (cells[at] ?? "") : "";
    };
    const warnings: string[] = [];
    const problems: string[] = [];
    const firstName = get("firstName");
    const lastName = get("lastName");
    if (!firstName || !lastName) problems.push("Needs both a first name and a last name.");

    const readDate = (field: string, label: string) => {
      const raw = get(field);
      if (!raw) return "";
      const parsed = parseLooseDate(raw);
      if (!parsed) {
        warnings.push(`${label} “${raw}” was not a date we could read, so it will be left blank.`);
        return "";
      }
      return parsed;
    };

    const email = cleanEmail(get("email"));
    const spouseEmail = cleanEmail(get("spouseEmail"));
    if (email.warning) warnings.push(email.warning);
    if (spouseEmail.warning) warnings.push(spouseEmail.warning);

    const massRaw = get("acceptMassEmail");
    const massCol = mapped.find((m) => m.field === "acceptMassEmail");
    let acceptMassEmail: boolean | undefined;
    if (massRaw) {
      const flagged = yes(massRaw);
      acceptMassEmail = massCol?.invert ? !flagged : flagged;
    }

    const tags = get("tags")
      .split(/[|,;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const draft: ContactDraft = {
      firstName,
      lastName,
      spouseFirst: get("spouseFirst"),
      spouseLast: get("spouseLast"),
      email: email.email,
      spouseEmail: spouseEmail.email,
      mobile: get("mobile"),
      homePhone: get("homePhone"),
      street: get("street"),
      city: get("city"),
      province: get("province"),
      postal: get("postal"),
      birthday: readDate("birthday", "Birthday"),
      spouseBirthday: readDate("spouseBirthday", "Spouse birthday"),
      anniversary: readDate("anniversary", "Anniversary"),
      moveInDate: readDate("moveInDate", "Move-in date"),
      type: mapType(get("type")),
      source: get("source"),
      tags,
      agent: get("agent"),
      company: get("company"),
      jobTitle: get("jobTitle"),
      acceptMassEmail,
      mailPreference: mapMail(get("mailPreference")),
      notes: get("notes"),
    };

    return { index, draft, warnings, problems };
  });

  return {
    headers,
    mapped: mapped.map(({ header, field }) => ({ header, field })),
    ignored,
    rows,
  };
}

export function findDuplicate(
  db: Database,
  draft: ContactDraft,
): { contactId: string; reason: string } | undefined {
  const email = (draft.email ?? "").trim().toLowerCase();
  const phone = digits(draft.mobile ?? "");
  const name = `${draft.firstName} ${draft.lastName}`.trim().toLowerCase();
  const street = (draft.street ?? "").trim().toLowerCase();
  for (const c of db.contacts) {
    if (c.deletedAt) continue;
    if (email && c.emails.some((e) => e.address.toLowerCase() === email)) {
      return { contactId: c.id, reason: "Same email address" };
    }
    if (phone.length >= 10 && c.phones.some((p) => digits(p.number) === phone)) {
      return { contactId: c.id, reason: "Same mobile number" };
    }
    if (name && street && personName(c).toLowerCase() === name && c.street.toLowerCase() === street) {
      return { contactId: c.id, reason: "Same name and street" };
    }
  }
  return undefined;
}

export function withMatches(db: Database, parsed: ParsedImport): ParsedImport {
  return {
    ...parsed,
    rows: parsed.rows.map((row) => ({
      ...row,
      match: row.problems.length ? undefined : findDuplicate(db, row.draft),
    })),
  };
}

const EXPORT_HEADERS = [
  "Contact First Name",
  "Contact Last Name",
  "Spouse First Name",
  "Spouse Last Name",
  "E-mail Address",
  "Spouse Email",
  "Mobile Phone",
  "Home Phone",
  "Home Street",
  "Home City",
  "Home State/Province",
  "Home Postal Code",
  "Birthday",
  "Spouse Birthday",
  "Wedding Anniversary",
  "Move In Date",
  "Contact Type",
  "Original Source of Contact",
  "Categories",
  "Assigned Agent",
  "Company",
  "Job Title",
  "Do Not Send Mass Emails",
  "Mail Preference",
  "Notes",
];

function cell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function contactsToCsv(contacts: Contact[]): string {
  const lines = [EXPORT_HEADERS.join(",")];
  for (const c of contacts) {
    if (c.deletedAt) continue;
    const home = c.phones.find((p) => p.label.toLowerCase().includes("home"));
    const mobile = c.phones.find((p) => p !== home) ?? c.phones[0];
    const email = c.emails[0]?.address ?? "";
    const spouseEmail = c.emails.find((e) => e.label.toLowerCase().includes("spouse"))?.address ?? "";
    const notes = c.notes.map((n) => n.text).join(" | ");
    const values = [
      c.firstName,
      c.lastName,
      c.spouseFirst,
      c.spouseLast,
      email,
      spouseEmail,
      mobile?.number ?? primaryPhone(c),
      home?.number ?? "",
      c.street,
      c.city,
      c.province,
      c.postal,
      c.birthday,
      c.spouseBirthday,
      c.anniversary,
      c.moveInDate,
      c.type,
      c.source,
      c.tags.join("|"),
      c.agent,
      c.company,
      c.jobTitle,
      c.acceptMassEmail ? "No" : "Yes",
      c.mailPreference,
      notes,
    ];
    lines.push(values.map((v) => cell(v ?? "")).join(","));
  }
  return lines.join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function addressLine(c: Contact): string {
  return fullAddress(c);
}
