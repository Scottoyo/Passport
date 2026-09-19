import "server-only";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "business-media";

// Thin wrapper around the business-media bucket. Storage RLS (0027) is the
// real gate — this just picks the path convention every policy parses
// ("{businessId}/...") and returns the public URL to store on the row.
export async function uploadBusinessMedia(
  businessId: string,
  kind: "logo" | "cover" | "gallery",
  file: File
): Promise<string> {
  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
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
  return data.publicUrl;
}

export async function deleteBusinessMedia(path: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

// Storage paths carry no query string, so a re-upload to the same fixed
// path (logo/cover) needs a cache-busting suffix or the old image sticks
// around in the CDN/browser cache under the same public URL.
export function withCacheBust(url: string): string {
  return `${url}?v=${Date.now()}`;
}
