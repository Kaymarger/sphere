"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, PageHeader, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { isOpen } from "@/lib/people";
import type { ActivityPlan } from "@/lib/types";

export default function PlansPage() {
  const { db, act } = useOffice();
  const router = useRouter();
  usePageTitle("Activity plans");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ActivityPlan["category"]>("Marketing");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<ActivityPlan["method"]>("Mixed");
  if (!db) return null;
  const groups = ["Marketing", "Listing", "Closing"] as const;

  return (
    <div>
      <PageHeader
        eyebrow="Activity plans"
        title="Drip sequences you can actually follow"
        lede="Each plan is a short list of emails, letters, calls, and tasks. Enroll a person and the next step shows on the home page."
      >
        <Button onClick={() => setOpen(true)}>New plan</Button>
      </PageHeader>
      {groups.map((group) => (
        <section key={group} className="mb-6">
          <h2 className="mb-2 text-sm font-medium tracking-wide text-brand uppercase">{group} plans</h2>
          <ul className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            {db.plans
              .filter((p) => isOpen(p) && p.category === group)
              .map((plan) => {
                const running = db.enrollments.filter((e) => e.planId === plan.id && e.status === "Running" && isOpen(e)).length;
                return (
                  <li key={plan.id} className="border-b last:border-b-0">
                    <Link href={`/plans/${plan.id}`} className="grid gap-1 px-4 py-3 hover:bg-secondary/60 sm:grid-cols-[1.3fr_1.4fr_auto] sm:items-center">
                      <p className="font-medium text-foreground">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                      <p className="text-sm">
                        {plan.method} · {plan.steps.length} steps
                        {running ? ` · ${running} enrolled` : ""}
                      </p>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New plan</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await act({
                type: "savePlan",
                plan: {
                  name,
                  category,
                  description,
                  method,
                  steps: [{ day: 0, channel: "Task", title: "First step", detail: "Describe what happens on day one." }],
                },
              });
              if (toastResult(res, "Plan created") && res.ok && res.result?.id) router.push(`/plans/${res.result.id}`);
            }}
          >
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="What it’s for">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-card" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category">
                <Select value={category} onValueChange={(v) => setCategory(v as ActivityPlan["category"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Mostly">
                <Select value={method} onValueChange={(v) => setMethod(v as ActivityPlan["method"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Email", "Letter", "Mixed"].map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <Button type="submit">Create and edit steps</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
