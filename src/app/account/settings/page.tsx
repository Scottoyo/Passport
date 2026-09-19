import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { NotificationPreferences, Profile } from "@/lib/types/domain";
import { updateMyProfile, updateNotificationPreferences } from "../actions";

const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

const PREFERENCE_FIELDS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  {
    key: "achievement_unlocked",
    label: "Achievement Unlocked",
    description: "Receive a notification whenever you unlock an achievement.",
  },
  {
    key: "admin_announcement",
    label: "Admin Announcement",
    description: "Receive important announcements from the team.",
  },
  {
    key: "new_achievement_available",
    label: "New Achievement Available",
    description: "Receive a notification when a new achievement becomes available.",
  },
  {
    key: "new_business_added",
    label: "New Business Added",
    description: "Receive a notification when a new participating business joins your region.",
  },
  {
    key: "new_promotion_added",
    label: "New Promotion Added",
    description: "Receive a notification when a participating business adds a new Passport promotion.",
  },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account/settings");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  const prefs = profile?.notification_preferences;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <section className="mt-6 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Personal information</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your personal account details.</p>
        <form action={updateMyProfile} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Email</span>
            <input value={user.email ?? ""} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">First name</span>
              <input name="first_name" defaultValue={profile?.first_name ?? ""} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Last name</span>
              <input name="last_name" defaultValue={profile?.last_name ?? ""} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Phone</span>
              <input name="phone" type="tel" defaultValue={profile?.phone ?? ""} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Age range</span>
              <select name="age_range" defaultValue={profile?.age_range ?? ""} className={inputClass}>
                <option value="">Not set</option>
                {AGE_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Street address</span>
            <input name="address_line1" defaultValue={profile?.address_line1 ?? ""} className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">City</span>
              <input name="city" defaultValue={profile?.city ?? ""} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">State</span>
              <input name="state_code" maxLength={2} defaultValue={profile?.state_code ?? ""} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">ZIP code</span>
              <input name="postal_code" defaultValue={profile?.postal_code ?? ""} className={inputClass} />
            </label>
          </div>
          <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Save Changes
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Notification preferences</h2>
        <p className="mt-1 text-sm text-slate-500">Choose which notifications you&apos;d like to receive.</p>
        <form action={updateNotificationPreferences} className="mt-4 space-y-3">
          {PREFERENCE_FIELDS.map((f) => (
            <label
              key={f.key}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3"
            >
              <span>
                <span className="block text-sm font-medium text-slate-900">{f.label}</span>
                <span className="block text-xs text-slate-500">{f.description}</span>
              </span>
              <input
                type="checkbox"
                name={f.key}
                defaultChecked={prefs ? prefs[f.key] : true}
                className="h-5 w-9 shrink-0"
              />
            </label>
          ))}
          <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Save Preferences
          </button>
        </form>
      </section>
    </div>
  );
}
