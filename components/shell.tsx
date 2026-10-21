"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookUser,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  FolderInput,
  Home,
  ListTodo,
  Lock,
  Mail,
  Menu,
  Moon,
  PenLine,
  PieChart,
  Plus,
  Route,
  Search,
  Settings,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Initials } from "@/components/bits";
import { useOffice } from "@/components/office-provider";
import { touchCounts } from "@/lib/keep-in-touch";
import { contactMatches, personName, primaryEmail, sortPeople } from "@/lib/people";

const GROUPS = [
  {
    label: "Desk",
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/contacts", label: "People", icon: Users },
      { href: "/keep-in-touch", label: "Keep in Touch", icon: Bell },
      { href: "/tasks", label: "Tasks", icon: ListTodo },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Outreach",
    items: [
      { href: "/email", label: "Mass email", icon: Mail },
      { href: "/letters", label: "Letters & labels", icon: PenLine },
      { href: "/plans", label: "Activity plans", icon: Route },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/business", label: "Active business", icon: Briefcase },
      { href: "/directory", label: "Vendors", icon: BookUser },
      { href: "/reports", label: "Reports", icon: PieChart },
    ],
  },
  {
    label: "Office",
    items: [
      { href: "/import", label: "Import & export", icon: FolderInput },
      { href: "/recycle", label: "Recycle bin", icon: Trash2 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ACTIONS = [
  { href: "/contacts/new", label: "Add a person", icon: Plus },
  { href: "/email/new", label: "New campaign", icon: Mail },
  { href: "/import", label: "Import a spreadsheet", icon: FolderInput },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { db, today, busy, error, reload } = useOffice();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);

  const counts = useMemo(() => {
    if (!db) return { touch: 0, tasks: 0, bin: 0 };
    const touch = touchCounts(db, today).overdue;
    const tasks = db.tasks.filter((t) => !t.deletedAt && !t.done && t.due <= today).length;
    const bin =
      db.contacts.filter((c) => c.deletedAt).length +
      db.tasks.filter((t) => t.deletedAt).length +
      db.events.filter((e) => e.deletedAt).length;
    return { touch, tasks, bin };
  }, [db, today]);

  useEffect(() => {
    setMenu(false);
    setPalette(false);
  }, [pathname]);

  useEffect(() => {
    const stored = window.localStorage.getItem("sphere-sidebar");
    if (stored === "collapsed") setCollapsed(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (pathname === "/login") return <>{children}</>;

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("sphere-sidebar", next ? "collapsed" : "open");
      return next;
    });
  }

  if (!db && error) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="max-w-md text-center">
          <Brand />
          <p className="mt-6 text-lg">{error}</p>
          <Button className="mt-4" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!db) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="text-center">
          <Brand />
          <p className="mt-6 text-sm text-muted-foreground">Opening the office book…</p>
        </div>
      </div>
    );
  }

  const badge = (href: string) => {
    if (href === "/keep-in-touch") return counts.touch;
    if (href === "/tasks") return counts.tasks;
    if (href === "/recycle") return counts.bin;
    return 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex ${
          collapsed ? "w-[68px]" : "w-[232px]"
        }`}
      >
        <div className={`pt-4 pb-3 ${collapsed ? "px-2" : "px-3"}`}>
          <Brand compact={collapsed} />
          {collapsed ? null : (
            <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground">
              {db.settings.officeName}
            </p>
          )}
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
          {GROUPS.map((group) => (
            <div key={group.label}>
              {collapsed ? (
                <div className="mx-auto mb-1 h-px w-6 bg-sidebar-border" />
              ) : (
                <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground">{group.label}</p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  pathname={pathname}
                  count={badge(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={`size-4 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            {collapsed ? null : <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className={`transition-[padding] duration-200 ${collapsed ? "md:pl-[68px]" : "md:pl-[232px]"}`}>
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md md:px-5">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenu(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-sm transition hover:border-foreground/15 hover:text-foreground"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Search people or jump…</span>
            <kbd className="ml-auto hidden rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide sm:inline">
              ⌘K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            {busy ? <span className="hidden text-xs text-muted-foreground sm:inline">Saving…</span> : null}
            <span className="inline-flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-foreground/30" />
              Sample
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Lock the desk" onClick={() => void lockDesk()}>
              <Lock />
            </Button>
            <div className="hidden items-center gap-2 pl-1 sm:flex">
              <Initials name={db.settings.userName} className="size-8" />
              <div className="leading-tight">
                <p className="text-sm font-medium">{db.settings.userName}</p>
                <p className="text-[11px] text-muted-foreground">{db.settings.role}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-28 md:px-8 md:pb-16">{children}</main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 backdrop-blur md:hidden">
        {[
          { href: "/", label: "Home", icon: Home },
          { href: "/contacts", label: "People", icon: Users },
          { href: "/keep-in-touch", label: "Touch", icon: Bell, count: counts.touch },
          { href: "/tasks", label: "Tasks", icon: ListTodo, count: counts.tasks },
        ].map((item) => {
          const Icon = item.icon;
          const on = active(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative grid place-items-center gap-0.5 py-2 text-[11px] ${on ? "text-brand" : "text-muted-foreground"}`}
            >
              <Icon className="size-5" />
              {item.label}
              {item.count ? (
                <span className="absolute top-1 right-2 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] text-white">
                  {item.count > 99 ? "99+" : item.count}
                </span>
              ) : null}
            </Link>
          );
        })}
        <button type="button" className="grid place-items-center gap-0.5 py-2 text-[11px] text-muted-foreground" onClick={() => setMenu(true)}>
          <Menu className="size-5" />
          More
        </button>
      </nav>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground">
          <SheetHeader>
            <SheetTitle>
              <Brand />
            </SheetTitle>
          </SheetHeader>
          <nav className="space-y-4 overflow-y-auto px-3 pb-8">
            {GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground">{group.label}</p>
                {group.items.map((item) => (
                  <NavLink key={item.href} {...item} pathname={pathname} count={badge(item.href)} />
                ))}
              </div>
            ))}
            <p className="px-2 text-[11px] text-muted-foreground">Sample people only. Nothing here is a real client.</p>
          </nav>
        </SheetContent>
      </Sheet>

      <CommandPalette open={palette} onOpenChange={setPalette} />
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  count,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
  count: number;
  collapsed?: boolean;
}) {
  const on = active(pathname, href);
  const link = (
    <Link
      href={href}
      className={`relative mb-0.5 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
        collapsed ? "justify-center" : ""
      } ${on ? "bg-sidebar-accent font-medium text-sidebar-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
    >
      <Icon className="size-4 shrink-0" />
      {collapsed ? null : <span className="flex-1 truncate">{label}</span>}
      {!collapsed && count > 0 ? (
        <span className="rounded-md bg-brand/15 px-1.5 text-[11px] font-medium text-brand">{count}</span>
      ) : null}
      {collapsed && count > 0 ? <span className="absolute mt-3 ml-4 size-1.5 rounded-full bg-brand" /> : null}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${compact ? "justify-center" : "px-1"}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-brand text-white shadow-sm">
        <svg viewBox="0 0 32 32" className="size-4" aria-hidden>
          <path d="M6 16 16 7l10 9v9a1 1 0 0 1-1 1h-6v-6h-6v6H7a1 1 0 0 1-1-1v-9Z" fill="currentColor" />
        </svg>
      </span>
      {compact ? null : (
        <span>
          <span className="block text-[15px] leading-none font-semibold tracking-tight">Sphere</span>
          <span className="text-[11px] text-muted-foreground">Past clients, kept close</span>
        </span>
      )}
    </Link>
  );
}

async function lockDesk() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login";
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

type PaletteItem = { id: string; label: string; hint: string; href: string; icon?: React.ComponentType<{ className?: string }> };

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { db } = useOffice();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const pages: PaletteItem[] = GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        id: item.href,
        label: item.label,
        hint: group.label,
        href: item.href,
        icon: item.icon,
      })),
    );
    const actions: PaletteItem[] = ACTIONS.map((item) => ({
      id: item.href + item.label,
      label: item.label,
      hint: "Action",
      href: item.href,
      icon: item.icon,
    }));
    const q = query.trim();
    const pagesHit = [...actions, ...pages].filter((item) => !q || item.label.toLowerCase().includes(q.toLowerCase()));
    const people: PaletteItem[] =
      !db || q.length < 1
        ? []
        : sortPeople(
            db.contacts.filter((c) => !c.deletedAt && contactMatches(c, q)),
            "last",
          )
            .slice(0, 8)
            .map((c) => ({
              id: c.id,
              label: personName(c),
              hint: [c.city, primaryEmail(c)].filter(Boolean).join(" · "),
              href: `/contacts/${c.id}`,
            }));
    return { pages: pagesHit, people };
  }, [db, query]);

  const flat = [...items.people, ...items.pages];

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[14vh] gap-0 overflow-hidden p-0 sm:max-w-xl -translate-y-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Search Sphere</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="People, pages, or actions"
            aria-label="Search Sphere"
            className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIndex((i) => Math.min(flat.length - 1, i + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (event.key === "Enter" && flat[index]) {
                event.preventDefault();
                go(flat[index].href);
              }
            }}
          />
        </div>
        <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches that.</p>
          ) : (
            <>
              {items.people.length ? <PaletteGroup label="People" /> : null}
              {items.people.map((item, i) => (
                <PaletteRow key={item.id} item={item} active={index === i} onHover={() => setIndex(i)} onPick={() => go(item.href)} person />
              ))}
              {items.pages.length ? <PaletteGroup label={query.trim() ? "Pages" : "Jump to"} /> : null}
              {items.pages.map((item, i) => (
                <PaletteRow
                  key={item.id}
                  item={item}
                  active={index === items.people.length + i}
                  onHover={() => setIndex(items.people.length + i)}
                  onPick={() => go(item.href)}
                />
              ))}
            </>
          )}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ to move · Enter to open</span>
          <span>Sample book</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaletteGroup({ label }: { label: string }) {
  return <p className="px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground">{label}</p>;
}

function PaletteRow({
  item,
  active,
  onPick,
  onHover,
  person = false,
}: {
  item: PaletteItem;
  active: boolean;
  onPick: () => void;
  onHover: () => void;
  person?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={onPick}
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      }`}
    >
      {person ? <Initials name={item.label} className="size-7 text-[10px]" /> : Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
      <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
      <span className="truncate text-xs text-muted-foreground">{item.hint}</span>
    </button>
  );
}
