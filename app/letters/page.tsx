"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, PageHeader, PersonPicker, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { mergeText } from "@/lib/merge";
import { householdLabel, isOpen, personName } from "@/lib/people";

export default function LettersPage() {
  const { db, act } = useOffice();
  usePageTitle("Letters and labels");
  const [tab, setTab] = useState<"letter" | "labels" | "envelope">("letter");
  const [templateId, setTemplateId] = useState(db?.letterTemplates.find((t) => !t.deletedAt)?.id ?? "");
  const [editingLetter, setEditingLetter] = useState(false);
  const [contactId, setContactId] = useState("");
  const [group, setGroup] = useState("Holiday card");
  const [mailOnly, setMailOnly] = useState(true);
  const labelPeople = useMemo(() => {
    if (!db) return [];
    return db.contacts.filter((c) => {
      if (!isOpen(c) || !c.street) return false;
      if (group !== "all" && !c.tags.includes(group)) return false;
      if (mailOnly && c.mailPreference !== "Mail" && c.mailPreference !== "Both") return false;
      return true;
    });
  }, [db, group, mailOnly]);
  if (!db) return null;
  const openLetters = db.letterTemplates.filter(isOpen);
  const template = openLetters.find((t) => t.id === templateId) ?? openLetters[0];
  const contact = db.contacts.find((c) => c.id === contactId && isOpen(c)) ?? null;
  const letter = mergeText(template?.body ?? "", contact, db.settings);

  return (
    <div>
      <PageHeader
        eyebrow="Letters and labels"
        title="Paper, when email is the wrong tool"
        lede="Preview a letter, a sheet of labels, or an envelope. Printing uses your browser."
      />
      <div className="mb-4 flex gap-2">
        {(
          [
            ["letter", "Letters"],
            ["labels", "Labels"],
            ["envelope", "Envelopes"],
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-full px-3 py-1.5 text-sm ${tab === key ? "bg-foreground text-background" : "bg-card ring-1 ring-foreground/10"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "letter" ? (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-3">
            <Field label="Letter">
              {db.letterTemplates.filter(isOpen).length === 0 ? (
                <p className="text-sm text-muted-foreground">No letters yet. Write one below.</p>
              ) : (
                <Select value={template?.id} onValueChange={setTemplateId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {db.letterTemplates.filter(isOpen).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <p className="text-sm text-muted-foreground">{template?.description}</p>
            {template ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEditingLetter((open) => !open)}>
                  {editingLetter ? "Close editor" : "Edit this letter"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const res = await act({ type: "deleteLetterTemplates", ids: [template.id] });
                    if (toastResult(res, "Letter moved to the recycle bin")) {
                      setTemplateId(db.letterTemplates.find((t) => isOpen(t) && t.id !== template.id)?.id ?? "");
                      setEditingLetter(false);
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : null}
            {editingLetter && template ? (
              <LetterEditor
                template={template}
                onSaved={() => setEditingLetter(false)}
              />
            ) : null}
            <PersonPicker contacts={db.contacts} value={contactId} onChange={setContactId} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.print()} disabled={!contact}>
                Print
              </Button>
              <Button
                disabled={!contact}
                onClick={async () => {
                  if (!contact || !template) return;
                  const res = await act({ type: "recordLetter", contactId: contact.id, templateName: template.name });
                  toastResult(res, "Saved on their history");
                }}
              >
                Save to their history
              </Button>
            </div>
            <NewLetter onCreated={(id) => setTemplateId(id)} />
          </div>
          <article className="print-sheet min-h-[32rem] rounded-2xl bg-white p-8 text-zinc-900 shadow-sm ring-1 ring-zinc-200">
            <p className="font-heading text-2xl text-zinc-900">{db.settings.officeName}</p>
            <p className="text-sm text-zinc-600">
              {db.settings.brokerage} · {db.settings.city}
              <br />
              {db.settings.userName} · {db.settings.phone}
            </p>
            <div className="mt-8 text-sm">
              {contact ? (
                <>
                  <p>{contact.envelopeLine || personName(contact)}</p>
                  <p>{contact.street}</p>
                  <p>
                    {contact.city} {contact.province} {contact.postal}
                  </p>
                </>
              ) : (
                <p className="text-zinc-500">Choose a person to fill in the letter.</p>
              )}
            </div>
            <pre className="mt-8 font-sans text-sm leading-relaxed whitespace-pre-wrap">{letter}</pre>
          </article>
        </div>
      ) : null}

      {tab === "labels" ? (
        <div>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Field label="Group">
              <Select value={group} onValueChange={setGroup}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone with an address</SelectItem>
                  {db.settings.groups.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={mailOnly} onChange={(e) => setMailOnly(e.target.checked)} />
              Only people who accept mail
            </label>
            <Button variant="outline" onClick={() => window.print()}>
              Print labels
            </Button>
            <Button
              onClick={async () => {
                const res = await act({
                  type: "recordMailing",
                  contactIds: labelPeople.map((c) => c.id),
                  label: `Labels printed${group === "all" ? "" : ` for ${group}`}`,
                });
                toastResult(res, `Noted on ${res.ok ? res.result?.count : 0} people’s history`);
              }}
            >
              Record this mailing
            </Button>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{labelPeople.length} labels. Avery-style, three across. Print includes every label.</p>
          <div className="print-sheet grid grid-cols-1 gap-2 bg-white p-4 text-zinc-900 sm:grid-cols-2 lg:grid-cols-3">
            {labelPeople.map((c) => (
              <div key={c.id} className="min-h-24 rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{c.envelopeLine || householdLabel(c)}</p>
                <p>{c.street}</p>
                <p>
                  {c.city} {c.province} {c.postal}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "envelope" ? (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <PersonPicker contacts={db.contacts} value={contactId} onChange={setContactId} />
          <div className="print-sheet flex min-h-56 flex-col justify-between rounded-2xl bg-white p-8 text-zinc-900 ring-1 ring-foreground/10">
            <p className="text-xs text-zinc-500">
              {db.settings.officeName}
              <br />
              {db.settings.brokerage}
              <br />
              {db.settings.city}
            </p>
            <div className="self-center text-center">
              {contact ? (
                <>
                  <p className="font-medium">{contact.envelopeLine || personName(contact)}</p>
                  <p>{contact.street}</p>
                  <p>
                    {contact.city} {contact.province} {contact.postal}
                  </p>
                </>
              ) : (
                <p className="text-zinc-500">Choose a person.</p>
              )}
            </div>
            <Button variant="outline" className="no-print self-end" onClick={() => window.print()} disabled={!contact}>
              Print envelope
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LetterEditor({
  template,
  onSaved,
}: {
  template: { id: string; name: string; category: string; description: string; body: string; enteredBy: string };
  onSaved: () => void;
}) {
  const { act } = useOffice();
  const [name, setName] = useState(template.name);
  const [body, setBody] = useState(template.body);
  const [description, setDescription] = useState(template.description);
  return (
    <form
      className="grid gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await act({
          type: "saveLetterTemplate",
          template: { ...template, name, body, description },
        });
        if (toastResult(res, "Letter updated")) onSaved();
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Letter name" required aria-label="Letter name" />
      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this letter is for" aria-label="Letter description" />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-28 bg-card" aria-label="Letter body" />
      <Button type="submit">Save letter</Button>
    </form>
  );
}

function NewLetter({ onCreated }: { onCreated: (id: string) => void }) {
  const { db, act } = useOffice();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("{{greeting}}\n\n");
  if (!db) return null;
  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Write a new letter
      </Button>
    );
  }
  return (
    <form
      className="grid gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await act({
          type: "saveLetterTemplate",
          template: { name, category: "Letters", description: "Written in Sphere", body, enteredBy: db.settings.userName },
        });
        if (toastResult(res, "Letter saved")) {
          if (res.ok && res.result?.id) onCreated(res.result.id);
          setOpen(false);
          setName("");
          setBody("{{greeting}}\n\n");
        }
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Letter name" required aria-label="Letter name" />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-28 bg-card" aria-label="Letter body" />
      <div className="flex gap-2">
        <Button type="submit">Save letter</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
