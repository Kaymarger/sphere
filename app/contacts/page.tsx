"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Initials, PageHeader, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { LETTERS, contactMatches, letterOf, personName, primaryEmail, primaryPhone, sortPeople } from "@/lib/people";

function ContactsInner() {
  const { db } = useOffice();
  const params = useSearchParams();
  const router = useRouter();
  usePageTitle("People");
  const q = params.get("q") ?? "";
  const letter = params.get("letter") ?? "All";
  const sort = params.get("sort") === "first" ? "first" : "last";
  const tag = params.get("tag") ?? "all";
  const agent = params.get("agent") ?? "all";
  const type = params.get("type") ?? "all";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  const setMany = (entries: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(entries)) {
      if (!value || value === "all" || value === "All") next.delete(key);
      else next.set(key, value);
    }
    if (!keepPage) next.delete("page");
    const query = next.toString();
    router.replace(query ? `/contacts?${query}` : "/contacts");
  };
  const set = (key: string, value: string) => setMany({ [key]: value }, key === "page");

  const filtered = useMemo(() => {
    if (!db) return [];
    let list = db.contacts.filter((c) => !c.deletedAt && contactMatches(c, q));
    if (tag !== "all") list = list.filter((c) => c.tags.includes(tag));
    if (agent !== "all") list = list.filter((c) => c.agent === agent);
    if (type !== "all") list = list.filter((c) => c.type === type);
    list = sortPeople(list, sort);
    return list;
  }, [db, q, tag, agent, type, sort]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      const L = letterOf(c, sort);
      map.set(L, (map.get(L) ?? 0) + 1);
    }
    return map;
  }, [filtered, sort]);

  const shown = letter === "All" ? filtered : filtered.filter((c) => letterOf(c, sort) === letter);
  const pageSize = 40;
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const safePage = Math.min(page, pages);
  const slice = shown.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (!db) return null;

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title={`${filtered.length} in the book`}
        lede="Search, jump by letter, or filter by group. Open someone to see the short cards instead of one long form."
      >
        <Button asChild>
          <Link href="/contacts/new">Add a person</Link>
        </Button>
      </PageHeader>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <FilterChip on={tag === "all" && type === "all"} onClick={() => setMany({ tag: "all", type: "all" })}>
          Everyone
        </FilterChip>
        {db.settings.groups.map((group) => (
          <FilterChip key={group} on={tag === group} onClick={() => set("tag", tag === group ? "all" : group)}>
            {group}
          </FilterChip>
        ))}
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
        <Input
          value={q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Name, phone, email, street, or group"
          aria-label="Filter people"
        />
        <Choice value={sort} onChange={(v) => set("sort", v)} options={[["last", "Sort by last name"], ["first", "Sort by first name"]]} />
        <Choice
          value={agent}
          onChange={(v) => set("agent", v)}
          options={[["all", "All agents"], ...db.settings.agents.map((a) => [a, a] as [string, string])]}
        />
        <Choice
          value={type}
          onChange={(v) => set("type", v)}
          options={[
            ["all", "All types"],
            ["Client", "Client"],
            ["Prospect", "Prospect"],
            ["Personal", "Personal"],
            ["B2B", "B2B"],
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="flex gap-1 overflow-x-auto md:flex-col">
          <LetterButton on={letter === "All"} onClick={() => set("letter", "All")}>
            All
          </LetterButton>
          {LETTERS.map((L) => (
            <LetterButton key={L} on={letter === L} disabled={!counts.get(L)} onClick={() => set("letter", L)}>
              {L}
            </LetterButton>
          ))}
        </div>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Showing {slice.length} of {shown.length}
            {letter !== "All" ? ` under ${letter}` : ""}
          </p>
          {slice.length === 0 ? (
            <EmptyState title="No one matches" body="Try a last name, a phone number, or a group like Buyer." />
          ) : (
            <ul className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
              {slice.map((c) => (
                <li key={c.id} className="border-b last:border-b-0">
                  <Link href={`/contacts/${c.id}`} className="grid gap-1 px-4 py-3 transition-colors hover:bg-muted/70 md:grid-cols-[1.4fr_0.9fr_1.1fr_0.7fr] md:items-center">
                    <div className="flex items-start gap-3">
                      <Initials name={personName(c)} />
                      <div>
                      <p className="font-medium">{personName(c)}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.spouseFirst ? `and ${c.spouseFirst} · ` : ""}
                        {c.type} · {c.agent}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                            {t}
                          </span>
                        ))}
                      </div>
                      </div>
                    </div>
                    <p className="text-sm">{primaryPhone(c) || "No phone"}</p>
                    <p className="truncate text-sm text-muted-foreground">{primaryEmail(c) || "No email"}</p>
                    <p className="text-sm">{c.city}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 ? (
            <div className="mt-3 flex items-center justify-between">
              <Button variant="outline" disabled={safePage <= 1} onClick={() => set("page", String(safePage - 1))}>
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                Page {safePage} of {pages}
              </p>
              <Button variant="outline" disabled={safePage >= pages} onClick={() => set("page", String(safePage + 1))}>
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${on ? "bg-foreground text-background" : "bg-card text-foreground ring-1 ring-foreground/10"}`}
    >
      {children}
    </button>
  );
}

function LetterButton({
  on,
  disabled,
  onClick,
  children,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`grid size-8 shrink-0 place-items-center rounded-md text-sm ${on ? "bg-brand text-white" : "text-foreground hover:bg-secondary"} disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

function Choice({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full md:w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Opening the book…</p>}>
      <ContactsInner />
    </Suspense>
  );
}
