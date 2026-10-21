"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-heading text-4xl text-foreground">Something slipped</h1>
      <p className="mt-2 text-muted-foreground">The desk hit a snag. Your sample book is still there.</p>
      <Button className="mt-4" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
