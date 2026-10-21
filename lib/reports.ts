import type { Database } from "./types";
import { addDays, annualOccurrence, longDate, monthName, shortDate } from "./dates";
import { money } from "./format";
import { fullAddress, householdLabel, isOpen, personName, primaryEmail, primaryPhone } from "./people";

export interface ReportLink {
  slug: string;
  group: string;
  title: string;
  blurb: string;
  filter: "none" | "annual" | "calendar";
}

export const REPORTS: ReportLink[] = [
  { slug: "card-list", group: "People", title: "Card list", blurb: "A compact card for each person: name, phone, email, and address.", filter: "none" },
  { slug: "phone-list", group: "People", title: "Phone list", blurb: "Everyone with a phone number, ready to work through.", filter: "none" },
  { slug: "mailing-list", group: "People", title: "Mailing list", blurb: "People who accept mail and have a street address.", filter: "none" },
  { slug: "birthday-list", group: "People", title: "Birthday list", blurb: "Birthdays, spouse birthdays, and children’s birthdays.", filter: "annual" },
  { slug: "purchase-anniversaries", group: "People", title: "Purchase anniversaries", blurb: "The month they bought, so you can send a note.", filter: "annual" },
  { slug: "move-in-anniversaries", group: "People", title: "Move-in anniversaries", blurb: "Home anniversaries from the move-in date.", filter: "annual" },
  { slug: "no-mass-email", group: "People", title: "No mass email", blurb: "People who asked not to receive mass email.", filter: "none" },
  { slug: "directory", group: "People", title: "Business directory", blurb: "A printable list of the vendors you keep on file.", filter: "none" },
  { slug: "source-summary", group: "Where people came from", title: "Source summary", blurb: "How many people came from each source.", filter: "none" },
  { slug: "referral-history", group: "Where people came from", title: "Referral history", blurb: "Who referred whom, and how it turned out.", filter: "none" },
  { slug: "outstanding-tasks", group: "Tasks and calendar", title: "Outstanding tasks", blurb: "Tasks that are not done yet, oldest first.", filter: "none" },
  { slug: "appointments", group: "Tasks and calendar", title: "Appointment summary", blurb: "Showings, meetings, and open houses in a month.", filter: "calendar" },
  { slug: "active-business", group: "Active business", title: "Active listings", blurb: "Listings that are still on the go.", filter: "none" },
  { slug: "active-buyers", group: "Active business", title: "Active buyers", blurb: "Buyers you are working with right now.", filter: "none" },
  { slug: "transactions", group: "Active business", title: "Transaction summary", blurb: "Deals by status, with prices and close dates.", filter: "none" },
];

export function reportBySlug(slug: string): ReportLink | undefined {
  return REPORTS.find((r) => r.slug === slug);
}

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportOutput {
  title: string;
  description: string;
  columns: ReportColumn[];
  rows: Record<string, string>[];
  note?: string;
}

function annualHit(source: string, mode: string, today: string): boolean {
  if (!source) return false;
  if (mode === "all") return true;
  if (mode === "next") return annualOccurrence(source, today, 0, 30) !== null;
  return source.slice(5, 7) === mode;
}

