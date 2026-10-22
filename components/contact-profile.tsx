"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Field, Initials, toastResult, usePageTitle, useSyncedDraft } from "@/components/bits";
import { CreatableMultiSelect, CreatableSelect } from "@/components/creatable-select";
import { useOffice } from "@/components/office-provider";
import { downloadText } from "@/lib/csv";
import { longDate, shortDate } from "@/lib/dates";
import { money } from "@/lib/format";
import { fullAddress, personName, suggestSalutations } from "@/lib/people";
import type { Contact, ContactPatch, DocumentRecord } from "@/lib/types";

const TABS = [
  ["overview", "Overview"],
  ["home", "Home & work"],
  ["personal", "Personal"],
  ["referrals", "Referrals"],
  ["notes", "Notes"],
  ["files", "Files"],
  ["properties", "Properties"],
  ["history", "History"],
] as const;

export function ContactProfile({ id }: { id: string }) {
  const { db, act } = useOffice();
  const contact = db?.contacts.find((c) => c.id === id);
  usePageTitle(contact ? personName(contact) : "Person");
  const [tab, setTab] = useState("overview");
  const [confirm, setConfirm] = useState(false);
  if (!db) return null;
  if (!contact || contact.deletedAt) {
    return (
      <EmptyState
        title="This person isn’t in the book"
        body="They may be in the recycle bin, or the link is old."
        action={
          <Button asChild>
            <Link href="/contacts">Back to people</Link>
          </Button>
        }
      />
    );
  }
  const plans = db.enrollments.filter((e) => e.contactId === contact.id && !e.deletedAt && e.status !== "Finished");

  async function save(patch: ContactPatch, message = "Saved") {
    const res = await act({ type: "updateContact", id: contact!.id, patch });
    toastResult(res, message);
  }

  return (
    <div>
      <Link href="/contacts" className="text-sm text-foreground underline-offset-2 hover:underline">
        All people
      </Link>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Initials name={personName(contact)} className="size-14 text-base" />
          <div>
          <h1 className="text-3xl tracking-tight sm:text-4xl">{personName(contact)}</h1>
          <p className="mt-1 text-muted-foreground">
            {contact.spouseFirst ? `and ${contact.spouseFirst} ${contact.spouseLast || contact.lastName}` : "No spouse on file"}
            {" · "}
            {contact.type} · {contact.agent}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {contact.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTab("notes")}>
            Add a note
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/tasks?for=${contact.id}`}>Add a task</Link>
          </Button>
          <Button variant="destructive" onClick={() => setConfirm(true)}>
            Move to recycle bin
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <div className="md:hidden">
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <TabsList className="w-max">
            {TABS.map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
          <NamesCard contact={contact} onSave={save} />
          <PhonesCard contact={contact} onSave={save} />
          <EmailsCard contact={contact} onSave={save} />
          <AboutCard
            contact={contact}
            groups={db.settings.groups ?? []}
            agents={db.settings.agents ?? []}
            sources={db.settings.sources ?? []}
            contactTypes={db.settings.contactTypes ?? []}
            onSave={save}
          />
          <article className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 lg:col-span-2">
            <h2 className="font-heading text-xl text-foreground">At a glance</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Fact label="Birthday" value={contact.birthday ? longDate(contact.birthday) : "Not set"} />
              <Fact label="Anniversary" value={contact.anniversary ? longDate(contact.anniversary) : "Not set"} />
              <Fact label="Moved in" value={contact.moveInDate ? longDate(contact.moveInDate) : "Not set"} />
              <Fact label="Came from" value={contact.source || "Not set"} />
              <Fact label="Mail" value={`${contact.mailPreference}${contact.acceptMassEmail ? "" : " · no mass email"}`} />
              <Fact label="Address" value={fullAddress(contact) || "Not set"} />
            </dl>
            {plans.length ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground">On a plan</p>
                <ul className="mt-1 text-sm">
                  {plans.map((e) => {
                    const plan = db.plans.find((p) => p.id === e.planId);
                    return (
                      <li key={e.id}>
                        <Link href={`/plans/${e.planId}`} className="text-foreground underline-offset-2 hover:underline">
                          {plan?.name ?? "Plan"}
                        </Link>
                        <span className="text-muted-foreground"> · next step {shortDate(e.nextDue)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </article>
        </TabsContent>

        <TabsContent value="home">
          <HomeCard contact={contact} onSave={save} />
        </TabsContent>
        <TabsContent value="personal">
          <PersonalCard contact={contact} onSave={save} />
        </TabsContent>
        <TabsContent value="referrals">
          <Referrals contact={contact} />
        </TabsContent>
        <TabsContent value="notes">
          <Notes contact={contact} />
        </TabsContent>
        <TabsContent value="files">
          <Files contact={contact} />
        </TabsContent>
        <TabsContent value="properties">
          <Properties contact={contact} />
        </TabsContent>
        <TabsContent value="history">
          <ul className="space-y-2">
            {contact.activities.length === 0 ? (
              <EmptyState title="No history yet" body="Notes, calls, letters, and campaigns will show up here." />
            ) : (
              contact.activities.map((a) => (
                <li key={a.id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
                  <p className="text-xs text-muted-foreground">
                    {shortDate(a.at.slice(0, 10))} · {a.kind} · {a.by}
                  </p>
                  <p className="mt-1">{a.summary}</p>
                </li>
              ))
            )}
          </ul>
        </TabsContent>
      </Tabs>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move {personName(contact)} to the recycle bin?</DialogTitle>
            <DialogDescription>You can bring them back later. They drop out of reminders, mailings, and reports until then.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Keep them
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const res = await act({ type: "deleteContacts", ids: [contact.id] });
                if (toastResult(res, "Moved to the recycle bin")) setConfirm(false);
              }}
            >
              Move to recycle bin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CardShell({ title, children, dirty, onSave }: { title: string; children: React.ReactNode; dirty?: boolean; onSave?: () => void }) {
  return (
    <article className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl text-foreground">{title}</h2>
        {onSave ? (
          <Button type="button" disabled={!dirty} onClick={onSave}>
            Save
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3">{children}</div>
    </article>
  );
}

function NamesCard({ contact, onSave }: { contact: Contact; onSave: (p: ContactPatch) => Promise<void> }) {
  const { draft, setDraft, dirty } = useSyncedDraft({
    firstName: contact.firstName,
    lastName: contact.lastName,
    spouseFirst: contact.spouseFirst,
    spouseLast: contact.spouseLast,
  });
  return (
    <CardShell
      title="Names"
      dirty={dirty}
      onSave={() => onSave({ ...draft, ...suggestSalutations(draft) })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name">
          <Input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
        </Field>
        <Field label="Last name">
          <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
        </Field>
        <Field label="Spouse first name">
          <Input value={draft.spouseFirst} onChange={(e) => setDraft({ ...draft, spouseFirst: e.target.value })} />
        </Field>
        <Field label="Spouse last name">
          <Input value={draft.spouseLast} onChange={(e) => setDraft({ ...draft, spouseLast: e.target.value })} />
        </Field>
      </div>
    </CardShell>
  );
}

function PhonesCard({ contact, onSave }: { contact: Contact; onSave: (p: ContactPatch) => Promise<void> }) {
  const [label, setLabel] = useState("Mobile");
  const [number, setNumber] = useState("");
  return (
    <CardShell title="Phones">
      {contact.phones.length === 0 ? <p className="text-sm text-muted-foreground">No phone yet.</p> : null}
      {contact.phones.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
          <a href={`tel:${p.number}`} className="text-foreground">
            {p.label}: {p.number}
          </a>
          <button type="button" className="text-brand" onClick={() => void onSave({ phones: contact.phones.filter((x) => x.id !== p.id) })}>
            Remove
          </button>
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
        <Select value={label} onValueChange={setLabel}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Mobile", "Home", "Work", "Spouse mobile"].map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="(604) 555-0100" aria-label="Phone number" />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!number.trim()) return toast.error("Type a phone number.");
            void onSave({ phones: [...contact.phones, { id: `new-${Date.now()}`, label, number: number.trim() }] });
            setNumber("");
          }}
        >
          Add
        </Button>
      </div>
    </CardShell>
  );
}

function EmailsCard({ contact, onSave }: { contact: Contact; onSave: (p: ContactPatch) => Promise<void> }) {
  const [label, setLabel] = useState("Personal");
  const [address, setAddress] = useState("");
  return (
    <CardShell title="Emails">
      {contact.emails.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
          <a href={`mailto:${e.address}`} className="truncate text-foreground">
            {e.label}: {e.address}
          </a>
          <button type="button" className="text-brand" onClick={() => void onSave({ emails: contact.emails.filter((x) => x.id !== e.id) })}>
            Remove
          </button>
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
        <Select value={label} onValueChange={setLabel}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Personal", "Work", "Spouse"].map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="name@example.com" aria-label="Email address" />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!address.includes("@")) return toast.error("That doesn’t look like an email.");
            void onSave({ emails: [...contact.emails, { id: `new-${Date.now()}`, label, address: address.trim() }] });
            setAddress("");
          }}
        >
          Add
        </Button>
      </div>
    </CardShell>
  );
}

function AboutCard({
  contact,
  groups,
  agents,
  sources,
  contactTypes,
  onSave,
}: {
  contact: Contact;
  groups: string[];
  agents: string[];
  sources: string[];
  contactTypes: string[];
  onSave: (p: ContactPatch) => Promise<void>;
}) {
  const { act } = useOffice();
  const { draft, setDraft, dirty } = useSyncedDraft({
    type: contact.type,
    source: contact.source,
    agent: contact.agent,
    tags: contact.tags,
  });
  return (
    <CardShell title="Type, source, and groups" dirty={dirty} onSave={() => onSave(draft)}>
      <CreatableSelect
        label="Contact type"
        value={draft.type}
        options={withCurrent(contactTypes, draft.type)}
        onChange={(type) => setDraft({ ...draft, type })}
        emptyLabel="No type"
        onCreate={async (name) => {
          await act({ type: "addContactType", name });
        }}
      />
      <CreatableSelect
        label="Original source"
        value={draft.source}
        options={withCurrent(sources, draft.source)}
        onChange={(source) => setDraft({ ...draft, source })}
        emptyLabel="No source"
        onCreate={async (name) => {
          await act({ type: "addSource", name });
        }}
      />
      <CreatableSelect
        label="Agent"
        value={draft.agent}
        options={withCurrent(agents, draft.agent)}
        onChange={(agent) => setDraft({ ...draft, agent })}
        emptyLabel="No agent"
        onCreate={async (name) => {
          await act({ type: "addAgent", name });
        }}
      />
      <CreatableMultiSelect
        label="Tags"
        values={draft.tags}
        options={groups}
        onChange={(tags) => setDraft({ ...draft, tags })}
        onCreate={async (name) => {
          await act({ type: "addGroup", name });
        }}
      />
      <p className="text-xs text-muted-foreground">A new type, source, agent, or tag is saved to Settings as soon as you add it. Save stores it on this person.</p>
    </CardShell>
  );
}

function withCurrent(options: string[], current: string) {
  if (!current || options.some((option) => option.toLowerCase() === current.toLowerCase())) return options;
  return [current, ...options];
}

function HomeCard({ contact, onSave }: { contact: Contact; onSave: (p: ContactPatch) => Promise<void> }) {
  const { draft, setDraft, dirty } = useSyncedDraft({
    street: contact.street,
    city: contact.city,
    province: contact.province,
    postal: contact.postal,
    moveInDate: contact.moveInDate,
    company: contact.company,
    jobTitle: contact.jobTitle,
    workStreet: contact.workStreet,
    workCity: contact.workCity,
    workPhone: contact.workPhone,
  });
  const set = (key: keyof typeof draft, value: string) => setDraft({ ...draft, [key]: value });
  return (
    <CardShell title="Home and work" dirty={dirty} onSave={() => onSave(draft)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Street">
          <Input value={draft.street} onChange={(e) => set("street", e.target.value)} />
        </Field>
        <Field label="City">
          <Input value={draft.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Province">
          <Input value={draft.province} onChange={(e) => set("province", e.target.value)} />
        </Field>
        <Field label="Postal code">
          <Input value={draft.postal} onChange={(e) => set("postal", e.target.value)} />
        </Field>
        <Field label="Move-in date">
          <Input type="date" value={draft.moveInDate} onChange={(e) => set("moveInDate", e.target.value)} />
        </Field>
        <Field label="Job title">
          <Input value={draft.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
        </Field>
        <Field label="Company">
          <Input value={draft.company} onChange={(e) => set("company", e.target.value)} />
        </Field>
        <Field label="Work phone">
          <Input value={draft.workPhone} onChange={(e) => set("workPhone", e.target.value)} />
        </Field>
        <Field label="Work street">
          <Input value={draft.workStreet} onChange={(e) => set("workStreet", e.target.value)} />
        </Field>
        <Field label="Work city">
          <Input value={draft.workCity} onChange={(e) => set("workCity", e.target.value)} />
        </Field>
      </div>
    </CardShell>
  );
}

function PersonalCard({ contact, onSave }: { contact: Contact; onSave: (p: ContactPatch) => Promise<void> }) {
  const { draft, setDraft, dirty } = useSyncedDraft({
    birthday: contact.birthday,
    spouseBirthday: contact.spouseBirthday,
    anniversary: contact.anniversary,
    salutation: contact.salutation,
    envelopeLine: contact.envelopeLine,
    letterGreeting: contact.letterGreeting,
    mailPreference: contact.mailPreference,
    acceptMassEmail: contact.acceptMassEmail,
    children: contact.children,
    pets: contact.pets,
    interests: contact.interests,
  });
  const [interest, setInterest] = useState("");
  return (
    <CardShell title="Personal, mail, and household" dirty={dirty} onSave={() => onSave(draft)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Birthday">
          <Input type="date" value={draft.birthday} onChange={(e) => setDraft({ ...draft, birthday: e.target.value })} />
        </Field>
        <Field label="Spouse birthday">
          <Input type="date" value={draft.spouseBirthday} onChange={(e) => setDraft({ ...draft, spouseBirthday: e.target.value })} />
        </Field>
        <Field label="Wedding anniversary">
          <Input type="date" value={draft.anniversary} onChange={(e) => setDraft({ ...draft, anniversary: e.target.value })} />
        </Field>
        <Field label="Casual name">
          <Input value={draft.salutation} onChange={(e) => setDraft({ ...draft, salutation: e.target.value })} />
        </Field>
        <Field label="Envelope line">
          <Input value={draft.envelopeLine} onChange={(e) => setDraft({ ...draft, envelopeLine: e.target.value })} />
        </Field>
        <Field label="Letter greeting">
          <Input value={draft.letterGreeting} onChange={(e) => setDraft({ ...draft, letterGreeting: e.target.value })} />
        </Field>
      </div>
      <Field label="How they like to hear from you">
        <Select
          value={draft.mailPreference}
          onValueChange={(mailPreference) => setDraft({ ...draft, mailPreference: mailPreference as Contact["mailPreference"] })}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Email", "Mail", "Both", "Do not market"].map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={draft.acceptMassEmail} onCheckedChange={(v) => setDraft({ ...draft, acceptMassEmail: v === true })} />
        They accept mass email
      </label>
      <div>
        <p className="text-sm font-medium text-foreground">Children</p>
        {draft.children.map((child, i) => (
          <div key={i} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={child.name}
              aria-label="Child name"
              onChange={(e) => {
                const children = draft.children.map((c, idx) => (idx === i ? { ...c, name: e.target.value } : c));
                setDraft({ ...draft, children });
              }}
            />
            <Input
              type="date"
              aria-label="Child birthday"
              value={child.birthday}
              onChange={(e) => {
                const children = draft.children.map((c, idx) => (idx === i ? { ...c, birthday: e.target.value } : c));
                setDraft({ ...draft, children });
              }}
            />
            <Button type="button" variant="outline" onClick={() => setDraft({ ...draft, children: draft.children.filter((_, idx) => idx !== i) })}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" className="mt-2" onClick={() => setDraft({ ...draft, children: [...draft.children, { name: "", birthday: "" }] })}>
          Add a child
        </Button>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Pets</p>
        {draft.pets.map((pet, i) => (
          <div key={i} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={pet.name}
              aria-label="Pet name"
              onChange={(e) => setDraft({ ...draft, pets: draft.pets.map((p, idx) => (idx === i ? { ...p, name: e.target.value } : p)) })}
            />
            <Input
              value={pet.kind}
              aria-label="Kind of pet"
              onChange={(e) => setDraft({ ...draft, pets: draft.pets.map((p, idx) => (idx === i ? { ...p, kind: e.target.value } : p)) })}
            />
            <Button type="button" variant="outline" onClick={() => setDraft({ ...draft, pets: draft.pets.filter((_, idx) => idx !== i) })}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" className="mt-2" onClick={() => setDraft({ ...draft, pets: [...draft.pets, { name: "", kind: "Dog" }] })}>
          Add a pet
        </Button>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Interests</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {draft.interests.map((item) => (
            <button key={item} type="button" className="rounded-full bg-secondary px-2 py-1 text-xs" onClick={() => setDraft({ ...draft, interests: draft.interests.filter((x) => x !== item) })}>
              {item} ×
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Gardening, Canucks…" aria-label="Interest" />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const next = interest.trim();
              if (!next || draft.interests.includes(next)) return;
              setDraft({ ...draft, interests: [...draft.interests, next] });
              setInterest("");
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </CardShell>
  );
}

function Notes({ contact }: { contact: Contact }) {
  const { act } = useOffice();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-3">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What should the next person know?" className="min-h-28 bg-card" />
      <Button
        onClick={async () => {
          const res = await act({ type: "addNote", contactId: contact.id, text });
          if (toastResult(res, "Note saved")) setText("");
        }}
      >
        Save note
      </Button>
      {contact.notes.length === 0 ? <EmptyState title="No notes yet" body="A note stays on this person and shows up in their history." /> : null}
      {contact.notes.map((n) => (
        <article key={n.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">
            {shortDate(n.at.slice(0, 10))} · {n.author}
          </p>
          {editing === n.id ? (
            <div className="mt-2 grid gap-2">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-24 bg-card" aria-label="Edit note" />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    const res = await act({ type: "updateNote", contactId: contact.id, noteId: n.id, text: draft });
                    if (toastResult(res, "Note updated")) setEditing(null);
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap">{n.text}</p>
          )}
          {editing === n.id ? null : (
            <div className="mt-2 flex gap-3 text-sm">
              <button
                type="button"
                className="text-brand"
                onClick={() => {
                  setEditing(n.id);
                  setDraft(n.text);
                }}
              >
                Edit
              </button>
              <button type="button" className="text-brand" onClick={() => void act({ type: "deleteNote", contactId: contact.id, noteId: n.id })}>
                Remove
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function Referrals({ contact }: { contact: Contact }) {
  const { act } = useOffice();
  const [name, setName] = useState("");
  const [side, setSide] = useState<Contact["referrals"][number]["side"]>("They referred someone");
  const [kind, setKind] = useState("Buyer");
  const [status, setStatus] = useState<Contact["referrals"][number]["status"]>("In progress");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  function clearForm() {
    setName("");
    setNotes("");
    setEditing(null);
    setSide("They referred someone");
    setKind("Buyer");
    setStatus("In progress");
  }
  return (
    <div className="space-y-4">
      <article className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-2">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Kind">
          <Input value={kind} onChange={(e) => setKind(e.target.value)} />
        </Field>
        <Field label="Direction">
          <Select value={side} onValueChange={(v) => setSide(v as typeof side)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="They referred someone">They referred someone</SelectItem>
              <SelectItem value="We referred them">We referred them</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["In progress", "Closed", "Thanked", "Did not proceed"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-card" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              const res = editing
                ? await act({ type: "updateReferral", contactId: contact.id, referralId: editing, name, side, kind, status, notes })
                : await act({ type: "addReferral", contactId: contact.id, name, side, kind, status, notes });
              if (toastResult(res, editing ? "Referral updated" : "Referral saved")) clearForm();
            }}
          >
            {editing ? "Save referral" : "Add referral"}
          </Button>
          {editing ? (
            <Button type="button" variant="outline" onClick={clearForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </article>
      {contact.referrals.length === 0 ? <EmptyState title="No referrals yet" /> : null}
      {contact.referrals.map((r) => (
        <article key={r.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">{r.name}</p>
              <p className="text-sm text-muted-foreground">
                {shortDate(r.at)} · {r.side} · {r.kind} · {r.status}
              </p>
              {r.notes ? <p className="mt-1 text-sm">{r.notes}</p> : null}
            </div>
            <div className="flex gap-3 text-sm">
              <button
                type="button"
                className="text-brand"
                onClick={() => {
                  setEditing(r.id);
                  setName(r.name);
                  setSide(r.side);
                  setKind(r.kind);
                  setStatus(r.status);
                  setNotes(r.notes);
                }}
              >
                Edit
              </button>
              <button type="button" className="text-brand" onClick={() => void act({ type: "deleteReferral", contactId: contact.id, referralId: r.id })}>
                Remove
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

function downloadDocument(doc: DocumentRecord) {
  if (doc.dataUrl) {
    const a = document.createElement("a");
    a.href = doc.dataUrl;
    a.download = doc.name || "file";
    a.click();
    return;
  }
  const filename = doc.name.toLowerCase().endsWith(".txt") ? doc.name : `${doc.name || "note"}.txt`;
  downloadText(filename, doc.note || doc.name, "text/plain;charset=utf-8");
}

function Files({ contact }: { contact: Contact }) {
  const { act } = useOffice();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("Contract");
  const [note, setNote] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [mime, setMime] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const current = contact.documents.find((d) => d.id === open);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Attach a small file, or just keep the name and a note. Files stay in this browser with the rest of the book. Keep attachments under about 350 KB.
      </p>
      <article className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-2">
        <Field label="File name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Strata minutes.pdf" />
        </Field>
        <Field label="Kind">
          <Input value={kind} onChange={(e) => setKind(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Attach a file">
            <Input
              type="file"
              aria-label="Attach a file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 350_000) {
                  toast.error("That file is too big for this browser’s book. Keep it under 350 KB.");
                  return;
                }
                try {
                  setDataUrl(await readFile(file));
                  setMime(file.type || "application/octet-stream");
                  if (!name.trim()) setName(file.name);
                } catch {
                  toast.error("That file didn’t open. Try another one.");
                }
              }}
            />
          </Field>
          {dataUrl ? <p className="text-xs text-muted-foreground">A file is attached and will be saved with this person.</p> : null}
        </div>
        <div className="sm:col-span-2">
          <Field label="Note">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="bg-card" />
          </Field>
        </div>
        <Button
          onClick={async () => {
            const res = await act({ type: "addDocument", contactId: contact.id, name, kind, note, dataUrl: dataUrl || undefined, mime: mime || undefined });
            if (toastResult(res, dataUrl ? "File saved" : "File noted")) {
              setName("");
              setNote("");
              setDataUrl("");
              setMime("");
            }
          }}
        >
          Save file
        </Button>
      </article>
      {contact.documents.length === 0 ? <EmptyState title="No files yet" /> : null}
      {contact.documents.map((d) => (
        <button key={d.id} type="button" className="block w-full rounded-xl bg-card p-4 text-left ring-1 ring-foreground/10" onClick={() => setOpen(d.id)}>
          <p className="font-medium text-foreground">{d.name}</p>
          <p className="text-sm text-muted-foreground">
            {d.kind} · {shortDate(d.at)}
            {d.dataUrl ? " · file attached" : ""}
          </p>
        </button>
      ))}
      <Dialog open={!!current} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{current?.name}</DialogTitle>
            <DialogDescription>{current?.note || (current?.dataUrl ? "Open or download the attached file." : "No note on this file.")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => current && downloadDocument(current)}>
              Download
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!current) return;
                const res = await act({ type: "deleteDocument", contactId: contact.id, documentId: current.id });
                if (toastResult(res, "File removed")) setOpen(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Properties({ contact }: { contact: Contact }) {
  const { act } = useOffice();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState(contact.city);
  const [role, setRole] = useState<Contact["properties"][number]["role"]>("Bought");
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [mls, setMls] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  function clearForm() {
    setAddress("");
    setPrice("");
    setMls("");
    setDate("");
    setEditing(null);
    setRole("Bought");
  }
  return (
    <div className="space-y-4">
      <article className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-2">
        <Field label="Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="City">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Role">
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Bought", "Sold", "Owns", "Looking"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Price">
          <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="MLS">
          <Input value={mls} onChange={(e) => setMls(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              const payload = {
                contactId: contact.id,
                address,
                city,
                role,
                date,
                price: Number(price.replace(/[^0-9.]/g, "")) || 0,
                mls,
              };
              const res = editing
                ? await act({ type: "updateProperty", propertyId: editing, ...payload })
                : await act({ type: "addProperty", ...payload });
              if (toastResult(res, editing ? "Property updated" : "Property saved")) clearForm();
            }}
          >
            {editing ? "Save property" : "Add property"}
          </Button>
          {editing ? (
            <Button type="button" variant="outline" onClick={clearForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </article>
      <div className="grid gap-3 md:grid-cols-2">
        {contact.properties.map((p) => (
          <article key={p.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-xs tracking-wide text-brand uppercase">{p.role}</p>
            <p className="font-medium text-foreground">{p.address}</p>
            <p className="text-sm text-muted-foreground">
              {p.city} · {p.date ? longDate(p.date) : "No date"} · {money(p.price)}
              {p.mls ? ` · ${p.mls}` : ""}
            </p>
            <div className="mt-2 flex gap-3 text-sm">
              <button
                type="button"
                className="text-brand"
                onClick={() => {
                  setEditing(p.id);
                  setAddress(p.address);
                  setCity(p.city);
                  setRole(p.role);
                  setDate(p.date);
                  setPrice(p.price ? String(p.price) : "");
                  setMls(p.mls);
                }}
              >
                Edit
              </button>
              <button type="button" className="text-brand" onClick={() => void act({ type: "deleteProperty", contactId: contact.id, propertyId: p.id })}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
