"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, toastResult, usePageTitle, useSyncedDraft } from "@/components/bits";
import { useOffice } from "@/components/office-provider";

export default function SettingsPage() {
  const { db, act } = useOffice();
  usePageTitle("Settings");
  const [agent, setAgent] = useState("");
  const [group, setGroup] = useState("");
  const [confirm, setConfirm] = useState(false);
  const synced = useSyncedDraft(
    db
      ? {
          userName: db.settings.userName,
          role: db.settings.role,
          phone: db.settings.phone,
          email: db.settings.email,
          timezone: db.settings.timezone,
        }
      : null,
  );
  if (!db || !synced.draft) return null;
  const draft = synced.draft;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Your desk"
        lede="This is Kayla’s sample login. Time zone stays on Pacific so reminders match the Vancouver office."
      />
      <article className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl text-foreground">You</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input value={draft.userName} onChange={(e) => synced.setDraft({ ...draft, userName: e.target.value })} />
          </Field>
          <Field label="Role">
            <Input value={draft.role} onChange={(e) => synced.setDraft({ ...draft, role: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={draft.phone} onChange={(e) => synced.setDraft({ ...draft, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={draft.email} onChange={(e) => synced.setDraft({ ...draft, email: e.target.value })} />
          </Field>
          <Field label="Time zone">
            <Input value={draft.timezone} onChange={(e) => synced.setDraft({ ...draft, timezone: e.target.value })} />
          </Field>
        </div>
        <Button
          className="mt-4"
          disabled={!synced.dirty}
          onClick={async () => {
            const res = await act({ type: "updateSettings", patch: draft });
            toastResult(res, "Saved");
          }}
        >
          Save
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">
          {db.settings.officeName} · {db.settings.brokerage} · {db.settings.city}
        </p>
      </article>
      <article className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl text-foreground">Agents</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {db.settings.agents.map((name) => (
            <li key={name} className="flex items-center justify-between">
              <span>{name}</span>
              <button type="button" className="text-brand" onClick={() => void act({ type: "removeAgent", name })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">People already assigned to an agent stay assigned.</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await act({ type: "addAgent", name: agent });
            if (toastResult(res, "Agent added")) setAgent("");
          }}
        >
          <Input value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="New agent" aria-label="New agent" />
          <Button type="submit" variant="outline">Add</Button>
        </form>
      </article>
      <article className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl text-foreground">Groups</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {db.settings.groups.map((name) => (
            <li key={name}>
              <button type="button" className="rounded-full bg-secondary px-3 py-1 text-sm" onClick={() => void act({ type: "removeGroup", name })}>
                {name} ×
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await act({ type: "addGroup", name: group });
            if (toastResult(res, "Group added")) setGroup("");
          }}
        >
          <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="New group" aria-label="New group" />
          <Button type="submit" variant="outline">Add</Button>
        </form>
      </article>
      <article className="rounded-2xl border border-dashed p-5">
        <h2 className="font-heading text-2xl text-foreground">Put the sample office back</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The book is saved in this browser only. Restoring throws away your edits here and puts the 492 made-up people back. Another computer, or a cleared browser, starts from that sample on its own.
        </p>
        {confirm ? (
          <div className="mt-3 flex gap-2">
            <Button
              variant="destructive"
              onClick={async () => {
                const res = await act({ type: "resetSample" });
                toastResult(res, "Sample office restored");
                setConfirm(false);
              }}
            >
              Yes, restore the sample
            </Button>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button className="mt-3" variant="outline" onClick={() => setConfirm(true)}>
            Restore sample data
          </Button>
        )}
      </article>
    </div>
  );
}