export function runReport(db: Database, slug: string, today: string, mode: string): ReportOutput | null {
  const meta = reportBySlug(slug);
  if (!meta) return null;
  const contacts = db.contacts.filter(isOpen);
  const nameOf = (id: string) => {
    const c = db.contacts.find((p) => p.id === id);
    return c ? personName(c) : "";
  };

  if (slug === "card-list") {
    return {
      title: meta.title,
      description: meta.blurb,
      columns: [
        { key: "name", label: "Name" },
        { key: "spouse", label: "Spouse" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "address", label: "Address" },
        { key: "agent", label: "Agent" },
        { key: "groups", label: "Groups" },
      ],
      rows: contacts.map((c) => ({
        _contactId: c.id,
        name: personName(c),
        spouse: c.spouseFirst ? `${c.spouseFirst} ${c.spouseLast || c.lastName}`.trim() : "",
        phone: primaryPhone(c),
        email: primaryEmail(c),
        address: fullAddress(c),
        agent: c.agent,
        groups: c.tags.join(", "),
      })),
    };
  }

  if (slug === "phone-list") {
    const rows = contacts
      .filter((c) => c.phones.length > 0)
      .map((c) => ({
        _contactId: c.id,
        name: personName(c),
        phone: c.phones.map((p) => `${p.label}: ${p.number}`).join(" · "),
        email: primaryEmail(c),
        type: c.type,
        agent: c.agent,
      }));
    return {
      title: meta.title,
      description: meta.blurb,
      columns: [
        { key: "name", label: "Name" },
        { key: "phone", label: "Phones" },
        { key: "email", label: "Email" },
        { key: "type", label: "Type" },
        { key: "agent", label: "Agent" },
      ],
      rows,
    };
  }

  if (slug === "mailing-list") {
    const rows = contacts
      .filter((c) => (c.mailPreference === "Mail" || c.mailPreference === "Both") && c.street)
      .map((c) => ({
        _contactId: c.id,
        name: c.envelopeLine || householdLabel(c),
        street: c.street,
        city: c.city,
        province: c.province,
        postal: c.postal,
        preference: c.mailPreference,
      }));
    return {
      title: meta.title,
      description: meta.blurb,
      note: `${rows.length} people can take a letter or a card.`,
      columns: [
        { key: "name", label: "Envelope name" },
        { key: "street", label: "Street" },
        { key: "city", label: "City" },
        { key: "province", label: "Province" },
        { key: "postal", label: "Postal code" },
        { key: "preference", label: "Preference" },
      ],
      rows,
    };
  }

  if (slug === "birthday-list") {
    const rows: Record<string, string>[] = [];
    for (const c of contacts) {
      const add = (who: string, date: string, kind: string) => {
        if (!annualHit(date, mode, today)) return;
        const occ = annualOccurrence(date, today, 0, 370) ?? `${today.slice(0, 4)}-${date.slice(5, 10)}`;
        rows.push({
          _contactId: c.id,
          _sort: occ.slice(5),
          name: personName(c),
          who,
          kind,
          date: longDate(occ),
          mail: c.mailPreference,
        });
      };
      add(personName(c), c.birthday, "Birthday");
      if (c.spouseFirst) add(c.spouseFirst, c.spouseBirthday, "Spouse");
      c.children.forEach((child) => add(child.name, child.birthday, "Child"));
    }
    rows.sort((a, b) => (a._sort ?? "").localeCompare(b._sort ?? ""));
    return {
      title: meta.title,
      description: meta.blurb,
      columns: [
        { key: "date", label: "Date" },
        { key: "who", label: "Who" },
        { key: "kind", label: "Kind" },
        { key: "name", label: "Household" },
        { key: "mail", label: "Mail preference" },
      ],
      rows,
    };
  }

  if (slug === "purchase-anniversaries" || slug === "move-in-anniversaries") {
    const rows: Record<string, string>[] = [];
    for (const c of contacts) {
      if (slug === "move-in-anniversaries") {
        if (!annualHit(c.moveInDate, mode, today)) continue;
        rows.push({
          _contactId: c.id,
          name: personName(c),
          date: longDate(c.moveInDate),
          address: c.street,
          city: c.city,
          agent: c.agent,
        });
      } else {
        for (const property of c.properties) {
          if (property.role !== "Bought" || !annualHit(property.date, mode, today)) continue;
          rows.push({
            _contactId: c.id,
            name: personName(c),
            date: longDate(property.date),
            address: property.address,
            city: property.city,
            price: money(property.price),
          });
        }
      }
    }
    return {
      title: meta.title,
      description: meta.blurb,
      columns:
        slug === "move-in-anniversaries"
          ? [
              { key: "name", label: "Name" },
              { key: "date", label: "Moved in" },
              { key: "address", label: "Street" },
              { key: "city", label: "City" },
              { key: "agent", label: "Agent" },
            ]
          : [
              { key: "name", label: "Name" },
              { key: "date", label: "Purchased" },
              { key: "address", label: "Property" },
              { key: "city", label: "City" },
              { key: "price", label: "Price" },
            ],
      rows,
    };
  }

  if (slug === "no-mass-email") {
    const rows = contacts
      .filter((c) => !c.acceptMassEmail)
      .map((c) => ({
        _contactId: c.id,
        name: personName(c),
        email: primaryEmail(c),
        preference: c.mailPreference,
        agent: c.agent,
        groups: c.tags.join(", "),
      }));
    return {
      title: meta.title,
      description: "These people stay out of every mass email, even if they are in a group you pick.",
      note: `${rows.length} people are opted out.`,
      columns: [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "preference", label: "Mail preference" },
        { key: "agent", label: "Agent" },
        { key: "groups", label: "Groups" },
      ],
      rows,
    };
  }

  if (slug === "directory") {
    return {
      title: meta.title,
      description: meta.blurb,
      columns: [
        { key: "name", label: "Name" },
        { key: "company", label: "Company" },
        { key: "category", label: "Category" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "city", label: "City" },
      ],
      rows: db.vendors.filter(isOpen).map((v) => ({
        name: v.name,
        company: v.company,
        category: v.category,
        phone: v.phone,
        email: v.email,
        city: v.city,
      })),
    };
  }

  if (slug === "source-summary") {
    const rows: Record<string, string>[] = [];
    const addGroup = (kind: string, pairs: [string, number][]) => {
      const total = pairs.reduce((s, [, n]) => s + n, 0) || 1;
      pairs
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
          rows.push({
            kind,
            name,
            count: String(count),
            share: `${Math.round((count / total) * 100)}%`,
          });
        });
    };
    const sources = new Map<string, number>();
    const types = new Map<string, number>();
    contacts.forEach((c) => {
      sources.set(c.source || "Not set", (sources.get(c.source || "Not set") ?? 0) + 1);
      types.set(c.type, (types.get(c.type) ?? 0) + 1);
    });
    addGroup("Where they came from", [...sources.entries()]);
    addGroup("Contact type", [...types.entries()]);
    return {
      title: meta.title,
      description: meta.blurb,
      columns: [
        { key: "kind", label: "Group" },
        { key: "name", label: "Name" },
        { key: "count", label: "People" },
        { key: "share", label: "Share" },
      ],
      rows,
    };
  }

  if (slug === "referral-history") {
    const rows: Record<string, string>[] = [];
    for (const c of contacts) {
      for (const r of c.referrals) {
        rows.push({
          _contactId: c.id,
          date: shortDate(r.at.slice(0, 10)),
          household: personName(c),
          side: r.side,
          who: r.name,
          kind: r.kind,
          status: r.status,
          notes: r.notes,
        });
      }
    }
    rows.sort((a, b) => b.date.localeCompare(a.date));
    return {
      title: meta.title,
      description: meta.blurb,
      columns: [
        { key: "date", label: "Date" },
        { key: "household", label: "In the book" },
        { key: "side", label: "Direction" },
        { key: "who", label: "Other person" },
        { key: "kind", label: "Kind" },
        { key: "status", label: "Status" },
        { key: "notes", label: "Notes" },
      ],
      rows,
    };
  }

  if (slug === "outstanding-tasks") {
    const rows = db.tasks
      .filter((t) => isOpen(t) && !t.done)
      .sort((a, b) => a.due.localeCompare(b.due))
      .map((t) => ({
        _contactId: t.contactId,
        due: longDate(t.due),
        task: t.title,
        kind: t.kind,
        person: nameOf(t.contactId),
        notes: t.notes,
      }));
    return {
      title: meta.title,
      description: meta.blurb,
      columns: [
        { key: "due", label: "Due" },
        { key: "task", label: "Task" },
        { key: "kind", label: "Kind" },
        { key: "person", label: "Person" },
        { key: "notes", label: "Notes" },
      ],
      rows,
    };
  }

  if (slug === "appointments") {
    const month = mode.length === 7 ? mode : today.slice(0, 7);
    const rows = db.events
      .filter((e) => isOpen(e) && e.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .map((e) => ({
        _contactId: e.contactId,
        when: `${longDate(e.date)} · ${e.time}`,
        title: e.title,
        kind: e.kind,
        person: nameOf(e.contactId),
        notes: e.notes,
      }));
    return {
      title: meta.title,
      description: meta.blurb,
      note: monthName(Number(month.slice(5, 7))) + " " + month.slice(0, 4),
      columns: [
        { key: "when", label: "When" },
        { key: "title", label: "Appointment" },
        { key: "kind", label: "Kind" },
        { key: "person", label: "Person" },
        { key: "notes", label: "Notes" },
      ],
      rows,
    };
  }

  if (slug === "active-business") {
    const rows = db.listings.filter(isOpen).map((l) => ({
      _contactId: l.contactId,
      address: l.address,
      city: l.city,
      status: l.status,
      price: money(l.price),
      type: l.propertyType,
      agent: l.agent,
      listed: shortDate(l.listDate),
      seller: nameOf(l.contactId),
    }));
    return {
      title: meta.title,
      description: meta.blurb,
      columns: [
        { key: "address", label: "Address" },
        { key: "city", label: "City" },
        { key: "status", label: "Status" },
        { key: "price", label: "Price" },
        { key: "type", label: "Type" },
        { key: "agent", label: "Agent" },
        { key: "listed", label: "Listed" },
        { key: "seller", label: "Seller" },
      ],
      rows,
    };
  }

  if (slug === "active-buyers") {
    const rows = db.buyers
      .filter(isOpen)
      .filter((b) => b.status !== "Paused")
      .map((b) => ({
        _contactId: b.contactId,
        name: nameOf(b.contactId),
        status: b.status,
        areas: b.areas,
        budget: b.budget,
        beds: b.beds,
        approved: b.preapproved ? "Yes" : "Not yet",
        agent: b.agent,
      }));
    return {
      title: meta.title,
      description: meta.blurb,
      columns: [
        { key: "name", label: "Buyer" },
        { key: "status", label: "Status" },
        { key: "areas", label: "Areas" },
        { key: "budget", label: "Budget" },
        { key: "beds", label: "Beds" },
        { key: "approved", label: "Pre-approved" },
        { key: "agent", label: "Agent" },
      ],
      rows,
    };
  }

  if (slug === "transactions") {
    const deals = db.deals.filter(isOpen);
    const closed = deals.filter((d) => d.status === "Closed");
    const volume = closed.reduce((s, d) => s + d.price, 0);
    const rows = [...deals]
      .sort((a, b) => b.closeDate.localeCompare(a.closeDate))
      .map((d) => ({
        _contactId: d.contactIds[0] ?? "",
        address: d.address,
        city: d.city,
        side: d.side,
        status: d.status,
        price: money(d.price),
        close: longDate(d.closeDate),
        agent: d.agent,
        people: d.contactIds.map(nameOf).filter(Boolean).join(", "),
      }));
    return {
      title: meta.title,
      description: meta.blurb,
      note: `${closed.length} closed · ${money(volume)} in closed volume · ${deals.filter((d) => d.status === "Firm" || d.status === "Conditional").length} still in play`,
      columns: [
        { key: "address", label: "Address" },
        { key: "side", label: "Side" },
        { key: "status", label: "Status" },
        { key: "price", label: "Price" },
        { key: "close", label: "Close date" },
        { key: "agent", label: "Agent" },
        { key: "people", label: "People" },
      ],
      rows,
    };
  }

  return null;
}

export function rowsToCsv(columns: ReportColumn[], rows: Record<string, string>[]): string {
  const head = columns.map((c) => c.label).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const value = row[c.key] ?? "";
        return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
      })
      .join(","),
  );
  return [head, ...body].join("\n");
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return dt.toISOString().slice(0, 7);
}

export function upcomingWindow(today: string): string {
  return `${shortDate(today)} – ${shortDate(addDays(today, 30))}`;
}
