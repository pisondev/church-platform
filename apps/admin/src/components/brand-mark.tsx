import { Church } from "lucide-react";

// The product logo: a white church on the accent color. Size it with a `size-*` class.
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground ${className}`}
    >
      <Church className="size-[62%]" />
    </span>
  );
}
