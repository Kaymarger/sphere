"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, EmptyState, PageHeader, usePageTitle } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { monthName } from "@/lib/dates";
import { downloadText } from "@/lib/csv";
import { reportBySlug, rowsToCsv, runReport, shiftMonth } from "@/lib/reports";

export default function ReportPage() {
  const params = useParams<{ slug: string }>();
  const { db, today } = useOffice();
  const meta = reportBySlug(params.slug);
  usePageTitle(meta?.title ?? "Report");
  const [mode, setMode] = useState(meta?.filter === "calendar" ? today.slice(0, 7) : today.slice(5, 7));
  const output = useMemo(() => (db && meta ? runReport(db, meta.slug, today, mode) : null), [db, meta, today, mode]);
  if (!db) return null;
  if (!meta || !output) {
    return (
      <EmptyState
        title="That report isn’t here"
        action={<Button asChild><Link href="/reports">All reports</Link></Button>}
      />
    );
  }
  return (
    <div>
      <Link href="/reports" className="text-sm text-foreground underline-offset-2 hover:underline">All reports</Link>
      <PageHeader eyebrow={meta.group} title={output.title} lede={output.description}>
        <Button variant="outline" onClick={() => window.print()}>Print</Button>
        <Button
          variant="outline"
          onClick={() => downloadText(`${meta.slug}.csv`, rowsToCsv(output.columns, output.rows))}
        >
          Export this list
        </Button>
      </PageHeader>
      {meta.filter === "annual" ? (
        <div className="mb-4 max-w-xs">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="next">Next 30 days</SelectItem>
              <SelectItem value="all">Whole year</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>
                  {monthName(i + 1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {meta.filter === "calendar" ? (
        <div className="mb-4 flex items-center gap-2">
          <Button variant="outline" onClick={() => setMode(shiftMonth(mode, -1))}>Previous</Button>
          <p className="text-sm">{output.note}</p>
          <Button variant="outline" onClick={() => setMode(shiftMonth(mode, 1))}>Next</Button>
        </div>
      ) : output.note ? (
        <p className="mb-3 text-sm text-muted-foreground">{output.note}</p>
      ) : null}
      {meta.slug === "source-summary" ? (
        <div className="mb-4 space-y-2">
          {output.rows.map((row, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm">
                <span>{row.kind}: {row.name}</span>
                <span>{row.count} · {row.share}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-foreground" style={{ width: row.share }} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <DataTable columns={output.columns} rows={output.rows} empty="This list is empty." />
    </div>
  );
}
