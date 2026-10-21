"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Field, PageHeader, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { shortDate } from "@/lib/dates";
import { MERGE_FIELDS } from "@/lib/merge";
import { isOpen } from "@/lib/people";

export default function EmailPage() {
  const { db, act } = useOffice();
  usePageTitle("Mass email");
  const [tab, setTab] = useState<"templates" | "campaigns">("templates");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  if (!db) return null;
  const templates = db.emailTemplates.filter(isOpen).filter((t) => `${t.name} ${t.category} ${t.description}`.toLowerCase().includes(q.toLowerCase()));
  const categories = [...new Set(templates.map((t) => t.category))];
  const current = editing && editing !== "new" ? db.emailTemplates.find((t) => t.id === editing) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Mass email"
        title="Templates and campaigns"
        lede="Canadian rules mean you only email people who agreed. Sphere leaves out anyone marked no mass email."
      >
        <Button variant="outline" onClick={() => setEditing("new")}>
          New template
        </Button>
        <Button asChild>
          <Link href="/email/new">New campaign</Link>
        </Button>
      </PageHeader>
      <div className="mb-4 flex gap-2">
        <Tab on={tab === "templates"} onClick={() => setTab("templates")}>
          Templates
        </Tab>
        <Tab on={tab === "campaigns"} onClick={() => setTab("campaigns")}>
          Campaigns
        </Tab>
      </div>
      {tab === "templates" ? (
        <>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" aria-label="Search templates" className="mb-4 max-w-md" />
          {categories.length === 0 ? <EmptyState title="No templates match" /> : null}
          {categories.map((category) => (
            <section key={category} className="mb-6">
              <h2 className="mb-2 text-sm font-medium tracking-wide text-brand uppercase">{category}</h2>
              <ul className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
                {templates
                  .filter((t) => t.category === category)
                  .map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
                      <button type="button" className="min-w-0 text-left" onClick={() => setEditing(t.id)}>
                        <p className="font-medium text-foreground">{t.name}</p>
                        <p className="text-sm text-muted-foreground">{t.description}</p>
                      </button>
                      <span className="hidden text-xs text-muted-foreground sm:block">{t.createdBy}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </>
      ) : (
        <ul className="space-y-2">
          {db.campaigns.filter(isOpen).length === 0 ? <EmptyState title="No campaigns yet" /> : null}
          {db.campaigns.filter(isOpen).map((c) => (
            <li key={c.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.status} · {c.audienceLabel} · {c.recipientIds.length} people
                    {c.sentAt ? ` · ${shortDate(c.sentAt.slice(0, 10))}` : ""}
                  </p>
                  <p className="mt-1 text-sm">{c.subject}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewing(c.id)}>
                    View
                  </Button>
                  {c.status === "Draft" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/email/new?draft=${c.id}`}>Continue</Link>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => void act({ type: "deleteCampaigns", ids: [c.id] })}>
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <TemplateDialog
        open={editing !== null}
        initial={
          current
            ? current
            : { id: "", name: "", category: "Office", description: "", subject: "", body: "{{greeting}}\n\n", createdBy: db.settings.userName }
        }
        onClose={() => setEditing(null)}
        onSave={async (template) => {
          const res = await act({
            type: "saveEmailTemplate",
            template: { ...template, id: template.id || undefined },
          });
          if (toastResult(res, "Template saved")) setEditing(null);
        }}
        onDelete={
          current
            ? async () => {
                const res = await act({ type: "deleteEmailTemplates", ids: [current.id] });
                if (toastResult(res, "Template moved to the recycle bin")) setEditing(null);
              }
            : undefined
        }
      />
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{db.campaigns.find((c) => c.id === viewing)?.name ?? "Campaign"}</DialogTitle>
          </DialogHeader>
          {(() => {
            const campaign = db.campaigns.find((c) => c.id === viewing);
            if (!campaign) return null;
            return (
              <div className="grid gap-2 text-sm">
                <p className="text-muted-foreground">
                  {campaign.status} · {campaign.audienceLabel} · {campaign.recipientIds.length} people
                </p>
                <p className="font-medium">{campaign.subject}</p>
                <pre className="font-sans whitespace-pre-wrap">{campaign.body}</pre>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-sm ${on ? "bg-foreground text-background" : "bg-card ring-1 ring-foreground/10"}`}>
      {children}
    </button>
  );
}

function TemplateDialog({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: { id: string; name: string; category: string; description: string; subject: string; body: string; createdBy: string };
  onClose: () => void;
  onSave: (template: { id: string; name: string; category: string; description: string; subject: string; body: string; createdBy: string }) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const signature = `${initial.id}|${open}`;
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setDraft(initial);
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit template" : "New template"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Category">
            <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          </Field>
          <Field label="What it’s for">
            <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <Field label="Subject">
            <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
          </Field>
          <Field label="Message">
            <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="min-h-40 bg-card" />
          </Field>
          <div className="flex flex-wrap gap-1">
            {MERGE_FIELDS.map((field) => (
              <button
                key={field.token}
                type="button"
                className="rounded-full bg-secondary px-2 py-1 text-xs"
                onClick={() => setDraft({ ...draft, body: `${draft.body}{{${field.token}}}` })}
              >
                {field.label}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          {onDelete ? (
            <Button variant="ghost" onClick={onDelete}>
              Move to recycle bin
            </Button>
          ) : null}
          <Button onClick={() => onSave(draft)}>Save template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
