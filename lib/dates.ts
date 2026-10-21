export const OFFICE_TZ = "America/Vancouver";

export function safeTimeZone(timeZone?: string): string {
  const zone = timeZone?.trim() || OFFICE_TZ;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format();
    return zone;
  } catch {
    return OFFICE_TZ;
  }
}

export function todayInTimeZone(timeZone = OFFICE_TZ, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86400000);
}

export function monthDayInYear(source: string, year: number): string {
  const md = source.slice(5, 10);
  if (md === "02-29") {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? "02-29" : "02-28";
  }
  return md;
}

/** The occurrence of an annual date that falls inside the window around today. */
export function annualOccurrence(
  source: string,
  today: string,
  past: number,
  future: number,
): string | null {
  if (!source || source.length < 10 || source.slice(5, 10) === "") return null;
  const year = Number(today.slice(0, 4));
  let best: string | null = null;
  let bestAbs = Infinity;
  for (const y of [year - 1, year, year + 1]) {
    const candidate = `${y}-${monthDayInYear(source, y)}`;
    const diff = daysBetween(today, candidate);
    if (diff < -past || diff > future) continue;
    const abs = Math.abs(diff);
    if (abs < bestAbs) {
      best = candidate;
      bestAbs = abs;
    }
  }
  return best;
}

export function ageOn(birthday: string, on: string): number | null {
  if (!birthday || birthday.length < 10) return null;
  let age = Number(on.slice(0, 4)) - Number(birthday.slice(0, 4));
  if (on.slice(5) < birthday.slice(5)) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const shift = (weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + shift + (n - 1) * 7;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.toISOString().slice(0, 10);
}

export function victoriaDay(year: number): string {
  const may24 = `${year}-05-24`;
  const dow = new Date(Date.UTC(year, 4, 24)).getUTCDay();
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(may24, -back);
}

export function weekdayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthLabel(year: number, month: number): string {
  const dt = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

export function longDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function shortDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function weekdayDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function fullDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function whenLabel(date: string, today: string): string {
  const n = daysBetween(today, date);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${-n} days overdue`;
  if (n < 7) {
    const [y, m, d] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("en-CA", { weekday: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(y, m - 1, d)),
    );
  }
  return shortDate(date);
}

export function greetingForHour(name: string, timeZone = OFFICE_TZ, now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-CA", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: safeTimeZone(timeZone),
    }).format(now),
  );
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? "";
}

export function parseLooseDate(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  const slash = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const y = Number(slash[3]);
    let month = a;
    let day = b;
    if (a > 12 && b <= 12) {
      day = a;
      month = b;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const named = value.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (named) {
    const month = MONTHS.findIndex((m) => m.toLowerCase().startsWith(named[1].toLowerCase().slice(0, 3))) + 1;
    const day = Number(named[2]);
    const y = Number(named[3]);
    if (month > 0 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return "";
}
