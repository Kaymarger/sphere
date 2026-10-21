"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Initials, usePageTitle, PersonLink } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { addDays, fullDate, greetingForHour, shortDate, whenLabel } from "@/lib/dates";
import { money } from "@/lib/format";
import { touchCounts } from "@/lib/keep-in-touch";
import { isOpen, personName } from "@/lib/people";

export default function HomePage() {
  const { db, today, act } = useOffice();
  usePageTitle("Home");
  if (!db) return null;
  const touch = touchCounts(db, today);
  const people = db.contacts.filter(isOpen);
  const openTasks = db.tasks.filter((t) => isOpen(t) && !t.done).sort((a, b) => a.due.localeCompare(b.due));
  const dueTasks = openTasks.filter((t) => t.due <= today);
  const listings = db.listings.filter((l) => isOpen(l) && l.status !== "Pending");
  const buyers = db.buyers.filter((b) => isOpen(b) && b.status !== "Paused");
  const optedOut = people.filter((c) => !c.acceptMassEmail).length;
  const closing = db.deals.filter(
    (d) => isOpen(d) && (d.status === "Firm" || d.status === "Conditional") && d.closeDate <= addDays(today, 45),
  );
  const planSteps = db.enrollments
    .filter((e) => isOpen(e) && e.status === "Running" && e.nextDue <= addDays(today, 7))
    .map((e) => {
      const plan = db.plans.find((p) => p.id === e.planId);
      const contact = db.contacts.find((c) => c.id === e.contactId);
      const step = plan?.steps[e.stepIndex];
      return { e, plan, contact, step };
    })
    .filter((row) => row.plan && row.contact && row.step);
  const needs = [...touch.buckets.overdue, ...touch.buckets.today].slice(0, 6);
  const recent = people
    .flatMap((c) => c.activities.slice(0, 2).map((a) => ({ ...a, contact: c })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const stats = [
    { href: "/keep-in-touch", label: "Overdue reminders", value: touch.overdue, hint: "Clear these so they don’t pile up" },
    { href: "/keep-in-touch", label: "Due today", value: touch.today, hint: "Birthdays, anniversaries, holidays" },
    { href: "/tasks", label: "Tasks due", value: dueTasks.length, hint: "Including anything late" },
    { href: "/business", label: "Live listings", value: listings.length, hint: "Active, coming soon, or conditional" },
  ];

  return (
    <div className="space-y-6">
      {db.settings.showWelcome ? (
        <section className="rounded-xl border bg-card px-5 py-5 shadow-sm sm:px-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">A quieter desk</p>
          <h2 className="mt-1 text-lg">Same jobs. Less hunting.</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>People holds every past client, split into short cards instead of one long form.</li>
            <li>Keep in Touch shows birthdays, move-in dates, purchase anniversaries, and holidays.</li>
            <li>Mass email, letters, labels, and drip plans live under Outreach.</li>
            <li>Everyone in this book is made up. Import is ready when you have a real export.</li>
          </ul>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void act({ type: "dismissWelcome" })}
          >
            Hide this note
          </Button>
        </section>
      ) : null}

      <header>
        <p className="text-sm text-muted-foreground">{fullDate(today)}</p>
        <h1 className="mt-1 text-3xl tracking-tight sm:text-4xl">{greetingForHour(db.settings.userName, db.settings.timezone)}</h1>
        <p className="mt-1 text-muted-foreground">
          {db.settings.officeName} · {db.settings.brokerage} · {db.settings.city}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition hover:-translate-y-0.5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl tracking-tight">{stat.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{stat.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [`${people.length}`, "people in the book", "/contacts"],
          [`${buyers.length}`, "buyers in play", "/business"],
          [`${closing.length}`, "deals still open", "/business"],
          [`${optedOut}`, "opted out of mass email", "/reports/no-mass-email"],
        ].map(([value, label, href]) => (
          <Link key={label} href={href} className="rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10 transition hover:-translate-y-0.5">
            <span className="font-semibold text-foreground">{value}</span> {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-3">
          <div className="flex items-end justify-between">
            <h2 className="font-heading text-2xl text-foreground">Needs you</h2>
            <Link href="/keep-in-touch" className="text-sm text-foreground underline-offset-2 hover:underline">
              All reminders
            </Link>
          </div>
          {needs.length === 0 ? (
            <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground ring-1 ring-foreground/10">
              Nothing overdue, and nothing due today. Enjoy the quiet.
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
              {needs.map((item) => (
                <li key={item.key} className="flex items-center gap-3 px-4 py-3">
                  <Initials name={item.contactId ? personName(people.find((c) => c.id === item.contactId) || { firstName: item.title, lastName: "" }) : item.title} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {item.contactId ? <PersonLink id={item.contactId} name={item.title} /> : item.title}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                  <p className={`shrink-0 text-sm ${item.date < today ? "font-medium text-brand" : "text-muted-foreground"}`}>{whenLabel(item.date, today)}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end justify-between pt-2">
            <h2 className="font-heading text-2xl text-foreground">Tasks</h2>
            <Link href="/tasks" className="text-sm text-foreground underline-offset-2 hover:underline">
              Task list
            </Link>
          </div>
          <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            {openTasks.slice(0, 5).map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {task.kind}
                    {task.contactId ? ` · ${personName(people.find((c) => c.id === task.contactId) || { firstName: "Someone", lastName: "" })}` : ""}
                  </p>
                </div>
                <p className={`text-sm ${task.due < today ? "text-brand" : "text-muted-foreground"}`}>{whenLabel(task.due, today)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-6 lg:col-span-2">
          <div>
            <h2 className="font-heading text-2xl text-foreground">Plan steps</h2>
            <ul className="mt-3 space-y-2">
              {planSteps.length === 0 ? (
                <li className="text-sm text-muted-foreground">No plan steps due this week.</li>
              ) : (
                planSteps.map(({ e, plan, contact, step }) => (
                  <li key={e.id} className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                    <Link href={`/plans/${plan!.id}`} className="font-medium text-foreground hover:underline">
                      {plan!.name}
                    </Link>
                    <p className="text-sm">
                      {step!.channel}: {step!.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <PersonLink id={contact!.id} name={personName(contact!)} /> · {whenLabel(e.nextDue, today)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <h2 className="font-heading text-2xl text-foreground">Deals on the go</h2>
            <ul className="mt-3 space-y-2">
              {closing.length === 0 ? (
                <li className="text-sm text-muted-foreground">No firm or conditional deals in the next month and a half.</li>
              ) : (
                closing.map((deal) => (
                  <li key={deal.id} className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                    <p className="font-medium text-foreground">{deal.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {deal.status} · {deal.side} · {money(deal.price)} · {shortDate(deal.closeDate)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <h2 className="font-heading text-2xl text-foreground">Latest notes</h2>
            <ul className="mt-3 space-y-2">
              {recent.map((item) => (
                <li key={item.id} className="text-sm">
                  <PersonLink id={item.contact.id} name={personName(item.contact)} />
                  <span className="text-muted-foreground"> · {item.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
