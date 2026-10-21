"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "That password doesn’t match.");
        setBusy(false);
        return;
      }
      window.location.assign(dest);
    } catch {
      setError("The desk didn’t answer. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">
            <svg viewBox="0 0 32 32" className="size-4" aria-hidden>
              <path d="M6 16 16 7l10 9v9a1 1 0 0 1-1 1h-6v-6h-6v6H7a1 1 0 0 1-1-1v-9Z" fill="currentColor" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-tight">Sphere</span>
        </div>
        <h1 className="mt-6 text-2xl tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is Kayla’s past-client desk. The people inside are made up. Enter the office password to open it.
        </p>
        <label className="mt-5 grid gap-1.5 text-sm">
          <span className="font-medium">Password</span>
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoFocus
          />
        </label>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="mt-4 w-full" disabled={busy}>
          {busy ? "Checking…" : "Open the desk"}
        </Button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center text-sm text-muted-foreground">Opening sign-in…</main>}>
      <LoginForm />
    </Suspense>
  );
}
