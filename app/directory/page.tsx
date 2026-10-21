"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Field, PageHeader, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { isOpen } from "@/lib/people";

const CATS = ["All", "Mortgage", "Home inspection", "Notary and legal", "Staging", "Photography", "Movers", "Cleaning", "Trades", "Insurance", "Appraisal"];

export default function DirectoryPage() {
  const { db, act } = useOffice();
  usePageTitle("Vendors");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("Trades");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Vancouver");
  const [notes, setNotes] = useState("");
  if (!db) return null;
  const vendors = db.vendors.filter((v) => {
    if (!isOpen(v)) return false;
    if (cat !== "All" && v.category !== cat) return false;
    const blob = `${v.name} ${v.company} ${v.category} ${v.city} ${v.notes}`.toLowerCase();
    return blob.includes(q.toLowerCase());
  });
  return (
    <div>
      <PageHeader eyebrow="Vendors" title="People you trust with a client" lede="Inspectors, notaries, stagers, and the rest. Phone numbers here are sample numbers.">
        <Button onClick={() => setOpen(true)}>Add a vendor</Button>
      </PageHeader>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors" aria-label="Search vendors" className="mb-3 max-w-md" />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {CATS.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${cat === c ? "bg-foreground text-background" : "bg-card ring-1 ring-foreground/10"}`}>
            {c}
          </button>
        ))}
      </div>
      {vendors.length === 0 ? <EmptyState title="No vendors match" /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {vendors.map((v) => (
          <article key={v.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-xs tracking-wide text-brand uppercase">{v.category}</p>
            <h2 className="font-heading text-2xl text-foreground">{v.name}</h2>
            <p className="text-sm">{v.company} · {v.city}</p>
            <p className="mt-2 text-sm">
              <a className="text-foreground underline-offset-2 hover:underline" href={`tel:${v.phone}`}>{v.phone}</a>
              {" · "}
              <a className="text-foreground underline-offset-2 hover:underline" href={`mailto:${v.email}`}>{v.email}</a>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{v.notes}</p>
            <button type="button" className="mt-2 text-sm text-brand" onClick={() => void act({ type: "deleteVendors", ids: [v.id] })}>
              Move to recycle bin
            </button>
          </article>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add a vendor</DialogTitle></DialogHeader>
          <form className="grid gap-3" onSubmit={async (e) => {
            e.preventDefault();
            const res = await act({ type: "saveVendor", vendor: { name, company, category, phone, email, city, notes, tags: [category] } });
            if (toastResult(res, "Vendor added")) setOpen(false);
          }}>
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Field label="Company"><Input value={company} onChange={(e) => setCompany(e.target.value)} required /></Field>
            <Field label="Category"><Input value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
            <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-card" /></Field>
            <DialogFooter><Button type="submit">Save vendor</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
