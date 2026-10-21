"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, Initials, PageHeader, PersonLink, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { addDays, whenLabel } from "@/lib/dates";
import { bucketTouches, buildTouches, type TouchItem, type TouchKind } from "@/lib/keep-in-touch";
import { personName } from "@/lib/people";

const KINDS: Array<TouchKind | "All"> = [
  "All",
  "Birthday",
  "Spouse birthday",
  "Child birthday",
  "Wedding anniversary",
  "Move-in anniversary",
  "Purchase anniversary",
  "Holiday",
];

export default function KeepInTouchPage() {
  const { db, today, act } = useOffice();
  usePageTitle("Keep in Touch");
  const [bucket, setBucket] = useState<"overdue" | "today" | "week" | "upcoming">("overdue");
  const [kind, setKind] = useState<TouchKind | "All">("All");
  const [picked, setPicked] = useState<string[]>([]);
  const data = useMemo(() => {
    if (!db) return null;
    return bucketTouches(buildTouches(db, today), db.touches, today);
  }, [db, today]);
  if (!db || !data) return null;

  const tabs = [
    ["overdue", "Overdue", data.overdue.length],
    ["today", "Today", data.today.length],
    ["week", "This week", data.week.length],
    ["upcoming", "Coming up", data.upcoming.length],
  ] as const;
  const list = data[bucket].filter((item) => kind === "All" || item.kind === kind);

  async function snooze(keys: string[], days: number) {
    const res = await act({ type: "snoozeTouches", keys, until: addDays(today, days) });
    if (toastResult(res, days === 1 ? "Snoozed until tomorrow" : `Snoozed for ${days} days`)) setPicked([]);
  }
  async function dismiss(keys: string[]) {
    const res = await act({ type: "dismissTouches", keys });
    if (toastResult(res, keys.length === 1 ? "Hidden for this year" : `Hid ${keys.length} reminders`)) setPicked([]);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Keep in Touch"
        title="Who needs a note"
        lede="Birthdays, move-in dates, purchase anniversaries, and office holidays. Hide the ones you have already handled so they don’t pile up."
      />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setBucket(key);
              setPicked([]);
            }}
            className={`rounded-2xl px-3 py-3 text-left ring-1 ring-foreground/10 ${bucket === key ? "bg-foreground text-background" : "bg-card"}`}
          >
            <span className="block text-sm">{label}</span>
            <span className="font-heading text-3xl">{count}</span>
          </button>
        ))}
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {KINDS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setKind(item)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${kind === item ? "bg-brand text-white" : "bg-card ring-1 ring-foreground/10"}`}
          >
            {item === "All" ? "All kinds" : item}
          </button>
        ))}
      </div>
      {picked.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-secondary px-3 py-3">
          <span className="text-sm">{picked.length} selected</span>
          <Button size="sm" variant="outline" onClick={() => void dismiss(picked)}>
            Hide selected
          </Button>
          <Button size="sm" variant="outline" onClick={() => void snooze(picked, 3)}>
            Snooze 3 days
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPicked([])}>
            Clear selection
          </Button>
        </div>
      ) : null}
      {list.length === 0 ? (
        <EmptyState
          title={bucket === "overdue" ? "Nothing overdue" : "Nothing in this list"}
          body="Try another day, or another kind of reminder."
        />
      ) : (
        <ul className="space-y-2">
          <li className="flex items-center gap-3 px-2 text-sm text-muted-foreground">
            <Checkbox
              checked={list.length > 0 && list.every((item) => picked.includes(item.key))}
              onCheckedChange={(v) => setPicked(v === true ? list.map((item) => item.key) : [])}
              aria-label="Select all in this list"
            />
            Select all in this list
          </li>
          {list.map((item) => (
            <TouchRow
              key={item.key}
              item={item}
              today={today}
              checked={picked.includes(item.key)}
              onCheck={(on) => setPicked(on ? [...picked, item.key] : picked.filter((k) => k !== item.key))}
              onSnooze={(days) => void snooze([item.key], days)}
              onDismiss={() => void dismiss([item.key])}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TouchRow({
  item,
  today,
  checked,
  onCheck,
  onSnooze,
  onDismiss,
}: {
  item: TouchItem;
  today: string;
  checked: boolean;
  onCheck: (on: boolean) => void;
  onSnooze: (days: number) => void;
  onDismiss: () => void;
}) {
  const { db } = useOffice();
  const person = item.contactId ? db?.contacts.find((c) => c.id === item.contactId) : undefined;
  return (
    <li className="flex gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40">
      <Checkbox checked={checked} onCheckedChange={(v) => onCheck(v === true)} aria-label={`Select ${item.title}`} />
      <Initials name={person ? personName(person) : item.kind} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium text-foreground">
            {item.contactId ? <PersonLink id={item.contactId} name={item.title} /> : item.title}
          </p>
          <p className={`text-sm ${item.date < today ? "font-medium text-brand" : "text-muted-foreground"}`}>
            {whenLabel(item.date, today)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{item.kind}</p>
        <p className="mt-1 text-sm">{item.detail}</p>
        <p className="mt-1 text-sm text-foreground">{item.action}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Snooze
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onSnooze(1)}>Tomorrow</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(3)}>In 3 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(7)}>Next week</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Hide this year
          </Button>
        </div>
      </div>
    </li>
  );
}
