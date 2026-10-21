"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, PageHeader, PersonLink, PersonPicker, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { addDays, daysInMonth, monthLabel, weekdayIndex } from "@/lib/dates";
import { buildTouches, bucketTouches } from "@/lib/keep-in-touch";
import { isOpen, personName } from "@/lib/people";
import type { CalEvent } from "@/lib/types";

export default function CalendarPage() {
  const { db, today, act } = useOffice();
  usePageTitle("Calendar");
  const [cursor, setCursor] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [kind, setKind] = useState<CalEvent["kind"]>("Appointment");
  const [notes, setNotes] = useState("");
  const [contactId, setContactId] = useState("");
  const year = Number(cursor.slice(0, 4));
  const month = Number(cursor.slice(5, 7));

  const items = useMemo(() => {
    if (!db) return new Map<string, { label: string; tone: string }[]>();
    const map = new Map<string, { label: string; tone: string }[]>();
    const add = (day: string, label: string, tone: string) => {
      const list = map.get(day) ?? [];
      list.push({ label, tone });
      map.set(day, list);
    };
    db.events.filter(isOpen).forEach((e) => add(e.date, e.title, "bg-foreground"));
    db.tasks.filter((t) => isOpen(t) && !t.done).forEach((t) => add(t.due, t.title, "bg-brand"));
    const touches = bucketTouches(buildTouches(db, today), db.touches, today);
    [...touches.overdue, ...touches.today, ...touches.week, ...touches.upcoming].forEach((t) => add(t.date, t.title, "bg-amber-700"));
    return map;
  }, [db, today]);

  if (!db) return null;
  const firstDow = weekdayIndex(`${cursor}-01`);
  const lead = (firstDow + 6) % 7;
  const days = daysInMonth(year, month);
  const cells: Array<string | null> = [...Array(lead).fill(null)];
  for (let d = 1; d <= days; d++) cells.push(`${cursor}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);

  const dayEvents = db.events.filter((e) => isOpen(e) && e.date === selected);
  const dayTasks = db.tasks.filter((t) => isOpen(t) && !t.done && t.due === selected);
  const dayTouches = [...bucketTouches(buildTouches(db, today), db.touches, today).overdue, ...bucketTouches(buildTouches(db, today), db.touches, today).today, ...bucketTouches(buildTouches(db, today), db.touches, today).week, ...bucketTouches(buildTouches(db, today), db.touches, today).upcoming].filter((t) => t.date === selected);

  const shift = (delta: number) => {
    const next = addDays(`${cursor}-01`, delta > 0 ? 32 : -2).slice(0, 7);
    setCursor(delta > 0 ? addDays(`${cursor}-01`, 32).slice(0, 7) : next);
  };

  return (
    <div>
      <PageHeader eyebrow="Calendar" title={monthLabel(year, month)} lede="Appointments, tasks, and keep-in-touch reminders on one month.">
        <Button variant="outline" onClick={() => shift(-1)}>
          Previous
        </Button>
        <Button variant="outline" onClick={() => { setCursor(today.slice(0, 7)); setSelected(today); }}>
          This month
        </Button>
        <Button variant="outline" onClick={() => shift(1)}>
          Next
        </Button>
        <Button
          onClick={() => {
            setDate(selected);
            setOpen(true);
          }}
        >
          Add appointment
        </Button>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          <div className="grid grid-cols-7 border-b text-center text-xs text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => (
              <button
                key={i}
                type="button"
                disabled={!day}
                onClick={() => day && setSelected(day)}
                className={`min-h-16 border-t border-r p-1 text-left md:min-h-24 ${day === selected ? "bg-secondary" : ""} ${day === today ? "ring-1 ring-brand ring-inset" : ""}`}
              >
                {day ? (
                  <>
                    <span className="text-xs">{Number(day.slice(8))}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {(items.get(day) ?? []).slice(0, 3).map((dot, n) => (
                        <span key={n} className={`size-1.5 rounded-full ${dot.tone}`} />
                      ))}
                    </span>
                  </>
                ) : null}
              </button>
            ))}
          </div>
        </div>
        <aside className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-heading text-xl text-foreground">{selected === today ? "Today" : selected}</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {dayEvents.map((e) => (
              <li key={e.id}>
                <p className="font-medium">{e.time} · {e.title}</p>
                <p className="text-muted-foreground">{e.kind}{e.contactId ? ` · ${personName(db.contacts.find((c) => c.id === e.contactId) || { firstName: "", lastName: "" })}` : ""}</p>
                <button type="button" className="text-brand" onClick={() => void act({ type: "deleteEvents", ids: [e.id] })}>
                  Remove
                </button>
              </li>
            ))}
            {dayTasks.map((t) => (
              <li key={t.id}>
                <p className="font-medium">Task · {t.title}</p>
                {t.contactId ? <PersonLink id={t.contactId} name={personName(db.contacts.find((c) => c.id === t.contactId) || { firstName: "", lastName: "" })} /> : null}
              </li>
            ))}
            {dayTouches.map((t) => (
              <li key={t.key}>
                <p className="font-medium">Reminder · {t.title}</p>
                <p className="text-muted-foreground">{t.kind}</p>
              </li>
            ))}
            {dayEvents.length + dayTasks.length + dayTouches.length === 0 ? <li className="text-muted-foreground">Nothing on this day.</li> : null}
          </ul>
        </aside>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Navy dots are appointments. Red dots are tasks. Gold dots are reminders.</p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add an appointment</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await act({ type: "createEvent", title, date, time, kind, notes, contactId });
              if (toastResult(res, "Appointment added")) {
                setOpen(false);
                setTitle("");
                setNotes("");
                setSelected(date);
                setCursor(date.slice(0, 7));
              }
            }}
          >
            <Field label="What">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field label="Time">
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
            </div>
            <Field label="Kind">
              <Select value={kind} onValueChange={(v) => setKind(v as CalEvent["kind"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Appointment", "Showing", "Open house", "Office", "Personal"].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <PersonPicker contacts={db.contacts} value={contactId} onChange={setContactId} />
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-card" />
            </Field>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
