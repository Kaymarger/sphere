"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatableMultiSelect, CreatableSelect } from "@/components/creatable-select";
import { Field, PageHeader, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { DEFAULT_CONTACT_TYPES } from "@/lib/lists";

export default function NewContactPage() {
  const { db, act } = useOffice();
  const router = useRouter();
  usePageTitle("Add a person");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("Past Client");
  const [source, setSource] = useState("");
  const [agent, setAgent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  if (!db) return null;
  const types = withCurrent(db.settings.contactTypes?.length ? db.settings.contactTypes : DEFAULT_CONTACT_TYPES, type);
  const sources = withCurrent(db.settings.sources ?? [], source);
  const agents = withCurrent(db.settings.agents ?? [], agent);
  const groups = db.settings.groups ?? [];

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        eyebrow="People"
        title="Add a person"
        lede="Nothing here is required. Contact type starts as Past Client. Type a new source, agent, type, or tag and it joins the office lists."
      />
      <form
        className="grid gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const res = await act({
            type: "createContact",
            draft: { firstName, lastName, email, mobile, city, type, source, agent, tags },
          });
          setBusy(false);
          if (toastResult(res, "Added to the book") && res.ok && res.result?.id) router.push(`/contacts/${res.result.id}`);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <Field label="Email">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" />
        </Field>
        <Field label="Mobile">
          <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="(604) 555-0100" />
        </Field>
        <Field label="City">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <CreatableSelect
          label="Contact type"
          value={type}
          options={types}
          onChange={setType}
          emptyLabel="No type"
          onCreate={async (name) => {
            await act({ type: "addContactType", name });
          }}
        />
        <CreatableSelect
          label="Source"
          value={source}
          options={sources}
          onChange={setSource}
          emptyLabel="No source"
          onCreate={async (name) => {
            await act({ type: "addSource", name });
          }}
        />
        <CreatableSelect
          label="Agent"
          value={agent}
          options={agents}
          onChange={setAgent}
          emptyLabel="No agent"
          onCreate={async (name) => {
            await act({ type: "addAgent", name });
          }}
        />
        <CreatableMultiSelect
          label="Tags"
          values={tags}
          options={groups}
          onChange={setTags}
          onCreate={async (name) => {
            await act({ type: "addGroup", name });
          }}
        />
        <Button type="submit" disabled={busy}>
          Save and open their page
        </Button>
      </form>
    </div>
  );
}

function withCurrent(options: string[], current: string) {
  if (!current || options.some((option) => option.toLowerCase() === current.toLowerCase())) return options;
  return [current, ...options];
}
