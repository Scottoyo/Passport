// Shared className generators for the app's two recurring primitives -
// action buttons and bordered card surfaces. Not a component library (this
// app has never had one and doesn't need one for two patterns) - just a
// single source of truth so the button/card look isn't independently
// hand-copied into 100+ files. Works on <button>, <Link>, and <form>
// submit buttons alike, since it only returns a className string.
//
// Radius is a moderate rounded-lg (not pill-shaped) for action buttons -
// per the brand direction, only genuine actions (CTAs, form submits,
// header buttons) get this treatment. Filter/category chips and sidebar
// nav "pills" intentionally keep their existing rounded-full shape and are
// not built with this helper.
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50";

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-primary text-white hover:bg-brand-primary-dark",
  secondary: "bg-white text-brand-primary border border-brand-primary hover:bg-brand-tint",
  outline: "border border-border text-ink hover:border-brand-primary hover:text-brand-primary",
  ghost: "text-ink-muted hover:text-ink",
  danger: "text-error hover:underline",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`;
}

// A bordered card surface - color-token swap only (border/background), the
// radius is left at the existing rounded-2xl every card in the app already
// uses. Cards were never pill-shaped, so they're outside the button
// shape-language change above.
export function cardClasses() {
  return "rounded-2xl border border-border bg-surface";
}
