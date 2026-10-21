"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, PageHeader, PersonLink, PersonPicker, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { daysBetween, shortDate } from "@/lib/dates";
import { money } from "@/lib/format";
import { isOpen, personName } from "@/lib/people";
import type { Buyer, Deal, Listing } from "@/lib/types";

export default function BusinessPage() {
  const { db, today } = useOffice();
  usePageTitle("Active business");
  const [tab, setTab] = useState<"listings" | "buyers" | "deals">("listings");
  if (!db) return null;
  return (
    <div>
      <PageHeader
        eyebrow="Active business"
        title="Listings, buyers, and deals"
        lede="What the team is working on right now, separate from the past-client book."
      />
      <div className="mb-4 flex gap-2">
        {(
          [
            ["listings", "Listings"],
            ["buyers", "Buyers"],
            ["deals", "Deals"],
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-full px-3 py-1.5 text-sm ${tab === key ? "bg-foreground text-background" : "bg-card ring-1 ring-foreground/10"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "listings" ? <Listings today={today} /> : null}
      {tab === "buyers" ? <Buyers /> : null}
      {tab === "deals" ? <Deals /> : null}
    </div>
  );
}

function Listings({ today }: { today: string }) {
  const { db, act } = useOffice();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  if (!db) return null;
  const rows = db.listings.filter(isOpen);
  return (
    <div>
      <Button className="mb-3" onClick={() => { setEditing(null); setOpen(true); }}>
        Add a listing
      </Button>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((l) => {
          const seller = db.contacts.find((c) => c.id === l.contactId);
          return (
            <article key={l.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs tracking-wide text-brand uppercase">{l.status}</p>
                  <h2 className="font-heading text-2xl text-foreground">{l.address}</h2>
                  <p className="text-sm text-muted-foreground">
                    {l.neighbourhood}, {l.city} · {l.propertyType} · {l.beds} bd / {l.baths} ba
                  </p>
                </div>
                <p className="font-medium">{money(l.price)}</p>
              </div>
              <p className="mt-2 text-sm">
                {l.agent}
                {seller ? (
                  <>
                    {" · "}
                    <PersonLink id={seller.id} name={personName(seller)} />
                  </>
                ) : null}
                {" · "}
                {Math.max(0, daysBetween(l.listDate, today))} days on market
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{l.notes}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(l); setOpen(true); }}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void act({ type: "deleteListings", ids: [l.id] })}>
                  Remove
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <ListingDialog open={open} listing={editing} onClose={() => setOpen(false)} />
    </div>
  );
}

function ListingDialog({ open, listing, onClose }: { open: boolean; listing: Listing | null; onClose: () => void }) {
  const { db, act, today } = useOffice();
  const [draft, setDraft] = useState<Omit<Listing, "deletedAt">>(
    listing ?? {
      id: "",
      address: "",
      city: "Vancouver",
      neighbourhood: "",
      status: "Active",
      price: 0,
      beds: 2,
      baths: 2,
      propertyType: "Condo",
      agent: db?.settings.agents[0] ?? "",
      listDate: today,
      expires: today,
      contactId: "",
      notes: "",
    },
  );
  const sig = `${listing?.id ?? "new"}|${open}`;
  const [seen, setSeen] = useState(sig);
  if (sig !== seen) {
    setSeen(sig);
    if (listing) setDraft(listing);
  }
  if (!db) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{listing ? "Edit listing" : "Add a listing"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await act({ type: "saveListing", listing: { ...draft, id: listing?.id } });
            if (toastResult(res, "Listing saved")) onClose();
          }}
        >
          <Field label="Address">
            <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City">
              <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </Field>
            <Field label="Neighbourhood">
              <Input value={draft.neighbourhood} onChange={(e) => setDraft({ ...draft, neighbourhood: e.target.value })} />
            </Field>
            <Field label="Price">
              <Input value={draft.price || ""} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })} inputMode="numeric" />
            </Field>
            <Field label="Status">
              <Select value={draft.status} onValueChange={(status) => setDraft({ ...draft, status: status as Listing["status"] })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Coming soon", "Active", "Conditionally sold", "Pending"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Input value={draft.propertyType} onChange={(e) => setDraft({ ...draft, propertyType: e.target.value })} />
            </Field>
            <Field label="Agent">
              <Select value={draft.agent} onValueChange={(agent) => setDraft({ ...draft, agent })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {db.settings.agents.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <PersonPicker contacts={db.contacts} value={draft.contactId} onChange={(contactId) => setDraft({ ...draft, contactId })} label="Seller" />
          <Field label="Notes">
            <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="bg-card" />
          </Field>
          <DialogFooter>
            <Button type="submit">Save listing</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Buyers() {
  const { db, act } = useOffice();
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [areas, setAreas] = useState("");
  const [budget, setBudget] = useState("");
  const [beds, setBeds] = useState("2 bedrooms");
  const [agent, setAgent] = useState(db?.settings.agents[0] ?? "");
  const [status, setStatus] = useState<Buyer["status"]>("Looking");
  const [preapproved, setPreapproved] = useState(false);
  const [notes, setNotes] = useState("");
  if (!db) return null;
  return (
    <div>
      <Button className="mb-3" onClick={() => setOpen(true)}>Add a buyer</Button>
      <div className="grid gap-3 lg:grid-cols-2">
        {db.buyers.filter(isOpen).map((b) => {
          const person = db.contacts.find((c) => c.id === b.contactId);
          return (
            <article key={b.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="text-xs tracking-wide text-brand uppercase">{b.status}</p>
              <h2 className="font-heading text-2xl text-foreground">{person ? <PersonLink id={person.id} name={personName(person)} /> : "Buyer"}</h2>
              <p className="text-sm">{b.areas} · {b.budget} · {b.beds}</p>
              <p className="text-sm text-muted-foreground">{b.agent} · {b.preapproved ? "Pre-approved" : "Not pre-approved yet"}</p>
              <p className="mt-1 text-sm">{b.notes}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Select value={b.status} onValueChange={(status) => void act({ type: "saveBuyer", buyer: { ...b, status: status as Buyer["status"] } })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Looking", "Offered", "Under contract", "Paused"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => void act({ type: "deleteBuyers", ids: [b.id] })}>Remove</Button>
              </div>
            </article>
          );
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Add a buyer</DialogTitle></DialogHeader>
          <form className="grid gap-3" onSubmit={async (e) => {
            e.preventDefault();
            const res = await act({ type: "saveBuyer", buyer: { contactId, status, areas, budget, beds, agent, preapproved, notes } });
            if (toastResult(res, "Buyer added")) setOpen(false);
          }}>
            <PersonPicker contacts={db.contacts} value={contactId} onChange={setContactId} label="Buyer" />
            <Field label="Areas"><Input value={areas} onChange={(e) => setAreas(e.target.value)} /></Field>
            <Field label="Budget"><Input value={budget} onChange={(e) => setBudget(e.target.value)} /></Field>
            <Field label="Beds"><Input value={beds} onChange={(e) => setBeds(e.target.value)} /></Field>
            <Field label="Agent">
              <Select value={agent} onValueChange={setAgent}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{db.settings.agents.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as Buyer["status"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Looking", "Offered", "Under contract", "Paused"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={preapproved} onCheckedChange={(v) => setPreapproved(v === true)} /> Pre-approved</label>
            <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-card" /></Field>
            <DialogFooter><Button type="submit">Save buyer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Deals() {
  const { db, act, today } = useOffice();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Vancouver");
  const [side, setSide] = useState<Deal["side"]>("Buyer");
  const [status, setStatus] = useState<Deal["status"]>("Conditional");
  const [price, setPrice] = useState("");
  const [closeDate, setCloseDate] = useState(today);
  const [agent, setAgent] = useState(db?.settings.agents[0] ?? "");
  const [contactId, setContactId] = useState("");
  const [notes, setNotes] = useState("");
  if (!db) return null;
  const rows = [...db.deals.filter(isOpen)].sort((a, b) => b.closeDate.localeCompare(a.closeDate));
  return (
    <div>
      <Button className="mb-3" onClick={() => setOpen(true)}>Add a deal</Button>
      <ul className="space-y-2">
        {rows.map((d) => (
          <li key={d.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{d.address}</p>
                <p className="text-sm text-muted-foreground">
                  {d.city} · {d.side} · {d.status} · {money(d.price)} · closes {shortDate(d.closeDate)} · {d.agent}
                </p>
                <p className="text-sm">
                  {d.contactIds.map((id) => {
                    const c = db.contacts.find((p) => p.id === id);
                    return c ? <PersonLink key={id} id={id} name={personName(c)} /> : null;
                  })}
                </p>
                {d.notes ? <p className="mt-1 text-sm">{d.notes}</p> : null}
              </div>
              <Select value={d.status} onValueChange={(status) => void act({ type: "saveDeal", deal: { ...d, status: status as Deal["status"] } })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Conditional", "Firm", "Closed", "Fell through"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Add a deal</DialogTitle></DialogHeader>
          <form className="grid gap-3" onSubmit={async (e) => {
            e.preventDefault();
            const res = await act({
              type: "saveDeal",
              deal: { address, city, side, status, price: Number(price) || 0, closeDate, agent, contactIds: contactId ? [contactId] : [], notes },
            });
            if (toastResult(res, "Deal saved")) setOpen(false);
          }}>
            <Field label="Address"><Input value={address} onChange={(e) => setAddress(e.target.value)} required /></Field>
            <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Side">
                <Select value={side} onValueChange={(v) => setSide(v as Deal["side"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Buyer", "Seller", "Both"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={status} onValueChange={(v) => setStatus(v as Deal["status"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Conditional", "Firm", "Closed", "Fell through"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Price"><Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" /></Field>
              <Field label="Close date"><Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} /></Field>
            </div>
            <Field label="Agent">
              <Select value={agent} onValueChange={setAgent}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{db.settings.agents.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <PersonPicker contacts={db.contacts} value={contactId} onChange={setContactId} />
            <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-card" /></Field>
            <DialogFooter><Button type="submit">Save deal</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
