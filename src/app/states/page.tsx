import { redirect } from "next/navigation";

// The state search + map now lives on the homepage (#states section).
export default function StatesPage() {
  redirect("/#states");
}
