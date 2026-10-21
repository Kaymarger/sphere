"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Field, PersonLink, PersonPicker, toastResult, usePageTitle, useSyncedDraft } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { whenLabel } from "@/lib/dates";
import { isOpen, personName } from "@/lib/people";
import type { PlanStep } from "@/lib/types";

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const { db, today, act } = useOffice();
  const router = useRouter();
  const plan = db?.plans.find((p) => p.id === params.id && isOpen(p));
  usePageTitle(plan?.name ?? "Plan");
  const [contactId, setContactId] = useState("");
  const synced = useSyncedDraft(
    plan ? { name: plan.name, description: plan.description, category: plan.category, method: plan.method, steps: plan.steps } : null,
  );
  if (!db) return null;
  if (!plan || !synced.draft) {
    return (
      <EmptyState
        title="That plan is gone"
        action={
          <Button asChild>
            <Link href="/plans">All plans</Link>
          </Button>
        }
      />
    );
  }
  const draft = synced.draft;
  const enrolled = db.enrollments.filter((e) => e.planId === plan.id && isOpen(e));

  function setSteps(steps: PlanStep[]) {
    synced.setDraft({ ...draft, steps });
  }

  return (
    <div className="space-y-6">
      <Link href="/plans" className="text-sm text-foreground underline-offset-2 hover:underline">
        All plans
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-brand">
            {plan.category} · {plan.method}
          </p>
          <h1 className="font-heading text-4xl text-foreground">{plan.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const res = await act({ type: "copyPlan", id: plan.id });
              if (toastResult(res, "Copy created") && res.ok && res.result?.id) router.push(`/plans/${res.result.id}`);
            }}
          >
            Copy plan
          </Button>
          <Button variant="destructive" onClick={async () => {
            const res = await act({ type: "deletePlans", ids: [plan.id] });
            if (toastResult(res, "Moved to the recycle bin")) router.push("/plans");
          }}>
            Remove
          </Button>
        </div>
      </div>

      <article className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-xl text-foreground">Steps</h2>
          <Button
            disabled={!synced.dirty}
            onClick={async () => {
              const res = await act({
                type: "savePlan",
                plan: {
                  ...plan,
                  name: draft.name,
                  description: draft.description,
                  category: draft.category,
                  method: draft.method,
                  steps: draft.steps,
                },
              });
              toastResult(res, "Plan saved");
            }}
          >
            Save steps
          </Button>
        </div>
        <Field label="Name">
          <Input value={draft.name} onChange={(e) => synced.setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Description">
            <Textarea value={draft.description} onChange={(e) => synced.setDraft({ ...draft, description: e.target.value })} className="bg-card" />
          </Field>
          <div className="grid gap-3">
            <Field label="Category">
              <Select value={draft.category} onValueChange={(category) => synced.setDraft({ ...draft, category: category as typeof draft.category })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Marketing", "Listing", "Closing"].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mostly">
              <Select value={draft.method} onValueChange={(method) => synced.setDraft({ ...draft, method: method as typeof draft.method })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Email", "Letter", "Mixed"].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <ol className="mt-4 space-y-3">
          {draft.steps.map((step, index) => (
            <li key={index} className="grid gap-2 rounded-xl bg-secondary/50 p-3 md:grid-cols-[5rem_8rem_1fr_auto]">
              <Field label="Day">
                <Input
                  type="number"
                  min={0}
                  value={step.day}
                  onChange={(e) => setSteps(draft.steps.map((s, i) => (i === index ? { ...s, day: Number(e.target.value) } : s)))}
                />
              </Field>
              <Field label="Channel">
                <Select
                  value={step.channel}
                  onValueChange={(channel) =>
                    setSteps(draft.steps.map((s, i) => (i === index ? { ...s, channel: channel as PlanStep["channel"] } : s)))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Email", "Letter", "Call", "Task"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-2">
                <Input
                  value={step.title}
                  aria-label="Step title"
                  onChange={(e) => setSteps(draft.steps.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)))}
                />
                <Input
                  value={step.detail}
                  aria-label="Step detail"
                  onChange={(e) => setSteps(draft.steps.map((s, i) => (i === index ? { ...s, detail: e.target.value } : s)))}
                />
              </div>
              <Button type="button" variant="ghost" onClick={() => setSteps(draft.steps.filter((_, i) => i !== index))}>
                Remove
              </Button>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() =>
            setSteps([
              ...draft.steps,
              { day: (draft.steps.at(-1)?.day ?? 0) + 7, channel: "Email", title: "Next touch", detail: "" },
            ])
          }
        >
          Add a step
        </Button>
      </article>

      <article className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-xl text-foreground">People on this plan</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <PersonPicker contacts={db.contacts} value={contactId} onChange={setContactId} />
          <Button
            disabled={!contactId}
            onClick={async () => {
              const res = await act({ type: "enroll", planId: plan.id, contactId });
              if (toastResult(res, "They are on the plan")) setContactId("");
            }}
          >
            Enroll
          </Button>
        </div>
        <ul className="mt-4 space-y-2">
          {enrolled.length === 0 ? <li className="text-sm text-muted-foreground">Nobody is enrolled yet.</li> : null}
          {enrolled.map((e) => {
            const person = db.contacts.find((c) => c.id === e.contactId);
            const step = plan.steps[e.stepIndex];
            return (
              <li key={e.id} className="flex flex-col gap-2 rounded-xl bg-secondary/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {person ? <PersonLink id={person.id} name={personName(person)} /> : "Removed person"}
                  <p className="text-sm text-muted-foreground">
                    {e.status} · step {e.stepIndex + 1} of {plan.steps.length}
                    {step ? ` · ${step.channel}: ${step.title}` : ""} · {whenLabel(e.nextDue, today)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {e.status === "Running" ? (
                    <Button size="sm" variant="outline" onClick={() => void act({ type: "advanceEnrollment", id: e.id })}>
                      This step is done
                    </Button>
                  ) : null}
                  {e.status === "Finished" ? (
                    <span className="self-center text-sm text-muted-foreground">Finished</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void act({
                          type: "setEnrollmentStatus",
                          id: e.id,
                          status: e.status === "Paused" ? "Running" : "Paused",
                        })
                      }
                    >
                      {e.status === "Paused" ? "Resume" : "Pause"}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void act({ type: "deleteEnrollments", ids: [e.id] })}>
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </article>
    </div>
  );
}
