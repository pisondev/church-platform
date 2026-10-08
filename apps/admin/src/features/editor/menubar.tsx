"use client";

import { useEffect, useRef, useState } from "react";

export type MenuCommand = { label: string; onSelect: () => void; disabled?: boolean };
export type MenuGroup = { label: string; commands: MenuCommand[] };

// A row of drop-down menus, as in a desktop editor. One menu is open at a time; it closes
// on a choice, on Escape and on a click anywhere else.
export function Menubar({ label, menus }: { label: string; menus: MenuGroup[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (open === null) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      triggers.current[open]?.focus();
      setOpen(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} role="menubar" aria-label={label} className="flex items-center">
      {menus.map((menu, index) => (
        <div key={menu.label} className="relative">
          <button
            ref={(element) => {
              triggers.current[index] = element;
            }}
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === index}
            className="rounded px-2 py-1 text-sm hover:bg-black/5 aria-expanded:bg-black/10"
            onClick={() => setOpen(open === index ? null : index)}
            // With a menu open, moving along the bar switches menus.
            onMouseEnter={() => {
              if (open !== null) setOpen(index);
            }}
          >
            {menu.label}
          </button>

          {open === index && (
            <div
              role="menu"
              aria-label={menu.label}
              className="absolute top-full left-0 z-30 mt-1 min-w-60 rounded-md border border-border bg-surface py-1 shadow-lg"
            >
              {menu.commands.map((command) => (
                <button
                  key={command.label}
                  type="button"
                  role="menuitem"
                  disabled={command.disabled}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-black/5 disabled:text-muted disabled:opacity-60 disabled:hover:bg-transparent"
                  onClick={() => {
                    setOpen(null);
                    command.onSelect();
                  }}
                >
                  {command.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
