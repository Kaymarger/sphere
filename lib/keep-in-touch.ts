import type { Database, TouchState } from "./types";
import { addDays, ageOn, annualOccurrence, daysBetween, nthWeekday, victoriaDay } from "./dates";
import { personName } from "./people";

export type TouchKind =
  | "Birthday"
  | "Spouse birthday"
  | "Child birthday"
  | "Wedding anniversary"
  | "Move-in anniversary"
  | "Purchase anniversary"
  | "Holiday";

export interface TouchItem {
  key: string;
  kind: TouchKind;
  date: string;
  title: string;
  detail: string;
  contactId?: string;
  action: string;
}

const PAST = 14;
const FUTURE = 45;

function holidayList(year: number): { slug: string; date: string; title: string; detail: string; action: string }[] {
  return [
    {
      slug: "new-year",
      date: `${year}-01-01`,
      title: "New Year’s Day",
      detail: "The office is quiet. A short note to active buyers and sellers is enough.",
      action: "Check who is under contract and send a one-line update.",
    },
    {
      slug: "family-day",
      date: nthWeekday(year, 2, 1, 3),
      title: "Family Day long weekend",
      detail: "A long weekend in B.C. Good for open houses, not for mass email.",
      action: "Confirm weekend open houses before Friday.",
    },
    {
      slug: "valentines",
      date: `${year}-02-14`,
      title: "Valentine’s Day",
      detail: "A light card for couples who like mail. Skip anyone marked do-not-market.",
      action: "Use the holiday card group if you send a few cards.",
    },
    {
      slug: "mothers-day",
      date: nthWeekday(year, 5, 0, 2),
      title: "Mother’s Day",
      detail: "Cards only for people who enjoy them. Do not turn this into a sales blast.",
      action: "Pull the holiday card group and print labels.",
    },
    {
      slug: "victoria-day",
      date: victoriaDay(year),
      title: "Victoria Day long weekend",
      detail: "Busy showing weekend. Remind agents which listings are holding open houses.",
      action: "Look at active listings and the calendar.",
    },
    {
      slug: "fathers-day",
      date: nthWeekday(year, 6, 0, 3),
      title: "Father’s Day",
      detail: "Same idea as Mother’s Day: a few personal cards, not a campaign.",
      action: "Pick a handful of people, do not mail the whole book.",
    },
    {
      slug: "canada-day",
      date: `${year}-07-01`,
      title: "Canada Day",
      detail: "A market note can wait until the next business day.",
      action: "Pause mass email on the holiday.",
    },
    {
      slug: "bc-day",
      date: nthWeekday(year, 8, 1, 1),
      title: "B.C. Day",
      detail: "August long weekend. Showings still happen; paperwork can wait.",
      action: "Check Monday appointments.",
    },
    {
      slug: "labour-day",
      date: nthWeekday(year, 9, 1, 1),
      title: "Labour Day",
      detail: "The fall market starts in earnest the week after.",
      action: "Line up September nurture plans.",
    },
    {
      slug: "truth-reconciliation",
      date: `${year}-09-30`,
      title: "National Day for Truth and Reconciliation",
      detail: "A day to pause marketing. Do not schedule campaigns.",
      action: "Leave the mass-email queue empty.",
    },
    {
      slug: "thanksgiving",
      date: nthWeekday(year, 10, 1, 2),
      title: "Thanksgiving",
      detail: "A warm note is welcome. A listing pitch is not.",
      action: "Send personal notes, not a blast.",
    },
    {
      slug: "halloween",
      date: `${year}-10-31`,
      title: "Halloween",
      detail: "Fun for neighbourhood farms and families with kids. Keep it light.",
      action: "Optional card for the holiday card group.",
    },
    {
      slug: "remembrance",
      date: `${year}-11-11`,
      title: "Remembrance Day",
      detail: "The office is closed. Do not send marketing.",
      action: "Clear anything scheduled for that morning.",
    },
    {
      slug: "holiday-cards",
      date: `${year}-12-05`,
      title: "Holiday cards",
      detail: "This is the week to get cards in the mail so they arrive before the rush.",
      action: "Open Letters & Labels and use the holiday card group.",
    },
    {
      slug: "christmas",
      date: `${year}-12-25`,
      title: "Christmas Day",
      detail: "Office closed. Year-end cards should already be gone.",
      action: "Nothing to send today.",
    },
    {
      slug: "boxing",
      date: `${year}-12-26`,
      title: "Boxing Day",
      detail: "Office closed. Buyers may still be browsing.",
      action: "Check messages the next business day.",
    },
  ];
}

function pushAnnual(
  items: TouchItem[],
  source: string,
  today: string,
  make: (date: string) => TouchItem | null,
) {
  const date = annualOccurrence(source, today, PAST, FUTURE);
  if (!date) return;
  const item = make(date);
  if (item) items.push(item);
}

function birthdayDetail(birthday: string, on: string, extra?: string): string {
  const age = ageOn(birthday, on);
  const turning = age === null ? "Birthday" : `Turning ${age}`;
  return extra ? `${turning}. ${extra}` : turning;
}

