"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, PageHeader, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import type { ContactType } from "@/lib/types";

export default function NewContactPage() {
  const { db, act } = useOffice();
  const router = useRouter();
  usePageTitle("Add a person");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("Vancouver");
  const [type, setType] = useState<ContactType>("Client");
  const [agent, setAgent] = useState(db?.settings.agents[0] ?? "");
  const [busy, setBusy] = useState(false);
  if (!db) return null;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        eyebrow="People"
        title="Add a person"
        lede="Start with the basics. You can add a spouse, birthdays, and the rest from their page."
      />
      <form
        className="grid gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const res = await act({
            type: "createContact",
            draft: { firstName, lastName, email, mobile, city, type, agent, source: "Office" },
          });
          setBusy(false);
          if (toastResult(res, "Added to the book") && res.ok && res.result?.id) router.push(`/contacts/${res.result.id}`);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mobile">
          <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="(604) 555-0100" />
        </Field>
        <Field label="City">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={type} onValueChange={(v) => setType(v as ContactType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Client", "Prospect", "Personal", "B2B"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Agent">
          <Select value={agent} onValueChange={setAgent}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {db.settings.agents.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button type="submit" disabled={busy}>
          Save and open their page
        </Button>
      </form>
    </div>
  );
}
