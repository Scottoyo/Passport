import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { NATIONAL_BRANDING_ID } from "@/lib/resolve-theme";
import { SaveButton } from "@/components/save-button";
import { SingleFileUploadForm } from "@/components/single-file-upload-form";
import type { NationalBranding } from "@/lib/types/domain";
import { updateNationalBranding, uploadNationalHeroImage } from "./actions";

export const metadata: Metadata = { title: "National Branding" };

export default async function NationalBrandingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/national-branding");
  if (!currentUser.isNationalAdmin) redirect("/admin");

  const supabase = await createClient();
  const { data: branding } = await supabase
    .from("national_branding")
    .select("*")
    .eq("id", NATIONAL_BRANDING_ID)
    .maybeSingle<NationalBranding>();

  if (!branding) {
    return <p className="text-sm text-ink-muted">National branding hasn&apos;t been set up yet.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">National Branding</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Sets the colors and hero image for the national homepage and every other top-level page
        (FAQ, sign in, register a business, etc.). Never applied to state or region pages - those
        use their own branding, falling back to the app&apos;s default look, not this one.
      </p>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-ink">Colors</h2>
        <form action={updateNationalBranding} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Primary color</span>
            <input
              name="brand_primary_color"
              type="color"
              defaultValue={branding.brand_primary_color ?? "#061b3a"}
              className="h-10 w-16 rounded-lg border border-border"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Secondary color</span>
            <input
              name="brand_secondary_color"
              type="color"
              defaultValue={branding.brand_secondary_color ?? "#073564"}
              className="h-10 w-16 rounded-lg border border-border"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Accent color</span>
            <input
              name="brand_accent_color"
              type="color"
              defaultValue={branding.brand_accent_color ?? "#c8943e"}
              className="h-10 w-16 rounded-lg border border-border"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Text color</span>
            <input
              name="brand_text_color"
              type="color"
              defaultValue={branding.brand_text_color ?? "#071a35"}
              className="h-10 w-16 rounded-lg border border-border"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Background color</span>
            <input
              name="brand_background_color"
              type="color"
              defaultValue={branding.brand_background_color ?? "#ffffff"}
              className="h-10 w-16 rounded-lg border border-border"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Hero overlay</span>
            <select
              name="brand_hero_overlay"
              defaultValue={branding.brand_hero_overlay ?? "none"}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="none">None</option>
              <option value="scrim">Gradient scrim</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Logo URL (optional)</span>
            <input
              name="brand_logo_url"
              type="url"
              defaultValue={branding.brand_logo_url ?? ""}
              placeholder="https://..."
              className="w-64 rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <SaveButton>Save branding</SaveButton>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-ink">Hero image</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Shown on the national homepage. Use a wide image (roughly 2.4:1) - it&apos;s displayed in
          full with no cropping and no overlay, so any headline baked into the image itself must
          already be legible.
        </p>
        {branding.hero_image_url && (
          <p className="mt-2 text-xs text-ink-muted break-all">Current: {branding.hero_image_url}</p>
        )}
        <div className="mt-3">
          <SingleFileUploadForm action={uploadNationalHeroImage} fieldName="hero_image" label="Upload hero image" />
        </div>
      </section>
    </div>
  );
}
