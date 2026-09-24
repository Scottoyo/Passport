// Same stroke language as BusinessPlaceholderIcon (viewBox 24x24, stroke
// currentColor, strokeWidth 1.5) but a person silhouette - the right
// metaphor for a passport holder, not a storefront.
export function PassportHolderPlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <circle cx="12" cy="8" r="4" strokeLinecap="round" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
