"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReportColumn } from "@/lib/reports";
import { contactMatches, personName, sortPeople } from "@/lib/people";
import type { Contact } from "@/lib/types";
import { cn } from "@/lib/utils";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Sphere`;
  }, [title]);
}

export function toastResult(res: { ok: boolean; error?: string }, success: string) {
  if (res.ok) toast.success(success);
  else toast.error(res.error || "That didn’t save.");
  return res.ok;
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl tracking-tight sm:text-3xl">{title}</h1>
        {lede ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{lede}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card/70 px-6 py-14 text-center">
      <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-4" />
      </div>
      <p className="text-base font-medium">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

const AVATAR_TONES = [
  "bg-[#e8e9f8] text-[#3d4294] dark:bg-[#2a2d4a] dark:text-[#c7cbf5]",
  "bg-[#e7f3ee] text-[#1f6b4a] dark:bg-[#1c3330] dark:text-[#b7e0cc]",
  "bg-[#f8eee6] text-[#8a4b22] dark:bg-[#3a2a22] dark:text-[#f0d0b8]",
  "bg-[#f3e8f6] text-[#6d3482] dark:bg-[#33243a] dark:text-[#e4c8ef]",
  "bg-[#e7f1f8] text-[#1e5678] dark:bg-[#1c2c38] dark:text-[#c5dff0]",
  "bg-[#f8e8ea] text-[#8a3142] dark:bg-[#3a2228] dark:text-[#f0c5cc]",
];

export function Initials({ name, className = "" }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase() || "?";
  const tone = AVATAR_TONES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium", tone, className)} aria-hidden>
      {letters}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function useSyncedDraft<T>(incoming: T) {
  const key = JSON.stringify(incoming);
  const [base, setBase] = useState(key);
  const [draft, setDraft] = useState(incoming);
  if (key !== base) {
    const untouched = JSON.stringify(draft) === base;
    setBase(key);
    if (untouched) setDraft(incoming);
  }
  const dirty = JSON.stringify(draft) !== key;
  return { draft, setDraft, dirty };
}

export function PersonLink({ id, name }: { id?: string; name: string }) {
  if (!id || !name) return <span>{name || "—"}</span>;
  return (
    <Link href={`/contacts/${id}`} className="font-medium underline-offset-2 hover:underline">
      {name}
    </Link>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: ReportColumn[];
  rows: Record<string, string>[];
  empty: string;
}) {
  if (!rows.length) return <EmptyState title={empty} body="Nothing matches this list right now." />;
  const linkable = new Set(["name", "household", "who", "person", "buyer", "seller"]);
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c.key} className="max-w-xs whitespace-normal">
                    {linkable.has(c.key) && row._contactId ? (
                      <PersonLink id={row._contactId} name={row[c.key] || ""} />
                    ) : (
                      row[c.key] || "—"
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row, i) => (
          <article key={i} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            {columns.map((c) => (
              <p key={c.key} className="mt-1 text-sm first:mt-0">
                <span className="text-muted-foreground">{c.label}: </span>
                {linkable.has(c.key) && row._contactId ? (
                  <PersonLink id={row._contactId} name={row[c.key] || ""} />
                ) : (
                  row[c.key] || "—"
                )}
              </p>
            ))}
          </article>
        ))}
      </div>
    </>
  );
}

export function PersonPicker({
  contacts,
  value,
  onChange,
  label = "Person",
}: {
  contacts: Contact[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const [q, setQ] = useState("");
  const selected = contacts.find((c) => c.id === value);
  const matches = useMemo(() => {
    return sortPeople(
      contacts.filter((c) => !c.deletedAt && contactMatches(c, q)),
      "last",
    ).slice(0, 6);
  }, [contacts, q]);
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {selected ? (
        <p className="flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <Initials name={personName(selected)} className="size-6 text-[10px]" />
            {personName(selected)}
          </span>
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onChange("")}>
            Clear
          </button>
        </p>
      ) : null}
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, phone, or email"
        aria-label={label}
      />
      {q || !selected ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No one matches.</p>
          ) : (
            matches.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                onClick={() => {
                  onChange(c.id);
                  setQ("");
                }}
              >
                <Initials name={personName(c)} className="size-6 text-[10px]" />
                <span>
                  {personName(c)}
                  <span className="text-muted-foreground"> · {c.city}</span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
