"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Field, PageHeader, PersonLink, PersonPicker, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { whenLabel } from "@/lib/dates";
import { isOpen, personName } from "@/lib/people";
import type { Task } from "@/lib/types";

function TasksInner() {
  const { db, today, act } = useOffice();
  const params = useSearchParams();
  usePageTitle("Tasks");
  const [filter, setFilter] = useState<"open" | "today" | "overdue" | "done">("open");
  const [open, setOpen] = useState(params.get("for") ? true : false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(today);
  const [kind, setKind] = useState<Task["kind"]>("To-do");
  const [notes, setNotes] = useState("");
  const [contactId, setContactId] = useState(params.get("for") ?? "");
  if (!db) return null;
  const tasks = db.tasks.filter(isOpen);
  const shown = tasks
    .filter((t) => {
      if (filter === "done") return t.done;
      if (t.done) return false;
      if (filter === "today") return t.due === today;
      if (filter === "overdue") return t.due < today;
      return true;
    })
    .sort((a, b) => a.due.localeCompare(b.due));
  const name = (id: string) => {
    const c = db.contacts.find((p) => p.id === id);
    return c ? personName(c) : "";
  };

  return (
    <div>
      <PageHeader eyebrow="Tasks" title="What is on the list" lede="Calls, paperwork, and the small jobs that keep a file moving.">
        <Button
          onClick={() => {
            setEditing(null);
            setTitle("");
            setDue(today);
            setKind("To-do");
            setNotes("");
            setContactId("");
            setOpen(true);
          }}
        >
          Add a task
        </Button>
      </PageHeader>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(
          [
            ["open", "Open"],
            ["today", "Today"],
            ["overdue", "Overdue"],
            ["done", "Done"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-sm ${filter === key ? "bg-foreground text-background" : "bg-card ring-1 ring-foreground/10"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState title="Nothing in this list" body="Add a task, or switch the filter." />
      ) : (
        <ul className="space-y-2">
          {shown.map((task) => (
            <li key={task.id} className="flex gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <Checkbox
                checked={task.done}
                onCheckedChange={(v) => void act({ type: "updateTask", id: task.id, patch: { done: v === true } })}
                aria-label={`Mark ${task.title} ${task.done ? "not done" : "done"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={`font-medium ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</p>
                  <p className={`text-sm ${!task.done && task.due < today ? "text-brand" : "text-muted-foreground"}`}>
                    {whenLabel(task.due, today)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {task.kind}
                  {task.contactId ? (
                    <>
                      {" · "}
                      <PersonLink id={task.contactId} name={name(task.contactId)} />
                    </>
                  ) : null}
                </p>
                {task.notes ? <p className="mt-1 text-sm">{task.notes}</p> : null}
                <div className="mt-2 flex gap-3 text-sm">
                  <button
                    type="button"
                    className="text-brand"
                    onClick={() => {
                      setEditing(task);
                      setTitle(task.title);
                      setDue(task.due);
                      setKind(task.kind);
                      setNotes(task.notes);
                      setContactId(task.contactId);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="text-brand" onClick={() => void act({ type: "deleteTasks", ids: [task.id] })}>
                    Move to recycle bin
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit task" : "Add a task"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = editing
                ? await act({ type: "updateTask", id: editing.id, patch: { title, due, kind, notes, contactId } })
                : await act({ type: "createTask", title, due, kind, notes, contactId });
              if (toastResult(res, editing ? "Task updated" : "Task added")) {
                setOpen(false);
                setEditing(null);
                setTitle("");
                setNotes("");
              }
            }}
          >
            <Field label="Task">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Due">
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} required />
              </Field>
              <Field label="Kind">
                <Select value={kind} onValueChange={(v) => setKind(v as Task["kind"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Call", "Email", "To-do", "Showing", "Paperwork"].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <PersonPicker contacts={db.contacts} value={contactId} onChange={setContactId} />
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-card" />
            </Field>
            <DialogFooter>
              <Button type="submit">{editing ? "Save changes" : "Save task"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<p>Opening tasks…</p>}>
      <TasksInner />
    </Suspense>
  );
}
