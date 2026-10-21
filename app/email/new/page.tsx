"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, PageHeader, PersonPicker, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { mergeText, MERGE_FIELDS } from "@/lib/merge";
import { isOpen, personName, primaryEmail } from "@/lib/people";

function NewCampaignInner() {
  const { db, act } = useOffice();
  const router = useRouter();
  const params = useSearchParams();
  usePageTitle("New campaign");
  const draftId = params.get("draft") ?? "";
  const existing = db?.campaigns.find((c) => c.id === draftId);
  const [templateId, setTemplateId] = useState(existing?.templateId || db?.emailTemplates[0]?.id || "");
  const [name, setName] = useState(existing?.name || "");
  const [subject, setSubject] = useState(existing?.subject || "");
  const [body, setBody] = useState(existing?.body || "");
  const [audience, setAudience] = useState("tag");
  const [value, setValue] = useState(db?.settings.groups.includes("Holiday card") ? "Holiday card" : db?.settings.groups[0] || "");
  const [ready, setReady] = useState(Boolean(existing));
  if (!db) return null;
  const templates = db.emailTemplates.filter(isOpen);
  const template = templates.find((t) => t.id === templateId) ?? templates[0];
  const activeTemplateId = template?.id ?? "";

  const pool = db.contacts.filter((c) => isOpen(c));
  const inGroup = pool.filter((c) => {
    if (audience === "all") return true;
    if (audience === "agent") return c.agent === value;
    if (audience === "one") return c.id === value;
    return c.tags.includes(value);
  });
  const recipients = inGroup.filter((c) => c.acceptMassEmail && c.emails.length > 0);
  const leftOut = inGroup.length - recipients.length;
  const sample = recipients[0] ?? null;
  const preview = mergeText(body || template?.body || "", sample, db.settings);
  const previewSubject = mergeText(subject || template?.subject || "", sample, db.settings);

  const audienceLabel =
    audience === "all" ? "Everyone who accepts mass email" : audience === "agent" ? `${value}’s people` : audience === "one" ? "One person" : value;

  async function save(send: boolean) {
    const res = await act({
      type: "saveCampaign",
      campaign: {
        id: existing?.id,
        name: name || subject || template?.name || "Campaign",
        templateId: activeTemplateId,
        subject: subject || template?.subject || "",
        body: body || template?.body || "",
        audienceLabel,
        recipientIds: recipients.map((c) => c.id),
        send,
      },
    });
    if (toastResult(res, send ? "Campaign recorded. No real email was sent." : "Draft saved")) {
      router.push("/email");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Mass email"
        title={existing ? "Continue a draft" : "New campaign"}
        lede="This desk records the campaign and writes it on each person’s history. It does not email anyone."
      >
        <Button variant="outline" asChild>
          <Link href="/email">Back</Link>
        </Button>
      </PageHeader>
      <div className="grid gap-4">
        <article className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <Field label="Start from a template">
            {db.emailTemplates.filter(isOpen).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No templates yet.{" "}
                <Link href="/email" className="underline underline-offset-2">
                  Write one
                </Link>{" "}
                or type the message below.
              </p>
            ) : (
              <Select
                value={activeTemplateId}
                onValueChange={(id) => {
                  setTemplateId(id);
                  const next = db.emailTemplates.find((t) => t.id === id);
                  if (next && !ready) {
                    setSubject(next.subject);
                    setBody(next.body);
                    setName(next.name);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {db.emailTemplates.filter(isOpen).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <div className="mt-3 grid gap-3">
            <Field label="Campaign name">
              <Input value={name} onChange={(e) => { setReady(true); setName(e.target.value); }} />
            </Field>
            <Field label="Subject">
              <Input value={subject || template?.subject || ""} onChange={(e) => { setReady(true); setSubject(e.target.value); }} />
            </Field>
            <Field label="Message">
              <Textarea value={body || template?.body || ""} onChange={(e) => { setReady(true); setBody(e.target.value); }} className="min-h-40 bg-card" />
            </Field>
            <div className="flex flex-wrap gap-1">
              {MERGE_FIELDS.slice(0, 6).map((field) => (
                <button key={field.token} type="button" className="rounded-full bg-secondary px-2 py-1 text-xs" onClick={() => setBody(`${body || template?.body || ""}{{${field.token}}}`)}>
                  {field.label}
                </button>
              ))}
            </div>
          </div>
        </article>
        <article className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <Field label="Who gets it">
            <Select
              value={audience}
              onValueChange={(next) => {
                setAudience(next);
                if (next === "tag") setValue(db.settings.groups.includes("Holiday card") ? "Holiday card" : db.settings.groups[0] || "");
                else if (next === "agent") setValue(db.settings.agents[0] || "");
                else setValue("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tag">A group</SelectItem>
                <SelectItem value="agent">One agent’s people</SelectItem>
                <SelectItem value="all">Everyone who accepts mass email</SelectItem>
                <SelectItem value="one">One person, as a test</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {audience === "tag" ? (
            <div className="mt-3">
              <Field label="Group">
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {db.settings.groups.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}
          {audience === "agent" ? (
            <div className="mt-3">
              <Field label="Agent">
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {db.settings.agents.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}
          {audience === "one" ? (
            <div className="mt-3">
              <PersonPicker contacts={db.contacts} value={value} onChange={setValue} label="Person" />
            </div>
          ) : null}
          <p className="mt-3 text-sm">
            <span className="font-medium text-foreground">{recipients.length}</span> people will be included.
            {leftOut > 0 ? ` ${leftOut} in that group are left out because they opted out or have no email.` : ""}
          </p>
        </article>
        <article className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Preview{sample ? ` for ${personName(sample)}` : ""}</p>
          <p className="mt-2 font-medium">{previewSubject || "No subject yet"}</p>
          <p className="mt-2 text-xs text-muted-foreground">To: {sample ? primaryEmail(sample) : "nobody yet"}</p>
          <pre className="mt-3 font-sans text-sm whitespace-pre-wrap">{preview}</pre>
        </article>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void save(false)}>
            Save draft
          </Button>
          <Button onClick={() => void save(true)} disabled={recipients.length === 0}>
            Record as sent
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<p>Opening the campaign…</p>}>
      <NewCampaignInner />
    </Suspense>
  );
}
