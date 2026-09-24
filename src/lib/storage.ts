import "server-only";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "business-media";

const LOGO_COVER_MAX_BYTES = 5 * 1024 * 1024;
const GALLERY_MAX_BYTES = 8 * 1024 * 1024;

const MAGIC_BYTES: { ext: "jpg" | "png" | "webp"; matches: (bytes: Uint8Array) => boolean }[] = [
  { ext: "jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "png",
    matches: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a,
  },
  {
    ext: "webp",
    matches: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // "WEBP"
  },
];

// Sniffs the actual file signature rather than trusting the client-supplied
// filename extension or MIME type (both are attacker-controlled) - only
// JPEG/PNG/WebP are accepted, and the returned extension always matches
// what's actually in the bytes, not what the browser claims.
export async function validateImageFile(file: File, maxBytes: number): Promise<string> {
  if (file.size === 0) throw new Error("Choose an image to upload.");
  if (file.size > maxBytes) {
    throw new Error(`That image is too large - please use one under ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const match = MAGIC_BYTES.find((m) => m.matches(header));
  if (!match) throw new Error("Please upload a JPEG, PNG, or WebP image.");
  return match.ext;
}

// Thin wrapper around the business-media bucket. Storage RLS (0027) is the
// real gate — this just picks the path convention every policy parses
// ("{businessId}/...") and returns the public URL to store on the row.
export async function uploadBusinessMedia(
  businessId: string,
  kind: "logo" | "cover" | "gallery",
  file: File
): Promise<{ path: string; url: string }> {
  const ext = await validateImageFile(file, kind === "gallery" ? GALLERY_MAX_BYTES : LOGO_COVER_MAX_BYTES);
  const supabase = await createClient();
  const path =
    kind === "gallery"
      ? `${businessId}/gallery/${crypto.randomUUID()}.${ext}`
      : `${businessId}/${kind}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: kind !== "gallery",
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = kind === "gallery" ? data.publicUrl : withCacheBust(data.publicUrl);
  return { path, url };
}

export async function deleteBusinessMedia(path: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

// Storage object path a business-media public URL points at, e.g.
// ".../business-media/{businessId}/logo.jpg" -> "{businessId}/logo.jpg".
// Used to find the OLD logo/cover object so it can be cleaned up after a
// replacement upload succeeds (the fixed-path upsert only overwrites in
// place when the extension is unchanged - a different extension leaves the
// old file orphaned otherwise).
export function businessMediaPathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length).split("?")[0];
}

// Storage paths carry no query string, so a re-upload to the same fixed
// path (logo/cover) needs a cache-busting suffix or the old image sticks
// around in the CDN/browser cache under the same public URL.
export function withCacheBust(url: string): string {
  return `${url}?v=${Date.now()}`;
}

const PASSPORT_PHOTOS_BUCKET = "passport-photos";
const PASSPORT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

// Same shape as uploadBusinessMedia — storage RLS (0035) gates writes to
// the passport's own owner, keyed off the "{passportId}/..." path prefix.
export async function uploadPassportPhoto(passportId: string, file: File): Promise<{ path: string; url: string }> {
  const ext = await validateImageFile(file, PASSPORT_PHOTO_MAX_BYTES);
  const supabase = await createClient();
  const path = `${passportId}/photo.${ext}`;

  const { error } = await supabase.storage.from(PASSPORT_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(PASSPORT_PHOTOS_BUCKET).getPublicUrl(path);
  return { path, url: withCacheBust(data.publicUrl) };
}

export async function deletePassportPhoto(path: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(PASSPORT_PHOTOS_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

// Same shape as businessMediaPathFromUrl — recovers the storage path from a
// stored public URL (which may carry a cache-busting ?v= suffix) so the OLD
// photo object can be cleaned up after a replace, or removed entirely.
export function passportPhotoPathFromUrl(url: string): string | null {
  const marker = `/${PASSPORT_PHOTOS_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length).split("?")[0];
}

const BRANDING_MEDIA_BUCKET = "branding-media";

// Same shape as uploadBusinessMedia — storage RLS (0047) parses the path
// prefix to gate writes: "national/..." (national admin only),
// "states/{stateId}/..." or "areas/{areaId}/..." (manage_branding
// capability at that scope, or national admin).
export async function uploadBrandingHero(
  level: "national" | "state" | "area",
  scopeId: string | null,
  file: File
): Promise<string> {
  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const prefix = level === "national" ? "national" : level === "state" ? `states/${scopeId}` : `areas/${scopeId}`;
  const path = `${prefix}/hero.${ext}`;

  const { error } = await supabase.storage.from(BRANDING_MEDIA_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BRANDING_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
