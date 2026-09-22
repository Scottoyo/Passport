// The one neutral "no image yet" glyph reused everywhere a business image
// is missing (tile cover, profile hero, profile logo) so a missing photo
// never reads as a broken image or an empty gap - just an intentional,
// on-brand placeholder.
export function BusinessPlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
