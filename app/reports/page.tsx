"use client";

import Link from "next/link";
import { PageHeader, usePageTitle } from "@/components/bits";
import { REPORTS } from "@/lib/reports";

export default function ReportsPage() {
  usePageTitle("Reports");
  const groups = [...new Set(REPORTS.map((r) => r.group))];
  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Lists you can print or export"
        lede="The same lists the old system kept: cards, phones, mail, birthdays, anniversaries, sources, referrals, tasks, and deals."
      />
      {groups.map((group) => (
        <section key={group} className="mb-6">
          <h2 className="mb-2 text-sm font-medium tracking-wide text-brand uppercase">{group}</h2>
          <ul className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            {REPORTS.filter((r) => r.group === group).map((r) => (
              <li key={r.slug} className="border-b last:border-b-0">
                <Link href={`/reports/${r.slug}`} className="block px-4 py-3 hover:bg-secondary/60">
                  <p className="font-medium text-foreground">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.blurb}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