export function buildTouches(db: Database, today: string): TouchItem[] {
  const items: TouchItem[] = [];
  const year = Number(today.slice(0, 4));
  for (const y of [year - 1, year, year + 1]) {
    for (const holiday of holidayList(y)) {
      const diff = daysBetween(today, holiday.date);
      if (diff < -PAST || diff > FUTURE) continue;
      items.push({
        key: `holiday:${holiday.slug}:${holiday.date.slice(0, 4)}`,
        kind: "Holiday",
        date: holiday.date,
        title: holiday.title,
        detail: holiday.detail,
        action: holiday.action,
      });
    }
  }

  for (const c of db.contacts) {
    if (c.deletedAt) continue;
    const who = personName(c);
    pushAnnual(items, c.birthday, today, (date) => ({
      key: `birthday:${c.id}:${date.slice(0, 4)}`,
      kind: "Birthday",
      date,
      title: `${who}’s birthday`,
      detail: birthdayDetail(c.birthday, date, c.mailPreference === "Mail" ? "They prefer a card." : "A short note is enough."),
      contactId: c.id,
      action: c.acceptMassEmail ? "A personal note, not a mass email." : "They opted out of mass email. Keep this personal.",
    }));
    if (c.spouseFirst && c.spouseBirthday) {
      pushAnnual(items, c.spouseBirthday, today, (date) => ({
        key: `spouse:${c.id}:${date.slice(0, 4)}`,
        kind: "Spouse birthday",
        date,
        title: `${c.spouseFirst}’s birthday`,
        detail: birthdayDetail(c.spouseBirthday, date, `Household of ${who}.`),
        contactId: c.id,
        action: "Wish the household, not a campaign.",
      }));
    }
    c.children.forEach((child, index) => {
      if (!child.birthday || !child.name) return;
      pushAnnual(items, child.birthday, today, (date) => ({
        key: `child:${c.id}:${index}:${date.slice(0, 4)}`,
        kind: "Child birthday",
        date,
        title: `${child.name}’s birthday`,
        detail: birthdayDetail(child.birthday, date, `In ${who}’s household.`),
        contactId: c.id,
        action: "Only mention it if you know the family well.",
      }));
    });
    if (c.anniversary) {
      pushAnnual(items, c.anniversary, today, (date) => {
        const years = ageOn(c.anniversary, date);
        return {
          key: `wedding:${c.id}:${date.slice(0, 4)}`,
          kind: "Wedding anniversary",
          date,
          title: `${who}’s anniversary`,
          detail: years ? `${years} years together.` : "Wedding anniversary.",
          contactId: c.id,
          action: "A card or a two-line email.",
        };
      });
    }
    if (c.moveInDate) {
      pushAnnual(items, c.moveInDate, today, (date) => {
        const years = ageOn(c.moveInDate, date);
        return {
          key: `movein:${c.id}:${date.slice(0, 4)}`,
          kind: "Move-in anniversary",
          date,
          title: `${who} moved in`,
          detail: years
            ? `${years} year${years === 1 ? "" : "s"} at ${c.street || c.city}.`
            : `Move-in anniversary at ${c.street || c.city}.`,
          contactId: c.id,
          action: "Offer a no-pressure neighbourhood note.",
        };
      });
    }
    for (const property of c.properties) {
      if (property.role !== "Bought" || !property.date) continue;
      if (c.moveInDate && c.moveInDate.slice(5) === property.date.slice(5)) continue;
      pushAnnual(items, property.date, today, (date) => {
        const years = ageOn(property.date, date);
        return {
          key: `purchase:${c.id}:${property.id}:${date.slice(0, 4)}`,
          kind: "Purchase anniversary",
          date,
          title: `${who}’s purchase anniversary`,
          detail: `${property.address}${years ? ` · ${years} years` : ""}`,
          contactId: c.id,
          action: "A short congratulations. Ask if they want a value chat.",
        };
      });
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  return items;
}

export interface TouchBuckets {
  overdue: TouchItem[];
  today: TouchItem[];
  week: TouchItem[];
  upcoming: TouchItem[];
}

function stateFor(states: TouchState[], key: string): TouchState | undefined {
  return states.find((s) => s.key === key);
}

export function effectiveDate(item: TouchItem, state?: TouchState): string {
  if (state?.snoozeUntil && state.snoozeUntil > item.date) return state.snoozeUntil;
  return item.date;
}

export function bucketTouches(items: TouchItem[], states: TouchState[], today: string): TouchBuckets {
  const buckets: TouchBuckets = { overdue: [], today: [], week: [], upcoming: [] };
  const weekEnd = addDays(today, 7);
  const horizon = addDays(today, FUTURE);
  const overdueStart = addDays(today, -PAST);
  for (const item of items) {
    const state = stateFor(states, item.key);
    if (state?.dismissed) continue;
    const date = effectiveDate(item, state);
    if (date < overdueStart || date > horizon) continue;
    const shown = date === item.date ? item : { ...item, date, detail: `${item.detail} Snoozed to this day.` };
    if (date < today) buckets.overdue.push(shown);
    else if (date === today) buckets.today.push(shown);
    else if (date <= weekEnd) buckets.week.push(shown);
    else buckets.upcoming.push(shown);
  }
  return buckets;
}

export function touchCounts(db: Database, today: string) {
  const buckets = bucketTouches(buildTouches(db, today), db.touches, today);
  return {
    overdue: buckets.overdue.length,
    today: buckets.today.length,
    week: buckets.week.length,
    upcoming: buckets.upcoming.length,
    buckets,
  };
}

