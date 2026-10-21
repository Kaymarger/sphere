import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-heading text-4xl text-foreground">That page isn’t in the desk</h1>
      <p className="mt-2 text-muted-foreground">The link may be old. Head back to the home page.</p>
      <Link href="/" className="mt-4 inline-block text-foreground underline">
        Go home
      </Link>
    </div>
  );
}
