"use client";

import { useState } from "react";
import { buttonClasses } from "@/lib/ui-classes";

export function ShareButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled the share sheet — fall through to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — nothing more we can do here
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={buttonClasses("outline", "sm")}
    >
      {copied ? "Link copied!" : "Share"}
    </button>
  );
}
