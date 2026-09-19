"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

export function BusinessActionsMenu({
  viewHref,
  editHref,
  children,
}: {
  viewHref: string;
  editHref: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Rendered via a portal into document.body and positioned `fixed` from
  // the trigger button's own coordinates - the table this menu lives in
  // scrolls (overflow-x-auto), which per CSS also forces overflow-y to
  // clip, so an absolute-positioned dropdown inside that container gets
  // trapped and needs its own internal scroll instead of floating freely.
  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    updatePosition();

    function onClickOutside(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
      >
        Actions
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: position.top, right: position.right }}
            className="z-50 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            <Link
              href={viewHref}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              View
            </Link>
            <Link
              href={editHref}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Edit
            </Link>
            <div onClick={() => setOpen(false)}>{children}</div>
          </div>,
          document.body
        )}
    </>
  );
}
