"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, toastResult, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { shortDate } from "@/lib/dates";
import { personName } from "@/lib/people";
import type { BinBucket } from "@/lib/types";

const LABELS: { bucket: BinBucket; title: string }[] = [
  { bucket: "contacts", title: "People" },
  { bucket: "tasks", title: "Tasks" },
  { bucket: "events", title: "Appointments" },
  { bucket: "emailTemplates", title: "Email templates" },
  { bucket: "letterTemplates", title: "Letters" },
  { bucket: "campaigns", title: "Campaigns" },
  { bucket: "plans", title: "Plans" },
  { bucket: "vendors", title: "Vendors" },
  { bucket: "listings", title: "Listings" },
  { bucket: "buyers", title: "Buyers" },
  { bucket: "deals", title: "Deals" },
  { bucket: "enrollments", title: "Plan enrollments" },
];

export default function RecyclePage() {
  const { db, act } = useOffice();
  usePageTitle("Recycle bin");
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [pendingPurge, setPendingPurge] = useState<string | null>(null);
  if (!db) return null;
  const sections = LABELS.map((item) => {
    const rows = (db[item.bucket] as { id: string; deletedAt?: string | null }[]).filter((r) => r.deletedAt);
    return { ...item, rows };
  }).filter((s) => s.rows.length);
  const total = sections.reduce((n, s) => n + s.rows.length, 0);

  return (
    <div>
      <PageHeader eyebrow="Recycle bin" title={total ? `${total} waiting` : "The bin is empty"} lede="Restore something if you deleted it by mistake, or empty the bin when you are sure.">
        {total ? (
          confirmEmpty ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={async () => {
                  const res = await act({ type: "emptyBin" });
                  if (toastResult(res, "Bin emptied")) setConfirmEmpty(false);
                }}
              >
                Yes, empty the bin
              </Button>
              <Button variant="outline" onClick={() => setConfirmEmpty(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmEmpty(true)}>
              Empty bin
            </Button>
          )
        ) : null}
      </PageHeader>
      {total === 0 ? <EmptyState title="Nothing in the bin" body="Deleted people, tasks, and templates land here first." /> : null}
      {sections.map((section) => (
        <section key={section.bucket} className="mb-6">
          <h2 className="mb-2 font-heading text-2xl text-foreground">{section.title}</h2>
          <ul className="space-y-2">
            {section.rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
                <div>
                  <p className="font-medium">{labelFor(db, section.bucket, row.id)}</p>
                  <p className="text-xs text-muted-foreground">Removed {row.deletedAt ? shortDate(row.deletedAt.slice(0, 10)) : ""}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void act({ type: "restore", bucket: section.bucket, ids: [row.id] })}>
                    Restore
                  </Button>
                  {pendingPurge === row.id ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        const res = await act({ type: "purge", bucket: section.bucket, ids: [row.id] });
                        if (toastResult(res, "Deleted")) setPendingPurge(null);
                      }}
                    >
                      Delete forever
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setPendingPurge(row.id)}>
                      Delete forever
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function labelFor(db: NonNullable<ReturnType<typeof useOffice>["db"]>, bucket: BinBucket, id: string) {
  if (bucket === "contacts") {
    const c = db.contacts.find((x) => x.id === id);
    return c ? personName(c) : "Person";
  }
  if (bucket === "tasks") return db.tasks.find((x) => x.id === id)?.title ?? "Task";
  if (bucket === "events") return db.events.find((x) => x.id === id)?.title ?? "Appointment";
  if (bucket === "emailTemplates") return db.emailTemplates.find((x) => x.id === id)?.name ?? "Template";
  if (bucket === "letterTemplates") return db.letterTemplates.find((x) => x.id === id)?.name ?? "Letter";
  if (bucket === "campaigns") return db.campaigns.find((x) => x.id === id)?.name ?? "Campaign";
  if (bucket === "plans") return db.plans.find((x) => x.id === id)?.name ?? "Plan";
  if (bucket === "vendors") return db.vendors.find((x) => x.id === id)?.name ?? "Vendor";
  if (bucket === "listings") return db.listings.find((x) => x.id === id)?.address ?? "Listing";
  if (bucket === "buyers") {
    const b = db.buyers.find((x) => x.id === id);
    const c = db.contacts.find((x) => x.id === b?.contactId);
    return c ? personName(c) : "Buyer";
  }
  if (bucket === "deals") return db.deals.find((x) => x.id === id)?.address ?? "Deal";
  const enrollment = db.enrollments.find((x) => x.id === id);
  const plan = db.plans.find((x) => x.id === enrollment?.planId);
  const person = db.contacts.find((x) => x.id === enrollment?.contactId);
  return `${person ? personName(person) : "Someone"} · ${plan?.name ?? "Plan"}`;
}
