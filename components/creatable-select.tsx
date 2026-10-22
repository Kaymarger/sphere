"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

function same(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function CreatableSelect({
  label,
  value,
  options,
  onChange,
  onCreate,
  placeholder = "Choose one, or type a new one",
  emptyLabel = "Leave blank",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onCreate: (value: string) => void | Promise<void>;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const q = query.trim();
  const filtered = useMemo(() => options.filter((option) => option.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const canAdd = q.length > 0 && !options.some((option) => same(option, q));

  useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function commitTyped() {
    if (!q) {
      if (value) choose("");
      return;
    }
    const exact = options.find((option) => same(option, q));
    if (exact) {
      choose(exact);
      return;
    }
    onChange(q);
    setQuery(q);
    setOpen(false);
    void onCreate(q);
  }

  async function add() {
    if (!canAdd) return;
    onChange(q);
    setQuery(q);
    setOpen(false);
    await onCreate(q);
  }

  function choose(next: string) {
    onChange(next);
    setQuery(next);
    setOpen(false);
  }

  return (
    <div ref={box} className="relative grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        value={query}
        placeholder={placeholder}
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        role="combobox"
        onFocus={(event) => {
          setOpen(true);
          event.currentTarget.select();
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onBlur={(event) => {
          if (box.current?.contains(event.relatedTarget as Node)) return;
          setOpen(false);
          commitTyped();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (canAdd) void add();
            else if (filtered[0]) choose(filtered[0]);
            else commitTyped();
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery(value);
          }
        }}
      />
      {open ? (
        <div id={listId} className="absolute top-full z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          <button
            type="button"
            className="block w-full rounded-md px-2 py-1.5 text-left text-muted-foreground hover:bg-muted"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose("")}
          >
            {emptyLabel}
          </button>
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              className={`block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted ${same(option, value) ? "bg-accent" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              {option}
            </button>
          ))}
          {canAdd ? (
            <button
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left font-medium text-brand hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void add()}
            >
              Add “{q}”
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CreatableMultiSelect({
  label,
  values,
  options,
  onChange,
  onCreate,
  placeholder = "Type a tag and press Enter",
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  onCreate: (value: string) => void | Promise<void>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const q = query.trim();
  const filtered = useMemo(
    () => options.filter((option) => !values.some((value) => same(value, option)) && option.toLowerCase().includes(q.toLowerCase())),
    [options, q, values],
  );
  const canAdd = q.length > 0 && !values.some((value) => same(value, q)) && !options.some((option) => same(option, q));

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function addValue(next: string) {
    const clean = next.trim();
    if (!clean || values.some((value) => same(value, clean))) return;
    onChange([...values, clean]);
    setQuery("");
  }

  async function create() {
    if (!q || values.some((value) => same(value, q))) return;
    addValue(q);
    if (canAdd) await onCreate(q);
  }

  return (
    <div ref={box} className="relative grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {values.length ? (
        <div className="flex flex-wrap gap-1">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              className="rounded-full bg-secondary px-2 py-1 text-xs"
              onClick={() => onChange(values.filter((item) => item !== value))}
            >
              {value} ×
            </button>
          ))}
        </div>
      ) : null}
      <Input
        value={query}
        placeholder={placeholder}
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        role="combobox"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onBlur={(event) => {
          if (box.current?.contains(event.relatedTarget as Node)) return;
          setOpen(false);
          if (q) void create();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (canAdd || q) void create();
            else if (filtered[0]) addValue(filtered[0]);
          } else if (event.key === "Backspace" && !query && values.length) {
            onChange(values.slice(0, -1));
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open ? (
        <div id={listId} className="absolute top-full z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addValue(option)}
            >
              {option}
            </button>
          ))}
          {canAdd ? (
            <button
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left font-medium text-brand hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void create()}
            >
              Add “{q}”
            </button>
          ) : null}
          {!filtered.length && !canAdd ? <p className="px-2 py-1.5 text-muted-foreground">No more tags in the list.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
