"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { contactsToCsv, downloadText, parseImport, withMatches, type ImportReady, type ParsedImport } from "@/lib/csv";
import { personName } from "@/lib/people";

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  spouseFirst: "Spouse first name",
  spouseLast: "Spouse last name",
  email: "Email",
  spouseEmail: "Spouse email",
  mobile: "Mobile",
  homePhone: "Home phone",
  street: "Street",
  city: "City",
  province: "Province",
  postal: "Postal code",
  birthday: "Birthday",
  spouseBirthday: "Spouse birthday",
  anniversary: "Anniversary",
  moveInDate: "Move-in date",
  type: "Contact type",
  source: "Original source",
  tags: "Groups",
  agent: "Agent",
  company: "Company",
  jobTitle: "Job title",
  acceptMassEmail: "Mass email",
  mailPreference: "Mail preference",
  notes: "Notes",
};

export default function ImportPage() {
  const { db, act } = useOffice();
  usePageTitle("Import and export");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "skip" | "import" | "fill">>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (!db) return null;
  const office = db;

  async function loadText(text: string) {
    setMessage("");
    setError("");
    const result = parseImport(text);
    if ("error" in result) {
      setParsed(null);
      setError(result.error);
      return;
    }
    const matched = withMatches(office, result);
    const next: Record<string, "skip" | "import" | "fill"> = {};
    for (const row of matched.rows) {
      if (row.problems.length) next[String(row.index)] = "skip";
      else if (row.match) next[String(row.index)] = "fill";
      else next[String(row.index)] = "import";
    }
    setDecisions(next);
    setParsed(matched);
  }

  async function onFile(file: File) {
    await loadText(await file.text());
  }

  const ready = parsed?.rows.filter((r) => !r.problems.length && decisions[String(r.index)] === "import").length ?? 0;
  const fills = parsed?.rows.filter((r) => r.match && decisions[String(r.index)] === "fill").length ?? 0;
  const skips = parsed?.rows.filter((r) => decisions[String(r.index)] === "skip" || r.problems.length).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Import and export"
        title="Bring in a Morris or IXACT spreadsheet"
        lede="You’ll see possible matches before anyone is added. People who asked not to get mass email stay opted out if that column is in the file."
      />
      <section className="mb-6 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl text-foreground">Export the book</h2>
        <p className="mt-1 text-sm text-muted-foreground">Downloads everyone who is not in the recycle bin, using column names a Morris-style file would recognize.</p>
        <Button className="mt-3" variant="outline" onClick={() => downloadText("sphere-people.csv", contactsToCsv(db.contacts))}>
          Download people
        </Button>
      </section>
      <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl text-foreground">Import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use a CSV with headers such as Contact First Name, Contact Last Name, E-mail Address, Mobile Phone, and Do Not Send Mass Emails.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/practice-import.csv" download>
              Download a practice file
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const res = await fetch("/practice-import.csv");
              await loadText(await res.text());
            }}
          >
            Try the practice file
          </Button>
        </div>
        <label className="mt-4 block text-sm font-medium text-foreground">
          Or choose a file from your computer
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-2 block w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
        {error ? <p className="mt-3 text-sm text-brand">{error}</p> : null}
      </section>

      {parsed ? (
        <section className="mt-6 space-y-4">
          <div className="rounded-2xl bg-secondary/70 p-4 text-sm">
            <p className="font-medium text-foreground">We matched {parsed.mapped.length} columns.</p>
            <ul className="mt-2 space-y-1">
              {parsed.mapped.map((m) => (
                <li key={m.field}>
                  {FIELD_LABELS[m.field] ?? m.field} ← {m.header}
                </li>
              ))}
            </ul>
            {parsed.ignored.length ? <p className="mt-2">Left out: {parsed.ignored.join(", ")}</p> : null}
          </div>
          <p className="text-sm">
            Ready to add {ready}. Fill blanks on {fills}. Skip {skips}.
          </p>
          {parsed.rows.map((row) => (
            <ReviewCard
              key={row.index}
              row={row}
              existing={row.match ? db.contacts.find((c) => c.id === row.match?.contactId) : undefined}
              decision={decisions[String(row.index)] ?? "skip"}
              onChange={(decision) => setDecisions({ ...decisions, [String(row.index)]: decision })}
            />
          ))}
          <Button
            onClick={async () => {
              const res = await act({
                type: "importContacts",
                rows: parsed.rows.map((r) => ({ index: r.index, draft: r.draft, problems: r.problems })),
                decisions,
              });
              if (res.ok && res.result) {
                setMessage(`Added ${res.result.added}, filled blanks on ${res.result.filled}, skipped ${res.result.skipped}.`);
                setParsed(null);
                toastResult(res, "Import finished");
              } else toastResult(res, "Import finished");
            }}
          >
            Confirm import
          </Button>
        </section>
      ) : null}
      {message ? <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm">{message}</p> : null}
    </div>
  );
}

function ReviewCard({
  row,
  existing,
  decision,
  onChange,
}: {
  row: ImportReady;
  existing?: { firstName: string; lastName: string; city: string; emails: { address: string }[] };
  decision: "skip" | "import" | "fill";
  onChange: (d: "skip" | "import" | "fill") => void;
}) {
  const draft = row.draft;
  return (
    <article className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="font-medium text-foreground">
        {draft.firstName || "No first name"} {draft.lastName}
      </p>
      <p className="text-sm text-muted-foreground">
        {draft.email || "No email"} · {draft.mobile || "No mobile"} · {draft.city || "No city"}
      </p>
      {row.problems.map((p) => (
        <p key={p} className="mt-1 text-sm text-brand">{p}</p>
      ))}
      {row.warnings.map((w) => (
        <p key={w} className="mt-1 text-sm text-amber-800">{w}</p>
      ))}
      {row.match && existing ? (
        <p className="mt-2 text-sm">
          Possible match: {personName(existing)} in {existing.city}. {row.match.reason}.
        </p>
      ) : null}
      {row.problems.length ? null : (
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {row.match ? (
            <label className="flex items-center gap-2">
              <input type="radio" checked={decision === "fill"} onChange={() => onChange("fill")} />
              Fill blanks
            </label>
          ) : null}
          <label className="flex items-center gap-2">
            <input type="radio" checked={decision === "import"} onChange={() => onChange("import")} />
            Add as a new person
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={decision === "skip"} onChange={() => onChange("skip")} />
            Skip
          </label>
        </div>
      )}
    </article>
  );
}
