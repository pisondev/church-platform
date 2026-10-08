"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";

// Sets the font size of its children to `--base`, shrunk so the widest child fits.
// All children share one scale, which keeps the phrases on a slide the same size.
export function FitToWidth({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const fit = () => {
      element.style.setProperty("--fit", "1");
      const widest = Math.max(0, ...Array.from(element.children, (child) => child.scrollWidth));
      const available = element.clientWidth;
      if (widest > available && available > 0) {
        // Stay a hair under the exact ratio so rounding never brings the overflow back.
        element.style.setProperty("--fit", String((available / widest) * 0.99));
      }
    };

    fit();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div ref={ref} className={className} style={{ fontSize: "calc(var(--base) * var(--fit, 1))" }}>
      {children}
    </div>
  );
}
